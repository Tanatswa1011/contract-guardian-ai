import { describe, expect, it } from 'vitest';
import { parseExtractionSuggestion } from '@/lib/extraction';
import { generateSuggestedDeadlines } from '@/lib/deadlineSuggestions';

describe('parseExtractionSuggestion', () => {
  it('normalizes valid extraction payload', () => {
    const parsed = parseExtractionSuggestion({
      contract_title: ' Master Services Agreement ',
      counterparty: 'Acme Inc.',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      renewal_date: null,
      notice_date: '2026-11-30',
      payment_date: '2026-02-15',
      missing_fields: ['renewal_date'],
      needs_review: true,
      notes: 'Renewal date not explicit.',
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.contract_title).toBe('Master Services Agreement');
    expect(parsed?.start_date).toBe('2026-01-01');
    expect(parsed?.missing_fields).toContain('renewal_date');
    expect(parsed?.needs_review).toBe(true);
  });

  it('drops non-ISO dates and computes missing fields conservatively', () => {
    const parsed = parseExtractionSuggestion({
      contract_title: 'Lease',
      counterparty: 'Counterparty LLC',
      start_date: '01/01/2026',
      end_date: null,
      renewal_date: null,
      notice_date: null,
      payment_date: null,
      missing_fields: [],
      needs_review: false,
      notes: null,
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.start_date).toBeNull();
    expect(parsed?.missing_fields).toContain('start_date');
    expect(parsed?.missing_fields).toContain('end_date');
    expect(parsed?.needs_review).toBe(true);
  });
});

describe('generateSuggestedDeadlines', () => {
  it('generates one deadline per date type, prioritizing renewal_date over end_date', () => {
    const suggestions = generateSuggestedDeadlines({
      end_date: '2026-12-31',
      renewal_date: '2026-11-30',
      notice_date: '2026-10-15',
    });

    expect(suggestions).toEqual([
      {
        due_date: '2026-10-08',
        offset_value: 7,
        offset_unit: 'days',
        date_type: 'notice',
        source_date: '2026-10-15',
      },
      {
        due_date: '2026-10-31',
        offset_value: 30,
        offset_unit: 'days',
        date_type: 'renewal',
        source_date: '2026-11-30',
      },
    ]);
  });

  it('falls back to end_date for renewal suggestion when renewal_date is absent', () => {
    const suggestions = generateSuggestedDeadlines({
      end_date: '2026-12-31',
      renewal_date: null,
      notice_date: null,
    });

    expect(suggestions).toEqual([
      {
        due_date: '2026-12-01',
        offset_value: 30,
        offset_unit: 'days',
        date_type: 'end',
        source_date: '2026-12-31',
      },
    ]);
  });

  it('generates payment deadline from payment_date', () => {
    const suggestions = generateSuggestedDeadlines({
      end_date: null,
      renewal_date: null,
      notice_date: null,
      payment_date: '2026-06-15',
    });

    expect(suggestions).toEqual([
      {
        due_date: '2026-06-08',
        offset_value: 7,
        offset_unit: 'days',
        date_type: 'payment',
        source_date: '2026-06-15',
      },
    ]);
  });

  it('returns empty suggestions for invalid dates', () => {
    expect(generateSuggestedDeadlines({
      end_date: '12/31/2026',
      renewal_date: null,
      notice_date: '2026-02-31',
    })).toEqual([]);
  });
});
