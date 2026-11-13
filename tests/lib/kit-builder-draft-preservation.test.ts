import { describe, expect, it } from 'vitest';
import { buildKitPersistencePayload } from '@/lib/kit-builder/persistence';
import type { KitState } from '@/lib/kit-builder';

function state(draft: unknown): KitState {
  const personalization = {
    box: { enabled: false },
    items: {},
    __draft: draft,
    future: { kept: true },
  };
  return {
    name: 'Nome editado',
    kitType: 'simples',
    box: null,
    items: [],
    personalization,
    totalItemsVolume: 0,
    availableVolume: 0,
    volumeUsagePercent: 0,
    totalWeight: 0,
    boxPrice: 0,
    itemsPrice: 0,
    personalizationPrice: 0,
    totalPrice: 0,
    isValid: false,
    validationErrors: ['Selecione itens'],
  };
}
const draft = () => ({
  version: 1,
  notes: 'Notas legadas',
  quoteClient: { client_id: 'real-client', future: 'kept' },
  flow: 'items-first',
  aiBriefing: { futureBrief: 'preserved' },
  future: { nested: [1, 'partial', null] },
});

describe('Kit persistence preserves versioned partial metadata', () => {
  it('editing only the name retains all existing draft fields and unknown JSON', () => {
    const source = state(draft());
    const before = structuredClone(source);
    const payload = buildKitPersistencePayload('u1', source, 12);
    expect(payload.personalization_data).toMatchObject({
      __draft: draft(),
      future: { kept: true },
    });
    expect(source).toEqual(before);
  });

  it('absent known context fields preserve their old values', () => {
    const payload = buildKitPersistencePayload('u1', state(draft()), 12, {});
    expect(payload.personalization_data).toMatchObject({ __draft: draft() });
  });

  it('explicit empty notes and client clear only the intended known values', () => {
    const payload = buildKitPersistencePayload('u1', { ...state(draft()), notes: '' }, 12, {
      quoteClient: {},
    });
    expect(payload.personalization_data).toMatchObject({
      __draft: {
        version: 1,
        notes: '',
        quoteClient: {},
        flow: 'items-first',
        future: draft().future,
      },
    });
  });

  it('changing known context fields keeps unrelated future metadata', () => {
    const payload = buildKitPersistencePayload(
      'u1',
      { ...state(draft()), notes: 'Novas notas' },
      12,
      {
        flow: 'box-first',
        quoteClient: { client_id: 'updated-client' },
      },
    );
    expect(payload.personalization_data).toMatchObject({
      __draft: {
        notes: 'Novas notas',
        flow: 'box-first',
        quoteClient: { client_id: 'updated-client' },
        future: draft().future,
      },
    });
  });

  it('legacy metadata without a version becomes version1 while preserving fields', () => {
    const payload = buildKitPersistencePayload('u1', state({ notes: 'Legado', future: true }), 12);
    expect(payload.personalization_data).toMatchObject({
      __draft: { version: 1, notes: 'Legado', future: true },
    });
  });

  it.each([[], ['partial'], 'unknown', 2, true])(
    'unsupported draft namespace %j is never replaced with an empty object',
    (rawDraft) => {
      const source = state(rawDraft);
      const before = structuredClone(source);
      expect(() => buildKitPersistencePayload('u1', source, 12)).toThrow('formato');
      expect(source).toEqual(before);
    },
  );

  it.each([0, 2, '1', null, false, { futureVersion: true }])(
    'unsupported explicit version %j never gets silently downgraded',
    (version) => {
      const source = state({ ...draft(), version });
      const before = structuredClone(source);
      expect(() => buildKitPersistencePayload('u1', source, 12)).toThrow('versão');
      expect(source).toEqual(before);
    },
  );
});
