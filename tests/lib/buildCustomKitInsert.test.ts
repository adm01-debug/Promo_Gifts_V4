import { describe, expect, it } from 'vitest';

import type { CustomKitRow } from '@/hooks/kit-builder';
import { buildCustomKitInsert } from '@/lib/kit-library/buildCustomKitInsert';

const savedKit: CustomKitRow = {
  id: 'kit-1',
  user_id: 'owner-1',
  name: 'Kit executivo',
  status: 'published',
  kit_type: 'corporate',
  box_data: null,
  items_data: [],
  personalization_data: {},
  kit_quantity: 10,
  box_price: 0,
  items_price: 100,
  personalization_price: 0,
  total_price: 100,
  volume_usage_percent: 0,
  color: 'blue',
  icon: 'box',
  tag: null,
  description: null,
  is_favorite: false,
  is_pinned: false,
  last_used_at: null,
  created_at: '2026-09-10T00:00:00.000Z',
  updated_at: '2026-09-10T00:00:00.000Z',
};

describe('buildCustomKitInsert', () => {
  it('preserva kit_type ao duplicar um kit salvo', () => {
    const payload = buildCustomKitInsert(savedKit, {
      user_id: 'owner-2',
      name: 'Kit executivo (cópia)',
    });

    expect(payload.kit_type).toBe('corporate');
  });

  it('aceita substituir kit_type explicitamente', () => {
    const payload = buildCustomKitInsert(savedKit, {
      user_id: 'owner-2',
      kit_type: 'seasonal',
    });

    expect(payload.kit_type).toBe('seasonal');
  });
});
