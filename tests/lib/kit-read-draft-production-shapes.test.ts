import { describe, expect, it } from 'vitest';
import { toSavedKitSnapshot } from '@/lib/kit-builder/snapshot/read-draft';

// Formatos reais de custom_kits em produção (13/11/2026): 15 de 21 kits têm
// personalization_data = {} — "sem personalização". Nenhum pode cair em erro de hidratação.
const base = {
  box_data: null,
  items_data: [],
  personalization_data: null as unknown,
  kit_quantity: 10,
  kit_type: 'montado',
  name: 'Kit real',
  color: null,
  icon: null,
  tag: null,
  description: null,
  is_favorite: null,
};

describe('toSavedKitSnapshot — formatos de produção', () => {
  it('personalization_data = {} hidrata com personalização desligada', () => {
    const snap = toSavedKitSnapshot({ ...base, personalization_data: {} } as never);
    expect(snap).not.toBeNull();
    expect(snap?.personalization.box.enabled).toBe(false);
    expect(snap?.personalization.items).toEqual({});
  });

  it('personalization_data só com items preserva os itens e desliga a caixa', () => {
    const snap = toSavedKitSnapshot({
      ...base,
      personalization_data: { items: { 'p-1': { enabled: true, techniqueName: 'Silk' } } },
    } as never);
    expect(snap?.personalization.box.enabled).toBe(false);
    expect(snap?.personalization.items['p-1']?.enabled).toBe(true);
  });

  it('personalization_data nulo continua equivalente ao vazio', () => {
    const snap = toSavedKitSnapshot(base as never);
    expect(snap?.personalization.box.enabled).toBe(false);
  });

  it('caixa de personalização com enabled inválido continua recusada (não descarta em silêncio)', () => {
    const snap = toSavedKitSnapshot({ ...base, personalization_data: { box: { enabled: 'sim' } } } as never);
    expect(snap).toBeNull();
  });
});
