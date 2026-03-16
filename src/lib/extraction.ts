import { supabase } from '@/integrations/supabase/client';
import { extractTextFromPdf } from './pdf-extract';

export interface ExtractionResult {
  contract_title: string | null;
  counterparty: string | null;
  start_date: string | null;
  end_date: string | null;
  renewal_date: string | null;
  notice_date: string | null;
  payment_date: string | null;
  missing_fields: string[];
  needs_review: boolean;
  notes: string | null;
}

export interface ExtractionResponse {
  extraction: ExtractionResult;
  run_id: string;
  status: 'completed' | 'failed';
}

export async function runExtraction(
  contractId: string,
  pdfSource: File | Blob,
): Promise<ExtractionResponse> {
  const text = await extractTextFromPdf(pdfSource);

  if (!text || text.trim().length < 10) {
    throw new Error(
      'Could not extract meaningful text from the PDF. The file may be scanned or image-based.',
    );
  }

  const { data, error } = await supabase.functions.invoke('extract-contract', {
    body: { contract_id: contractId, extracted_text: text },
  });

  if (error) throw new Error(error.message || 'Extraction failed');
  if (data?.status === 'failed') throw new Error(data.error || 'Extraction failed');

  return data as ExtractionResponse;
}

export async function runExtractionFromStorage(
  contractId: string,
  storagePath: string,
): Promise<ExtractionResponse> {
  const { data, error } = await supabase.storage
    .from('contract-documents')
    .download(storagePath);

  if (error || !data) throw new Error('Failed to download contract file');

  return runExtraction(contractId, data);
}
