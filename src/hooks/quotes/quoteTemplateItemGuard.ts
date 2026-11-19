/**
 * Guarda de integridade dos itens de um template de orçamento.
 *
 * RESGATADO de `salvo/codex-fix-gate1-kit-pdf-types-261109-2252`
 * (`src/hooks/useQuoteTemplates.ts:76-128`), que nunca chegou à main. O type
 * guard e as duas mensagens PT-BR são daquele trabalho, preservados palavra por
 * palavra; o que mudou aqui foi só o lugar — módulo próprio, para não empurrar
 * `useQuoteTemplates.ts` acima do teto em `.file-size-baseline.json`.
 *
 * POR QUE ISTO EXISTE: `items` é `jsonb` sem contrato no banco, e a main
 * escrevia o que viesse (`useQuoteTemplates.ts:193` e `:253` fazem
 * `structuredClone(...) as unknown as Json`, sem olhar o conteúdo). Um item sem
 * `quantity`, com `unitPrice` string ou com `personalizations` malformado
 * entrava inteiro, e só aparecia depois — no total do orçamento, em `NaN`, ou
 * numa tela que não renderiza.
 *
 * A guarda é de ESCRITA, de propósito: recusar antes de gravar protege o dado
 * e devolve uma frase que o vendedor entende. A leitura do que JÁ está gravado
 * torto continua passando (`transformTemplates`), porque sinalizar isso na tela
 * mexe no tipo público e nos consumidores — fica registrado em
 * `docs/agentes/resgates/` como continuação, não como esquecimento.
 */
import type { QuoteTemplateItem } from './quoteTemplateTypes';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/** Campo ausente passa; presente tem de bater com o predicado. */
function optionalFieldMatches(
  value: Record<string, unknown>,
  fields: readonly string[],
  predicate: (entry: unknown) => boolean,
): boolean {
  return fields.every((field) => value[field] === undefined || predicate(value[field]));
}

export function isQuoteTemplateItem(value: unknown): value is QuoteTemplateItem {
  if (
    !isRecord(value) ||
    typeof value.productName !== 'string' ||
    !isFiniteNumber(value.quantity) ||
    !isFiniteNumber(value.unitPrice)
  ) {
    return false;
  }
  if (
    !optionalFieldMatches(
      value,
      ['productId', 'productSku', 'productImageUrl', 'colorName', 'colorHex'],
      isString,
    )
  ) {
    return false;
  }
  if (value.personalizations === undefined) return true;
  return (
    Array.isArray(value.personalizations) &&
    value.personalizations.every(
      (entry: unknown) =>
        isRecord(entry) &&
        typeof entry.techniqueId === 'string' &&
        typeof entry.techniqueName === 'string' &&
        optionalFieldMatches(
          entry,
          ['colorsCount', 'positionsCount', 'unitCost', 'setupCost'],
          isFiniteNumber,
        ),
    )
  );
}

export interface ValidacaoDeItens {
  /** Itens aprovados, ou `null` quando algum item reprovou. */
  items_data: QuoteTemplateItem[] | null;
  /** Mensagem pronta para o vendedor, ou `null` quando está tudo certo. */
  items_error: string | null;
}

/**
 * Valida item a item. Para no primeiro inválido e diz QUAL é, por posição —
 * dizer só "tem item inválido" num template de 20 itens não ajuda ninguém.
 */
export function validateTemplateItems(value: unknown): ValidacaoDeItens {
  if (!Array.isArray(value)) {
    return {
      items_data: null,
      items_error:
        'Os itens deste template precisam de revisão. Os dados originais foram preservados.',
    };
  }
  const items: QuoteTemplateItem[] = [];
  for (const [index, entry] of value.entries()) {
    if (!isQuoteTemplateItem(entry)) {
      return {
        items_data: null,
        items_error: `O item ${index + 1} contém dados incompletos ou inválidos. Os dados originais foram preservados.`,
      };
    }
    items.push(entry);
  }
  return { items_data: items, items_error: null };
}
