/**
 * mockupSelectionSnapshot — guarda e devolve a seleção exata do vendedor
 * (produto + variante + foto) para o rascunho e o histórico do gerador.
 *
 * CRÍTICO (2026-10-09 · etapa 55 · M07): a restauração remontava a seleção com
 * `variant: null` e `product.images[0]`, devolvendo a PRIMEIRA foto do produto
 * no lugar da foto (e da variante) escolhidas. `mockup_drafts` e
 * `generated_mockups` não têm coluna para isso e o schema está congelado
 * (REGRA #8): o snapshot viaja no rascunho local (localStorage — mesmo caminho
 * da logo em data-URL) e num registro local por mockup salvo no histórico.
 * DO NOT REMOVE: é o contrato de restauração do gerador.
 */
import type { ExternalVariantStock, Product } from '@/hooks/products';
import type { MockupProductSelection } from '@/components/mockup/MockupProductSelector';
import { logger } from '@/lib/logger';

export interface MockupSelectionSnapshot {
  /** Variante escolhida no seletor; null quando o produto não tem variante. */
  variant: ExternalVariantStock | null;
  colorName: string | null;
  colorHex: string | null;
  /** Foto original escolhida (thumbnail da variante ou imagem do produto). */
  imageUrl: string | null;
}

const HISTORY_KEY = 'mockup_selection_v1';

function isVariantStock(value: unknown): value is ExternalVariantStock {
  return typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'string';
}

/** Valida o snapshot vindo de fora (JSON/localStorage) antes de usá-lo. */
function isSnapshot(value: unknown): value is MockupSelectionSnapshot {
  if (typeof value !== 'object' || value === null) return false;
  if (!('variant' in value) || !('imageUrl' in value)) return false;
  const variant = value.variant;
  const imageUrl = value.imageUrl;
  return (
    (variant === null || isVariantStock(variant)) &&
    (imageUrl === null || typeof imageUrl === 'string')
  );
}

function historyKey(userId: string | null | undefined, recordId: string | null): string | null {
  return recordId ? `${HISTORY_KEY}_${userId || 'anonymous'}_${recordId}` : null;
}

/** Fachada usada pelo gerador de mockup (rascunho + histórico). */
export const mockupSelection = {
  /** Extrai o que precisa sobreviver ao reload a partir da seleção atual. */
  snapshot(selection: MockupProductSelection | null): MockupSelectionSnapshot | null {
    if (!selection) return null;
    return {
      variant: selection.variant,
      colorName: selection.colorName ?? null,
      colorHex: selection.colorHex ?? null,
      imageUrl: selection.imageUrl || null,
    };
  },

  /**
   * Remonta a seleção com a variante e a foto persistidas. Sem snapshot (ou com
   * snapshot inválido) mantém o comportamento anterior como fallback.
   */
  restore(product: Product, snapshot: unknown): MockupProductSelection {
    const stored = isSnapshot(snapshot) ? snapshot : null;
    return {
      product,
      variant: stored?.variant ?? null,
      colorName: stored?.colorName ?? undefined,
      colorHex: stored?.colorHex ?? undefined,
      imageUrl: stored?.imageUrl || product.images?.[0] || '/placeholder.svg',
    };
  },

  /** Guarda a seleção do registro salvo no histórico (uma chave por mockup). */
  saveForHistory(
    userId: string | null | undefined,
    recordId: string | null,
    snapshot: MockupSelectionSnapshot | null,
  ): void {
    const key = historyKey(userId, recordId);
    if (!key || !snapshot) return;
    try {
      localStorage.setItem(key, JSON.stringify(snapshot));
    } catch (err) {
      // Degradação local (quota/modo privado): o mockup já foi gerado e salvo,
      // então só registra — não aborta o fluxo do vendedor.
      logger.error('[mockupSelection] Erro ao guardar seleção do histórico:', err);
    }
  },

  /** Lê a seleção do registro; null quando não há (ou está corrompida). */
  readForHistory(
    userId: string | null | undefined,
    recordId: string | null,
  ): MockupSelectionSnapshot | null {
    const key = historyKey(userId, recordId);
    if (!key) return null;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      return isSnapshot(parsed) ? parsed : null;
    } catch (err) {
      logger.error('[mockupSelection] Erro ao ler seleção do histórico:', err);
      return null;
    }
  },

  /** Limpa a seleção do registro (exclusão do mockup). */
  clearForHistory(userId: string | null | undefined, recordId: string | null): void {
    const key = historyKey(userId, recordId);
    if (!key) return;
    try {
      localStorage.removeItem(key);
    } catch (err) {
      logger.error('[mockupSelection] Erro ao limpar seleção do histórico:', err);
    }
  },
};
