/**
 * A-5 — Ações do histórico visíveis sem hover (toque e teclado).
 *
 * Prova (contrato de classes): os botões de ação existem no DOM, são focáveis
 * e têm nome acessível sem depender de `:hover`; as ações frequentes têm alvo
 * de toque >= 44px. O jsdom não calcula CSS (não há Tailwind aplicado), então
 * — como no resto da casa (docs/MAGIC_UP_ONDA5_A11Y.md, tests/components/
 * magic-up-*.test.tsx) — o contrato é verificado pelas classes aplicadas.
 * Sem a correção estes testes falham: as barras de ação usavam
 * `opacity-0 group-hover:opacity-100` (invisíveis no toque e no teclado) e os
 * botões sobrescreviam o `size="icon"` do kit com `h-8 w-8` (32px).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../render-helpers';
import type { GeneratedMockup } from '@/hooks/mockup/mockupGenerationService';

vi.mock('@/components/products/ColumnSelector', () => ({
  ColumnSelector: () => null,
  getDefaultColumns: vi.fn().mockReturnValue(3),
}));

// Toggle de layout controlável: exercita a visão em lista sem depender do
// Popover do Radix (que não abre de forma confiável no jsdom).
vi.mock('@/components/products/LayoutPopover', () => ({
  LayoutPopover: ({ setViewMode }: { setViewMode: (m: 'grid' | 'list' | 'table') => void }) => (
    <button type="button" data-testid="go-list-view" onClick={() => setViewMode('list')}>
      Lista
    </button>
  ),
}));

vi.mock('@/components/mockup/MockupCompareDialog', () => ({
  MockupCompareDialog: () => null,
}));

import { MockupHistoryPanel } from '@/components/mockup/MockupHistoryPanel';

const MOCKUP: GeneratedMockup = {
  id: 'm1',
  product_id: 'p1',
  product_name: 'Caneta',
  product_sku: 'CAN-001',
  technique_id: 't1',
  technique_name: 'Laser',
  mockup_url: 'https://example.com/mockup.jpg',
  layout_url: null,
  logo_url: 'https://example.com/logo.png',
  position_x: 50,
  position_y: 50,
  logo_width_cm: 5,
  logo_height_cm: 3,
  location_name: 'Frente',
  colors_count: 1,
  created_at: new Date().toISOString(),
  client_id: 'c1',
  client_name: 'Cliente A',
  annotations: null,
};

const ACTION_NAMES = [
  /regenerar mockup de caneta/i,
  /compartilhar mockup/i,
  /baixar mockup de caneta/i,
  /excluir mockup de caneta/i,
];

function renderPanel() {
  return renderWithProviders(
    <MockupHistoryPanel
      mockupHistory={[MOCKUP]}
      isLoading={false}
      clients={[]}
      onLoadFromHistory={vi.fn()}
      onDownload={vi.fn()}
      onDelete={vi.fn()}
    />,
  );
}

describe('MockupHistoryPanel — ações visíveis sem hover (A-5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('grid: barra de ações não depende de hover para aparecer', () => {
    renderPanel();
    const bar = screen.getByTestId('mockup-card-actions');
    expect(bar.className).not.toMatch(/opacity-0/);
    expect(bar.className).not.toMatch(/group-hover/);
  });

  it('grid: ações no DOM, com nome acessível e focáveis por teclado', () => {
    renderPanel();
    for (const name of ACTION_NAMES) {
      const btn = screen.getByRole('button', { name });
      expect(btn).toBeEnabled();
      btn.focus();
      expect(btn).toHaveFocus();
    }
  });

  it('grid: ações frequentes com alvo >= 44px (sem override h-8/w-8 de 32px)', () => {
    renderPanel();
    for (const name of ACTION_NAMES) {
      const className = screen.getByRole('button', { name }).className;
      // kit Button size="icon" = h-11 w-11 (44px) + min-h-[44px] min-w-[44px]
      expect(className, `alvo < 44px em ${name}`).toMatch(/\bh-11\b/);
      expect(className).not.toMatch(/\bh-8\b/);
      expect(className).not.toMatch(/\bw-8\b/);
    }
  });

  it('grid: checkbox de comparação visível e com alvo de 44px sem ampliar o visual', () => {
    renderPanel();
    const cb = screen.getByRole('checkbox', { name: /selecionar caneta para comparação/i });
    expect(cb.className).not.toMatch(/opacity-0/);
    // 24px visuais (h-6 w-6) + 10px de cada lado (after:-inset-2.5) = 44px de alvo
    expect(cb.className).toMatch(/\bh-6\b/);
    expect(cb.className).toMatch(/after:-inset-2\.5/);
    expect(cb.className).toMatch(/\brelative\b/);
    // foco visível por teclado (docs/MAGIC_UP_ONDA5_A11Y.md §1)
    expect(cb.className).toMatch(/focus-visible:ring-2/);
    expect(cb.className).toMatch(/focus-visible:ring-offset-2/);
    cb.focus();
    expect(cb).toHaveFocus();
  });

  it('lista: barra de ações visível sem hover e alvos >= 44px', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByTestId('go-list-view'));

    const bar = await screen.findByTestId('mockup-row-actions');
    expect(bar.className).not.toMatch(/opacity-0/);
    expect(bar.className).not.toMatch(/group-hover/);

    for (const name of ACTION_NAMES) {
      const btn = screen.getByRole('button', { name });
      expect(btn).toBeEnabled();
      expect(btn.className, `alvo < 44px em ${name}`).toMatch(/\bh-11\b/);
      expect(btn.className).not.toMatch(/\bh-8\b/);
    }
  });
});
