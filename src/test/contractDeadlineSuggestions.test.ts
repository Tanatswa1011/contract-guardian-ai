import { describe, expect, it } from 'vitest';
import {
  extractSuggestedDeadlineSourceDate,
  generateSuggestedDeadlines,
  normalizeIsoDate,
  subtractDaysFromIsoDate,
} from '@/lib/contractDeadlineSuggestions';

describe('contractDeadlineSuggestions', () => {
  it('generates reminder deadlines from extracted end, renewal, and notice dates', () => {
    const suggestions = generateSuggestedDeadlines({
      end_date: '2026-12-31',
      renewal_date: '2026-11-30',
      notice_date: '2026-11-15',
    });

    expect(suggestions).toEqual([
      expect.objectContaining({
        date_type: 'end',
        due_date: '2026-12-01',
        offset_value: 30,
      }),
      expect.objectContaining({
        date_type: 'end',
        due_date: '2026-12-16',
        offset_value: 15,
      }),
      expect.objectContaining({
        date_type: 'end',
        due_date: '2026-12-24',
        offset_value: 7,
      }),
      expect.objectContaining({
        date_type: 'renewal',
        due_date: '2026-10-31',
        offset_value: 30,
      }),
      expect.objectContaining({
        date_type: 'renewal',
        due_date: '2026-11-15',
        offset_value: 15,
      }),
      expect.objectContaining({
        date_type: 'notice',
        due_date: '2026-11-08',
        offset_value: 7,
      }),
    ]);
  });

  it('drops invalid dates and can recover source dates from generated notes', () => {
    const suggestions = generateSuggestedDeadlines({
      end_date: '12/31/2026',
      renewal_date: '2026-11-30',
      notice_date: '   ',
    });

    expect(suggestions).toHaveLength(2);
    expect(normalizeIsoDate('2026-02-29')).toBeNull();
    expect(subtractDaysFromIsoDate('2026-03-01', 7)).toBe('2026-02-22');
    expect(extractSuggestedDeadlineSourceDate(suggestions[0].note, suggestions[0].date_type)).toBe('2026-11-30');
  });
});
