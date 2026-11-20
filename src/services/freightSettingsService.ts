/**
 * Parâmetros globais do frete (`public.freight_settings`) — linha única.
 *
 * A tabela é um singleton com chave booleana travada em `true` (migration
 * 20261119213100_create_freight_settings.sql) e só tem policy de SELECT e de
 * UPDATE. Por isso salvar é sempre `update(...).eq('id', true)`: `upsert` e
 * `insert` são negados pela RLS, e a linha nasce na migration.
 *
 * A RLS nega o UPDATE de quem não é admin em silêncio (0 linhas, sem erro):
 * a escrita pede `.select('id')` e 0 linhas vira erro de permissão.
 */
import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';
import { isRlsDenialError } from '@/lib/security/rls-denial-logger';

type FreightSettingsTable = Database['public']['Tables']['freight_settings'];

/** Linha de `freight_settings` como o banco devolve. */
export type FreightSettingsRow = FreightSettingsTable['Row'];

/** Os dois valores que o CHECK de `multi_personalization_rule` aceita. */
export type MultiPersonalizationRule = 'max' | 'sum';

/** Campos que a tela `/admin/frete` grava. */
export interface FreightSettingsWrite {
  origin_cep: string;
  cubic_divisor_correios: number;
  cubic_divisor_rodoviario: number;
  default_fill_factor: number;
  internal_buffer_days: number;
  multi_personalization_rule: MultiPersonalizationRule;
}

/** Alteração parcial dos parâmetros. */
export type FreightSettingsPatch = Partial<FreightSettingsWrite>;

/** Por que a operação falhou — a tela decide o que fazer sem ler a mensagem. */
export type FreightSettingsErrorReason = 'invalid' | 'permission' | 'unknown';

/** Erro dos parâmetros de frete. `message` é PT-BR e segura para exibir. */
export class FreightSettingsError extends Error {
  readonly reason: FreightSettingsErrorReason;

  constructor(reason: FreightSettingsErrorReason, message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'FreightSettingsError';
    this.reason = reason;
  }
}

const PERMISSION_MESSAGE =
  'Sem permissão para alterar os parâmetros de frete. Apenas administradores podem salvar.';

const INVALID_MESSAGE =
  'Parâmetros fora do permitido. Confira o CEP (00000-000), os divisores (maiores que zero), o fator (0,50 a 1,00) e a folga (zero ou mais).';

function toWriteError(error: PostgrestError): FreightSettingsError {
  if (error.code === '23514') return new FreightSettingsError('invalid', INVALID_MESSAGE, error);
  if (isRlsDenialError(error)) {
    return new FreightSettingsError('permission', PERMISSION_MESSAGE, error);
  }

  logger.error('[freightSettingsService] falha ao salvar parâmetros', {
    code: error.code,
    message: error.message,
  });
  return new FreightSettingsError(
    'unknown',
    'Não foi possível salvar os parâmetros de frete. Tente novamente.',
    error,
  );
}

export const freightSettingsService = {
  /** A linha única, ou `null` se ela não estiver visível para o usuário. */
  async get(): Promise<FreightSettingsRow | null> {
    const { data, error } = await supabase
      .from('freight_settings')
      .select('*')
      .eq('id', true)
      .maybeSingle();
    if (error) {
      logger.error('[freightSettingsService] falha ao carregar parâmetros', {
        code: error.code,
        message: error.message,
      });
      throw new FreightSettingsError(
        'unknown',
        'Não foi possível carregar os parâmetros de frete.',
        error,
      );
    }
    return data;
  },

  /**
   * Altera os campos informados e registra quem alterou. O objeto é montado
   * campo a campo: `id`, `updated_at` ou qualquer campo a mais não são enviados.
   */
  async update(patch: FreightSettingsPatch, userId: string): Promise<void> {
    const { data, error } = await supabase
      .from('freight_settings')
      .update({
        origin_cep: patch.origin_cep,
        cubic_divisor_correios: patch.cubic_divisor_correios,
        cubic_divisor_rodoviario: patch.cubic_divisor_rodoviario,
        default_fill_factor: patch.default_fill_factor,
        internal_buffer_days: patch.internal_buffer_days,
        multi_personalization_rule: patch.multi_personalization_rule,
        updated_by: userId,
      })
      .eq('id', true)
      .select('id');
    if (error) throw toWriteError(error);
    if (!data || data.length === 0) {
      throw new FreightSettingsError('permission', PERMISSION_MESSAGE);
    }
  },
};
