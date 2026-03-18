const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export type SuggestedDeadlineDateType = 'end' | 'renewal' | 'notice' | 'payment';

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
  payment_date?: string | null;
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

export function generateSuggestedDeadlines(input: SuggestionInput): SuggestedDeadline[] {
  const endDate = normalizeIsoDate(input.end_date);
  const renewalDate = normalizeIsoDate(input.renewal_date);
  const noticeDate = normalizeIsoDate(input.notice_date);
  const paymentDate = normalizeIsoDate(input.payment_date);

  const suggestions: SuggestedDeadline[] = [];

  if (renewalDate) {
    suggestions.push({
      due_date: subtractDays(renewalDate, 30),
      offset_value: 30,
      offset_unit: 'days',
      date_type: 'renewal',
      source_date: renewalDate,
    });
  } else if (endDate) {
    suggestions.push({
      due_date: subtractDays(endDate, 30),
      offset_value: 30,
      offset_unit: 'days',
      date_type: 'end',
      source_date: endDate,
    });
  }

  if (noticeDate) {
    suggestions.push({
      due_date: subtractDays(noticeDate, 7),
      offset_value: 7,
      offset_unit: 'days',
      date_type: 'notice',
      source_date: noticeDate,
    });
  }

  if (paymentDate) {
    suggestions.push({
      due_date: subtractDays(paymentDate, 7),
      offset_value: 7,
      offset_unit: 'days',
      date_type: 'payment',
      source_date: paymentDate,
    });
  }

  suggestions.sort((left, right) => left.due_date.localeCompare(right.due_date));
  return suggestions;
}
