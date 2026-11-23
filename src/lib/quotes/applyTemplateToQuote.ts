/**
 * applyTemplateToQuote — aplica um template de orçamento ao construtor.
 *
 * RESGATE: a #3817 devolveu a tela de templates (`/orcamentos/templates`:
 * criar, editar, listar, exportar) e o `SaveAsTemplateButton` grava o
 * orçamento atual como template. Faltava o caminho de volta: `QuoteTemplatesList`
 * já expõe `onApplyTemplate` e `selectionMode` (QuoteTemplatesList.tsx:60,63) e
 * NENHUM consumidor passava os dois — ou seja, template podia ser salvo e nunca
 * usado. O componente que fazia esse papel estava em
 * `recovery/src-legacy/src/components/quotes/QuoteTemplateSelector.tsx`.
 *
 * Este módulo é o inverso exato de `toTemplateItems`
 * (src/pages/quotes/components/QuoteBuilderNotesCard.tsx:12).
 *
 * DECISÕES DE NEGÓCIO, explícitas porque mudam o que o vendedor vê:
 *
 * 1. `QuoteItem.product_id` é OBRIGATÓRIO (quoteTypes.ts:28) e `productId` do
 *    template é OPCIONAL. Item de template sem `productId` NÃO é aplicado e NÃO
 *    recebe id inventado: ele é contado em `itensIgnorados` para a tela dizer
 *    quantos e por quê. Inventar id criaria item órfão no orçamento.
 * 2. `price_updated_at` fica ausente de propósito. O preço do template é o que o
 *    vendedor salvou, não a última atualização do fornecedor (SSOT). Ausente, o
 *    badge de frescor classifica como `unknown` — "não sabemos" — em vez de
 *    afirmar que o preço está fresco.
 * 3. Campos comerciais só sobrescrevem quando o template TEM valor. Template sem
 *    `notes` não apaga a observação que o vendedor já escreveu.
 * 4. O desconto é aplicado e passa pela validação de limite do vendedor que já
 *    existe (`maxDiscountPercent`/`isDiscountExceeded`): este módulo não a
 *    contorna nem a silencia.
 * 5. Substituir os itens é decisão do chamador (o diálogo confirma quando o
 *    orçamento já tem itens). Aqui a aplicação é sempre substituição, para não
 *    duplicar item silenciosamente.
 */
import type { QuoteTemplate, QuoteTemplateItem } from '@/hooks/quotes/useQuoteTemplates';
import { calcPersonalizationTotalCost } from './templateTotal';
import type { QuoteItem } from '@/hooks/quotes/quoteTypes';

/** Setters do construtor que a aplicação de template usa. */
export interface ApplyTemplateTarget {
  setItems: (items: QuoteItem[]) => void;
  setDiscountType: (tipo: 'amount' | 'percent') => void;
  setDiscountValue: (valor: number) => void;
  setNotes: (valor: string) => void;
  setPaymentTerms: (valor: string) => void;
  setDeliveryTime: (valor: string) => void;
  setValidityDays: (valor: string) => void;
}

export interface ApplyTemplateResult {
  itensAplicados: number;
  /** Itens do template sem `productId`: não há como referenciar o produto. */
  itensIgnorados: number;
  /** Campos comerciais efetivamente sobrescritos, para a mensagem ao vendedor. */
  camposAplicados: string[];
}

function numeroFinitoPositivo(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null;
}

function numeroFinito(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function textoPreenchido(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v : null;
}

/**
 * Inverso de `toTemplateItems`. Devolve só os itens aplicáveis; o chamador
 * compara o tamanho com o do template para saber quantos ficaram de fora.
 */
export function fromTemplateItems(itens: QuoteTemplateItem[]): QuoteItem[] {
  const saida: QuoteItem[] = [];
  itens.forEach((item) => {
    const productId = textoPreenchido(item.productId);
    if (!productId) return; // decisão 1: sem product_id não entra
    const quantidade = numeroFinitoPositivo(item.quantity) ?? 1;
    const preco = numeroFinito(item.unitPrice) ?? 0;
    const convertido: QuoteItem = {
      product_id: productId,
      product_name: textoPreenchido(item.productName) ?? 'Produto sem nome',
      quantity: quantidade,
      unit_price: preco,
      subtotal: quantidade * preco,
      sort_order: saida.length,
    };
    const sku = textoPreenchido(item.productSku);
    if (sku) convertido.product_sku = sku;
    const imagem = textoPreenchido(item.productImageUrl);
    if (imagem) convertido.product_image_url = imagem;
    const cor = textoPreenchido(item.colorName);
    if (cor) convertido.color_name = cor;
    const hex = textoPreenchido(item.colorHex);
    if (hex) convertido.color_hex = hex;
    if (item.personalizations && item.personalizations.length > 0) {
      const personalizacoes = item.personalizations.flatMap((p) => {
        const techniqueId = textoPreenchido(p.techniqueId);
        if (!techniqueId) return [];
        return [
          {
            technique_id: techniqueId,
            technique_name: textoPreenchido(p.techniqueName) ?? undefined,
            colors_count: numeroFinito(p.colorsCount) ?? undefined,
            positions_count: numeroFinito(p.positionsCount) ?? undefined,
            unit_cost: numeroFinito(p.unitCost) ?? undefined,
            setup_cost: numeroFinito(p.setupCost) ?? undefined,
            total_cost: calcPersonalizationTotalCost(
              { unitCost: p.unitCost, setupCost: p.setupCost },
              item.quantity,
            ),
          },
        ];
      });
      if (personalizacoes.length > 0) {
        convertido.personalizations = personalizacoes;
        convertido.has_personalization = true;
      }
    }
    saida.push(convertido);
  });
  return saida;
}

export function applyTemplateToQuote(
  template: QuoteTemplate,
  s: ApplyTemplateTarget,
): ApplyTemplateResult {
  const doTemplate = Array.isArray(template.items) ? template.items : [];
  const itens = fromTemplateItems(doTemplate);
  s.setItems(itens);

  const camposAplicados: string[] = [];
  if (itens.length > 0) camposAplicados.push('itens');

  // Decisão 4: percentual tem precedência quando os dois vêm preenchidos,
  // porque é a forma que o limite do vendedor usa.
  const percentual = numeroFinitoPositivo(template.discount_percent);
  const valor = numeroFinitoPositivo(template.discount_amount);
  if (percentual !== null) {
    s.setDiscountType('percent');
    s.setDiscountValue(percentual);
    camposAplicados.push('desconto');
  } else if (valor !== null) {
    s.setDiscountType('amount');
    s.setDiscountValue(valor);
    camposAplicados.push('desconto');
  }

  // Decisão 3: só sobrescreve o que o template realmente tem.
  const notas = textoPreenchido(template.notes);
  if (notas) {
    s.setNotes(notas);
    camposAplicados.push('observações');
  }
  const condicoes = textoPreenchido(template.payment_terms);
  if (condicoes) {
    s.setPaymentTerms(condicoes);
    camposAplicados.push('condições de pagamento');
  }
  const prazo = textoPreenchido(template.delivery_time);
  if (prazo) {
    s.setDeliveryTime(prazo);
    camposAplicados.push('prazo de entrega');
  }
  const validade = numeroFinitoPositivo(template.validity_days);
  if (validade !== null) {
    s.setValidityDays(String(validade));
    camposAplicados.push('validade');
  }

  return {
    itensAplicados: itens.length,
    itensIgnorados: doTemplate.length - itens.length,
    camposAplicados,
  };
}
