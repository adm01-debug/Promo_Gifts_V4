/**
 * Linha do banco → tipos do motor.
 *
 * O banco é plano e em `snake_case` (`shipping_boxes`, `freight_settings`); o
 * motor é aninhado e em `camelCase` (`ShippingBox`, `FreightSettings`). A
 * tradução mora aqui para existir num lugar só e ser testável sem Supabase.
 *
 * O import do schema é **só de tipo** (apagado na compilação), igual a
 * `columns.ts`: o motor continua sem dependência de runtime do Supabase. Os
 * `Pick` são a guarda — se uma coluna mudar de nome, `npm run qa:typecheck`
 * falha aqui.
 *
 * `numeric` do Postgres chega como número pelo PostgREST e é assim que o schema
 * gerado o tipa (`number`), então não há conversão de texto aqui.
 */
import type { Database } from '@/integrations/supabase/types';

import type { FreightSettings, ShippingBox } from './types';
import { isKnownMeasure } from './units';

type ShippingBoxesRow = Database['public']['Tables']['shipping_boxes']['Row'];
type FreightSettingsDbRow = Database['public']['Tables']['freight_settings']['Row'];

/** Colunas de `shipping_boxes` que o motor lê. */
export type ShippingBoxSource = Pick<
  ShippingBoxesRow,
  | 'code'
  | 'empty_weight_g'
  | 'fill_factor'
  | 'id'
  | 'inner_height_cm'
  | 'inner_length_cm'
  | 'inner_width_cm'
  | 'max_weight_g'
  | 'name'
  | 'outer_height_cm'
  | 'outer_length_cm'
  | 'outer_width_cm'
>;

/** Colunas de `freight_settings` que o motor lê. */
export type FreightSettingsSource = Pick<
  FreightSettingsDbRow,
  'cubic_divisor_correios' | 'cubic_divisor_rodoviario' | 'default_fill_factor'
>;

/**
 * Caixa do banco → caixa do motor, ou `null` quando ela não pode receber carga.
 *
 * As três `inner_*_cm` são colunas geradas (externa − 2 × espessura) e o schema
 * as tipa como anuláveis. Interna nula ou não positiva é caixa sem espaço útil:
 * devolver `null` tira a caixa do plano em vez de deixar o motor dividir por
 * zero ou encaixar peça em lado negativo.
 *
 * Não olha `is_active` nem `deleted_at` — quem decide quais caixas entram no
 * cálculo é quem consulta.
 */
export function toShippingBox(row: ShippingBoxSource): ShippingBox | null {
  const { inner_height_cm, inner_width_cm, inner_length_cm } = row;
  if (
    !isKnownMeasure(inner_height_cm) ||
    !isKnownMeasure(inner_width_cm) ||
    !isKnownMeasure(inner_length_cm)
  ) {
    return null;
  }

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    inner: {
      heightCm: inner_height_cm,
      widthCm: inner_width_cm,
      lengthCm: inner_length_cm,
    },
    outer: {
      heightCm: row.outer_height_cm,
      widthCm: row.outer_width_cm,
      lengthCm: row.outer_length_cm,
    },
    emptyWeightG: row.empty_weight_g,
    maxWeightG: row.max_weight_g,
    fillFactor: row.fill_factor,
  };
}

/** Parâmetros globais do banco → os três que o motor usa. */
export function toFreightSettings(row: FreightSettingsSource): FreightSettings {
  return {
    cubicDivisorCorreios: row.cubic_divisor_correios,
    cubicDivisorRodoviario: row.cubic_divisor_rodoviario,
    defaultFillFactor: row.default_fill_factor,
  };
}
