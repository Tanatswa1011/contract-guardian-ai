import { z } from "zod";

export const supportedExtractionFields = [
  "contract_title",
  "counterparty",
  "start_date",
  "end_date",
  "renewal_date",
  "notice_date",
  "payment_date",
] as const;

export type SupportedExtractionField =
  (typeof supportedExtractionFields)[number];

export const extractionFieldLabels: Record<SupportedExtractionField, string> = {
  contract_title: "Contract title",
  counterparty: "Counterparty",
  start_date: "Start date",
  end_date: "End date",
  renewal_date: "Renewal date",
  notice_date: "Notice date",
  payment_date: "Payment date",
};

export const contractExtractionSchema = z.object({
  contract_title: z.string().nullable(),
  counterparty: z.string().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  renewal_date: z.string().nullable(),
  notice_date: z.string().nullable(),
  payment_date: z.string().nullable(),
  missing_fields: z.array(z.enum(supportedExtractionFields)),
  needs_review: z.boolean(),
  notes: z.string().nullable(),
}).strict();

export type ContractExtractionSuggestion = z.infer<
  typeof contractExtractionSchema
>;

export function parseContractExtraction(
  rawValue: unknown,
): ContractExtractionSuggestion | null {
  const parsed = contractExtractionSchema.safeParse(rawValue);
  return parsed.success ? parsed.data : null;
}
