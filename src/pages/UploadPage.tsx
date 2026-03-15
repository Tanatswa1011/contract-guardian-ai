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
      <div>
        <h1 className="text-2xl font-bold">Upload Contract</h1>
        <p className="text-muted-foreground text-sm">Upload a PDF contract to start tracking deadlines.</p>
      </div>

      {state === 'idle' && (
        <Card
          className="border-2 border-dashed hover:border-primary/50 transition-colors cursor-pointer"
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
        >
          <CardContent className="py-16 text-center">
            <label className="cursor-pointer">
              <input type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
              <Upload className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="font-medium mb-1">Drag & drop your PDF here</p>
              <p className="text-sm text-muted-foreground">or click to browse • Max 20MB</p>
            </label>
          </CardContent>
        </Card>
      )}

      {state === 'selected' && file && (
        <Card className="shadow-sm">
          <CardContent className="py-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
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
        <Card className="shadow-sm">
          <CardContent className="py-8 text-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-4" />
            <p className="font-medium text-sm">Uploading contract...</p>
          </CardContent>
        </Card>
      )}

      {state === 'completed' && (
        <Card className="shadow-sm">
          <CardContent className="py-8 text-center">
            <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1">Contract Uploaded Successfully</h3>
            <p className="text-sm text-muted-foreground mb-4">Your contract has been created and the file is stored securely.</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate(`/app/contracts/${contractId}`)}>View Contract</Button>
              <Button variant="outline" onClick={() => { setState('idle'); setFile(null); setTitle(''); setCounterparty(''); }}>Upload Another</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {state === 'failed' && (
        <Card className="shadow-sm">
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
