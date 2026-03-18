const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export type SuggestedDeadlineDateType = 'end' | 'renewal' | 'notice';

export type SuggestedDeadline = {
  due_date: string;
  offset_value: number;
  offset_unit: 'days';
  date_type: SuggestedDeadlineDateType;
  source_date: string;
};

type SuggestionInput = {
  end_date?: string | null;
  renewal_date?: string | null;
  notice_date?: string | null;
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

function subtractDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function buildSuggestionsForDateType(
  dateType: SuggestedDeadlineDateType,
  sourceDate: string | null,
  offsetsInDays: number[],
): SuggestedDeadline[] {
  if (!sourceDate) return [];
  return offsetsInDays.map((offset) => ({
    due_date: subtractDays(sourceDate, offset),
    offset_value: offset,
    offset_unit: 'days' as const,
    date_type: dateType,
    source_date: sourceDate,
  }));
}

export function generateSuggestedDeadlines(input: SuggestionInput): SuggestedDeadline[] {
  const normalizedInput = {
    end_date: normalizeIsoDate(input.end_date),
    renewal_date: normalizeIsoDate(input.renewal_date),
    notice_date: normalizeIsoDate(input.notice_date),
  };

  const suggestions = [
    ...buildSuggestionsForDateType('end', normalizedInput.end_date, [30, 15, 7]),
    ...buildSuggestionsForDateType('renewal', normalizedInput.renewal_date, [30, 15]),
    ...buildSuggestionsForDateType('notice', normalizedInput.notice_date, [7]),
  ];

  const seen = new Set<string>();
  const deduped = suggestions.filter((suggestion) => {
    const key = `${suggestion.date_type}:${suggestion.offset_value}:${suggestion.due_date}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  deduped.sort((left, right) => left.due_date.localeCompare(right.due_date));
  return deduped;
}
