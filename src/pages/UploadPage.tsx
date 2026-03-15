import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type UploadState = 'idle' | 'selected' | 'uploading' | 'completed' | 'failed';

export default function UploadPage() {
  const [state, setState] = useState<UploadState>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [contractId, setContractId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

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
    if (!file || !user || !title) return;
    setState('uploading');

    try {
      // 1. Create contract record
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert({ title, counterparty: counterparty || null, user_id: user.id })
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
      setState('completed');
      toast.success('Contract uploaded successfully!');
    } catch (err: any) {
      console.error('Upload error:', err);
      setState('failed');
      toast.error(err.message || 'Upload failed');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="border-b pb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Intake</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Upload Contract</h1>
        <p className="mt-2 text-sm text-muted-foreground">Upload a PDF contract to start tracking deadlines.</p>
      </div>

      {state === 'idle' && (
        <Card
          className="cursor-pointer border-2 border-dashed bg-muted/10 transition-colors hover:border-foreground/30 hover:bg-muted/20"
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
        >
          <CardContent className="py-16 text-center">
            <label className="cursor-pointer">
              <input type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border bg-background">
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="mb-1 font-medium">Drag and drop your PDF here</p>
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
            <Button onClick={handleUpload} className="w-full gap-2" disabled={!title}>
              <Upload className="h-4 w-4" /> Upload & Create Contract
            </Button>
          </CardContent>
        </Card>
      )}

      {state === 'uploading' && (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border bg-muted">
              <Loader2 className="h-5 w-5 animate-spin text-foreground" />
            </div>
            <p className="font-medium text-sm">Uploading contract...</p>
          </CardContent>
        </Card>
      )}

      {state === 'completed' && (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border bg-foreground text-background">
              <CheckCircle className="h-5 w-5" />
            </div>
            <h3 className="mb-1 text-lg font-semibold">Contract Uploaded Successfully</h3>
            <p className="mb-4 text-sm text-muted-foreground">Your contract has been created and the file is stored securely.</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate(`/app/contracts/${contractId}`)}>View Contract</Button>
              <Button variant="outline" onClick={() => { setState('idle'); setFile(null); setTitle(''); setCounterparty(''); }}>Upload Another</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {state === 'failed' && (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-destructive/20 bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <h3 className="mb-1 text-lg font-semibold">Upload Failed</h3>
            <p className="mb-4 text-sm text-muted-foreground">Something went wrong. Please try again.</p>
            <Button onClick={() => setState('selected')}>Try Again</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
