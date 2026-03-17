import { useParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Download, AlertTriangle, FileText, Trash2, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  parseExtractionSuggestion,
  type SupportedExtractionField,
} from '@/lib/extraction';

const EXTRACTION_FIELD_LABELS: Record<SupportedExtractionField, string> = {
  contract_title: 'Contract Title',
  counterparty: 'Counterparty',
  start_date: 'Start Date',
  end_date: 'End Date',
  renewal_date: 'Renewal Date',
  notice_date: 'Notice Date',
  payment_date: 'Payment Date',
};

const formatSuggestionValue = (value: string | null) => value ?? '—';

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
    refetchInterval: (query) => query.state.data?.status === 'processing' ? 3000 : false,
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
  const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'An unexpected error occurred');

  // Sync form state from contract when id or contract data changes (avoids flicker, resets on contract change)
  useEffect(() => {
    if (!contract || contract.id !== id) return;
    setTitle(contract.title ?? '');
    setCounterparty(contract.counterparty ?? '');
    setStartDate(contract.start_date ?? '');
    setEndDate(contract.end_date ?? '');
  }, [id, contract]);

  const updateContract = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('contracts').update({
        title, counterparty: counterparty || null,
        start_date: startDate || null, end_date: endDate || null,
      }).eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Contract updated'); queryClient.invalidateQueries({ queryKey: ['contract', id] }); },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
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
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });

  const deleteDeadline = useMutation({
    mutationFn: async (deadlineId: string) => {
      const { error } = await supabase.from('contract_dates').delete().eq('id', deadlineId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Deadline deleted'); queryClient.invalidateQueries({ queryKey: ['contract-dates', id] }); },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });

  const extractionSuggestion = useMemo(
    () => (extraction ? parseExtractionSuggestion(extraction.raw_json) : null),
    [extraction],
  );

  const suggestedDeadlines = useMemo(() => {
    if (!extractionSuggestion) return [] as Array<{ type: 'renewal' | 'notice' | 'payment'; due_date: string }>;
    const suggestions = [
      { type: 'renewal' as const, due_date: extractionSuggestion.renewal_date },
      { type: 'notice' as const, due_date: extractionSuggestion.notice_date },
      { type: 'payment' as const, due_date: extractionSuggestion.payment_date },
    ];
    return suggestions.filter((suggestion) => Boolean(suggestion.due_date)) as Array<{ type: 'renewal' | 'notice' | 'payment'; due_date: string }>;
  }, [extractionSuggestion]);

  const startExtraction = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Missing contract id.');
      const latestFile = files[0];
      if (!latestFile) throw new Error('No uploaded contract file found.');
      const { error } = await supabase.functions.invoke('extract-contract-fields', {
        body: {
          contractId: id,
          filePath: latestFile.storage_path,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('AI extraction started');
      queryClient.invalidateQueries({ queryKey: ['extraction', id] });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });

  const addSuggestedDeadlines = useMutation({
    mutationFn: async () => {
      if (!id || !extractionSuggestion) throw new Error('No AI suggestions available.');

      const existingPairs = new Set(
        dates.map((date) => `${date.type}:${date.due_date}`),
      );

      const inserts = suggestedDeadlines
        .filter((suggestion) => !existingPairs.has(`${suggestion.type}:${suggestion.due_date}`))
        .map((suggestion) => ({
          contract_id: id,
          type: suggestion.type,
          due_date: suggestion.due_date,
          label: `AI suggested ${suggestion.type} date`,
          note: 'Please review and edit if needed.',
        }));

      if (inserts.length === 0) return 0;

      const { error } = await supabase.from('contract_dates').insert(inserts);
      if (error) throw error;
      return inserts.length;
    },
    onSuccess: (insertedCount) => {
      if (insertedCount === 0) {
        toast.success('Suggested deadlines are already added.');
      } else {
        toast.success(`${insertedCount} suggested deadline${insertedCount > 1 ? 's' : ''} added.`);
      }
      queryClient.invalidateQueries({ queryKey: ['contract-dates', id] });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });

  const applySuggestionsToForm = () => {
    if (!extractionSuggestion) return;
    if (extractionSuggestion.contract_title) setTitle(extractionSuggestion.contract_title);
    if (extractionSuggestion.counterparty) setCounterparty(extractionSuggestion.counterparty);
    if (extractionSuggestion.start_date) setStartDate(extractionSuggestion.start_date);
    if (extractionSuggestion.end_date) setEndDate(extractionSuggestion.end_date);
    toast.success('Suggestions applied to the form. Click Save Changes to confirm.');
  };

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

  const missingFields = extractionSuggestion?.missing_fields ?? extraction?.missing_fields ?? [];
  const needsReview = extraction?.needs_review ?? extractionSuggestion?.needs_review ?? false;

  return (
    <div className="space-y-8">
      {/* Page header: title as clear top-level heading, counterparty directly under */}
      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <Link to="/app" className="text-muted-foreground hover:text-foreground transition-colors shrink-0" aria-label="Back to Dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{contract.title || 'Untitled Contract'}</h1>
            <StatusBadge status={contract.status} />
            {needsReview && (
              <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-medium">
                Needs Review
              </Badge>
            )}
          </div>
        </div>
        <p className="text-muted-foreground pl-8">
          {contract.counterparty || 'No counterparty specified'}
        </p>
      </header>

      {/* Contract Information */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium tracking-tight">Contract Information</h2>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="contract-title">Title</Label>
                <Input id="contract-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Contract title" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="contract-counterparty">Counterparty</Label>
                <Input id="contract-counterparty" value={counterparty} onChange={e => setCounterparty(e.target.value)} placeholder="e.g., Acme Corp" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contract-start">Start Date</Label>
                <Input id="contract-start" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contract-end">End Date</Label>
                <Input id="contract-end" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
            <Button
              className="w-full sm:w-auto"
              onClick={() => updateContract.mutate()}
              disabled={updateContract.isPending}
            >
              {updateContract.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Important Dates / Deadlines */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-medium tracking-tight">Important Dates / Deadlines</h2>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2 shrink-0">
                <Plus className="h-3 w-3" /> Add Deadline
              </Button>
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
        <Card>
          <CardContent className="pt-6">
            {dates.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <p className="text-sm">No deadlines added yet.</p>
                <p className="text-xs mt-1">Add renewal, notice, or payment dates to track important milestones.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dates.map(d => (
                  <div key={d.id} className="flex items-start justify-between gap-4 border rounded-md bg-muted/30 p-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`normal-case text-xs capitalize tracking-normal ${typeColors[d.type] || ''}`}>{d.type}</Badge>
                        <span className="text-sm font-medium">{d.label || d.type}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{new Date(d.due_date).toLocaleDateString()}</p>
                      {d.note && <p className="text-xs text-muted-foreground">{d.note}</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => deleteDeadline.mutate(d.id)}
                      disabled={deleteDeadline.isPending}
                      aria-label="Delete deadline"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* AI Extraction Review */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium tracking-tight">AI Extraction Review</h2>
        <Card>
          <CardContent className="pt-6 space-y-4">
            {!extraction ? (
              <p className="text-sm text-muted-foreground">
                No extraction run yet. Upload a contract file and run extraction to get AI-suggested values.
              </p>
            ) : (
              <>
                {extraction.status === 'processing' && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Extracting fields from the contract...
                  </div>
                )}

                {extraction.status === 'failed' && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Extraction failed</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {extraction.error || 'You can continue manually or re-run extraction.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {extractionSuggestion && extraction.status !== 'processing' && (
                  <div className="space-y-4">
                    {missingFields.length > 0 && (
                      <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-500 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">Some fields need confirmation</p>
                            <p className="text-xs text-muted-foreground mt-1">Review and fill in missing values:</p>
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {missingFields.map((f: string) => (
                                <Badge key={f} variant="outline" className="text-xs capitalize border-amber-500/40 bg-amber-500/10">
                                  {f.replace(/_/g, ' ')}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                      {(
                        [
                          ['contract_title', extractionSuggestion.contract_title],
                          ['counterparty', extractionSuggestion.counterparty],
                          ['start_date', extractionSuggestion.start_date],
                          ['end_date', extractionSuggestion.end_date],
                          ['renewal_date', extractionSuggestion.renewal_date],
                          ['notice_date', extractionSuggestion.notice_date],
                          ['payment_date', extractionSuggestion.payment_date],
                        ] as Array<[SupportedExtractionField, string | null]>
                      ).map(([field, value]) => {
                        const isMissing = missingFields.includes(field);
                        return (
                          <div key={field} className={`space-y-1 p-3 rounded-md ${isMissing ? 'bg-amber-500/5 border border-amber-500/20' : 'bg-muted/30'}`}>
                            <p className="text-xs text-muted-foreground">{EXTRACTION_FIELD_LABELS[field]}</p>
                            <p className={`text-sm font-medium ${isMissing ? 'text-amber-700 dark:text-amber-400' : ''}`}>
                              {formatSuggestionValue(value)}
                              {isMissing && <span className="text-amber-600 dark:text-amber-500 ml-1">— needs review</span>}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {extractionSuggestion.notes && (
                      <div className="space-y-1 p-3 rounded-md bg-muted/30">
                        <p className="text-xs text-muted-foreground">Extraction Notes</p>
                        <p className="text-sm">{extractionSuggestion.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                variant="default"
                size="sm"
                onClick={applySuggestionsToForm}
                disabled={!extractionSuggestion || extraction?.status === 'processing'}
              >
                Apply AI Suggestions
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addSuggestedDeadlines.mutate()}
                disabled={!suggestedDeadlines.length || addSuggestedDeadlines.isPending}
              >
                {addSuggestedDeadlines.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Suggested Deadlines
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => startExtraction.mutate()}
                disabled={startExtraction.isPending || files.length === 0}
              >
                {startExtraction.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {extraction ? 'Re-run Extraction' : 'Run Extraction'}
              </Button>
            </div>
            {extractionSuggestion && (
              <p className="text-xs text-muted-foreground">
                Applying suggestions updates the form above. Review and click Save Changes to confirm.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Files */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium tracking-tight">Files</h2>
        <Card>
          <CardContent className="pt-6">
            {files.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No files uploaded for this contract.</p>
            ) : (
              <div className="space-y-3">
                {files.map(f => (
                  <div key={f.id} className="flex items-center justify-between gap-4 border rounded-md bg-muted/30 p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{f.file_name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(f.size_bytes)} • {new Date(f.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleDownload(f.storage_path, f.file_name)} className="shrink-0 gap-2">
                      <Download className="h-4 w-4" /> Download
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Reminder History */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium tracking-tight">Reminder History</h2>
        <Card>
          <CardContent className="pt-6">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No reminders have been sent for this contract yet.</p>
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
      </section>
    </div>
  );
}
