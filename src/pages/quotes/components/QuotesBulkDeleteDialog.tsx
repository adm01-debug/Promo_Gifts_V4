import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Quote } from '@/hooks/quotes/quoteTypes';

interface QuotesBulkDeleteDialogProps {
  bulkDeleteIds: string[];
  isBulkDeleting: boolean;
  bulkDeleteProgress: { done: number; total: number };
  cancelBulkDelete: () => void;
  handleBulkDelete: () => Promise<void>;
  filteredQuotes: Quote[];
}

/**
 * Diálogo de exclusão em lote da lista de orçamentos — preview de IDs,
 * loading com progresso e cancelamento que preserva a seleção.
 *
 * Extraído de `QuotesListPage.tsx` (gate de tamanho de arquivo: 500 linhas).
 */
export function QuotesBulkDeleteDialog({
  bulkDeleteIds,
  isBulkDeleting,
  bulkDeleteProgress,
  cancelBulkDelete,
  handleBulkDelete,
  filteredQuotes,
}: QuotesBulkDeleteDialogProps) {
  return (
    <AlertDialog
      open={bulkDeleteIds.length > 0}
      onOpenChange={(open) => {
        // Bloqueia fechamento durante exclusão para evitar perda de feedback.
        if (isBulkDeleting) return;
        // "Fechar" no overlay/ESC é tratado como cancelar (preserva seleção).
        if (!open) cancelBulkDelete();
      }}
    >
      <AlertDialogContent
        className="w-[92vw] !max-w-[345px] gap-0 overflow-hidden rounded-xl border border-border/60 bg-card/95 p-0 shadow-xl backdrop-blur-xl"
        data-testid="quotes-bulk-delete-dialog"
      >
        <div
          aria-hidden="true"
          className="h-[3px] w-full bg-gradient-to-r from-transparent via-destructive to-transparent"
        />
        <div className="px-4 pb-1.5 pt-4">
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              <div className="relative flex-shrink-0">
                <span
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 rounded-xl bg-destructive/30 opacity-60 blur-lg"
                />
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10 ring-1 ring-inset ring-destructive/20">
                  <Trash2 className="h-[18px] w-[18px] text-destructive" strokeWidth={2.2} />
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-1 pt-0.5">
                <AlertDialogTitle className="text-sm font-semibold leading-tight tracking-tight text-foreground">
                  {isBulkDeleting
                    ? `Excluindo ${bulkDeleteProgress.done}/${bulkDeleteProgress.total}…`
                    : `Excluir ${bulkDeleteIds.length} orçamento${bulkDeleteIds.length === 1 ? '' : 's'}?`}
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
                    {isBulkDeleting ? (
                      <>
                        <p>Aguarde — não feche esta janela.</p>
                        <div
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={bulkDeleteProgress.total}
                          aria-valuenow={bulkDeleteProgress.done}
                          data-testid="quotes-bulk-delete-progress"
                          className="h-2 w-full overflow-hidden rounded-full bg-muted"
                        >
                          <div
                            className="h-full bg-destructive transition-all"
                            style={{
                              width: `${
                                bulkDeleteProgress.total > 0
                                  ? Math.round(
                                      (bulkDeleteProgress.done / bulkDeleteProgress.total) * 100,
                                    )
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <p>
                          {bulkDeleteIds.length === 1
                            ? 'O orçamento será removido — você pode desfazer por até 8 segundos após a confirmação.'
                            : 'Os orçamentos serão removidos — você pode desfazer por até 8 segundos após a confirmação.'}
                        </p>
                        {(() => {
                          const preview = filteredQuotes
                            .filter((q) => q.id && bulkDeleteIds.includes(q.id))
                            .map((q) => q.quote_number)
                            .filter(Boolean);
                          if (preview.length === 0) return null;
                          const shown = preview.slice(0, 5);
                          const extra = preview.length - shown.length;
                          return (
                            <div
                              data-testid="quotes-bulk-delete-preview"
                              className="rounded-md border border-border bg-muted/40 px-3 py-2 text-[11px]"
                            >
                              <p className="mb-1 font-medium text-foreground">Identificadores:</p>
                              <p className="text-muted-foreground">
                                {shown.join(', ')}
                                {extra > 0 ? ` e mais ${extra}` : ''}
                              </p>
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
        </div>
        <div className="mt-3 border-t border-border/50 bg-muted/20 px-4 py-2.5">
          <AlertDialogFooter className="gap-1.5 sm:gap-1.5">
            <AlertDialogCancel
              disabled={isBulkDeleting}
              onClick={cancelBulkDelete}
              className="mt-0 h-[26px] min-h-[26px] rounded-md border-border/70 bg-transparent px-3 py-0 text-xs"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="quotes-bulk-delete-confirm"
              disabled={isBulkDeleting}
              onClick={(e) => {
                e.preventDefault();
                void handleBulkDelete();
              }}
              className="inline-flex h-[26px] min-h-[26px] items-center rounded-md bg-destructive px-3.5 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeleting
                ? `Excluindo… (${bulkDeleteProgress.done}/${bulkDeleteProgress.total})`
                : `Excluir ${bulkDeleteIds.length}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
