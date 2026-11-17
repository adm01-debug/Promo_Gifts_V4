/**
 * O filtro de técnica do histórico de mockups tem de oferecer as técnicas do
 * CATÁLOGO, não só as que já apareceram em algum mockup antigo.
 *
 * Resgatado de `importado`/`codex/fix-gate1-kit-pdf-types-261109-2252` (11/11/2026),
 * branch de outro agente nunca mergeada. Era um dos dois itens vivos do dossiê
 * `analise-branches/dossies/codex__fix-gate1-kit-pdf-types-261109-2252.md`.
 *
 * Antes: `historyTechniques` derivava só de `mockupHistory`, então técnica recém
 * cadastrada — ainda sem nenhum mockup — não aparecia na lista e não havia como
 * filtrar por ela.
 *
 * A chave de cada opção é o NOME da técnica, não o id: o filtro compara com
 * `mockup.technique_name` (`MockupHistoryPanel.tsx`, bloco do `filterTechnique`).
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../render-helpers';
import React from 'react';

vi.mock('@/components/products/LayoutPopover', () => ({
  LayoutPopover: () => <div />,
}));
vi.mock('@/components/products/ColumnSelector', () => ({
  getDefaultColumns: vi.fn().mockReturnValue(3),
}));
vi.mock('@/components/mockup/MockupSkeleton', () => ({
  MockupHistorySkeleton: () => <div data-testid="skeleton" />,
}));
vi.mock('@/components/mockup/MockupCompareDialog', () => ({
  MockupCompareDialog: () => null,
}));
vi.mock('@/components/mockup/ShareMenu', () => ({
  ShareMenu: () => null,
}));

const mockup = (id: string, techniqueName: string) => ({
  id,
  product_id: 'p1',
  product_name: 'Caneta',
  product_sku: 'CAN-001',
  technique_id: 't1',
  technique_name: techniqueName,
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
});

const baseProps = {
  isLoading: false,
  clients: [],
  onLoadFromHistory: vi.fn(),
  onDownload: vi.fn(),
  onDelete: vi.fn(),
};

const openTechniqueFilter = async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  await user.click(screen.getByLabelText('Filtrar por técnica'));
  // O conteúdo do Select vai para um portal; espera ele existir.
  await screen.findByRole('option', { name: 'Todas as técnicas' });
};

describe('MockupHistoryPanel — filtro de técnica inclui o catálogo', () => {
  beforeAll(() => {
    // O Select do Radix usa estas APIs de ponteiro, que o jsdom não implementa.
    // Sem elas o menu não abre e nenhuma opção chega ao DOM.
    Element.prototype.hasPointerCapture = vi.fn(() => false) as unknown as Element['hasPointerCapture'];
    Element.prototype.releasePointerCapture =
      vi.fn() as unknown as Element['releasePointerCapture'];
    Element.prototype.scrollIntoView = vi.fn() as unknown as Element['scrollIntoView'];
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('oferece técnica do catálogo que ainda não tem nenhum mockup', async () => {
    const { MockupHistoryPanel } = await import('@/components/mockup/MockupHistoryPanel');
    renderWithProviders(
      <MockupHistoryPanel
        {...baseProps}
        mockupHistory={[mockup('m1', 'Laser')]}
        techniques={[{ name: 'Laser' }, { name: 'Bordado' }]}
      />,
    );

    await openTechniqueFilter();

    // "Laser" vem do histórico; "Bordado" só existe no catálogo e é o que faltava.
    expect(screen.getByRole('option', { name: 'Laser' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Bordado' })).toBeInTheDocument();
  }, 15000);

  it('não duplica a técnica que está nos dois lugares', async () => {
    const { MockupHistoryPanel } = await import('@/components/mockup/MockupHistoryPanel');
    renderWithProviders(
      <MockupHistoryPanel
        {...baseProps}
        mockupHistory={[mockup('m1', 'Serigrafia'), mockup('m2', 'Serigrafia')]}
        techniques={[{ name: 'Serigrafia' }]}
      />,
    );

    await openTechniqueFilter();

    expect(screen.getAllByRole('option', { name: 'Serigrafia' })).toHaveLength(1);
  }, 15000);

  it('sem a prop, segue derivando só do histórico (comportamento anterior intacto)', async () => {
    const { MockupHistoryPanel } = await import('@/components/mockup/MockupHistoryPanel');
    renderWithProviders(
      <MockupHistoryPanel {...baseProps} mockupHistory={[mockup('m1', 'Laser')]} />,
    );

    await openTechniqueFilter();

    expect(screen.getByRole('option', { name: 'Laser' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Bordado' })).not.toBeInTheDocument();
  }, 15000);
});
