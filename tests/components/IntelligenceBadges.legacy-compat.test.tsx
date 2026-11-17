/**
 * RESGATE — teste escrito por outro agente de IA que nunca chegou a main.
 *
 * Fonte: origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252
 *        tests/components/IntelligenceBadges.legacy-compat.test.tsx
 *
 * Ficou fora porque a main moveu hooks e paginas para subpastas, entao os imports
 * `@/...` do original nao resolvem mais. Nenhum `.skip`/`.todo` foi usado para
 * fazer este arquivo passar: caso que nao cabe mais no codigo atual foi REMOVIDO,
 * com a evidencia medida registrada abaixo.
 *
 * Blocos `it` na fonte: 4 · neste arquivo: 3
 * Casos em runtime: 27 de 35 (omitidos: 8)
 *
 * DRIFT ADAPTADO:
 * 1) Import de caminho: `@/hooks/useProductIntelligenceBadges` nao existe mais
 * (arquivo deletado de src/hooks/; existia na branch
 * origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252 como
 * src/hooks/useProductIntelligenceBadges.ts). O canonico e
 * src/hooks/products/useProductIntelligenceBadges.ts, reexportado por
 * src/hooks/products/index.ts:37. O remap da tabela resolve, mas o TIPO nao: o
 * `IntelligenceBadge` de la e o canonico, nao o legado. Resolvi declarando o shape
 * legado localmente no arquivo de teste (type LegacyBadge), com comentario apontando a
 * origem removida.
 * 2) Drift de contrato (nao e so caminho): o componente perdeu o suporte dual
 * canonico+legado. Na branch de origem, src/components/common/IntelligenceBadges.tsx
 * tinha `type IntelligenceBadgeType = IntelligenceBadge['type'] |
 * LegacyIntelligenceBadge['type']`, badgeConfig com as chaves legadas
 * (emergente/normal/on-sale/popular) e, no map, `const icon = 'emoji' in badge ?
 * badge.emoji : badge.icon` / `const description = 'tooltip' in badge ? badge.tooltip
 * : badge.description`. Na main atual
 * (src/components/common/IntelligenceBadges.tsx:12, :64, :104, :115) o prop e `badges:
 * IntelligenceBadge[]`, badgeConfig (linhas 17-61) tem apenas os 9 tipos canonicos e o
 * render le direto `{badge.icon} {badge.label}` e `badge.description`. Por isso os 8
 * casos de identidade legada foram removidos (evidencia medida em motivo_omissao) e o
 * caso de ordem foi adaptado para dois badges canonicos.
 * 3) Nenhuma mudanca em src/. Rodei com prefixo TZ=America/Sao_Paulo (exigencia
 * documentada em vitest.config.ts; `npx vitest run` cru gera falso-positivo em outros
 * testes). eslint no arquivo: limpo.
 *
 * OMISSOES, COM EVIDENCIA MEDIDA:
 * Removido o bloco `it.each(legacyTypes)('preserves legacy identity, emoji and tooltip
 * for %s')` — 8 casos (best-seller, emergente, featured, last-units, new-arrival,
 * normal, on-sale, popular). Evidencia MEDIDA na execucao inicial (import remapeado,
 * resto intacto): 9 failed de 35 (8 destes + o caso de ordem misto).
 * - Esperava: textContent `"🏷️ Legacy <type>"` e tooltip `"Legacy tooltip <type>"`
 * (shape legado {emoji, tooltip}).
 * - Codigo hoje (src/components/common/IntelligenceBadges.tsx:104 `{badge.icon}
 * {badge.label}`; :115 `badge.description`): para os 4 tipos que ainda existem
 * (best-seller, featured, last-units, new-arrival) o vitest reportou `Expected "🏷️
 * Legacy featured" / Received "Legacy featured"` — `badge.emoji` e ignorado, nao ha
 * fallback `'emoji' in badge`.
 * - Para os 4 tipos exclusivos do legado (emergente, normal, on-sale, popular) o erro
 * medido foi `TypeError: Cannot read properties of undefined (reading 'icon')`, porque
 * badgeConfig (src/components/common/IntelligenceBadges.tsx:17-61) nao tem essas
 * chaves; o union canonico tem so 9 tipos
 * (src/hooks/products/useProductIntelligenceBadges.ts:24-33) e o shape e
 * {type,label,icon,color,priority,description?} (linhas 35-42).
 * Adaptacao (nao omissao) do caso `keeps mixed-input order...`: usava
 * `[legacy('popular'), canonical('hot-item')]`, que hoje estoura no TypeError acima.
 * Trocado para `[canonical('best-seller'), canonical('hot-item')]`, preservando as
 * assercoes de ordem de render, `Potencial: 82` e `dados ilustrativos`; o que se
 * perdeu foi apenas a parte "input misto legado+canonico", que o contrato atual nao
 * aceita.
 * Preservados: os 8 payloads legados continuam cobertos no `it.each` do toggle global
 * (badgesEnabled=false => container.firstChild === null), que passa — o curto-circuito
 * ocorre antes do lookup em badgeConfig
 * (src/components/common/IntelligenceBadges.tsx:88 `if (!badgesEnabled ||
 * !badges.length) return null;`). Nenhum .skip/.todo usado.
 *
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { IntelligenceBadges } from '@/components/common/IntelligenceBadges';
import { useBadgeVisibilityStore } from '@/stores/useBadgeVisibilityStore';
import type { IntelligenceBadge } from '@/hooks/products';

vi.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: '/produto/compat' }) }));
vi.mock('@/contexts/ThemeContext', () => ({ useTheme: () => ({ actualTheme: 'light' }) }));
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: PropsWithChildren) => <>{children}</>,
  TooltipTrigger: ({ children }: PropsWithChildren) => <>{children}</>,
  TooltipContent: ({ children }: PropsWithChildren) => <div role="tooltip">{children}</div>,
}));

/**
 * Forma do badge legado (hook `src/hooks/useProductIntelligenceBadges.ts`,
 * removido): `{ type, label, emoji, tooltip }` com os tipos `emergente` /
 * `normal` / `on-sale` / `popular`. O contrato canônico atual
 * (`src/hooks/products/useProductIntelligenceBadges.ts:24-42`) usa
 * `{ type, label, icon, color, priority, description? }` e apenas 9 tipos.
 * O tipo legado é declarado localmente só para exercitar o curto-circuito do
 * toggle global com payloads desconhecidos — não existe mais em produção.
 */
type LegacyBadge = {
  type:
    | 'best-seller'
    | 'emergente'
    | 'featured'
    | 'last-units'
    | 'new-arrival'
    | 'normal'
    | 'on-sale'
    | 'popular';
  label: string;
  emoji: string;
  tooltip: string;
};

const canonicalTypes: IntelligenceBadge['type'][] = [
  'featured',
  'new-arrival',
  'hot-item',
  'emerging',
  'declining',
  'frequent-restock',
  'last-units',
  'best-seller',
  'class-a',
];
const legacyTypes: LegacyBadge['type'][] = [
  'best-seller',
  'emergente',
  'featured',
  'last-units',
  'new-arrival',
  'normal',
  'on-sale',
  'popular',
];
const canonical = (type: IntelligenceBadge['type']): IntelligenceBadge => ({
  type,
  label: `Canonical ${type}`,
  icon: '🔥',
  color: 'existing-color',
  priority: 7,
  description: `Canonical description ${type}`,
});
const legacy = (type: LegacyBadge['type']): LegacyBadge => ({
  type,
  label: `Legacy ${type}`,
  emoji: '🏷️',
  tooltip: `Legacy tooltip ${type}`,
});

beforeEach(() => {
  useBadgeVisibilityStore.setState({ badgesEnabled: true, routeSettings: {} });
});

describe('IntelligenceBadges preserves the canonical badge contract', () => {
  it.each(canonicalTypes)('keeps canonical identity, icon and tooltip for %s', (type) => {
    const input = canonical(type);
    const before = { ...input };
    render(<IntelligenceBadges badges={[input]} />);
    expect(screen.getByTestId(`intelligence-badge-${type}`)).toHaveTextContent(
      `🔥 Canonical ${type}`,
    );
    expect(screen.getByRole('tooltip')).toHaveTextContent(`Canonical description ${type}`);
    expect(input).toEqual(before);
  });

  it.each([...canonicalTypes.map(canonical), ...legacyTypes.map(legacy)])(
    'honors the existing global visibility toggle for $label',
    (badge) => {
      useBadgeVisibilityStore.setState({ badgesEnabled: false });
      const { container } = render(
        <IntelligenceBadges badges={[badge] as unknown as IntelligenceBadge[]} />,
      );
      expect(container.firstChild).toBeNull();
    },
  );

  it('keeps input order, turnover and the explicit illustrative-data label', () => {
    render(
      <IntelligenceBadges
        badges={[canonical('best-seller'), canonical('hot-item')]}
        turnoverScore={82}
        isDemo
      />,
    );
    const badges = screen.getAllByTestId(/^intelligence-badge-/);
    expect(badges.map((badge) => badge.getAttribute('data-testid'))).toEqual([
      'intelligence-badge-best-seller',
      'intelligence-badge-hot-item',
    ]);
    expect(screen.getByText('Potencial: 82')).toBeInTheDocument();
    expect(screen.getByText('dados ilustrativos')).toBeInTheDocument();
  });
});
