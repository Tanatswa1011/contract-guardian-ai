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
import { toast } from 'sonner';

type UploadState = 'idle' | 'selected' | 'uploading' | 'uploaded' | 'extracting' | 'preview' | 'saved' | 'failed';

const EXTRACTION_FIELD_LABELS: Record<SupportedExtractionField, string> = {
  contract_title: 'Contract Title',
  counterparty: 'Counterparty',
  start_date: 'Start Date',
  end_date: 'End Date',
  renewal_date: 'Renewal Date',
  notice_date: 'Notice Date',
};

function formatDateValue(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export default function UploadPage() {
  const [state, setState] = useState<UploadState>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [contractId, setContractId] = useState<string | null>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [extractionMissingFields, setExtractionMissingFields] = useState<SupportedExtractionField[]>([]);
  const [extractionNeedsReview, setExtractionNeedsReview] = useState(false);
  const [extractionSuggestionRaw, setExtractionSuggestionRaw] = useState<Json | null>(null);
  const [saveWithSuggestedDeadlines, setSaveWithSuggestedDeadlines] = useState(true);
  const [savePending, setSavePending] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspaceId, isHydrated } = useWorkspace();
  const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Upload failed');

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
      renewal_date: extractionSuggestion.renewal_date,
      notice_date: extractionSuggestion.notice_date,
      notice_period_days: extractionSuggestion.notice_period_days,
    });
  }, [extractionSuggestion]);

  const resetUploadFlow = () => {
    setState('idle');
    setFile(null);
    setTitle('');
    setCounterparty('');
    setContractId(null);
    setUploadedFilePath(null);
    setExtractionError(null);
    setExtractionMissingFields([]);
    setExtractionNeedsReview(false);
    setExtractionSuggestionRaw(null);
    setSaveWithSuggestedDeadlines(true);
    setSavePending(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type === 'application/pdf' && f.size <= 20 * 1024 * 1024) {
      setFile(f);
      setState('selected');
      if (!title) setTitle(f.name.replace('.pdf', ''));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setState('selected');
      if (!title) setTitle(f.name.replace('.pdf', ''));
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Select a PDF file first.');
      return;
    }
    if (!user) {
      toast.error('You must be signed in to upload a contract.');
      return;
    }
    if (!title.trim()) {
      toast.error('Contract title is required.');
      return;
    }
    if (!currentWorkspaceId) {
      toast.error('Select a workspace before uploading a contract.');
      return;
    }
    setState('uploading');
    setExtractionError(null);

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

      setContractId(contract.id);
      setUploadedFilePath(filePath);
      setState('uploaded');
      toast.success('Contract uploaded. Run extraction to preview fields.');
    } catch (err: unknown) {
      console.error('Upload error:', err);
      setState('failed');
      toast.error(getErrorMessage(err));
    }
  };

  const runExtraction = async () => {
    if (!currentWorkspaceId) {
      toast.error('Select a workspace before running extraction.');
      return;
    }
    if (!contractId || !uploadedFilePath) {
      toast.error('Upload a contract file before running extraction.');
      return;
    }

    const { data: scopedContract, error: scopeError } = await supabase
      .from('contracts')
      .select('id')
      .eq('id', contractId)
      .eq('workspace_id', currentWorkspaceId)
      .maybeSingle();

    if (scopeError) {
      toast.error(getErrorMessage(scopeError));
      return;
    }
    if (!scopedContract) {
      toast.error('Contract is not available in the selected workspace.');
      return;
    }

    setState('extracting');
    setExtractionError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('extract-contract-fields', {
        body: {
          contractId,
          filePath: uploadedFilePath,
          workspaceId: currentWorkspaceId,
        },
      });
      if (invokeError) throw invokeError;
      if (!data || typeof data !== 'object') {
        throw new Error('Extraction service returned an invalid response.');
      }

      const response = data as {
        ok?: boolean;
        error?: string;
        extraction?: Json;
        needs_review?: boolean;
        missing_fields?: unknown[];
      };

      if (response.ok === false || response.error) {
        throw new Error(response.error || 'Extraction failed. You can continue manually.');
      }

      const rawSuggestion = response.extraction ?? null;
      const parsedSuggestion = parseExtractionSuggestion(rawSuggestion as Json);
      const normalizedMissingFields = (
        parsedSuggestion?.missing_fields
        ?? (Array.isArray(response.missing_fields) ? response.missing_fields : [])
      ).filter((field): field is SupportedExtractionField => typeof field === 'string' && field in EXTRACTION_FIELD_LABELS);

      setExtractionSuggestionRaw((rawSuggestion ?? null) as Json | null);
      setExtractionMissingFields(normalizedMissingFields);
      setExtractionNeedsReview(Boolean(response.needs_review || normalizedMissingFields.length > 0));
      setState('preview');
      toast.success('Extraction complete. Review the preview and save when ready.');
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      console.error('Extraction run failed:', error);
      setExtractionError(message);
      setState('uploaded');
      toast.error(`${message}. You can continue manually.`);
    }
  };

  const saveContract = async () => {
    if (!contractId || !currentWorkspaceId) return;
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

      let insertedDeadlines = 0;
      if (saveWithSuggestedDeadlines && suggestedDeadlines.length > 0) {
        // Fetch existing deadline types to avoid duplicate key errors
        const { data: existingDates } = await supabase
          .from('contract_dates')
          .select('type')
          .eq('contract_id', contractId);

        const existingTypes = new Set((existingDates ?? []).map((d) => d.type));

        const inserts = suggestedDeadlines
          .filter((deadline) => !existingTypes.has(deadline.type))
          .map((deadline) => ({
            contract_id: contractId,
            type: deadline.type,
            due_date: deadline.due_date,
            label: deadline.label,
            note: deadline.note,
          }));

        if (inserts.length > 0) {
          const { data: insertResult, error: insertError } = await supabase
            .from('contract_dates')
            .insert(inserts)
            .select('id, type, due_date, label');

          if (insertError) {
            throw insertError;
          }

          insertedDeadlines = insertResult?.length ?? inserts.length;
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
      toast.error(getErrorMessage(error));
    } finally {
      setSavePending(false);
    }
  };

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
              <Button variant="ghost" size="icon" onClick={() => { setFile(null); setState('idle'); setTitle(''); }}>
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
            <Button onClick={handleUpload} className="w-full gap-2" disabled={!title || !isHydrated || !currentWorkspaceId}>
              <Upload className="h-4 w-4" /> Upload Contract
            </Button>
            {isHydrated && !currentWorkspaceId ? (
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

      {(state === 'uploaded' || state === 'extracting') && contractId && (
        <Card>
          <CardContent className="py-6 space-y-4">
            <div className="text-center">
              {state === 'extracting' ? (
                <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-3" />
              ) : (
                <CheckCircle className="mx-auto mb-3 h-10 w-10 text-foreground" />
              )}
              <h3 className="font-semibold text-lg mb-1">
                {state === 'extracting' ? 'Running extraction...' : 'Contract uploaded'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {state === 'extracting'
                  ? 'Extracting fields from your contract. This may take a moment.'
                  : 'Next: run extraction to preview fields before saving.'}
              </p>
            </div>

            {extractionError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Extraction failed</p>
                <p>{extractionError}</p>
              </div>
            ) : null}

            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={runExtraction} disabled={state === 'extracting' || !uploadedFilePath}>
                {state === 'extracting' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Run Extraction
              </Button>
              <Button variant="outline" onClick={() => navigate(`/app/contracts/${contractId}`)}>
                Review Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {state === 'preview' && contractId && (
        <Card>
          <CardContent className="py-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-lg">Extraction Preview</h3>
                <p className="text-xs text-muted-foreground">Review extracted fields before saving.</p>
              </div>
              {extractionNeedsReview ? (
                <Badge variant="outline" className="border-destructive/30 bg-destructive/5 text-foreground">
                  ⚠️ Needs Review
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

            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div className="rounded-md border bg-muted/40 px-3 py-2">
                <p className="text-xs text-muted-foreground">Start Date</p>
                <p className="font-medium">{formatDateValue(extractionSuggestion?.start_date)}</p>
              </div>
              <div className="rounded-md border bg-muted/40 px-3 py-2">
                <p className="text-xs text-muted-foreground">End Date</p>
                <p className="font-medium">{formatDateValue(extractionSuggestion?.end_date)}</p>
              </div>
              <div className="rounded-md border bg-muted/40 px-3 py-2">
                <p className="text-xs text-muted-foreground">Renewal Date</p>
                <p className="font-medium">{formatDateValue(extractionSuggestion?.renewal_date)}</p>
              </div>
              <div className="rounded-md border bg-muted/40 px-3 py-2">
                <p className="text-xs text-muted-foreground">Notice Date</p>
                <p className="font-medium">{formatDateValue(extractionSuggestion?.notice_date)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Suggested Deadlines</p>
              {suggestedDeadlines.length === 0 ? (
                <p className="text-xs text-muted-foreground">No suggested deadlines generated from extracted dates.</p>
              ) : (
                <div className="space-y-2">
                  {suggestedDeadlines.map((deadline) => (
                    <div
                      key={`${deadline.type}-${deadline.due_date}`}
                      className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
                    >
                      <p className="text-sm text-foreground">{deadline.label}</p>
                      <p>{formatDateValue(deadline.due_date)}</p>
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
              <Button variant="outline" onClick={() => navigate(`/app/contracts/${contractId}`)}>
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
            <h3 className="font-semibold text-lg mb-1">Contract Saved</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your extracted data was saved. You can review and edit later anytime.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate(`/app/contracts/${contractId}`)}>Review Details</Button>
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
