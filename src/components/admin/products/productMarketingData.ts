/**
 * Camada de dados da aba Marketing do produto (Admin > Produtos > editar > Marketing).
 *
 * Opções vêm dos cadastros reais (mestres) e as marcações são vínculos por produto:
 *   - Público-Alvo         → target_audiences      / product_target_audiences    (target_audience_id)
 *   - Datas Comemorativas  → commemorative_dates   / product_commemorative_dates (commemorative_date_id)
 *   - Endomarketing        → endomarketing_themes  / product_endomarketing       (theme_id)
 *
 * Regras de gravação (migration 20261113140000):
 *   - marcar   → se já existe vínculo (desligado) religa com is_active = true; senão INSERT source 'manual'.
 *   - desmarcar → vínculo 'manual' é apagado; vínculo herdado (category/auto) só é desligado
 *     (is_active = false), porque a categoria o recriaria.
 *
 * NUNCA toca products.tags (palavras-chave de busca) nem a view v_products_public — era o que a
 * versão anterior fazia (código antigo em recovery/src-legacy/src/components/admin/products/).
 *
 * RLS: UPDATE/DELETE negados pela policy não dão erro no PostgREST, só afetam 0 linhas. Por isso
 * toda escrita pede `.select('id')` e 0 linhas vira MarketingPermissionError.
 */

import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { isRlsDenialError } from '@/lib/security/rls-denial-logger';

export type MarketingCategoryKey = 'datasComemorativas' | 'endomarketing' | 'publicoAlvo';

export const MARKETING_CATEGORY_KEYS: readonly MarketingCategoryKey[] = [
  'publicoAlvo',
  'datasComemorativas',
  'endomarketing',
];

export interface MarketingOption {
  id: string;
  name: string;
}

export interface MarketingLink {
  id: string;
  optionId: string;
  source: string | null;
  isActive: boolean;
}

export const PERMISSION_DENIED_MESSAGE = 'Sem permissão para editar marketing deste produto';

export class MarketingPermissionError extends Error {
  constructor() {
    super(PERMISSION_DENIED_MESSAGE);
    this.name = 'MarketingPermissionError';
  }
}

/** Vínculo criado pela própria aba (apagável). Qualquer outro source é herdado. */
export function isManualLink(link: Pick<MarketingLink, 'source'>): boolean {
  return link.source === 'manual';
}

function toUserError(error: PostgrestError, action: string): Error {
  if (isRlsDenialError(error)) return new MarketingPermissionError();
  if (error.code === '23505') {
    return new Error('Este item já está vinculado ao produto. Recarregue a página.');
  }
  return new Error(`Erro ao ${action}: ${error.message}`);
}

function ensureAffected(rows: unknown[] | null): void {
  if (!rows || rows.length === 0) throw new MarketingPermissionError();
}

// ── Leitura ──────────────────────────────────────────────────────────────────

async function fetchMasterOptions(key: MarketingCategoryKey): Promise<MarketingOption[]> {
  const query =
    key === 'publicoAlvo'
      ? supabase.from('target_audiences').select('id, name').eq('is_active', true)
      : key === 'datasComemorativas'
        ? supabase.from('commemorative_dates').select('id, name').eq('is_active', true)
        : supabase.from('endomarketing_themes').select('id, name').eq('is_active', true);
  const { data, error } = await query
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw toUserError(error, 'carregar opções');
  return (data ?? []).map((row) => ({ id: row.id, name: row.name }));
}

export async function fetchProductMarketingLinks(
  productId: string,
  key: MarketingCategoryKey,
): Promise<MarketingLink[]> {
  if (key === 'publicoAlvo') {
    const { data, error } = await supabase
      .from('product_target_audiences')
      .select('id, target_audience_id, source, is_active')
      .eq('product_id', productId);
    if (error) throw toUserError(error, 'carregar vínculos');
    return (data ?? []).map((r) => ({
      id: r.id,
      optionId: r.target_audience_id,
      source: r.source,
      isActive: r.is_active,
    }));
  }
  if (key === 'datasComemorativas') {
    const { data, error } = await supabase
      .from('product_commemorative_dates')
      .select('id, commemorative_date_id, source, is_active')
      .eq('product_id', productId);
    if (error) throw toUserError(error, 'carregar vínculos');
    return (data ?? []).map((r) => ({
      id: r.id,
      optionId: r.commemorative_date_id,
      source: r.source,
      isActive: r.is_active,
    }));
  }
  const { data, error } = await supabase
    .from('product_endomarketing')
    .select('id, theme_id, source, is_active')
    .eq('product_id', productId);
  if (error) throw toUserError(error, 'carregar vínculos');
  return (data ?? []).map((r) => ({
    id: r.id,
    optionId: r.theme_id,
    source: r.source,
    isActive: r.is_active,
  }));
}

export interface MarketingCategoryData {
  options: MarketingOption[];
  links: MarketingLink[];
  /** Mensagem quando a categoria não pôde ser carregada (as outras seguem funcionando). */
  loadError: string | null;
}

export type ProductMarketingData = Record<MarketingCategoryKey, MarketingCategoryData>;

async function loadCategory(productId: string, key: MarketingCategoryKey): Promise<MarketingCategoryData> {
  try {
    const [options, links] = await Promise.all([
      fetchMasterOptions(key),
      fetchProductMarketingLinks(productId, key),
    ]);
    return { options, links, loadError: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao carregar';
    return { options: [], links: [], loadError: message };
  }
}

export async function fetchProductMarketing(productId: string): Promise<ProductMarketingData> {
  // Objeto montado com as 3 chaves explícitas (sem `as`): o tipo garante que nenhuma falta.
  const [publicoAlvo, datasComemorativas, endomarketing] = await Promise.all([
    loadCategory(productId, 'publicoAlvo'),
    loadCategory(productId, 'datasComemorativas'),
    loadCategory(productId, 'endomarketing'),
  ]);
  return { publicoAlvo, datasComemorativas, endomarketing };
}

// ── Escrita ──────────────────────────────────────────────────────────────────

// Nomes de tabela literais em cada ramo (sem despacho dinâmico): o gate
// check-supabase-reference-catalog só valida referências literais.
function linkUpdate(key: MarketingCategoryKey, isActive: boolean) {
  if (key === 'publicoAlvo') {
    return supabase.from('product_target_audiences').update({ is_active: isActive });
  }
  if (key === 'datasComemorativas') {
    return supabase.from('product_commemorative_dates').update({ is_active: isActive });
  }
  return supabase.from('product_endomarketing').update({ is_active: isActive });
}

function linkDelete(key: MarketingCategoryKey) {
  if (key === 'publicoAlvo') return supabase.from('product_target_audiences').delete();
  if (key === 'datasComemorativas') return supabase.from('product_commemorative_dates').delete();
  return supabase.from('product_endomarketing').delete();
}

async function setLinkActive(key: MarketingCategoryKey, linkId: string, isActive: boolean) {
  const { data, error } = await linkUpdate(key, isActive).eq('id', linkId).select('id');
  if (error) throw toUserError(error, 'salvar');
  ensureAffected(data);
}

async function deleteLink(key: MarketingCategoryKey, linkId: string) {
  const { data, error } = await linkDelete(key).eq('id', linkId).select('id');
  if (error) throw toUserError(error, 'remover');
  ensureAffected(data);
}

async function insertManualLink(productId: string, key: MarketingCategoryKey, optionId: string) {
  const { data, error } =
    key === 'publicoAlvo'
      ? await supabase
          .from('product_target_audiences')
          .insert({ product_id: productId, target_audience_id: optionId, source: 'manual' })
          .select('id')
      : key === 'datasComemorativas'
        ? await supabase
            .from('product_commemorative_dates')
            .insert({ product_id: productId, commemorative_date_id: optionId, source: 'manual' })
            .select('id')
        : await supabase
            .from('product_endomarketing')
            .insert({ product_id: productId, theme_id: optionId, source: 'manual' })
            .select('id');
  if (error) throw toUserError(error, 'salvar');
  ensureAffected(data);
}

/** Marca a opção no produto: religa o vínculo existente ou cria um manual. */
export async function selectMarketingOption(
  productId: string,
  key: MarketingCategoryKey,
  optionId: string,
  existing: MarketingLink | undefined,
): Promise<void> {
  if (existing) {
    if (!existing.isActive) await setLinkActive(key, existing.id, true);
    return;
  }
  await insertManualLink(productId, key, optionId);
}

/** Desmarca: manual é apagado; herdado da categoria só é desligado. */
export async function unselectMarketingOption(
  key: MarketingCategoryKey,
  link: MarketingLink,
): Promise<void> {
  if (isManualLink(link)) {
    await deleteLink(key, link.id);
    return;
  }
  if (link.isActive) await setLinkActive(key, link.id, false);
}
