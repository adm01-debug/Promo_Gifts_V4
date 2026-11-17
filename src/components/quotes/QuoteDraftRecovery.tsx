/**
 * QuoteDraftRecovery — oferece de volta o rascunho local de um orçamento existente.
 *
 * O QuoteAutoSave grava `quote_draft_<quoteId>` a cada alteração, inclusive em
 * modo de edição, mas a restauração automática do useAutoSaveQuote só vale para
 * orçamento novo (useQuoteBuilderState.ts:255-257). Sem este componente as
 * alterações não salvas de um orçamento existente ficavam no localStorage,
 * invisíveis, até cleanOldQuoteDrafts apagá-las 7 dias depois.
 *
 * Decisões de comportamento:
 * - nunca restaura sozinho: sobrescrever dado do servidor sem perguntar é pior
 *   que não recuperar. O usuário decide;
 * - só oferece rascunho gravado ANTES desta montagem (o que esta sessão grava
 *   agora não é recuperação);
 * - só oferece se o rascunho diferir do que está na tela (não incomoda à toa);
 * - "Agora não" fecha sem apagar nada; só "Descartar" remove de verdade.
 */
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
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
import {
  applyDraftToBuilder,
  discardStoredQuoteDraft,
  draftDiffersFromCurrent,
  quoteDraftKey,
  readStoredQuoteDraft,
  type QuoteDraftApplyTarget,
  type QuoteDraftSnapshot,
  type StoredQuoteDraft,
} from '@/hooks/quotes/quoteDraftApply';

interface QuoteDraftRecoveryProps {
  s: QuoteDraftApplyTarget & QuoteDraftSnapshot & { quoteId?: string; isEditMode: boolean };
}

export function QuoteDraftRecovery({ s }: QuoteDraftRecoveryProps) {
  // `s` muda de identidade a cada render; o efeito só depende de quoteId/isEditMode.
  const sRef = useRef(s);
  sRef.current = s;
  const mountedAtRef = useRef(Date.now());
  const checkedForRef = useRef<string | null>(null);
  const [draft, setDraft] = useState<StoredQuoteDraft | null>(null);

  const { isEditMode, quoteId } = s;

  useEffect(() => {
    if (!isEditMode || !quoteId) return;
    if (checkedForRef.current === quoteId) return;
    checkedForRef.current = quoteId;

    const stored = readStoredQuoteDraft(quoteDraftKey(quoteId));
    if (!stored) return;
    if (stored.savedAt >= mountedAtRef.current) return;
    if (!draftDiffersFromCurrent(stored.data, sRef.current)) return;
    setDraft(stored);
  }, [isEditMode, quoteId]);

  if (!draft || !quoteId) return null;

  const handleRestore = () => {
    applyDraftToBuilder(draft.data, sRef.current);
    setDraft(null);
    toast.success('Rascunho restaurado', {
      description: 'As alterações voltaram para a tela. Salve o orçamento para gravá-las.',
    });
  };

  const handleDiscard = () => {
    discardStoredQuoteDraft(quoteDraftKey(quoteId));
    setDraft(null);
    toast.info('Rascunho descartado');
  };

  const savedAtLabel = format(new Date(draft.savedAt), "dd/MM 'às' HH:mm", { locale: ptBR });

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        // Fechar sem escolher preserva o rascunho: nada é apagado por desistência.
        if (!open) setDraft(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Alterações não salvas deste orçamento</AlertDialogTitle>
          <AlertDialogDescription>
            Encontramos alterações feitas em {savedAtLabel} que não chegaram a ser salvas no
            servidor. Quer trazê-las de volta para a tela?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="ghost" onClick={handleDiscard}>
            Descartar
          </Button>
          <AlertDialogCancel>Agora não</AlertDialogCancel>
          <AlertDialogAction onClick={handleRestore}>Restaurar alterações</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
