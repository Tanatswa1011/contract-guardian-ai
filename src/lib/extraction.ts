import type { Json } from '@/integrations/supabase/types';

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

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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

function toSupportedField(value: unknown): SupportedExtractionField | null {
  if (typeof value !== 'string') return null;
  return SUPPORTED_EXTRACTION_FIELDS.includes(value as SupportedExtractionField)
    ? (value as SupportedExtractionField)
    : null;
}

export function parseExtractionSuggestion(rawJson: Json): ExtractionSuggestion | null {
  if (!rawJson || typeof rawJson !== 'object' || Array.isArray(rawJson)) {
    return null;
  }

  const source = rawJson as Record<string, unknown>;
  // If raw_json is an error object from failed extraction, return null
  if (source.error && typeof source.error === 'string') {
    return null;
  }
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

/** Suggested deadline: offset days before a key date */
export type SuggestedDeadline = {
  type: string;
  due_date: string;
  label: string;
  date_type: 'end' | 'renewal' | 'notice';
  offset_value: number;
  offset_unit: 'days';
};

function addDaysToIsoDate(isoDate: string, days: number): string | null {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Generate suggested deadlines in code from extracted dates.
 * Does NOT rely on AI — AI only returns raw dates (end_date, renewal_date, notice_date).
 *
 * Logic:
 * - end_date → 30, 15, 7 days before
 * - renewal_date → 30, 15 days before
 * - notice_date → 7 days before
 */
export function generateSuggestedDeadlines(suggestion: ExtractionSuggestion | null): SuggestedDeadline[] {
  if (!suggestion) return [];

  const results: SuggestedDeadline[] = [];

  if (suggestion.end_date) {
    for (const offset of [30, 15, 7]) {
      const due_date = addDaysToIsoDate(suggestion.end_date, -offset);
      if (due_date) {
        results.push({
          type: `end_${offset}d`,
          due_date,
          label: `${offset} days before end date`,
          date_type: 'end',
          offset_value: offset,
          offset_unit: 'days',
        });
      }
    }
  }

  if (suggestion.renewal_date) {
    for (const offset of [30, 15]) {
      const due_date = addDaysToIsoDate(suggestion.renewal_date, -offset);
      if (due_date) {
        results.push({
          type: `renewal_${offset}d`,
          due_date,
          label: `${offset} days before renewal`,
          date_type: 'renewal',
          offset_value: offset,
          offset_unit: 'days',
        });
      }
    }
  }

  if (suggestion.notice_date) {
    const due_date = addDaysToIsoDate(suggestion.notice_date, -7);
    if (due_date) {
      results.push({
        type: 'notice_7d',
        due_date,
        label: '7 days before notice date',
        date_type: 'notice',
        offset_value: 7,
        offset_unit: 'days',
      });
    }
  }

  return results;
}
