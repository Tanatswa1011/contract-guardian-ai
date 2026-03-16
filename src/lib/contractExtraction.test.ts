import { describe, expect, it } from 'vitest';
import { parseContractExtraction } from './contractExtraction';

describe('parseContractExtraction', () => {
  it('returns parsed extraction suggestions for the expected shape', () => {
    const parsed = parseContractExtraction({
      contract_title: 'Master Services Agreement',
      counterparty: 'Acme Corp',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      renewal_date: null,
      notice_date: '2026-10-01',
      payment_date: null,
      missing_fields: ['renewal_date', 'payment_date'],
      needs_review: true,
      notes: 'Renewal date not explicitly stated.',
    });

    expect(parsed).toEqual({
      contract_title: 'Master Services Agreement',
      counterparty: 'Acme Corp',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      renewal_date: null,
      notice_date: '2026-10-01',
      payment_date: null,
      missing_fields: ['renewal_date', 'payment_date'],
      needs_review: true,
      notes: 'Renewal date not explicitly stated.',
    });
  });

  it('rejects unexpected properties so the UI only renders the supported schema', () => {
    const parsed = parseContractExtraction({
      contract_title: 'Master Services Agreement',
      counterparty: null,
      start_date: null,
      end_date: null,
      renewal_date: null,
      notice_date: null,
      payment_date: null,
      missing_fields: ['counterparty', 'start_date', 'end_date', 'renewal_date', 'notice_date', 'payment_date'],
      needs_review: true,
      notes: null,
      unexpected_field: 'not allowed',
    });

    expect(parsed).toBeNull();
  });
});
