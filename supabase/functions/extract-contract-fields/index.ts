import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  extractContractFieldsWithOpenAi,
  extractTextFromPdf,
  SUPPORTED_EXTRACTION_FIELDS,
} from "./extraction.ts";
import { generateSuggestedDeadlines } from "./deadline-suggestions.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ExtractContractRequest = {
  contractId?: string;
  filePath?: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unexpected extraction error";
}

async function updateExtractionRunStatus(
  serviceClient: ReturnType<typeof createClient>,
  extractionRunId: string,
  values: Record<string, unknown>,
) {
  const { error } = await serviceClient
    .from("extraction_runs")
    .update(values)
    .eq("id", extractionRunId);

  if (error) {
    console.error("Failed to update extraction run", {
      extraction_run_id: extractionRunId,
      values,
      error: getErrorMessage(error),
    });
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
  const openAiModel = Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1-mini";
  const authHeader = req.headers.get("Authorization");

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !openAiApiKey) {
    return new Response(
      JSON.stringify({ error: "Server is missing required environment values." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  let extractionRunId: string | null = null;
  let contractIdForErrorLog: string | null = null;

  try {
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as ExtractContractRequest;
    const contractId = body.contractId;
    const requestedFilePath = body.filePath;
    contractIdForErrorLog = contractId ?? null;

    if (!contractId) {
      return new Response(JSON.stringify({ error: "contractId is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: contract, error: contractError } = await userClient
      .from("contracts")
      .select("id")
      .eq("id", contractId)
      .maybeSingle();

    if (contractError) throw contractError;
    if (!contract) {
      return new Response(JSON.stringify({ error: "Contract not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let fileQuery = userClient
      .from("contract_files")
      .select("id, storage_path, file_name")
      .eq("contract_id", contractId);

    if (requestedFilePath) {
      fileQuery = fileQuery.eq("storage_path", requestedFilePath);
    }

    const { data: fileRows, error: fileError } = await fileQuery
      .order("created_at", { ascending: false })
      .limit(1);

    if (fileError) throw fileError;
    const contractFile = fileRows?.[0];

    if (!contractFile) {
      return new Response(JSON.stringify({ error: "Contract file not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: createdRun, error: createRunError } = await serviceClient
      .from("extraction_runs")
      .insert({
        contract_id: contractId,
        status: "processing",
        model: openAiModel,
        raw_json: {},
        missing_fields: [...SUPPORTED_EXTRACTION_FIELDS],
        missing_fields_text: [...SUPPORTED_EXTRACTION_FIELDS],
        needs_review: true,
      })
      .select("id")
      .single();

    if (createRunError) throw createRunError;
    extractionRunId = createdRun.id;

    const { data: fileData, error: downloadError } = await serviceClient.storage
      .from("contract-documents")
      .download(contractFile.storage_path);

    if (downloadError) throw downloadError;
    if (!fileData) throw new Error("Contract file download returned empty response.");

    const pdfBytes = new Uint8Array(await fileData.arrayBuffer());
    let contractText: string;
    try {
      contractText = await extractTextFromPdf(pdfBytes);
    } catch (error) {
      const parserMessage = getErrorMessage(error);
      console.error("extract-contract-fields pdf parsing failed", {
        contract_id: contractId,
        extraction_run_id: extractionRunId,
        storage_path: contractFile.storage_path,
        file_name: contractFile.file_name,
        size_bytes: pdfBytes.byteLength,
        parser_error: parserMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new Error(`PDF parsing step failed: ${parserMessage}`);
    }

    if (!contractText) {
      throw new Error("No readable text was found in the uploaded PDF.");
    }

    const extraction = await extractContractFieldsWithOpenAi({
      openAiApiKey,
      model: openAiModel,
      contractText,
    });

    const suggestedDeadlines = generateSuggestedDeadlines(extraction);
    console.log("extract-contract-fields extracted dates", {
      contract_id: contractId,
      extraction_run_id: extractionRunId,
      extracted_dates: {
        start_date: extraction.start_date,
        end_date: extraction.end_date,
        renewal_date: extraction.renewal_date,
        notice_date: extraction.notice_date,
        payment_date: extraction.payment_date,
      },
    });
    console.log("extract-contract-fields generated suggested deadlines", {
      contract_id: contractId,
      extraction_run_id: extractionRunId,
      suggested_deadlines: suggestedDeadlines,
    });

    await updateExtractionRunStatus(serviceClient, extractionRunId, {
      status: "completed",
      raw_json: extraction,
      missing_fields: extraction.missing_fields,
      missing_fields_text: extraction.missing_fields,
      needs_review: extraction.needs_review,
      error: null,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        extraction_run_id: extractionRunId,
        status: "completed",
        extraction,
        suggested_deadlines: suggestedDeadlines,
        needs_review: extraction.needs_review,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("extract-contract-fields failed", {
      contract_id: contractIdForErrorLog,
      extraction_run_id: extractionRunId,
      error: message,
    });

    if (extractionRunId) {
      try {
        await updateExtractionRunStatus(serviceClient, extractionRunId, {
          status: "failed",
          needs_review: true,
          missing_fields: [...SUPPORTED_EXTRACTION_FIELDS],
          missing_fields_text: [...SUPPORTED_EXTRACTION_FIELDS],
          error: message,
          raw_json: {
            error: message,
          },
        });
      } catch (updateError) {
        console.error("Failed to persist extraction failure state", {
          contract_id: contractIdForErrorLog,
          extraction_run_id: extractionRunId,
          error: getErrorMessage(updateError),
        });
      }
    }

    return new Response(
      JSON.stringify({
        error: "Contract extraction failed. You can still fill details manually.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
