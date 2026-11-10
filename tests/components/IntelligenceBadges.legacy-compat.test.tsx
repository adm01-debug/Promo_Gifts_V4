import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { IntelligenceBadges } from '@/components/common/IntelligenceBadges';
import { useBadgeVisibilityStore } from '@/stores/useBadgeVisibilityStore';
import type { IntelligenceBadge } from '@/hooks/products';
import type { IntelligenceBadge as LegacyBadge } from '@/hooks/useProductIntelligenceBadges';

vi.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: '/produto/compat' }) }));
vi.mock('@/contexts/ThemeContext', () => ({ useTheme: () => ({ actualTheme: 'light' }) }));
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: PropsWithChildren) => <>{children}</>,
  TooltipTrigger: ({ children }: PropsWithChildren) => <>{children}</>,
  TooltipContent: ({ children }: PropsWithChildren) => <div role="tooltip">{children}</div>,
}));

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

describe('IntelligenceBadges preserves canonical and legacy badge contracts', () => {
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

  it.each(legacyTypes)('preserves legacy identity, emoji and tooltip for %s', (type) => {
    const input = legacy(type);
    const before = { ...input };
    render(<IntelligenceBadges badges={[input]} />);
    expect(screen.getByTestId(`intelligence-badge-${type}`)).toHaveTextContent(`🏷️ Legacy ${type}`);
    expect(screen.getByRole('tooltip')).toHaveTextContent(`Legacy tooltip ${type}`);
    expect(input).toEqual(before);
    expect('priority' in input).toBe(false);
  });

  it.each([...canonicalTypes.map(canonical), ...legacyTypes.map(legacy)])(
    'honors the existing global visibility toggle for $label',
    (badge) => {
      useBadgeVisibilityStore.setState({ badgesEnabled: false });
      const { container } = render(<IntelligenceBadges badges={[badge]} />);
      expect(container.firstChild).toBeNull();
    },
  );

  it('keeps mixed-input order, turnover and the explicit illustrative-data label', () => {
    render(
      <IntelligenceBadges
        badges={[legacy('popular'), canonical('hot-item')]}
        turnoverScore={82}
        isDemo
      />,
    );
    const badges = screen.getAllByTestId(/^intelligence-badge-/);
    expect(badges.map((badge) => badge.getAttribute('data-testid'))).toEqual([
      'intelligence-badge-popular',
      'intelligence-badge-hot-item',
    ]);
    expect(screen.getByText('Potencial: 82')).toBeInTheDocument();
    expect(screen.getByText('dados ilustrativos')).toBeInTheDocument();
  });
});
