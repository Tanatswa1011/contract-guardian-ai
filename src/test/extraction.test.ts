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
  it('builds deadline suggestions from extracted dates', () => {
    const suggestions = generateSuggestedDeadlines({
      end_date: '2026-12-31',
      renewal_date: '2026-11-30',
      notice_date: '2026-10-15',
    });

    expect(suggestions).toEqual([
      {
        type: 'notice',
        due_date: '2026-10-15',
        label: 'Notice Deadline',
        note: 'Derived from extracted notice date.',
      },
      {
        type: 'renewal',
        due_date: '2026-11-30',
        label: 'Renewal Deadline',
        note: 'Derived from extracted renewal date.',
      },
    ]);
  });

  it('computes deadlines when extracted dates are missing', () => {
    expect(
      generateSuggestedDeadlines({
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        renewal_date: null,
        notice_date: null,
        payment_date: null,
        notice_period_days: 45,
        payment_terms_days: 30,
      }),
    ).toEqual([
      {
        type: 'payment',
        due_date: '2026-01-31',
        label: 'Payment Deadline',
        note: 'Computed from detected payment terms.',
      },
      {
        type: 'notice',
        due_date: '2026-10-17',
        label: 'Notice Deadline',
        note: 'Computed from detected notice period.',
      },
      {
        type: 'renewal',
        due_date: '2026-12-01',
        label: 'Renewal Deadline',
        note: 'Computed as 30 days before contract end date.',
      },
    ]);
  });
});
