/**
 * Etapa 089 / ACH-037 — o badge de aprovações pendentes nunca renderizava.
 *
 * O item de menu aponta para `/admin/usuarios`, mas o código comparava
 * `item.href === '/admin/usuarios?tab=discounts'`, o que nunca era verdade.
 * A correspondência agora usa `badgeKey`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { NavGroup } from '../sidebar/SidebarNavGroup';
import {
  PENDING_DISCOUNT_APPROVALS_BADGE_KEY,
  PENDING_DISCOUNT_APPROVALS_QUERY_KEY,
  withPendingApprovalBadge,
} from '../sidebar/pending-approval-badge';

const Icon = () => null;

const groups = (): NavGroup[] => [
  {
    id: 'admin',
    label: 'Admin',
    icon: Icon,
    items: [
      {
        icon: Icon,
        label: 'Usu\u00e1rios',
        href: '/admin/usuarios',
        badgeKey: PENDING_DISCOUNT_APPROVALS_BADGE_KEY,
      },
      { icon: Icon, label: 'Configura\u00e7\u00f5es', href: '/admin/config' },
    ],
  },
];

describe('withPendingApprovalBadge', () => {
  it('aplica o badge no item marcado, mesmo com href diferente da aba', () => {
    const result = withPendingApprovalBadge(groups(), 4, true);
    expect(result[0].items[0].badge).toBe(4);
    expect(result[0].items[1].badge).toBeUndefined();
  });

  it('não marca nada quando a contagem é zero ou indefinida', () => {
    expect(withPendingApprovalBadge(groups(), 0, true)[0].items[0].badge).toBeUndefined();
    expect(withPendingApprovalBadge(groups(), undefined, true)[0].items[0].badge).toBeUndefined();
  });

  it('não marca nada para quem não é admin', () => {
    expect(withPendingApprovalBadge(groups(), 4, false)[0].items[0].badge).toBeUndefined();
  });

  it('não muta o array de entrada', () => {
    const input = groups();
    withPendingApprovalBadge(input, 4, true);
    expect(input[0].items[0].badge).toBeUndefined();
  });

  it('mantém os demais grupos intactos', () => {
    const other: NavGroup = { id: 'ops', label: 'Ops', icon: Icon, items: [] };
    const result = withPendingApprovalBadge([...groups(), other], 4, true);
    expect(result[1]).toBe(other);
  });
});

describe('chave de cache única (etapa 090)', () => {
  const SOURCE = readFileSync(
    resolve(__dirname, '..', 'SidebarReorganized.tsx'),
    'utf-8',
  );
  const HEADER = readFileSync(
    resolve(__dirname, '..', '..', 'admin', 'DiscountApprovalHeaderBadge.tsx'),
    'utf-8',
  );

  it('a sidebar usa a constante compartilhada, não uma string literal', () => {
    expect(SOURCE).toContain('PENDING_DISCOUNT_APPROVALS_QUERY_KEY');
    expect(SOURCE).not.toContain("queryKey: ['pending-discount-approvals-count']");
  });

  it('o intervalo efetivo é o mesmo do header (60 s), sem 30 s órfão', () => {
    expect(PENDING_DISCOUNT_APPROVALS_QUERY_KEY).toEqual([
      'pending-discount-approvals-count',
    ]);
    expect(SOURCE).toContain('refetchInterval: 60_000');
    expect(SOURCE).not.toContain('refetchInterval: 30_000');
    expect(HEADER).toContain('refetchInterval: 60_000');
  });
});
