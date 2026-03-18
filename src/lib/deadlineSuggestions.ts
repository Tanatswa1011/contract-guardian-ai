const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export type SuggestedDeadlineDateType = 'end' | 'renewal' | 'notice';

export type SuggestedDeadline = {
  due_date: string;
  offset_value: number;
  offset_unit: 'days';
  date_type: SuggestedDeadlineDateType;
  source_date: string;
  /** Maps to contract_dates.type: renewal, notice, payment, or custom */
  db_type: 'renewal' | 'notice' | 'payment' | 'custom';
};

type SuggestionInput = {
  end_date?: string | null;
  renewal_date?: string | null;
  notice_date?: string | null;
  notice_period_days?: number | null;
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
  let noticeDate = normalizeIsoDate(input.notice_date);
  const paymentDate = normalizeIsoDate(input.payment_date);

  // Compute notice_date from end_date - notice_period_days when not explicitly extracted
  if (!noticeDate && endDate && typeof input.notice_period_days === 'number' && input.notice_period_days > 0) {
    noticeDate = subtractDays(endDate, input.notice_period_days);
  }

  const suggestions: SuggestedDeadline[] = [];

  // end_date → suggest renewal reminder (30 days before) as type 'renewal'
  if (endDate) {
    suggestions.push({
      due_date: subtractDays(endDate, 30),
      offset_value: 30,
      offset_unit: 'days',
      date_type: 'end',
      source_date: endDate,
      db_type: 'renewal',
    });
  }

  // renewal_date → suggest 30 days before as type 'renewal' (only if no end_date suggestion to avoid duplicate)
  if (renewalDate && !endDate) {
    suggestions.push({
      due_date: subtractDays(renewalDate, 30),
      offset_value: 30,
      offset_unit: 'days',
      date_type: 'renewal',
      source_date: renewalDate,
      db_type: 'renewal',
    });
  }

  // notice_date → suggest 7 days before as type 'notice'
  if (noticeDate) {
    suggestions.push({
      due_date: subtractDays(noticeDate, 7),
      offset_value: 7,
      offset_unit: 'days',
      date_type: 'notice',
      source_date: noticeDate,
      db_type: 'notice',
    });
  }

  // payment_date → suggest payment reminder
  if (paymentDate) {
    suggestions.push({
      due_date: paymentDate,
      offset_value: 0,
      offset_unit: 'days',
      date_type: 'notice',
      source_date: paymentDate,
      db_type: 'payment',
    });
  }

  const seen = new Set<string>();
  const deduped = suggestions.filter((suggestion) => {
    const key = `${suggestion.db_type}:${suggestion.due_date}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  deduped.sort((left, right) => left.due_date.localeCompare(right.due_date));
  return deduped;
}
