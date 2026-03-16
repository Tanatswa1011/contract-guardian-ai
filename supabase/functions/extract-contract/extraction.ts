import { extractText, getDocumentProxy } from "unpdf";

export const SUPPORTED_EXTRACTION_FIELDS = [
  "contract_title",
  "counterparty",
  "start_date",
  "end_date",
  "renewal_date",
  "notice_date",
  "payment_date",
] as const;

export type SupportedExtractionField =
  (typeof SUPPORTED_EXTRACTION_FIELDS)[number];

export type ContractExtractionResult = {
  contract_title: string | null;
  counterparty: string | null;
  start_date: string | null;
  end_date: string | null;
  renewal_date: string | null;
  notice_date: string | null;
  payment_date: string | null;
  missing_fields: SupportedExtractionField[];
  needs_review: boolean;
  notes: string | null;
};

export const EXTRACTION_FIELD_LABELS: Record<SupportedExtractionField, string> =
  {
    contract_title: "Contract title",
    counterparty: "Counterparty",
    start_date: "Start date",
    end_date: "End date",
    renewal_date: "Renewal date",
    notice_date: "Notice date",
    payment_date: "Payment date",
  };

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DOCUMENT_CHARACTERS = 60_000;
const LEADING_DOCUMENT_CHARACTERS = 35_000;

export const EXTRACTION_SYSTEM_PROMPT = [
  "You extract a very small set of fields from contract text.",
  "Return JSON only.",
  "Only extract these supported fields: contract_title, counterparty, start_date, end_date, renewal_date, notice_date, payment_date.",
  "If a value is missing, ambiguous, inferred, or not clearly stated, return null for that field.",
  "Dates must be ISO format YYYY-MM-DD only when clearly stated and confidently extractable; otherwise return null.",
  "Prefer under-extraction over guessing.",
  "Set missing_fields to every supported field whose value is null.",
  "Set needs_review to true when any field is null, any field is uncertain, or notes is not null.",
  "Use notes only for short review guidance; otherwise return null.",
].join(" ");

const EXTRACTION_JSON_SCHEMA = {
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
      missing_fields: {
        type: "array",
        items: {
          type: "string",
          enum: [...SUPPORTED_EXTRACTION_FIELDS],
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
      "missing_fields",
      "needs_review",
      "notes",
    ],
  },
} as const;

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeDate(value: unknown): string | null {
  const normalized = normalizeNullableString(value);
  if (!normalized) {
    return null;
  }

  return ISO_DATE_REGEX.test(normalized) ? normalized : null;
}

function normalizeNotes(value: unknown): string | null {
  const normalized = normalizeNullableString(value);
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, 500);
}

function uniqueFields(fields: SupportedExtractionField[]) {
  return [...new Set(fields)];
}

function coerceMissingFields(value: unknown): SupportedExtractionField[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return uniqueFields(
    value.filter((field): field is SupportedExtractionField =>
      SUPPORTED_EXTRACTION_FIELDS.includes(field as SupportedExtractionField)
    ),
  );
}

function sanitizeExtractionResult(value: unknown): ContractExtractionResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("OpenAI returned an invalid extraction payload");
  }

  const raw = value as Record<string, unknown>;
  const sanitized: ContractExtractionResult = {
    contract_title: normalizeNullableString(raw.contract_title),
    counterparty: normalizeNullableString(raw.counterparty),
    start_date: normalizeDate(raw.start_date),
    end_date: normalizeDate(raw.end_date),
    renewal_date: normalizeDate(raw.renewal_date),
    notice_date: normalizeDate(raw.notice_date),
    payment_date: normalizeDate(raw.payment_date),
    missing_fields: [],
    needs_review: typeof raw.needs_review === "boolean"
      ? raw.needs_review
      : true,
    notes: normalizeNotes(raw.notes),
  };

  const nullDerivedMissingFields = SUPPORTED_EXTRACTION_FIELDS.filter((field) =>
    sanitized[field] === null
  );

  sanitized.missing_fields = uniqueFields([
    ...coerceMissingFields(raw.missing_fields),
    ...nullDerivedMissingFields,
  ]);
  sanitized.needs_review = sanitized.needs_review ||
    sanitized.missing_fields.length > 0 ||
    sanitized.notes !== null;

  return sanitized;
}

function truncateDocumentText(text: string): string {
  if (text.length <= MAX_DOCUMENT_CHARACTERS) {
    return text;
  }

  const trailingDocumentCharacters =
    MAX_DOCUMENT_CHARACTERS - LEADING_DOCUMENT_CHARACTERS;

  return [
    text.slice(0, LEADING_DOCUMENT_CHARACTERS),
    "\n\n[TRUNCATED CONTRACT CONTENT]\n\n",
    text.slice(-trailingDocumentCharacters),
  ].join("");
}

function normalizeDocumentText(text: string): string {
  return text
    .replaceAll("\u0000", "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getChatCompletionContent(response: Record<string, unknown>): string {
  const choices = response.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error("OpenAI response did not include any choices");
  }

  const firstChoice = choices[0];
  if (!firstChoice || typeof firstChoice !== "object") {
    throw new Error("OpenAI response choice was invalid");
  }

  const message = (firstChoice as Record<string, unknown>).message;
  if (!message || typeof message !== "object") {
    throw new Error("OpenAI response did not include a message");
  }

  const content = (message as Record<string, unknown>).content;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("OpenAI response did not include JSON content");
  }

  return content;
}

async function requestOpenAIJson(
  apiKey: string,
  model: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const errorMessage =
      payload && typeof payload === "object" && "error" in payload
        ? JSON.stringify(payload)
        : `OpenAI request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("OpenAI returned an invalid response body");
  }

  return payload as Record<string, unknown>;
}

function shouldRetryWithJsonObject(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("json_schema") ||
    message.includes("response_format") ||
    message.includes("unsupported");
}

async function extractWithOpenAI(
  apiKey: string,
  model: string,
  promptText: string,
): Promise<ContractExtractionResult> {
  const baseBody = {
    model,
    temperature: 0,
    messages: [
      { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
      {
        role: "user",
        content: promptText,
      },
    ],
  } satisfies Record<string, unknown>;

  let payload: Record<string, unknown> | null = null;

  try {
    payload = await requestOpenAIJson(apiKey, model, {
      ...baseBody,
      response_format: {
        type: "json_schema",
        json_schema: EXTRACTION_JSON_SCHEMA,
      },
    });
  } catch (error) {
    if (!shouldRetryWithJsonObject(error)) {
      throw error;
    }

    console.warn(
      "OpenAI json_schema response format failed, retrying with json_object",
      error,
    );
    payload = await requestOpenAIJson(apiKey, model, {
      ...baseBody,
      response_format: {
        type: "json_object",
      },
    });
  }

  const content = getChatCompletionContent(payload);
  const parsed = JSON.parse(content);
  return sanitizeExtractionResult(parsed);
}

export async function extractPdfText(fileBytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(fileBytes);
  const { text } = await extractText(pdf, { mergePages: true });
  const normalized = normalizeDocumentText(text);

  if (!normalized) {
    throw new Error(
      "No text could be extracted from the PDF. OCR is not enabled for this MVP.",
    );
  }

  return truncateDocumentText(normalized);
}

export async function extractContractData(options: {
  apiKey: string;
  model: string;
  fileName: string;
  text: string;
}): Promise<ContractExtractionResult> {
  const promptText = [
    `File name: ${options.fileName}`,
    "Extract supported contract fields from the text below.",
    "Return the exact JSON shape required and nothing else.",
    "",
    options.text,
  ].join("\n");

  return extractWithOpenAI(options.apiKey, options.model, promptText);
}
