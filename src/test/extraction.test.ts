import { describe, expect, it } from 'vitest';
import { parseExtractionSuggestion, generateSuggestedDeadlines, type ExtractionSuggestion } from '@/lib/extraction';

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
  const baseSuggestion: ExtractionSuggestion = {
    contract_title: 'Test Contract',
    counterparty: 'Acme',
    start_date: '2026-01-01',
    end_date: null,
    renewal_date: null,
    notice_date: null,
    payment_date: null,
    missing_fields: [],
    needs_review: false,
    notes: null,
  };

  it('returns empty array when no relevant dates exist', () => {
    const result = generateSuggestedDeadlines(baseSuggestion);
    expect(result).toEqual([]);
  });

  it('generates 3 deadlines from end_date (30d, 15d, 7d before)', () => {
    const result = generateSuggestedDeadlines({
      ...baseSuggestion,
      end_date: '2026-06-30',
    });

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      offset_value: 30,
      offset_unit: 'days',
      date_type: 'end',
      due_date: '2026-05-31',
      label: '30 days before contract end date',
    });
    expect(result[1]).toEqual({
      offset_value: 15,
      offset_unit: 'days',
      date_type: 'end',
      due_date: '2026-06-15',
      label: '15 days before contract end date',
    });
    expect(result[2]).toEqual({
      offset_value: 7,
      offset_unit: 'days',
      date_type: 'end',
      due_date: '2026-06-23',
      label: '7 days before contract end date',
    });
  });

  it('generates 2 deadlines from renewal_date (30d, 15d before)', () => {
    const result = generateSuggestedDeadlines({
      ...baseSuggestion,
      renewal_date: '2026-09-01',
    });

    expect(result).toHaveLength(2);
    expect(result[0].date_type).toBe('renewal');
    expect(result[0].offset_value).toBe(30);
    expect(result[0].due_date).toBe('2026-08-02');
    expect(result[1].offset_value).toBe(15);
    expect(result[1].due_date).toBe('2026-08-17');
  });

  it('generates 1 deadline from notice_date (7d before)', () => {
    const result = generateSuggestedDeadlines({
      ...baseSuggestion,
      notice_date: '2026-03-15',
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      offset_value: 7,
      offset_unit: 'days',
      date_type: 'notice',
      due_date: '2026-03-08',
      label: '7 days before notice date',
    });
  });

  it('combines deadlines from all date types', () => {
    const result = generateSuggestedDeadlines({
      ...baseSuggestion,
      end_date: '2026-12-31',
      renewal_date: '2026-12-01',
      notice_date: '2026-11-01',
    });

    expect(result).toHaveLength(6);
    const endDeadlines = result.filter((d) => d.date_type === 'end');
    const renewalDeadlines = result.filter((d) => d.date_type === 'renewal');
    const noticeDeadlines = result.filter((d) => d.date_type === 'notice');
    expect(endDeadlines).toHaveLength(3);
    expect(renewalDeadlines).toHaveLength(2);
    expect(noticeDeadlines).toHaveLength(1);
  });

  it('ignores payment_date (no offset rules for it)', () => {
    const result = generateSuggestedDeadlines({
      ...baseSuggestion,
      payment_date: '2026-05-01',
    });

    expect(result).toEqual([]);
  });
});
