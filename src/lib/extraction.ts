import type { Json } from '@/integrations/supabase/types';

export const SUPPORTED_EXTRACTION_FIELDS = [
  'contract_title',
  'counterparty',
  'start_date',
  'end_date',
  'renewal_date',
  'notice_date',
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
  notice_period_days: number | null;
  payment_terms_days: number | null;
  computed_deadlines: {
    renewal_date: string | null;
    notice_date: string | null;
    payment_date: string | null;
  } | null;
  missing_fields: SupportedExtractionField[];
  needs_review: boolean;
  notes: string | null;
};

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseRawJsonObject(rawJson: Json): Record<string, unknown> | null {
  if (rawJson && typeof rawJson === 'object' && !Array.isArray(rawJson)) {
    return rawJson as Record<string, unknown>;
  }

  if (typeof rawJson === 'string') {
    const trimmed = rawJson.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }

  return null;
}

function normalizeString(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  return trimmed.length ? trimmed : null;
}

function isIsoDate(value: string): boolean {
  if (!ISO_DATE_REGEX.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString().slice(0, 10) === value;
}

function normalizeIsoDate(input: unknown): string | null {
  const value = normalizeString(input);
  if (!value) return null;
  return isIsoDate(value) ? value : null;
}

function normalizeNullablePositiveInteger(input: unknown): number | null {
  if (typeof input !== 'number' || !Number.isInteger(input)) {
    return null;
  }
  if (input <= 0) {
    return null;
  }
  return input;
}

function parseComputedDeadlines(input: unknown): ExtractionSuggestion['computed_deadlines'] {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  const source = input as Record<string, unknown>;
  return {
    renewal_date: normalizeIsoDate(source.renewal_date),
    notice_date: normalizeIsoDate(source.notice_date),
    payment_date: normalizeIsoDate(source.payment_date),
  };
}

function toSupportedField(value: unknown): SupportedExtractionField | null {
  if (typeof value !== 'string') return null;
  return SUPPORTED_EXTRACTION_FIELDS.includes(value as SupportedExtractionField)
    ? (value as SupportedExtractionField)
    : null;
}

export function parseExtractionSuggestion(rawJson: Json): ExtractionSuggestion | null {
  const source = parseRawJsonObject(rawJson);
  if (!source) {
    return null;
  }
  const computedDeadlines = parseComputedDeadlines(source.computed_deadlines);
  const suggestion: ExtractionSuggestion = {
    contract_title: normalizeString(source.contract_title),
    counterparty: normalizeString(source.counterparty),
    start_date: normalizeIsoDate(source.start_date),
    end_date: normalizeIsoDate(source.end_date),
    renewal_date: normalizeIsoDate(source.renewal_date) ?? computedDeadlines?.renewal_date ?? null,
    notice_date: normalizeIsoDate(source.notice_date) ?? computedDeadlines?.notice_date ?? null,
    payment_date: normalizeIsoDate(source.payment_date) ?? computedDeadlines?.payment_date ?? null,
    notice_period_days: normalizeNullablePositiveInteger(source.notice_period_days),
    payment_terms_days: normalizeNullablePositiveInteger(source.payment_terms_days),
    computed_deadlines: computedDeadlines,
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
