import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { KitState } from '@/lib/kit-builder';

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: rpcMock },
}));

import {
  buildKitPersistencePayload,
  persistCustomKitAtomically,
} from '@/lib/kit-builder/persistence';

const kitState: KitState = {
  name: 'Kit transacional',
  kitType: 'montado',
  box: null,
  items: [],
  personalization: { box: { enabled: false }, items: {} },
  totalItemsVolume: 0,
  availableVolume: 0,
  volumeUsagePercent: 0,
  totalWeight: 0,
  boxPrice: 0,
  itemsPrice: 10,
  personalizationPrice: 0,
  totalPrice: 10,
  isValid: true,
  validationErrors: [],
};

const savedRow = {
  id: '00000000-0000-4000-8000-000000000001',
  revision: 0,
};

describe('Kit Maker atomic persistence client', () => {
  beforeEach(() => rpcMock.mockReset());

  it('creates a kit through the canonical RPC with a stable request id', async () => {
    rpcMock.mockResolvedValue({ data: savedRow, error: null });
    const payload = buildKitPersistencePayload('user-1', kitState, 1);

    await expect(
      persistCustomKitAtomically({
        payload,
        requestId: '00000000-0000-4000-8000-000000000002',
      }),
    ).resolves.toMatchObject(savedRow);

    expect(rpcMock).toHaveBeenCalledWith('save_custom_kit_atomic', {
      p_request_id: '00000000-0000-4000-8000-000000000002',
      p_kit_id: null,
      p_expected_revision: null,
      p_payload: payload,
    });
  });

  it('sends the expected revision when updating an existing kit', async () => {
    rpcMock.mockResolvedValue({ data: { ...savedRow, revision: 8 }, error: null });
    const payload = buildKitPersistencePayload('user-1', kitState, 1);

    await persistCustomKitAtomically({
      kitId: savedRow.id,
      expectedRevision: 7,
      payload,
      requestId: '00000000-0000-4000-8000-000000000003',
    });

    expect(rpcMock).toHaveBeenCalledWith(
      'save_custom_kit_atomic',
      expect.objectContaining({ p_kit_id: savedRow.id, p_expected_revision: 7 }),
    );
  });

  it('blocks an update without a known revision before reaching the database', async () => {
    const payload = buildKitPersistencePayload('user-1', kitState, 1);

    await expect(persistCustomKitAtomically({ kitId: savedRow.id, payload })).rejects.toThrow(
      'revisão atual',
    );
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('rejects malformed success payloads and propagates database errors', async () => {
    const payload = buildKitPersistencePayload('user-1', kitState, 1);
    rpcMock.mockResolvedValueOnce({ data: { id: savedRow.id }, error: null });
    await expect(persistCustomKitAtomically({ payload })).rejects.toThrow(
      'revisão de kit inválida',
    );

    const dbError = new Error('serialization conflict');
    rpcMock.mockResolvedValueOnce({ data: null, error: dbError });
    await expect(persistCustomKitAtomically({ payload })).rejects.toBe(dbError);
  });
});
