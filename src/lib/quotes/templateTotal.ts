/**
 * Total de um template de orçamento — ou `null` quando não dá para calcular.
 *
 * RESGATE: `tests/components/QuoteTemplatePreservation.test.tsx`, escrito por
 * outro agente na branch `salvo/codex-fix-gate1-kit-pdf-types-261109-2252`,
 * especificava um estado de "template incompleto" com o texto **"Valor
 * indisponível"** e afirmava, em 3 casos, que a tela **nunca** mostra
 * `R$ 0,00` para um template cujos itens não puderam ser lidos. A `main` não
 * tinha esse estado — e tinha o defeito que ele denuncia.
 *
 * Medido em 2026-11-18: `quote_templates.items` é `jsonb`, então o conteúdo é o
 * que alguém gravou, não um contrato. As três telas calculavam
 * `item.quantity * item.unitPrice` **sem guarda** —
 * `QuoteTemplatesList.tsx:103`, `AdminTemplatesManager.tsx:83`,
 * `QuoteTemplateForm.tsx:89`. Um item sem `quantity` ou sem `unitPrice` produz
 * `NaN`, o `reduce` propaga, e `Intl.NumberFormat` imprime **"R$ NaN"** na tela
 * do vendedor.
 *
 * A decisão aqui é a do autor original: não inventar número. Item inutilizável
 * ⇒ `null` ⇒ a tela diz "Valor indisponível".
 */
import type { QuoteTemplateItem } from '@/hooks/quotes/useQuoteTemplates';

/**
 * Forma mínima para calcular um total. Serve tanto para `QuoteTemplate` (linha
 * salva) quanto para `CreateTemplateInput` (formulário em edição), que é o
 * mesmo cálculo nas duas telas.
 */
export interface EntradaDeTotal {
  items?: QuoteTemplateItem[] | null;
  discount_percent?: number | null;
  discount_amount?: number | null;
}

/**
 * Calcula o custo total de uma personalização de template para uma quantidade.
 * Fórmula canônica: unitCost × qty + setupCost
 */
export function calcPersonalizationTotalCost(
  p: { unitCost?: number | null; setupCost?: number | null },
  qty: number,
): number {
  const unit = typeof p.unitCost === 'number' && Number.isFinite(p.unitCost) ? p.unitCost : 0;
  const setup = typeof p.setupCost === 'number' && Number.isFinite(p.setupCost) ? p.setupCost : 0;
  return unit * qty + setup;
}

function numeroUsavel(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** Item com quantidade e preço legíveis. Qualquer outra coisa inviabiliza o total. */
export function itemTemplateEhCalculavel(item: QuoteTemplateItem): boolean {
  return numeroUsavel(item.quantity) && numeroUsavel(item.unitPrice);
}

/**
 * Total do template (itens + personalização − desconto), ou `null` quando
 * qualquer item não é calculável. Nunca devolve `NaN`.
 */
export function totalDoTemplate(template: EntradaDeTotal): number | null {
  const itens = Array.isArray(template.items) ? template.items : [];
  if (itens.some((item) => !itemTemplateEhCalculavel(item))) return null;

  const itemsTotal = itens.reduce((sum, item) => {
    const personalizationCost =
      item.personalizations?.reduce(
        (pSum, p) =>
          pSum +
          (numeroUsavel(p.unitCost) ? p.unitCost : 0) * item.quantity +
          (numeroUsavel(p.setupCost) ? p.setupCost : 0),
        0,
      ) ?? 0;
    return sum + item.quantity * item.unitPrice + personalizationCost;
  }, 0);

  const percentual = numeroUsavel(template.discount_percent) ? template.discount_percent : 0;
  const valor = numeroUsavel(template.discount_amount) ? template.discount_amount : 0;
  const discountValue = percentual > 0 ? itemsTotal * (percentual / 100) : valor;

  const total = itemsTotal - discountValue;
  return Number.isFinite(total) ? total : null;
}

/** Texto que a tela mostra quando o total não pode ser calculado. */
export const VALOR_INDISPONIVEL = 'Valor indisponível';

/**
 * Subtotal de UM item (quantidade × preço), já formatado — ou o aviso quando o
 * item não tem os dois números. A linha do item no formulário imprimia
 * `R$ NaN` pelo mesmo motivo que o total.
 */
export function textoDoSubtotalDoItem(
  item: QuoteTemplateItem,
  formatCurrency: (value: number) => string,
): string {
  if (!itemTemplateEhCalculavel(item)) return VALOR_INDISPONIVEL;
  return formatCurrency(item.quantity * item.unitPrice);
}

/**
 * Total já pronto para a tela: moeda quando dá para calcular, o aviso quando
 * não dá. Existe para que nenhuma das telas repita o `=== null`.
 */
export function textoDoTotal(
  template: EntradaDeTotal,
  formatCurrency: (value: number) => string,
): string {
  const total = totalDoTemplate(template);
  return total === null ? VALOR_INDISPONIVEL : formatCurrency(total);
}
