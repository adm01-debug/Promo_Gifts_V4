export interface QuoteDraft {
  id: string;
  data: unknown;
  savedAt: string;
  version: number;
}

export interface QuoteAutoSaveProps {
  quoteId?: string;
  data: unknown;
  onChange?: (hasUnsavedChanges: boolean) => void;
  onRestore?: (data: unknown) => Promise<void> | void;
  debounceMs?: number;
  className?: string;
  /** Timestamp (Date.now()) set by the parent after a successful server save.
   *  When it changes, the "unsaved changes" baseline is reset so the indicator
   *  clears without needing to navigate away and back. */
  serverSavedAt?: number;
}
