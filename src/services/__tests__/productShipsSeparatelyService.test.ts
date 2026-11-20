/**
 * Leitura do flag `ships_separately`: uma falha passageira ganha 1 nova tentativa
 * antes de lançar (lançar evita assumir `false` e apagar a marcação ao salvar).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ maybeSingle: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: h.maybeSingle }) }) }),
  },
}));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

import { fetchShipsSeparately } from '@/services/productShipsSeparatelyService';

beforeEach(() => h.maybeSingle.mockReset());

describe('fetchShipsSeparately', () => {
  it('1ª leitura falha, 2ª traz true: devolve true (2 chamadas)', async () => {
    h.maybeSingle
      .mockResolvedValueOnce({ data: null, error: { code: '08006', message: 'rede' } })
      .mockResolvedValueOnce({ data: { ships_separately: true }, error: null });
    await expect(fetchShipsSeparately('p1')).resolves.toBe(true);
    expect(h.maybeSingle).toHaveBeenCalledTimes(2);
  });

  it('as 2 leituras falham: lança (1 original + 1 nova tentativa = 2 chamadas)', async () => {
    const erro = { code: '08006', message: 'rede' };
    h.maybeSingle.mockResolvedValue({ data: null, error: erro });
    await expect(fetchShipsSeparately('p1')).rejects.toBe(erro);
    expect(h.maybeSingle).toHaveBeenCalledTimes(2);
  });

  it('leitura ok de primeira: 1 chamada', async () => {
    h.maybeSingle.mockResolvedValue({ data: { ships_separately: false }, error: null });
    await expect(fetchShipsSeparately('p1')).resolves.toBe(false);
    expect(h.maybeSingle).toHaveBeenCalledTimes(1);
  });
});
