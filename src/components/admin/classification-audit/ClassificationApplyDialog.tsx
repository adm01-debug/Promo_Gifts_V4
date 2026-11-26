import { Skeleton } from '@/components/ui/skeleton';
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
import { describeApplyOutcome, type ClassificationApplyRow } from '@/lib/admin/classificationAudit';

const LIMITE_PREVIA = 50;

/**
 * Prévia obrigatória antes de gravar: a primeira chamada é sempre dry-run. O
 * botão de confirmação só habilita quando há candidato, e a RPC registra a
 * aplicação na auditoria do sistema.
 */
export function ClassificationApplyDialog({
  open,
  onOpenChange,
  minMatches,
  preview,
  isApplying,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  minMatches: number;
  preview: ClassificationApplyRow[] | null;
  isApplying: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="classification-apply-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Aplicar sugestões de categoria</AlertDialogTitle>
          <AlertDialogDescription>
            Aplicação das sugestões com pelo menos {minMatches} matches que ainda não estão
            atribuídas ao produto. Cada atribuição criada fica registrada na auditoria do sistema.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 text-sm" data-testid="classification-preview">
          {isApplying && !preview ? (
            <Skeleton className="h-16 w-full" />
          ) : preview?.length === 0 ? (
            <p className="text-muted-foreground" data-testid="classification-preview-empty">
              Nenhuma sugestão atingiu o mínimo de matches informado.
            </p>
          ) : (
            <>
              <p className="font-medium" data-testid="classification-preview-summary">
                {describeApplyOutcome(preview ?? [])}
              </p>
              <ul className="max-h-48 divide-y divide-border/60 overflow-y-auto rounded-md border border-border">
                {(preview ?? []).slice(0, LIMITE_PREVIA).map((linha) => (
                  <li
                    key={`${linha.productId}-${linha.categoria}`}
                    className="flex items-center justify-between gap-2 px-3 py-1.5"
                    data-testid="classification-preview-row"
                  >
                    <span className="truncate">
                      {linha.produto} <span className="text-xs">{linha.sku}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {linha.categoria} · {linha.matches} matches
                    </span>
                  </li>
                ))}
              </ul>
              {(preview ?? []).length > LIMITE_PREVIA ? (
                <p className="text-xs text-muted-foreground">
                  Mostrando as {LIMITE_PREVIA} primeiras de {(preview ?? []).length}.
                </p>
              ) : null}
            </>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel data-testid="classification-apply-cancel">Cancelar</AlertDialogCancel>
          <AlertDialogAction
            data-testid="classification-apply-confirm"
            disabled={isApplying || !preview || preview.length === 0}
            onClick={(evento) => {
              evento.preventDefault();
              onConfirm();
            }}
          >
            Aplicar agora
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
