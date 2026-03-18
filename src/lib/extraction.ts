import type { Json } from '@/integrations/supabase/types';
import { normalizeIsoDate } from '@/lib/contractDeadlineSuggestions';

export const SUPPORTED_EXTRACTION_FIELDS = [
  'contract_title',
  'counterparty',
  'start_date',
  'end_date',
  'renewal_date',
  'notice_date',
  'payment_date',
] as const;

export type SupportedExtractionField = (typeof SUPPORTED_EXTRACTION_FIELDS)[number];

export type ExtractionSuggestion = {
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

function normalizeString(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.replace(/\s+/g, ' ').trim();
  return trimmed.length ? trimmed : null;
}

function toSupportedField(value: unknown): SupportedExtractionField | null {
  if (typeof value !== 'string') return null;
  return SUPPORTED_EXTRACTION_FIELDS.includes(value as SupportedExtractionField)
    ? (value as SupportedExtractionField)
    : null;
}

export function parseExtractionSuggestion(rawJson: Json): ExtractionSuggestion | null {
  const parsedRawJson = typeof rawJson === 'string'
    ? (() => {
      try {
        return JSON.parse(rawJson);
      } catch {
        return null;
      }
    })()
    : rawJson;

  if (!parsedRawJson || typeof parsedRawJson !== 'object' || Array.isArray(parsedRawJson)) {
    return null;
  }

  const source = parsedRawJson as Record<string, unknown>;
  const suggestion: ExtractionSuggestion = {
    contract_title: normalizeString(source.contract_title),
    counterparty: normalizeString(source.counterparty),
    start_date: normalizeIsoDate(source.start_date),
    end_date: normalizeIsoDate(source.end_date),
    renewal_date: normalizeIsoDate(source.renewal_date),
    notice_date: normalizeIsoDate(source.notice_date),
    payment_date: normalizeIsoDate(source.payment_date),
    missing_fields: [],
    needs_review: true,
    notes: normalizeString(source.notes),
  };

  const declaredMissing = Array.isArray(source.missing_fields)
    ? source.missing_fields
        .map(toSupportedField)
        .filter((field): field is SupportedExtractionField => field !== null)
    : [];

  const computedMissing = SUPPORTED_EXTRACTION_FIELDS.filter((field) => !suggestion[field]);
  const mergedMissing = new Set<SupportedExtractionField>([...declaredMissing, ...computedMissing]);

  suggestion.missing_fields = Array.from(mergedMissing);
  suggestion.needs_review =
    source.needs_review === true || suggestion.missing_fields.length > 0;

  return suggestion;
}
