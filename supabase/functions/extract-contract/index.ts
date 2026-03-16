import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a precise contract data extraction system. Your task is to extract specific fields from the provided contract text.

RULES:
1. Only extract values explicitly stated in the document text.
2. Format all dates as YYYY-MM-DD (ISO 8601).
3. If a date is ambiguous or not clearly stated, return null.
4. Never fabricate, guess, or infer values not present in the text.
5. If a field cannot be confidently determined, return null.
6. Set needs_review to true if ANY field is null.
7. List ALL null field names in the missing_fields array.
8. Keep notes brief — only mention important extraction caveats.

Return this exact JSON structure:
{
  "contract_title": string | null,
  "counterparty": string | null,
  "start_date": string | null,
  "end_date": string | null,
  "renewal_date": string | null,
  "notice_date": string | null,
  "payment_date": string | null,
  "missing_fields": string[],
  "needs_review": boolean,
  "notes": string | null
}`;

const ALL_FIELDS = [
  "contract_title",
  "counterparty",
  "start_date",
  "end_date",
  "renewal_date",
  "notice_date",
  "payment_date",
];

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function saveFailedRun(
  serviceClient: ReturnType<typeof createClient>,
  contractId: string,
  error: string,
  rawJson: Record<string, unknown> = {},
) {
  await serviceClient
    .from("extraction_runs")
    .insert({
      contract_id: contractId,
      status: "failed",
      error,
      model: "gpt-4o-mini",
      needs_review: true,
      missing_fields: ALL_FIELDS,
      raw_json: rawJson,
    })
    .catch((e: Error) => console.error("Failed to persist error run:", e.message));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

  if (!openaiApiKey) {
    console.error("OPENAI_API_KEY is not set");
    return jsonResponse({ error: "OpenAI API key not configured" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: { contract_id?: string; extracted_text?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid request body" }, 400);
  }

  const { contract_id, extracted_text } = body;
  if (!contract_id || !extracted_text) {
    return jsonResponse({ error: "Missing contract_id or extracted_text" }, 400);
  }

  const { data: contract, error: contractError } = await userClient
    .from("contracts")
    .select("id")
    .eq("id", contract_id)
    .single();

  if (contractError || !contract) {
    return jsonResponse({ error: "Contract not found or access denied" }, 404);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  const MAX_CHARS = 100_000;
  const text =
    extracted_text.length > MAX_CHARS
      ? extracted_text.slice(0, MAX_CHARS) + "\n\n[Text truncated]"
      : extracted_text;

  try {
    const openaiRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          temperature: 0,
          max_tokens: 1000,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `Extract data from this contract:\n\n${text}`,
            },
          ],
        }),
      },
    );

    if (!openaiRes.ok) {
      const errBody = await openaiRes.text();
      console.error("OpenAI API error:", openaiRes.status, errBody);
      await saveFailedRun(
        serviceClient,
        contract_id,
        `OpenAI API error ${openaiRes.status}`,
      );
      return jsonResponse(
        { error: "AI extraction failed", status: "failed" },
        502,
      );
    }

    const openaiData = await openaiRes.json();
    const content = openaiData.choices?.[0]?.message?.content;

    if (!content) {
      await saveFailedRun(
        serviceClient,
        contract_id,
        "Empty response from OpenAI",
      );
      return jsonResponse(
        { error: "Empty AI response", status: "failed" },
        502,
      );
    }

    let extracted: Record<string, unknown>;
    try {
      extracted = JSON.parse(content);
    } catch {
      await saveFailedRun(serviceClient, contract_id, "Invalid JSON from OpenAI", {
        raw_content: content,
      });
      return jsonResponse(
        { error: "Invalid AI response format", status: "failed" },
        502,
      );
    }

    const missingFields: string[] = [];
    for (const f of ALL_FIELDS) {
      if (!extracted[f]) missingFields.push(f);
    }
    const needsReview = missingFields.length > 0;

    const result = {
      contract_title: (extracted.contract_title as string) || null,
      counterparty: (extracted.counterparty as string) || null,
      start_date: (extracted.start_date as string) || null,
      end_date: (extracted.end_date as string) || null,
      renewal_date: (extracted.renewal_date as string) || null,
      notice_date: (extracted.notice_date as string) || null,
      payment_date: (extracted.payment_date as string) || null,
      missing_fields: missingFields,
      needs_review: needsReview,
      notes: (extracted.notes as string) || null,
    };

    const { data: run, error: runError } = await serviceClient
      .from("extraction_runs")
      .insert({
        contract_id,
        status: "completed",
        needs_review: needsReview,
        missing_fields: missingFields,
        raw_json: result,
        model: "gpt-4o-mini",
      })
      .select()
      .single();

    if (runError) {
      console.error("Failed to save extraction run:", runError);
      return jsonResponse({ error: "Failed to save extraction result" }, 500);
    }

    return jsonResponse({
      extraction: result,
      run_id: run.id,
      status: "completed",
    });
  } catch (e) {
    console.error("Extraction error:", (e as Error).message);
    await saveFailedRun(serviceClient, contract_id, (e as Error).message);
    return jsonResponse(
      { error: "Extraction failed", status: "failed" },
      500,
    );
  }
});
