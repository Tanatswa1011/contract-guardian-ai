import { getDocumentProxy, extractText as unpdfExtractText } from "https://esm.sh/unpdf@0.12.1";

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

export type ContractExtractionResult = {
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

const OPENAI_PROMPT = `Extract only these fields from the contract text:
- contract_title
- counterparty
- start_date
- end_date
- renewal_date
- notice_date
- payment_date

Rules:
- Return only valid JSON that matches the requested schema.
- If a field is uncertain, ambiguous, or not explicitly present, return null.
- Never invent data.
- For dates, return ISO format YYYY-MM-DD only when clearly supported by text; otherwise null.
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

function buildMissingFields(result: ContractExtractionResult): string[] {
  return SUPPORTED_EXTRACTION_FIELDS.filter((field) => !result[field]);
}

function parseExtractionJson(content: string): ContractExtractionResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
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
  const normalized: ContractExtractionResult = {
    contract_title: normalizeNullableString(source.contract_title),
    counterparty: normalizeNullableString(source.counterparty),
    start_date: normalizeNullableIsoDate(source.start_date),
    end_date: normalizeNullableIsoDate(source.end_date),
    renewal_date: normalizeNullableIsoDate(source.renewal_date),
    notice_date: normalizeNullableIsoDate(source.notice_date),
    payment_date: normalizeNullableIsoDate(source.payment_date),
    missing_fields: [],
    needs_review: true,
    notes: normalizeNullableString(source.notes),
  };

  const declaredMissing = Array.isArray(source.missing_fields)
    ? source.missing_fields.filter(
        (field): field is SupportedExtractionField =>
          typeof field === "string" &&
          SUPPORTED_EXTRACTION_FIELDS.includes(field as SupportedExtractionField),
      )
    : [];

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
  console.log(`[pdf-parse] Starting PDF text extraction (${pdfBytes.byteLength} bytes)`);
  try {
    const loadingTask = getDocument(pdfBytes);
    const pdf = await loadingTask.promise;
    console.log(`[pdf-parse] PDF loaded successfully. Pages: ${pdf.numPages}`);
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = (textContent.items as Array<Record<string, unknown>>)
        .map((item) => (typeof item.str === "string" ? item.str : ""))
        .join(" ");
      const normalizedPage = normalizeWhitespace(pageText);
      if (normalizedPage) {
        pages.push(normalizedPage);
      }
    }

    const result = pages.join("\n\n").trim();
    console.log(`[pdf-parse] Extraction complete. Characters: ${result.length}`);
    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[pdf-parse] PDF parsing failed: ${msg}`);
    throw new Error(`PDF text extraction failed: ${msg}`);
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
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    throw new Error("OpenAI response did not include JSON content");
  }

  return parseExtractionJson(content);
}
