import type React from 'react';
import { Save, Shield, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { cn } from '@/lib/utils';
import type { QuoteItem } from '@/hooks/quotes';
import {
  getApprovalChecklist,
  isApprovalReady,
  MIN_SELLER_NOTES_LENGTH,
} from '@/lib/quotes/discount-validation-messages';
import { toast } from 'sonner';

interface QuoteBuilderSummaryDialogsProps {
  // from hook
  approvalDialogOpen: boolean;
  handleApprovalDialogChange: (open: boolean) => void;
  sellerNotes: string;
  setSellerNotes: (v: string) => void;
  handleRequestApproval: () => void;
  confirmSaveDraftOpen: boolean;
  setConfirmSaveDraftOpen: (v: boolean) => void;
  saveDraftBtnRef: React.RefObject<HTMLButtonElement | null>;
  confirmAllOpen: boolean;
  handleConfirmAllDialogChange: (open: boolean) => void;
  staleCount: number;
  setShowOnlyStale: (v: boolean) => void;
  // from parent props
  items: QuoteItem[];
  isFormValid: boolean;
  quotesLoading: boolean;
  onSave: (status: 'draft' | 'pending_approval' | 'pending', sellerNotes?: string) => void;
  maxDiscountPercent?: number | null;
  realDiscountPercent?: number;
  confirmAllStalePrices?: () => void;
}

export function QuoteBuilderSummaryDialogs({
  approvalDialogOpen,
  handleApprovalDialogChange,
  sellerNotes,
  setSellerNotes,
  handleRequestApproval,
  confirmSaveDraftOpen,
  setConfirmSaveDraftOpen,
  saveDraftBtnRef,
  confirmAllOpen,
  handleConfirmAllDialogChange,
  staleCount,
  setShowOnlyStale,
  items,
  isFormValid,
  quotesLoading,
  onSave,
  maxDiscountPercent,
  realDiscountPercent = 0,
  confirmAllStalePrices,
}: QuoteBuilderSummaryDialogsProps) {
  return (
    <>
      {/* Confirmação — Salvar Rascunho do orçamento inteiro */}
      <Dialog
        open={confirmSaveDraftOpen}
        onOpenChange={(open) => {
          setConfirmSaveDraftOpen(open);
          // Restaura foco no botão que abriu o modal (Cancelar / Escape / clique fora)
          if (!open) {
            requestAnimationFrame(() => saveDraftBtnRef.current?.focus());
          }
        }}
      >
        <DialogContent
          data-testid="quote-save-draft-confirm-dialog"
          onOpenAutoFocus={(event) => {
            // Foco inicial no botão de confirmação (ação primária) — reduz
            // fricção de teclado: Enter confirma imediatamente após abrir.
            event.preventDefault();
            requestAnimationFrame(() => {
              const el = document.querySelector<HTMLButtonElement>(
                '[data-testid="quote-save-draft-confirm"]',
              );
              el?.focus();
            });
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5 text-primary" />
              Salvar rascunho do orçamento?
            </DialogTitle>
            <DialogDescription>
              Todas as alterações feitas neste orçamento (itens, quantidades, descontos, markup e
              notas) serão gravadas no banco. O orçamento{' '}
              <span className="font-semibold text-foreground">não</span> será enviado para aprovação
              nem para o cliente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmSaveDraftOpen(false)}
              disabled={quotesLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setConfirmSaveDraftOpen(false);
                onSave('draft');
              }}
              disabled={quotesLoading}
              data-testid="quote-save-draft-confirm"
              aria-label="Salvar Rascunho"
            >
              {quotesLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar Rascunho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Request Dialog — SCROLL-FIX-03 via handleApprovalDialogChange */}
      <Dialog open={approvalDialogOpen} onOpenChange={handleApprovalDialogChange}>
        <DialogContent data-testid="quote-approval-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-500" />
              Solicitar Aprovação de Desconto
            </DialogTitle>
            <DialogDescription>
              O desconto real de{' '}
              <span className="font-semibold text-foreground">
                {realDiscountPercent.toFixed(2).replace('.', ',')}%
              </span>{' '}
              excede seu limite de{' '}
              <span className="font-semibold text-foreground">{maxDiscountPercent}%</span>.
              Justifique o motivo para o administrador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2 rounded-xl border border-border/40 bg-muted/50 p-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div data-testid="quote-approval-limit">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Seu Limite
                  </p>

                  <p className="mt-0.5 text-sm font-semibold">{maxDiscountPercent}%</p>
                </div>
                <div data-testid="quote-approval-requested">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Solicitado (real)
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-amber-500">
                    {realDiscountPercent.toFixed(2).replace('.', ',')}%
                  </p>
                </div>
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/40"
                  style={{ width: `${Math.min(maxDiscountPercent || 0, 100)}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-amber-500"
                  style={{ width: `${Math.min(realDiscountPercent, 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Justificativa <span className="font-normal text-destructive">*</span>
              </Label>
              <Textarea
                data-testid="quote-approval-justification"
                value={sellerNotes}
                onChange={(e) => setSellerNotes(e.target.value.slice(0, 1000))}
                placeholder="Ex: Cliente estratégico, pedido de grande volume, negociação especial..."
                rows={3}
                autoFocus
                maxLength={1000}
                aria-invalid={sellerNotes.trim().length < MIN_SELLER_NOTES_LENGTH}
              />
              <div className="flex items-center justify-between text-xs">
                <span
                  className={cn(
                    'font-medium',
                    sellerNotes.trim().length < MIN_SELLER_NOTES_LENGTH
                      ? 'text-amber-600'
                      : 'text-emerald-600',
                  )}
                >
                  Mín. {MIN_SELLER_NOTES_LENGTH} caracteres
                </span>
                <span className="text-muted-foreground">{sellerNotes.length}/1000</span>
              </div>
            </div>

            {(() => {
              const checklist = getApprovalChecklist({
                hasItems: items.length > 0,
                hasClient: isFormValid,
                sellerNotesLength: sellerNotes.trim().length,
              });
              return (
                <div
                  data-testid="quote-approval-checklist"
                  className="space-y-1.5 rounded-xl border border-border/40 bg-muted/30 p-3"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    O que falta para enviar
                  </p>
                  <ul className="space-y-1">
                    {checklist.map((c) => (
                      <li
                        key={c.key}
                        data-testid={`quote-approval-check-${c.key}`}
                        data-ok={c.ok}
                        className="flex items-start gap-2 text-xs"
                      >
                        {c.ok ? (
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        ) : (
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                        )}
                        <span
                          className={
                            c.ok ? 'text-muted-foreground line-through' : 'text-foreground'
                          }
                        >
                          {c.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleApprovalDialogChange(false)}>
              Cancelar
            </Button>
            <Button
              data-testid="quote-approval-submit"
              className="gap-1.5 bg-amber-500 text-white hover:bg-amber-600"
              onClick={handleRequestApproval}
              disabled={
                quotesLoading ||
                !isApprovalReady({
                  hasItems: items.length > 0,
                  hasClient: isFormValid,
                  sellerNotesLength: sellerNotes.trim().length,
                })
              }
            >
              {quotesLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              Enviar para Aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm All Stale Prices Dialog — SCROLL-FIX-03 via handleConfirmAllDialogChange */}
      <ConfirmDialog
        open={confirmAllOpen}
        onOpenChange={handleConfirmAllDialogChange}
        variant="warning"
        title="Confirmar preços com o fornecedor?"
        description={`Você está confirmando que validou ${staleCount} preço(s) diretamente com o(s) fornecedor(es). O alerta de preço defasado será removido destes itens neste orçamento.`}
        confirmText={`Confirmar ${staleCount} preço${staleCount === 1 ? '' : 's'}`}
        cancelText="Cancelar"
        onConfirm={() => {
          confirmAllStalePrices?.();
          setConfirmSaveDraftOpen(false);
          setShowOnlyStale(false);
          toast.success(`${staleCount} preço(s) confirmado(s) com fornecedor`);
        }}
      />
    </>
  );
}
