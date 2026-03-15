import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { CalendarClock, AlertTriangle, FileText, Search, Plus, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  const [search, setSearch] = useState('');

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts_dashboard')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allContracts = contracts || [];
  const now = new Date();

  const expiringThisMonth = allContracts.filter(c => c.expiring_within_30_days).length;
  const activeContracts = allContracts.filter(c => c.status === 'active').length;
  const riskAlerts = allContracts.filter(c => c.risk_alert).length;

  const nextDeadlineDays = allContracts
    .filter(c => c.days_until_next_deadline !== null && c.days_until_next_deadline! >= 0)
    .sort((a, b) => (a.days_until_next_deadline ?? 999) - (b.days_until_next_deadline ?? 999))[0]?.days_until_next_deadline;

  const filtered = allContracts.filter(c =>
    (c.title?.toLowerCase().includes(search.toLowerCase()) || '') ||
    (c.counterparty?.toLowerCase().includes(search.toLowerCase()) || '')
  );

  const summaryCards = [
    { label: 'Expiring Soon', value: expiringThisMonth, icon: CalendarClock, accent: 'text-warning' },
    { label: 'Next Deadline', value: nextDeadlineDays != null ? `${nextDeadlineDays}d` : '\u2014', icon: CalendarClock, accent: 'text-foreground' },
    { label: 'Active Contracts', value: activeContracts, icon: FileText, accent: 'text-success' },
    { label: 'Risk Alerts', value: riskAlerts, icon: AlertTriangle, accent: 'text-destructive' },
  ];

  const healthVariant = (status: string | null): "default" | "destructive" | "secondary" | "outline" | "success" | "warning" => {
    switch (status) {
      case 'overdue': return 'destructive';
      case 'expiring_soon': return 'warning';
      case 'needs_review': return 'outline';
      case 'missing_dates': return 'outline';
      case 'ok': return 'success';
      default: return 'outline';
    }
  };

  const healthLabel = (status: string | null) => {
    switch (status) {
      case 'overdue': return 'Overdue';
      case 'expiring_soon': return 'Expiring Soon';
      case 'needs_review': return 'Needs Review';
      case 'missing_dates': return 'Missing Dates';
      case 'ok': return 'Healthy';
      default: return status || 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Contracts</h1>
          <p className="text-muted-foreground text-xs mt-1">Track and manage your active contracts and upcoming deadlines.</p>
        </div>
        <Link to="/app/upload">
          <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Upload Contract</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border">
        {summaryCards.map(card => (
          <div key={card.label} className="bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{card.label}</span>
              <card.icon className={`h-3.5 w-3.5 ${card.accent}`} />
            </div>
            <p className="text-2xl font-semibold tracking-tight">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search contracts..." className="pl-9 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-sm font-semibold mb-1">No contracts found</h3>
            <p className="text-xs text-muted-foreground mb-4">Upload your first contract to get started.</p>
            <Link to="/app/upload">
              <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Upload Contract</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden md:block">
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contract</TableHead>
                    <TableHead>Next Deadline</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Health</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(contract => (
                    <TableRow key={contract.id} className="cursor-pointer">
                      <TableCell>
                        <Link to={`/app/contracts/${contract.id}`} className="text-sm font-medium hover:underline transition-colors">
                          {contract.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {contract.next_deadline_date ? new Date(contract.next_deadline_date).toLocaleDateString() : '\u2014'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground capitalize">{contract.next_deadline_type || '\u2014'}</TableCell>
                      <TableCell><StatusBadge status={contract.status || 'draft'} /></TableCell>
                      <TableCell>
                        <Badge variant={healthVariant(contract.health_status)} className="text-xs capitalize">
                          {healthLabel(contract.health_status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          <div className="md:hidden space-y-px border bg-border">
            {filtered.map(contract => (
              <Link key={contract.id} to={`/app/contracts/${contract.id}`} className="block">
                <div className="bg-card p-4 hover:bg-accent/30 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-medium leading-tight">{contract.title}</p>
                    <StatusBadge status={contract.status || 'draft'} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{contract.next_deadline_date ? `Next: ${new Date(contract.next_deadline_date).toLocaleDateString()}` : 'No upcoming'}</span>
                    <Badge variant={healthVariant(contract.health_status)} className="text-xs capitalize">
                      {healthLabel(contract.health_status)}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
