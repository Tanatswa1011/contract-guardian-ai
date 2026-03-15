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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
    { label: 'Expiring Soon', value: expiringThisMonth, icon: CalendarClock, color: 'text-warning' },
    { label: 'Next Deadline', value: nextDeadlineDays != null ? `${nextDeadlineDays}d` : '—', icon: CalendarClock, color: 'text-primary' },
    { label: 'Active Contracts', value: activeContracts, icon: FileText, color: 'text-success' },
    { label: 'Risk Alerts', value: riskAlerts, icon: AlertTriangle, color: 'text-destructive' },
  ];

  const healthVariant = (status: string | null) => {
    switch (status) {
      case 'overdue': return 'destructive';
      case 'expiring_soon': return 'default';
      case 'needs_review': return 'secondary';
      case 'missing_dates': return 'outline';
      default: return 'default';
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Contract Command Center</h1>
          <p className="text-muted-foreground text-sm">Track, manage, and protect your business contracts.</p>
        </div>
        <Link to="/app/upload">
          <Button className="gap-2"><Plus className="h-4 w-4" /> Upload Contract</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(card => (
          <Card key={card.label} className="shadow-sm">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{card.label}</span>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search contracts..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-semibold mb-1">No contracts found</h3>
            <p className="text-sm text-muted-foreground mb-4">Upload your first contract to get started.</p>
            <Link to="/app/upload">
              <Button className="gap-2"><Plus className="h-4 w-4" /> Upload Contract</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden md:block">
            <Card className="shadow-sm overflow-hidden">
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
                    <TableRow key={contract.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <Link to={`/app/contracts/${contract.id}`} className="font-medium hover:text-primary transition-colors">
                          {contract.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">
                        {contract.next_deadline_date ? new Date(contract.next_deadline_date).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="text-sm capitalize">{contract.next_deadline_type || '—'}</TableCell>
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

          <div className="md:hidden space-y-3">
            {filtered.map(contract => (
              <Link key={contract.id} to={`/app/contracts/${contract.id}`}>
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-medium text-sm leading-tight">{contract.title}</p>
                      <StatusBadge status={contract.status || 'draft'} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{contract.next_deadline_date ? `Next: ${new Date(contract.next_deadline_date).toLocaleDateString()}` : 'No upcoming'}</span>
                      <Badge variant={healthVariant(contract.health_status)} className="text-xs capitalize">
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
