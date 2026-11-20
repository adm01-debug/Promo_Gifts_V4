/**
 * Feriados do prazo de produção (`public.business_calendar`).
 *
 * Regras do banco (migration 20261120041000):
 * - `day` é a chave primária: a mesma data não entra duas vezes (23505).
 * - Leitura para qualquer autenticado; escrita só para admin. A RLS nega
 *   INSERT com erro e UPDATE/DELETE em silêncio (0 linhas): toda escrita pede
 *   `.select('day')` e 0 linhas vira erro de permissão.
 * - `description` não pode ser vazia nem passar de 120 caracteres (23514).
 * - Exclusão é física (a tabela é dado de calendário, sem histórico).
 */
import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';
import { isRlsDenialError } from '@/lib/security/rls-denial-logger';

/** Linha de `business_calendar` como o banco devolve. */
export type BusinessCalendarRow = Database['public']['Tables']['business_calendar']['Row'];

/** Feriado a cadastrar: data `AAAA-MM-DD` e nome. */
export interface BusinessCalendarWrite {
  day: string;
  description: string;
}

export type BusinessCalendarErrorReason =
  'duplicate_day' | 'invalid' | 'not_applied' | 'permission' | 'unknown';

/** Erro do calendário. `message` é PT-BR e segura para exibir. */
export class BusinessCalendarError extends Error {
  readonly reason: BusinessCalendarErrorReason;

  constructor(reason: BusinessCalendarErrorReason, message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'BusinessCalendarError';
    this.reason = reason;
  }
}

const PERMISSION_MESSAGE =
  'Sem permissão para alterar os feriados. Apenas administradores podem salvar.';

const NOT_APPLIED_MESSAGE =
  'Nada foi alterado: o feriado foi mudado por outra pessoa ou você não tem permissão. Atualize a lista e tente de novo.';

const INVALID_MESSAGE = 'Informe o nome do feriado, com até 120 caracteres.';

type WriteAction = 'adicionar' | 'excluir' | 'salvar';

function toWriteError(
  error: PostgrestError,
  action: WriteAction,
  day?: string,
): BusinessCalendarError {
  if (error.code === '23505') {
    const message = day
      ? `Já existe um feriado em ${day.split('-').reverse().join('/')}. Edite o nome dele na lista.`
      : 'Já existe um feriado nesta data. Edite o nome dele na lista.';
    return new BusinessCalendarError('duplicate_day', message, error);
  }
  if (error.code === '23514') return new BusinessCalendarError('invalid', INVALID_MESSAGE, error);
  if (isRlsDenialError(error)) {
    return new BusinessCalendarError('permission', PERMISSION_MESSAGE, error);
  }
  logger.error(`[businessCalendarService] falha ao ${action} feriado`, {
    code: error.code,
    message: error.message,
  });
  return new BusinessCalendarError(
    'unknown',
    `Não foi possível ${action} o feriado. Tente novamente.`,
    error,
  );
}

function toReadError(error: PostgrestError): BusinessCalendarError {
  logger.error('[businessCalendarService] falha ao listar feriados', {
    code: error.code,
    message: error.message,
  });
  return new BusinessCalendarError('unknown', 'Não foi possível carregar os feriados.', error);
}

export const businessCalendarService = {
  /** Todos os feriados, por data. É o que o cálculo do prazo consome. */
  async listAll(): Promise<BusinessCalendarRow[]> {
    const { data, error } = await supabase
      .from('business_calendar')
      .select('day, description, created_at, created_by')
      .order('day', { ascending: true });
    if (error) throw toReadError(error);
    return data ?? [];
  },

  /** Feriados de um ano civil, por data. */
  async listByYear(year: number): Promise<BusinessCalendarRow[]> {
    const { data, error } = await supabase
      .from('business_calendar')
      .select('day, description, created_at, created_by')
      .gte('day', `${year}-01-01`)
      .lte('day', `${year}-12-31`)
      .order('day', { ascending: true });
    if (error) throw toReadError(error);
    return data ?? [];
  },

  async create(input: BusinessCalendarWrite): Promise<void> {
    const { data, error } = await supabase
      .from('business_calendar')
      .insert({ day: input.day, description: input.description.trim() })
      .select('day');
    if (error) throw toWriteError(error, 'adicionar', input.day);
    if (!data?.[0]?.day) throw new BusinessCalendarError('permission', PERMISSION_MESSAGE);
  },

  /** Só o nome muda: a data é a chave (para trocar a data, exclua e cadastre de novo). */
  async updateDescription(day: string, description: string): Promise<void> {
    const { data, error } = await supabase
      .from('business_calendar')
      .update({ description: description.trim() })
      .eq('day', day)
      .select('day');
    if (error) throw toWriteError(error, 'salvar', day);
    if (!data?.[0]?.day) throw new BusinessCalendarError('not_applied', NOT_APPLIED_MESSAGE);
  },

  async remove(day: string): Promise<void> {
    const { data, error } = await supabase
      .from('business_calendar')
      .delete()
      .eq('day', day)
      .select('day');
    if (error) throw toWriteError(error, 'excluir', day);
    if (!data?.[0]?.day) throw new BusinessCalendarError('not_applied', NOT_APPLIED_MESSAGE);
  },
};
