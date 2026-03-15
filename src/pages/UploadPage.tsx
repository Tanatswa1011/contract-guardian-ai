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
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert({ title, counterparty: counterparty || null, user_id: user.id })
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
      setState('completed');
      toast.success('Contract uploaded successfully.');
    } catch (err: any) {
      console.error('Upload error:', err);
      setState('failed');
      toast.error(err.message || 'Upload failed');
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Upload Contract</h1>
        <p className="text-muted-foreground text-xs mt-1">Upload a PDF contract to start tracking deadlines.</p>
      </div>

      {state === 'idle' && (
        <div
          className="border-2 border-dashed hover:border-foreground/30 transition-colors cursor-pointer p-12"
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
        >
          <label className="cursor-pointer block text-center">
            <input type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
            <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium mb-1">Drag & drop your PDF here</p>
            <p className="text-xs text-muted-foreground">or click to browse &middot; Max 20MB</p>
          </label>
        </div>
      )}

      {state === 'selected' && file && (
        <Card>
          <CardContent className="py-5 px-5 space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b">
              <div className="w-8 h-8 border flex items-center justify-center">
                <FileText className="h-4 w-4 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setFile(null); setState('idle'); setTitle(''); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Contract Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Office Lease Agreement" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Counterparty (optional)</Label>
              <Input value={counterparty} onChange={e => setCounterparty(e.target.value)} placeholder="e.g., Acme Corp" />
            </div>
            <Button onClick={handleUpload} className="w-full gap-1.5" disabled={!title}>
              <Upload className="h-3.5 w-3.5" /> Upload & Create Contract
            </Button>
          </CardContent>
        </Card>
      )}

      {state === 'uploading' && (
        <Card>
          <CardContent className="py-10 text-center">
            <Loader2 className="h-5 w-5 text-muted-foreground animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium">Uploading contract...</p>
          </CardContent>
        </Card>
      )}

      {state === 'completed' && (
        <Card>
          <CardContent className="py-10 text-center">
            <CheckCircle className="h-6 w-6 text-success mx-auto mb-3" />
            <h3 className="text-sm font-semibold mb-1">Contract Uploaded</h3>
            <p className="text-xs text-muted-foreground mb-5">Your contract has been created and stored securely.</p>
            <div className="flex gap-2 justify-center">
              <Button size="sm" onClick={() => navigate(`/app/contracts/${contractId}`)}>View Contract</Button>
              <Button size="sm" variant="outline" onClick={() => { setState('idle'); setFile(null); setTitle(''); setCounterparty(''); }}>Upload Another</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {state === 'failed' && (
        <Card>
          <CardContent className="py-10 text-center">
            <AlertTriangle className="h-6 w-6 text-destructive mx-auto mb-3" />
            <h3 className="text-sm font-semibold mb-1">Upload Failed</h3>
            <p className="text-xs text-muted-foreground mb-5">Something went wrong. Please try again.</p>
            <Button size="sm" onClick={() => setState('selected')}>Try Again</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
