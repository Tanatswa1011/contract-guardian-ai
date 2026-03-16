import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { configureUnPDF, extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.10.0";
import * as pdfjs from "https://esm.sh/unpdf@0.10.0/dist/pdfjs.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EXTRACTION_PROMPT = `You are a contract data extractor. Extract ONLY the following fields from the contract text. Return valid JSON only, no other text.

Fields to extract (return null if not found or uncertain):
- contract_title: string | null - The contract/agreement title
- counterparty: string | null - The other party (company or person name)
- start_date: string | null - Contract start date (YYYY-MM-DD)
- end_date: string | null - Contract end/expiration date (YYYY-MM-DD)
- renewal_date: string | null - Next renewal date (YYYY-MM-DD)
- notice_date: string | null - Notice deadline date (YYYY-MM-DD)
- payment_date: string | null - Payment due date (YYYY-MM-DD)

Rules:
- Only extract dates that are clearly stated in the document
- Use ISO format YYYY-MM-DD for dates. If ambiguous, return null
- Do not guess or invent values. Prefer null over hallucination
- For missing_fields: list the field names (e.g. "renewal_date") that you could not find
- Set needs_review: true if any important field is null or uncertain
- notes: brief extraction notes if relevant, else null

Return ONLY this JSON structure, no markdown or extra text:
{"contract_title":string|null,"counterparty":string|null,"start_date":string|null,"end_date":string|null,"renewal_date":string|null,"notice_date":string|null,"payment_date":string|null,"missing_fields":string[],"needs_review":boolean,"notes":string|null}`;

type ExtractionResult = {
  contract_title: string | null;
  counterparty: string | null;
  start_date: string | null;
  end_date: string | null;
  renewal_date: string | null;
  notice_date: string | null;
  payment_date: string | null;
  missing_fields: string[];
  needs_review: boolean;
  notes: string | null;
};

function parseExtractionJson(text: string): ExtractionResult | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]) as ExtractionResult;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  if (!openaiKey) {
    console.error("OPENAI_API_KEY not configured");
    return new Response(
      JSON.stringify({ error: "Extraction service not configured" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let contractId: string;
  try {
    const body = await req.json();
    contractId = body?.contract_id;
    if (!contractId || typeof contractId !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid contract_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (authHeader) {
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: contract, error } = await userClient
      .from("contracts")
      .select("id")
      .eq("id", contractId)
      .single();
    if (error || !contract) {
      return new Response(
        JSON.stringify({ error: "Contract not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  const { data: files, error: filesError } = await supabase
    .from("contract_files")
    .select("id, storage_path, file_name")
    .eq("contract_id", contractId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (filesError || !files?.length) {
    console.error("No contract file found:", filesError);
    await supabase.from("extraction_runs").insert({
      contract_id: contractId,
      status: "failed",
      error: "No PDF file found for contract",
      model: null,
      raw_json: {},
      missing_fields: [],
      missing_fields_text: [],
      needs_review: true,
    });
    return new Response(
      JSON.stringify({ error: "No PDF file found for contract" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const file = files[0];
  const { data: pdfBlob, error: downloadError } = await supabase.storage
    .from("contract-documents")
    .download(file.storage_path);

  if (downloadError || !pdfBlob) {
    console.error("Failed to download PDF:", downloadError);
    await supabase.from("extraction_runs").insert({
      contract_id: contractId,
      status: "failed",
      error: downloadError?.message || "Failed to download PDF",
      model: null,
      raw_json: {},
      missing_fields: [],
      missing_fields_text: [],
      needs_review: true,
    });
    return new Response(
      JSON.stringify({ error: "Failed to download PDF" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let extractedText: string;
  try {
    await configureUnPDF({ pdfjs: async () => pdfjs });
    const pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer());
    const doc = await getDocumentProxy(pdfBytes);
    const result = await extractText(doc, { mergePages: true });
    extractedText = result?.text || "";
  } catch (err) {
    console.error("PDF text extraction failed:", err);
    await supabase.from("extraction_runs").insert({
      contract_id: contractId,
      status: "failed",
      error: err instanceof Error ? err.message : "PDF text extraction failed",
      model: null,
      raw_json: {},
      missing_fields: [],
      missing_fields_text: [],
      needs_review: true,
    });
    return new Response(
      JSON.stringify({ error: "Failed to extract text from PDF" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!extractedText || extractedText.trim().length < 50) {
    await supabase.from("extraction_runs").insert({
      contract_id: contractId,
      status: "failed",
      error: "Insufficient text extracted from PDF (may be scanned/image-based)",
      model: null,
      raw_json: {},
      missing_fields: [],
      missing_fields_text: [],
      needs_review: true,
    });
    return new Response(
      JSON.stringify({ error: "Could not extract enough text from PDF" }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let extraction: ExtractionResult;
  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You extract contract data. Return only valid JSON, no other text.",
          },
          {
            role: "user",
            content: `${EXTRACTION_PROMPT}\n\n---\nContract text:\n\n${extractedText.slice(0, 12000)}`,
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!openaiRes.ok) {
      const errBody = await openaiRes.text();
      console.error("OpenAI API error:", openaiRes.status, errBody);
      await supabase.from("extraction_runs").insert({
        contract_id: contractId,
        status: "failed",
        error: `OpenAI API error: ${openaiRes.status}`,
        model: "gpt-4o-mini",
        raw_json: {},
        missing_fields: [],
        missing_fields_text: [],
        needs_review: true,
      });
      return new Response(
        JSON.stringify({ error: "AI extraction failed" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiData = await openaiRes.json();
    const content = openaiData?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const parsed = parseExtractionJson(content);
    if (!parsed) {
      throw new Error("Invalid JSON in OpenAI response");
    }
    extraction = parsed;
  } catch (err) {
    console.error("OpenAI extraction failed:", err);
    await supabase.from("extraction_runs").insert({
      contract_id: contractId,
      status: "failed",
      error: err instanceof Error ? err.message : "Extraction failed",
      model: "gpt-4o-mini",
      raw_json: {},
      missing_fields: [],
      missing_fields_text: [],
      needs_review: true,
    });
    return new Response(
      JSON.stringify({ error: "AI extraction failed" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const missingFields = extraction.missing_fields ?? [];
  const missingFieldsText = missingFields.map((f) => f.replace(/_/g, " "));

  const { error: insertError } = await supabase.from("extraction_runs").insert({
    contract_id: contractId,
    status: "completed",
    model: "gpt-4o-mini",
    raw_json: extraction as unknown as Record<string, unknown>,
    missing_fields: missingFields,
    missing_fields_text: missingFieldsText,
    needs_review: extraction.needs_review ?? missingFields.length > 0,
    error: null,
  });

  if (insertError) {
    console.error("Failed to save extraction:", insertError);
    return new Response(
      JSON.stringify({ error: "Failed to save extraction result" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      contract_id: contractId,
      needs_review: extraction.needs_review,
      missing_fields: missingFields,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
