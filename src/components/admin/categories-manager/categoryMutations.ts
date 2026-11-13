/**
 * Escrita de categorias (editar nome/pai e desativar) via PostgREST.
 * A RLS `categories_update` só permite owner/admin da organização; quando ela
 * nega, o UPDATE afeta 0 linhas sem erro — tratamos isso como falha explícita.
 */
import { dbInvoke } from '@/lib/db/postgrest';

interface CategoryRef {
  id: string;
  parent_id?: string | null;
}

export class CategoryWriteDeniedError extends Error {
  constructor() {
    super('Categoria não atualizada: sem permissão ou categoria inexistente.');
    this.name = 'CategoryWriteDeniedError';
  }
}

/** IDs de todos os descendentes de `rootId` (não inclui o próprio). */
export function getDescendantIds(categories: CategoryRef[], rootId: string): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const c of categories) {
    if (!c.parent_id) continue;
    const list = childrenByParent.get(c.parent_id) ?? [];
    list.push(c.id);
    childrenByParent.set(c.parent_id, list);
  }
  const result = new Set<string>();
  const stack = [...(childrenByParent.get(rootId) ?? [])];
  for (let id = stack.pop(); id !== undefined; id = stack.pop()) {
    if (result.has(id)) continue;
    result.add(id);
    stack.push(...(childrenByParent.get(id) ?? []));
  }
  return result;
}

async function updateCategoryRow(id: string, data: Record<string, unknown>): Promise<void> {
  const result = await dbInvoke<{ id: string }>({
    table: 'categories',
    operation: 'update',
    id,
    data,
  });
  if (!result.records.length) throw new CategoryWriteDeniedError();
}

export async function updateCategory(
  id: string,
  changes: { name: string; parent_id: string | null },
): Promise<void> {
  const name = changes.name.trim();
  if (!name) throw new Error('Nome da categoria é obrigatório.');
  if (changes.parent_id === id) throw new Error('Uma categoria não pode ser pai de si mesma.');
  await updateCategoryRow(id, { name, parent_id: changes.parent_id });
}

export async function deactivateCategory(id: string): Promise<void> {
  await updateCategoryRow(id, { is_active: false });
}
