/**
 * Paginação da revista — dado um Magazine, retorna as páginas na ordem
 * correta (capa, seções por categoria opcionais, páginas de produtos,
 * contracapa). O template define quantos itens por página.
 *
 * PhD-level null safety:
 * - Accepts null/undefined magazine → returns empty pages
 * - Optional chaining on all nested fields
 * - Position sort handles null/undefined positions
 * - Template fallback when templateId not found
 */

import type {
  Magazine,
  MagazineItem,
  MagazinePage,
  MagazinePageDefinition,
  MagazinePageOrderV2,
  MagazineStructuredPageKind,
} from '@/types/magazine';
import { getTemplate } from './components/templates/TemplateRegistry';

const STRUCTURED_PAGE_KINDS = new Set<MagazineStructuredPageKind>([
  'back-cover',
  'contact',
  'cover',
  'institutional',
  'products',
  'section',
]);

let pageIdSequence = 0;

function newPageId(kind: MagazineStructuredPageKind): string {
  const randomId = globalThis.crypto?.randomUUID?.();
  if (randomId) return `${kind}-${randomId}`;
  pageIdSequence += 1;
  return `${kind}-${Date.now().toString(36)}-${pageIdSequence.toString(36)}`;
}

export function createMagazinePageDefinition(
  kind: MagazineStructuredPageKind,
  seed: Partial<MagazinePageDefinition> = {},
): MagazinePageDefinition {
  return {
    id: seed.id?.slice(0, 120) || newPageId(kind),
    kind,
    ...(seed.title ? { title: seed.title.slice(0, 120) } : {}),
    ...(seed.body ? { body: seed.body.slice(0, 800) } : {}),
    ...(Array.isArray(seed.itemIds)
      ? { itemIds: [...new Set(seed.itemIds.filter((id) => typeof id === 'string'))].slice(0, 500) }
      : {}),
  };
}

export function isMagazinePageOrderV2(value: unknown): value is MagazinePageOrderV2 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Partial<MagazinePageOrderV2>;
  if (candidate.version !== 2 || !Array.isArray(candidate.pages) || candidate.pages.length > 200)
    return false;
  const validPages = candidate.pages.every(
    (page) =>
      page !== null &&
      typeof page === 'object' &&
      typeof page.id === 'string' &&
      page.id.length > 0 &&
      page.id.length <= 120 &&
      STRUCTURED_PAGE_KINDS.has(page.kind) &&
      (page.title === undefined || (typeof page.title === 'string' && page.title.length <= 120)) &&
      (page.body === undefined || (typeof page.body === 'string' && page.body.length <= 800)) &&
      (page.itemIds === undefined ||
        (Array.isArray(page.itemIds) &&
          page.itemIds.length <= 500 &&
          page.itemIds.every((id) => typeof id === 'string') &&
          new Set(page.itemIds).size === page.itemIds.length)),
  );
  if (!validPages || candidate.pages.length < 2) return false;
  const ids = candidate.pages.map((page) => page.id);
  const closing = candidate.pages.at(-1)?.kind;
  return (
    new Set(ids).size === ids.length &&
    candidate.pages[0]?.kind === 'cover' &&
    (closing === 'contact' || closing === 'back-cover') &&
    candidate.pages.filter((page) => page.kind === 'cover').length === 1 &&
    candidate.pages.filter((page) => page.kind === 'contact' || page.kind === 'back-cover')
      .length === 1
  );
}

function paginateAutomatic(magazine: Magazine, perPage: number): MagazinePage[] {
  const rawItems = Array.isArray(magazine.items) ? magazine.items : [];
  const items = [...rawItems].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const pages: MagazinePage[] = [{ index: 0, kind: 'cover', items: [] }];

  if (magazine.content?.groupByCategory) {
    const grouped = new Map<string, MagazineItem[]>();
    for (const item of items) {
      const key = item.productSnapshot?.category_name ?? 'Outros';
      const group = grouped.get(key) ?? [];
      group.push(item);
      grouped.set(key, group);
    }
    for (const [category, list] of grouped) {
      pages.push({ index: pages.length, kind: 'section', sectionTitle: category, items: [] });
      for (let index = 0; index < list.length; index += perPage) {
        pages.push({
          index: pages.length,
          kind: 'products',
          items: list.slice(index, index + perPage),
        });
      }
    }
  } else {
    for (let index = 0; index < items.length; index += perPage) {
      pages.push({
        index: pages.length,
        kind: 'products',
        items: items.slice(index, index + perPage),
      });
    }
  }

  pages.push({ index: pages.length, kind: 'back-cover', items: [] });
  return pages;
}

export function createStructuredPageOrder(magazine: Magazine): MagazinePageOrderV2 {
  const template = getTemplate(magazine.templateId);
  const automaticPages = paginateAutomatic(magazine, Math.max(1, template?.productsPerPage ?? 2));
  const pages: MagazinePageDefinition[] = [];

  for (const page of automaticPages) {
    if (page.kind === 'cover') {
      pages.push(createMagazinePageDefinition('cover', { title: magazine.title }));
      pages.push(
        createMagazinePageDefinition('institutional', {
          title: 'Sobre nós',
          body: magazine.content?.introText ?? '',
        }),
      );
      continue;
    }
    if (page.kind === 'back-cover') {
      pages.push(
        createMagazinePageDefinition('contact', {
          title: 'Vamos conversar?',
        }),
      );
      continue;
    }
    pages.push(
      createMagazinePageDefinition(page.kind, {
        title: page.sectionTitle,
        itemIds: page.items.map((item) => item.id),
      }),
    );
  }

  return { version: 2, pages };
}

/**
 * Redistribui a ordem global de produtos pelas páginas estruturadas existentes.
 * Assim, o DnD continua efetivo depois da conversão para v2 e páginas extras são
 * criadas quando o template não comporta todos os itens.
 */
export function reorderStructuredPageItems(
  magazine: Magazine,
  orderedItemIds: string[],
): MagazinePageOrderV2 | null {
  if (!isMagazinePageOrderV2(magazine.pageOrder)) return null;
  const knownIds = new Set((magazine.items ?? []).map((item) => item.id));
  const seen = new Set<string>();
  const normalized = orderedItemIds.filter((id) => {
    if (!knownIds.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  for (const item of [...(magazine.items ?? [])].sort((a, b) => a.position - b.position)) {
    if (!seen.has(item.id)) normalized.push(item.id);
  }

  const perPage = Math.max(1, getTemplate(magazine.templateId)?.productsPerPage ?? 2);
  const existingProductPages = magazine.pageOrder.pages.filter((page) => page.kind === 'products');
  const nonProductCount = magazine.pageOrder.pages.length - existingProductPages.length;
  const availableProductDefinitions = Math.max(0, 200 - nonProductCount);

  // `page_order` is a persisted editing structure, not a 1:1 copy of rendered
  // pages. A single definition may safely contain several rendered chunks.
  // Compact overflow into at most 200 definitions instead of persisting an
  // invalid v2 payload after a template with lower productsPerPage is selected.
  const idealProductDefinitions =
    normalized.length === 0 ? existingProductPages.length : Math.ceil(normalized.length / perPage);
  const productDefinitionCount = Math.min(
    availableProductDefinitions,
    Math.max(existingProductPages.length, idealProductDefinitions),
  );
  if (normalized.length > 0 && productDefinitionCount === 0) return null;
  const storedItemsPerDefinition =
    productDefinitionCount > 0
      ? Math.max(perPage, Math.ceil(normalized.length / productDefinitionCount))
      : 0;
  if (storedItemsPerDefinition > 500) return null;

  let cursor = 0;
  let productPageIndex = 0;
  const pages = magazine.pageOrder.pages.map((page) => {
    if (page.kind !== 'products') return page;
    const itemIds = normalized.slice(cursor, cursor + storedItemsPerDefinition);
    cursor += itemIds.length;
    productPageIndex += 1;
    return createMagazinePageDefinition('products', { ...page, itemIds });
  });

  const additional: MagazinePageDefinition[] = [];
  while (productPageIndex < productDefinitionCount) {
    additional.push(
      createMagazinePageDefinition('products', {
        itemIds: normalized.slice(cursor, cursor + storedItemsPerDefinition),
      }),
    );
    cursor += storedItemsPerDefinition;
    productPageIndex += 1;
  }
  if (additional.length > 0) {
    const closingIndex = pages.findIndex(
      (page) => page.kind === 'contact' || page.kind === 'back-cover',
    );
    pages.splice(closingIndex < 0 ? pages.length : closingIndex, 0, ...additional);
  }
  const next = { version: 2 as const, pages };
  return isMagazinePageOrderV2(next) ? next : null;
}

function paginateStructured(
  magazine: Magazine,
  order: MagazinePageOrderV2,
  perPage: number,
): MagazinePage[] {
  const sortedItems = [...(Array.isArray(magazine.items) ? magazine.items : [])].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  );
  const itemById = new Map(sortedItems.map((item) => [item.id, item]));
  const assigned = new Set<string>();
  const definitions = [...order.pages];

  if (!definitions.some((page) => page.kind === 'cover')) {
    definitions.unshift(createMagazinePageDefinition('cover', { title: magazine.title }));
  }
  if (!definitions.some((page) => page.kind === 'contact' || page.kind === 'back-cover')) {
    definitions.push(
      createMagazinePageDefinition('contact', {
        title: 'Vamos conversar?',
        body: magazine.content?.closingText ?? '',
      }),
    );
  }

  const pages: MagazinePage[] = [];
  for (const definition of definitions) {
    if (definition.kind === 'products') {
      const referencedItems = (definition.itemIds ?? [])
        .map((itemId) => itemById.get(itemId))
        .filter((item): item is MagazineItem => Boolean(item))
        .filter((item) => !assigned.has(item.id));
      for (const item of referencedItems) assigned.add(item.id);

      // A page order survives template changes. Reflow it at render time so a
      // 3x3 page switched to Vogue never hides items beyond Vogue's capacity.
      // Empty definitions are omitted after item removal instead of rendering
      // blank pages in preview, public view and PDF.
      for (let offset = 0; offset < referencedItems.length; offset += perPage) {
        pages.push({
          index: pages.length,
          pageId: offset === 0 ? definition.id : `${definition.id}-part-${offset / perPage + 1}`,
          kind: 'products',
          items: referencedItems.slice(offset, offset + perPage),
        });
      }
      continue;
    }

    const isEditorial = definition.kind === 'institutional' || definition.kind === 'contact';
    const configuredClosing = magazine.content?.closingText;
    pages.push({
      index: pages.length,
      pageId: definition.id,
      kind: definition.kind,
      items: [],
      ...(definition.kind === 'section' ? { sectionTitle: definition.title || 'Nova seção' } : {}),
      ...(isEditorial
        ? {
            title:
              definition.title ||
              (definition.kind === 'institutional' ? 'Sobre nós' : 'Vamos conversar?'),
            body:
              definition.kind === 'contact'
                ? configuredClosing !== undefined
                  ? configuredClosing
                  : (definition.body ?? '')
                : definition.body || magazine.content?.introText || '',
          }
        : {}),
    });
  }

  const unassigned = sortedItems.filter((item) => !assigned.has(item.id));
  const generated: MagazinePage[] = [];
  for (let index = 0; index < unassigned.length; index += perPage) {
    generated.push({
      index: 0,
      kind: 'products',
      items: unassigned.slice(index, index + perPage),
    });
  }
  const closingIndex = pages.findIndex(
    (page) => page.kind === 'contact' || page.kind === 'back-cover',
  );
  pages.splice(closingIndex < 0 ? pages.length : closingIndex, 0, ...generated);
  return pages.map((page, index) => ({ ...page, index }));
}

/**
 * paginateMagazine — deterministic, pure function.
 * No side effects. Safe to call in useMemo.
 *
 * @param magazine - The magazine to paginate. Accepts null/undefined defensively.
 * @returns Array of pages in display order: [cover, ...sections/products, back-cover]
 */
export function paginateMagazine(magazine: Magazine | null | undefined): MagazinePage[] {
  // GAP #3 FIX: null guard — return minimum valid pages on missing data
  if (!magazine) {
    return [
      { index: 0, kind: 'cover', items: [] },
      { index: 1, kind: 'back-cover', items: [] },
    ];
  }

  // GAP #3 FIX: template null guard — use fallback productsPerPage if template not found
  const template = getTemplate(magazine.templateId);
  const perPage = Math.max(1, template?.productsPerPage ?? 2);

  if (isMagazinePageOrderV2(magazine.pageOrder)) {
    return paginateStructured(magazine, magazine.pageOrder, perPage);
  }
  return paginateAutomatic(magazine, perPage);
}

/**
 * getTotalProductCount — counts all products across all pages.
 * Useful for badge displays and validation.
 */
export function getTotalProductCount(magazine: Magazine | null | undefined): number {
  if (!magazine) return 0;
  return Array.isArray(magazine.items) ? magazine.items.length : 0;
}

/**
 * getPageCount — returns total rendered page count.
 * Includes cover + back-cover. Minimum: 2.
 */
export function getPageCount(magazine: Magazine | null | undefined): number {
  return paginateMagazine(magazine).length;
}
