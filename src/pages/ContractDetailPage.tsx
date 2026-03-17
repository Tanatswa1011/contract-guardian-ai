import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Download, AlertTriangle, FileText, Trash2, Loader2, Sparkles, Calendar, CheckCircle2, Info } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
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

  const prevContractIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!contract || contract.id === prevContractIdRef.current) return;
    setTitle(contract.title);
    setCounterparty(contract.counterparty || '');
    setStartDate(contract.start_date || '');
    setEndDate(contract.end_date || '');
    prevContractIdRef.current = contract.id;
  }, [contract]);

  const isFormReady = prevContractIdRef.current === contract?.id;

  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : 'An unexpected error occurred';

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
    mutationFn: async () => {
      const { error } = await supabase.from('contract_dates').insert({
        contract_id: id!,
        type: newDeadline.type,
        due_date: newDeadline.due_date,
        label: newDeadline.label || null,
        note: newDeadline.note || null,
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
    return suggestions.filter((s) => Boolean(s.due_date)) as Array<{ type: 'renewal' | 'notice' | 'payment'; due_date: string }>;
  }, [extractionSuggestion]);

  const startExtraction = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Missing contract id.');
      const latestFile = files[0];
      if (!latestFile) throw new Error('No uploaded contract file found.');
      const { error } = await supabase.functions.invoke('extract-contract-fields', {
        body: { contractId: id, filePath: latestFile.storage_path },
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
        .filter((s) => !existingPairs.has(`${s.type}:${s.due_date}`))
        .map((s) => ({
          contract_id: id,
          type: s.type,
          due_date: s.due_date,
          label: `AI suggested ${s.type} date`,
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
        toast.success(`${insertedCount} suggested deadline${insertedCount! > 1 ? 's' : ''} added.`);
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
    toast.success('Suggestions applied to the form. Review and click Save Changes to confirm.');
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
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
  const needsReview = extraction?.needs_review === true;

  const hasUnsavedChanges = isFormReady && (
    title !== (contract.title ?? '') ||
    counterparty !== (contract.counterparty ?? '') ||
    startDate !== (contract.start_date ?? '') ||
    endDate !== (contract.end_date ?? '')
  );

  return (
    <div className="space-y-8">
      {/* ── Page header ── */}
      <div className="space-y-1">
        <div className="mb-4">
          <Link
            to="/app"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight truncate">
                {contract.title}
              </h1>
              <StatusBadge status={contract.status} />
              {needsReview && (
                <Badge
                  variant="outline"
                  className="normal-case text-xs capitalize tracking-normal gap-1"
                >
                  <AlertTriangle className="h-3 w-3" />
                  Needs Review
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {contract.counterparty || 'No counterparty specified'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Needs review banner ── */}
      {needsReview && (missingFields as string[]).length > 0 && (
        <Card className="border-foreground/15 bg-muted/50">
          <CardContent className="py-4 px-5">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Some fields could not be extracted automatically
                </p>
                <p className="text-xs text-muted-foreground">
                  Review the AI suggestions below, then confirm or fill in the missing information manually.
                </p>
                <div className="flex gap-1.5 flex-wrap">
                  {(missingFields as string[]).map((f: string) => (
                    <Badge
                      key={f}
                      variant="outline"
                      className="normal-case text-xs capitalize tracking-normal text-muted-foreground"
                    >
                      {f.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Contract Information ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contract Information</CardTitle>
          <CardDescription>Core contract details. Edit fields and save when ready.</CardDescription>
        </CardHeader>
        <CardContent>
          {!isFormReady ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contract-title">Title</Label>
                  <Input
                    id="contract-title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Contract title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contract-counterparty">Counterparty</Label>
                  <Input
                    id="contract-counterparty"
                    value={counterparty}
                    onChange={e => setCounterparty(e.target.value)}
                    placeholder="e.g., Acme Corp"
                  />
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contract-start-date">Start Date</Label>
                  <Input
                    id="contract-start-date"
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contract-end-date">End Date</Label>
                  <Input
                    id="contract-end-date"
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <Button
                  onClick={() => updateContract.mutate()}
                  disabled={updateContract.isPending}
                >
                  {updateContract.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
                {hasUnsavedChanges && (
                  <span className="text-xs text-muted-foreground">Unsaved changes</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Important Dates / Deadlines ── */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle className="text-base">Important Dates</CardTitle>
              <CardDescription>Deadlines, renewals, and key dates for this contract.</CardDescription>
            </div>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="shrink-0 gap-1.5">
                  <Plus className="h-3 w-3" />
                  Add Deadline
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Deadline</DialogTitle>
                </DialogHeader>
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
                    <Input
                      type="date"
                      value={newDeadline.due_date}
                      onChange={e => setNewDeadline(d => ({ ...d, due_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Input
                      placeholder="e.g., Annual renewal"
                      value={newDeadline.label}
                      onChange={e => setNewDeadline(d => ({ ...d, label: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Note</Label>
                    <Input
                      placeholder="Optional note"
                      value={newDeadline.note}
                      onChange={e => setNewDeadline(d => ({ ...d, note: e.target.value }))}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => addDeadline.mutate()}
                    disabled={!newDeadline.due_date || addDeadline.isPending}
                  >
                    {addDeadline.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Deadline
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {dates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Calendar className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No deadlines yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Add important dates to track renewals, notices, and payments.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {dates.map(d => (
                <div
                  key={d.id}
                  className="flex items-start justify-between gap-3 border bg-muted/30 p-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        className={`normal-case text-xs capitalize tracking-normal ${typeColors[d.type] || typeColors.custom}`}
                      >
                        {d.type}
                      </Badge>
                      <span className="text-sm font-medium truncate">
                        {d.label || d.type}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(d.due_date).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    {d.note && (
                      <p className="text-xs text-muted-foreground/80">{d.note}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteDeadline.mutate(d.id)}
                    disabled={deleteDeadline.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── AI Extraction Review ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">AI Extraction Review</CardTitle>
          </div>
          <CardDescription>
            Values extracted from your uploaded contract document.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {!extraction ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No extraction run yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1 max-w-sm">
                Upload a contract file and run extraction to have AI identify key fields automatically.
              </p>
            </div>
          ) : (
            <>
              {extraction.status === 'processing' && (
                <div className="flex items-center gap-2.5 border bg-muted/30 p-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Extracting fields from the contract...
                  </p>
                </div>
              )}

              {extraction.status === 'failed' && (
                <div className="border border-destructive/20 bg-destructive/5 p-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
                    <div>
                      <p className="text-sm font-medium">Extraction failed</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {extraction.error || 'You can continue manually or re-run extraction.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {extractionSuggestion && (
                <div className="space-y-4">
                  <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
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
                      const isMissing = value === null;
                      return (
                        <div
                          key={field}
                          className={`flex items-baseline justify-between gap-2 border-b border-border/50 pb-2 ${
                            isMissing ? 'opacity-60' : ''
                          }`}
                        >
                          <p className="text-xs text-muted-foreground shrink-0">
                            {EXTRACTION_FIELD_LABELS[field]}
                          </p>
                          {isMissing ? (
                            <span className="text-xs text-muted-foreground/60 italic">
                              Not found
                            </span>
                          ) : (
                            <p className="text-sm font-medium text-right truncate">
                              {value}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {extractionSuggestion.notes && (
                    <div className="border-l-2 border-border pl-3">
                      <p className="text-xs text-muted-foreground mb-0.5">Extraction Notes</p>
                      <p className="text-sm">{extractionSuggestion.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="flex flex-col gap-3 pt-1">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={applySuggestionsToForm}
                disabled={!extractionSuggestion || extraction?.status === 'processing'}
                className="gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Apply AI Suggestions
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addSuggestedDeadlines.mutate()}
                disabled={!suggestedDeadlines.length || addSuggestedDeadlines.isPending}
              >
                {addSuggestedDeadlines.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Add Suggested Deadlines
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => startExtraction.mutate()}
                disabled={startExtraction.isPending || files.length === 0}
              >
                {startExtraction.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {extraction ? 'Re-run Extraction' : 'Run Extraction'}
              </Button>
            </div>
            {extractionSuggestion && (
              <p className="text-xs text-muted-foreground">
                Applying suggestions fills the form above — you must click <span className="font-medium">Save Changes</span> to confirm.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Files ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Files</CardTitle>
          <CardDescription>Uploaded contract documents.</CardDescription>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No files uploaded</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Upload a contract document to enable AI extraction.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map(f => (
                <div
                  key={f.id}
                  className="flex items-center justify-between gap-3 border bg-muted/30 p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{f.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(f.size_bytes)} · {new Date(f.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => handleDownload(f.storage_path, f.file_name)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Reminder History ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reminder History</CardTitle>
          <CardDescription>Notifications sent for this contract.</CardDescription>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No reminders sent yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Reminders will appear here once deadlines trigger notifications.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                      <TableCell className="text-sm whitespace-nowrap">
                        {new Date(n.sent_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm text-destructive">
                        {n.status === 'failed' ? (n.error || '—') : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
