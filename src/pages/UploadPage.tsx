import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2, X } from 'lucide-react';

type UploadState = 'idle' | 'selected' | 'uploading' | 'extracting' | 'validating' | 'completed' | 'failed';

export default function UploadPage() {
  const [state, setState] = useState<UploadState>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [needsReview, setNeedsReview] = useState(false);
  const navigate = useNavigate();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type === 'application/pdf' && f.size <= 20 * 1024 * 1024) {
      setFile(f);
      setState('selected');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setState('selected');
    }
  };

  const simulateUpload = async () => {
    setState('uploading');
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(r => setTimeout(r, 150));
      setProgress(i);
    }
    setState('extracting');
    setProgress(0);
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(r => setTimeout(r, 100));
      setProgress(i);
    }
    setState('validating');
    setProgress(0);
    for (let i = 0; i <= 100; i += 20) {
      await new Promise(r => setTimeout(r, 100));
      setProgress(i);
    }
    const review = Math.random() > 0.5;
    setNeedsReview(review);
    setState('completed');
  };

  const stepLabels: Record<string, string> = {
    uploading: 'Uploading document...',
    extracting: 'Extracting key dates with AI...',
    validating: 'Validating extracted data...',
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload Contract</h1>
        <p className="text-muted-foreground text-sm">Upload a PDF contract and our AI will extract key deadlines automatically.</p>
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
          <CardContent className="py-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setFile(null); setState('idle'); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={simulateUpload} className="w-full gap-2">
              <Upload className="h-4 w-4" /> Process Contract
            </Button>
          </CardContent>
        </Card>
      )}

      {['uploading', 'extracting', 'validating'].includes(state) && (
        <Card className="shadow-sm">
          <CardContent className="py-8">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
              <p className="font-medium text-sm">{stepLabels[state]}</p>
            </div>
            <Progress value={progress} className="mb-4" />
            <div className="flex gap-2">
              {['uploading', 'extracting', 'validating'].map(s => (
                <Badge
                  key={s}
                  variant={state === s ? 'default' : 'outline'}
                  className="text-xs capitalize"
                >
                  {s === 'uploading' ? 'Upload' : s === 'extracting' ? 'Extract' : 'Validate'}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {state === 'completed' && (
        <Card className="shadow-sm">
          <CardContent className="py-8 text-center">
            <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1">Contract Processed Successfully</h3>
            <p className="text-sm text-muted-foreground mb-4">Key dates and terms have been extracted.</p>
            {needsReview && (
              <div className="flex items-center gap-2 justify-center mb-4 bg-warning/10 text-warning rounded-lg px-4 py-3">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Some fields need manual review</span>
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate('/app/contracts/1')}>View Contract</Button>
              <Button variant="outline" onClick={() => { setState('idle'); setFile(null); }}>Upload Another</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {state === 'failed' && (
        <Card className="shadow-sm">
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1">Processing Failed</h3>
            <p className="text-sm text-muted-foreground mb-4">We couldn't extract data from this document.</p>
            <Button onClick={() => { setState('idle'); setFile(null); }}>Try Again</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
