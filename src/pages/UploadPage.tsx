import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { parseExtractionSuggestion, type SupportedExtractionField } from '@/lib/extraction';
import { generateSuggestedDeadlines } from '@/lib/deadlineSuggestions';
import { getErrorMessage } from '@/lib/supabaseError';
import { toast } from 'sonner';

type UploadState = 'idle' | 'selected' | 'uploading' | 'uploaded' | 'extracting' | 'preview' | 'saved' | 'failed';

type ExtractionRunPreview = {
  id: string;
  status: string;
  raw_json: Json;
  missing_fields: string[];
  needs_review: boolean;
  error: string | null;
};

const EXTRACTION_FIELD_LABELS: Record<SupportedExtractionField, string> = {
  contract_title: 'Contract Title',
  counterparty: 'Counterparty',
  start_date: 'Start Date',
  end_date: 'End Date',
  renewal_date: 'Renewal Date',
  notice_date: 'Notice Date',
  payment_date: 'Payment Date',
};

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

function formatDateValue(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function validatePdfFile(file: File): string | null {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) {
    return 'Please upload a PDF contract.';
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'PDF must be 20MB or smaller.';
  }

  return null;
}

export default function UploadPage() {
  const [state, setState] = useState<UploadState>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [contractId, setContractId] = useState<string | null>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [latestExtractionRunId, setLatestExtractionRunId] = useState<string | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [extractionMissingFields, setExtractionMissingFields] = useState<SupportedExtractionField[]>([]);
  const [extractionNeedsReview, setExtractionNeedsReview] = useState(false);
  const [extractionSuggestionRaw, setExtractionSuggestionRaw] = useState<Json | null>(null);
  const [saveWithSuggestedDeadlines, setSaveWithSuggestedDeadlines] = useState(true);
  const [savePending, setSavePending] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspaceId } = useWorkspace();

  const extractionSuggestion = useMemo(
    () => (extractionSuggestionRaw ? parseExtractionSuggestion(extractionSuggestionRaw) : null),
    [extractionSuggestionRaw],
  );

  const suggestedDeadlines = useMemo(() => {
    if (!extractionSuggestion) {
      return [];
    }

    return generateSuggestedDeadlines({
      start_date: extractionSuggestion.start_date,
      end_date: extractionSuggestion.end_date,
      notice_date: extractionSuggestion.notice_date,
      payment_date: extractionSuggestion.payment_date,
      notice_period_days: extractionSuggestion.notice_period_days,
      payment_terms_days: extractionSuggestion.payment_terms_days,
      computed_deadlines: extractionSuggestion.computed_deadlines,
    });
  }, [extractionSuggestion]);

  const resetUploadFlow = () => {
    setState('idle');
    setFile(null);
    setTitle('');
    setCounterparty('');
    setContractId(null);
    setUploadedFilePath(null);
    setLatestExtractionRunId(null);
    setExtractionError(null);
    setExtractionMissingFields([]);
    setExtractionNeedsReview(false);
    setExtractionSuggestionRaw(null);
    setSaveWithSuggestedDeadlines(true);
    setSavePending(false);
  };

  const selectFile = (nextFile: File | null) => {
    if (!nextFile) {
      return;
    }

    const validationError = validatePdfFile(nextFile);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setFile(nextFile);
    setContractId(null);
    setUploadedFilePath(null);
    setLatestExtractionRunId(null);
    setExtractionError(null);
    setExtractionMissingFields([]);
    setExtractionNeedsReview(false);
    setExtractionSuggestionRaw(null);
    setSaveWithSuggestedDeadlines(true);
    setSavePending(false);
    setState('selected');
    if (!title) {
      setTitle(nextFile.name.replace(/\.pdf$/i, ''));
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    selectFile(event.dataTransfer.files[0] ?? null);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    selectFile(event.target.files?.[0] ?? null);
    event.target.value = '';
  };

  const cleanupFailedUpload = async (createdContractId: string | null, filePath: string | null) => {
    const cleanups: Array<Promise<unknown>> = [];

    if (filePath) {
      cleanups.push(
        supabase.storage
          .from('contract-documents')
          .remove([filePath]),
      );
    }

    if (createdContractId && currentWorkspaceId) {
      cleanups.push(
        supabase
          .from('contract_files')
          .delete()
          .eq('contract_id', createdContractId),
      );
      cleanups.push(
        supabase
          .from('contracts')
          .delete()
          .eq('id', createdContractId)
          .eq('workspace_id', currentWorkspaceId),
      );
    }

    if (cleanups.length > 0) {
      await Promise.allSettled(cleanups);
    }
  };

  const readLatestExtractionRun = async (activeContractId: string): Promise<ExtractionRunPreview | null> => {
    const { data, error } = await supabase
      .from('extraction_runs')
      .select('id, status, raw_json, missing_fields, needs_review, error')
      .eq('contract_id', activeContractId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  };

  const handleUpload = async () => {
    if (!file || !user || !title.trim() || !currentWorkspaceId) {
      toast.error('Select a workspace and add a contract title before uploading.');
      return;
    }

    setState('uploading');
    setExtractionError(null);

    let createdContractId: string | null = null;
    let filePath: string | null = null;

    try {
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert({
          title: title.trim(),
          counterparty: counterparty.trim() || null,
          user_id: user.id,
          workspace_id: currentWorkspaceId,
        })
        .select('id')
        .single();

      if (contractError) throw contractError;

      createdContractId = contract.id;
      filePath = `${user.id}/${contract.id}/${file.name}`;

      const { error: storageError } = await supabase.storage
        .from('contract-documents')
        .upload(filePath, file, { contentType: 'application/pdf' });

      if (storageError) throw storageError;

      const { error: fileError } = await supabase
        .from('contract_files')
        .insert({
          contract_id: contract.id,
          storage_path: filePath,
          file_name: file.name,
          mime_type: 'application/pdf',
          size_bytes: file.size,
          uploaded_by: user.id,
        });

      if (fileError) throw fileError;

      setContractId(contract.id);
      setUploadedFilePath(filePath);
      setState('uploaded');
      toast.success('Contract uploaded. Run extraction to preview before saving.');
    } catch (error: unknown) {
      console.error('Upload error:', error);
      await cleanupFailedUpload(createdContractId, filePath);
      setState('failed');
      toast.error(getErrorMessage(error, 'Upload failed.'));
    }
  };

  const runExtraction = async () => {
    if (!contractId || !uploadedFilePath) {
      toast.error('Upload a contract before running extraction.');
      return;
    }

    setState('extracting');
    setExtractionError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('extract-contract-fields', {
        body: {
          contractId,
          filePath: uploadedFilePath,
        },
      });

      const responsePayload = data as {
        ok?: boolean;
        error?: string;
        extraction?: Json;
        extraction_run_id?: string;
      } | null;
      const latestRun = await readLatestExtractionRun(contractId);

      if (invokeError || responsePayload?.ok === false) {
        const failedMessage = latestRun?.error
          || responsePayload?.error
          || getErrorMessage(invokeError, 'Extraction failed.');
        setExtractionError(failedMessage);
        if (latestRun?.id) {
          setLatestExtractionRunId(latestRun.id);
        }
        setState('uploaded');
        toast.error(failedMessage);
        return;
      }

      if (!latestRun) {
        throw new Error('No extraction run was created.');
      }

      if (latestRun.status === 'failed') {
        const failedMessage = latestRun.error || 'Extraction failed. Review details manually.';
        setLatestExtractionRunId(latestRun.id);
        setExtractionError(failedMessage);
        setState('uploaded');
        toast.error(failedMessage);
        return;
      }

      const rawSuggestion = latestRun.raw_json ?? responsePayload?.extraction ?? null;
      const parsedSuggestion = parseExtractionSuggestion(rawSuggestion as Json);
      const normalizedMissingFields = (
        parsedSuggestion?.missing_fields
        ?? (Array.isArray(latestRun.missing_fields) ? latestRun.missing_fields : [])
      ).filter((field): field is SupportedExtractionField => typeof field === 'string' && field in EXTRACTION_FIELD_LABELS);

      setLatestExtractionRunId(responsePayload?.extraction_run_id ?? latestRun.id);
      setExtractionSuggestionRaw((rawSuggestion ?? null) as Json | null);
      setExtractionMissingFields(normalizedMissingFields);
      setExtractionNeedsReview(Boolean(latestRun.needs_review || normalizedMissingFields.length > 0));
      setState('preview');
      toast.success('Extraction complete. Review the preview and save when ready.');
    } catch (error: unknown) {
      console.error('Extraction run failed:', error);
      const message = getErrorMessage(error, 'Extraction failed.');
      setExtractionError(message);
      setState('uploaded');
      toast.error(message);
    }
  };

  const saveContract = async () => {
    if (!contractId || !currentWorkspaceId) {
      toast.error('Select a workspace before saving.');
      return;
    }

    setSavePending(true);

    try {
      const { data: scopedContract, error: scopeError } = await supabase
        .from('contracts')
        .select('id')
        .eq('id', contractId)
        .eq('workspace_id', currentWorkspaceId)
        .maybeSingle();

      if (scopeError) throw scopeError;
      if (!scopedContract) {
        throw new Error('Contract is not available in the selected workspace.');
      }

      const contractUpdate: Record<string, string | null> = {};
      if (extractionSuggestion?.contract_title) contractUpdate.title = extractionSuggestion.contract_title;
      if (extractionSuggestion?.counterparty) contractUpdate.counterparty = extractionSuggestion.counterparty;
      if (extractionSuggestion?.start_date) contractUpdate.start_date = extractionSuggestion.start_date;
      if (extractionSuggestion?.end_date) contractUpdate.end_date = extractionSuggestion.end_date;

      if (Object.keys(contractUpdate).length > 0) {
        const { error: updateError } = await supabase
          .from('contracts')
          .update(contractUpdate)
          .eq('id', contractId)
          .eq('workspace_id', currentWorkspaceId);

        if (updateError) throw updateError;
      }

      const { data: existingDates, error: existingDatesError } = await supabase
        .from('contract_dates')
        .select('type')
        .eq('contract_id', contractId);

      if (existingDatesError) throw existingDatesError;

      const existingTypes = new Set((existingDates ?? []).map((date) => date.type));
      const inserts = saveWithSuggestedDeadlines
        ? suggestedDeadlines
            .filter((deadline) => !existingTypes.has(deadline.type))
            .map((deadline) => ({
              contract_id: contractId,
              type: deadline.type,
              due_date: deadline.due_date,
              label: deadline.label,
              note: deadline.note,
            }))
        : [];

      let insertedDeadlines = 0;
      const savedDeadlineTypes = new Set(existingTypes);
      if (inserts.length > 0) {
        const { data: insertedRows, error: insertError } = await supabase
          .from('contract_dates')
          .upsert(inserts, { onConflict: 'contract_id,type', ignoreDuplicates: true })
          .select('type');

        if (insertError) throw insertError;

        insertedDeadlines = insertedRows?.length ?? inserts.length;
        for (const row of insertedRows ?? []) {
          savedDeadlineTypes.add(row.type);
        }
        for (const row of inserts) {
          savedDeadlineTypes.add(row.type);
        }
      }

      if (latestExtractionRunId) {
        const finalTitle = (contractUpdate.title ?? title).trim();
        const finalCounterparty = (contractUpdate.counterparty ?? counterparty).trim();
        const finalStartDate = contractUpdate.start_date ?? extractionSuggestion?.start_date ?? null;
        const finalEndDate = contractUpdate.end_date ?? extractionSuggestion?.end_date ?? null;
        const unresolvedFields = extractionMissingFields.filter((field) => {
          if (field === 'contract_title') return !finalTitle;
          if (field === 'counterparty') return !finalCounterparty;
          if (field === 'start_date') return !finalStartDate;
          if (field === 'end_date') return !finalEndDate;
          if (field === 'renewal_date') return !savedDeadlineTypes.has('renewal');
          if (field === 'notice_date') return !savedDeadlineTypes.has('notice');
          if (field === 'payment_date') return !savedDeadlineTypes.has('payment');
          return false;
        });

        const { error: reviewStatusError } = await supabase
          .from('extraction_runs')
          .update({
            missing_fields: unresolvedFields,
            needs_review: unresolvedFields.length > 0,
          })
          .eq('id', latestExtractionRunId);

        if (reviewStatusError) {
          toast.error('Contract saved, but review status could not be refreshed.');
        }
      }

      toast.success(
        insertedDeadlines > 0
          ? `Contract saved with ${insertedDeadlines} suggested deadline${insertedDeadlines > 1 ? 's' : ''}.`
          : 'Contract saved successfully.',
      );
      setState('saved');
    } catch (error: unknown) {
      console.error('Save contract from preview failed:', error);
      toast.error(getErrorMessage(error, 'Contract save failed.'));
    } finally {
      setSavePending(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload Contract</h1>
        <p className="text-sm text-muted-foreground">Upload a PDF contract to start tracking deadlines.</p>
      </div>

      {state === 'idle' && (
        <Card
          className="cursor-pointer border-2 border-dashed transition-colors hover:border-foreground/40"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <CardContent className="py-16 text-center">
            <label className="cursor-pointer">
              <input type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border bg-muted">
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="mb-1 font-medium">Drag & drop your PDF here</p>
              <p className="text-sm text-muted-foreground">or click to browse • Max 20MB</p>
            </label>
          </CardContent>
        </Card>
      )}

      {state === 'selected' && file && (
        <Card>
          <CardContent className="space-y-4 py-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center border bg-muted">
                <FileText className="h-5 w-5 text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setFile(null);
                  setState('idle');
                  setTitle('');
                  setCounterparty('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Contract Title</Label>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g., Office Lease Agreement"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Counterparty (optional)</Label>
              <Input
                value={counterparty}
                onChange={(event) => setCounterparty(event.target.value)}
                placeholder="e.g., Acme Corp"
              />
            </div>
            <Button onClick={handleUpload} className="w-full gap-2" disabled={!title.trim() || !currentWorkspaceId}>
              <Upload className="h-4 w-4" />
              Upload Contract
            </Button>
            {!currentWorkspaceId ? (
              <p className="text-xs text-muted-foreground">
                Select a workspace before uploading a contract.
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}

      {state === 'uploading' && (
        <Card>
          <CardContent className="py-8 text-center">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Uploading contract...</p>
          </CardContent>
        </Card>
      )}

      {(state === 'uploaded' || state === 'extracting') && contractId && (
        <Card>
          <CardContent className="space-y-4 py-6">
            <div className="text-center">
              {state === 'extracting' ? (
                <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
              ) : (
                <CheckCircle className="mx-auto mb-3 h-10 w-10 text-foreground" />
              )}
              <h3 className="mb-1 text-lg font-semibold">
                {state === 'extracting' ? 'Running extraction...' : 'Contract uploaded'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {state === 'extracting'
                  ? 'Extracting fields from your contract. You can stay on this page while it runs.'
                  : 'Next: run extraction to preview fields before saving.'}
              </p>
            </div>

            {extractionError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">Extraction failed</p>
                <p>{extractionError}</p>
              </div>
            ) : null}

            <div className="flex justify-center">
              <Button onClick={runExtraction} disabled={state === 'extracting' || !uploadedFilePath}>
                {state === 'extracting' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Run Extraction
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {state === 'preview' && contractId && (
        <Card>
          <CardContent className="space-y-5 py-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold">Extraction Preview</h3>
                <p className="text-xs text-muted-foreground">Review extracted fields before saving.</p>
              </div>
              {extractionNeedsReview ? (
                <Badge variant="outline" className="border-destructive/30 bg-destructive/5 text-foreground">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  Needs Review
                </Badge>
              ) : (
                <Badge variant="outline">Looks Good</Badge>
              )}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/40 px-3 py-2">
                <span className="text-muted-foreground">Contract Title</span>
                <span className="font-medium">{extractionSuggestion?.contract_title ?? title}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/40 px-3 py-2">
                <span className="text-muted-foreground">Counterparty</span>
                <span className="font-medium">{(extractionSuggestion?.counterparty ?? counterparty) || '—'}</span>
              </div>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-md border bg-muted/40 px-3 py-2">
                <p className="text-xs text-muted-foreground">Start Date</p>
                <p className="font-medium">{formatDateValue(extractionSuggestion?.start_date)}</p>
              </div>
              <div className="rounded-md border bg-muted/40 px-3 py-2">
                <p className="text-xs text-muted-foreground">End Date</p>
                <p className="font-medium">{formatDateValue(extractionSuggestion?.end_date)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Suggested Deadlines</p>
              {suggestedDeadlines.length === 0 ? (
                <p className="text-xs text-muted-foreground">No suggested deadlines are available yet.</p>
              ) : (
                <div className="space-y-2">
                  {suggestedDeadlines.map((deadline) => (
                    <div
                      key={`${deadline.type}-${deadline.due_date}`}
                      className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
                    >
                      <p className="text-sm text-foreground">{deadline.label}</p>
                      <p>{formatDateValue(deadline.due_date)}</p>
                      {deadline.note ? <p className="mt-1">{deadline.note}</p> : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Missing Fields</p>
              {extractionMissingFields.length === 0 ? (
                <p className="text-xs text-muted-foreground">No missing fields detected.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {extractionMissingFields.map((field) => (
                    <Badge key={field} variant="outline" className="text-xs">
                      {EXTRACTION_FIELD_LABELS[field]}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {suggestedDeadlines.length > 0 ? (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={saveWithSuggestedDeadlines}
                  onCheckedChange={(checked) => setSaveWithSuggestedDeadlines(checked === true)}
                />
                Include suggested deadlines when saving
              </label>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button onClick={saveContract} disabled={savePending}>
                {savePending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Contract
              </Button>
              <Button variant="outline" onClick={() => navigate(`/app/contracts/${contractId}`)} disabled={savePending}>
                Review Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {state === 'saved' && contractId && (
        <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-foreground" />
            <h3 className="mb-1 text-lg font-semibold">Contract Saved</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Your extracted data was saved. You can review and edit later anytime.
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => navigate(`/app/contracts/${contractId}`)}>Review Details</Button>
              <Button variant="outline" onClick={resetUploadFlow}>Upload Another</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {state === 'failed' && (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" />
            <h3 className="mb-1 text-lg font-semibold">Upload Failed</h3>
            <p className="mb-4 text-sm text-muted-foreground">Something went wrong. Please try again.</p>
            <Button onClick={() => setState(file ? 'selected' : 'idle')}>Try Again</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
