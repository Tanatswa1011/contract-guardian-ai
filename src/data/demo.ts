import { addDays, subDays, subHours, subMinutes, format } from 'date-fns';

const now = new Date();
const today = format(now, 'yyyy-MM-dd');

export interface DemoContract {
  id: string;
  title: string;
  counterparty: string;
  status: 'active' | 'draft';
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  notice_period_days: number | null;
  renewal_term_value: number | null;
  renewal_term_unit: string | null;
  contract_value: number;
  contract_type: string;
  risk_level: 'high' | 'medium' | 'low';
  health_status: 'critical' | 'at_risk' | 'good';
  urgency: 'urgent' | 'warning' | 'normal';
  ai_summary: string;
  risk_analysis: string;
  key_clauses: string[];
  extracted_fields: Record<string, string | number | null>;
  deadlines: DemoDeadline[];
  reminders: DemoReminder[];
}

export interface DemoDeadline {
  id: string;
  type: string;
  label: string;
  due_date: string;
  days_until: number;
}

export interface DemoReminder {
  id: string;
  offset_value: number;
  offset_unit: string;
  channel: string;
  enabled: boolean;
  date_type: string;
}

export interface DemoNotification {
  id: string;
  contract_title: string;
  type: string;
  channel: string;
  status: 'sent' | 'queued' | 'delivered';
  timestamp: Date;
  subject: string;
  sent_to: string;
}

function makeId() {
  return crypto.randomUUID();
}

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function makeDeadlines(endDate: string, noticeDays: number | null): DemoDeadline[] {
  const deadlines: DemoDeadline[] = [
    { id: makeId(), type: 'end_date', label: 'Contract End Date', due_date: endDate, days_until: daysUntil(endDate) },
  ];
  if (noticeDays) {
    const noticeDate = format(subDays(new Date(endDate), noticeDays), 'yyyy-MM-dd');
    deadlines.push({ id: makeId(), type: 'notice_date', label: 'Notice Deadline', due_date: noticeDate, days_until: daysUntil(noticeDate) });
  }
  const renewalDate = format(subDays(new Date(endDate), 14), 'yyyy-MM-dd');
  deadlines.push({ id: makeId(), type: 'renewal_date', label: 'Renewal Decision', due_date: renewalDate, days_until: daysUntil(renewalDate) });
  return deadlines;
}

const defaultReminders: DemoReminder[] = [
  { id: makeId(), offset_value: 30, offset_unit: 'day', channel: 'email', enabled: true, date_type: 'all' },
  { id: makeId(), offset_value: 7, offset_unit: 'day', channel: 'email', enabled: true, date_type: 'all' },
  { id: makeId(), offset_value: 1, offset_unit: 'day', channel: 'email', enabled: true, date_type: 'all' },
  { id: makeId(), offset_value: 0, offset_unit: 'day', channel: 'email', enabled: true, date_type: 'all' },
  { id: makeId(), offset_value: 14, offset_unit: 'day', channel: 'slack', enabled: true, date_type: 'all' },
];

export function createDemoContracts(): DemoContract[] {
  return [
    {
      id: 'demo-001',
      title: 'AWS Cloud Infrastructure Agreement',
      counterparty: 'Amazon Web Services, Inc.',
      status: 'active',
      start_date: format(subDays(now, 350), 'yyyy-MM-dd'),
      end_date: format(addDays(now, 15), 'yyyy-MM-dd'),
      auto_renew: true,
      notice_period_days: 30,
      renewal_term_value: 12,
      renewal_term_unit: 'month',
      contract_value: 156000,
      contract_type: 'SaaS Subscription',
      risk_level: 'high',
      health_status: 'critical',
      urgency: 'urgent',
      ai_summary: 'Annual cloud infrastructure agreement with AWS covering EC2, S3, RDS, and Lambda services. Auto-renews with 30-day notice period. Current spend trending 23% above baseline. Notice deadline has passed — cancellation window is closed for this term.',
      risk_analysis: 'HIGH RISK: Notice period has expired. Contract will auto-renew for another 12 months at current rates unless renegotiated. Estimated annual exposure: €156,000. Recommend immediate vendor engagement to negotiate terms before renewal locks in.',
      key_clauses: [
        'Auto-renewal with 30-day written notice to cancel',
        'Price escalation clause: up to 7% annual increase',
        'Minimum commitment: €12,000/month',
        'Data residency: EU (Frankfurt) region only',
        'SLA: 99.95% uptime guarantee',
      ],
      extracted_fields: {
        contract_title: 'AWS Cloud Infrastructure Agreement',
        counterparty: 'Amazon Web Services, Inc.',
        start_date: format(subDays(now, 350), 'yyyy-MM-dd'),
        end_date: format(addDays(now, 15), 'yyyy-MM-dd'),
        notice_period_days: 30,
      },
      deadlines: makeDeadlines(format(addDays(now, 15), 'yyyy-MM-dd'), 30),
      reminders: [...defaultReminders],
    },
    {
      id: 'demo-002',
      title: 'Slack Business+ Annual Plan',
      counterparty: 'Slack Technologies, LLC',
      status: 'active',
      start_date: format(subDays(now, 320), 'yyyy-MM-dd'),
      end_date: format(addDays(now, 45), 'yyyy-MM-dd'),
      auto_renew: true,
      notice_period_days: 30,
      renewal_term_value: 12,
      renewal_term_unit: 'month',
      contract_value: 28800,
      contract_type: 'SaaS Subscription',
      risk_level: 'medium',
      health_status: 'at_risk',
      urgency: 'warning',
      ai_summary: 'Annual Slack Business+ subscription for 40 users. Includes advanced compliance, data retention, and SSO features. Currently utilizing 32 of 40 licensed seats.',
      risk_analysis: 'MEDIUM RISK: Contract expires in 45 days with auto-renewal. Current seat utilization at 80%. Consider rightsizing before renewal to reduce costs. Potential savings of €5,760 by reducing to 32 seats.',
      key_clauses: [
        'Per-seat licensing: €60/user/month',
        'Auto-renewal unless cancelled 30 days prior',
        'Data export available for 90 days post-cancellation',
        'SSO and SCIM provisioning included',
      ],
      extracted_fields: {
        contract_title: 'Slack Business+ Annual Plan',
        counterparty: 'Slack Technologies, LLC',
        start_date: format(subDays(now, 320), 'yyyy-MM-dd'),
        end_date: format(addDays(now, 45), 'yyyy-MM-dd'),
        notice_period_days: 30,
      },
      deadlines: makeDeadlines(format(addDays(now, 45), 'yyyy-MM-dd'), 30),
      reminders: [...defaultReminders],
    },
    {
      id: 'demo-003',
      title: 'Office Lease Agreement — Berlin HQ',
      counterparty: 'Immobilien Partners GmbH',
      status: 'active',
      start_date: format(subDays(now, 700), 'yyyy-MM-dd'),
      end_date: format(addDays(now, 90), 'yyyy-MM-dd'),
      auto_renew: true,
      notice_period_days: 90,
      renewal_term_value: 24,
      renewal_term_unit: 'month',
      contract_value: 180000,
      contract_type: 'Real Estate Lease',
      risk_level: 'high',
      health_status: 'critical',
      urgency: 'urgent',
      ai_summary: 'Commercial office lease for 450 sqm at Friedrichstraße, Berlin. Includes 12 parking spaces and shared conference facilities. Notice period coincides with end date — action required immediately.',
      risk_analysis: 'HIGH RISK: 90-day notice period means the cancellation window is NOW. If no notice is given, the lease auto-renews for 24 months. Total financial exposure on renewal: €360,000. Landlord has indicated a 12% rent increase for the renewal term.',
      key_clauses: [
        '90-day written notice required for termination',
        'Auto-renewal for 24-month periods',
        'Annual rent escalation tied to CPI (consumer price index)',
        'Tenant responsible for interior maintenance',
        'Subletting permitted with landlord approval',
      ],
      extracted_fields: {
        contract_title: 'Office Lease Agreement — Berlin HQ',
        counterparty: 'Immobilien Partners GmbH',
        start_date: format(subDays(now, 700), 'yyyy-MM-dd'),
        end_date: format(addDays(now, 90), 'yyyy-MM-dd'),
        notice_period_days: 90,
      },
      deadlines: makeDeadlines(format(addDays(now, 90), 'yyyy-MM-dd'), 90),
      reminders: [...defaultReminders],
    },
    {
      id: 'demo-004',
      title: 'IT Support & Managed Services',
      counterparty: 'TechServe Solutions AG',
      status: 'active',
      start_date: format(subDays(now, 360), 'yyyy-MM-dd'),
      end_date: format(addDays(now, 8), 'yyyy-MM-dd'),
      auto_renew: false,
      notice_period_days: 14,
      renewal_term_value: null,
      renewal_term_unit: null,
      contract_value: 72000,
      contract_type: 'Service Agreement',
      risk_level: 'high',
      health_status: 'critical',
      urgency: 'urgent',
      ai_summary: 'Managed IT services including 24/7 helpdesk, network monitoring, and on-site support. Contract does NOT auto-renew. Service will terminate without a new agreement in place.',
      risk_analysis: 'HIGH RISK: Contract expires in 8 days with NO auto-renewal. If a replacement provider is not secured, IT support will lapse entirely. Recommend immediate renewal negotiation or vendor transition planning.',
      key_clauses: [
        'No auto-renewal — expires on end date',
        'Response time SLA: 4 hours (critical), 8 hours (standard)',
        'Includes 200 hours/month of managed services',
        'Early termination fee: 3 months remaining value',
        'IP and data ownership retained by client',
      ],
      extracted_fields: {
        contract_title: 'IT Support & Managed Services',
        counterparty: 'TechServe Solutions AG',
        start_date: format(subDays(now, 360), 'yyyy-MM-dd'),
        end_date: format(addDays(now, 8), 'yyyy-MM-dd'),
        notice_period_days: 14,
      },
      deadlines: makeDeadlines(format(addDays(now, 8), 'yyyy-MM-dd'), 14),
      reminders: [...defaultReminders],
    },
    {
      id: 'demo-005',
      title: 'Supplier Framework Agreement',
      counterparty: 'EuroSupply B.V.',
      status: 'active',
      start_date: format(subDays(now, 200), 'yyyy-MM-dd'),
      end_date: format(addDays(now, 22), 'yyyy-MM-dd'),
      auto_renew: true,
      notice_period_days: 60,
      renewal_term_value: 12,
      renewal_term_unit: 'month',
      contract_value: 340000,
      contract_type: 'Framework Agreement',
      risk_level: 'high',
      health_status: 'at_risk',
      urgency: 'warning',
      ai_summary: 'Framework supply agreement covering raw materials and components. Volume-based pricing tiers with quarterly review. Notice period has already passed.',
      risk_analysis: 'HIGH RISK: The 60-day notice period has elapsed. Contract will auto-renew at current pricing. Given recent market price increases of 18%, this renewal locks in above-market rates. Total exposure: €340,000.',
      key_clauses: [
        'Volume discount tiers: 5%, 10%, 15% based on quarterly spend',
        '60-day notice period for termination',
        'Force majeure clause with 30-day cure period',
        'Quality standards: ISO 9001 compliance required',
        'Payment terms: Net 45',
      ],
      extracted_fields: {
        contract_title: 'Supplier Framework Agreement',
        counterparty: 'EuroSupply B.V.',
        start_date: format(subDays(now, 200), 'yyyy-MM-dd'),
        end_date: format(addDays(now, 22), 'yyyy-MM-dd'),
        notice_period_days: 60,
      },
      deadlines: makeDeadlines(format(addDays(now, 22), 'yyyy-MM-dd'), 60),
      reminders: [...defaultReminders],
    },
    {
      id: 'demo-006',
      title: 'Digital Marketing Services Agreement',
      counterparty: 'BrightPixel Agency GmbH',
      status: 'active',
      start_date: format(subDays(now, 60), 'yyyy-MM-dd'),
      end_date: format(addDays(now, 180), 'yyyy-MM-dd'),
      auto_renew: false,
      notice_period_days: 30,
      renewal_term_value: null,
      renewal_term_unit: null,
      contract_value: 96000,
      contract_type: 'Professional Services',
      risk_level: 'low',
      health_status: 'good',
      urgency: 'normal',
      ai_summary: 'Full-service digital marketing agreement including SEO, SEM, social media management, and monthly performance reporting. Fixed monthly retainer with quarterly reviews.',
      risk_analysis: 'LOW RISK: Contract has 180 days remaining. Performance KPIs are being met. No immediate action required. Next review point in 90 days.',
      key_clauses: [
        'Monthly retainer: €8,000',
        'Quarterly performance review with KPI benchmarks',
        '30-day termination notice',
        'Creative assets ownership transfers to client',
        'Non-compete: agency cannot serve direct competitors',
      ],
      extracted_fields: {
        contract_title: 'Digital Marketing Services Agreement',
        counterparty: 'BrightPixel Agency GmbH',
        start_date: format(subDays(now, 60), 'yyyy-MM-dd'),
        end_date: format(addDays(now, 180), 'yyyy-MM-dd'),
        notice_period_days: 30,
      },
      deadlines: makeDeadlines(format(addDays(now, 180), 'yyyy-MM-dd'), 30),
      reminders: [...defaultReminders],
    },
    {
      id: 'demo-007',
      title: 'Equipment Maintenance Contract',
      counterparty: 'ProMaint Services S.A.',
      status: 'active',
      start_date: format(subDays(now, 150), 'yyyy-MM-dd'),
      end_date: format(addDays(now, 120), 'yyyy-MM-dd'),
      auto_renew: true,
      notice_period_days: 45,
      renewal_term_value: 12,
      renewal_term_unit: 'month',
      contract_value: 45000,
      contract_type: 'Maintenance Agreement',
      risk_level: 'low',
      health_status: 'good',
      urgency: 'normal',
      ai_summary: 'Comprehensive maintenance agreement covering all office and production equipment. Includes quarterly inspections, emergency repairs, and spare parts inventory.',
      risk_analysis: 'LOW RISK: 120 days until expiry. Auto-renewal terms are favorable. Service quality has been consistent. No action required until 45-day notice window.',
      key_clauses: [
        'Quarterly preventive maintenance inspections',
        'Emergency response within 24 hours',
        'Spare parts included up to €5,000/year',
        '45-day notice for cancellation',
        'Annual price adjustment capped at 3%',
      ],
      extracted_fields: {
        contract_title: 'Equipment Maintenance Contract',
        counterparty: 'ProMaint Services S.A.',
        start_date: format(subDays(now, 150), 'yyyy-MM-dd'),
        end_date: format(addDays(now, 120), 'yyyy-MM-dd'),
        notice_period_days: 45,
      },
      deadlines: makeDeadlines(format(addDays(now, 120), 'yyyy-MM-dd'), 45),
      reminders: [...defaultReminders],
    },
    {
      id: 'demo-008',
      title: 'Business Insurance Policy',
      counterparty: 'Allianz Commercial SE',
      status: 'active',
      start_date: format(subDays(now, 300), 'yyyy-MM-dd'),
      end_date: format(addDays(now, 60), 'yyyy-MM-dd'),
      auto_renew: true,
      notice_period_days: 30,
      renewal_term_value: 12,
      renewal_term_unit: 'month',
      contract_value: 38000,
      contract_type: 'Insurance Policy',
      risk_level: 'medium',
      health_status: 'at_risk',
      urgency: 'warning',
      ai_summary: 'Comprehensive business insurance covering general liability, professional indemnity, cyber risk, and business interruption. Annual policy with auto-renewal.',
      risk_analysis: 'MEDIUM RISK: Policy renews in 60 days. Premium increase of 15% indicated by insurer. Recommend market comparison before renewal deadline. Coverage gaps identified in cyber risk section.',
      key_clauses: [
        'General liability: €5M coverage',
        'Professional indemnity: €2M coverage',
        'Cyber risk: €1M coverage (review recommended)',
        'Business interruption: 12-month indemnity period',
        '30-day cancellation notice required',
      ],
      extracted_fields: {
        contract_title: 'Business Insurance Policy',
        counterparty: 'Allianz Commercial SE',
        start_date: format(subDays(now, 300), 'yyyy-MM-dd'),
        end_date: format(addDays(now, 60), 'yyyy-MM-dd'),
        notice_period_days: 30,
      },
      deadlines: makeDeadlines(format(addDays(now, 60), 'yyyy-MM-dd'), 30),
      reminders: [...defaultReminders],
    },
  ];
}

export function createDemoNotifications(contracts: DemoContract[]): DemoNotification[] {
  const notifications: DemoNotification[] = [
    { id: makeId(), contract_title: 'AWS Cloud Infrastructure Agreement', type: '7-day reminder', channel: 'email', status: 'delivered', timestamp: subHours(now, 2), subject: 'Urgent: AWS agreement expires in 7 days', sent_to: 'demo@contractguard.ai' },
    { id: makeId(), contract_title: 'AWS Cloud Infrastructure Agreement', type: '7-day reminder', channel: 'slack', status: 'delivered', timestamp: subHours(now, 2), subject: 'Slack notification: AWS expiry in 7 days', sent_to: '#contracts' },
    { id: makeId(), contract_title: 'IT Support & Managed Services', type: '7-day reminder', channel: 'email', status: 'sent', timestamp: subHours(now, 5), subject: 'Action Required: IT Support contract expires in 8 days', sent_to: 'demo@contractguard.ai' },
    { id: makeId(), contract_title: 'Office Lease Agreement — Berlin HQ', type: '30-day reminder', channel: 'email', status: 'delivered', timestamp: subDays(now, 1), subject: 'Reminder: Office lease notice period — 30 days remaining', sent_to: 'demo@contractguard.ai' },
    { id: makeId(), contract_title: 'Supplier Framework Agreement', type: '30-day reminder', channel: 'email', status: 'delivered', timestamp: subDays(now, 2), subject: 'Reminder: Supplier agreement expires in 22 days', sent_to: 'demo@contractguard.ai' },
    { id: makeId(), contract_title: 'Slack Business+ Annual Plan', type: '30-day reminder', channel: 'email', status: 'delivered', timestamp: subDays(now, 3), subject: 'Heads up: Slack subscription renews in 45 days', sent_to: 'demo@contractguard.ai' },
    { id: makeId(), contract_title: 'Business Insurance Policy', type: '30-day reminder', channel: 'email', status: 'delivered', timestamp: subDays(now, 4), subject: 'Reminder: Insurance policy renewal approaching', sent_to: 'demo@contractguard.ai' },
    { id: makeId(), contract_title: 'Supplier Framework Agreement', type: '1-day reminder', channel: 'email', status: 'queued', timestamp: addDays(now, 1), subject: 'Tomorrow: Supplier agreement deadline', sent_to: 'demo@contractguard.ai' },
    { id: makeId(), contract_title: 'IT Support & Managed Services', type: '1-day reminder', channel: 'email', status: 'queued', timestamp: addDays(now, 7), subject: 'Tomorrow: IT Support contract expires', sent_to: 'demo@contractguard.ai' },
    { id: makeId(), contract_title: 'AWS Cloud Infrastructure Agreement', type: '30-day reminder', channel: 'email', status: 'delivered', timestamp: subDays(now, 15), subject: 'Reminder: AWS agreement expires in 30 days', sent_to: 'demo@contractguard.ai' },
    { id: makeId(), contract_title: 'Digital Marketing Services Agreement', type: '30-day reminder', channel: 'email', status: 'delivered', timestamp: subDays(now, 10), subject: 'FYI: Marketing services contract — 180 days remaining', sent_to: 'demo@contractguard.ai' },
  ];
  return notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}
