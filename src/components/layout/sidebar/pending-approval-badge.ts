import type { NavGroup, NavItem } from './SidebarNavGroup';

/** Chave de cache compartilhada pela sidebar, pelo header e pela página de usuários. */
export const PENDING_DISCOUNT_APPROVALS_QUERY_KEY = ['pending-discount-approvals-count'] as const;

/** Identificador do item de menu que recebe o badge de aprovações pendentes. */
export const PENDING_DISCOUNT_APPROVALS_BADGE_KEY = 'pending-discount-approvals';

/**
 * Marca com a contagem de aprovações pendentes os itens identificados por `badgeKey`.
 *
 * A correspondência usa `badgeKey` e nunca a string de `href`: o href do item é
 * `/admin/usuarios`, enquanto a rota com a aba aberta é `/admin/usuarios?tab=discounts`.
 * Comparar href fazia o badge nunca renderizar (ACH-037 / etapa 089).
 */
export function withPendingApprovalBadge(
  groups: NavGroup[],
  count: number | undefined,
  isAdmin: boolean,
): NavGroup[] {
  if (!isAdmin || !count) return groups;
  return groups.map((group) => {
    if (!group.items.some((item) => item.badgeKey === PENDING_DISCOUNT_APPROVALS_BADGE_KEY)) {
      return group; // preserva identidade para não invalidar memo dos grupos alheios
    }
    return {
      ...group,
      items: group.items.map((item): NavItem =>
        item.badgeKey === PENDING_DISCOUNT_APPROVALS_BADGE_KEY
          ? { ...item, badge: count }
          : item,
      ),
    };
  });
}
