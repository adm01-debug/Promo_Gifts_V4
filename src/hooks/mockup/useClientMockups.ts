/**
 * useClientMockups — Lista os mockups salvos de um cliente do CRM (Singu) para o
 * módulo de orçamentos anexar (plano Mockup etapa 37; decisões Q4/Q22).
 *
 * Contrato: consulta `generated_mockups` por `client_id` (texto do CRM); ignora
 * itens na lixeira (`deleted_at`); ordena por `created_at` DESC; devolve o caminho
 * no bucket `mockup-assets` (para `quote_items.mockup_urls`) e uma miniatura
 * assinada de curta duração; sem `client_id` devolve [] sem erro.
 *
 * RLS (`gm_select_own_or_admin`) restringe a leitura ao dono, então o único filtro
 * de escopo aqui é `client_id`. A coluna de lixeira é a PROPOSTA da etapa 6 e ainda
 * não existe no PostgREST: por isso `select('*')` + filtro no cliente — funciona
 * antes e depois da migration, sem quebrar a consulta.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { untypedFrom } from '@/lib/supabase-untyped';
import { logger } from '@/lib/logger';

/** Bucket dos PNGs compostos; TTL da miniatura; teto defensivo da listagem. */
export const MOCKUP_BUCKET = 'mockup-assets';
export const MOCKUP_THUMBNAIL_TTL_SECONDS = 60 * 60;
export const DEFAULT_CLIENT_MOCKUPS_LIMIT = 200;

interface GeneratedMockupRow {
  id: string;
  product_name: string | null;
  technique_name: string | null;
  mockup_url: string | null;
  thumbnail_url: string | null;
  created_at: string;
  /** Lixeira (soft delete) — PROPOSTA da etapa 6, ainda não aplicada no schema. */
  deleted_at?: string | null;
}

export interface ClientMockup {
  id: string;
  productName: string | null;
  techniqueName: string | null;
  createdAt: string;
  /** Caminho no bucket `mockup-assets` (para `quote_items.mockup_urls`); null se externo. */
  path: string | null;
  /** Miniatura para exibição (assinada quando o arquivo vive no bucket). */
  thumbnailUrl: string | null;
}

export interface FetchClientMockupsOptions {
  limit?: number;
}

export interface UseClientMockupsOptions {
  limit?: number;
  staleTime?: number;
}

/** true quando o item carrega a marca de lixeira (no-op enquanto a coluna não existe). */
export function isMockupTrashed(row: Pick<GeneratedMockupRow, 'deleted_at'>): boolean {
  return row.deleted_at !== null && row.deleted_at !== undefined;
}

/** Ordena por `created_at` DESC sem mutar a entrada; datas inválidas caem para o fim. */
export function sortMockupsByCreatedAtDesc<T extends { created_at: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    return (Number.isNaN(tb) ? -Infinity : tb) - (Number.isNaN(ta) ? -Infinity : ta);
  });
}

/** Extrai o caminho no bucket `mockup-assets` de uma URL pública/assinada. */
export function extractMockupStoragePath(url?: string | null): string | null {
  if (!url) return null;
  const clean = url.split('?')[0] ?? '';
  const match = /\/storage\/v1\/object\/(?:public|sign)\/mockup-assets\/(.+)$/.exec(clean);
  return match?.[1] ?? null;
}

async function signMockupThumbnail(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(MOCKUP_BUCKET)
    .createSignedUrl(path, MOCKUP_THUMBNAIL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    // Best-effort: falha de assinatura é degradação de exibição (o item segue
    // anexável pelo `path`), nunca motivo para derrubar a listagem.
    logger.warn('[useClientMockups] Falha ao assinar miniatura do mockup', { path, error });
    return null;
  }
  return data.signedUrl;
}

async function toClientMockup(row: GeneratedMockupRow): Promise<ClientMockup> {
  const path =
    extractMockupStoragePath(row.mockup_url) ?? extractMockupStoragePath(row.thumbnail_url);
  const signed = path ? await signMockupThumbnail(path) : null;
  return {
    id: row.id,
    productName: row.product_name ?? null,
    techniqueName: row.technique_name ?? null,
    createdAt: row.created_at,
    path,
    // Fallback para a URL pública/legada enquanto o bucket não for privado (etapa 9).
    thumbnailUrl: signed ?? row.mockup_url ?? row.thumbnail_url ?? null,
  };
}

/** Sem `clientId` devolve [] sem consultar o banco. */
export async function fetchClientMockups(
  clientId: string | null | undefined,
  options: FetchClientMockupsOptions = {},
): Promise<ClientMockup[]> {
  const id = clientId?.trim();
  if (!id) return [];

  const { data, error } = await untypedFrom<GeneratedMockupRow>('generated_mockups')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: false })
    .limit(options.limit ?? DEFAULT_CLIENT_MOCKUPS_LIMIT);
  if (error) throw error;

  const rows: GeneratedMockupRow[] = data ?? [];
  return Promise.all(
    sortMockupsByCreatedAtDesc(rows.filter((r) => !isMockupTrashed(r))).map(toClientMockup),
  );
}

/** Sempre habilitado: sem `clientId` o queryFn resolve [] sem requisição. */
export function useClientMockups(
  clientId: string | null | undefined,
  options: UseClientMockupsOptions = {},
) {
  const { limit = DEFAULT_CLIENT_MOCKUPS_LIMIT, staleTime = 5 * 60 * 1000 } = options;
  return useQuery<ClientMockup[]>({
    queryKey: ['client-mockups', clientId ?? null, limit],
    queryFn: () => fetchClientMockups(clientId, { limit }),
    staleTime,
  });
}
