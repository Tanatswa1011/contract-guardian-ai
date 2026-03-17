import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ArrowLeft, Plus, Download, AlertTriangle, FileText, Trash2, Loader2, CalendarClock, CheckCircle2, Sparkles } from 'lucide-react';
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

const formatSuggestionValue = (value: string | null) => value ?? '—';
const DATE_EXTRACTION_FIELDS = new Set<SupportedExtractionField>([
  'start_date',
  'end_date',
  'renewal_date',
  'notice_date',
  'payment_date',
]);

type ContractFormValues = {
  title: string;
  counterparty: string;
  startDate: string;
  endDate: string;
};

type DeadlineFormValues = {
  type: string;
  due_date: string;
  label: string;
  note: string;
};

const EMPTY_FORM_VALUES: ContractFormValues = {
  title: '',
  counterparty: '',
  startDate: '',
  endDate: '',
};

const EMPTY_DEADLINE_VALUES: DeadlineFormValues = {
  type: 'renewal',
  due_date: '',
  label: '',
  note: '',
};

const DEADLINE_TYPE_LABELS: Record<string, string> = {
  renewal: 'Renewal',
  notice: 'Notice',
  payment: 'Payment',
  custom: 'Custom',
};

const getContractFormValues = (contract: {
  title: string;
  counterparty: string | null;
  start_date: string | null;
  end_date: string | null;
}): ContractFormValues => ({
  title: contract.title ?? '',
  counterparty: contract.counterparty ?? '',
  startDate: contract.start_date ?? '',
  endDate: contract.end_date ?? '',
});

const areFormValuesEqual = (left: ContractFormValues, right: ContractFormValues) =>
  left.title === right.title &&
  left.counterparty === right.counterparty &&
  left.startDate === right.startDate &&
  left.endDate === right.endDate;

const formatDateLabel = (value: string | null) => {
  if (!value) return '—';
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return '—';

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatExtractionFieldValue = (field: SupportedExtractionField, value: string | null) =>
  DATE_EXTRACTION_FIELDS.has(field) ? formatDateLabel(value) : formatSuggestionValue(value);

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
    refetchInterval: (query) => query.state.data?.status === 'processing' ? 3000 : false,
    enabled: !!id,
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

  const [formValues, setFormValues] = useState<ContractFormValues>(EMPTY_FORM_VALUES);
  const [lastSyncedValues, setLastSyncedValues] = useState<ContractFormValues>(EMPTY_FORM_VALUES);
  const [hydratedContractId, setHydratedContractId] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newDeadline, setNewDeadline] = useState<DeadlineFormValues>(EMPTY_DEADLINE_VALUES);
  const lastSyncedValuesRef = useRef<ContractFormValues>(EMPTY_FORM_VALUES);
  const lastHydratedContractIdRef = useRef<string | null>(null);
  const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'An unexpected error occurred');

  useEffect(() => {
    if (!contract) return;

    const nextValues = getContractFormValues(contract);
    const isDifferentContract = contract.id !== lastHydratedContractIdRef.current;

    setFormValues((currentValues) => {
      const hasUnsavedChanges = !areFormValuesEqual(currentValues, lastSyncedValuesRef.current);
      return isDifferentContract || !hasUnsavedChanges ? nextValues : currentValues;
    });
    setLastSyncedValues(nextValues);
    setHydratedContractId(contract.id);
    lastSyncedValuesRef.current = nextValues;
    lastHydratedContractIdRef.current = contract.id;
  }, [contract]);

  const activeFormValues = contract
    ? hydratedContractId === contract.id
      ? formValues
      : getContractFormValues(contract)
    : EMPTY_FORM_VALUES;

  const updateContract = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Missing contract id.');

      const { error } = await supabase.from('contracts').update({
        title: activeFormValues.title,
        counterparty: activeFormValues.counterparty || null,
        start_date: activeFormValues.startDate || null,
        end_date: activeFormValues.endDate || null,
      }).eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Contract updated'); queryClient.invalidateQueries({ queryKey: ['contract', id] }); },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });

  const addDeadline = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Missing contract id.');

      const { error } = await supabase.from('contract_dates').insert({
        contract_id: id!, type: newDeadline.type, due_date: newDeadline.due_date,
        label: newDeadline.label.trim() || null, note: newDeadline.note.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Deadline added');
      queryClient.invalidateQueries({ queryKey: ['contract-dates', id] });
      setAddDialogOpen(false);
      setNewDeadline(EMPTY_DEADLINE_VALUES);
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });

  const deleteDeadline = useMutation({
    mutationFn: async (deadlineId: string) => {
      if (!id) throw new Error('Missing contract id.');
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

    if (contract) {
      setHydratedContractId(contract.id);
    }
    setFormValues((currentValues) => ({
      title: extractionSuggestion.contract_title ?? currentValues.title,
      counterparty: extractionSuggestion.counterparty ?? currentValues.counterparty,
      startDate: extractionSuggestion.start_date ?? currentValues.startDate,
      endDate: extractionSuggestion.end_date ?? currentValues.endDate,
    }));
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

  const updateFormValue = <K extends keyof ContractFormValues>(field: K, value: ContractFormValues[K]) => {
    setHydratedContractId(contract.id);
    setFormValues((currentValues) => ({ ...currentValues, [field]: value }));
  };

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

  const missingFields = extractionSuggestion
    ? extractionSuggestion.missing_fields
    : Array.isArray(extraction?.missing_fields)
      ? extraction.missing_fields.filter((field): field is SupportedExtractionField => field in EXTRACTION_FIELD_LABELS)
      : [];
  const missingFieldSet = new Set(missingFields);
  const needsReview = extractionSuggestion?.needs_review ?? extraction?.needs_review ?? false;
  const isFormHydratedForCurrentContract = hydratedContractId === contract.id;
  const isDirty = isFormHydratedForCurrentContract && !areFormValuesEqual(formValues, lastSyncedValues);
  const saveStatusMessage = updateContract.isPending
    ? 'Saving changes...'
    : isDirty
      ? 'Unsaved changes ready to save'
      : 'All changes saved';
  const extractionStatusLabel = extraction
    ? extraction.status === 'processing'
      ? 'Processing'
      : extraction.status === 'failed'
        ? 'Failed'
        : needsReview
          ? 'Needs Review'
          : 'Ready'
    : 'Not Started';
  const extractionStatusVariant: 'outline' | 'secondary' | 'destructive' =
    extraction?.status === 'failed'
      ? 'destructive'
      : extraction?.status === 'processing' || needsReview
        ? 'secondary'
        : 'outline';
  const headerTitle = (isFormHydratedForCurrentContract ? activeFormValues.title : contract.title || '').trim() || 'Untitled Contract';
  const headerCounterparty = (isFormHydratedForCurrentContract ? activeFormValues.counterparty : contract.counterparty || '').trim();
  const headerStartDate = isFormHydratedForCurrentContract ? activeFormValues.startDate : contract.start_date;
  const headerEndDate = isFormHydratedForCurrentContract ? activeFormValues.endDate : contract.end_date;
  const isDeletingDeadline = (deadlineId: string) =>
    deleteDeadline.isPending && deleteDeadline.variables === deadlineId;
  const isMissingField = (field: SupportedExtractionField) => missingFieldSet.has(field);
  const extractionFields: Array<{ field: SupportedExtractionField; value: string | null }> = [
    { field: 'contract_title', value: extractionSuggestion?.contract_title ?? null },
    { field: 'counterparty', value: extractionSuggestion?.counterparty ?? null },
    { field: 'start_date', value: extractionSuggestion?.start_date ?? null },
    { field: 'end_date', value: extractionSuggestion?.end_date ?? null },
    { field: 'renewal_date', value: extractionSuggestion?.renewal_date ?? null },
    { field: 'notice_date', value: extractionSuggestion?.notice_date ?? null },
    { field: 'payment_date', value: extractionSuggestion?.payment_date ?? null },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Link to="/app" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={contract.status} />
              {needsReview && (
                <Badge variant="outline" className="border-destructive/30 bg-destructive/5 text-destructive">
                  Needs Review
                </Badge>
              )}
              {isDirty && (
                <Badge variant="outline" className="border-border bg-background text-foreground">
                  Unsaved Changes
                </Badge>
              )}
            </div>

            <div className="space-y-1">
              <h1 className="break-words text-3xl font-semibold tracking-tight">{headerTitle}</h1>
              <p className="text-base text-muted-foreground">
                {headerCounterparty || 'Counterparty not yet added'}
              </p>
            </div>
          </div>

          <div className="grid min-w-[220px] grid-cols-2 gap-3 border bg-muted/20 p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Start Date</p>
              <p className="mt-1 text-sm font-medium">{formatDateLabel(headerStartDate)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">End Date</p>
              <p className="mt-1 text-sm font-medium">{formatDateLabel(headerEndDate)}</p>
            </div>
          </div>
        </div>
      </div>

      {needsReview && (
        <Alert className="border-destructive/30 bg-destructive/5 text-foreground">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertTitle>Needs manual review</AlertTitle>
          <AlertDescription className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Review the contract information and important dates before saving. The latest extraction still has fields that need confirmation.
            </p>
            {missingFields.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {missingFields.map((field) => (
                  <Badge
                    key={field}
                    variant="outline"
                    className="border-destructive/25 bg-background text-xs normal-case tracking-normal text-destructive"
                  >
                    {EXTRACTION_FIELD_LABELS[field]}
                  </Badge>
                ))}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contract Information</CardTitle>
          <CardDescription>
            Maintain the core contract details here. AI suggestions only update the form until you intentionally save.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="contract-title">Title</Label>
                {isMissingField('contract_title') && (
                  <Badge variant="outline" className="border-destructive/25 bg-destructive/5 text-xs normal-case tracking-normal text-destructive">
                    Missing
                  </Badge>
                )}
              </div>
              <Input
                id="contract-title"
                value={activeFormValues.title}
                onChange={(event) => updateFormValue('title', event.target.value)}
                className={cn(isMissingField('contract_title') && 'border-destructive/30')}
                placeholder="Enter contract title"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="contract-counterparty">Counterparty</Label>
                {isMissingField('counterparty') && (
                  <Badge variant="outline" className="border-destructive/25 bg-destructive/5 text-xs normal-case tracking-normal text-destructive">
                    Missing
                  </Badge>
                )}
              </div>
              <Input
                id="contract-counterparty"
                value={activeFormValues.counterparty}
                onChange={(event) => updateFormValue('counterparty', event.target.value)}
                placeholder="e.g., Acme Corp"
                className={cn(isMissingField('counterparty') && 'border-destructive/30')}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="contract-start-date">Start Date</Label>
                {isMissingField('start_date') && (
                  <Badge variant="outline" className="border-destructive/25 bg-destructive/5 text-xs normal-case tracking-normal text-destructive">
                    Missing
                  </Badge>
                )}
              </div>
              <Input
                id="contract-start-date"
                type="date"
                value={activeFormValues.startDate}
                onChange={(event) => updateFormValue('startDate', event.target.value)}
                className={cn(isMissingField('start_date') && 'border-destructive/30')}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="contract-end-date">End Date</Label>
                {isMissingField('end_date') && (
                  <Badge variant="outline" className="border-destructive/25 bg-destructive/5 text-xs normal-case tracking-normal text-destructive">
                    Missing
                  </Badge>
                )}
              </div>
              <Input
                id="contract-end-date"
                type="date"
                value={activeFormValues.endDate}
                onChange={(event) => updateFormValue('endDate', event.target.value)}
                className={cn(isMissingField('end_date') && 'border-destructive/30')}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t pt-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                {updateContract.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                )}
                {saveStatusMessage}
              </div>
              <p className="text-xs text-muted-foreground">
                Review any AI-applied values here, then click Save Changes to update the contract record.
              </p>
            </div>

            <Button onClick={() => updateContract.mutate()} disabled={updateContract.isPending || !isDirty}>
              {updateContract.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="text-base">Important Dates / Deadlines</CardTitle>
            <CardDescription>
              Track renewal, notice, payment, and custom milestones in one place.
            </CardDescription>
          </div>

          <Dialog open={addDialogOpen} onOpenChange={(open) => {
            if (addDeadline.isPending) return;
            setAddDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-3.5 w-3.5" />
                Add Deadline
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Deadline</DialogTitle>
                <DialogDescription>
                  Add a contract milestone and save it to the timeline once the details look right.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="deadline-type">Type</Label>
                  <Select value={newDeadline.type} onValueChange={(value) => setNewDeadline((current) => ({ ...current, type: value }))}>
                    <SelectTrigger id="deadline-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="renewal">Renewal</SelectItem>
                      <SelectItem value="notice">Notice</SelectItem>
                      <SelectItem value="payment">Payment</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deadline-date">Due Date</Label>
                  <Input
                    id="deadline-date"
                    type="date"
                    value={newDeadline.due_date}
                    onChange={(event) => setNewDeadline((current) => ({ ...current, due_date: event.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deadline-label">Label</Label>
                  <Input
                    id="deadline-label"
                    placeholder="e.g., Annual renewal"
                    value={newDeadline.label}
                    onChange={(event) => setNewDeadline((current) => ({ ...current, label: event.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deadline-note">Note</Label>
                  <Textarea
                    id="deadline-note"
                    placeholder="Optional context for this deadline"
                    value={newDeadline.note}
                    onChange={(event) => setNewDeadline((current) => ({ ...current, note: event.target.value }))}
                  />
                </div>

                <Button className="w-full" onClick={() => addDeadline.mutate()} disabled={!newDeadline.due_date || addDeadline.isPending}>
                  {addDeadline.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save Deadline
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {dates.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 border border-dashed bg-muted/20 px-6 py-12 text-center">
              <CalendarClock className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">No deadlines added yet</p>
                <p className="text-sm text-muted-foreground">
                  Add a renewal, notice, payment, or custom deadline to keep this contract on track.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {dates.map((deadline) => (
                <div
                  key={deadline.id}
                  className="flex flex-col gap-4 border bg-muted/20 p-4 md:flex-row md:items-start md:justify-between"
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={`normal-case text-xs tracking-normal ${typeColors[deadline.type] || ''}`}>
                        {DEADLINE_TYPE_LABELS[deadline.type] || deadline.type}
                      </Badge>
                      <p className="text-sm font-medium">
                        {deadline.label || DEADLINE_TYPE_LABELS[deadline.type] || deadline.type}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Due Date</p>
                      <p className="text-sm">{formatDateLabel(deadline.due_date)}</p>
                    </div>

                    {deadline.note && (
                      <p className="text-sm text-muted-foreground">{deadline.note}</p>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => deleteDeadline.mutate(deadline.id)}
                    disabled={deleteDeadline.isPending}
                  >
                    {isDeletingDeadline(deadline.id) ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1.5">
              <CardTitle className="text-base">AI Extraction Review</CardTitle>
              <CardDescription>
                Review the latest extraction output before copying suggested values into the editable form.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={extractionStatusVariant} className="normal-case text-xs tracking-normal">
                {extractionStatusLabel}
              </Badge>
              {suggestedDeadlines.length > 0 && (
                <Badge variant="outline" className="normal-case text-xs tracking-normal">
                  {suggestedDeadlines.length} suggested deadline{suggestedDeadlines.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {!extraction ? (
            <div className="space-y-4">
              <div className="border bg-muted/20 p-4">
                <p className="text-sm font-medium">No extraction run yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Run extraction from the latest uploaded contract file whenever you want AI-suggested contract values.
                </p>
              </div>
            </div>
          ) : (
            <>
              {extraction.status === 'processing' && (
                <div className="flex items-center gap-2 border bg-muted/20 p-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Extracting fields from the latest contract file...
                </div>
              )}

              {extraction.status === 'failed' && (
                <Alert variant="destructive" className="border-destructive/30 bg-destructive/5 text-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Extraction failed</AlertTitle>
                  <AlertDescription className="text-muted-foreground">
                    {extraction.error || 'You can continue manually or re-run extraction.'}
                  </AlertDescription>
                </Alert>
              )}

              {needsReview && extraction.status !== 'failed' && (
                <div className="border border-destructive/20 bg-destructive/5 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Review required before saving</p>
                      <p className="text-sm text-muted-foreground">
                        Some extracted values are missing or still need manual confirmation.
                      </p>
                    </div>
                    {missingFields.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {missingFields.map((field) => (
                          <Badge
                            key={field}
                            variant="outline"
                            className="border-destructive/25 bg-background text-xs normal-case tracking-normal text-destructive"
                          >
                            {EXTRACTION_FIELD_LABELS[field]}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {extractionSuggestion && (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {extractionFields.map(({ field, value }) => {
                      const missing = missingFieldSet.has(field);

                      return (
                        <div
                          key={field}
                          className={cn(
                            'space-y-2 border p-4',
                            missing ? 'border-destructive/25 bg-destructive/5' : 'bg-muted/20',
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              {EXTRACTION_FIELD_LABELS[field]}
                            </p>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] normal-case tracking-normal',
                                missing && 'border-destructive/25 bg-background text-destructive',
                              )}
                            >
                              {missing ? 'Needs Review' : 'Extracted'}
                            </Badge>
                          </div>
                          <p className={cn('text-sm font-medium', missing && 'text-destructive')}>
                            {formatExtractionFieldValue(field, value)}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {extractionSuggestion.notes && (
                    <div className="border bg-muted/20 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Extraction Notes</p>
                      <p className="mt-2 text-sm">{extractionSuggestion.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="space-y-3 border-t pt-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={applySuggestionsToForm}
                disabled={!extractionSuggestion || extraction?.status === 'processing'}
              >
                <Sparkles className="h-4 w-4" />
                Apply AI Suggestions
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addSuggestedDeadlines.mutate()}
                disabled={!suggestedDeadlines.length || addSuggestedDeadlines.isPending}
              >
                {addSuggestedDeadlines.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Add Suggested Deadlines
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => startExtraction.mutate()}
                disabled={startExtraction.isPending || files.length === 0}
              >
                {startExtraction.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {extraction ? 'Re-run Extraction' : 'Run Extraction'}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Applying AI suggestions fills the editable form only. Review the values and click Save Changes when you are ready to update the contract.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Files</CardTitle>
          <CardDescription>Download the uploaded contract files associated with this record.</CardDescription>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 border border-dashed bg-muted/20 px-6 py-12 text-center">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">No files uploaded</p>
                <p className="text-sm text-muted-foreground">
                  Upload a contract file to enable AI extraction and secure downloads from this page.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <div key={file.id} className="flex flex-col gap-4 border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{file.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size_bytes)} • {new Date(file.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDownload(file.storage_path, file.file_name)}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reminder History</CardTitle>
          <CardDescription>Review sent reminders, delivery channels, and any failed notifications.</CardDescription>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 border border-dashed bg-muted/20 px-6 py-12 text-center">
              <CalendarClock className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">No reminders sent yet</p>
                <p className="text-sm text-muted-foreground">
                  Reminder activity will appear here after notifications are sent for this contract.
                </p>
              </div>
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
                  {notifications.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell>
                        <Badge
                          variant={notification.status === 'sent' ? 'secondary' : notification.status === 'failed' ? 'destructive' : 'outline'}
                          className="normal-case text-xs capitalize tracking-normal"
                        >
                          {notification.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{notification.subject || '—'}</TableCell>
                      <TableCell className="text-sm">{notification.sent_to}</TableCell>
                      <TableCell className="text-sm capitalize">{notification.channel}</TableCell>
                      <TableCell className="text-sm">{new Date(notification.sent_at).toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-destructive">
                        {notification.status === 'failed' ? (notification.error || '—') : '—'}
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
