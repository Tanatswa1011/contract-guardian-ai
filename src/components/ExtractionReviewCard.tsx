import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Check, Loader2, Sparkles, RotateCcw, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { runExtractionFromStorage } from '@/lib/extraction';
import { toast } from 'sonner';
import type { ExtractionResult } from '@/lib/extraction';

interface ExtractionReviewCardProps {
  extraction: {
    id: string;
    contract_id: string;
    status: string;
    needs_review: boolean;
    missing_fields: string[];
    raw_json: unknown;
    model: string | null;
    error: string | null;
    created_at: string;
  } | null;
  contract: {
    id: string;
    title: string;
    counterparty: string | null;
    start_date: string | null;
    end_date: string | null;
  };
  dates: { id: string; type: string; due_date: string; label: string | null }[];
  files: { id: string; storage_path: string; file_name: string }[];
  onApplied: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  contract_title: 'Contract Title',
  counterparty: 'Counterparty',
  start_date: 'Start Date',
  end_date: 'End Date',
  renewal_date: 'Renewal Date',
  notice_date: 'Notice Date',
  payment_date: 'Payment Date',
};

const CONTRACT_FIELDS = ['contract_title', 'counterparty', 'start_date', 'end_date'] as const;
const DATE_FIELDS = ['renewal_date', 'notice_date', 'payment_date'] as const;
const DATE_TYPE_MAP: Record<string, string> = {
  renewal_date: 'renewal',
  notice_date: 'notice',
  payment_date: 'payment',
};

function isDateField(field: string): boolean {
  return field === 'start_date' || field === 'end_date' || field === 'renewal_date' || field === 'notice_date' || field === 'payment_date';
}

function getCurrentValue(
  field: string,
  contract: ExtractionReviewCardProps['contract'],
  dates: ExtractionReviewCardProps['dates'],
): string | null {
  if (field === 'contract_title') return contract.title;
  if (field === 'counterparty') return contract.counterparty;
  if (field === 'start_date') return contract.start_date;
  if (field === 'end_date') return contract.end_date;
  const dateType = DATE_TYPE_MAP[field];
  if (dateType) {
    const existing = dates.find((d) => d.type === dateType);
    return existing?.due_date ?? null;
  }
  return null;
}

export default function ExtractionReviewCard({
  extraction,
  contract,
  dates,
  files,
  onApplied,
}: ExtractionReviewCardProps) {
  const [applying, setApplying] = useState(false);
  const [reExtracting, setReExtracting] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  if (!extraction) return null;

  const rawJson = extraction.raw_json as ExtractionResult | null;
  const isFailed = extraction.status === 'failed';

  if (isFailed) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="py-4 px-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">AI extraction failed</p>
              <p className="text-xs text-muted-foreground mt-1">
                {extraction.error || 'An unexpected error occurred during extraction.'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                You can still add all contract details manually.
              </p>
              {files.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 gap-2"
                  disabled={reExtracting}
                  onClick={handleReExtract}
                >
                  {reExtracting ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                  Retry Extraction
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!rawJson) return null;

  const allFields = [...CONTRACT_FIELDS, ...DATE_FIELDS] as string[];

  function getExtractedValue(field: string): string | null {
    if (!rawJson) return null;
    return (rawJson as Record<string, unknown>)[field] as string | null;
  }

  function getDisplayValue(field: string): string {
    if (editValues[field] !== undefined) return editValues[field];
    return getExtractedValue(field) || '';
  }

  function handleEditField(field: string, value: string) {
    setEditValues((prev) => ({ ...prev, [field]: value }));
  }

  async function handleApplyAll() {
    setApplying(true);
    try {
      const contractUpdate: Record<string, string | null> = {};
      for (const field of CONTRACT_FIELDS) {
        const val = getDisplayValue(field);
        if (!val) continue;
        const current = getCurrentValue(field, contract, dates);
        if (current && current === val) continue;

        if (field === 'contract_title') contractUpdate.title = val;
        else if (field === 'counterparty') contractUpdate.counterparty = val;
        else if (field === 'start_date') contractUpdate.start_date = val;
        else if (field === 'end_date') contractUpdate.end_date = val;
      }

      if (Object.keys(contractUpdate).length > 0) {
        const { error } = await supabase
          .from('contracts')
          .update(contractUpdate)
          .eq('id', contract.id);
        if (error) throw error;
      }

      for (const field of DATE_FIELDS) {
        const val = getDisplayValue(field);
        if (!val) continue;
        const dateType = DATE_TYPE_MAP[field];
        const existing = dates.find((d) => d.type === dateType);
        if (existing) continue;

        const { error } = await supabase.from('contract_dates').insert({
          contract_id: contract.id,
          type: dateType,
          due_date: val,
          label: `${FIELD_LABELS[field]} (AI extracted)`,
          note: 'Added from AI extraction',
        });
        if (error) throw error;
      }

      await supabase
        .from('extraction_runs')
        .update({ needs_review: false })
        .eq('id', extraction.id);

      toast.success('Extracted data applied successfully');
      setEditValues({});
      onApplied();
    } catch (err) {
      console.error('Apply error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to apply extracted data');
    } finally {
      setApplying(false);
    }
  }

  async function handleDismiss() {
    await supabase
      .from('extraction_runs')
      .update({ needs_review: false })
      .eq('id', extraction.id);
    toast.success('Extraction review dismissed');
    onApplied();
  }

  async function handleReExtract() {
    if (!files.length) return;
    setReExtracting(true);
    try {
      await runExtractionFromStorage(contract.id, files[0].storage_path);
      toast.success('Re-extraction complete');
      onApplied();
    } catch (err) {
      console.error('Re-extraction error:', err);
      toast.error(err instanceof Error ? err.message : 'Re-extraction failed');
    } finally {
      setReExtracting(false);
    }
  }

  const hasApplicableValues = allFields.some((f) => {
    const val = getDisplayValue(f);
    if (!val) return false;
    const current = getCurrentValue(f, contract, dates);
    if (DATE_FIELDS.includes(f as typeof DATE_FIELDS[number])) {
      return !dates.find((d) => d.type === DATE_TYPE_MAP[f]);
    }
    return !current || current !== val;
  });

  return (
    <Card className="border-primary/30 bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Extraction Results
          </CardTitle>
          <div className="flex items-center gap-2">
            {extraction.needs_review && (
              <Badge variant="outline" className="text-xs">Needs Review</Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {extraction.model || 'gpt-4o-mini'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {allFields.map((field) => {
            const extractedVal = getExtractedValue(field);
            const currentVal = getCurrentValue(field, contract, dates);
            const displayVal = getDisplayValue(field);
            const isMissing = !extractedVal;
            const isAlreadySet = !!currentVal;
            const isDateType = isDateField(field);
            const isDeadlineField = DATE_FIELDS.includes(field as typeof DATE_FIELDS[number]);
            const deadlineExists = isDeadlineField && dates.find((d) => d.type === DATE_TYPE_MAP[field]);

            return (
              <div key={field} className="flex items-center gap-3 py-1.5">
                <div className="w-32 shrink-0">
                  <span className="text-xs font-medium text-muted-foreground">
                    {FIELD_LABELS[field]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  {isMissing ? (
                    <span className="text-xs text-muted-foreground italic">Not found in document</span>
                  ) : (
                    <Input
                      type={isDateType ? 'date' : 'text'}
                      value={displayVal}
                      onChange={(e) => handleEditField(field, e.target.value)}
                      className="h-8 text-sm"
                    />
                  )}
                </div>
                <div className="w-24 shrink-0 text-right">
                  {isMissing ? (
                    <Badge variant="outline" className="text-xs text-muted-foreground">Missing</Badge>
                  ) : deadlineExists ? (
                    <Badge variant="secondary" className="text-xs">Exists</Badge>
                  ) : isAlreadySet && currentVal === extractedVal ? (
                    <Badge variant="secondary" className="text-xs">Matches</Badge>
                  ) : isAlreadySet ? (
                    <Badge variant="outline" className="text-xs text-primary">Will update</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-primary">
                      {isDeadlineField ? 'Will add' : 'New'}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {rawJson.notes && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
            <span className="font-medium">AI Notes:</span> {rawJson.notes}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {hasApplicableValues && (
            <Button size="sm" className="gap-2" onClick={handleApplyAll} disabled={applying}>
              {applying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Apply All Suggestions
            </Button>
          )}
          {extraction.needs_review && (
            <Button size="sm" variant="outline" className="gap-2" onClick={handleDismiss}>
              <X className="h-3 w-3" /> Dismiss Review
            </Button>
          )}
          {files.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={handleReExtract}
              disabled={reExtracting}
            >
              {reExtracting ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
              Re-extract
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
