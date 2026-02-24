export interface Contract {
  id: string;
  title: string;
  counterparty: string;
  status: 'draft' | 'active' | 'archived' | 'expired';
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractDate {
  id: string;
  contract_id: string;
  type: 'renewal' | 'notice' | 'payment' | 'custom';
  due_date: string;
  label: string;
  note: string;
}

export interface ContractFile {
  id: string;
  contract_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export interface ExtractionRun {
  id: string;
  contract_id: string;
  status: 'processing' | 'completed' | 'failed';
  model: string;
  needs_review: boolean;
  missing_fields: string[];
  error: string | null;
  created_at: string;
}

export interface ReminderRule {
  id: string;
  scope: 'user' | 'contract' | 'contract_date';
  date_type: string;
  offset_value: number;
  offset_unit: 'day' | 'week' | 'month';
  channel: 'email';
  enabled: boolean;
}

export interface NotificationLog {
  id: string;
  contract_id: string;
  status: 'sent' | 'failed';
  fire_on_date: string;
  sent_at: string;
  subject: string;
  error: string | null;
}

export const mockContracts: Contract[] = [
  {
    id: '1',
    title: 'SaaS License Agreement — Acme Corp',
    counterparty: 'Acme Corp',
    status: 'active',
    start_date: '2025-01-15',
    end_date: '2026-01-15',
    created_at: '2025-01-10T10:00:00Z',
    updated_at: '2025-01-10T10:00:00Z',
  },
  {
    id: '2',
    title: 'Office Lease — Downtown Hub',
    counterparty: 'Downtown Hub Properties',
    status: 'active',
    start_date: '2024-06-01',
    end_date: '2027-06-01',
    created_at: '2024-05-20T10:00:00Z',
    updated_at: '2024-05-20T10:00:00Z',
  },
  {
    id: '3',
    title: 'Freelance Design Contract — Jane Doe',
    counterparty: 'Jane Doe Design',
    status: 'draft',
    start_date: '2026-03-01',
    end_date: null,
    created_at: '2026-02-20T10:00:00Z',
    updated_at: '2026-02-20T10:00:00Z',
  },
  {
    id: '4',
    title: 'Cloud Infrastructure — AWS Enterprise',
    counterparty: 'Amazon Web Services',
    status: 'active',
    start_date: '2025-04-01',
    end_date: '2026-04-01',
    created_at: '2025-03-25T10:00:00Z',
    updated_at: '2025-03-25T10:00:00Z',
  },
  {
    id: '5',
    title: 'Marketing Services — GrowthCo',
    counterparty: 'GrowthCo Agency',
    status: 'expired',
    start_date: '2024-01-01',
    end_date: '2025-01-01',
    created_at: '2023-12-15T10:00:00Z',
    updated_at: '2025-01-02T10:00:00Z',
  },
];

export const mockContractDates: ContractDate[] = [
  { id: '1', contract_id: '1', type: 'renewal', due_date: '2026-01-15', label: 'Annual Renewal', note: 'Auto-renews unless 30-day notice given' },
  { id: '2', contract_id: '1', type: 'notice', due_date: '2025-12-15', label: 'Cancellation Notice Deadline', note: '30 days before renewal' },
  { id: '3', contract_id: '1', type: 'payment', due_date: '2026-03-15', label: 'Quarterly Payment', note: '$12,000 due' },
  { id: '4', contract_id: '2', type: 'renewal', due_date: '2027-06-01', label: 'Lease Renewal', note: '90-day notice required' },
  { id: '5', contract_id: '2', type: 'notice', due_date: '2027-03-01', label: 'Renewal Notice Deadline', note: '' },
  { id: '6', contract_id: '4', type: 'payment', due_date: '2026-04-01', label: 'Annual Payment', note: 'Enterprise tier' },
  { id: '7', contract_id: '4', type: 'renewal', due_date: '2026-04-01', label: 'Contract Renewal', note: '' },
];

export const mockContractFiles: ContractFile[] = [
  { id: '1', contract_id: '1', storage_path: '/files/acme-saas.pdf', file_name: 'Acme_SaaS_Agreement_2025.pdf', mime_type: 'application/pdf', size_bytes: 245000, created_at: '2025-01-10T10:00:00Z' },
  { id: '2', contract_id: '2', storage_path: '/files/lease.pdf', file_name: 'Office_Lease_Downtown.pdf', mime_type: 'application/pdf', size_bytes: 1200000, created_at: '2024-05-20T10:00:00Z' },
  { id: '3', contract_id: '4', storage_path: '/files/aws.pdf', file_name: 'AWS_Enterprise_Agreement.pdf', mime_type: 'application/pdf', size_bytes: 890000, created_at: '2025-03-25T10:00:00Z' },
];

export const mockExtractionRuns: ExtractionRun[] = [
  { id: '1', contract_id: '1', status: 'completed', model: 'gpt-4o', needs_review: false, missing_fields: [], error: null, created_at: '2025-01-10T10:05:00Z' },
  { id: '2', contract_id: '2', status: 'completed', model: 'gpt-4o', needs_review: true, missing_fields: ['payment_terms', 'escalation_clause'], error: null, created_at: '2024-05-20T10:05:00Z' },
  { id: '3', contract_id: '3', status: 'failed', model: 'gpt-4o', needs_review: false, missing_fields: [], error: 'Could not parse document', created_at: '2026-02-20T10:05:00Z' },
  { id: '4', contract_id: '4', status: 'completed', model: 'gpt-4o', needs_review: false, missing_fields: [], error: null, created_at: '2025-03-25T10:05:00Z' },
];

export const mockNotificationLogs: NotificationLog[] = [
  { id: '1', contract_id: '1', status: 'sent', fire_on_date: '2025-12-15', sent_at: '2025-12-15T08:00:00Z', subject: 'Reminder: Cancellation Notice Deadline in 30 days', error: null },
  { id: '2', contract_id: '2', status: 'sent', fire_on_date: '2027-02-01', sent_at: '2027-02-01T08:00:00Z', subject: 'Reminder: Lease Renewal Notice in 30 days', error: null },
  { id: '3', contract_id: '4', status: 'failed', fire_on_date: '2026-03-01', sent_at: '2026-03-01T08:00:00Z', subject: 'Reminder: Contract Renewal in 30 days', error: 'Email delivery failed' },
];

export const mockReminderRules: ReminderRule[] = [
  { id: '1', scope: 'user', date_type: 'all', offset_value: 30, offset_unit: 'day', channel: 'email', enabled: true },
  { id: '2', scope: 'user', date_type: 'all', offset_value: 7, offset_unit: 'day', channel: 'email', enabled: true },
  { id: '3', scope: 'user', date_type: 'all', offset_value: 1, offset_unit: 'day', channel: 'email', enabled: true },
  { id: '4', scope: 'user', date_type: 'all', offset_value: 0, offset_unit: 'day', channel: 'email', enabled: true },
];

export function getHealthBadge(contract: Contract, dates: ContractDate[], extraction?: ExtractionRun): { label: string; variant: 'ok' | 'warning' | 'danger' | 'info' } {
  if (extraction?.needs_review) return { label: 'Needs Review', variant: 'warning' };
  if (contract.status === 'expired') return { label: 'Expired', variant: 'danger' };

  const now = new Date();
  const contractDates = dates.filter(d => d.contract_id === contract.id);

  if (contractDates.length === 0 && contract.status === 'draft') return { label: 'Missing Dates', variant: 'info' };

  const hasOverdue = contractDates.some(d => new Date(d.due_date) < now);
  if (hasOverdue) return { label: 'Overdue', variant: 'danger' };

  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const hasExpiringSoon = contractDates.some(d => {
    const due = new Date(d.due_date);
    return due >= now && due <= thirtyDays;
  });
  if (hasExpiringSoon) return { label: 'Expiring Soon', variant: 'warning' };

  return { label: 'Healthy', variant: 'ok' };
}

export function getNextDeadline(contractId: string): ContractDate | null {
  const now = new Date();
  const dates = mockContractDates
    .filter(d => d.contract_id === contractId && new Date(d.due_date) >= now)
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  return dates[0] || null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
