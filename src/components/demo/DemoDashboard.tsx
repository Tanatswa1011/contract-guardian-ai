import { FileText, AlertTriangle, Clock, RefreshCw, DollarSign, Bell, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDemo } from '@/contexts/DemoContext';
import { formatCurrency } from '@/data/demo';
import { format } from 'date-fns';

export default function DemoDashboard() {
  const { contracts, setSelectedContractId } = useDemo();

  const totalActive = contracts.length;
  const expiringIn30 = contracts.filter(c => {
    const days = Math.ceil((new Date(c.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days <= 30 && days > 0;
  }).length;
  const highRisk = contracts.filter(c => c.risk_level === 'high').length;
  const autoRenewals = contracts.filter(c => c.auto_renew && {
    const days = Math.ceil((new Date(c.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days <= 90;
  }).length;
  const valueAtRisk = contracts.filter(c => c.risk_level === 'high').reduce((sum, c) => sum + c.contract_value, 0);
  const remindersThisWeek = 5;

  const summaryCards = [
    { label: 'Active Contracts', value: totalActive, icon: FileText, accent: '' },
    { label: 'Expiring in 30 Days', value: expiringIn30, icon: Clock, accent: expiringIn30 > 0 ? 'text-destructive' : '' },
    { label: 'High Risk', value: highRisk, icon: AlertTriangle, accent: highRisk > 0 ? 'text-destructive' : '' },
    { label: 'Auto-Renewals', value: autoRenewals, icon: RefreshCw, accent: '' },
    { label: 'Value at Risk', value: formatCurrency(valueAtRisk), icon: DollarSign, accent: 'text-destructive' },
    { label: 'Reminders This Week', value: remindersThisWeek, icon: Bell, accent: '' },
  ];

  const urgencyColor = (u: string) => {
    if (u === 'urgent') return 'destructive' as const;
    if (u === 'warning') return 'secondary' as const;
    return 'outline' as const;
  };

  const urgencyLabel = (u: string) => {
    if (u === 'urgent') return 'Urgent';
    if (u === 'warning') return 'Warning';
    return 'Normal';
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your contract portfolio</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {summaryCards.map((card) => (
          <Card key={card.label} className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <card.icon className="h-3.5 w-3.5" />
                <span className="text-[11px] uppercase tracking-wide font-medium">{card.label}</span>
              </div>
              <div className={`text-2xl font-bold tracking-tight ${card.accent}`}>{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">All Contracts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {contracts.map((contract) => {
              const daysLeft = Math.ceil((new Date(contract.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <button
                  key={contract.id}
                  onClick={() => setSelectedContractId(contract.id)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold text-sm truncate">{contract.title}</span>
                      <Badge variant={urgencyColor(contract.urgency)} className="shrink-0">
                        {urgencyLabel(contract.urgency)}
                      </Badge>
                      {contract.auto_renew && (
                        <Badge variant="outline" className="shrink-0">
                          <RefreshCw className="h-2.5 w-2.5 mr-1" />
                          Auto-renew
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{contract.counterparty}</span>
                      <span>·</span>
                      <span>{formatCurrency(contract.contract_value)}/yr</span>
                      <span>·</span>
                      <span className={daysLeft <= 14 ? 'text-destructive font-medium' : daysLeft <= 30 ? 'text-muted-foreground' : ''}>
                        {daysLeft <= 0 ? 'Expired' : `${daysLeft} days left`}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
