import { describe, expect, it } from 'vitest';
import {
  buildKitPersistencePayload,
  getPersistedKitStatus,
  type KitState,
} from '@/lib/kit-builder';

const validKit: KitState = {
  name: 'Kit Boas-vindas',
  kitType: 'montado',
  box: null,
  items: [],
  personalization: { box: { enabled: false }, items: {} },
  totalItemsVolume: 0,
  availableVolume: 0,
  volumeUsagePercent: 0,
  totalWeight: 0,
  boxPrice: 0,
  itemsPrice: 200,
  personalizationPrice: 0,
  totalPrice: 2_000,
  isValid: true,
  validationErrors: [],
};

describe('Kit Maker persistence snapshot', () => {
  it('uses the custom_kits lifecycle status accepted by the status trigger', () => {
    expect(getPersistedKitStatus(validKit)).toBe('ready');
    expect(getPersistedKitStatus({ ...validKit, isValid: false })).toBe('draft');
  });

  it('keeps the calculated lot total without multiplying it during persistence', () => {
    const payload = buildKitPersistencePayload('user-1', validKit, 10);

    expect(payload.status).toBe('ready');
    expect(payload.kit_quantity).toBe(10);
    expect(payload.total_price).toBe(2_000);
  });

  it('persists the draft client in the versioned snapshot metadata', () => {
    const payload = buildKitPersistencePayload('user-1', validKit, 10, {
      quoteClient: {
        client_id: 'client-1',
        client_name: 'Ana Compradora',
        client_company: 'Empresa Exemplo',
      },
    });

    expect(payload.personalization_data).toEqual(
      expect.objectContaining({
        __draft: {
          version: 1,
          quoteClient: expect.objectContaining({
            client_id: 'client-1',
            client_name: 'Ana Compradora',
          }),
        },
      }),
    );
  });
});
