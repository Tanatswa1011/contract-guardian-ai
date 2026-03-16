import { createClient } from "@supabase/supabase-js";
import {
  extractContractData,
  extractPdfText,
  EXTRACTION_FIELD_LABELS,
  SUPPORTED_EXTRACTION_FIELDS,
} from "./extraction.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
const PROCESSING_TIMEOUT_MS = 10 * 60 * 1000;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown extraction error";
}

function truncateErrorMessage(error: string) {
  return error.slice(0, 1_000);
}

function isRunStillActive(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < PROCESSING_TIMEOUT_MS;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openAIApiKey = Deno.env.get("OPENAI_API_KEY");

    if (
      !supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey ||
      !openAIApiKey
    ) {
      console.error("Missing extraction environment variables");
      return jsonResponse(
        { error: "Server configuration is incomplete" },
        500,
      );
    }

    const model = Deno.env.get("OPENAI_MODEL") || DEFAULT_OPENAI_MODEL;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await userClient.auth.getUser(
      token,
    );
    if (userError || !userData.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const requestBody = await req.json().catch(() => null);
    const contractId =
      requestBody && typeof requestBody === "object" && "contract_id" in requestBody
        ? String((requestBody as Record<string, unknown>).contract_id)
        : "";

    if (!contractId) {
      return jsonResponse({ error: "contract_id is required" }, 400);
    }

    const { data: contract, error: contractError } = await userClient
      .from("contracts")
      .select("id")
      .eq("id", contractId)
      .maybeSingle();

    if (contractError) {
      throw contractError;
    }

    if (!contract) {
      return jsonResponse({ error: "Contract not found" }, 404);
    }

    const { data: activeRun, error: activeRunError } = await serviceClient
      .from("extraction_runs")
      .select("id, created_at")
      .eq("contract_id", contractId)
      .eq("status", "processing")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeRunError) {
      throw activeRunError;
    }

    if (activeRun && isRunStillActive(activeRun.created_at)) {
      return jsonResponse(
        {
          success: true,
          extraction_run_id: activeRun.id,
          status: "processing",
          already_running: true,
        },
        202,
      );
    }

    const { data: contractFile, error: contractFileError } = await serviceClient
      .from("contract_files")
      .select("id, storage_path, file_name, mime_type")
      .eq("contract_id", contractId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (contractFileError) {
      throw contractFileError;
    }

    if (!contractFile) {
      return jsonResponse({ error: "No contract file found" }, 404);
    }

    const { data: extractionRun, error: extractionRunError } = await serviceClient
      .from("extraction_runs")
      .insert({
        contract_id: contractId,
        status: "processing",
        model,
        needs_review: true,
        missing_fields: [...SUPPORTED_EXTRACTION_FIELDS],
        missing_fields_text: SUPPORTED_EXTRACTION_FIELDS.map(
          (field) => EXTRACTION_FIELD_LABELS[field],
        ),
        raw_json: {},
        error: null,
      })
      .select("id")
      .single();

    if (extractionRunError) {
      throw extractionRunError;
    }

    try {
      const { data: fileBlob, error: downloadError } = await serviceClient
        .storage
        .from("contract-documents")
        .download(contractFile.storage_path);

      if (downloadError) {
        throw downloadError;
      }

      const fileBytes = new Uint8Array(await fileBlob.arrayBuffer());
      const documentText = await extractPdfText(fileBytes);
      const extraction = await extractContractData({
        apiKey: openAIApiKey,
        model,
        fileName: contractFile.file_name,
        text: documentText,
      });

      const { error: updateError } = await serviceClient
        .from("extraction_runs")
        .update({
          status: "succeeded",
          model,
          raw_json: extraction,
          missing_fields: extraction.missing_fields,
          missing_fields_text: extraction.missing_fields.map(
            (field) => EXTRACTION_FIELD_LABELS[field],
          ),
          needs_review: extraction.needs_review,
          error: null,
        })
        .eq("id", extractionRun.id);

      if (updateError) {
        throw updateError;
      }

      return jsonResponse({
        success: true,
        extraction_run_id: extractionRun.id,
        status: "succeeded",
      });
    } catch (error) {
      const errorMessage = truncateErrorMessage(getErrorMessage(error));
      console.error("Contract extraction failed", {
        contractId,
        extractionRunId: extractionRun.id,
        fileName: contractFile.file_name,
        error: errorMessage,
      });

      const { error: failedUpdateError } = await serviceClient
        .from("extraction_runs")
        .update({
          status: "failed",
          model,
          error: errorMessage,
          needs_review: true,
          missing_fields: [...SUPPORTED_EXTRACTION_FIELDS],
          missing_fields_text: SUPPORTED_EXTRACTION_FIELDS.map(
            (field) => EXTRACTION_FIELD_LABELS[field],
          ),
        })
        .eq("id", extractionRun.id);

      if (failedUpdateError) {
        console.error("Failed to update extraction run status", failedUpdateError);
      }

      return jsonResponse(
        {
          success: false,
          extraction_run_id: extractionRun.id,
          status: "failed",
          error:
            "Extraction failed. The contract is still available and can be reviewed manually.",
        },
        500,
      );
    }
  } catch (error) {
    console.error("extract-contract exception", error);
    return jsonResponse(
      {
        error:
          "Extraction failed. The contract is still available and can be reviewed manually.",
      },
      500,
    );
  }
});
