/**
 * QuoteDraftRecovery — oferece de volta o rascunho local de um orçamento existente.
 *
 * O QuoteAutoSave grava `quote_draft_<quoteId>` a cada alteração, inclusive em
 * modo de edição, mas a restauração automática do useAutoSaveQuote só vale para
 * orçamento novo (useQuoteBuilderState.ts:255-257). Sem este componente as
 * alterações não salvas de um orçamento existente ficavam no localStorage,
 * invisíveis, até cleanOldQuoteDrafts apagá-las 7 dias depois.
 *
 * O contrato aqui vem do tests/components/QuoteAutoSave.recovery.test.tsx escrito
 * por outro agente na branch salvo/codex-fix-gate1-kit-pdf-types-261109-2252.
 * Aquele arquivo especifica a feature para um QuoteAutoSave que tinha botão
 * "Restaurar rascunho" embutido — UI que a main nunca teve. A especificação dele
 * é honrada aqui:
 * - "does not restore automatically": nunca restaura sozinho. Sobrescrever dado
 *   do servidor sem perguntar é pior que não recuperar;
 * - "keeps a rejected snapshot available and displays the real error": rascunho
 *   que existe mas não pode ser lido é DITO ao vendedor e NÃO é apagado;
 * - "invokes an asynchronous recovery once even with duplicate clicks": clique
 *   duplo em Restaurar aplica uma única vez;
 * - "reads each quote independently": a chave é por quoteId e a checagem roda uma
 *   vez por quoteId.
 *
 * Mais duas decisões próprias:
 * - só oferece rascunho gravado ANTES desta montagem (o que esta sessão grava
 *   agora não é recuperação);
 * - "Agora não" fecha sem apagar; só "Descartar" remove, e aí remove o histórico.
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
  inspectStoredQuoteDraft,
  quoteDraftKey,
  type MotivoIlegivel,
  type QuoteDraftApplyTarget,
  type QuoteDraftSnapshot,
  type StoredQuoteDraft,
} from '@/hooks/quotes/quoteDraftApply';

interface QuoteDraftRecoveryProps {
  s: QuoteDraftApplyTarget & QuoteDraftSnapshot & { quoteId?: string; isEditMode: boolean };
}

type Oferta =
  { tipo: 'ilegivel'; motivo: MotivoIlegivel } | { tipo: 'rascunho'; draft: StoredQuoteDraft };

const TEXTO_ILEGIVEL: Record<MotivoIlegivel, string> = {
  inacessivel: 'o navegador bloqueou o acesso ao armazenamento local',
  'json-invalido': 'o arquivo do rascunho está corrompido',
  'envelope-invalido': 'o arquivo do rascunho está em formato desconhecido',
  'data-invalida': 'o rascunho não tem data de gravação válida',
  'fora-de-forma': 'o rascunho tem campos incompatíveis com esta versão do sistema',
};

export function QuoteDraftRecovery({ s }: QuoteDraftRecoveryProps) {
  // `s` muda de identidade a cada render; o efeito só depende de quoteId/isEditMode.
  const sRef = useRef(s);
  sRef.current = s;
  const mountedAtRef = useRef(Date.now());
  const checkedForRef = useRef<string | null>(null);
  const restaurandoRef = useRef(false);
  const [oferta, setOferta] = useState<Oferta | null>(null);

  const { isEditMode, quoteId } = s;

  useEffect(() => {
    if (!isEditMode || !quoteId) return;
    if (checkedForRef.current === quoteId) return;
    checkedForRef.current = quoteId;

    const resultado = inspectStoredQuoteDraft(quoteDraftKey(quoteId));
    if (resultado.estado === 'ausente') return;
    if (resultado.estado === 'ilegivel') {
      setOferta({ tipo: 'ilegivel', motivo: resultado.motivo });
      return;
    }
    const { draft } = resultado;
    if (draft.savedAt >= mountedAtRef.current) return;
    if (!draftDiffersFromCurrent(draft.data, sRef.current)) return;
    setOferta({ tipo: 'rascunho', draft });
  }, [isEditMode, quoteId]);

  if (!oferta || !quoteId) return null;

  const handleRestore = () => {
    // Idempotência: aplicar duas vezes duplicaria itens do orçamento.
    if (restaurandoRef.current || oferta.tipo !== 'rascunho') return;
    restaurandoRef.current = true;
    applyDraftToBuilder(oferta.draft.data, sRef.current);
    setOferta(null);
    toast.success('Rascunho restaurado', {
      description: 'As alterações voltaram para a tela. Salve o orçamento para gravá-las.',
    });
  };

  const handleDiscard = () => {
    discardStoredQuoteDraft(quoteDraftKey(quoteId));
    setOferta(null);
    toast.info('Rascunho descartado');
  };

  const ilegivel = oferta.tipo === 'ilegivel';
  const savedAtLabel = ilegivel
    ? ''
    : format(new Date(oferta.draft.savedAt), "dd/MM 'às' HH:mm", { locale: ptBR });

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        // Fechar sem escolher preserva o rascunho: nada é apagado por desistência.
        if (!open) setOferta(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {ilegivel
              ? 'Há um rascunho deste orçamento que não pôde ser lido'
              : 'Alterações não salvas deste orçamento'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {ilegivel ? (
              <>
                Existe um rascunho gravado para este orçamento, mas{' '}
                {TEXTO_ILEGIVEL[oferta.motivo]}. Ele não foi apagado: se precisar, a equipe técnica
                ainda pode recuperá-lo.
              </>
            ) : (
              <>
                Encontramos alterações feitas em {savedAtLabel} que não chegaram a ser salvas no
                servidor. Quer trazê-las de volta para a tela?
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="ghost" onClick={handleDiscard}>
            Descartar
          </Button>
          <AlertDialogCancel>Agora não</AlertDialogCancel>
          {!ilegivel && (
            <AlertDialogAction onClick={handleRestore}>Restaurar alterações</AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
