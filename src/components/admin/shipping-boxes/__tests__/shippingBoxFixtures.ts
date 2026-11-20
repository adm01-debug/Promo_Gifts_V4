import type { ShippingBoxRow } from '@/services/shippingBoxService';

/** Caixa P real: externa 27 × 33 × 33 cm, parede 3 mm (interna 26,4 × 32,4 × 32,4), 10 kg. */
export const BOX_P: ShippingBoxRow = {
  id: 'box-p',
  code: 'P',
  name: 'Caixa P',
  outer_height_cm: 27,
  outer_width_cm: 33,
  outer_length_cm: 33,
  wall_thickness_mm: 3,
  inner_height_cm: 26.4,
  inner_width_cm: 32.4,
  inner_length_cm: 32.4,
  empty_weight_g: 0,
  max_weight_g: 10000,
  fill_factor: 0.9,
  is_active: true,
  sort_order: 1,
  created_at: '2026-11-19T12:00:00Z',
  updated_at: '2026-11-19T12:00:00Z',
  deleted_at: null,
};

/** Caixa M real, aqui inativa: externa 33 × 33 × 47 cm (interna 32,4 × 32,4 × 46,4), 20 kg. */
export const BOX_M: ShippingBoxRow = {
  ...BOX_P,
  id: 'box-m',
  code: 'M',
  name: 'Caixa M',
  outer_length_cm: 47,
  outer_height_cm: 33,
  inner_height_cm: 32.4,
  inner_length_cm: 46.4,
  max_weight_g: 20000,
  is_active: false,
  sort_order: 2,
};

/** Excluída às 01:30 UTC de 19/11 = 22:30 de 18/11 em São Paulo (UTC−3). */
export const BOX_OLD: ShippingBoxRow = {
  ...BOX_P,
  id: 'box-old',
  name: 'Caixa P antiga',
  deleted_at: '2026-11-19T01:30:00Z',
};
