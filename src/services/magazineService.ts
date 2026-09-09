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
} from '@/types/magazine';
import { validateBranding } from '@/lib/security/magazine-guard';

import type { Product } from '@/types/product-catalog';
import { type MagazineDatabase, magazineDb } from '@/integrations/supabase/magazine-schema';
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
  };
}

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
    const insertRow = {
      owner_id: input.ownerId,
      organization_id: input.organizationId ?? null,
      title: input.title?.trim() || 'Nova Revista',
      subtitle: '',
      template_id: input.templateId ?? 'editorial-vogue',
      branding: { ...DEFAULT_BRANDING },
      content_settings: { ...DEFAULT_MAGAZINE_CONTENT },
      status: 'draft' as const,
    };
    const { data, error } = await magazineDb
      .from('magazines')
      .insert(insertRow)
      .select('*')
      .single();
    if (error || !data) {
      throw new Error(`[magazineService.create] ${error?.message ?? 'insert falhou'}`);
    }
    return rowToMagazine(data, []);
  },

  async update(id: string, patch: Partial<Magazine>): Promise<Magazine | null> {
    type MagazineUpdate = MagazineDatabase['public']['Tables']['magazines']['Update'];
    const updateRow: MagazineUpdate = {};
    if ('title' in patch) updateRow.title = patch.title;
    if ('subtitle' in patch) updateRow.subtitle = patch.subtitle;
    if ('templateId' in patch) updateRow.template_id = patch.templateId;
    if ('branding' in patch)
      updateRow.branding = patch.branding as unknown as MagazineUpdate['branding'];
    if ('content' in patch)
      updateRow.content_settings = patch.content as unknown as MagazineUpdate['content_settings'];
    if ('pageOrder' in patch)
      updateRow.page_order = patch.pageOrder as unknown as MagazineUpdate['page_order'];
    if ('status' in patch) updateRow.status = patch.status;
    if ('publicToken' in patch) updateRow.public_token = patch.publicToken;
    if ('publishedAt' in patch) updateRow.published_at = patch.publishedAt;

    if (Object.keys(updateRow).length > 0) {
      const { data, error } = await magazineDb
        .from('magazines')
        .update(updateRow)
        .eq('id', id)
        .select('id')
        .maybeSingle();
      if (error || !data) {
        logger.warn(
          '[magazineService.update] header error:',
          error?.message ?? 'Nenhuma linha atualizada',
        );
        return null;
      }
    }

    // GUARD: update is metadata-only. Legacy full snapshots may include items,
    // but must NEVER delete/reinsert them. Use the dedicated item operations.

    return hydrate(id);
  },

  async updateContent(
    id: string,
    patch: Partial<MagazineContentSettings>,
  ): Promise<Magazine | null> {
    const current = await this.get(id);
    if (!current) return null;
    return this.update(id, { content: { ...current.content, ...patch } });
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
      logger.warn('[magazineService.updateBranding] rejected invalid branding');
      return null;
    }
    return this.update(id, { branding: { ...merged, ...sanitized } });
  },

  async addProducts(id: string, products: Product[]): Promise<Magazine | null> {
    const current = await this.get(id);
    if (!current) return null;
    const existingIds = new Set(current.items.map((i) => i.productId));
    const additions = products.filter((p) => {
      if (existingIds.has(p.id)) return false;
      existingIds.add(p.id);
      return true;
    });
    if (additions.length === 0) return current;
    const basePos = current.items.length;
    const rows = additions.map((p, offset) => ({
      magazine_id: id,
      product_id: p.id,
      product_snapshot: productToSnapshot(
        p,
      ) as unknown as MagazineDatabase['public']['Tables']['magazine_items']['Insert']['product_snapshot'],
      variant_color_name: p.colors?.[0]?.name ?? null,
      position: basePos + offset,
      page_number: null,
      overrides:
        {} as unknown as MagazineDatabase['public']['Tables']['magazine_items']['Insert']['overrides'],
    }));
    const { error } = await magazineDb.from('magazine_items').insert(rows);
    if (error) {
      logger.warn('[magazineService.addProducts] error:', error.message);
      return null;
    }
    // Bumpa updated_at do header
    await magazineDb
      .from('magazines')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);
    return hydrate(id);
  },

  async removeItem(id: string, itemId: string): Promise<Magazine | null> {
    const { error } = await magazineDb
      .from('magazine_items')
      .delete()
      .eq('id', itemId)
      .eq('magazine_id', id);
    if (error) {
      logger.warn('[magazineService.removeItem] error:', error.message);
      return null;
    }
    await magazineDb
      .from('magazines')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);
    return hydrate(id);
  },

  async reorderItems(id: string, orderedIds: string[]): Promise<Magazine | null> {
    // Atualiza posição em paralelo — cada item recebe seu novo índice.
    const results = await Promise.all(
      orderedIds.map((itemId, idx) =>
        magazineDb
          .from('magazine_items')
          .update({ position: idx })
          .eq('id', itemId)
          .eq('magazine_id', id),
      ),
    );
    const anyFailed = results.some((r) => r.error !== null);
    if (anyFailed) {
      const firstError = results.find((r) => r.error)?.error;
      logger.warn('[magazineService.reorderItems] partial failure:', firstError?.message);
      return null;
    }
    await magazineDb
      .from('magazines')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);
    return hydrate(id);
  },

  async updateItem(
    id: string,
    itemId: string,
    patch: Partial<MagazineItem>,
  ): Promise<Magazine | null> {
    type MagazineItemUpdate = MagazineDatabase['public']['Tables']['magazine_items']['Update'];
    const updateRow: MagazineItemUpdate = {};
    if ('productSnapshot' in patch)
      updateRow.product_snapshot =
        patch.productSnapshot as unknown as MagazineItemUpdate['product_snapshot'];
    if ('variantColorName' in patch) updateRow.variant_color_name = patch.variantColorName;
    if ('position' in patch) updateRow.position = patch.position;
    if ('pageNumber' in patch) updateRow.page_number = patch.pageNumber;
    if ('overrides' in patch)
      updateRow.overrides = patch.overrides as unknown as MagazineItemUpdate['overrides'];
    if (Object.keys(updateRow).length > 0) {
      const { error } = await magazineDb
        .from('magazine_items')
        .update(updateRow)
        .eq('id', itemId)
        .eq('magazine_id', id);
      if (error) {
        logger.warn('[magazineService.updateItem] error:', error.message);
        return null;
      }
    }
    await magazineDb
      .from('magazines')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);
    return hydrate(id);
  },

  async duplicate(id: string): Promise<Magazine | null> {
    const { data, error } = await magazineDb.rpc('magazine_duplicate_atomic', {
      p_source_magazine_id: id,
    });
    if (error) {
      logger.warn('[magazineService.duplicate] error:', error.message);
      return null;
    }
    const cloneId =
      data && typeof data === 'object' && !Array.isArray(data) && 'magazine_id' in data
        ? data.magazine_id
        : null;
    if (typeof cloneId !== 'string') {
      logger.warn('[magazineService.duplicate] resposta sem magazine_id');
      return null;
    }
    return hydrate(cloneId);
  },

  async delete(id: string): Promise<void> {
    // Soft-delete: preserva registro para Undo do toast.
    const { error } = await magazineDb
      .from('magazines')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) logger.warn('[magazineService.delete] error:', error.message);
  },

  /**
   * Restaura uma revista deletada (Undo do toast).
   * Estratégia: tenta desmarcar `deleted_at`. Se o registro sumiu (hard-delete),
   * reinsere header + items usando o objeto passado.
   */
  async restore(magazine: Magazine): Promise<Magazine> {
    const { data, error } = await magazineDb
      .from('magazines')
      .update({ deleted_at: null, updated_at: new Date().toISOString() })
      .eq('id', magazine.id)
      .select('*')
      .maybeSingle();

    if (!error && data) {
      const hydrated = await hydrate(magazine.id);
      return hydrated ?? magazine;
    }

    // Hard-deleted: reinsere.
    type MagazineInsert = MagazineDatabase['public']['Tables']['magazines']['Insert'];
    const insertRow: MagazineInsert = {
      id: magazine.id,
      owner_id: magazine.ownerId,
      organization_id: magazine.organizationId,
      title: magazine.title,
      subtitle: magazine.subtitle,
      template_id: magazine.templateId,
      branding: magazine.branding as unknown as MagazineInsert['branding'],
      content_settings: magazine.content as unknown as MagazineInsert['content_settings'],
      page_order: magazine.pageOrder as unknown as MagazineInsert['page_order'],
      status: magazine.status,
      public_token: magazine.publicToken,
      published_at: magazine.publishedAt,
    };
    const { error: insErr } = await magazineDb.from('magazines').insert(insertRow);
    if (insErr) {
      logger.warn('[magazineService.restore] reinsert error:', insErr.message);
      return magazine;
    }
    if (magazine.items.length > 0) {
      const itemRows = magazine.items.map((it, idx) => ({
        magazine_id: magazine.id,
        product_id: it.productId,
        product_snapshot:
          it.productSnapshot as unknown as MagazineDatabase['public']['Tables']['magazine_items']['Insert']['product_snapshot'],
        variant_color_name: it.variantColorName,
        position: idx,
        page_number: it.pageNumber,
        overrides: (it.overrides ??
          {}) as unknown as MagazineDatabase['public']['Tables']['magazine_items']['Insert']['overrides'],
      }));
      const { error: itemsErr } = await magazineDb.from('magazine_items').insert(itemRows);
      if (itemsErr) {
        logger.warn('[magazineService.restore] items reinsert error:', itemsErr.message);
        // Compensating rollback: soft-delete the header we just inserted to
        // avoid an orphan magazine (header in DB with zero items).
        await magazineDb
          .from('magazines')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', magazine.id);
        return magazine; // stale object — caller can retry
      }
    }
    const hydrated = await hydrate(magazine.id);
    return hydrated ?? magazine;
  },

  async publish(id: string): Promise<Magazine | null> {
    // O trigger canônico `tg_magazines_on_publish` é a única autoridade para
    // emitir/revogar public_token. O cliente não gera token: isso evita
    // fallback fraco, corrida entre abas e divergência de política do banco.
    // Falhar sem token é propositalmente fail-closed: não há publicação sem
    // um link público que tenha sido confirmado pelo banco.
    const { error } = await magazineDb.rpc('magazine_publish_atomic', { p_magazine_id: id });
    if (error) {
      logger.warn('[magazineService.publish] error:', error.message);
      return null;
    }

    const hydrated = await hydrate(id);
    if (!hydrated?.publicToken) {
      logger.error('[magazineService.publish] published row has no public token', { id });
      return null;
    }
    return hydrated;
  },

  async unpublish(id: string): Promise<Magazine | null> {
    const { error } = await magazineDb.from('magazines').update({ status: 'draft' }).eq('id', id);
    if (error) {
      logger.warn('[magazineService.unpublish] error:', error.message);
      return null;
    }
    return hydrate(id);
  },
};
