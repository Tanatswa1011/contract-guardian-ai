const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export type SuggestedDeadline = {
  type: 'renewal' | 'notice' | 'payment';
  due_date: string;
  label: string;
  note: string;
};

type SuggestionInput = {
  start_date?: string | null;
  end_date?: string | null;
  renewal_date?: string | null;
  notice_date?: string | null;
  payment_date?: string | null;
  notice_period_days?: number | null;
  payment_terms_days?: number | null;
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

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizePositiveInteger(value: number | null | undefined): number | null {
  if (!Number.isInteger(value) || !value || value < 0) return null;
  return value;
}

export function generateSuggestedDeadlines(input: SuggestionInput): SuggestedDeadline[] {
  const normalizedInput = {
    start_date: normalizeIsoDate(input.start_date),
    end_date: normalizeIsoDate(input.end_date),
    renewal_date: normalizeIsoDate(input.renewal_date),
    notice_date: normalizeIsoDate(input.notice_date),
    payment_date: normalizeIsoDate(input.payment_date),
    notice_period_days: normalizePositiveInteger(input.notice_period_days),
    payment_terms_days: normalizePositiveInteger(input.payment_terms_days),
  };

  const renewalDate = normalizedInput.renewal_date
    ?? (normalizedInput.end_date ? subtractDays(normalizedInput.end_date, 30) : null);
  const noticeAnchorDate = renewalDate ?? normalizedInput.end_date;
  const noticeDate = normalizedInput.notice_date
    ?? (normalizedInput.notice_period_days && noticeAnchorDate
      ? subtractDays(noticeAnchorDate, normalizedInput.notice_period_days)
      : null);
  const paymentDate = normalizedInput.payment_date
    ?? (normalizedInput.payment_terms_days && normalizedInput.start_date
      ? addDays(normalizedInput.start_date, normalizedInput.payment_terms_days)
      : null);

  const suggestions: SuggestedDeadline[] = [];
  if (renewalDate) {
    suggestions.push({
      type: 'renewal',
      due_date: renewalDate,
      label: 'Renewal Deadline',
      note: normalizedInput.renewal_date
        ? 'Derived from extracted renewal date.'
        : 'Computed as 30 days before contract end date.',
    });
  }
  if (noticeDate) {
    suggestions.push({
      type: 'notice',
      due_date: noticeDate,
      label: 'Notice Deadline',
      note: normalizedInput.notice_date
        ? 'Derived from extracted notice date.'
        : 'Computed from detected notice period.',
    });
  }
  if (paymentDate) {
    suggestions.push({
      type: 'payment',
      due_date: paymentDate,
      label: 'Payment Deadline',
      note: normalizedInput.payment_date
        ? 'Derived from extracted payment date.'
        : 'Computed from detected payment terms.',
    });
  }

  suggestions.sort((left, right) => left.due_date.localeCompare(right.due_date));
  return suggestions;
}
