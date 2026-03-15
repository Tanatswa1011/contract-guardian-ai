import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Download, AlertTriangle, FileText, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function ContractDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: contract, isLoading: contractLoading } = useQuery({
    queryKey: ['contract', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('contracts').select('*').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: dates = [] } = useQuery({
    queryKey: ['contract-dates', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('contract_dates').select('*').eq('contract_id', id!).order('due_date');
      if (error) throw error;
      return data;
    },
  });

  const { data: files = [] } = useQuery({
    queryKey: ['contract-files', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('contract_files').select('*').eq('contract_id', id!).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: extraction } = useQuery({
    queryKey: ['extraction', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('extraction_runs').select('*').eq('contract_id', id!).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('notification_log').select('*').eq('contract_id', id!).order('sent_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [title, setTitle] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newDeadline, setNewDeadline] = useState({ type: 'renewal', due_date: '', label: '', note: '' });

  // Sync form state when contract loads
  const isFormInitialized = title || counterparty || startDate || endDate;
  if (contract && !isFormInitialized) {
    setTitle(contract.title);
    setCounterparty(contract.counterparty || '');
    setStartDate(contract.start_date || '');
    setEndDate(contract.end_date || '');
  }

  const updateContract = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('contracts').update({
        title, counterparty: counterparty || null,
        start_date: startDate || null, end_date: endDate || null,
      }).eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Contract updated'); queryClient.invalidateQueries({ queryKey: ['contract', id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const addDeadline = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('contract_dates').insert({
        contract_id: id!, type: newDeadline.type, due_date: newDeadline.due_date,
        label: newDeadline.label || null, note: newDeadline.note || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Deadline added');
      queryClient.invalidateQueries({ queryKey: ['contract-dates', id] });
      setAddDialogOpen(false);
      setNewDeadline({ type: 'renewal', due_date: '', label: '', note: '' });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteDeadline = useMutation({
    mutationFn: async (deadlineId: string) => {
      const { error } = await supabase.from('contract_dates').delete().eq('id', deadlineId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Deadline deleted'); queryClient.invalidateQueries({ queryKey: ['contract-dates', id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleDownload = async (storagePath: string, fileName: string) => {
    const { data, error } = await supabase.storage.from('contract-documents').download(storagePath);
    if (error) { toast.error('Download failed'); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
  };

  if (contractLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!contract) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold mb-2">Contract not found</h2>
        <Link to="/app"><Button variant="outline">Back to Dashboard</Button></Link>
      </div>
    );
  }

  const typeColors: Record<string, string> = {
    renewal: 'bg-primary/10 text-primary',
    notice: 'bg-warning/10 text-warning',
    payment: 'bg-success/10 text-success',
    custom: 'bg-muted text-muted-foreground',
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Link to="/app" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold truncate">{contract.title}</h1>
            <StatusBadge status={contract.status} />
          </div>
          <p className="text-sm text-muted-foreground">{contract.counterparty || 'No counterparty'}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2"><Plus className="h-3 w-3" /> Add Deadline</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Deadline</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newDeadline.type} onValueChange={v => setNewDeadline(d => ({ ...d, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <Input type="date" value={newDeadline.due_date} onChange={e => setNewDeadline(d => ({ ...d, due_date: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input placeholder="e.g., Annual renewal" value={newDeadline.label} onChange={e => setNewDeadline(d => ({ ...d, label: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Note</Label>
                  <Input placeholder="Optional note" value={newDeadline.note} onChange={e => setNewDeadline(d => ({ ...d, note: e.target.value }))} />
                </div>
                <Button className="w-full" onClick={() => addDeadline.mutate()} disabled={!newDeadline.due_date || addDeadline.isPending}>
                  {addDeadline.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Deadline
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {extraction?.needs_review && (
        <Card className="border-warning/50 bg-warning/5 shadow-sm">
          <CardContent className="py-4 px-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
              <div>
                <p className="font-medium text-sm">This contract needs manual review</p>
                <p className="text-xs text-muted-foreground mt-1">Missing fields:</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {extraction.missing_fields.map((f: string) => (
                    <Badge key={f} variant="outline" className="text-xs capitalize">{f.replace('_', ' ')}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Contract Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Counterparty</Label>
              <Input value={counterparty} onChange={e => setCounterparty(e.target.value)} placeholder="e.g., Acme Corp" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
            <Button className="w-full" onClick={() => updateContract.mutate()} disabled={updateContract.isPending}>
              {updateContract.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Deadlines</CardTitle></CardHeader>
          <CardContent>
            {dates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No deadlines added yet.</p>
            ) : (
              <div className="space-y-3">
                {dates.map(d => (
                  <div key={d.id} className="flex items-start justify-between p-3 rounded-lg border bg-card">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs capitalize ${typeColors[d.type] || ''}`}>{d.type}</Badge>
                        <span className="text-sm font-medium">{d.label || d.type}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{new Date(d.due_date).toLocaleDateString()}</p>
                      {d.note && <p className="text-xs text-muted-foreground">{d.note}</p>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteDeadline.mutate(d.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
                  <Button variant="ghost" size="icon" onClick={() => handleDownload(f.storage_path, f.file_name)}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
