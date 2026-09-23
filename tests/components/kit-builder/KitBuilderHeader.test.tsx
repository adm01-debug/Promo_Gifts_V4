import { render, screen } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import { KitBuilderHeader } from '@/components/kit-builder/KitBuilderHeader';
import type { KitBuilderStep } from '@/lib/kit-builder';

function renderHeader(currentStep: KitBuilderStep) {
  return render(
    <KitBuilderHeader
      kitName="Kit Teste"
      onKitNameChange={vi.fn()}
      isValid
      isSaving={false}
      isAutoSaving={false}
      lastSavedAt={null}
      hasContent
      isExistingKit={false}
      canUndo={false}
      canRedo={false}
      onIdentityChange={vi.fn()}
      onSave={vi.fn()}
      onUndo={vi.fn()}
      onRedo={vi.fn()}
      onReset={vi.fn()}
      onAIApply={vi.fn()}
      aiCatalogItems={[]}
      aiCatalogBoxes={[]}
      currentStep={currentStep}
    />,
  );
}

describe('KitBuilderHeader breadcrumb', () => {
  it('renders "Início > Kit Maker > <passo atual>" with links on the first two crumbs', () => {
    renderHeader('box');

    const home = screen.getByRole('link', { name: 'Início' });
    expect(home).toHaveAttribute('href', '/');

    const kitMaker = screen.getByRole('link', { name: 'Kit Maker' });
    expect(kitMaker).toHaveAttribute('href', '/montar-kit');

    const currentCrumb = screen.getByText('Caixa');
    expect(currentCrumb.tagName).not.toBe('A');
  });

  it.each<[KitBuilderStep, string]>([
    ['box', 'Caixa'],
    ['items', 'Itens'],
    ['personalization', 'Personalização'],
    ['summary', 'Resumo'],
  ])('shows the label for step %s', (step, label) => {
    renderHeader(step);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
