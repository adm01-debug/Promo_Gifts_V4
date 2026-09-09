/**
 * magazineService — fuzz de lifecycle com mock in-memory de supabase.from().
 *
 * 100+ cenários combinatoriais (fast-check) sobre create/update/addProducts/
 * removeItem/reorderItems/duplicate/delete/restore/publish/unpublish e
 * round-trip snake_case ↔ camelCase.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';

// ============================================================================
// In-memory "Supabase" — cobre o subset usado por magazineService
// ============================================================================

interface Store {
  magazines: Map<string, Record<string, unknown>>;
  magazine_items: Map<string, Record<string, unknown>>;
}

const store: Store = {
  magazines: new Map(),
  magazine_items: new Map(),
};

let uidCounter = 0;
let rejectItemInsert = false;
function uid(prefix = 'r') {
  const next = ++uidCounter;
  if (prefix === 'itm') {
    return `00000000-0000-4000-8000-${String(next).padStart(12, '0')}`;
  }
  return `${prefix}_${next}`;
}

function nowIso() {
  return new Date().toISOString();
}

interface QueryState {
  table: keyof Store;
  filters: Array<[string, unknown]>;
  isFilters: Array<[string, unknown]>;
  inFilters: Array<[string, unknown[]]>;
  op: 'select' | 'insert' | 'update' | 'delete' | null;
  payload: unknown;
  selectAfter: boolean;
  orderBy: { col: string; ascending: boolean } | null;
  range: [number, number] | null;
}

function newState(table: keyof Store): QueryState {
  return {
    table,
    filters: [],
    isFilters: [],
    inFilters: [],
    op: null,
    payload: null,
    selectAfter: false,
    orderBy: null,
    range: null,
  };
}

function matchesRow(row: Record<string, unknown>, s: QueryState): boolean {
  for (const [k, v] of s.filters) if (row[k] !== v) return false;
  for (const [k, v] of s.isFilters) {
    if (v === null && row[k] != null) return false;
    if (v !== null && row[k] !== v) return false;
  }
  for (const [k, arr] of s.inFilters) if (!arr.includes(row[k])) return false;
  return true;
}

function collect(s: QueryState): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (const r of store[s.table].values()) if (matchesRow(r, s)) rows.push(r);
  if (s.orderBy) {
    const { col, ascending } = s.orderBy;
    rows.sort((a, b) => {
      const av = a[col] as number | string;
      const bv = b[col] as number | string;
      if (av === bv) return 0;
      const cmp = av > bv ? 1 : -1;
      return ascending ? cmp : -cmp;
    });
  }
  return s.range ? rows.slice(s.range[0], s.range[1] + 1) : rows;
}

function makeBuilder(s: QueryState) {
  const finish = async (single: 'single' | 'maybeSingle' | 'many') => {
    if (s.op === 'insert') {
      if (s.table === 'magazine_items' && rejectItemInsert) {
        return { data: null, error: { message: 'Synthetic insert denied' } };
      }
      const payload = Array.isArray(s.payload) ? s.payload : [s.payload];
      const inserted: Record<string, unknown>[] = [];
      for (const p of payload as Record<string, unknown>[]) {
        const id = (p.id as string) ?? uid(s.table === 'magazines' ? 'mag' : 'itm');
        const row: Record<string, unknown> = {
          ...p,
          id,
          created_at: p.created_at ?? nowIso(),
          updated_at: p.updated_at ?? nowIso(),
        };
        // FK enforcement: magazine_items require magazine_id present
        if (s.table === 'magazine_items' && !row.magazine_id) {
          return { data: null, error: { message: 'magazine_id required' } };
        }
        if (
          s.table === 'magazine_items' &&
          !store.magazines.has(row.magazine_id as string)
        ) {
          return { data: null, error: { message: 'FK violation magazine_id' } };
        }
        store[s.table].set(id, row);
        inserted.push(row);
      }
      const data = single === 'many' ? inserted : inserted[0] ?? null;
      return { data, error: null };
    }
    if (s.op === 'update') {
      const patch = s.payload as Record<string, unknown>;
      const rows = collect(s);
      for (const r of rows) {
        // Espelha o contrato do trigger canônico tg_magazines_on_publish:
        // publicar gera token no banco, nunca no browser. Este mock de
        // integração deve falhar caso o serviço volte a depender de fallback.
        if (
          s.table === 'magazines' &&
          patch.status === 'published' &&
          !r.public_token
        ) {
          r.public_token = 'ab'.repeat(16);
          r.published_at = nowIso();
        }
        Object.assign(r, patch, { updated_at: nowIso() });
      }
      const data = single === 'many' ? rows : rows[0] ?? null;
      return { data, error: null };
    }
    if (s.op === 'delete') {
      const rows = collect(s);
      for (const r of rows) store[s.table].delete(r.id as string);
      return { data: null, error: null };
    }
    // select
    const rows = collect(s);
    if (single === 'single') {
      if (rows.length !== 1) return { data: null, error: { message: 'not found' } };
      return { data: rows[0], error: null };
    }
    if (single === 'maybeSingle') return { data: rows[0] ?? null, error: null };
    return { data: rows, error: null };
  };

  const builder = {
    select() {
      if (!s.op) s.op = 'select';
      else s.selectAfter = true;
      return builder;
    },
    insert(payload: unknown) {
      s.op = 'insert';
      s.payload = payload;
      return builder;
    },
    update(payload: unknown) {
      s.op = 'update';
      s.payload = payload;
      return builder;
    },
    delete() {
      s.op = 'delete';
      return builder;
    },
    eq(col: string, val: unknown) {
      s.filters.push([col, val]);
      return builder;
    },
    is(col: string, val: unknown) {
      s.isFilters.push([col, val]);
      return builder;
    },
    in(col: string, arr: unknown[]) {
      s.inFilters.push([col, arr]);
      return builder;
    },
    order(col: string, opts?: { ascending?: boolean }) {
      s.orderBy = { col, ascending: opts?.ascending ?? true };
      return builder;
    },
    range(from: number, to: number) {
      s.range = [from, to];
      return builder;
    },
    single: () => finish('single'),
    maybeSingle: () => finish('maybeSingle'),
    then(onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) {
      return finish('many').then(onFulfilled, onRejected);
    },
  };
  return builder;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => makeBuilder(newState(table as keyof Store)),
    rpc: (name: string, args: Record<string, unknown>) => {
      const mutationResult = (row: Record<string, unknown>) => ({
        data: { magazine_id: row.id, edit_version: row.edit_version },
        error: null,
      });
      const versionedMagazine = () => {
        const id = args.p_magazine_id as string;
        const row = store.magazines.get(id);
        if (!row) return null;
        if (row.edit_version !== args.p_expected_edit_version) return null;
        row.edit_version = Number(row.edit_version) + 1;
        row.updated_at = nowIso();
        return row;
      };

      if (name === 'magazine_create_v2') {
        const id = uid('mag');
        const now = nowIso();
        const row: Record<string, unknown> = {
          id,
          owner_id: 'u1',
          organization_id: args.p_organization_id ?? null,
          title: args.p_title ?? 'Nova Revista',
          subtitle: '',
          template_id: args.p_template_id ?? 'editorial-vogue',
          branding: {},
          content_settings: {},
          page_order: null,
          status: 'draft',
          edit_version: 0,
          public_token: null,
          published_at: null,
          archived_at: null,
          deleted_at: null,
          view_count: 0,
          created_at: now,
          updated_at: now,
        };
        store.magazines.set(id, row);
        return mutationResult(row);
      }

      if (name === 'magazine_update_metadata_v2') {
        const patch = args.p_patch as Record<string, unknown>;
        if (
          Object.hasOwn(patch, 'title') &&
          (typeof patch.title !== 'string' || patch.title.trim().length === 0)
        ) {
          return { data: null, error: { message: 'magazine_title_invalid' } };
        }
        const row = versionedMagazine();
        if (!row) return { data: null, error: { message: 'magazine_edit_conflict' } };
        Object.assign(row, patch);
        return mutationResult(row);
      }

      if (name === 'magazine_add_items_v2') {
        if (rejectItemInsert) return { data: null, error: { message: 'Synthetic insert denied' } };
        const row = versionedMagazine();
        if (!row) return { data: null, error: { message: 'magazine_edit_conflict' } };
        const existingProductIds = new Set(
          [...store.magazine_items.values()]
            .filter((item) => item.magazine_id === row.id)
            .map((item) => item.product_id),
        );
        for (const input of (args.p_items as Record<string, unknown>[])) {
          if (existingProductIds.has(input.product_id)) continue;
          const itemId = uid('itm');
          store.magazine_items.set(itemId, {
            ...input,
            id: itemId,
            magazine_id: row.id,
            position: [...store.magazine_items.values()].filter((i) => i.magazine_id === row.id).length,
            created_at: nowIso(),
            updated_at: nowIso(),
          });
          existingProductIds.add(input.product_id);
        }
        return mutationResult(row);
      }

      if (name === 'magazine_remove_items_v2') {
        const row = versionedMagazine();
        if (!row) return { data: null, error: { message: 'magazine_edit_conflict' } };
        for (const id of args.p_item_ids as string[]) store.magazine_items.delete(id);
        return mutationResult(row);
      }

      if (name === 'magazine_reorder_items_v2') {
        const row = versionedMagazine();
        if (!row) return { data: null, error: { message: 'magazine_edit_conflict' } };
        (args.p_ordered_item_ids as string[]).forEach((id, position) => {
          const item = store.magazine_items.get(id);
          if (item) item.position = position;
        });
        return mutationResult(row);
      }

      if (name === 'magazine_update_item_v2') {
        const row = versionedMagazine();
        const item = store.magazine_items.get(args.p_item_id as string);
        if (!row || !item) return { data: null, error: { message: 'magazine_edit_conflict' } };
        Object.assign(item, args.p_patch);
        return mutationResult(row);
      }

      if (name === 'magazine_soft_delete_v2' || name === 'magazine_restore_v2') {
        const row = versionedMagazine();
        if (!row) return { data: null, error: { message: 'magazine_edit_conflict' } };
        row.deleted_at = name === 'magazine_soft_delete_v2' ? nowIso() : null;
        return mutationResult(row);
      }

      if (name === 'magazine_unpublish_v2') {
        const row = versionedMagazine();
        if (!row) return { data: null, error: { message: 'magazine_edit_conflict' } };
        row.status = 'draft';
        row.public_token = null;
        row.published_at = null;
        return mutationResult(row);
      }

      if (name === 'magazine_duplicate_atomic' || name === 'magazine_duplicate_v2') {
        const sourceId = args.p_source_magazine_id as string;
        const source = store.magazines.get(sourceId);
        if (!source) return { data: null, error: { message: 'magazine_not_found' } };
        if (name === 'magazine_duplicate_v2' && source.edit_version !== args.p_expected_edit_version) {
          return { data: null, error: { message: 'magazine_edit_conflict' } };
        }

        const cloneId = uid('mag');
        const idMap = new Map<string, string>();
        const sourceItems = [...store.magazine_items.values()]
          .filter((item) => item.magazine_id === sourceId)
          .sort((a, b) => Number(a.position) - Number(b.position));
        for (const item of sourceItems) {
          const itemId = uid('itm');
          idMap.set(item.id as string, itemId);
          store.magazine_items.set(itemId, {
            ...structuredClone(item),
            id: itemId,
            magazine_id: cloneId,
            created_at: nowIso(),
            updated_at: nowIso(),
          });
        }

        const pageOrder = structuredClone(source.page_order);
        if (pageOrder && typeof pageOrder === 'object' && !Array.isArray(pageOrder)) {
          const pages = (pageOrder as { pages?: unknown }).pages;
          if (Array.isArray(pages)) {
            for (const page of pages) {
              if (!page || typeof page !== 'object' || !('itemIds' in page)) continue;
              const itemIds = (page as { itemIds?: unknown }).itemIds;
              if (Array.isArray(itemIds)) {
                (page as { itemIds: unknown[] }).itemIds = itemIds.map(
                  (itemId) => idMap.get(String(itemId)) ?? itemId,
                );
              }
            }
          }
        }

        store.magazines.set(cloneId, {
          ...structuredClone(source),
          id: cloneId,
          owner_id: source.owner_id,
          title:
            typeof args.p_title === 'string' && args.p_title.trim()
              ? args.p_title.trim()
              : `${String(source.title)} (cópia)`,
          page_order: pageOrder,
          status: 'draft',
          edit_version: 0,
          public_token: null,
          published_at: null,
          archived_at: null,
          deleted_at: null,
          created_at: nowIso(),
          updated_at: nowIso(),
        });
        return { data: { magazine_id: cloneId, edit_version: 0 }, error: null };
      }

      if (name !== 'magazine_publish_atomic' && name !== 'magazine_publish_v2') {
        return { data: null, error: { message: `Unsupported RPC: ${name}` } };
      }

      const magazineId = args.p_magazine_id as string;
      const row = store.magazines.get(magazineId);
      const hasItems = [...store.magazine_items.values()].some(
        (item) => item.magazine_id === magazineId,
      );
      if (!row || typeof row.title !== 'string' || row.title.trim() === '' || !hasItems) {
        return { data: null, error: { message: 'magazine_publish_requirements_not_met' } };
      }
      if (name === 'magazine_publish_v2' && row.edit_version !== args.p_expected_edit_version) {
        return { data: null, error: { message: 'magazine_edit_conflict' } };
      }

      // Simula a transação canônica: status e token tornam-se visíveis juntos.
      row.status = 'published';
      row.public_token ??= 'ab'.repeat(16);
      row.published_at ??= nowIso();
      row.updated_at = nowIso();
      row.edit_version = Number(row.edit_version) + 1;
      return {
        data: { magazine_id: magazineId, edit_version: row.edit_version, public_token: row.public_token },
        error: null,
      };
    },
  },
}));

// Import DEPOIS dos mocks
import { magazineService, productToSnapshot } from '@/services/magazineService';
import type { Product } from '@/types/product-catalog';

function mkProduct(seed: string, colorName?: string | null): Product {
  return {
    id: `p_${seed}`,
    name: `Produto ${seed}`,
    sku: `SKU-${seed}`,
    shortDescription: '',
    description: null,
    price: 10,
    sale_price: undefined,
    primary_image_url: '',
    image_url: '',
    images: [],
    colors: colorName ? [{ name: colorName, hex: '#000', image: '' }] : [],
    category_name: null,
    category_id: null,
    materials: [],
    hasPersonalization: null,
  } as unknown as Product;
}

beforeEach(() => {
  store.magazines.clear();
  store.magazine_items.clear();
  uidCounter = 0;
  rejectItemInsert = false;
});

// ============================================================================

describe('magazineService — lifecycle happy path', () => {
  it('snapshot legado ao editar título não apaga itens quando INSERT está indisponível', async () => {
    const mag = await magazineService.create({ ownerId: 'u1' });
    const snapshot = (await magazineService.addProducts(mag.id, [mkProduct('safe')]))!;
    const before = [...store.magazine_items.values()].map((item) => ({ ...item }));
    rejectItemInsert = true;
    await magazineService.update(mag.id, { ...snapshot, title: 'Sem perda' });
    expect([...store.magazine_items.values()]).toEqual(before);
    expect((await magazineService.get(mag.id))?.title).toBe('Sem perda');
  });

  it('snapshot legado de metadados preserva IDs e ordem dos itens', async () => {
    const mag = await magazineService.create({ ownerId: 'u1' });
    const snapshot = (await magazineService.addProducts(mag.id, [mkProduct('a'), mkProduct('b')]))!;
    const result = await magazineService.update(mag.id, { ...snapshot, title: 'Editado' });
    expect(result?.items).toEqual(snapshot.items);
  });

  it('falha de inclusão rejeita, nunca confirma o snapshot antigo como sucesso', async () => {
    const mag = await magazineService.create({ ownerId: 'u1' });
    rejectItemInsert = true;
    await expect(magazineService.addProducts(mag.id, [mkProduct('a')])).rejects.toThrow(
      /Synthetic insert denied/,
    );
    expect(store.magazine_items.size).toBe(0);
  });

  it('update sem linha acessível falha fechado', async () => {
    await expect(magazineService.update('inexistente', { title: 'x' })).rejects.toThrow(
      /Revista não encontrada/,
    );
  });

  it('create → get → update title → addProducts → publish → unpublish', async () => {
    const m = await magazineService.create({ ownerId: 'u1', title: 'Nova' });
    expect(m.id).toBeTruthy();
    expect(m.title).toBe('Nova');
    expect(m.status).toBe('draft');

    const got = await magazineService.get(m.id);
    expect(got?.title).toBe('Nova');

    const upd = await magazineService.update(m.id, { title: 'Editada' });
    expect(upd?.title).toBe('Editada');

    const withProds = await magazineService.addProducts(m.id, [
      mkProduct('a', 'Preto'),
      mkProduct('b'),
    ]);
    expect(withProds?.items).toHaveLength(2);
    expect(withProds?.items[0].variantColorName).toBe('Preto');
    expect(withProds?.items[1].variantColorName).toBeNull();

    const pub = await magazineService.publish(m.id);
    expect(pub?.status).toBe('published');
    expect(pub?.publishedAt).toBeTruthy();

    const unp = await magazineService.unpublish(m.id);
    expect(unp?.status).toBe('draft');
  });

  it('addProducts idempotente: mesmo produto não duplica', async () => {
    const m = await magazineService.create({ ownerId: 'u' });
    const p = mkProduct('x');
    await magazineService.addProducts(m.id, [p]);
    const after = await magazineService.addProducts(m.id, [p]);
    expect(after?.items).toHaveLength(1);
  });

  it('reorderItems reordena e positions ficam sequenciais', async () => {
    const m = await magazineService.create({ ownerId: 'u' });
    const withProds = await magazineService.addProducts(m.id, [
      mkProduct('a'),
      mkProduct('b'),
      mkProduct('c'),
    ]);
    const ids = withProds!.items.map((i) => i.id).reverse();
    const reordered = await magazineService.reorderItems(m.id, ids);
    expect(reordered?.items.map((i) => i.productId)).toEqual(['p_c', 'p_b', 'p_a']);
    expect(reordered?.items.map((i) => i.position)).toEqual([0, 1, 2]);
  });

  it('removeItem preserva os demais', async () => {
    const m = await magazineService.create({ ownerId: 'u' });
    const withProds = await magazineService.addProducts(m.id, [
      mkProduct('a'),
      mkProduct('b'),
    ]);
    const rid = withProds!.items[0].id;
    const after = await magazineService.removeItem(m.id, rid);
    expect(after?.items).toHaveLength(1);
    expect(after?.items[0].productId).toBe('p_b');
  });

  it('duplicate copia header + items, mas com novo id', async () => {
    const m = await magazineService.create({ ownerId: 'u', title: 'Orig' });
    await magazineService.addProducts(m.id, [mkProduct('a'), mkProduct('b')]);
    const clone = await magazineService.duplicate(m.id);
    expect(clone).not.toBeNull();
    expect(clone!.id).not.toBe(m.id);
    expect(clone!.title).toMatch(/cópia/);
    expect(clone!.items).toHaveLength(2);
  });

  it('duplicate preserva páginas estruturadas e remapeia IDs dos itens', async () => {
    const m = await magazineService.create({ ownerId: 'u', title: 'Estruturada' });
    const withItems = (await magazineService.addProducts(m.id, [mkProduct('a')]))!;
    await magazineService.update(m.id, {
      pageOrder: {
        version: 2,
        pages: [
          { id: 'cover', kind: 'cover' },
          { id: 'products', kind: 'products', itemIds: [withItems.items[0].id] },
          { id: 'contact', kind: 'contact' },
        ],
      },
    });

    const clone = (await magazineService.duplicate(m.id))!;
    expect(clone.pageOrder).toMatchObject({ version: 2 });
    const clonedProductPage =
      clone.pageOrder && !Array.isArray(clone.pageOrder) && 'pages' in clone.pageOrder
        ? clone.pageOrder.pages.find((page) => page.kind === 'products')
        : undefined;
    expect(clonedProductPage?.itemIds).toEqual([clone.items[0].id]);
    expect(clonedProductPage?.itemIds).not.toContain(withItems.items[0].id);
  });

  it('delete soft (deleted_at) + get retorna null + restore volta', async () => {
    const m = await magazineService.create({ ownerId: 'u' });
    await magazineService.delete(m.id);
    expect(await magazineService.get(m.id)).toBeNull();
    const restored = await magazineService.restore(m);
    expect(restored.id).toBe(m.id);
    expect(await magazineService.get(m.id)).not.toBeNull();
  });

  it('list retorna apenas revistas não-deletadas', async () => {
    const a = await magazineService.create({ ownerId: 'u1', title: 'A' });
    await magazineService.create({ ownerId: 'u1', title: 'B' });
    await magazineService.create({ ownerId: 'u2', title: 'C' });
    await magazineService.delete(a.id);
    const list = await magazineService.list('u1');
    // O owner é derivado de auth.uid() pelo RPC real e não é observável neste mock.
    expect(list.map((m) => m.title).sort()).toEqual(['B', 'C']);
  });

  it('list pagina mais de 1.000 itens sem truncar as contagens dos cards', async () => {
    const magazine = await magazineService.create({ ownerId: 'u1', title: 'Grande' });
    for (let index = 0; index < 1_005; index++) {
      const id = `bulk_${String(index).padStart(4, '0')}`;
      store.magazine_items.set(id, {
        id,
        magazine_id: magazine.id,
        product_id: `product_${index}`,
        product_snapshot: productToSnapshot(mkProduct(String(index))),
        variant_color_name: null,
        position: index,
        page_number: null,
        overrides: {},
        created_at: nowIso(),
        updated_at: nowIso(),
      });
    }

    const list = await magazineService.list('u1');
    expect(list).toHaveLength(1);
    expect(list[0].items).toHaveLength(1_005);
  });
});

describe('magazineService — round-trip mapping', () => {
  it('title, subtitle, branding, content, templateId preservados após create+get', async () => {
    const m = await magazineService.create({
      ownerId: 'u',
      title: 'Título Especial',
      templateId: 'catalog-grid-2x3',
    });
    await magazineService.update(m.id, {
      subtitle: 'Sub',
      branding: {
        ...m.branding,
        clientName: 'Cliente X',
        clientLogoUrl: 'https://x.com/l.png',
      },
      content: { ...m.content, groupByCategory: true },
    });
    const got = (await magazineService.get(m.id))!;
    expect(got.title).toBe('Título Especial');
    expect(got.templateId).toBe('catalog-grid-2x3');
    expect(got.subtitle).toBe('Sub');
    expect(got.branding.clientName).toBe('Cliente X');
    expect(got.content.groupByCategory).toBe(true);
  });
});

describe('magazineService — fuzz de operações (fast-check, 60 casos)', () => {
  it('sequências aleatórias nunca corrompem o estado', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.oneof(
            fc.record({ kind: fc.constant('add'), seed: fc.string({ minLength: 1, maxLength: 6 }) }),
            fc.record({ kind: fc.constant('title'), title: fc.string({ maxLength: 30 }) }),
            fc.record({ kind: fc.constant('publish') }),
            fc.record({ kind: fc.constant('unpublish') }),
            fc.record({ kind: fc.constant('duplicate') }),
          ),
          { minLength: 1, maxLength: 8 },
        ),
        async (ops) => {
          store.magazines.clear();
          store.magazine_items.clear();
          const m = await magazineService.create({ ownerId: 'u', title: 'x' });
          let currentId = m.id;
          for (const op of ops) {
            if (op.kind === 'add') {
              await magazineService.addProducts(currentId, [mkProduct(op.seed)]);
            } else if (op.kind === 'title') {
              if (op.title.trim().length === 0) {
                await expect(
                  magazineService.update(currentId, { title: op.title }),
                ).rejects.toThrow(/magazine_title_invalid/);
              } else {
                await magazineService.update(currentId, { title: op.title });
              }
            } else if (op.kind === 'publish') {
              const current = await magazineService.get(currentId);
              if (current?.items.length) await magazineService.publish(currentId);
            } else if (op.kind === 'unpublish') {
              await magazineService.unpublish(currentId);
            } else if (op.kind === 'duplicate') {
              const c = await magazineService.duplicate(currentId);
              if (c) currentId = c.id;
            }
          }
          // invariantes finais: get retorna magazine consistente
          const final = await magazineService.get(currentId);
          expect(final).not.toBeNull();
          expect(final!.id).toBe(currentId);
          // items com positions únicas
          const positions = final!.items.map((i) => i.position);
          expect(new Set(positions).size).toBe(positions.length);
          return true;
        },
      ),
      { numRuns: 60 },
    );
  });
});

describe('magazineService — race conditions (concorrência)', () => {
  it('2 updates simultâneos: exatamente um vence o lock otimista', async () => {
    const m = await magazineService.create({ ownerId: 'u', title: 'v0' });
    const results = await Promise.allSettled([
      magazineService.update(m.id, { title: 'A' }),
      magazineService.update(m.id, { title: 'B' }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const got = await magazineService.get(m.id);
    expect(['A', 'B']).toContain(got!.title);
  });

  it('addProducts concorrente não duplica items com FK válida', async () => {
    const m = await magazineService.create({ ownerId: 'u' });
    const results = await Promise.allSettled([
      magazineService.addProducts(m.id, [mkProduct('x')]),
      magazineService.addProducts(m.id, [mkProduct('x')]),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const got = await magazineService.get(m.id);
    expect(got!.items).toHaveLength(1);
  });
});

describe('magazineService — títulos exóticos', () => {
  // O serviço normaliza espaços de borda e aplica o título padrão a entradas vazias.
  // A validação de publicação continua cobrindo o estado editável da UI.
  const exotic = ['á', '中文', '😀🎉', 'a'.repeat(500), '<b>x</b>'];
  it.each(exotic)('title=%j preservado no round-trip', async (t) => {
    const m = await magazineService.create({ ownerId: 'u', title: t });
    const got = await magazineService.get(m.id);
    expect(got?.title).toBe(t);
  });

  it.each([' ', '\n\t', ''])('title=%j usa o default quando vazio após normalização', async (t) => {
    const m = await magazineService.create({ ownerId: 'u', title: t });
    const got = await magazineService.get(m.id);
    expect(got?.title).toBe('Nova Revista');
  });

  it('title=undefined cai no default "Nova Revista"', async () => {
    const m = await magazineService.create({ ownerId: 'u' });
    const got = await magazineService.get(m.id);
    expect(got?.title).toBe('Nova Revista');
  });
});
