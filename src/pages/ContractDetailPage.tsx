import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { HealthBadge } from '@/components/HealthBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockContracts, mockContractDates, mockContractFiles, mockExtractionRuns, mockNotificationLogs, getHealthBadge, formatFileSize } from '@/lib/mock-data';
import { ArrowLeft, Plus, Download, AlertTriangle, FileText, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

export default function ContractDetailPage() {
  const { id } = useParams();
  const contract = mockContracts.find(c => c.id === id);
  const dates = mockContractDates.filter(d => d.contract_id === id);
  const files = mockContractFiles.filter(f => f.contract_id === id);
  const extraction = mockExtractionRuns.find(e => e.contract_id === id);
  const notifications = mockNotificationLogs.filter(n => n.contract_id === id);

  const [title, setTitle] = useState(contract?.title || '');

  if (!contract) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold mb-2">Contract not found</h2>
        <Link to="/app"><Button variant="outline">Back to Dashboard</Button></Link>
      </div>
    );
  }

  const health = getHealthBadge(contract, mockContractDates, extraction);

  const typeColors: Record<string, string> = {
    renewal: 'bg-primary/10 text-primary',
    notice: 'bg-warning/10 text-warning',
    payment: 'bg-success/10 text-success',
    custom: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Link to="/app" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold truncate">{contract.title}</h1>
            <StatusBadge status={contract.status} />
            <HealthBadge label={health.label} variant={health.variant} />
          </div>
          <p className="text-sm text-muted-foreground">{contract.counterparty}</p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2"><Plus className="h-3 w-3" /> Add Deadline</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Deadline</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="renewal">Renewal</SelectItem>
                      <SelectItem value="notice">Notice</SelectItem>
                      <SelectItem value="payment">Payment</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" />
                </div>
                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input placeholder="e.g., Annual renewal" />
                </div>
                <div className="space-y-2">
                  <Label>Note</Label>
                  <Input placeholder="Optional note" />
                </div>
                <Button className="w-full">Save Deadline</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button size="sm" variant="outline" className="gap-2"><FileText className="h-3 w-3" /> Upload Version</Button>
        </div>
      </div>

      {/* Needs Review Banner */}
      {extraction?.needs_review && (
        <Card className="border-warning/50 bg-warning/5 shadow-sm">
          <CardContent className="py-4 px-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
              <div>
                <p className="font-medium text-sm">This contract needs manual review</p>
                <p className="text-xs text-muted-foreground mt-1">Missing fields:</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {extraction.missing_fields.map(f => (
                    <Badge key={f} variant="outline" className="text-xs capitalize">{f.replace('_', ' ')}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Contract Info */}
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Contract Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Counterparty</Label>
              <Input value={contract.counterparty} readOnly className="bg-muted/50" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" defaultValue={contract.start_date} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" defaultValue={contract.end_date || ''} />
              </div>
            </div>
            <Button className="w-full">Save Changes</Button>
          </CardContent>
        </Card>

        {/* Deadlines */}
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Deadlines</CardTitle></CardHeader>
          <CardContent>
            {dates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No deadlines added yet.</p>
            ) : (
              <div className="space-y-3">
                {dates.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).map(d => (
                  <div key={d.id} className="flex items-start justify-between p-3 rounded-lg border bg-card">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs capitalize ${typeColors[d.type]}`}>{d.type}</Badge>
                        <span className="text-sm font-medium">{d.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{new Date(d.due_date).toLocaleDateString()}</p>
                      {d.note && <p className="text-xs text-muted-foreground">{d.note}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Files */}
      {files.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Files</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {files.map(f => (
                <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{f.file_name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(f.size_bytes)} • {new Date(f.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notification History */}
      {notifications.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Notification History</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map(n => (
                  <TableRow key={n.id}>
                    <TableCell>
                      <Badge variant={n.status === 'sent' ? 'default' : 'destructive'} className="text-xs capitalize">
                        {n.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{n.subject}</TableCell>
                    <TableCell className="text-sm">{new Date(n.sent_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-sm text-destructive">{n.error || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
