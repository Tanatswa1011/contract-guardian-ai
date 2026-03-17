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
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

type DashboardFilter = 'all' | 'needs_review' | 'expiring_soon' | 'active' | 'overdue';

export default function DashboardPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>('all');

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts-dashboard', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('contracts_dashboard')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
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

  const filters: Array<{ key: DashboardFilter; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'needs_review', label: 'Needs Review' },
    { key: 'expiring_soon', label: 'Expiring Soon' },
    { key: 'active', label: 'Active' },
    { key: 'overdue', label: 'Overdue' },
  ];

  const matchesFilter = (contract: (typeof allContracts)[number], filter: DashboardFilter) => {
    switch (filter) {
      case 'needs_review':
        return Boolean(
          contract.needs_review
          || contract.health_status === 'needs_review'
          || (contract.missing_fields && contract.missing_fields.length > 0),
        );
      case 'expiring_soon':
        return Boolean(contract.expiring_within_30_days || contract.health_status === 'expiring_soon');
      case 'active':
        return contract.status === 'active';
      case 'overdue':
        return Boolean(contract.has_overdue_dates || contract.health_status === 'overdue');
      case 'all':
      default:
        return true;
    }
  };

  const contractNeedsReview = (contract: (typeof allContracts)[number]) => matchesFilter(contract, 'needs_review');

  const filterCounts = {
    all: allContracts.length,
    needs_review: allContracts.filter(c => matchesFilter(c, 'needs_review')).length,
    expiring_soon: allContracts.filter(c => matchesFilter(c, 'expiring_soon')).length,
    active: allContracts.filter(c => matchesFilter(c, 'active')).length,
    overdue: allContracts.filter(c => matchesFilter(c, 'overdue')).length,
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = allContracts.filter((contract) => {
    const matchesSearch = normalizedSearch.length === 0
      || Boolean(contract.title?.toLowerCase().includes(normalizedSearch))
      || Boolean(contract.counterparty?.toLowerCase().includes(normalizedSearch));
    return matchesSearch && matchesFilter(contract, activeFilter);
  });

  const summaryCards = [
    { label: 'Expiring Soon', value: expiringThisMonth, icon: CalendarClock },
    { label: 'Next Deadline', value: nextDeadlineDays != null ? `${nextDeadlineDays}d` : '—', icon: CalendarClock },
    { label: 'Active Contracts', value: activeContracts, icon: FileText },
    { label: 'Risk Alerts', value: riskAlerts, icon: AlertTriangle },
  ];

  const healthVariant = (status: string | null) => {
    switch (status) {
      case 'overdue': return 'destructive';
      case 'expiring_soon': return 'secondary';
      case 'needs_review': return 'secondary';
      case 'missing_dates': return 'outline';
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
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contract Command Center</h1>
          <p className="text-muted-foreground text-sm">Track, manage, and protect your business contracts.</p>
        </div>
        <Link to="/app/upload">
          <Button className="gap-2"><Plus className="h-4 w-4" /> Upload Contract</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(card => (
          <Card key={card.label}>
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{card.label}</span>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or counterparty..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filters.map((filter) => (
          <Button
            key={filter.key}
            size="sm"
            variant={activeFilter === filter.key ? 'default' : 'outline'}
            onClick={() => setActiveFilter(filter.key)}
            className="h-8"
          >
            {filter.label}
            <span className="ml-2 text-xs opacity-70">{filterCounts[filter.key]}</span>
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border bg-muted">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            {allContracts.length === 0 ? (
              <>
                <h3 className="font-semibold mb-1">No contracts yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Upload your first contract to get started.</p>
                <Link to="/app/upload">
                  <Button className="gap-2"><Plus className="h-4 w-4" /> Upload Contract</Button>
                </Link>
              </>
            ) : (
              <>
                <h3 className="font-semibold mb-1">No contracts match your filters</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Try adjusting your search or switching to a different filter.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {search ? (
                    <Button variant="outline" onClick={() => setSearch('')}>
                      Clear Search
                    </Button>
                  ) : null}
                  {activeFilter !== 'all' ? (
                    <Button variant="outline" onClick={() => setActiveFilter('all')}>
                      Show All Contracts
                    </Button>
                  ) : null}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden md:block">
            <Card className="overflow-hidden">
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
                        <div className="space-y-1">
                          <Link to={`/app/contracts/${contract.id}`} className="font-medium transition-colors hover:text-foreground/70">
                            {contract.title}
                          </Link>
                          {contractNeedsReview(contract) ? (
                            <Badge variant="outline" className="w-fit border-destructive/30 bg-destructive/5 text-[10px] uppercase tracking-wide">
                              Needs Review
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {contract.next_deadline_date ? new Date(contract.next_deadline_date).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="text-sm capitalize">{contract.next_deadline_type || '—'}</TableCell>
                      <TableCell><StatusBadge status={contract.status || 'draft'} /></TableCell>
                      <TableCell>
                        <Badge variant={healthVariant(contract.health_status)} className="normal-case text-xs capitalize tracking-normal">
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
                <Card>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="space-y-1">
                        <p className="font-medium text-sm leading-tight">{contract.title}</p>
                        {contractNeedsReview(contract) ? (
                          <Badge variant="outline" className="w-fit border-destructive/30 bg-destructive/5 text-[10px] uppercase tracking-wide">
                            Needs Review
                          </Badge>
                        ) : null}
                      </div>
                      <StatusBadge status={contract.status || 'draft'} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{contract.next_deadline_date ? `Next: ${new Date(contract.next_deadline_date).toLocaleDateString()}` : 'No upcoming'}</span>
                      <Badge variant={healthVariant(contract.health_status)} className="normal-case text-xs capitalize tracking-normal">
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
