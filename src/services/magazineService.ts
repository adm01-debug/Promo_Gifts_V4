/**
 * MagazineService — persistência v2 no BD Gold (doufsxqlfjyuvxuezpln).
 *
 * Migração 2026-07-12: substituído localStorage por chamadas Supabase
 * (tabelas `magazines`, `magazine_items`) + edge `magazine-public-view`
 * para leitura anônima. Toda a API passa a ser assíncrona.
 *
 * Migração 2026-07-16: queries convertidas para supabase.from() tipado
 * (docs/plans/magazine-typed-queries-migration.md). Campos Json do BD
 * (branding, content_settings, product_snapshot, overrides, page_order) são
 * mapeados via cast explícito nas funções de mapeamento.
 *
 * Hardening 2026-09-09: leituras diretas permanecem tipadas; todas as treze
 * mutações usam RPCs v2 com lock, CAS por edit_version e autorização no banco.
 */

import {
  type Magazine,
  type MagazineClientBranding,
  type MagazineContentSettings,
  type MagazineItem,
  type MagazinePageOrder,
  type MagazineProductSnapshot,
  type MagazineTemplateId,
  DEFAULT_BRANDING,
  DEFAULT_MAGAZINE_CONTENT,
  isValidMagazinePageOrder,
} from '@/types/magazine';
import { validateBranding } from '@/lib/security/magazine-guard';

import type { Product } from '@/types/product-catalog';
import { type MagazineDatabase, magazineDb } from '@/integrations/supabase/magazine-schema';
import type { Json } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';
import { newRequestId, REQUEST_ID_HEADER } from '@/lib/telemetry/requestId';

// ---------------------------------------------------------------------------
// Row shapes derivadas do schema tipado do BD Gold
// ---------------------------------------------------------------------------

type MagazineRow = MagazineDatabase['public']['Tables']['magazines']['Row'];
type MagazineItemRow = MagazineDatabase['public']['Tables']['magazine_items']['Row'];

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function rowToItem(row: MagazineItemRow): MagazineItem {
  return {
    id: row.id,
    productId: row.product_id,
    productSnapshot: row.product_snapshot as unknown as MagazineProductSnapshot,
    variantColorName: row.variant_color_name,
    position: row.position,
    pageNumber: row.page_number,
    overrides: (row.overrides ?? {}) as unknown as Partial<MagazineContentSettings>,
  };
}

function rowToMagazine(row: MagazineRow, items: MagazineItemRow[]): Magazine {
  return {
    id: row.id,
    ownerId: row.owner_id,
    organizationId: row.organization_id,
    title: row.title,
    subtitle: row.subtitle ?? '',
    templateId: row.template_id as MagazineTemplateId,
    branding: {
      ...DEFAULT_BRANDING,
      ...((row.branding as unknown as MagazineClientBranding) ?? {}),
      colors: {
        ...DEFAULT_BRANDING.colors,
        ...((row.branding as unknown as MagazineClientBranding)?.colors ?? {}),
      },
    },
    content: {
      ...DEFAULT_MAGAZINE_CONTENT,
      ...((row.content_settings as unknown as MagazineContentSettings) ?? {}),
    },
    items: [...items].sort((a, b) => a.position - b.position).map(rowToItem),
    pageOrder: row.page_order as unknown as MagazinePageOrder,
    status: row.status as 'archived' | 'draft' | 'published',
    publicToken: row.public_token,
    viewCount: row.view_count ?? 0,
    publishedAt: row.published_at,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    editVersion: row.edit_version,
  };
}

export type MagazineMetadataPatch = Partial<
  Pick<Magazine, 'branding' | 'content' | 'pageOrder' | 'subtitle' | 'templateId' | 'title'>
>;

type MutationResponse = Record<string, unknown> & {
  edit_version?: number;
  updated_at?: string;
};

export class MagazineMutationError extends Error {
  readonly code: string | undefined;
  readonly operation: string;

  constructor(operation: string, message: string, code?: string) {
    super(message);
    this.name = 'MagazineMutationError';
    this.operation = operation;
    this.code = code;
  }
}

function mutationError(operation: string, error: { code?: string; message: string }) {
  const conflict = error.code === '40001' || error.message.includes('magazine_edit_conflict');
  return new MagazineMutationError(
    operation,
    conflict
      ? 'Esta revista foi alterada em outra sessão. Recarregue antes de salvar novamente.'
      : `Não foi possível ${operation}: ${error.message}`,
    error.code,
  );
}

function asMutationResponse(operation: string, value: unknown): MutationResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new MagazineMutationError(operation, `Resposta inválida ao ${operation}.`);
  }
  return value as MutationResponse;
}

function assertExpectedVersion(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new MagazineMutationError(
      'salvar a revista',
      'Versão de edição inválida. Recarregue a revista.',
    );
  }
  return value;
}

async function resolveExpectedVersion(id: string, expected?: number): Promise<number> {
  if (expected !== undefined) return assertExpectedVersion(expected);
  const current = await fetchMagazineRow(id);
  if (!current) throw new MagazineMutationError('localizar a revista', 'Revista não encontrada.');
  return assertExpectedVersion(current.edit_version);
}

async function hydrateMutation(
  id: string,
  operation: string,
  response: MutationResponse,
): Promise<Magazine> {
  const updated = await hydrate(id);
  if (!updated) {
    throw new MagazineMutationError(
      operation,
      `O banco confirmou ${operation}, mas a revista não foi recarregada.`,
    );
  }
  if (typeof response.edit_version === 'number' && updated.editVersion < response.edit_version) {
    throw new MagazineMutationError(
      operation,
      `A revisão confirmada por ${operation} não foi observada na leitura.`,
    );
  }
  return updated;
}

const duplicateIntents = new Map<string, { editVersion: number; key: string }>();
const deletedVersions = new Map<string, number>();

/**
 * Snapshot puro (produto → JSON armazenado em magazine_items.product_snapshot).
 * Continua síncrono — não depende do BD.
 */
export function productToSnapshot(product: Product): MagazineProductSnapshot {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    shortDescription: product.shortDescription ?? '',
    description: product.description ?? null,
    price: product.price,
    sale_price: product.sale_price,
    image_url: product.primary_image_url || product.image_url || product.images?.[0] || '',
    images: product.images ?? [],
    colors: product.colors ?? [],
    category_name: product.category_name ?? null,
    category_id: product.category_id ?? null,
    materials: product.materials ?? [],
    hasPersonalization: product.hasPersonalization ?? null,
    dimensions: product.dimensions,
  };
}

// ---------------------------------------------------------------------------
// Low-level fetchers
// ---------------------------------------------------------------------------

async function fetchMagazineRow(id: string): Promise<MagazineRow | null> {
  const { data, error } = await magazineDb
    .from('magazines')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) {
    logger.warn('[magazineService] fetchMagazineRow error:', error.message);
    throw new Error('Não foi possível carregar a revista.');
  }
  return data ?? null;
}

async function fetchItems(magazineId: string): Promise<MagazineItemRow[]> {
  const { data, error } = await magazineDb
    .from('magazine_items')
    .select('*')
    .eq('magazine_id', magazineId)
    .order('position', { ascending: true });
  if (error) {
    logger.warn('[magazineService] fetchItems error:', error.message);
    throw new Error('Não foi possível carregar os produtos da revista.');
  }
  return data ?? [];
}

const MAGAZINE_ITEMS_PAGE_SIZE = 1_000;

/** Pagina com ordem única para não truncar cards no limite do PostgREST. */
async function fetchItemsForMagazines(magazineIds: string[]): Promise<MagazineItemRow[]> {
  const items: MagazineItemRow[] = [];
  for (let offset = 0; ; offset += MAGAZINE_ITEMS_PAGE_SIZE) {
    const { data, error } = await magazineDb
      .from('magazine_items')
      .select('*')
      .in('magazine_id', magazineIds)
      .order('id', { ascending: true })
      .range(offset, offset + MAGAZINE_ITEMS_PAGE_SIZE - 1);
    if (error) {
      logger.warn('[magazineService] fetchItemsForMagazines error:', error.message);
      throw new Error('Não foi possível carregar os produtos das revistas.');
    }
    const page = data ?? [];
    items.push(...page);
    if (page.length < MAGAZINE_ITEMS_PAGE_SIZE) break;
  }
  return items;
}

async function hydrate(id: string): Promise<Magazine | null> {
  const row = await fetchMagazineRow(id);
  if (!row) return null;
  const items = await fetchItems(id);
  return rowToMagazine(row, items);
}

// ---------------------------------------------------------------------------
// Public-view edge
// ---------------------------------------------------------------------------

interface PublicViewPayload {
  id: string;
  title: string;
  subtitle: string | null;
  templateId: MagazineTemplateId;
  branding: MagazineClientBranding;
  content: MagazineContentSettings;
  pageOrder: MagazinePageOrder;
  status: Magazine['status'];
  items: Array<{
    id: string;
    productId: string;
    productSnapshot: MagazineProductSnapshot;
    variantColorName: string | null;
    position: number;
    pageNumber: number | null;
    overrides: Partial<MagazineContentSettings>;
  }>;
}

async function callPublicView(token: string): Promise<PublicViewPayload | null> {
  const base = (import.meta.env.VITE_SUPABASE_URL as string) ?? '';
  const anonKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ?? '';
  if (!base) return null;
  try {
    const url = `${base}/functions/v1/magazine-public-view?token=${encodeURIComponent(token)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        [REQUEST_ID_HEADER]: newRequestId(),
        ...(anonKey ? { apikey: anonKey } : {}),
      },
    });
    if (!res.ok) {
      await res.text().catch(() => '');
      return null;
    }
    return (await res.json()) as PublicViewPayload;
  } catch (err) {
    logger.warn('[magazineService] callPublicView failed:', err);
    return null;
  }
}

function publicPayloadToMagazine(token: string, p: PublicViewPayload): Magazine {
  return {
    id: p.id,
    ownerId: '',
    organizationId: null,
    title: p.title,
    subtitle: p.subtitle ?? '',
    templateId: p.templateId,
    branding: { ...DEFAULT_BRANDING, ...(p.branding ?? {}) },
    content: { ...DEFAULT_MAGAZINE_CONTENT, ...(p.content ?? {}) },
    items: [...p.items]
      .sort((a, b) => a.position - b.position)
      .map((it) => ({
        id: it.id,
        productId: it.productId,
        productSnapshot: it.productSnapshot,
        variantColorName: it.variantColorName,
        position: it.position,
        pageNumber: it.pageNumber,
        overrides: it.overrides ?? {},
      })),
    pageOrder: p.pageOrder,
    status: p.status,
    publicToken: token,
    viewCount: 0,
    publishedAt: null,
    archivedAt: null,
    createdAt: '',
    updatedAt: '',
    editVersion: 0,
  };
}

// ---------------------------------------------------------------------------
// Service API (async)
// ---------------------------------------------------------------------------

export const magazineService = {
  async list(ownerId: string): Promise<Magazine[]> {
    const { data, error } = await magazineDb
      .from('magazines')
      .select('*')
      .eq('owner_id', ownerId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });
    if (error) {
      logger.warn('[magazineService.list] error:', error.message);
      throw new Error('Não foi possível carregar as revistas.');
    }
    const rows: MagazineRow[] = data ?? [];
    if (rows.length === 0) return [];
    // Busca todos os itens em páginas estáveis para não depender do db-max-rows.
    const ids = rows.map((r) => r.id);
    const items = await fetchItemsForMagazines(ids);
    const byMag = new Map<string, MagazineItemRow[]>();
    for (const it of items) {
      const arr = byMag.get(it.magazine_id) ?? [];
      arr.push(it);
      byMag.set(it.magazine_id, arr);
    }
    return rows.map((r) => rowToMagazine(r, byMag.get(r.id) ?? []));
  },

  async get(id: string): Promise<Magazine | null> {
    return hydrate(id);
  },

  async getByToken(token: string): Promise<Magazine | null> {
    const payload = await callPublicView(token);
    return payload ? publicPayloadToMagazine(token, payload) : null;
  },

  /** Alias explícito — leitura pública SEMPRE vai pela edge. */
  async getPublicByToken(token: string): Promise<Magazine | null> {
    return this.getByToken(token);
  },

  async create(input: {
    ownerId: string;
    organizationId?: string | null;
    title?: string;
    templateId?: MagazineTemplateId;
  }): Promise<Magazine> {
    const { data, error } = await magazineDb.rpc('magazine_create_v2', {
      // PostgreSQL parameters are nullable unless declared otherwise, but the
      // generated PostgREST type cannot express argument nullability.
      p_organization_id: (input.organizationId ?? null) as unknown as string,
      p_title: input.title?.trim() || 'Nova Revista',
      p_template_id: input.templateId ?? 'editorial-vogue',
    });
    if (error) throw mutationError('criar a revista', error);
    const response = asMutationResponse('criar a revista', data);
    const magazineId = response.magazine_id;
    if (typeof magazineId !== 'string') {
      throw new MagazineMutationError(
        'criar a revista',
        'Resposta sem o identificador da revista.',
      );
    }
    return hydrateMutation(magazineId, 'criar a revista', response);
  },

  async update(
    id: string,
    patch: MagazineMetadataPatch,
    expectedEditVersion?: number,
  ): Promise<Magazine> {
    const rpcPatch: Record<string, unknown> = {};
    if ('title' in patch) rpcPatch.title = patch.title;
    if ('subtitle' in patch) rpcPatch.subtitle = patch.subtitle;
    if ('templateId' in patch) rpcPatch.template_id = patch.templateId;
    if ('branding' in patch) {
      const validation = validateBranding(patch.branding);
      if (!validation.isValid) {
        throw new MagazineMutationError(
          'salvar a identidade visual',
          'Identidade visual inválida.',
        );
      }
      rpcPatch.branding = { ...patch.branding, ...validation.sanitized };
    }
    if ('content' in patch) rpcPatch.content_settings = patch.content;
    if ('pageOrder' in patch) {
      if (!isValidMagazinePageOrder(patch.pageOrder)) {
        throw new MagazineMutationError('salvar a ordem das páginas', 'Ordem de páginas inválida.');
      }
      rpcPatch.page_order = patch.pageOrder;
    }
    if (Object.keys(rpcPatch).length === 0) {
      const current = await hydrate(id);
      if (!current) throw new MagazineMutationError('salvar a revista', 'Revista não encontrada.');
      return current;
    }

    const version = await resolveExpectedVersion(id, expectedEditVersion);
    const { data, error } = await magazineDb.rpc('magazine_update_metadata_v2', {
      p_magazine_id: id,
      p_expected_edit_version: version,
      p_patch: rpcPatch as Json,
    });
    if (error) throw mutationError('salvar a revista', error);
    return hydrateMutation(id, 'salvar a revista', asMutationResponse('salvar a revista', data));
  },

  async updateContent(
    id: string,
    patch: Partial<MagazineContentSettings>,
  ): Promise<Magazine | null> {
    const current = await this.get(id);
    if (!current) return null;
    return this.update(id, { content: { ...current.content, ...patch } }, current.editVersion);
  },

  async updateBranding(
    id: string,
    patch: Partial<MagazineClientBranding>,
  ): Promise<Magazine | null> {
    const current = await this.get(id);
    if (!current) return null;
    // Deep-merge colors so a partial patch ({ colors: { primary } }) or
    // DB-deserialized branding with missing keys does not silently drop
    // secondary/text (shallow spread would overwrite the whole colors object).
    const merged = {
      ...current.branding,
      ...patch,
      colors: patch.colors
        ? { ...current.branding.colors, ...patch.colors }
        : current.branding.colors,
    };
    const { isValid, sanitized } = validateBranding(merged);
    if (!isValid) {
      throw new MagazineMutationError('salvar a identidade visual', 'Identidade visual inválida.');
    }
    return this.update(id, { branding: { ...merged, ...sanitized } }, current.editVersion);
  },

  async addProducts(
    id: string,
    products: Product[],
    expectedEditVersion?: number,
  ): Promise<Magazine> {
    if (products.length === 0) {
      const current = await hydrate(id);
      if (!current)
        throw new MagazineMutationError('adicionar produtos', 'Revista não encontrada.');
      return current;
    }
    const rows = products.map((p) => ({
      product_id: p.id,
      product_snapshot: productToSnapshot(p),
      variant_color_name: p.colors?.[0]?.name ?? null,
      page_number: null,
      overrides: {},
    }));
    const version = await resolveExpectedVersion(id, expectedEditVersion);
    const { data, error } = await magazineDb.rpc('magazine_add_items_v2', {
      p_magazine_id: id,
      p_expected_edit_version: version,
      p_items: rows as unknown as Json,
    });
    if (error) throw mutationError('adicionar produtos', error);
    return hydrateMutation(
      id,
      'adicionar produtos',
      asMutationResponse('adicionar produtos', data),
    );
  },

  async removeItem(id: string, itemId: string, expectedEditVersion?: number): Promise<Magazine> {
    const version = await resolveExpectedVersion(id, expectedEditVersion);
    const { data, error } = await magazineDb.rpc('magazine_remove_items_v2', {
      p_magazine_id: id,
      p_expected_edit_version: version,
      p_item_ids: [itemId],
    });
    if (error) throw mutationError('remover o produto', error);
    return hydrateMutation(id, 'remover o produto', asMutationResponse('remover o produto', data));
  },

  async reorderItems(
    id: string,
    orderedIds: string[],
    expectedEditVersion?: number,
  ): Promise<Magazine> {
    const version = await resolveExpectedVersion(id, expectedEditVersion);
    const { data, error } = await magazineDb.rpc('magazine_reorder_items_v2', {
      p_magazine_id: id,
      p_expected_edit_version: version,
      p_ordered_item_ids: orderedIds,
    });
    if (error) throw mutationError('reordenar os produtos', error);
    return hydrateMutation(
      id,
      'reordenar os produtos',
      asMutationResponse('reordenar os produtos', data),
    );
  },

  async updateItem(
    id: string,
    itemId: string,
    patch: Partial<MagazineItem>,
    expectedEditVersion?: number,
  ): Promise<Magazine> {
    const updateRow: Record<string, unknown> = {};
    if ('productSnapshot' in patch) updateRow.product_snapshot = patch.productSnapshot;
    if ('variantColorName' in patch) updateRow.variant_color_name = patch.variantColorName;
    if ('position' in patch) updateRow.position = patch.position;
    if ('pageNumber' in patch) updateRow.page_number = patch.pageNumber;
    if ('overrides' in patch) updateRow.overrides = patch.overrides;
    if (Object.keys(updateRow).length === 0) {
      const current = await hydrate(id);
      if (!current)
        throw new MagazineMutationError('atualizar o produto', 'Revista não encontrada.');
      return current;
    }
    const version = await resolveExpectedVersion(id, expectedEditVersion);
    const { data, error } = await magazineDb.rpc('magazine_update_item_v2', {
      p_magazine_id: id,
      p_expected_edit_version: version,
      p_item_id: itemId,
      p_patch: updateRow as Json,
    });
    if (error) throw mutationError('atualizar o produto', error);
    return hydrateMutation(
      id,
      'atualizar o produto',
      asMutationResponse('atualizar o produto', data),
    );
  },

  async duplicate(
    id: string,
    expectedEditVersion?: number,
    options: { idempotencyKey?: string; title?: string } = {},
  ): Promise<Magazine> {
    let intent = duplicateIntents.get(id);
    if (!intent) {
      intent = {
        editVersion: await resolveExpectedVersion(id, expectedEditVersion),
        key: options.idempotencyKey ?? globalThis.crypto?.randomUUID?.() ?? newRequestId(),
      };
      duplicateIntents.set(id, intent);
    }
    const { data, error } = await magazineDb.rpc('magazine_duplicate_v2', {
      p_source_magazine_id: id,
      p_expected_edit_version: intent.editVersion,
      p_idempotency_key: intent.key,
      ...(options.title === undefined ? {} : { p_title: options.title }),
    });
    if (error) {
      throw mutationError('duplicar a revista', error);
    }
    const cloneId =
      data && typeof data === 'object' && !Array.isArray(data) && 'magazine_id' in data
        ? data.magazine_id
        : null;
    if (typeof cloneId !== 'string') {
      throw new MagazineMutationError(
        'duplicar a revista',
        'Resposta sem o identificador da cópia.',
      );
    }
    const clone = await hydrateMutation(
      cloneId,
      'duplicar a revista',
      asMutationResponse('duplicar a revista', data),
    );
    duplicateIntents.delete(id);
    return clone;
  },

  async delete(id: string, expectedEditVersion?: number): Promise<void> {
    const version = await resolveExpectedVersion(id, expectedEditVersion);
    const { data, error } = await magazineDb.rpc('magazine_soft_delete_v2', {
      p_magazine_id: id,
      p_expected_edit_version: version,
    });
    if (error) throw mutationError('excluir a revista', error);
    const response = asMutationResponse('excluir a revista', data);
    if (typeof response.edit_version !== 'number') {
      throw new MagazineMutationError(
        'excluir a revista',
        'Resposta sem a nova versão da revista.',
      );
    }
    deletedVersions.set(id, response.edit_version);
  },

  /**
   * Restaura uma revista deletada (Undo do toast).
   * Estratégia: tenta desmarcar `deleted_at`. Se o registro sumiu (hard-delete),
   * reinsere header + items usando o objeto passado.
   */
  async restore(magazine: Magazine): Promise<Magazine> {
    const expectedEditVersion = deletedVersions.get(magazine.id) ?? magazine.editVersion;
    const { data, error } = await magazineDb.rpc('magazine_restore_v2', {
      p_magazine_id: magazine.id,
      p_expected_edit_version: assertExpectedVersion(expectedEditVersion),
    });
    if (error) throw mutationError('restaurar a revista', error);
    const restored = await hydrateMutation(
      magazine.id,
      'restaurar a revista',
      asMutationResponse('restaurar a revista', data),
    );
    deletedVersions.delete(magazine.id);
    return restored;
  },

  async publish(id: string, expectedEditVersion?: number): Promise<Magazine> {
    // O trigger canônico `tg_magazines_on_publish` é a única autoridade para
    // emitir/revogar public_token. O cliente não gera token: isso evita
    // fallback fraco, corrida entre abas e divergência de política do banco.
    // Falhar sem token é propositalmente fail-closed: não há publicação sem
    // um link público que tenha sido confirmado pelo banco.
    const version = await resolveExpectedVersion(id, expectedEditVersion);
    const { data, error } = await magazineDb.rpc('magazine_publish_v2', {
      p_magazine_id: id,
      p_expected_edit_version: version,
    });
    if (error) throw mutationError('publicar a revista', error);
    const hydrated = await hydrateMutation(
      id,
      'publicar a revista',
      asMutationResponse('publicar a revista', data),
    );
    if (!hydrated.publicToken || hydrated.status !== 'published') {
      throw new MagazineMutationError(
        'publicar a revista',
        'O banco não confirmou o status e o link público da revista.',
      );
    }
    return hydrated;
  },

  async unpublish(id: string, expectedEditVersion?: number): Promise<Magazine> {
    const version = await resolveExpectedVersion(id, expectedEditVersion);
    const { data, error } = await magazineDb.rpc('magazine_unpublish_v2', {
      p_magazine_id: id,
      p_expected_edit_version: version,
    });
    if (error) throw mutationError('despublicar a revista', error);
    return hydrateMutation(
      id,
      'despublicar a revista',
      asMutationResponse('despublicar a revista', data),
    );
  },

  async archive(id: string, expectedEditVersion?: number): Promise<Magazine> {
    const version = await resolveExpectedVersion(id, expectedEditVersion);
    const { data, error } = await magazineDb.rpc('magazine_archive_v2', {
      p_magazine_id: id,
      p_expected_edit_version: version,
    });
    if (error) throw mutationError('arquivar a revista', error);
    return hydrateMutation(
      id,
      'arquivar a revista',
      asMutationResponse('arquivar a revista', data),
    );
  },

  async reactivate(id: string, expectedEditVersion?: number): Promise<Magazine> {
    const version = await resolveExpectedVersion(id, expectedEditVersion);
    const { data, error } = await magazineDb.rpc('magazine_reactivate_v2', {
      p_magazine_id: id,
      p_expected_edit_version: version,
    });
    if (error) throw mutationError('reativar a revista', error);
    return hydrateMutation(
      id,
      'reativar a revista',
      asMutationResponse('reativar a revista', data),
    );
  },
};
