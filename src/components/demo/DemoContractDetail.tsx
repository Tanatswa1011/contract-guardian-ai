import { ArrowLeft, Calendar, AlertTriangle, Bell, FileText, Brain, RefreshCw, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useDemo } from '@/contexts/DemoContext';
import { formatCurrency } from '@/data/demo';
import { format } from 'date-fns';

export default function DemoContractDetail() {
  const { contracts, selectedContractId, setSelectedContractId, setActiveView } = useDemo();
  const contract = contracts.find(c => c.id === selectedContractId);

  if (!contract) return null;

  const daysLeft = Math.ceil((new Date(contract.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const riskColor = (r: string) => r === 'high' ? 'destructive' as const : r === 'medium' ? 'secondary' as const : 'outline' as const;

  return (
    <div className="space-y-6">
      <button
        onClick={() => { setSelectedContractId(null); setActiveView('dashboard'); }}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{contract.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{contract.counterparty}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={riskColor(contract.risk_level)}>{contract.risk_level} risk</Badge>
          {contract.auto_renew && (
            <Badge variant="outline"><RefreshCw className="h-2.5 w-2.5 mr-1" />Auto-renew</Badge>
          )}
        </div>
      </div>

      {/* Key Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Contract Value', value: `${formatCurrency(contract.contract_value)}/yr` },
          { label: 'Days Remaining', value: daysLeft <= 0 ? 'Expired' : `${daysLeft} days`, danger: daysLeft <= 14 },
          { label: 'Notice Period', value: contract.notice_period_days ? `${contract.notice_period_days} days` : 'N/A' },
          { label: 'Contract Type', value: contract.contract_type },
        ].map(item => (
          <Card key={item.label} className="border-border">
            <CardContent className="p-4">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-1">{item.label}</div>
              <div className={`text-lg font-bold ${item.danger ? 'text-destructive' : ''}`}>{item.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Summary */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Brain className="h-4 w-4" /> AI Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-2">Summary</div>
            <p className="text-sm leading-relaxed">{contract.ai_summary}</p>
          </div>
          <Separator />
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-2 flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3" /> Risk Analysis
            </div>
            <p className="text-sm leading-relaxed">{contract.risk_analysis}</p>
          </div>
          <Separator />
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-2">Key Clauses</div>
            <ul className="space-y-1.5">
              {contract.key_clauses.map((clause, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-foreground mt-0.5">•</span>
                  {clause}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Deadlines */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" /> Key Deadlines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {contract.deadlines.map(d => (
              <div key={d.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <div className="text-sm font-medium">{d.label}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(d.due_date), 'dd MMM yyyy')}</div>
                </div>
                <Badge variant={d.days_until <= 7 ? 'destructive' : d.days_until <= 30 ? 'secondary' : 'outline'}>
                  {d.days_until <= 0 ? 'Overdue' : `${d.days_until}d`}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reminder Rules */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> Reminder Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">Set and forget — reminders fire automatically before each deadline.</p>
          <div className="space-y-2">
            {contract.reminders.map(r => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${r.enabled ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                  <span className="text-sm">
                    {r.offset_value === 0 ? 'On deadline day' : `${r.offset_value} ${r.offset_unit}${r.offset_value > 1 ? 's' : ''} before`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{r.channel}</Badge>
                  <Badge variant={r.enabled ? 'default' : 'secondary'} className="text-[10px]">
                    {r.enabled ? 'Active' : 'Off'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
