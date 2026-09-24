/**
 * magazineService — shape-drift observability regression
 *
 * Achado da auditoria de 2026-09-24: rowToItem/rowToMagazine fazem cast
 * cego (`as unknown as T`) dos campos JSONB do banco. Isso nunca quebra a
 * leitura (comportamento intencional), mas também nunca deu visibilidade
 * de quando o dado persistido diverge do shape esperado — exatamente o
 * tipo de gap que já causou 2 crashes reais em templates (PR #1899).
 *
 * Estes testes provam as duas metades do contrato:
 *  1. Um product_snapshot/branding com shape divergente ainda é lido e
 *     devolvido normalmente (log é OBSERVABILIDADE, nunca bloqueia).
 *  2. `logger.warn` é chamado com o campo e o id da linha quando (e só
 *     quando) o shape diverge — dado bem formado não gera ruído.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockMagazineRow = {
  id: 'mag_drift_1',
  owner_id: 'user_x',
  organization_id: null,
  title: 'Drift Test Magazine',
  subtitle: 'ok',
  template_id: 'editorial-vogue',
  branding: { clientName: 'ACME', colors: { primary: '#111', secondary: '#222', text: '#333' } },
  content_settings: { showPrice: true },
  page_order: null,
  status: 'draft',
  public_token: null,
  published_at: null,
  view_count: 0,
  archived_at: null,
  deleted_at: null,
  created_at: '2026-09-24T00:00:00Z',
  updated_at: '2026-09-24T00:00:00Z',
  edit_version: 0,
};

// product_snapshot legado: sem colors/materials (o shape exato que crashava
// os templates antes do fix em PR #1899).
const legacyItemRow = {
  id: 'item_legacy',
  magazine_id: 'mag_drift_1',
  product_id: 'prod_legacy',
  product_snapshot: {
    id: 'prod_legacy',
    name: 'Produto legado',
    sku: 'SKU-LEGACY',
    price: 10,
    shortDescription: '',
    description: null,
    image_url: 'https://example.com/x.png',
    images: [],
    category_name: null,
    category_id: null,
    hasPersonalization: null,
    // colors/materials ausentes de propósito
  },
  variant_color_name: null,
  position: 0,
  page_number: null,
  overrides: {},
  created_at: '2026-09-24T00:00:00Z',
  updated_at: '2026-09-24T00:00:00Z',
};

const wellFormedItemRow = {
  ...legacyItemRow,
  id: 'item_ok',
  product_snapshot: {
    ...legacyItemRow.product_snapshot,
    id: 'prod_ok',
    colors: [],
    materials: [],
  },
};

const loggerWarn = vi.fn();
vi.mock('@/lib/logger', () => ({ logger: { warn: loggerWarn, error: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/telemetry/requestId', () => ({
  newRequestId: () => 'req_test',
  REQUEST_ID_HEADER: 'X-Request-Id',
}));

vi.mock('@/integrations/supabase/magazine-schema', () => {
  const makeChain = (result: unknown) => {
    const chain: Record<string, unknown> = {};
    ['select', 'eq', 'is', 'order'].forEach((m) => {
      chain[m] = vi.fn(() => chain);
    });
    chain.maybeSingle = vi.fn(() => Promise.resolve(result));
    Object.defineProperty(chain, 'then', {
      value: (res: (v: unknown) => unknown) => Promise.resolve(result).then(res),
    });
    return chain;
  };

  const magazineDb = {
    from: vi.fn((table: string) => {
      if (table === 'magazines') {
        return makeChain({ data: mockMagazineRow, error: null });
      }
      if (table === 'magazine_items') {
        return makeChain({ data: [legacyItemRow, wellFormedItemRow], error: null });
      }
      return makeChain({ data: null, error: null });
    }),
  };
  return { magazineDb };
});

beforeEach(() => {
  loggerWarn.mockClear();
});

describe('magazineService — shape drift (observabilidade, não bloqueia)', () => {
  it('lê a revista normalmente mesmo com product_snapshot legado sem colors/materials', async () => {
    const { magazineService } = await import('../magazineService');
    const magazine = await magazineService.get('mag_drift_1');

    expect(magazine).not.toBeNull();
    expect(magazine?.items).toHaveLength(2);
    // Comportamento inalterado: o cast permissivo ainda devolve o item,
    // só sem os campos ausentes — a UI é quem trata isso (PersonalizationPreview/chrome.tsx).
    const legacy = magazine?.items.find((i) => i.id === 'item_legacy');
    expect(legacy?.productSnapshot.name).toBe('Produto legado');
    expect((legacy?.productSnapshot as { colors?: unknown }).colors).toBeUndefined();
  });

  it('loga drift só para o item com shape divergente, não para o bem-formado', async () => {
    const { magazineService } = await import('../magazineService');
    await magazineService.get('mag_drift_1');

    const driftCalls = loggerWarn.mock.calls.filter(([msg]) =>
      String(msg).includes('shape drift em product_snapshot'),
    );
    expect(driftCalls).toHaveLength(1);
    expect(String(driftCalls[0][0])).toContain('item_legacy');
  });

  it('não loga drift quando branding/content_settings/product_snapshot batem com o shape esperado', async () => {
    const { magazineService } = await import('../magazineService');
    await magazineService.get('mag_drift_1');

    const brandingDrift = loggerWarn.mock.calls.filter(([msg]) =>
      String(msg).includes('shape drift em branding'),
    );
    expect(brandingDrift).toHaveLength(0);
  });
});
