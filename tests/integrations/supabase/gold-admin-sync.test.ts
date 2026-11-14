import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));

import { rpcAdminSyncExternalConnections } from '@/integrations/supabase/gold';

describe('rpcAdminSyncExternalConnections', () => {
  beforeEach(() => rpc.mockReset());

  it('sucesso quando a função devolve ok:true', async () => {
    rpc.mockResolvedValue({ data: { ok: true, processed: 2 }, error: null });
    expect((await rpcAdminSyncExternalConnections()).error).toBeNull();
    expect(rpc).toHaveBeenCalledWith('fn_admin_sync_external_connections');
  });

  it('ok:false sem erro HTTP vira erro com o motivo (não anuncia sucesso)', async () => {
    rpc.mockResolvedValue({ data: { ok: false, reason: 'no_admin_for_system_actor' }, error: null });
    expect((await rpcAdminSyncExternalConnections()).error?.message).toBe('no_admin_for_system_actor');
  });

  it('erro da RPC continua erro', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'forbidden' } });
    expect((await rpcAdminSyncExternalConnections()).error?.message).toBe('forbidden');
  });
});
