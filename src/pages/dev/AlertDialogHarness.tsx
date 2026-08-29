/**
 * Harness dev-only para validação visual do AlertDialog "cru" com o mesmo
 * dimensionamento aplicado em `QuoteItemEditorSheet` (`!max-w-[358px] w-[92vw]`).
 *
 * Rota: /__test/alert-dialog?width=180
 * Sem auth, sem side-effects. Usado pelo spec `e2e/ui/alert-dialog-visual.spec.ts`.
 */
import { useSearchParams } from 'react-router-dom';
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

export default function AlertDialogHarness() {
  const [params] = useSearchParams();
  const width = Number(params.get('width') ?? '400');

  return (
    <div
      className="min-h-dvh w-full bg-background p-4"
      data-testid="harness-ready"
      data-harness-width={String(width)}
    >
      <div className="mx-auto" style={{ maxWidth: `${width}px` }}>
        <AlertDialog open>
          <AlertDialogContent
            data-testid="alert-dialog-content"
            className="w-[92vw] !max-w-[358px]"
          >
            <AlertDialogHeader>
              <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
              <AlertDialogDescription>
                Você tem alterações não salvas neste item. Deseja realmente fechar e descartá-las?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                data-testid="alert-dialog-cancel"
                className="max-[219px]:h-auto max-[219px]:min-h-[44px] max-[219px]:w-full max-[219px]:min-w-0 max-[219px]:max-w-full max-[219px]:whitespace-normal max-[219px]:px-2 max-[219px]:py-1 max-[219px]:text-xs max-[219px]:leading-tight"
              >
                Continuar editando
              </AlertDialogCancel>
              <AlertDialogAction
                data-testid="alert-dialog-confirm"
                className="max-[219px]:h-auto max-[219px]:min-h-[44px] max-[219px]:w-full max-[219px]:min-w-0 max-[219px]:max-w-full max-[219px]:whitespace-normal max-[219px]:px-2 max-[219px]:py-1 max-[219px]:text-xs max-[219px]:leading-tight"
              >
                Descartar e fechar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
