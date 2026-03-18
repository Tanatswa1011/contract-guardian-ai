import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  Loader2,
  X,
  CalendarClock,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  generateSuggestedDeadlines,
  type SuggestedDeadline,
} from '@/lib/contractDeadlineSuggestions';
import {
  parseExtractionSuggestion,
  SUPPORTED_EXTRACTION_FIELDS,
  type ExtractionSuggestion,
  type SupportedExtractionField,
} from '@/lib/extraction';

type UploadState = 'idle' | 'selected' | 'uploading' | 'extracting' | 'preview' | 'saved' | 'failed';

type PreviewContractValues = {
  title: string;
  counterparty: string;
  startDate: string;
  endDate: string;
};

type ExtractionPreviewState = {
  contractId: string;
  extractionRunId: string | null;
  extractionStatus: 'completed' | 'failed';
  extractionError: string | null;
  extraction: ExtractionSuggestion | null;
  contractValues: PreviewContractValues;
  suggestedDeadlines: SuggestedDeadline[];
  missingFields: SupportedExtractionField[];
  needsReview: boolean;
  fileName: string;
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

const DATE_TYPE_LABELS: Record<SuggestedDeadline['date_type'], string> = {
  end: 'End',
  renewal: 'Renewal',
  notice: 'Notice',
};

export default function UploadPage() {
  const [state, setState] = useState<UploadState>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [previewData, setPreviewData] = useState<ExtractionPreviewState | null>(null);
  const [applySuggestedDeadlinesOnSave, setApplySuggestedDeadlinesOnSave] = useState(true);
  const [isSavingPreview, setIsSavingPreview] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentWorkspaceId } = useWorkspace();
  const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Upload failed');

  const resetUploadFlow = () => {
    setState('idle');
    setFile(null);
    setTitle('');
    setCounterparty('');
    setPreviewData(null);
    setApplySuggestedDeadlinesOnSave(true);
    setIsSavingPreview(false);
  };

  const getExtractionMissingFields = (
    extraction: ExtractionSuggestion | null,
    extractionRun: { missing_fields?: unknown } | null,
  ) => {
    if (extraction?.missing_fields.length) {
      return extraction.missing_fields;
    }

    if (!Array.isArray(extractionRun?.missing_fields)) {
      return [] as SupportedExtractionField[];
    }

    return extractionRun.missing_fields.filter(
      (field): field is SupportedExtractionField =>
        typeof field === 'string' && SUPPORTED_EXTRACTION_FIELDS.includes(field as SupportedExtractionField),
    );
  };

  const loadLatestExtractionRun = async (contractId: string) => {
    const { data, error } = await supabase
      .from('extraction_runs')
      .select('id, status, error, raw_json, missing_fields, needs_review')
      .eq('contract_id', contractId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  };

  const buildPreviewState = ({
    contractId,
    fileName,
    extractionRun,
    fallbackError,
  }: {
    contractId: string;
    fileName: string;
    extractionRun: Awaited<ReturnType<typeof loadLatestExtractionRun>> | null;
    fallbackError: string | null;
  }): ExtractionPreviewState => {
    const extraction = parseExtractionSuggestion(extractionRun?.raw_json ?? null);
    const missingFields = getExtractionMissingFields(extraction, extractionRun);
    const extractionStatus = extractionRun?.status === 'completed' ? 'completed' : 'failed';
    const suggestedDeadlines = generateSuggestedDeadlines(extraction);

    return {
      contractId,
      extractionRunId: extractionRun?.id ?? null,
      extractionStatus,
      extractionError: extractionRun?.error ?? fallbackError,
      extraction,
      contractValues: {
        title: extraction?.contract_title ?? title.trim(),
        counterparty: extraction?.counterparty ?? counterparty.trim(),
        startDate: extraction?.start_date ?? '',
        endDate: extraction?.end_date ?? '',
      },
      suggestedDeadlines,
      missingFields,
      needsReview: extractionStatus === 'failed'
        || Boolean(extractionRun?.needs_review)
        || missingFields.length > 0,
      fileName,
    };
  };

  const isFieldMissingAfterPreviewSave = (
    field: SupportedExtractionField,
    contractValues: PreviewContractValues,
    appliedDeadlineTypes: Record<'renewal' | 'notice' | 'payment', boolean>,
  ) => {
    if (field === 'contract_title') return !contractValues.title.trim();
    if (field === 'counterparty') return !contractValues.counterparty.trim();
    if (field === 'start_date') return !contractValues.startDate;
    if (field === 'end_date') return !contractValues.endDate;
    if (field === 'renewal_date') return !appliedDeadlineTypes.renewal;
    if (field === 'notice_date') return !appliedDeadlineTypes.notice;
    if (field === 'payment_date') return !appliedDeadlineTypes.payment;
    return false;
  };

  const formatDateValue = (value: string | null) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  };

  const handlePreviewSave = async () => {
    if (!previewData) return;

    setIsSavingPreview(true);

    try {
      const contractUpdate = {
        title: previewData.contractValues.title.trim(),
        counterparty: previewData.contractValues.counterparty.trim() || null,
        start_date: previewData.contractValues.startDate || null,
        end_date: previewData.contractValues.endDate || null,
      };

      const { error: contractError } = await supabase
        .from('contracts')
        .update(contractUpdate)
        .eq('id', previewData.contractId);

      if (contractError) throw contractError;

      let insertedDeadlineTypes = {
        renewal: false,
        notice: false,
        payment: false,
      };

      if (applySuggestedDeadlinesOnSave && previewData.suggestedDeadlines.length > 0) {
        console.log('Extraction preview generated suggested deadlines', {
          contract_id: previewData.contractId,
          workspace_id: currentWorkspaceId,
          extracted_dates: {
            end_date: previewData.extraction?.end_date,
            renewal_date: previewData.extraction?.renewal_date,
            notice_date: previewData.extraction?.notice_date,
          },
          suggested_deadlines: previewData.suggestedDeadlines,
        });

        const deadlineInserts = previewData.suggestedDeadlines.map((suggestion) => ({
          contract_id: previewData.contractId,
          type: suggestion.date_type,
          due_date: suggestion.due_date,
          label: suggestion.label,
          note: suggestion.note,
        }));

        const { data, error: deadlineError } = await supabase
          .from('contract_dates')
          .insert(deadlineInserts)
          .select('id, type, due_date, label, note');

        console.log('Extraction preview deadline insert result', {
          contract_id: previewData.contractId,
          workspace_id: currentWorkspaceId,
          inserted_rows: data,
          error: deadlineError?.message ?? null,
        });

        if (deadlineError) {
          console.error('Extraction preview deadline insert failed', deadlineError);
          throw deadlineError;
        }

        insertedDeadlineTypes = {
          renewal: previewData.suggestedDeadlines.some((suggestion) => suggestion.date_type === 'renewal'),
          notice: previewData.suggestedDeadlines.some((suggestion) => suggestion.date_type === 'notice'),
          payment: false,
        };
      }

      if (previewData.extractionRunId) {
        const unresolvedFields = previewData.missingFields.filter((field) => (
          isFieldMissingAfterPreviewSave(field, previewData.contractValues, insertedDeadlineTypes)
        ));

        const { error: extractionUpdateError } = await supabase
          .from('extraction_runs')
          .update({
            missing_fields: unresolvedFields,
            needs_review: unresolvedFields.length > 0,
          })
          .eq('id', previewData.extractionRunId);

        if (extractionUpdateError) {
          console.error('Failed to refresh extraction review state after preview save', extractionUpdateError);
          toast.error('Contract saved, but extraction review status could not be refreshed.');
        }
      }

      queryClient.invalidateQueries({ queryKey: ['contract', previewData.contractId, user?.id, currentWorkspaceId] });
      queryClient.invalidateQueries({ queryKey: ['contract-dates', previewData.contractId, currentWorkspaceId] });
      queryClient.invalidateQueries({ queryKey: ['extraction', previewData.contractId, currentWorkspaceId] });
      queryClient.invalidateQueries({ queryKey: ['contracts-dashboard'] });

      setState('saved');
      toast.success('Contract saved successfully.');
    } catch (error: unknown) {
      console.error('Extraction preview save failed', error);
      toast.error(getErrorMessage(error));
    } finally {
      setIsSavingPreview(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type === 'application/pdf' && f.size <= 20 * 1024 * 1024) {
      setFile(f);
      setState('selected');
      if (!title) setTitle(f.name.replace('.pdf', ''));
    } else if (f) {
      toast.error('Please upload a PDF smaller than 20MB.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (f.type !== 'application/pdf' || f.size > 20 * 1024 * 1024) {
        toast.error('Please upload a PDF smaller than 20MB.');
        return;
      }
      setFile(f);
      setState('selected');
      if (!title) setTitle(f.name.replace('.pdf', ''));
    }
  };

  const handleUpload = async () => {
    if (!file || !user || !title || !currentWorkspaceId) return;
    setState('uploading');

    try {
      // 1. Create contract record
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert({
          title,
          counterparty: counterparty || null,
          user_id: user.id,
          workspace_id: currentWorkspaceId,
        })
        .select()
        .single();

      if (contractError) throw contractError;

      // 2. Upload file to storage
      const filePath = `${user.id}/${contract.id}/${file.name}`;
      const { error: storageError } = await supabase.storage
        .from('contract-documents')
        .upload(filePath, file, { contentType: 'application/pdf' });

      if (storageError) throw storageError;

      // 3. Create contract_files record
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

      setState('extracting');

      const { error: extractionError } = await supabase.functions.invoke('extract-contract-fields', {
        body: {
          contractId: contract.id,
          filePath,
        },
      });

      const latestExtractionRun = await loadLatestExtractionRun(contract.id);
      const previewState = buildPreviewState({
        contractId: contract.id,
        fileName: file.name,
        extractionRun: latestExtractionRun,
        fallbackError: extractionError ? getErrorMessage(extractionError) : null,
      });

      console.log('Extraction preview prepared', {
        contract_id: contract.id,
        workspace_id: currentWorkspaceId,
        extraction_status: previewState.extractionStatus,
        missing_fields: previewState.missingFields,
        suggested_deadlines: previewState.suggestedDeadlines,
      });

      setPreviewData(previewState);
      setApplySuggestedDeadlinesOnSave(previewState.suggestedDeadlines.length > 0);
      setState('preview');

      if (extractionError || previewState.extractionStatus === 'failed') {
        toast.error('Contract uploaded, but AI extraction failed. You can continue manually.');
      } else {
        toast.success('Extraction complete. Review the preview before saving.');
      }
    } catch (err: unknown) {
      console.error('Upload error:', err);
      setState('failed');
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload Contract</h1>
        <p className="text-muted-foreground text-sm">Upload a PDF contract to start tracking deadlines.</p>
      </div>

      {state === 'idle' && (
        <Card
          className="cursor-pointer border-2 border-dashed transition-colors hover:border-foreground/40"
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
        >
          <CardContent className="py-16 text-center">
            <label className="cursor-pointer">
              <input type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border bg-muted">
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="font-medium mb-1">Drag & drop your PDF here</p>
              <p className="text-sm text-muted-foreground">or click to browse • Max 20MB</p>
            </label>
          </CardContent>
        </Card>
      )}

      {state === 'selected' && file && (
        <Card>
          <CardContent className="py-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center border bg-muted">
                <FileText className="h-5 w-5 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
              <Button variant="ghost" size="icon" onClick={resetUploadFlow}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Contract Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Office Lease Agreement" required />
            </div>
            <div className="space-y-2">
              <Label>Counterparty (optional)</Label>
              <Input value={counterparty} onChange={e => setCounterparty(e.target.value)} placeholder="e.g., Acme Corp" />
            </div>
            <Button onClick={handleUpload} className="w-full gap-2" disabled={!title || !currentWorkspaceId}>
              <Upload className="h-4 w-4" /> Upload & Run Extraction
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
            <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-4" />
            <p className="font-medium text-sm">Uploading contract...</p>
          </CardContent>
        </Card>
      )}

      {state === 'extracting' && (
        <Card>
          <CardContent className="py-8 text-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-4" />
            <p className="font-medium text-sm">Running AI extraction...</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Preparing a preview so you can save without opening the full editor first.
            </p>
          </CardContent>
        </Card>
      )}

      {state === 'preview' && previewData && (
        <Card>
          <CardContent className="py-6 space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold">Extraction Preview</h3>
                  {previewData.needsReview ? (
                    <Badge variant="outline" className="border-destructive/30 bg-destructive/5 text-foreground">
                      Needs Review
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="normal-case tracking-normal">
                      Ready to Save
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Review the extracted values, then save the contract or open the full editor.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">{previewData.fileName}</p>
            </div>

            {previewData.extractionStatus === 'failed' ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
                  <div>
                    <p className="text-sm font-medium">Extraction failed</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {previewData.extractionError || 'You can continue manually from the contract detail page.'}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Contract Title</p>
                <p className="mt-1 text-sm font-medium">{previewData.contractValues.title || '—'}</p>
              </div>
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Counterparty</p>
                <p className="mt-1 text-sm font-medium">{previewData.contractValues.counterparty || '—'}</p>
              </div>
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Start Date</p>
                <p className="mt-1 text-sm font-medium">{formatDateValue(previewData.contractValues.startDate || null)}</p>
              </div>
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">End Date</p>
                <p className="mt-1 text-sm font-medium">{formatDateValue(previewData.contractValues.endDate || null)}</p>
              </div>
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Renewal Date</p>
                <p className="mt-1 text-sm font-medium">{formatDateValue(previewData.extraction?.renewal_date ?? null)}</p>
              </div>
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Notice Date</p>
                <p className="mt-1 text-sm font-medium">{formatDateValue(previewData.extraction?.notice_date ?? null)}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Suggested Deadlines</p>
              </div>

              {previewData.suggestedDeadlines.length > 0 ? (
                <div className="space-y-2">
                  {previewData.suggestedDeadlines.map((suggestion) => (
                    <div
                      key={`${suggestion.date_type}-${suggestion.offset_value}-${suggestion.due_date}`}
                      className="flex items-start justify-between rounded-md border bg-muted/30 p-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="normal-case tracking-normal">
                            {DATE_TYPE_LABELS[suggestion.date_type]}
                          </Badge>
                          <p className="text-sm font-medium">{suggestion.label}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDateValue(suggestion.due_date)}</p>
                        <p className="text-xs text-muted-foreground">{suggestion.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No suggested deadlines were generated from the extracted dates.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">Missing Fields</p>
                {previewData.missingFields.length > 0 ? (
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                    Review Recommended
                  </Badge>
                ) : null}
              </div>

              {previewData.missingFields.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {previewData.missingFields.map((field) => (
                    <Badge key={field} variant="outline" className="text-xs">
                      {EXTRACTION_FIELD_LABELS[field]}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No missing fields were reported by the extraction run.
                </p>
              )}
            </div>

            {previewData.suggestedDeadlines.length > 0 && previewData.extractionStatus === 'completed' ? (
              <label className="flex items-start gap-3 rounded-md border bg-muted/20 p-3">
                <Checkbox
                  checked={applySuggestedDeadlinesOnSave}
                  onCheckedChange={(checked) => setApplySuggestedDeadlinesOnSave(checked === true)}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Apply suggested deadlines on save</p>
                  <p className="text-xs text-muted-foreground">
                    This creates deadline records for the current workspace contract without opening the editor.
                  </p>
                </div>
              </label>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={resetUploadFlow}>
                Upload Another
              </Button>
              <Button variant="outline" onClick={() => navigate(`/app/contracts/${previewData.contractId}`)}>
                Review & Edit
              </Button>
              {previewData.extractionStatus === 'completed' ? (
                <Button onClick={handlePreviewSave} disabled={isSavingPreview}>
                  {isSavingPreview ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Contract
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      {state === 'saved' && previewData && (
        <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-foreground" />
            <h3 className="font-semibold text-lg mb-1">Contract Saved</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The extracted contract data has been saved{applySuggestedDeadlinesOnSave && previewData.suggestedDeadlines.length > 0 ? ' with suggested deadlines applied.' : '.'}
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate(`/app/contracts/${previewData.contractId}`)}>View Contract</Button>
              <Button variant="outline" onClick={resetUploadFlow}>Upload Another</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {state === 'failed' && (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1">Upload Failed</h3>
            <p className="text-sm text-muted-foreground mb-4">Something went wrong. Please try again.</p>
            <Button onClick={() => setState(file ? 'selected' : 'idle')}>Try Again</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
