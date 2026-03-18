import { describe, expect, it } from 'vitest';
import { parseExtractionSuggestion, generateSuggestedDeadlines } from '@/lib/extraction';

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

  it('returns null for error object from failed extraction', () => {
    const parsed = parseExtractionSuggestion({ error: 'Extraction failed' });
    expect(parsed).toBeNull();
  });
});

describe('generateSuggestedDeadlines', () => {
  it('generates deadlines from end_date (30, 15, 7 days before)', () => {
    const deadlines = generateSuggestedDeadlines({
      contract_title: 'Test',
      counterparty: null,
      start_date: null,
      end_date: '2026-12-31',
      renewal_date: null,
      notice_date: null,
      payment_date: null,
      missing_fields: [],
      needs_review: false,
      notes: null,
    });
    expect(deadlines.length).toBe(3);
    expect(deadlines.find((d) => d.type === 'end_30d')?.due_date).toBe('2026-12-01');
    expect(deadlines.find((d) => d.type === 'end_15d')?.due_date).toBe('2026-12-16');
    expect(deadlines.find((d) => d.type === 'end_7d')?.due_date).toBe('2026-12-24');
  });

  it('generates deadlines from renewal_date (30, 15 days before)', () => {
    const deadlines = generateSuggestedDeadlines({
      contract_title: 'Test',
      counterparty: null,
      start_date: null,
      end_date: null,
      renewal_date: '2026-06-15',
      notice_date: null,
      payment_date: null,
      missing_fields: [],
      needs_review: false,
      notes: null,
    });
    expect(deadlines.length).toBe(2);
    expect(deadlines.find((d) => d.type === 'renewal_30d')?.due_date).toBe('2026-05-16');
    expect(deadlines.find((d) => d.type === 'renewal_15d')?.due_date).toBe('2026-05-31');
  });

  it('generates deadline from notice_date (7 days before)', () => {
    const deadlines = generateSuggestedDeadlines({
      contract_title: 'Test',
      counterparty: null,
      start_date: null,
      end_date: null,
      renewal_date: null,
      notice_date: '2026-03-25',
      payment_date: null,
      missing_fields: [],
      needs_review: false,
      notes: null,
    });
    expect(deadlines.length).toBe(1);
    expect(deadlines[0].type).toBe('notice_7d');
    expect(deadlines[0].due_date).toBe('2026-03-18');
  });

  it('returns empty array for null suggestion', () => {
    expect(generateSuggestedDeadlines(null)).toEqual([]);
  });
});
