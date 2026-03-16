import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Download, AlertTriangle, FileText, Trash2, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { extractionFieldLabels, parseContractExtraction } from '@/lib/contractExtraction';
import { toast } from 'sonner';

type DeadlineInput = {
  type: string;
  due_date: string;
  label?: string | null;
  note?: string | null;
};

const deadlineSuggestionConfig = [
  { field: 'renewal_date', type: 'renewal', label: 'Renewal date' },
  { field: 'notice_date', type: 'notice', label: 'Notice date' },
  { field: 'payment_date', type: 'payment', label: 'Payment date' },
] as const;

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
    enabled: !!id,
  });

  const { data: dates = [] } = useQuery({
    queryKey: ['contract-dates', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('contract_dates').select('*').eq('contract_id', id!).order('due_date');
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: files = [] } = useQuery({
    queryKey: ['contract-files', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('contract_files').select('*').eq('contract_id', id!).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: extraction } = useQuery({
    queryKey: ['extraction', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('extraction_runs').select('*').eq('contract_id', id!).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return !query.state.data || status === 'processing' ? 4000 : false;
    },
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('notification_log').select('*').eq('contract_id', id!).order('sent_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const [title, setTitle] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loadedContractId, setLoadedContractId] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newDeadline, setNewDeadline] = useState({ type: 'renewal', due_date: '', label: '', note: '' });
  const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'An unexpected error occurred');

  useEffect(() => {
    if (!contract || loadedContractId === contract.id) return;

    setTitle(contract.title);
    setCounterparty(contract.counterparty || '');
    setStartDate(contract.start_date || '');
    setEndDate(contract.end_date || '');
    setLoadedContractId(contract.id);
  }, [contract, loadedContractId]);

  const updateContract = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('contracts').update({
        title,
        counterparty: counterparty || null,
        start_date: startDate || null,
        end_date: endDate || null,
      }).eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Contract updated');
      queryClient.invalidateQueries({ queryKey: ['contract', id] });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });

  const addDeadline = useMutation({
    mutationFn: async (deadline: DeadlineInput) => {
      const { error } = await supabase.from('contract_dates').insert({
        contract_id: id!,
        type: deadline.type,
        due_date: deadline.due_date,
        label: deadline.label || null,
        note: deadline.note || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Deadline added');
      queryClient.invalidateQueries({ queryKey: ['contract-dates', id] });
      setAddDialogOpen(false);
      setNewDeadline({ type: 'renewal', due_date: '', label: '', note: '' });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });

  const deleteDeadline = useMutation({
    mutationFn: async (deadlineId: string) => {
      const { error } = await supabase.from('contract_dates').delete().eq('id', deadlineId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Deadline deleted');
      queryClient.invalidateQueries({ queryKey: ['contract-dates', id] });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });

  const runExtraction = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('extract-contract', {
        body: { contract_id: id },
      });
      if (error) throw error;
      return data as { already_running?: boolean } | null;
    },
    onSuccess: (data) => {
      toast.success(data?.already_running ? 'AI extraction is already running' : 'AI extraction updated');
      queryClient.invalidateQueries({ queryKey: ['extraction', id] });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });

  const handleDownload = async (storagePath: string, fileName: string) => {
    const { data, error } = await supabase.storage.from('contract-documents').download(storagePath);
    if (error) {
      toast.error('Download failed');
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
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
    renewal: 'border-border bg-accent text-foreground',
    notice: 'border-border bg-secondary text-foreground',
    payment: 'border-border bg-muted text-foreground',
    custom: 'border-border bg-background text-muted-foreground',
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const extractionSuggestion = parseContractExtraction(extraction?.raw_json);
  const extractionMissingFields = extraction?.missing_fields || extractionSuggestion?.missing_fields || [];
  const suggestedContractFields = extractionSuggestion ? [
    {
      key: 'contract_title',
      label: extractionFieldLabels.contract_title,
      currentValue: title,
      suggestedValue: extractionSuggestion.contract_title,
      apply: () => setTitle(extractionSuggestion.contract_title || ''),
    },
    {
      key: 'counterparty',
      label: extractionFieldLabels.counterparty,
      currentValue: counterparty,
      suggestedValue: extractionSuggestion.counterparty,
      apply: () => setCounterparty(extractionSuggestion.counterparty || ''),
    },
    {
      key: 'start_date',
      label: extractionFieldLabels.start_date,
      currentValue: startDate,
      suggestedValue: extractionSuggestion.start_date,
      apply: () => setStartDate(extractionSuggestion.start_date || ''),
    },
    {
      key: 'end_date',
      label: extractionFieldLabels.end_date,
      currentValue: endDate,
      suggestedValue: extractionSuggestion.end_date,
      apply: () => setEndDate(extractionSuggestion.end_date || ''),
    },
  ].filter((field) => field.suggestedValue) : [];

  const suggestedDeadlines = extractionSuggestion ? deadlineSuggestionConfig
    .map((item) => ({
      ...item,
      value: extractionSuggestion[item.field],
    }))
    .filter((item) => item.value) : [];

  const isSameFieldValue = (currentValue: string, suggestedValue: string | null) =>
    (currentValue || '').trim() === (suggestedValue || '').trim();

  const hasDeadline = (type: string, dueDate: string | null) =>
    !!dueDate && dates.some((date) => date.type === type && date.due_date === dueDate);

  const canShowExtractionCard = files.length > 0 || !!extraction;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Link to="/app" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="truncate text-xl font-semibold tracking-tight">{contract.title}</h1>
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
                <Button className="w-full" onClick={() => addDeadline.mutate(newDeadline)} disabled={!newDeadline.due_date || addDeadline.isPending}>
                  {addDeadline.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Deadline
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {canShowExtractionCard && (
        <Card className={extraction?.status === 'failed' ? 'border-destructive/30' : undefined}>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI Extraction Review
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Suggestions never overwrite confirmed data automatically. Review each value before saving.
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => runExtraction.mutate()} disabled={runExtraction.isPending}>
              {runExtraction.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {extraction ? 'Run Again' : 'Run Extraction'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {!extraction && (
              <div className="border bg-muted/40 p-4">
                <p className="text-sm font-medium">No extraction has been saved yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  The uploaded PDF is available, and you can run extraction at any time or continue entering dates manually.
                </p>
              </div>
            )}
            {extraction?.status === 'processing' && (
              <div className="flex items-start gap-3 border bg-muted/40 p-4">
                <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-primary" />
                <div>
                  <p className="text-sm font-medium">Extraction in progress</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    The latest PDF is being processed now. This page refreshes automatically while extraction is running.
                  </p>
                </div>
              </div>
            )}
            {extraction?.status === 'failed' && (
              <div className="flex items-start gap-3 border border-destructive/30 bg-destructive/5 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm font-medium">Extraction failed</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {extraction.error || 'AI extraction could not be completed. You can still review the contract manually and add dates yourself.'}
                  </p>
                </div>
              </div>
            )}
            {extractionMissingFields.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Missing fields</p>
                <div className="flex gap-2 flex-wrap">
                  {extractionMissingFields.map((field: string) => (
                    <Badge key={field} variant="outline" className="text-xs">
                      {extractionFieldLabels[field as keyof typeof extractionFieldLabels] || field.replaceAll('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {extraction?.needs_review && (
              <div className="flex items-start gap-3 border bg-muted/40 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-foreground" />
                <div>
                  <p className="text-sm font-medium">Manual review recommended</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Some supported fields are missing or uncertain, so please confirm every suggested value before saving.
                  </p>
                </div>
              </div>
            )}
            {extraction?.status === 'succeeded' && !extractionSuggestion && (
              <div className="border bg-muted/40 p-4">
                <p className="text-sm font-medium">Extraction finished, but suggestions could not be displayed</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You can rerun extraction or continue managing the contract manually.
                </p>
              </div>
            )}
            {extractionSuggestion && (
              <div className="space-y-4">
                {extractionSuggestion.notes && (
                  <div className="border bg-muted/40 p-4">
                    <p className="text-sm font-medium">Review notes</p>
                    <p className="text-sm text-muted-foreground mt-1">{extractionSuggestion.notes}</p>
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Suggested contract fields</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Using a suggestion only updates the form below. Click &ldquo;Save Changes&rdquo; to confirm it.
                    </p>
                  </div>
                  {suggestedContractFields.length === 0 ? (
                    <p className="text-sm text-muted-foreground border bg-muted/40 p-4">
                      No contract title, counterparty, start date, or end date were confidently extracted.
                    </p>
                  ) : (
                    suggestedContractFields.map((field) => (
                      <div key={field.key} className="flex items-start justify-between gap-4 border bg-muted/40 p-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{field.label}</p>
                          <p className="text-sm">Suggested: {field.suggestedValue}</p>
                          <p className="text-xs text-muted-foreground">
                            Current form value: {field.currentValue || 'Not set'}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={field.apply}
                          disabled={isSameFieldValue(field.currentValue, field.suggestedValue)}
                        >
                          {isSameFieldValue(field.currentValue, field.suggestedValue) ? 'Already in form' : 'Use Suggestion'}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Suggested deadlines</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add only the dates you want to track. Existing deadlines are never replaced automatically.
                    </p>
                  </div>
                  {suggestedDeadlines.length === 0 ? (
                    <p className="text-sm text-muted-foreground border bg-muted/40 p-4">
                      No renewal, notice, or payment date was confidently extracted.
                    </p>
                  ) : (
                    suggestedDeadlines.map((deadline) => (
                      <div key={deadline.field} className="flex items-start justify-between gap-4 border bg-muted/40 p-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{deadline.label}</p>
                          <p className="text-sm">{deadline.value}</p>
                          <p className="text-xs text-muted-foreground">
                            {hasDeadline(deadline.type, deadline.value) ? 'This deadline already exists on the contract.' : 'Add this as a tracked deadline only if it looks correct.'}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addDeadline.mutate({
                            type: deadline.type,
                            due_date: deadline.value!,
                            label: deadline.label,
                            note: 'Added from AI extraction review',
                          })}
                          disabled={hasDeadline(deadline.type, deadline.value) || addDeadline.isPending}
                        >
                          {hasDeadline(deadline.type, deadline.value) ? 'Already Added' : 'Add Deadline'}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
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

        <Card>
          <CardHeader><CardTitle className="text-base">Deadlines</CardTitle></CardHeader>
          <CardContent>
            {dates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No deadlines added yet.</p>
            ) : (
              <div className="space-y-3">
                {dates.map(d => (
                  <div key={d.id} className="flex items-start justify-between border bg-muted/40 p-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className={`normal-case text-xs capitalize tracking-normal ${typeColors[d.type] || ''}`}>{d.type}</Badge>
                        <span className="text-sm font-medium">{d.label || d.type}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{new Date(d.due_date).toLocaleDateString()}</p>
                      {d.note && <p className="text-xs text-muted-foreground">{d.note}</p>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteDeadline.mutate(d.id)}>
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
        <Card>
          <CardHeader><CardTitle className="text-base">Files</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {files.map(f => (
                <div key={f.id} className="flex items-center justify-between border bg-muted/40 p-3">
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

      <Card>
        <CardHeader><CardTitle className="text-base">Reminder History</CardTitle></CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No reminders have been sent for this contract yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Sent To</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map(n => (
                  <TableRow key={n.id}>
                    <TableCell>
                      <Badge
                        variant={n.status === 'sent' ? 'secondary' : n.status === 'failed' ? 'destructive' : 'outline'}
                        className="normal-case text-xs capitalize tracking-normal"
                      >
                        {n.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{n.subject || '—'}</TableCell>
                    <TableCell className="text-sm">{n.sent_to}</TableCell>
                    <TableCell className="text-sm capitalize">{n.channel}</TableCell>
                    <TableCell className="text-sm">{new Date(n.sent_at).toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-destructive">{n.status === 'failed' ? (n.error || '—') : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
