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
      notice_date: null,
      payment_date: null,
      notice_period_days: 60,
      payment_terms_days: 30,
      computed_deadlines: [
        {
          type: 'renewal',
          due_date: '2026-12-01',
          label: 'Renewal deadline',
          note: 'Suggested 30 days before the contract end date.',
          source: 'end_date',
          source_date: '2026-12-31',
          offset_value: 30,
          offset_unit: 'days',
        },
      ],
      missing_fields: [],
      needs_review: true,
      notes: 'Renewal date not explicit.',
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.contract_title).toBe('Master Services Agreement');
    expect(parsed?.start_date).toBe('2026-01-01');
    expect(parsed?.notice_period_days).toBe(60);
    expect(parsed?.payment_terms_days).toBe(30);
    expect(parsed?.computed_deadlines[0]?.type).toBe('renewal');
    expect(parsed?.missing_fields).not.toContain('renewal_date');
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
      notice_period_days: null,
      payment_terms_days: null,
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
  it('builds renewal, notice, and payment suggestions', () => {
    const suggestions = generateSuggestedDeadlines({
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      notice_period_days: 60,
      payment_terms_days: 30,
    });

    expect(suggestions).toEqual([
      {
        type: 'payment',
        due_date: '2026-01-31',
        label: 'Payment deadline',
        note: 'Suggested from detected Net 30 payment terms and the contract start date.',
        source: 'payment_terms_days',
        source_date: '2026-01-01',
        offset_value: 30,
        offset_unit: 'days',
      },
      {
        type: 'notice',
        due_date: '2026-11-01',
        label: 'Notice deadline',
        note: 'Suggested from the detected 60-day notice period before the contract end date.',
        source: 'notice_period_days',
        source_date: '2026-12-31',
        offset_value: 60,
        offset_unit: 'days',
      },
      {
        type: 'renewal',
        due_date: '2026-12-01',
        label: 'Renewal deadline',
        note: 'Suggested 30 days before the contract end date (2026-12-31).',
        source: 'end_date',
        source_date: '2026-12-31',
        offset_value: 30,
        offset_unit: 'days',
      },
    ]);
  });

  it('prefers computed deadlines returned by extraction', () => {
    expect(generateSuggestedDeadlines({
      computed_deadlines: [
        {
          type: 'notice',
          due_date: '2026-10-15',
          label: 'Notice deadline',
          note: 'Suggested from extracted notice date.',
          source: 'notice_date',
          source_date: '2026-10-15',
          offset_value: null,
          offset_unit: null,
        },
      ],
      end_date: '2026-12-31',
      notice_period_days: 60,
    })).toEqual([
      {
        type: 'notice',
        due_date: '2026-10-15',
        label: 'Notice deadline',
        note: 'Suggested from extracted notice date.',
        source: 'notice_date',
        source_date: '2026-10-15',
        offset_value: null,
        offset_unit: null,
      },
    ]);
  });

  it('returns empty suggestions for invalid dates', () => {
    expect(generateSuggestedDeadlines({
      start_date: '01/01/2026',
      end_date: '12/31/2026',
      notice_date: '2026-02-31',
      payment_terms_days: 30,
    })).toEqual([]);
  });
});
