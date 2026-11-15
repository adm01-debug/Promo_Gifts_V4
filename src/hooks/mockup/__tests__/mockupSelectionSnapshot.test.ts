/**
 * Contrato do snapshot de seleção: a QUEM ele pertence e quanto ele ocupa.
 *
 * Regressão fechada aqui (auditoria 2026-11-14): o snapshot era aplicado a
 * qualquer produto sem conferir a procedência. Como `getProductImage()` manda a
 * `imageUrl` da seleção para a edge, o mockup saía GERADO sobre a foto do
 * produto errado — não era só exibição.
 *
 * Segunda regressão: uma chave `mockup_selection_v1_<uid>_<recordId>` por mockup
 * salvo, sem teto e com o ExternalVariantStock inteiro (incluindo `images`),
 * consome a MESMA cota que a guarda BUG-DRAFT-LOCAL-STORAGE-QUOTA protege em
 * useMockupDraft — ao estourar, o rascunho para de persistir em silêncio.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { toast } from 'sonner';
import {
  mockupSelection,
  type MockupSelectionSnapshot,
} from '@/hooks/mockup/mockupSelectionSnapshot';
import type { ExternalVariantStock, Product } from '@/hooks/products';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const FOTO_P1 = 'https://cdn.test/prod-1-foto-3.jpg';
const FOTO_P2 = 'https://cdn.test/prod-2-foto-1.jpg';

const PROD_1 = {
  id: 'prod-1',
  name: 'Caneca',
  images: ['https://cdn.test/prod-1-foto-1.jpg'],
} as unknown as Product;
const PROD_2 = { id: 'prod-2', name: 'Copo', images: [FOTO_P2] } as unknown as Product;

const VARIANTE_P1 = {
  id: 'var-B',
  product_id: 'prod-1',
  color_name: 'Azul',
  color_hex: '#0000ff',
  selected_thumbnail: FOTO_P1,
  images: ['https://cdn.test/prod-1-foto-1.jpg', FOTO_P1, 'https://cdn.test/prod-1-foto-9.jpg'],
} as unknown as ExternalVariantStock;

const SNAP_P1: MockupSelectionSnapshot = {
  productId: 'prod-1',
  variant: VARIANTE_P1,
  colorName: 'Azul',
  colorHex: '#0000ff',
  imageUrl: FOTO_P1,
};

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('mockupSelection.restore — o snapshot só vale para o produto dono', () => {
  it('aplica a variante e a foto quando o snapshot é do mesmo produto', () => {
    const selection = mockupSelection.restore(PROD_1, SNAP_P1);
    expect(selection.variant?.id).toBe('var-B');
    expect(selection.colorName).toBe('Azul');
    expect(selection.imageUrl).toBe(FOTO_P1);
  });

  it('descarta o snapshot de outro produto (não cola foto nem variante do prod-1 no prod-2)', () => {
    const selection = mockupSelection.restore(PROD_2, SNAP_P1);
    expect(selection.product.id).toBe('prod-2');
    expect(selection.variant).toBeNull();
    expect(selection.colorName).toBeUndefined();
    expect(selection.imageUrl).toBe(FOTO_P2);
  });

  it('descarta quando só a variante é de outro produto (productId batendo)', () => {
    const forjado: MockupSelectionSnapshot = { ...SNAP_P1, productId: 'prod-2' };
    const selection = mockupSelection.restore(PROD_2, forjado);
    expect(selection.variant).toBeNull();
    expect(selection.imageUrl).toBe(FOTO_P2);
  });

  it('snapshot antigo sem productId e sem variante não é aplicado (procedência não verificável)', () => {
    const antigo = { variant: null, colorName: null, colorHex: null, imageUrl: FOTO_P1 };
    const selection = mockupSelection.restore(PROD_2, antigo);
    expect(selection.imageUrl).toBe(FOTO_P2);
  });

  it('snapshot antigo sem productId vale pela variante do próprio produto', () => {
    const antigo = { variant: VARIANTE_P1, colorName: 'Azul', colorHex: null, imageUrl: FOTO_P1 };
    const selection = mockupSelection.restore(PROD_1, antigo);
    expect(selection.variant?.id).toBe('var-B');
    expect(selection.imageUrl).toBe(FOTO_P1);
  });
});

describe('mockupSelection.saveForHistory — teto de cota do localStorage', () => {
  const keys = () =>
    Object.keys(localStorage).filter((k) => k.startsWith('mockup_selection_v1_user-1_'));

  it('guarda só o mínimo: `images` da variante não vai para o localStorage', () => {
    mockupSelection.saveForHistory('user-1', 'rec-1', SNAP_P1);
    const raw = localStorage.getItem('mockup_selection_v1_user-1_rec-1') ?? '';
    expect(raw).not.toContain('prod-1-foto-9');
    const lido = mockupSelection.readForHistory('user-1', 'rec-1');
    expect(lido?.variant?.id).toBe('var-B');
    expect(lido?.variant?.images).toBeNull();
    expect(lido?.imageUrl).toBe(FOTO_P1);
  });

  it('não passa de 20 chaves: as mais antigas são descartadas', () => {
    for (let i = 1; i <= 25; i++) {
      mockupSelection.saveForHistory('user-1', `rec-${i}`, {
        ...SNAP_P1,
        imageUrl: `${FOTO_P1}?${i}`,
      });
    }
    expect(keys().length).toBeLessThanOrEqual(20);
    expect(mockupSelection.readForHistory('user-1', 'rec-25')).not.toBeNull();
    expect(mockupSelection.readForHistory('user-1', 'rec-1')).toBeNull();
  });

  it('cota estourada: abre espaço e grava a seleção nova em vez de desistir', () => {
    for (let i = 1; i <= 10; i++) {
      mockupSelection.saveForHistory('user-1', `rec-${i}`, SNAP_P1);
    }
    const antes = keys().length;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });

    mockupSelection.saveForHistory('user-1', 'rec-novo', SNAP_P1);

    expect(mockupSelection.readForHistory('user-1', 'rec-novo')).not.toBeNull();
    expect(keys().length).toBeLessThan(antes + 1);
  });

  it('não toca nas chaves de outro usuário nem no rascunho', () => {
    localStorage.setItem('mockup_draft_v1_user-1_default', '{"productId":"prod-1"}');
    mockupSelection.saveForHistory('user-2', 'rec-x', SNAP_P1);
    for (let i = 1; i <= 25; i++) mockupSelection.saveForHistory('user-1', `rec-${i}`, SNAP_P1);

    expect(mockupSelection.readForHistory('user-2', 'rec-x')).not.toBeNull();
    expect(localStorage.getItem('mockup_draft_v1_user-1_default')).not.toBeNull();
  });
});

describe('mockupSelection — falha definitiva avisa o vendedor', () => {
  it('escrita que falha mesmo depois de abrir espaco: avisa em vez de sumir calado', () => {
    const original = Storage.prototype.setItem;
    const falhaDeCota = () => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    };
    Storage.prototype.setItem = falhaDeCota as typeof original;
    try {
      mockupSelection.saveForHistory('user-1', 'rec-cota', SNAP_P1);
    } finally {
      Storage.prototype.setItem = original;
    }

    expect(toast.error).toHaveBeenCalledWith(
      'Não foi possível guardar a variante e a foto escolhidas neste mockup.',
    );
  });

  it('leitura que falha: avisa em vez de devolver null calado', () => {
    localStorage.setItem('mockup_selection_v1_user-1_rec-ruim', '{isso nao e json');

    expect(mockupSelection.readForHistory('user-1', 'rec-ruim')).toBeNull();
    expect(toast.error).toHaveBeenCalledWith(
      'Não foi possível restaurar a variante e a foto deste mockup.',
    );
  });
});
