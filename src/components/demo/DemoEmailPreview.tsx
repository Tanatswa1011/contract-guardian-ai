import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Monitor, Smartphone } from 'lucide-react';
import { useDemo } from '@/contexts/DemoContext';
import { formatCurrency } from '@/data/demo';
import { format } from 'date-fns';

type ReminderType = '30-day' | '7-day' | '1-day' | 'deadline';

const REMINDER_TYPES: { key: ReminderType; label: string }[] = [
  { key: '30-day', label: '30-Day Reminder' },
  { key: '7-day', label: '7-Day Reminder' },
  { key: '1-day', label: '1-Day Reminder' },
  { key: 'deadline', label: 'Deadline Day' },
];

function getSubject(type: ReminderType, title: string): string {
  switch (type) {
    case '30-day': return `Heads up: ${title} — 30 days until deadline`;
    case '7-day': return `Action Required: ${title} — 7 days remaining`;
    case '1-day': return `Urgent: ${title} — expires tomorrow`;
    case 'deadline': return `⚠️ DEADLINE TODAY: ${title}`;
  }
}

function getPreheader(type: ReminderType): string {
  switch (type) {
    case '30-day': return 'A contract deadline is approaching. Review and take action.';
    case '7-day': return 'Only 7 days left. Make sure you\'re prepared.';
    case '1-day': return 'This is your final reminder before the deadline.';
    case 'deadline': return 'The deadline is today. Immediate action required.';
  }
}

function getUrgencyStyle(type: ReminderType) {
  switch (type) {
    case '30-day': return { barColor: '#888888', label: 'Upcoming', bg: '#1a1a1a' };
    case '7-day': return { barColor: '#ffffff', label: 'Action Required', bg: '#1a1a1a' };
    case '1-day': return { barColor: '#ff8800', label: 'Final Notice', bg: '#1a0d00' };
    case 'deadline': return { barColor: '#ff4444', label: 'Deadline Today', bg: '#1a0000' };
  }
}

export default function DemoEmailPreview() {
  const { contracts } = useDemo();
  const [selectedType, setSelectedType] = useState<ReminderType>('7-day');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [selectedContract, setSelectedContract] = useState(contracts[0]);

  const urgency = getUrgencyStyle(selectedType);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Email Template Preview</h1>
        <p className="text-sm text-muted-foreground mt-1">Preview exactly how reminder emails appear to recipients</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4">
        <div className="space-y-1.5">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Reminder Type</div>
          <div className="flex gap-1">
            {REMINDER_TYPES.map(rt => (
              <Button key={rt.key} variant={selectedType === rt.key ? 'default' : 'outline'} size="sm" onClick={() => setSelectedType(rt.key)} className="text-xs">
                {rt.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Preview</div>
          <div className="flex gap-1">
            <Button variant={viewMode === 'desktop' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('desktop')}>
              <Monitor className="h-3.5 w-3.5 mr-1" /> Desktop
            </Button>
            <Button variant={viewMode === 'mobile' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('mobile')}>
              <Smartphone className="h-3.5 w-3.5 mr-1" /> Mobile
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Contract</div>
          <select
            value={selectedContract.id}
            onChange={e => setSelectedContract(contracts.find(c => c.id === e.target.value) || contracts[0])}
            className="h-8 rounded-sm border border-border bg-card text-sm px-2 text-foreground"
          >
            {contracts.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
      </div>

      {/* Email subject */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="space-y-1">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Subject</div>
            <div className="text-sm font-semibold">{getSubject(selectedType, selectedContract.title)}</div>
            <div className="text-xs text-muted-foreground">{getPreheader(selectedType)}</div>
          </div>
        </CardContent>
      </Card>

      {/* Email body */}
      <div className={`mx-auto ${viewMode === 'mobile' ? 'max-w-[375px]' : 'max-w-[640px]'}`}>
        <Card className="border-border overflow-hidden">
          <div style={{ height: 4, backgroundColor: urgency.barColor }} />
          <CardContent className="p-0">
            <div style={{ backgroundColor: '#0B0B0C', color: '#fafafa', fontFamily: "'Inter', -apple-system, sans-serif" }}>
              {/* Header */}
              <div style={{ padding: viewMode === 'mobile' ? '24px 20px' : '32px 40px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.025em' }}>ContractGuard</div>
                <div style={{ fontSize: 11, color: '#888888', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>AI Contract Intelligence</div>
              </div>

              {/* Urgency bar */}
              <div style={{ padding: '12px 40px', backgroundColor: urgency.bg, borderTop: '1px solid #1a1a1a', borderBottom: '1px solid #1a1a1a', textAlign: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: urgency.barColor }}>
                  {urgency.label}
                </span>
              </div>

              {/* Body */}
              <div style={{ padding: viewMode === 'mobile' ? '24px 20px' : '32px 40px' }}>
                <h2 style={{ fontSize: viewMode === 'mobile' ? 18 : 22, fontWeight: 700, lineHeight: 1.2, margin: '0 0 8px 0' }}>
                  {getSubject(selectedType, selectedContract.title)}
                </h2>
                <p style={{ fontSize: 14, color: '#888888', lineHeight: 1.6, margin: '0 0 24px 0' }}>
                  {getPreheader(selectedType)}
                </p>

                {/* Contract details box */}
                <div style={{ backgroundColor: '#111111', border: '1px solid #1a1a1a', padding: viewMode === 'mobile' ? '16px' : '24px', marginBottom: 24 }}>
                  {[
                    { label: 'Contract', value: selectedContract.title },
                    { label: 'Vendor', value: selectedContract.counterparty },
                    { label: 'Annual Value', value: formatCurrency(selectedContract.contract_value) },
                    { label: 'Deadline', value: format(new Date(selectedContract.end_date), 'dd MMMM yyyy') },
                    ...(selectedContract.notice_period_days ? [{ label: 'Notice Period', value: `${selectedContract.notice_period_days} days` }] : []),
                    { label: 'Auto-Renewal', value: selectedContract.auto_renew ? 'Yes — will renew automatically' : 'No — expires on end date' },
                  ].map((row, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 5 ? '1px solid #1a1a1a' : 'none', fontSize: 13 }}>
                      <span style={{ color: '#888888' }}>{row.label}</span>
                      <span style={{ fontWeight: 600, textAlign: 'right' }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <div style={{ textAlign: 'center', margin: '32px 0' }}>
                  <a href="#" style={{
                    display: 'inline-block', padding: '12px 32px', backgroundColor: '#ffffff', color: '#0B0B0C',
                    textDecoration: 'none', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em',
                  }}>
                    View Contract →
                  </a>
                </div>

                <p style={{ fontSize: 12, color: '#555555', textAlign: 'center', lineHeight: 1.6 }}>
                  This reminder was sent by ContractGuard AI based on your configured reminder schedule. You can manage your notification preferences in Settings.
                </p>
              </div>

              {/* Footer */}
              <div style={{ padding: '20px 40px', borderTop: '1px solid #1a1a1a', textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: '#555555', margin: 0 }}>
                  ContractGuard AI · Sent from notifications@contractguard.cloud
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
