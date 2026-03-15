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
import { cn } from '@/lib/utils';

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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const allContracts = contracts || [];

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
    { label: 'Expiring Soon', value: expiringThisMonth, icon: CalendarClock, description: 'Due inside the next 30 days' },
    { label: 'Next Deadline', value: nextDeadlineDays != null ? `${nextDeadlineDays}d` : '—', icon: CalendarClock, description: 'Closest scheduled milestone' },
    { label: 'Active Contracts', value: activeContracts, icon: FileText, description: 'Currently in force' },
    { label: 'Risk Alerts', value: riskAlerts, icon: AlertTriangle, description: 'Records needing attention' },
  ];

  const healthTone = (status: string | null) => {
    switch (status) {
      case 'overdue':
        return 'border-destructive/20 bg-destructive/10 text-destructive';
      case 'expiring_soon':
        return 'border-foreground bg-foreground text-background';
      case 'needs_review':
        return 'border-border bg-secondary text-foreground';
      case 'missing_dates':
        return 'border-border bg-background text-muted-foreground';
      default:
        return 'border-border bg-secondary text-foreground';
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
    <div className="space-y-8">
      <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Dashboard</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Contract Command Center</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Track obligations, surface upcoming deadlines, and keep every agreement accountable.
          </p>
        </div>
        <Link to="/app/upload">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Upload Contract
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(card => (
          <Card key={card.label}>
            <CardContent className="flex items-start justify-between px-5 py-5">
              <div className="space-y-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{card.label}</p>
                <p className="text-3xl font-semibold tracking-tight">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center border bg-muted">
                <card.icon className="h-4 w-4 text-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search contracts..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {filtered.length} contract{filtered.length === 1 ? '' : 's'} in view
        </p>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border bg-background">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="mb-1 text-lg font-semibold">No contracts found</h3>
            <p className="mb-5 text-sm text-muted-foreground">
              Upload your first contract to begin tracking deadlines and obligations.
            </p>
            <Link to="/app/upload">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Upload Contract
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden md:block">
            <Card className="overflow-hidden">
              <div className="border-b px-5 py-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Contract register</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Review status, next deadlines, and record health across the portfolio.
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contract Name</TableHead>
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
                        <Link to={`/app/contracts/${contract.id}`} className="font-medium text-foreground transition-colors hover:opacity-70">
                          {contract.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">
                        {contract.next_deadline_date ? new Date(contract.next_deadline_date).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="text-sm capitalize">{contract.next_deadline_type || '—'}</TableCell>
                      <TableCell><StatusBadge status={contract.status || 'draft'} /></TableCell>
                      <TableCell>
                        <Badge className={cn('text-xs capitalize', healthTone(contract.health_status))}>
                          {healthLabel(contract.health_status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          <div className="md:hidden space-y-3">
            {filtered.map(contract => (
              <Link key={contract.id} to={`/app/contracts/${contract.id}`}>
                <Card className="transition-colors hover:bg-muted/20">
                  <CardContent className="px-4 py-4">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <p className="font-medium text-sm leading-tight">{contract.title}</p>
                      <StatusBadge status={contract.status || 'draft'} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{contract.next_deadline_date ? `Next: ${new Date(contract.next_deadline_date).toLocaleDateString()}` : 'No upcoming'}</span>
                      <Badge className={cn('text-xs capitalize', healthTone(contract.health_status))}>
                        {healthLabel(contract.health_status)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
