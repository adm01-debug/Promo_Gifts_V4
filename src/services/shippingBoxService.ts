/**
 * Caixas de transporte (`public.shipping_boxes`) — leitura e cadastro.
 *
 * Quatro regras do banco que este serviço carrega (migration
 * 20261119213000_create_shipping_boxes.sql):
 *
 * 1. `inner_*_cm` são colunas GERADAS (externa − 2 × espessura). Nunca vão no
 *    payload: `pickWritable` monta o objeto campo a campo, então nem uma linha
 *    inteira passada por engano leva as internas para o banco.
 * 2. Exclusão é lógica (`deleted_at`). A policy de SELECT devolve as excluídas
 *    para admin, por isso toda listagem de vivas filtra `deleted_at IS NULL`.
 * 3. `code` é único só entre as vivas (índice parcial). O 23505 aparece ao
 *    criar, ao trocar o código e ao restaurar.
 * 4. A RLS nega UPDATE em silêncio (0 linhas, sem erro). Toda escrita pede
 *    `.select('id')` e 0 linhas vira erro.
 * 5. Alterar e excluir só valem para caixa viva, e restaurar só para excluída
 *    (filtro em `deleted_at`). Assim a tela com lista velha não mexe numa caixa
 *    que outro admin já excluiu ou restaurou. Nesses três casos, 0 linhas quer
 *    dizer "sem permissão OU a caixa mudou" (`not_applied`).
 */
import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';
import { isRlsDenialError } from '@/lib/security/rls-denial-logger';

type ShippingBoxesTable = Database['public']['Tables']['shipping_boxes'];

/** Linha de `shipping_boxes` como o banco devolve. */
export type ShippingBoxRow = ShippingBoxesTable['Row'];

/**
 * Campos que o cadastro grava. Os que têm padrão no banco (`wall_thickness_mm`,
 * `empty_weight_g`, `fill_factor`, `is_active`, `sort_order`) são opcionais.
 */
export type ShippingBoxWrite = Pick<
  ShippingBoxesTable['Insert'],
  | 'code'
  | 'empty_weight_g'
  | 'fill_factor'
  | 'is_active'
  | 'max_weight_g'
  | 'name'
  | 'outer_height_cm'
  | 'outer_length_cm'
  | 'outer_width_cm'
  | 'sort_order'
  | 'wall_thickness_mm'
>;

/** Alteração parcial de uma caixa. */
export type ShippingBoxPatch = Partial<ShippingBoxWrite>;

/** Por que a operação falhou — a tela decide o que fazer sem ler a mensagem. */
export type ShippingBoxErrorReason =
  'duplicate_code' | 'invalid' | 'not_applied' | 'permission' | 'unknown';

/** Erro do cadastro de caixas. `message` é PT-BR e segura para exibir. */
export class ShippingBoxError extends Error {
  readonly reason: ShippingBoxErrorReason;

  constructor(reason: ShippingBoxErrorReason, message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'ShippingBoxError';
    this.reason = reason;
  }
}

const PERMISSION_MESSAGE =
  'Sem permissão para alterar caixas de transporte. Apenas administradores podem salvar.';

const NOT_APPLIED_MESSAGE =
  'Nada foi alterado: a caixa foi modificada por outra pessoa ou você não tem permissão. A lista foi atualizada; abra a caixa de novo.';

const INVALID_MESSAGE =
  'Dados da caixa fora do permitido. Confira as medidas externas (0,01 a 300 cm), a espessura da parede (1 a 20 mm), os pesos (máximo até 100 kg e maior que o vazio) e o fator (0,50 a 1,00).';

type WriteAction = 'criar' | 'excluir' | 'restaurar' | 'salvar';

/**
 * `details` do 23505 é `Key (code)=(P) already exists.`, mas com a RLS ligada o
 * banco omite esse campo (vem nulo): em produção vale o código que quem chamou
 * informou.
 */
function duplicatedCode(error: PostgrestError, knownCode: string | undefined): string | undefined {
  return /\(code\)=\((.+?)\)/.exec(error.details ?? '')?.[1] ?? knownCode;
}

function toWriteError(
  error: PostgrestError,
  action: WriteAction,
  knownCode?: string,
): ShippingBoxError {
  if (error.code === '23505') {
    const code = duplicatedCode(error, knownCode);
    const message = code
      ? `Já existe uma caixa com o código ${code}. Caixas inativas também contam.`
      : 'Já existe uma caixa com este código. Caixas inativas também contam.';
    return new ShippingBoxError('duplicate_code', message, error);
  }
  if (error.code === '23514') return new ShippingBoxError('invalid', INVALID_MESSAGE, error);
  if (isRlsDenialError(error)) return new ShippingBoxError('permission', PERMISSION_MESSAGE, error);

  logger.error(`[shippingBoxService] falha ao ${action} caixa`, {
    code: error.code,
    message: error.message,
  });
  return new ShippingBoxError(
    'unknown',
    `Não foi possível ${action} a caixa de transporte. Tente novamente.`,
    error,
  );
}

function toReadError(error: PostgrestError): ShippingBoxError {
  logger.error('[shippingBoxService] falha ao listar caixas', {
    code: error.code,
    message: error.message,
  });
  return new ShippingBoxError(
    'unknown',
    'Não foi possível carregar as caixas de transporte.',
    error,
  );
}

/** A RLS nega em silêncio: criação que não devolve linha não aconteceu. */
function ensureCreated(rows: Array<{ id: string }> | null): string {
  const id = rows?.[0]?.id;
  if (!id) throw new ShippingBoxError('permission', PERMISSION_MESSAGE);
  return id;
}

/**
 * Alteração que não devolve linha não aconteceu: a RLS negou em silêncio ou o
 * filtro de `deleted_at` não achou mais a caixa (outro admin a mudou antes).
 */
function ensureApplied(rows: Array<{ id: string }> | null): void {
  if (!rows?.[0]?.id) throw new ShippingBoxError('not_applied', NOT_APPLIED_MESSAGE);
}

/**
 * Só os campos graváveis, um a um. É o que impede `inner_*_cm`, `id` ou datas
 * de chegarem ao banco quando quem chama passa um objeto com campos a mais.
 * Campo `undefined` não é enviado (o cliente serializa em JSON).
 */
function pickWritable(input: ShippingBoxWrite): ShippingBoxWrite;
function pickWritable(input: ShippingBoxPatch): ShippingBoxPatch;
function pickWritable(input: ShippingBoxPatch): ShippingBoxPatch {
  return {
    code: input.code,
    name: input.name,
    outer_height_cm: input.outer_height_cm,
    outer_width_cm: input.outer_width_cm,
    outer_length_cm: input.outer_length_cm,
    wall_thickness_mm: input.wall_thickness_mm,
    empty_weight_g: input.empty_weight_g,
    max_weight_g: input.max_weight_g,
    fill_factor: input.fill_factor,
    is_active: input.is_active,
    sort_order: input.sort_order,
  };
}

export const shippingBoxService = {
  /** Vivas e ativas, por `sort_order` e `code`. É a lista que o motor consome. */
  async listActive(): Promise<ShippingBoxRow[]> {
    const { data, error } = await supabase
      .from('shipping_boxes')
      .select('*')
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('code', { ascending: true });
    if (error) throw toReadError(error);
    return data ?? [];
  },

  /** Vivas, ativas e inativas. É a tabela do cadastro. */
  async listAll(): Promise<ShippingBoxRow[]> {
    const { data, error } = await supabase
      .from('shipping_boxes')
      .select('*')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('code', { ascending: true });
    if (error) throw toReadError(error);
    return data ?? [];
  },

  /** Só as excluídas, da mais recente para a mais antiga. A RLS só as mostra a admin. */
  async listDeleted(): Promise<ShippingBoxRow[]> {
    const { data, error } = await supabase
      .from('shipping_boxes')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .order('code', { ascending: true });
    if (error) throw toReadError(error);
    return data ?? [];
  },

  /** Cria a caixa e devolve o id. */
  async create(input: ShippingBoxWrite): Promise<string> {
    const { data, error } = await supabase
      .from('shipping_boxes')
      .insert(pickWritable(input))
      .select('id');
    if (error) throw toWriteError(error, 'criar', input.code);
    return ensureCreated(data);
  },

  /** Altera os campos informados de uma caixa viva. */
  async update(id: string, patch: ShippingBoxPatch): Promise<void> {
    const { data, error } = await supabase
      .from('shipping_boxes')
      .update(pickWritable(patch))
      .eq('id', id)
      .is('deleted_at', null)
      .select('id');
    if (error) throw toWriteError(error, 'salvar', patch.code);
    ensureApplied(data);
  },

  /** Exclusão lógica: a caixa sai das listagens e libera o código. */
  async softDelete(id: string): Promise<void> {
    const { data, error } = await supabase
      .from('shipping_boxes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
      .select('id');
    if (error) throw toWriteError(error, 'excluir');
    ensureApplied(data);
  },

  /**
   * Desfaz a exclusão. Falha com `duplicate_code` se o código já foi reutilizado;
   * `code` é o da caixa restaurada, para a mensagem dizer qual código colidiu.
   */
  async restore(id: string, code: string): Promise<void> {
    const { data, error } = await supabase
      .from('shipping_boxes')
      .update({ deleted_at: null })
      .eq('id', id)
      .not('deleted_at', 'is', null)
      .select('id');
    if (error) throw toWriteError(error, 'restaurar', code);
    ensureApplied(data);
  },
};
