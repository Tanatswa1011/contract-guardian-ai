import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2, X, CalendarClock, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import {
  parseExtractionSuggestion,
  generateSuggestedDeadlines,
  type ExtractionSuggestion,
  type SuggestedDeadline,
} from '@/lib/extraction';

type UploadState = 'idle' | 'selected' | 'uploading' | 'extracting' | 'preview' | 'saving' | 'completed' | 'failed';

type ExtractionStatus = 'processing' | 'completed' | 'failed';

export default function UploadPage() {
  const [state, setState] = useState<UploadState>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [contractId, setContractId] = useState<string | null>(null);
  const [extractionSuggestion, setExtractionSuggestion] = useState<ExtractionSuggestion | null>(null);
  const [suggestedDeadlines, setSuggestedDeadlines] = useState<SuggestedDeadline[]>([]);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspaceId } = useWorkspace();
  const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Upload failed');

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const pollExtraction = useCallback((cId: string) => {
    stopPolling();

    const poll = async () => {
      const { data, error } = await supabase
        .from('extraction_runs')
        .select('status, raw_json, error, missing_fields, needs_review')
        .eq('contract_id', cId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[UploadPage] Polling error:', error);
        return;
      }

      if (!data) return;

      const status = data.status as ExtractionStatus;

      if (status === 'completed') {
        stopPolling();
        const suggestion = parseExtractionSuggestion(data.raw_json);
        if (suggestion) {
          const deadlines = generateSuggestedDeadlines(suggestion);
          console.log('[UploadPage] Extraction complete. Suggestion:', suggestion);
          console.log('[UploadPage] Generated deadlines:', deadlines);
          setExtractionSuggestion(suggestion);
          setSuggestedDeadlines(deadlines);
        }
        setState('preview');
      } else if (status === 'failed') {
        stopPolling();
        setExtractionError(data.error || 'Extraction failed. You can continue manually.');
        setState('preview');
      }
    };

    void poll();
    pollRef.current = setInterval(poll, 3000);
  }, [stopPolling]);

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
    if (!file || !user || !title || !currentWorkspaceId) return;
    setState('uploading');

    try {
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

      const filePath = `${user.id}/${contract.id}/${file.name}`;
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
      setState('extracting');
      toast.success('Contract uploaded — running AI extraction...');

      supabase.functions
        .invoke('extract-contract-fields', {
          body: { contractId: contract.id, filePath },
        })
        .then(({ error: extractionErr }) => {
          if (extractionErr) {
            console.error('Extraction trigger error:', extractionErr);
            setExtractionError('AI extraction could not start. You can add details manually.');
            setState('preview');
          }
        })
        .catch((extractionErr: unknown) => {
          console.error('Extraction trigger exception:', extractionErr);
          setExtractionError('AI extraction could not start. You can add details manually.');
          setState('preview');
        });

      pollExtraction(contract.id);
    } catch (err: unknown) {
      console.error('Upload error:', err);
      setState('failed');
      toast.error(getErrorMessage(err));
    }
  };

  const handleSaveContract = async () => {
    if (!contractId || !extractionSuggestion) return;
    setState('saving');

    try {
      const contractUpdate: Record<string, unknown> = {};
      if (extractionSuggestion.contract_title) contractUpdate.title = extractionSuggestion.contract_title;
      if (extractionSuggestion.counterparty) contractUpdate.counterparty = extractionSuggestion.counterparty;
      if (extractionSuggestion.start_date) contractUpdate.start_date = extractionSuggestion.start_date;
      if (extractionSuggestion.end_date) contractUpdate.end_date = extractionSuggestion.end_date;

      if (Object.keys(contractUpdate).length > 0) {
        const { error } = await supabase.from('contracts').update(contractUpdate).eq('id', contractId);
        if (error) throw error;
      }

      if (suggestedDeadlines.length > 0) {
        const inserts = suggestedDeadlines.map((sd) => ({
          contract_id: contractId,
          type: 'custom' as const,
          due_date: sd.due_date,
          label: sd.label,
          note: `Auto-generated: ${sd.offset_value} ${sd.offset_unit} before ${sd.date_type} date.`,
        }));

        console.log('[UploadPage] Inserting suggested deadlines:', inserts);
        const { error: deadlineError } = await supabase.from('contract_dates').insert(inserts);
        if (deadlineError) {
          console.error('[UploadPage] Deadline insert error:', deadlineError);
          toast.error('Contract saved, but some deadlines could not be added.');
        }
      }

      setState('completed');
      toast.success('Contract saved with extracted data!');
    } catch (err: unknown) {
      console.error('Save error:', err);
      toast.error(getErrorMessage(err));
      setState('preview');
    }
  };

  const resetForm = () => {
    setState('idle');
    setFile(null);
    setTitle('');
    setCounterparty('');
    setContractId(null);
    setExtractionSuggestion(null);
    setSuggestedDeadlines([]);
    setExtractionError(null);
    stopPolling();
  };

  const formatDateValue = (value: string | null) => {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
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
            <Button onClick={handleUpload} className="w-full gap-2" disabled={!title || !currentWorkspaceId}>
              <Upload className="h-4 w-4" /> Upload & Extract
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
            <p className="text-xs text-muted-foreground mt-2">This usually takes 10–30 seconds.</p>
          </CardContent>
        </Card>
      )}

      {state === 'preview' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Extraction Preview</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {extractionError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
                    <div>
                      <p className="text-sm font-medium">Extraction issue</p>
                      <p className="text-xs text-muted-foreground">{extractionError}</p>
                    </div>
                  </div>
                </div>
              )}

              {extractionSuggestion && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1 rounded-md border bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">Contract Title</p>
                      <p className="text-sm font-medium">{extractionSuggestion.contract_title ?? '—'}</p>
                    </div>
                    <div className="space-y-1 rounded-md border bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">Counterparty</p>
                      <p className="text-sm font-medium">{extractionSuggestion.counterparty ?? '—'}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Key Dates</p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {[
                        { label: 'Start Date', value: extractionSuggestion.start_date },
                        { label: 'End Date', value: extractionSuggestion.end_date },
                        { label: 'Renewal Date', value: extractionSuggestion.renewal_date },
                        { label: 'Notice Date', value: extractionSuggestion.notice_date },
                        { label: 'Payment Date', value: extractionSuggestion.payment_date },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
                          <span className="text-xs text-muted-foreground">{item.label}</span>
                          <span className="text-sm font-medium">{formatDateValue(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {suggestedDeadlines.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Suggested Deadlines ({suggestedDeadlines.length})
                      </p>
                      <div className="space-y-2">
                        {suggestedDeadlines.map((sd) => (
                          <div key={`${sd.date_type}-${sd.offset_value}`} className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
                            <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm flex-1">{sd.label}</span>
                            <span className="text-sm font-medium">{formatDateValue(sd.due_date)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {extractionSuggestion.missing_fields.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Missing Fields</p>
                      <div className="flex flex-wrap gap-1.5">
                        {extractionSuggestion.missing_fields.map((field) => (
                          <Badge key={field} variant="outline" className="text-xs">
                            {field.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {extractionSuggestion.needs_review && (
                    <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      Some fields are missing or uncertain — review recommended.
                    </div>
                  )}

                  {extractionSuggestion.notes && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">AI Notes</p>
                      <p className="text-sm">{extractionSuggestion.notes}</p>
                    </div>
                  )}
                </>
              )}

              <div className="flex flex-wrap gap-3 border-t pt-4">
                <Button
                  onClick={handleSaveContract}
                  disabled={!extractionSuggestion || state === 'saving'}
                >
                  {state === 'saving' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Contract
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/app/contracts/${contractId}`)}
                >
                  Review & Edit
                </Button>
                {!extractionSuggestion && (
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/app/contracts/${contractId}`)}
                  >
                    Continue Manually
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {state === 'saving' && (
        <Card>
          <CardContent className="py-8 text-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-4" />
            <p className="font-medium text-sm">Saving extracted data...</p>
          </CardContent>
        </Card>
      )}

      {state === 'completed' && (
        <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-foreground" />
            <h3 className="font-semibold text-lg mb-1">Contract Saved Successfully</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Extracted data and suggested deadlines have been saved.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate(`/app/contracts/${contractId}`)}>View Contract</Button>
              <Button variant="outline" onClick={resetForm}>Upload Another</Button>
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
            <Button onClick={() => setState('selected')}>Try Again</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
