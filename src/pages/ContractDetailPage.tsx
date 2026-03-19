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
import { ArrowLeft, Plus, Download, AlertTriangle, FileText, Trash2, Loader2, CalendarClock } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  parseExtractionSuggestion,
  type SupportedExtractionField,
} from '@/lib/extraction';
import { generateSuggestedDeadlines } from '@/lib/deadlineSuggestions';
import { cn } from '@/lib/utils';

const EXTRACTION_FIELD_LABELS: Record<SupportedExtractionField, string> = {
  contract_title: 'Contract Title',
  counterparty: 'Counterparty',
  start_date: 'Start Date',
  end_date: 'End Date',
  renewal_date: 'Renewal Date',
  notice_date: 'Notice Date',
};

const formatSuggestionValue = (value: string | null) => value ?? '—';

const DEADLINE_TYPE_LABELS: Record<string, string> = {
  renewal: 'Renewal',
  notice: 'Notice',
  custom: 'Custom',
};

type ContractFormValues = {
  title: string;
  counterparty: string;
  startDate: string;
  endDate: string;
};

const EMPTY_FORM_VALUES: ContractFormValues = {
  title: '',
  counterparty: '',
  startDate: '',
  endDate: '',
};

const EXTRACTION_FIELDS_IN_ORDER: SupportedExtractionField[] = [
  'contract_title',
  'counterparty',
  'start_date',
  'end_date',
  'renewal_date',
  'notice_date',
];

const DEADLINE_REVIEW_FIELDS: SupportedExtractionField[] = ['renewal_date', 'notice_date'];

const REVIEW_TARGET_ID_BY_FIELD: Record<SupportedExtractionField, string> = {
  contract_title: 'contract-title-input',
  counterparty: 'contract-counterparty-input',
  start_date: 'contract-start-date-input',
  end_date: 'contract-end-date-input',
  renewal_date: 'important-dates-section',
  notice_date: 'important-dates-section',
};

export default function ContractDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentWorkspaceId, isResolved } = useWorkspace();

  const { data: contract, isLoading: contractLoading } = useQuery({
    queryKey: ['contract', id, user?.id, currentWorkspaceId],
    queryFn: async () => {
      if (!id || !user || !currentWorkspaceId) {
        return null;
      }

      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', id)
        .eq('workspace_id', currentWorkspaceId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user && isResolved && !!currentWorkspaceId,
  });

  const { data: dates = [], isLoading: datesLoading } = useQuery({
    queryKey: ['contract-dates', contract?.id, currentWorkspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_dates')
        .select('*')
        .eq('contract_id', contract!.id)
        .order('due_date');
      if (error) throw error;
      return data;
    },
    enabled: isResolved && !!contract?.id && !!currentWorkspaceId,
  });

  const { data: files = [], isLoading: filesLoading } = useQuery({
    queryKey: ['contract-files', contract?.id, currentWorkspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_files')
        .select('*')
        .eq('contract_id', contract!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isResolved && !!contract?.id && !!currentWorkspaceId,
  });

  const { data: extraction, isLoading: extractionLoading } = useQuery({
    queryKey: ['extraction', contract?.id, currentWorkspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('extraction_runs')
        .select('*')
        .eq('contract_id', contract!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: (query) => query.state.data?.status === 'processing' ? 3000 : false,
    enabled: isResolved && !!contract?.id && !!currentWorkspaceId,
  });

  const { data: notifications = [], isLoading: notificationsLoading } = useQuery({
    queryKey: ['notifications', contract?.id, currentWorkspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_log')
        .select('*')
        .eq('contract_id', contract!.id)
        .order('sent_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isResolved && !!contract?.id && !!currentWorkspaceId,
  });

  const [formValues, setFormValues] = useState<ContractFormValues>(EMPTY_FORM_VALUES);
  const [initialFormValues, setInitialFormValues] = useState<ContractFormValues>(EMPTY_FORM_VALUES);
  const [loadedContractId, setLoadedContractId] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newDeadline, setNewDeadline] = useState({ type: 'renewal', due_date: '', label: '', note: '' });
  const [aiSuggestionsApplied, setAiSuggestionsApplied] = useState(false);
  const [deletingDeadlineId, setDeletingDeadlineId] = useState<string | null>(null);
  const [activeReviewField, setActiveReviewField] = useState<SupportedExtractionField | null>(null);
  const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'An unexpected error occurred');

  const hasUnsavedChanges = useMemo(
    () =>
      formValues.title !== initialFormValues.title
      || formValues.counterparty !== initialFormValues.counterparty
      || formValues.startDate !== initialFormValues.startDate
      || formValues.endDate !== initialFormValues.endDate,
    [formValues, initialFormValues],
  );

  const updateFormField = (field: keyof ContractFormValues, value: string) => {
    setFormValues((currentValues) => ({ ...currentValues, [field]: value }));
  };

  const extractionSuggestion = useMemo(
    () => (extraction ? parseExtractionSuggestion(extraction.raw_json) : null),
    [extraction],
  );

  const extractionMissingFields = useMemo(() => {
    if (extractionSuggestion?.missing_fields.length) {
      return extractionSuggestion.missing_fields;
    }
    if (!Array.isArray(extraction?.missing_fields)) {
      return [] as SupportedExtractionField[];
    }
    return extraction.missing_fields.filter(
      (field): field is SupportedExtractionField => typeof field === 'string' && field in EXTRACTION_FIELD_LABELS,
    );
  }, [extraction, extractionSuggestion]);

  useEffect(() => {
    if (!contract) return;
    const nextValues: ContractFormValues = {
      title: contract.title,
      counterparty: contract.counterparty ?? '',
      startDate: contract.start_date ?? '',
      endDate: contract.end_date ?? '',
    };
    const isNewContract = loadedContractId !== contract.id;
    if (isNewContract || !hasUnsavedChanges) {
      setFormValues(nextValues);
      setInitialFormValues(nextValues);
      setLoadedContractId(contract.id);
      setAiSuggestionsApplied(false);
    }
  }, [
    contract?.id,
    contract?.title,
    contract?.counterparty,
    contract?.start_date,
    contract?.end_date,
    loadedContractId,
    hasUnsavedChanges,
    contract,
  ]);

  useEffect(() => {
    if (!activeReviewField) return;
    const timeoutId = window.setTimeout(() => setActiveReviewField(null), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [activeReviewField]);

  const updateContract = useMutation({
    mutationFn: async (values: ContractFormValues) => {
      if (!contract) throw new Error('Contract not found.');
      if (!currentWorkspaceId) throw new Error('Workspace is required.');

      const { error } = await supabase.from('contracts').update({
        title: values.title.trim(),
        counterparty: values.counterparty || null,
        start_date: values.startDate || null,
        end_date: values.endDate || null,
      }).eq('id', contract.id).eq('workspace_id', currentWorkspaceId);
      if (error) throw error;
    },
    onSuccess: async (_, values) => {
      setInitialFormValues(values);
      setAiSuggestionsApplied(false);
      if (extraction?.id) {
        const unresolvedFields = extractionMissingFields.filter((field) => (
          isFieldMissingForValues(field, values, currentDeadlineByType)
        ));
        const { error } = await supabase
          .from('extraction_runs')
          .update({
            missing_fields: unresolvedFields,
            needs_review: unresolvedFields.length > 0,
          })
          .eq('id', extraction.id);
        if (error) {
          toast.error('Changes saved, but review status could not be refreshed.');
        } else {
          queryClient.invalidateQueries({ queryKey: ['extraction', contract?.id, currentWorkspaceId] });
        }
      }
      toast.success('Changes saved successfully.');
      queryClient.invalidateQueries({ queryKey: ['contract', contract?.id, user?.id, currentWorkspaceId] });
      queryClient.invalidateQueries({ queryKey: ['contracts-dashboard', user?.id, currentWorkspaceId] });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });

  const addDeadline = useMutation({
    mutationFn: async () => {
      if (!contract) throw new Error('Contract not found.');
      if (!currentWorkspaceId || contract.workspace_id !== currentWorkspaceId) {
        throw new Error('Contract is not available in the selected workspace.');
      }

      const { error } = await supabase.from('contract_dates').insert({
        contract_id: contract.id, type: newDeadline.type, due_date: newDeadline.due_date,
        label: newDeadline.label || null, note: newDeadline.note || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Deadline added');
      queryClient.invalidateQueries({ queryKey: ['contract-dates', contract?.id, currentWorkspaceId] });
      queryClient.invalidateQueries({ queryKey: ['contracts-dashboard', user?.id, currentWorkspaceId] });
      setAddDialogOpen(false);
      setNewDeadline({ type: 'renewal', due_date: '', label: '', note: '' });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });

  const deleteDeadline = useMutation({
    mutationFn: async (deadlineId: string) => {
      if (!contract) throw new Error('Contract not found.');
      if (!currentWorkspaceId || contract.workspace_id !== currentWorkspaceId) {
        throw new Error('Contract is not available in the selected workspace.');
      }
      const { error } = await supabase.from('contract_dates').delete().eq('id', deadlineId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Deadline deleted');
      queryClient.invalidateQueries({ queryKey: ['contract-dates', contract?.id, currentWorkspaceId] });
      queryClient.invalidateQueries({ queryKey: ['contracts-dashboard', user?.id, currentWorkspaceId] });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });

  const suggestedDeadlines = useMemo(() => {
    if (!extractionSuggestion) {
      return [];
    }
    return generateSuggestedDeadlines({
      start_date: extractionSuggestion.start_date,
      end_date: extractionSuggestion.end_date,
      renewal_date: extractionSuggestion.renewal_date,
      notice_date: extractionSuggestion.notice_date,
      notice_period_days: extractionSuggestion.notice_period_days,
    });
  }, [extractionSuggestion]);

  const startExtraction = useMutation({
    mutationFn: async () => {
      if (!contract) throw new Error('Missing contract id.');
      if (!currentWorkspaceId || contract.workspace_id !== currentWorkspaceId) {
        throw new Error('Contract is not available in the selected workspace.');
      }
      const latestFile = files[0];
      if (!latestFile) throw new Error('No uploaded contract file found.');
      const { data, error } = await supabase.functions.invoke('extract-contract-fields', {
        body: {
          contractId: contract.id,
          filePath: latestFile.storage_path,
          workspaceId: currentWorkspaceId,
        },
      });
      if (error) throw error;
      if (data && typeof data === 'object' && 'ok' in data && data.ok === false) {
        const message = 'error' in data && typeof data.error === 'string'
          ? data.error
          : 'Extraction failed.';
        throw new Error(message);
      }
    },
    onSuccess: () => {
      toast.success('AI extraction completed.');
      queryClient.invalidateQueries({ queryKey: ['extraction', contract?.id, currentWorkspaceId] });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });

  const addSuggestedDeadlines = useMutation({
    mutationFn: async () => {
      if (!contract || !extractionSuggestion) throw new Error('No AI suggestions available.');
      if (!currentWorkspaceId) throw new Error('Workspace is required to apply suggested deadlines.');
      if (suggestedDeadlines.length === 0) throw new Error('No suggested deadlines available.');

      const { data: scopedContract, error: scopeError } = await supabase
        .from('contracts')
        .select('id')
        .eq('id', contract.id)
        .eq('workspace_id', currentWorkspaceId)
        .maybeSingle();

      if (scopeError) throw scopeError;
      if (!scopedContract) {
        throw new Error('Contract is not available in the selected workspace.');
      }

      // Fetch existing deadline types to avoid partial unique index conflict
      const { data: existingDates } = await supabase
        .from('contract_dates')
        .select('type')
        .eq('contract_id', contract.id);

      const existingTypes = new Set((existingDates ?? []).map((d) => d.type));

      const inserts = suggestedDeadlines
        .filter((suggestion) => !existingTypes.has(suggestion.type))
        .map((suggestion) => ({
          contract_id: contract.id,
          type: suggestion.type,
          due_date: suggestion.due_date,
          label: suggestion.label,
          note: suggestion.note,
        }));

      if (inserts.length === 0) return [];

      const { data: insertedRows, error: insertError } = await supabase
        .from('contract_dates')
        .insert(inserts)
        .select('id, contract_id, type, due_date, label, note, created_at');

      if (insertError) {
        throw insertError;
      }

      return insertedRows ?? [];
    },
    onSuccess: (upsertedRows) => {
      queryClient.setQueryData(
        ['contract-dates', contract?.id, currentWorkspaceId],
        (currentRows: typeof dates | undefined) => {
          const byType = new Map<string, (typeof dates)[number]>();
          for (const row of currentRows ?? []) {
            byType.set(row.type, row);
          }

          for (const suggestion of suggestedDeadlines) {
            const existing = byType.get(suggestion.type);
            if (existing) {
              byType.set(suggestion.type, {
                ...existing,
                due_date: suggestion.due_date,
                label: suggestion.label,
                note: suggestion.note,
              });
            }
          }

          for (const row of upsertedRows) {
            byType.set(row.type, row);
          }

          return Array.from(byType.values()).sort((left, right) => left.due_date.localeCompare(right.due_date));
        },
      );

      toast.success('Suggested deadlines applied.');
      queryClient.invalidateQueries({ queryKey: ['contract-dates', contract?.id, currentWorkspaceId] });
      queryClient.invalidateQueries({ queryKey: ['contracts-dashboard', user?.id, currentWorkspaceId] });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
    },
  });

  const applySuggestionsToForm = () => {
    if (!extractionSuggestion) return;
    let appliedAtLeastOne = false;
    const nextValues = { ...formValues };

    if (extractionSuggestion.contract_title && extractionSuggestion.contract_title !== nextValues.title) {
      nextValues.title = extractionSuggestion.contract_title;
      appliedAtLeastOne = true;
    }
    if (extractionSuggestion.counterparty && extractionSuggestion.counterparty !== nextValues.counterparty) {
      nextValues.counterparty = extractionSuggestion.counterparty;
      appliedAtLeastOne = true;
    }
    if (extractionSuggestion.start_date && extractionSuggestion.start_date !== nextValues.startDate) {
      nextValues.startDate = extractionSuggestion.start_date;
      appliedAtLeastOne = true;
    }
    if (extractionSuggestion.end_date && extractionSuggestion.end_date !== nextValues.endDate) {
      nextValues.endDate = extractionSuggestion.end_date;
      appliedAtLeastOne = true;
    }

    if (!appliedAtLeastOne) {
      toast.success('Your form already matches the available AI suggestions.');
      return;
    }

    setFormValues(nextValues);
    setAiSuggestionsApplied(true);
    toast.success('AI suggestions applied. Review the fields, then click Save Changes.');
  };

  const handleDeleteDeadline = (deadlineId: string) => {
    setDeletingDeadlineId(deadlineId);
    deleteDeadline.mutate(deadlineId, {
      onSettled: () => setDeletingDeadlineId(null),
    });
  };

  const jumpToReviewTarget = (field: SupportedExtractionField) => {
    const targetId = REVIEW_TARGET_ID_BY_FIELD[field];
    const element = document.getElementById(targetId);
    setActiveReviewField(field);
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (element instanceof HTMLInputElement) {
      element.focus({ preventScroll: true });
    }
  };

  const handleDownload = async (storagePath: string, fileName: string) => {
    const { data, error } = await supabase.storage.from('contract-documents').download(storagePath);
    if (error) { toast.error('Download failed'); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
  };

  const currentDeadlineByType = useMemo(() => {
    const next = { renewal: null, notice: null, payment: null } as Record<'renewal' | 'notice' | 'payment', string | null>;
    for (const date of dates) {
      if ((date.type === 'renewal' || date.type === 'notice' || date.type === 'payment') && !next[date.type]) {
        next[date.type] = date.due_date;
      }
    }
    return next;
  }, [dates]);

  if (!isResolved || contractLoading) {
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

  const formatDateValue = (value: string | null) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  };

  const formatExtractionFieldValue = (field: SupportedExtractionField, value: string | null) => {
    if (field.endsWith('_date')) {
      return formatDateValue(value);
    }
    return formatSuggestionValue(value);
  };

  const canSaveChanges = hasUnsavedChanges && formValues.title.trim().length > 0 && !updateContract.isPending;
  const isFormReadyForContract = loadedContractId === contract.id;
  const visibleFormValues = isFormReadyForContract
    ? formValues
    : {
      title: contract.title,
      counterparty: contract.counterparty ?? '',
      startDate: contract.start_date ?? '',
      endDate: contract.end_date ?? '',
    };

  const isFieldMissingForValues = (
    field: SupportedExtractionField,
    values: ContractFormValues,
    deadlines: Record<'renewal' | 'notice' | 'payment', string | null>,
  ) => {
    if (field === 'contract_title') return !values.title.trim();
    if (field === 'counterparty') return !values.counterparty.trim();
    if (field === 'start_date') return !values.startDate;
    if (field === 'end_date') return !values.endDate;
    if (field === 'renewal_date') return !deadlines.renewal;
    if (field === 'notice_date') return !deadlines.notice;
    if (field === 'payment_date') return !deadlines.payment;
    return false;
  };

  const isFieldMissingNow = (field: SupportedExtractionField) => {
    return isFieldMissingForValues(field, visibleFormValues, currentDeadlineByType);
  };

  const missingFields = extractionMissingFields.filter(isFieldMissingNow);
  const needsReview = Boolean(extraction?.needs_review || missingFields.length > 0);
  const missingFieldSet = new Set(missingFields);

  const missingFormFields = new Set<keyof ContractFormValues>();
  if (missingFieldSet.has('contract_title')) missingFormFields.add('title');
  if (missingFieldSet.has('counterparty')) missingFormFields.add('counterparty');
  if (missingFieldSet.has('start_date')) missingFormFields.add('startDate');
  if (missingFieldSet.has('end_date')) missingFormFields.add('endDate');

  const missingDeadlineFields = missingFields.filter((field) => DEADLINE_REVIEW_FIELDS.includes(field));
  const isDeadlineTargetActive = activeReviewField ? DEADLINE_REVIEW_FIELDS.includes(activeReviewField) : false;

  const extractionFieldRows = EXTRACTION_FIELDS_IN_ORDER.map((field) => {
    let currentValue: string | null = null;
    if (field === 'contract_title') currentValue = visibleFormValues.title || null;
    if (field === 'counterparty') currentValue = visibleFormValues.counterparty || null;
    if (field === 'start_date') currentValue = visibleFormValues.startDate || null;
    if (field === 'end_date') currentValue = visibleFormValues.endDate || null;
    if (field === 'renewal_date') currentValue = currentDeadlineByType.renewal;
    if (field === 'notice_date') currentValue = currentDeadlineByType.notice;

    return {
      field,
      suggestedValue: extractionSuggestion?.[field] ?? null,
      currentValue,
      missing: missingFieldSet.has(field),
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Link to="/app" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{visibleFormValues.title || contract.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{visibleFormValues.counterparty || 'No counterparty added'}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={contract.status} />
            {needsReview && (
              <Badge variant="outline" className="border-destructive/30 bg-destructive/5 text-foreground">
                Needs Review
              </Badge>
            )}
            {hasUnsavedChanges && (
              <Badge variant="outline" className="text-foreground">
                Unsaved Changes
              </Badge>
            )}
          </div>
        </div>
      </div>

      {missingFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Missing Fields</CardTitle>
            <CardDescription>Review these required fields and save changes after confirming values.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {missingFields.map((field) => (
              <div key={field} className="flex items-center justify-between rounded-md border bg-muted/40 p-3">
                <p className="text-sm">
                  <span className="font-medium">{EXTRACTION_FIELD_LABELS[field]}</span> missing
                </p>
                <Button variant="outline" size="sm" onClick={() => jumpToReviewTarget(field)}>
                  {DEADLINE_REVIEW_FIELDS.includes(field) ? 'Go to Deadlines' : 'Go to Field'}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card id="contract-information-section">
        <CardHeader>
          <CardTitle className="text-base">Contract Information</CardTitle>
          <CardDescription>Review core contract details and save intentionally after confirming edits.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {aiSuggestionsApplied && (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              AI suggestions were applied to the form. Review the fields below, then click Save Changes.
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="contract-title-input" className="flex items-center gap-2">
              Title
              {missingFormFields.has('title') && !visibleFormValues.title && (
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">Needs confirmation</Badge>
              )}
            </Label>
            <Input
              id="contract-title-input"
              value={visibleFormValues.title}
              onChange={(e) => updateFormField('title', e.target.value)}
              disabled={updateContract.isPending}
              className={cn(
                missingFormFields.has('title') && !visibleFormValues.title && 'border-destructive/40 bg-destructive/5',
                activeReviewField === 'contract_title' && 'ring-2 ring-destructive/30 ring-offset-1',
              )}
            />
            {missingFormFields.has('title') && !visibleFormValues.title ? (
              <p className="text-xs text-destructive/90">Needs confirmation</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="contract-counterparty-input" className="flex items-center gap-2">
              Counterparty
              {missingFormFields.has('counterparty') && !visibleFormValues.counterparty && (
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">Needs confirmation</Badge>
              )}
            </Label>
            <Input
              id="contract-counterparty-input"
              value={visibleFormValues.counterparty}
              onChange={(e) => updateFormField('counterparty', e.target.value)}
              placeholder="e.g., Acme Corp"
              disabled={updateContract.isPending}
              className={cn(
                missingFormFields.has('counterparty') && !visibleFormValues.counterparty && 'border-destructive/40 bg-destructive/5',
                activeReviewField === 'counterparty' && 'ring-2 ring-destructive/30 ring-offset-1',
              )}
            />
            {missingFormFields.has('counterparty') && !visibleFormValues.counterparty ? (
              <p className="text-xs text-destructive/90">Needs confirmation</p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contract-start-date-input" className="flex items-center gap-2">
                Start Date
                {missingFormFields.has('startDate') && !visibleFormValues.startDate && (
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wide">Needs confirmation</Badge>
                )}
              </Label>
              <Input
                id="contract-start-date-input"
                type="date"
                value={visibleFormValues.startDate}
                onChange={(e) => updateFormField('startDate', e.target.value)}
                disabled={updateContract.isPending}
                className={cn(
                  missingFormFields.has('startDate') && !visibleFormValues.startDate && 'border-destructive/40 bg-destructive/5',
                  activeReviewField === 'start_date' && 'ring-2 ring-destructive/30 ring-offset-1',
                )}
              />
              {missingFormFields.has('startDate') && !visibleFormValues.startDate ? (
                <p className="text-xs text-destructive/90">Needs confirmation</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract-end-date-input" className="flex items-center gap-2">
                End Date
                {missingFormFields.has('endDate') && !visibleFormValues.endDate && (
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wide">Needs confirmation</Badge>
                )}
              </Label>
              <Input
                id="contract-end-date-input"
                type="date"
                value={visibleFormValues.endDate}
                onChange={(e) => updateFormField('endDate', e.target.value)}
                disabled={updateContract.isPending}
                className={cn(
                  missingFormFields.has('endDate') && !visibleFormValues.endDate && 'border-destructive/40 bg-destructive/5',
                  activeReviewField === 'end_date' && 'ring-2 ring-destructive/30 ring-offset-1',
                )}
              />
              {missingFormFields.has('endDate') && !visibleFormValues.endDate ? (
                <p className="text-xs text-destructive/90">Needs confirmation</p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {hasUnsavedChanges ? 'You have unsaved edits.' : 'All contract information is saved.'}
            </p>
            <Button onClick={() => updateContract.mutate(formValues)} disabled={!canSaveChanges}>
              {updateContract.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card
        id="important-dates-section"
        className={cn(isDeadlineTargetActive && 'border-destructive/30')}
      >
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Important Dates / Deadlines</CardTitle>
            <CardDescription>Track renewal, notice, payment, and custom deadlines.</CardDescription>
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2"><Plus className="h-3 w-3" /> Add Deadline</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Deadline</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newDeadline.type} onValueChange={(v) => setNewDeadline((d) => ({ ...d, type: v }))}>
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
                  <Input type="date" value={newDeadline.due_date} onChange={(e) => setNewDeadline((d) => ({ ...d, due_date: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input placeholder="e.g., Annual renewal" value={newDeadline.label} onChange={(e) => setNewDeadline((d) => ({ ...d, label: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Note</Label>
                  <Input placeholder="Optional note" value={newDeadline.note} onChange={(e) => setNewDeadline((d) => ({ ...d, note: e.target.value }))} />
                </div>
                <Button className="w-full" onClick={() => addDeadline.mutate()} disabled={!newDeadline.due_date || addDeadline.isPending}>
                  {addDeadline.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Deadline
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {missingDeadlineFields.length > 0 ? (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-muted-foreground">
              Missing deadline fields: {missingDeadlineFields.map((field) => EXTRACTION_FIELD_LABELS[field]).join(', ')}.
              Add or confirm these dates before saving.
            </div>
          ) : null}
          {datesLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : dates.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center border bg-muted">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No deadlines added yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Use Add Deadline to capture important contract dates.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dates.map((date) => (
                <div key={date.id} className="flex items-start justify-between rounded-md border bg-muted/40 p-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Badge className={`normal-case text-xs tracking-normal ${typeColors[date.type] || ''}`}>
                        {DEADLINE_TYPE_LABELS[date.type] || date.type}
                      </Badge>
                      <p className="text-sm font-medium">{date.label || `${DEADLINE_TYPE_LABELS[date.type] || 'Custom'} deadline`}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDateValue(date.due_date)}</p>
                    {date.note ? <p className="text-xs text-muted-foreground">{date.note}</p> : null}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDeleteDeadline(date.id)}
                    disabled={deleteDeadline.isPending}
                  >
                    {deleteDeadline.isPending && deletingDeadlineId === date.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
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
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">AI Extraction Review</CardTitle>
            {needsReview ? <Badge variant="outline" className="border-destructive/30 bg-destructive/5 text-foreground">Needs Review</Badge> : null}
          </div>
          <CardDescription>Compare extracted values with current contract details before saving.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {extractionLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : !extraction ? (
            <p className="text-sm text-muted-foreground">
              No extraction run yet. Run extraction from the latest uploaded file to populate suggestions.
            </p>
          ) : (
            <>
              {extraction.status === 'processing' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Extracting fields from the contract...
                </div>
              )}

              {extraction.status === 'failed' && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
                    <div>
                      <p className="text-sm font-medium">Extraction failed</p>
                      <p className="text-xs text-muted-foreground">
                        {extraction.error || 'You can continue manually or re-run extraction.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {missingFields.length > 0 && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-sm font-medium">Manual confirmation recommended</p>
                  <p className="mt-1 text-xs text-muted-foreground">Missing or uncertain fields:</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {missingFields.map((field) => (
                      <Badge key={field} variant="outline" className="text-xs">
                        {EXTRACTION_FIELD_LABELS[field]}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {extractionSuggestion ? (
                <div className="space-y-3">
                  {extractionFieldRows.map((row) => (
                    <div
                      key={row.field}
                      className={cn(
                        'grid gap-3 rounded-md border p-3 md:grid-cols-[180px_1fr_1fr]',
                        row.missing && 'border-destructive/30 bg-destructive/5',
                      )}
                    >
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">{EXTRACTION_FIELD_LABELS[row.field]}</p>
                        {row.missing ? <Badge variant="outline" className="text-[10px] uppercase tracking-wide">Missing</Badge> : null}
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Suggested</p>
                        <p className="text-sm font-medium">{formatExtractionFieldValue(row.field, row.suggestedValue)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Current</p>
                        <p className="text-sm">{formatExtractionFieldValue(row.field, row.currentValue)}</p>
                      </div>
                    </div>
                  ))}
                  {extractionSuggestion.notes ? (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Extraction Notes</p>
                      <p className="text-sm">{extractionSuggestion.notes}</p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No structured suggestions were returned from this extraction run.</p>
              )}
            </>
          )}

          <div className="space-y-2 border-t pt-4">
            <div className="flex flex-wrap gap-2">
              <Button
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
                {addSuggestedDeadlines.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Apply Suggested Deadlines
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => startExtraction.mutate()}
                disabled={startExtraction.isPending || files.length === 0 || !currentWorkspaceId}
              >
                {startExtraction.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {extraction ? 'Re-run Extraction' : 'Run Extraction'}
              </Button>
            </div>
            {!suggestedDeadlines.length ? (
              <p className="text-xs text-muted-foreground">
                No deadline suggestions available from this extraction run.
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Apply AI Suggestions updates the form only. Apply Suggested Deadlines updates deadline rows immediately.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Files</CardTitle>
        </CardHeader>
        <CardContent>
          {filesLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : files.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No files uploaded.</p>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <div key={file.id} className="flex items-center justify-between rounded-md border bg-muted/40 p-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{file.file_name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size_bytes)} • {new Date(file.created_at).toLocaleDateString()}</p>
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
        <CardHeader><CardTitle className="text-base">Reminder History</CardTitle></CardHeader>
        <CardContent>
          {notificationsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No reminders have been sent yet.</p>
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
                      <TableCell className="text-sm text-destructive">{notification.status === 'failed' ? (notification.error || '—') : '—'}</TableCell>
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
