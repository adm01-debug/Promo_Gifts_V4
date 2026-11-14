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
  /**
   * Produto dono da seleção. SEM ELE (ou com id diferente) o snapshot NÃO é
   * aplicado: a seleção é restaurada para um produto que o vendedor pode ter
   * trocado em outro dispositivo, e a foto/variante de um produto aplicada a
   * outro não é só exibição — `getProductImage()` manda essa `imageUrl` para a
   * edge, ou seja o mockup sairia gerado sobre a foto do produto errado.
   */
  productId?: string | null;
  /** Variante escolhida no seletor; null quando o produto não tem variante. */
  variant: ExternalVariantStock | null;
  colorName: string | null;
  colorHex: string | null;
  /** Foto original escolhida (thumbnail da variante ou imagem do produto). */
  imageUrl: string | null;
}

const HISTORY_KEY = 'mockup_selection_v1';
// Teto de snapshots de histórico por usuário. Cada mockup salvo gravava uma chave
// nova, sem teto e sem evicção, na MESMA cota que a guarda
// BUG-DRAFT-LOCAL-STORAGE-QUOTA (useMockupDraft) protege: estourando a cota, o
// setItem do rascunho passa a falhar e o rascunho deixa de persistir EM SILÊNCIO.
// Só as N seleções mais recentes ficam; as antigas são descartadas (o mockup em si
// continua no banco — perde-se apenas a variante/foto de um registro antigo).
const MAX_HISTORY_SNAPSHOTS = 20;

function isVariantStock(value: unknown): value is ExternalVariantStock {
  return (
    typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'string'
  );
}

/** Valida o snapshot vindo de fora (JSON/localStorage) antes de usá-lo. */
function isSnapshot(value: unknown): value is MockupSelectionSnapshot {
  if (typeof value !== 'object' || value === null) return false;
  if (!('variant' in value) || !('imageUrl' in value)) return false;
  const variant = value.variant;
  const imageUrl = value.imageUrl;
  const productId = 'productId' in value ? value.productId : null;
  return (
    (variant === null || isVariantStock(variant)) &&
    (imageUrl === null || typeof imageUrl === 'string') &&
    (productId === null || productId === undefined || typeof productId === 'string')
  );
}

/**
 * O snapshot é deste produto? Com variante, o dono é `variant.product_id` (a
 * variante carrega o produto de origem); sem variante, só o `productId` gravado
 * prova a procedência — snapshot antigo sem ele é descartado (volta ao fallback
 * `product.images[0]`, o comportamento do main) em vez de contaminar a seleção.
 */
function belongsToProduct(snapshot: MockupSelectionSnapshot, productId: string): boolean {
  if (snapshot.productId && snapshot.productId !== productId) return false;
  if (snapshot.variant) return snapshot.variant.product_id === productId;
  return snapshot.productId === productId;
}

function historyPrefix(userId: string | null | undefined): string {
  return `${HISTORY_KEY}_${userId || 'anonymous'}_`;
}

function historyKey(userId: string | null | undefined, recordId: string | null): string | null {
  return recordId ? `${historyPrefix(userId)}${recordId}` : null;
}

/** Snapshot como ele vai para o localStorage: com o instante da gravação (evicção). */
type StoredSnapshot = MockupSelectionSnapshot & { savedAt: number };

/**
 * Só o mínimo necessário para remontar a seleção. `images` (string[] de URLs da
 * variante) é o campo pesado do ExternalVariantStock e NÃO é lido na restauração
 * — o seletor mostra `imageUrl`, e a lista de fotos vem da variante recarregada.
 */
function trim(snapshot: MockupSelectionSnapshot): MockupSelectionSnapshot {
  return {
    ...snapshot,
    variant: snapshot.variant ? { ...snapshot.variant, images: null } : null,
  };
}

/** Mantém no máximo `keep` snapshots do usuário, descartando os mais antigos. */
function evictHistory(userId: string | null | undefined, keep: number, protectedKey: string): void {
  try {
    const prefix = historyPrefix(userId);
    const entries: { key: string; savedAt: number }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(prefix) || key === protectedKey) continue;
      let savedAt = 0;
      try {
        const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
        if (typeof parsed === 'object' && parsed !== null && 'savedAt' in parsed) {
          const value = parsed.savedAt;
          if (typeof value === 'number') savedAt = value;
        }
      } catch {
        savedAt = 0; // ilegível: primeira da fila de descarte
      }
      entries.push({ key, savedAt });
    }
    // `protectedKey` (a seleção recém-gravada) está fora da lista e conta no teto.
    const excess = entries.length + 1 - keep;
    if (excess <= 0) return;
    entries.sort((a, b) => a.savedAt - b.savedAt);
    for (const entry of entries.slice(0, excess)) localStorage.removeItem(entry.key);
  } catch (err) {
    logger.error('[mockupSelection] Erro ao limpar seleções antigas do histórico:', err);
  }
}

/** Fachada usada pelo gerador de mockup (rascunho + histórico). */
export const mockupSelection = {
  /** Extrai o que precisa sobreviver ao reload a partir da seleção atual. */
  snapshot(selection: MockupProductSelection | null): MockupSelectionSnapshot | null {
    if (!selection) return null;
    return {
      productId: selection.product?.id ?? null,
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
    const parsed = isSnapshot(snapshot) ? snapshot : null;
    const stored = parsed && belongsToProduct(parsed, product.id) ? parsed : null;
    if (parsed && !stored) {
      logger.warn('[mockupSelection] snapshot de outro produto descartado', {
        productId: product.id,
        snapshotProductId: parsed.productId ?? parsed.variant?.product_id ?? null,
      });
    }
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
    const stored: StoredSnapshot = { ...trim(snapshot), savedAt: Date.now() };
    try {
      localStorage.setItem(key, JSON.stringify(stored));
    } catch (err) {
      // Cota estourada: abre espaço descartando as mais antigas e tenta UMA vez.
      // Sem isso a cota cheia atinge também o setItem do rascunho (useMockupDraft).
      evictHistory(userId, Math.floor(MAX_HISTORY_SNAPSHOTS / 2), key);
      try {
        localStorage.setItem(key, JSON.stringify(stored));
      } catch (retryErr) {
        // Degradação local (quota/modo privado): o mockup já foi gerado e salvo,
        // então só registra — não aborta o fluxo do vendedor.
        logger.error('[mockupSelection] Erro ao guardar seleção do histórico:', retryErr, err);
        return;
      }
    }
    evictHistory(userId, MAX_HISTORY_SNAPSHOTS, key);
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
