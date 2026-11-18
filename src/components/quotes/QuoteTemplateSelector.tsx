/**
 * QuoteTemplateSelector — escolhe um template e aplica ao orçamento aberto.
 *
 * RESGATE de `recovery/src-legacy/src/components/quotes/QuoteTemplateSelector.tsx`
 * (outro agente). Sem ele, desde a #3817 era possível criar, editar, listar,
 * exportar e salvar template, mas NÃO aplicar nenhum a um orçamento:
 * `QuoteTemplatesList` já expunha `onApplyTemplate`/`selectionMode` e nenhum
 * consumidor passava os dois.
 *
 * O que foi acrescentado ao original: a CONFIRMAÇÃO. Aplicar substitui os itens
 * do orçamento (ver decisão 5 em src/lib/quotes/applyTemplateToQuote.ts), então
 * com itens na tela o vendedor é avisado antes, e o texto diz exatamente quantos
 * itens serão substituídos. O original aplicava direto.
 */
import { useState } from 'react';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { QuoteTemplatesList } from '@/components/quotes/QuoteTemplatesList';
import type { QuoteTemplate } from '@/hooks/quotes/useQuoteTemplates';
import { applyTemplateToQuote, type ApplyTemplateTarget } from '@/lib/quotes/applyTemplateToQuote';

interface QuoteTemplateSelectorProps {
  /** Quantidade de itens já no orçamento — decide se precisa confirmar. */
  itemCount: number;
  s: ApplyTemplateTarget;
}

export function QuoteTemplateSelector({ itemCount, s }: QuoteTemplateSelectorProps) {
  const [listaAberta, setListaAberta] = useState(false);
  const [aConfirmar, setAConfirmar] = useState<QuoteTemplate | null>(null);

  const aplicar = (template: QuoteTemplate) => {
    const r = applyTemplateToQuote(template, s);
    setListaAberta(false);
    setAConfirmar(null);

    if (r.itensAplicados === 0 && r.camposAplicados.length === 0) {
      toast.warning('Nada foi aplicado', {
        description:
          r.itensIgnorados > 0
            ? `Os ${r.itensIgnorados} itens deste template não têm produto vinculado, então não podem entrar no orçamento.`
            : 'Este template está vazio.',
      });
      return;
    }

    const partes = [
      `${r.itensAplicados} item(ns)`,
      ...r.camposAplicados.filter((c) => c !== 'itens'),
    ];
    toast.success('Template aplicado', {
      description:
        r.itensIgnorados > 0
          ? `${partes.join(', ')}. ${r.itensIgnorados} item(ns) sem produto vinculado ficaram de fora.`
          : `${partes.join(', ')}. Confira os preços antes de enviar.`,
    });
  };

  const escolher = (template: QuoteTemplate) => {
    // Com itens na tela, substituir é destrutivo: pergunta primeiro.
    if (itemCount > 0) {
      setAConfirmar(template);
      return;
    }
    aplicar(template);
  };

  return (
    <>
      <Dialog open={listaAberta} onOpenChange={setListaAberta}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" data-testid="quote-use-template">
            <FileText className="mr-2 h-4 w-4" />
            Usar template
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Selecionar template</DialogTitle>
            <DialogDescription>
              Escolha um template para preencher o orçamento. Os preços salvos no template podem
              estar desatualizados — confira antes de enviar ao cliente.
            </DialogDescription>
          </DialogHeader>
          <QuoteTemplatesList onApplyTemplate={escolher} selectionMode />
        </DialogContent>
      </Dialog>

      <AlertDialog open={aConfirmar !== null} onOpenChange={(open) => !open && setAConfirmar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Substituir os itens deste orçamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O orçamento tem {itemCount} item(ns). Aplicar o template
              {aConfirmar ? ` "${aConfirmar.name}"` : ''} substitui todos eles pelos itens do
              template. Observações, desconto, condições de pagamento, prazo e validade também são
              sobrescritos quando o template tiver esses campos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => aConfirmar && aplicar(aConfirmar)}>
              Substituir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
