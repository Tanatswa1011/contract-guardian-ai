import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { HealthBadge } from '@/components/HealthBadge';
import { StatusBadge } from '@/components/StatusBadge';
import { mockContracts, mockContractDates, mockExtractionRuns, getHealthBadge, getNextDeadline } from '@/lib/mock-data';
import { CalendarClock, AlertTriangle, FileText, Search, Upload, Plus } from 'lucide-react';
import { useState } from 'react';

export default function DashboardPage() {
  const [search, setSearch] = useState('');

  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const expiringThisMonth = mockContracts.filter(c =>
    c.end_date && new Date(c.end_date) >= now && new Date(c.end_date) <= endOfMonth
  ).length;

  const allNextDeadlines = mockContracts
    .map(c => ({ contract: c, deadline: getNextDeadline(c.id) }))
    .filter(x => x.deadline)
    .sort((a, b) => new Date(a.deadline!.due_date).getTime() - new Date(b.deadline!.due_date).getTime());

  const nextDeadlineDays = allNextDeadlines.length > 0
    ? Math.max(0, Math.ceil((new Date(allNextDeadlines[0].deadline!.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const activeContracts = mockContracts.filter(c => c.status === 'active').length;
  const riskAlerts = mockContracts.filter(c => {
    const health = getHealthBadge(c, mockContractDates, mockExtractionRuns.find(e => e.contract_id === c.id));
    return health.variant === 'danger' || health.variant === 'warning';
  }).length;

  const filtered = mockContracts.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.counterparty.toLowerCase().includes(search.toLowerCase())
  );

  const summaryCards = [
    { label: 'Expiring This Month', value: expiringThisMonth, icon: CalendarClock, color: 'text-warning' },
    { label: 'Next Deadline', value: nextDeadlineDays !== null ? `${nextDeadlineDays}d` : '—', icon: CalendarClock, color: 'text-primary' },
    { label: 'Active Contracts', value: activeContracts, icon: FileText, color: 'text-success' },
    { label: 'Risk Alerts', value: riskAlerts, icon: AlertTriangle, color: 'text-destructive' },
  ];

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
              <Button className="gap-2"><Upload className="h-4 w-4" /> Upload Contract</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
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
                  {filtered.map(contract => {
                    const nextDl = getNextDeadline(contract.id);
                    const extraction = mockExtractionRuns.find(e => e.contract_id === contract.id);
                    const health = getHealthBadge(contract, mockContractDates, extraction);
                    return (
                      <TableRow key={contract.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <Link to={`/app/contracts/${contract.id}`} className="font-medium hover:text-primary transition-colors">
                            {contract.title}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm">{nextDl ? new Date(nextDl.due_date).toLocaleDateString() : '—'}</TableCell>
                        <TableCell className="text-sm capitalize">{nextDl?.type || '—'}</TableCell>
                        <TableCell><StatusBadge status={contract.status} /></TableCell>
                        <TableCell><HealthBadge label={health.label} variant={health.variant} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(contract => {
              const nextDl = getNextDeadline(contract.id);
              const extraction = mockExtractionRuns.find(e => e.contract_id === contract.id);
              const health = getHealthBadge(contract, mockContractDates, extraction);
              return (
                <Link key={contract.id} to={`/app/contracts/${contract.id}`}>
                  <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="pt-4 pb-3 px-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-medium text-sm leading-tight">{contract.title}</p>
                        <StatusBadge status={contract.status} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{nextDl ? `Next: ${new Date(nextDl.due_date).toLocaleDateString()}` : 'No upcoming'}</span>
                        <HealthBadge label={health.label} variant={health.variant} />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
