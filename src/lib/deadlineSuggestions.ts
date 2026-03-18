const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export type SuggestedDeadlineType = 'renewal' | 'notice' | 'payment';
export type SuggestedDeadlineSource =
  | 'end_date'
  | 'notice_date'
  | 'notice_period_days'
  | 'payment_date'
  | 'payment_terms_days';

export type SuggestedDeadline = {
  type: SuggestedDeadlineType;
  due_date: string;
  label: string;
  note: string;
  source: SuggestedDeadlineSource;
  source_date: string;
  offset_value: number | null;
  offset_unit: 'days' | null;
};

type SuggestionInput = {
  start_date?: string | null;
  end_date?: string | null;
  notice_date?: string | null;
  payment_date?: string | null;
  notice_period_days?: number | null;
  payment_terms_days?: number | null;
  computed_deadlines?: unknown;
};

function isIsoDate(value: string): boolean {
  if (!ISO_DATE_REGEX.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString().slice(0, 10) === value;
}

function normalizeIsoDate(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return isIsoDate(trimmed) ? trimmed : null;
}

function normalizePositiveInteger(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    return null;
  }

  return value;
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

function normalizeSuggestedDeadline(value: unknown): SuggestedDeadline | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const source = value as Record<string, unknown>;
  const type = source.type;
  const deadlineType = type === 'renewal' || type === 'notice' || type === 'payment'
    ? type
    : null;
  const dueDate = normalizeIsoDate(typeof source.due_date === 'string' ? source.due_date : null);
  const sourceDate = normalizeIsoDate(typeof source.source_date === 'string' ? source.source_date : null);
  const deadlineSource =
    source.source === 'end_date'
    || source.source === 'notice_date'
    || source.source === 'notice_period_days'
    || source.source === 'payment_date'
    || source.source === 'payment_terms_days'
      ? source.source
      : null;

  if (!deadlineType || !dueDate || !sourceDate || !deadlineSource) {
    return null;
  }

  return {
    type: deadlineType,
    due_date: dueDate,
    label: typeof source.label === 'string' && source.label.trim().length > 0
      ? source.label.trim()
      : `${deadlineType[0].toUpperCase()}${deadlineType.slice(1)} deadline`,
    note: typeof source.note === 'string' ? source.note.trim() : '',
    source: deadlineSource,
    source_date: sourceDate,
    offset_value: normalizePositiveInteger(source.offset_value),
    offset_unit: source.offset_unit === 'days' ? 'days' : null,
  };
}

export function parseSuggestedDeadlines(value: unknown): SuggestedDeadline[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const suggestions = value
    .map((item) => normalizeSuggestedDeadline(item))
    .filter((item): item is SuggestedDeadline => item !== null);

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

export function generateSuggestedDeadlines(input: SuggestionInput): SuggestedDeadline[] {
  const computedSuggestions = parseSuggestedDeadlines(input.computed_deadlines);
  if (computedSuggestions.length > 0) {
    return computedSuggestions;
  }

  const normalizedInput = {
    start_date: normalizeIsoDate(input.start_date),
    end_date: normalizeIsoDate(input.end_date),
    notice_date: normalizeIsoDate(input.notice_date),
    payment_date: normalizeIsoDate(input.payment_date),
    notice_period_days: normalizePositiveInteger(input.notice_period_days),
    payment_terms_days: normalizePositiveInteger(input.payment_terms_days),
  };

  const suggestions: SuggestedDeadline[] = [];

  if (normalizedInput.end_date) {
    suggestions.push({
      type: 'renewal',
      due_date: subtractDays(normalizedInput.end_date, 30),
      label: 'Renewal deadline',
      note: `Suggested 30 days before the contract end date (${normalizedInput.end_date}).`,
      source: 'end_date',
      source_date: normalizedInput.end_date,
      offset_value: 30,
      offset_unit: 'days',
    });
  }

  if (normalizedInput.notice_date) {
    suggestions.push({
      type: 'notice',
      due_date: normalizedInput.notice_date,
      label: 'Notice deadline',
      note: `Suggested from the extracted notice date (${normalizedInput.notice_date}).`,
      source: 'notice_date',
      source_date: normalizedInput.notice_date,
      offset_value: null,
      offset_unit: null,
    });
  } else if (normalizedInput.end_date && normalizedInput.notice_period_days) {
    suggestions.push({
      type: 'notice',
      due_date: subtractDays(normalizedInput.end_date, normalizedInput.notice_period_days),
      label: 'Notice deadline',
      note: `Suggested from the detected ${normalizedInput.notice_period_days}-day notice period before the contract end date.`,
      source: 'notice_period_days',
      source_date: normalizedInput.end_date,
      offset_value: normalizedInput.notice_period_days,
      offset_unit: 'days',
    });
  }

  if (normalizedInput.payment_date) {
    suggestions.push({
      type: 'payment',
      due_date: normalizedInput.payment_date,
      label: 'Payment deadline',
      note: `Suggested from the extracted payment date (${normalizedInput.payment_date}).`,
      source: 'payment_date',
      source_date: normalizedInput.payment_date,
      offset_value: null,
      offset_unit: null,
    });
  } else if (normalizedInput.start_date && normalizedInput.payment_terms_days) {
    suggestions.push({
      type: 'payment',
      due_date: addDays(normalizedInput.start_date, normalizedInput.payment_terms_days),
      label: 'Payment deadline',
      note: `Suggested from detected Net ${normalizedInput.payment_terms_days} payment terms and the contract start date.`,
      source: 'payment_terms_days',
      source_date: normalizedInput.start_date,
      offset_value: normalizedInput.payment_terms_days,
      offset_unit: 'days',
    });
  }

  const seen = new Set<string>();
  const deduped = suggestions.filter((suggestion) => {
    const key = `${suggestion.type}:${suggestion.due_date}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  deduped.sort((left, right) => left.due_date.localeCompare(right.due_date));
  return deduped;
}
