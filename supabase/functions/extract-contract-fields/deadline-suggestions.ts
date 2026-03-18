const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

type SuggestedDeadlineDateType = "end" | "renewal" | "notice";

type DeadlineSuggestionSource = {
  end_date?: string | null;
  renewal_date?: string | null;
  notice_date?: string | null;
};

const DEADLINE_OFFSETS: Record<SuggestedDeadlineDateType, number[]> = {
  end: [30, 15, 7],
  renewal: [30, 15],
  notice: [7],
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeIsoDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = normalizeWhitespace(value);
  if (!ISO_DATE_REGEX.test(normalized)) return null;

  const date = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10) === normalized ? normalized : null;
}

function subtractDaysFromIsoDate(value: string, days: number): string | null {
  const normalized = normalizeIsoDate(value);
  if (!normalized || !Number.isFinite(days)) return null;

  const [year, month, day] = normalized.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - days);

  return date.toISOString().slice(0, 10);
}

function buildSuggestedDeadlineLabel(dateType: SuggestedDeadlineDateType, offsetValue: number): string {
  return `${offsetValue} days before ${dateType} date`;
}

function buildSuggestedDeadlineNote(
  dateType: SuggestedDeadlineDateType,
  sourceDate: string,
  offsetValue: number,
): string {
  return `Suggested from extracted ${dateType} date ${sourceDate}; reminder ${offsetValue} days before.`;
}

export function generateSuggestedDeadlines(source: DeadlineSuggestionSource | null | undefined) {
  if (!source) return [];

  const dateValues: Array<{ date_type: SuggestedDeadlineDateType; source_date: string | null }> = [
    { date_type: "end", source_date: normalizeIsoDate(source.end_date) },
    { date_type: "renewal", source_date: normalizeIsoDate(source.renewal_date) },
    { date_type: "notice", source_date: normalizeIsoDate(source.notice_date) },
  ];

  return dateValues.flatMap(({ date_type, source_date }) => {
    if (!source_date) return [];

    return DEADLINE_OFFSETS[date_type]
      .map((offset_value) => {
        const due_date = subtractDaysFromIsoDate(source_date, offset_value);
        if (!due_date) return null;

        return {
          date_type,
          source_date,
          due_date,
          offset_value,
          offset_unit: "days" as const,
          label: buildSuggestedDeadlineLabel(date_type, offset_value),
          note: buildSuggestedDeadlineNote(date_type, source_date, offset_value),
        };
      })
      .filter((suggestion): suggestion is NonNullable<typeof suggestion> => suggestion !== null);
  });
}
