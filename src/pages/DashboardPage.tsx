import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { CalendarClock, AlertTriangle, FileText, Search, Plus, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Badge } from '@/components/ui/badge';
import { SwipeableContractCard } from '@/components/SwipeableContractCard';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

type DashboardFilter = 'all' | 'needs_review' | 'expiring_soon' | 'active' | 'overdue';
type DashboardContractRow = {
  id: string;
  title: string | null;
  counterparty: string | null;
  created_at: string | null;
  updated_at: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  user_id: string | null;
  workspace_id: string | null;
  days_until_next_deadline: number | null;
  expiring_within_30_days: boolean | null;
  extracted_at: string | null;
  extraction_model: string | null;
  extraction_status: string | null;
  has_overdue_dates: boolean | null;
  health_status: string | null;
  missing_fields: string[] | null;
  needs_review: boolean | null;
  next_deadline_date: string | null;
  next_deadline_source: string | null;
  next_deadline_type: string | null;
  risk_alert: boolean | null;
};

type ContractDeadlineSummary = {
  type: string;
  due_date: string;
  daysUntil: number | null;
};

type UpcomingContractDeadline = {
  type: string;
  due_date: string;
  daysUntil: number;
};

const getDaysUntilDate = (value: string) => {
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return Math.round((target.getTime() - today.getTime()) / 86400000);
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { currentWorkspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts-dashboard', user?.id, currentWorkspaceId],
    enabled: !!user && !!currentWorkspaceId,
    queryFn: async () => {

      const { data: contractRows, error: contractError } = await supabase
        .from('contracts')
        .select('id, title, counterparty, created_at, updated_at, start_date, end_date, status, user_id, workspace_id')
        .eq('workspace_id', currentWorkspaceId)
        .order('created_at', { ascending: false });
      if (contractError) throw contractError;

      if (!contractRows?.length) {
        return [] as DashboardContractRow[];
      }

      const contractIds = contractRows.map((contract) => contract.id);

      const [{ data: dateRows, error: dateError }, { data: extractionRows, error: extractionError }] = await Promise.all([
        supabase
          .from('contract_dates')
          .select('contract_id, due_date, type')
          .in('contract_id', contractIds),
        supabase
          .from('extraction_runs')
          .select('contract_id, created_at, model, status, missing_fields, needs_review')
          .in('contract_id', contractIds)
          .order('created_at', { ascending: false }),
      ]);

      if (dateError) throw dateError;
      if (extractionError) throw extractionError;

      const datesByContract = new Map<string, Array<{ due_date: string; type: string }>>();
      for (const date of dateRows ?? []) {
        const existingDates = datesByContract.get(date.contract_id) ?? [];
        existingDates.push({ due_date: date.due_date, type: date.type });
        datesByContract.set(date.contract_id, existingDates);
      }

      const latestExtractionByContract = new Map<string, NonNullable<typeof extractionRows>[number]>();
      for (const extraction of extractionRows ?? []) {
        if (!latestExtractionByContract.has(extraction.contract_id)) {
          latestExtractionByContract.set(extraction.contract_id, extraction);
        }
      }

      return contractRows.map<DashboardContractRow>((contract) => {
        const contractDates = datesByContract.get(contract.id) ?? [];
        const latestExtraction = latestExtractionByContract.get(contract.id);
        const upcomingDates = contractDates
          .map<ContractDeadlineSummary>((date) => ({
            type: date.type,
            due_date: date.due_date,
            daysUntil: getDaysUntilDate(date.due_date),
          }))
          .filter((date): date is UpcomingContractDeadline => date.daysUntil !== null)
          .sort((left, right) => left.daysUntil - right.daysUntil);

        const nextDeadline = upcomingDates.find((date) => date.daysUntil >= 0) ?? null;
        const hasOverdueDates = upcomingDates.some((date) => date.daysUntil < 0);
        const needsReview = contractDates.length === 0 && !nextDeadline;

        let healthStatus = 'ok';
        if (hasOverdueDates) {
          healthStatus = 'overdue';
        } else if (needsReview) {
          healthStatus = 'needs_review';
        } else if (nextDeadline && nextDeadline.daysUntil <= 30) {
          healthStatus = 'expiring_soon';
        }

        return {
          id: contract.id,
          title: contract.title,
          counterparty: contract.counterparty,
          created_at: contract.created_at,
          updated_at: contract.updated_at,
          start_date: contract.start_date,
          end_date: contract.end_date,
          status: contract.status,
          user_id: contract.user_id,
          workspace_id: contract.workspace_id,
          days_until_next_deadline: nextDeadline?.daysUntil ?? null,
          expiring_within_30_days: nextDeadline ? nextDeadline.daysUntil <= 30 : false,
          extracted_at: latestExtraction?.created_at ?? null,
          extraction_model: latestExtraction?.model ?? null,
          extraction_status: latestExtraction?.status ?? null,
          has_overdue_dates: hasOverdueDates,
          health_status: healthStatus,
          missing_fields: latestExtraction?.missing_fields ?? null,
          needs_review: needsReview,
          next_deadline_date: nextDeadline?.due_date ?? null,
          next_deadline_source: nextDeadline ? 'contract_dates' : null,
          next_deadline_type: nextDeadline?.type ?? null,
          risk_alert: hasOverdueDates || needsReview,
        };
      });
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
        return contract.health_status === 'needs_review';
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
      default: return 'outline';
    }
  };

  const healthLabel = (status: string | null) => {
    switch (status) {
      case 'overdue': return 'Overdue';
      case 'expiring_soon': return 'Expiring Soon';
      case 'needs_review': return 'Needs Review';
      case 'ok': return 'Healthy';
      default: return status || 'Unknown';
    }
  };

  const handleDeleteContract = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      if (!currentWorkspaceId) throw new Error('No workspace selected.');
      const { error } = await supabase.from('contracts').delete().eq('id', deleteId).eq('workspace_id', currentWorkspaceId);
      if (error) throw error;
      toast.success('Contract deleted');
      queryClient.invalidateQueries({ queryKey: ['contracts-dashboard'] });
    } catch {
      toast.error('Failed to delete contract');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-8">
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contract?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the contract and all associated data. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteContract} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(contract => (
                    <TableRow key={contract.id} className="cursor-pointer group">
                      <TableCell>
                        <Link to={`/app/contracts/${contract.id}`} className="font-medium transition-colors hover:text-foreground/70">
                          {contract.title}
                        </Link>
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
                      <TableCell>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteId(contract.id); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Delete contract"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          <div className="md:hidden space-y-3">
            {filtered.map(contract => (
              <SwipeableContractCard
                key={contract.id}
                contract={contract}
                healthVariant={healthVariant}
                healthLabel={healthLabel}
                onDelete={(id) => setDeleteId(id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
