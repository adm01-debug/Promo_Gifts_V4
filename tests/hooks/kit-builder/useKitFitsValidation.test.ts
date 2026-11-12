import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { KitBox, KitItem } from '@/lib/kit-builder';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));

import { validateKitFitsForQuote } from '@/hooks/kit-builder/useKitFitsValidation';

const box = { id: 'box-1' } as KitBox;
const item = (quantity: number) =>
  ({ id: 'prod-1', name: 'Squeeze', sku: 'SQ-1', quantity }) as unknown as KitItem;

describe('validateKitFitsForQuote', () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it('considera item.quantity no volume da linha', async () => {
    rpc.mockResolvedValue({
      data: [
        {
          fits: true,
          packaging_volume: 3,
          product_volume: 0.8,
          used_volume: 0.8,
          available_volume: 2.2,
          percentage_used: 26.67,
        },
      ],
      error: null,
    });

    const result = await validateKitFitsForQuote(box, [item(5)]);

    expect(result.status).toBe('violations');
    if (result.status === 'violations') {
      expect(result.violations[0].productVolume).toBeCloseTo(4);
    }
  });

  it('mantém fail-open quando fits é null', async () => {
    rpc.mockResolvedValue({
      data: [
        {
          fits: null,
          packaging_volume: 3,
          product_volume: null,
          used_volume: 0,
          available_volume: 3,
          percentage_used: 0,
        },
      ],
      error: null,
    });

    await expect(validateKitFitsForQuote(box, [item(5)])).resolves.toEqual({ status: 'ok' });
  });
});
