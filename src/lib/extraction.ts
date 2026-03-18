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

export type SuggestedDeadline = {
  offset_value: number;
  offset_unit: 'days';
  date_type: 'end' | 'renewal' | 'notice';
  due_date: string;
  label: string;
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

function subtractDays(isoDate: string, days: number): string | null {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

const DATE_TYPE_LABELS: Record<SuggestedDeadline['date_type'], string> = {
  end: 'contract end date',
  renewal: 'renewal date',
  notice: 'notice date',
};

export function generateSuggestedDeadlines(suggestion: ExtractionSuggestion): SuggestedDeadline[] {
  const deadlines: SuggestedDeadline[] = [];

  const rules: Array<{ field: keyof ExtractionSuggestion; dateType: SuggestedDeadline['date_type']; offsets: number[] }> = [
    { field: 'end_date', dateType: 'end', offsets: [30, 15, 7] },
    { field: 'renewal_date', dateType: 'renewal', offsets: [30, 15] },
    { field: 'notice_date', dateType: 'notice', offsets: [7] },
  ];

  for (const rule of rules) {
    const sourceDate = suggestion[rule.field];
    if (typeof sourceDate !== 'string' || !isIsoDate(sourceDate)) continue;

    for (const offset of rule.offsets) {
      const due = subtractDays(sourceDate, offset);
      if (due) {
        deadlines.push({
          offset_value: offset,
          offset_unit: 'days',
          date_type: rule.dateType,
          due_date: due,
          label: `${offset} days before ${DATE_TYPE_LABELS[rule.dateType]}`,
        });
      }
    }
  }

  return deadlines;
}

export function parseExtractionSuggestion(rawJson: Json): ExtractionSuggestion | null {
  if (!rawJson || typeof rawJson !== 'object' || Array.isArray(rawJson)) {
    return null;
  }

  const source = rawJson as Record<string, unknown>;
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
