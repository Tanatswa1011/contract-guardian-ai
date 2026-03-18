import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import type { ExtractionSuggestion, SuggestedDeadline } from '@/lib/extraction';
import type { SupportedExtractionField } from '@/lib/extraction';
import { EXTRACTION_FIELD_LABELS } from './ExtractionPreviewFieldLabels';

type ExtractionPreviewModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractTitle: string;
  extractionSuggestion: ExtractionSuggestion | null;
  suggestedDeadlines: SuggestedDeadline[];
  missingFields: SupportedExtractionField[];
  needsReview: boolean;
  onSave: (applyDeadlines: boolean) => Promise<void>;
  onReviewEdit: () => void;
  isSaving?: boolean;
};

const formatDate = (value: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

export function ExtractionPreviewModal({
  open,
  onOpenChange,
  contractTitle,
  extractionSuggestion,
  suggestedDeadlines,
  missingFields,
  needsReview,
  onSave,
  onReviewEdit,
  isSaving = false,
}: ExtractionPreviewModalProps) {
  const [applyDeadlines, setApplyDeadlines] = React.useState(true);

  const handleSave = async () => {
    await onSave(applyDeadlines);
    onOpenChange(false);
  };

  const handleReviewEdit = () => {
    onReviewEdit();
    onOpenChange(false);
  };

  const suggestion = extractionSuggestion;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Extraction Preview</DialogTitle>
          <DialogDescription>
            Review extracted data before saving. You can save now or open the full editor to make changes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contract</p>
            <p className="text-sm font-medium">{suggestion?.contract_title || contractTitle || '—'}</p>
            <p className="text-sm text-muted-foreground">{suggestion?.counterparty || '—'}</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Key Dates</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Start:</span>{' '}
                {formatDate(suggestion?.start_date ?? null)}
              </div>
              <div>
                <span className="text-muted-foreground">End:</span>{' '}
                {formatDate(suggestion?.end_date ?? null)}
              </div>
              <div>
                <span className="text-muted-foreground">Renewal:</span>{' '}
                {formatDate(suggestion?.renewal_date ?? null)}
              </div>
              <div>
                <span className="text-muted-foreground">Notice:</span>{' '}
                {formatDate(suggestion?.notice_date ?? null)}
              </div>
            </div>
          </div>

          {suggestedDeadlines.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Suggested Deadlines ({suggestedDeadlines.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {suggestedDeadlines.map((s) => (
                  <Badge key={s.type} variant="outline" className="text-xs">
                    {s.label}: {formatDate(s.due_date)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {missingFields.length > 0 && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-xs font-medium text-destructive/90">Missing fields</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {missingFields.map((f) => (
                  <Badge key={f} variant="outline" className="text-xs">
                    {EXTRACTION_FIELD_LABELS[f]}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {needsReview && (
            <Badge variant="outline" className="border-destructive/30 bg-destructive/5">
              Needs Review
            </Badge>
          )}

          {suggestedDeadlines.length > 0 && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="apply-deadlines"
                checked={applyDeadlines}
                onCheckedChange={(v) => setApplyDeadlines(v === true)}
              />
              <label
                htmlFor="apply-deadlines"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Apply suggested deadlines when saving
              </label>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleReviewEdit} disabled={isSaving}>
            Review & Edit
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Contract
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
