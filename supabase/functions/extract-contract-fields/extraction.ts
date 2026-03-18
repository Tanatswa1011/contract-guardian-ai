import { extractText as unpdfExtractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

export const SUPPORTED_EXTRACTION_FIELDS = [
  "contract_title",
  "counterparty",
  "start_date",
  "end_date",
  "renewal_date",
  "notice_date",
  "payment_date",
] as const;

type SupportedExtractionField = (typeof SUPPORTED_EXTRACTION_FIELDS)[number];
type SuggestedDeadlineType = "renewal" | "notice" | "payment";
type SuggestedDeadlineSource =
  | "end_date"
  | "notice_date"
  | "notice_period_days"
  | "payment_date"
  | "payment_terms_days";

type ComputedDeadline = {
  type: SuggestedDeadlineType;
  due_date: string;
  label: string;
  note: string;
  source: SuggestedDeadlineSource;
  source_date: string;
  offset_value: number | null;
  offset_unit: "days" | null;
};

export type ContractExtractionResult = {
  contract_title: string | null;
  counterparty: string | null;
  start_date: string | null;
  end_date: string | null;
  renewal_date: string | null;
  notice_date: string | null;
  payment_date: string | null;
  notice_period_days: number | null;
  payment_terms_days: number | null;
  computed_deadlines: ComputedDeadline[];
  missing_fields: string[];
  needs_review: boolean;
  notes: string | null;
};

const OPENAI_PROMPT = `Extract only these fields from the contract text:
- contract_title
- counterparty
- start_date
- end_date
- renewal_date
- notice_date
- payment_date
- notice_period_days
- payment_terms_days

Rules:
- Return only valid JSON that matches the requested schema.
- If a field is uncertain, ambiguous, or not explicitly present, return null.
- Never invent data.
- For dates, return ISO format YYYY-MM-DD only when clearly supported by text; otherwise null.
- For notice_period_days, return the number of days only when the contract explicitly states a notice period in days; otherwise null.
- For payment_terms_days, return the number of days only when the contract explicitly states payment terms in days (for example, Net 30); otherwise null.
- Include missing_fields for any null extraction among supported fields.
- Set needs_review=true whenever any field is missing or uncertain.
- Keep notes concise.`;

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TEXT_CHARS = 36000;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_REGEX.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString().slice(0, 10) === value;
}

function normalizeNullableString(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const normalized = normalizeWhitespace(input);
  return normalized.length > 0 ? normalized : null;
}

function normalizeNullableIsoDate(input: unknown): string | null {
  const value = normalizeNullableString(input);
  if (!value) return null;
  return isValidIsoDate(value) ? value : null;
}

function normalizeNullablePositiveInteger(input: unknown): number | null {
  if (typeof input !== "number" || !Number.isInteger(input) || input <= 0) {
    return null;
  }

  return input;
}

function subtractDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function buildComputedDeadlines(result: Omit<ContractExtractionResult, "computed_deadlines" | "missing_fields" | "needs_review">): ComputedDeadline[] {
  const suggestions: ComputedDeadline[] = [];

  if (result.end_date) {
    suggestions.push({
      type: "renewal",
      due_date: subtractDays(result.end_date, 30),
      label: "Renewal deadline",
      note: `Suggested 30 days before the contract end date (${result.end_date}).`,
      source: "end_date",
      source_date: result.end_date,
      offset_value: 30,
      offset_unit: "days",
    });
  }

  if (result.notice_date) {
    suggestions.push({
      type: "notice",
      due_date: result.notice_date,
      label: "Notice deadline",
      note: `Suggested from the extracted notice date (${result.notice_date}).`,
      source: "notice_date",
      source_date: result.notice_date,
      offset_value: null,
      offset_unit: null,
    });
  } else if (result.end_date && result.notice_period_days) {
    suggestions.push({
      type: "notice",
      due_date: subtractDays(result.end_date, result.notice_period_days),
      label: "Notice deadline",
      note: `Suggested from the detected ${result.notice_period_days}-day notice period before the contract end date.`,
      source: "notice_period_days",
      source_date: result.end_date,
      offset_value: result.notice_period_days,
      offset_unit: "days",
    });
  }

  if (result.payment_date) {
    suggestions.push({
      type: "payment",
      due_date: result.payment_date,
      label: "Payment deadline",
      note: `Suggested from the extracted payment date (${result.payment_date}).`,
      source: "payment_date",
      source_date: result.payment_date,
      offset_value: null,
      offset_unit: null,
    });
  } else if (result.start_date && result.payment_terms_days) {
    suggestions.push({
      type: "payment",
      due_date: addDays(result.start_date, result.payment_terms_days),
      label: "Payment deadline",
      note: `Suggested from detected Net ${result.payment_terms_days} payment terms and the contract start date.`,
      source: "payment_terms_days",
      source_date: result.start_date,
      offset_value: result.payment_terms_days,
      offset_unit: "days",
    });
  }

  const seen = new Set<string>();
  const deduped = suggestions.filter((suggestion) => {
    const key = `${suggestion.type}:${suggestion.due_date}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });

  deduped.sort((left, right) => left.due_date.localeCompare(right.due_date));
  return deduped;
}

function buildMissingFields(result: ContractExtractionResult): string[] {
  const computedDeadlineTypes = new Set(result.computed_deadlines.map((deadline) => deadline.type));
  return SUPPORTED_EXTRACTION_FIELDS.filter((field) => {
    if (field === "renewal_date" && computedDeadlineTypes.has("renewal")) {
      return false;
    }

    if (field === "notice_date" && computedDeadlineTypes.has("notice")) {
      return false;
    }

    if (field === "payment_date" && computedDeadlineTypes.has("payment")) {
      return false;
    }

    return !result[field];
  });
}

function extractJsonCandidate(rawContent: string): string {
  const trimmed = rawContent.trim();
  if (!trimmed) return trimmed;

  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function getOpenAiMessageContent(payload: unknown): string {
  const message = (payload as Record<string, unknown> | null)?.choices &&
    Array.isArray((payload as Record<string, unknown>).choices)
    ? ((payload as Record<string, unknown>).choices as Array<Record<string, unknown>>)[0]?.message
    : null;

  if (!message || typeof message !== "object") {
    throw new Error("OpenAI response did not include a message payload");
  }

  const content = (message as Record<string, unknown>).content;
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    const chunks = content
      .map((item) => {
        if (!item || typeof item !== "object") return "";
        const part = item as Record<string, unknown>;
        if (typeof part.text === "string") return part.text;
        if (typeof part.content === "string") return part.content;
        return "";
      })
      .filter((chunk) => chunk.length > 0);

    if (chunks.length > 0) {
      return chunks.join("\n");
    }
  }

  throw new Error("OpenAI response did not include JSON content");
}

function parseExtractionJson(content: string): ContractExtractionResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonCandidate(content));
  } catch (error) {
    throw new Error(
      `OpenAI returned non-JSON content: ${
        error instanceof Error ? error.message : "invalid response"
      }`,
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("OpenAI response JSON is not an object");
  }

  const source = parsed as Record<string, unknown>;
  const normalizedBase = {
    contract_title: normalizeNullableString(source.contract_title),
    counterparty: normalizeNullableString(source.counterparty),
    start_date: normalizeNullableIsoDate(source.start_date),
    end_date: normalizeNullableIsoDate(source.end_date),
    renewal_date: normalizeNullableIsoDate(source.renewal_date),
    notice_date: normalizeNullableIsoDate(source.notice_date),
    payment_date: normalizeNullableIsoDate(source.payment_date),
    notice_period_days: normalizeNullablePositiveInteger(source.notice_period_days),
    payment_terms_days: normalizeNullablePositiveInteger(source.payment_terms_days),
    notes: normalizeNullableString(source.notes),
  };
  const normalized: ContractExtractionResult = {
    ...normalizedBase,
    computed_deadlines: buildComputedDeadlines(normalizedBase),
    missing_fields: [],
    needs_review: true,
  };

  const computedDeadlineTypes = new Set(normalized.computed_deadlines.map((deadline) => deadline.type));
  const declaredMissing = (Array.isArray(source.missing_fields)
    ? source.missing_fields.filter(
        (field): field is SupportedExtractionField =>
          typeof field === "string" &&
          SUPPORTED_EXTRACTION_FIELDS.includes(field as SupportedExtractionField),
      )
    : []).filter((field) => {
      if (field === "renewal_date") return !computedDeadlineTypes.has("renewal");
      if (field === "notice_date") return !computedDeadlineTypes.has("notice");
      if (field === "payment_date") return !computedDeadlineTypes.has("payment");
      return true;
    });

  const computedMissing = buildMissingFields(normalized);
  const missingFieldSet = new Set<SupportedExtractionField>([
    ...declaredMissing,
    ...(computedMissing as SupportedExtractionField[]),
  ]);
  normalized.missing_fields = Array.from(missingFieldSet);
  normalized.needs_review =
    source.needs_review === true || normalized.missing_fields.length > 0;

  return normalized;
}

export async function extractTextFromPdf(pdfBytes: Uint8Array): Promise<string> {
  try {
    const pdf = await getDocumentProxy(pdfBytes);
    const { text } = await unpdfExtractText(pdf, { mergePages: true });
    return normalizeWhitespace(text).trim();
  } catch (error) {
    throw new Error(
      `PDF_PARSE_ERROR: ${
        error instanceof Error ? error.message : "Failed to parse PDF text"
      }`,
    );
  }
}

export function clipDocumentText(text: string): string {
  if (text.length <= MAX_TEXT_CHARS) return text;
  return text.slice(0, MAX_TEXT_CHARS);
}

export async function extractContractFieldsWithOpenAi({
  openAiApiKey,
  model,
  contractText,
}: {
  openAiApiKey: string;
  model: string;
  contractText: string;
}): Promise<ContractExtractionResult> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "contract_extraction",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              contract_title: { type: ["string", "null"] },
              counterparty: { type: ["string", "null"] },
              start_date: { type: ["string", "null"] },
              end_date: { type: ["string", "null"] },
              renewal_date: { type: ["string", "null"] },
              notice_date: { type: ["string", "null"] },
              payment_date: { type: ["string", "null"] },
              notice_period_days: { type: ["integer", "null"] },
              payment_terms_days: { type: ["integer", "null"] },
              missing_fields: {
                type: "array",
                items: {
                  type: "string",
                  enum: SUPPORTED_EXTRACTION_FIELDS,
                },
              },
              needs_review: { type: "boolean" },
              notes: { type: ["string", "null"] },
            },
            required: [
              "contract_title",
              "counterparty",
              "start_date",
              "end_date",
              "renewal_date",
              "notice_date",
              "payment_date",
              "notice_period_days",
              "payment_terms_days",
              "missing_fields",
              "needs_review",
              "notes",
            ],
          },
        },
      },
      messages: [
        {
          role: "system",
          content: OPENAI_PROMPT,
        },
        {
          role: "user",
          content: `Contract text:\n${clipDocumentText(contractText)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI API failed with status ${response.status}: ${body}`);
  }

  const payload = await response.json();
  const content = getOpenAiMessageContent(payload);

  return parseExtractionJson(content);
}
