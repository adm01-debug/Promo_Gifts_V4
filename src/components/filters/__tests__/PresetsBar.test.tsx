import { describe, expect, it, vi } from 'vitest';
import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@/components/ui/tooltip';
import { defaultFilters, type FilterState } from '../FilterPanel';
import { PresetsBar } from '../PresetsBar';

const presetFilters: FilterState = { ...defaultFilters, search: 'verão' };

vi.mock('../FilterPresets', () => ({
  useFilterPresets: () => ({
    presets: [
      {
        id: 'preset-verao',
        name: 'Campanha de Verão',
        filters: presetFilters,
        context: 'catalog',
        is_default: false,
        icon: '☀️',
        color: '#f59e0b',
        created_at: '2026-08-27T00:00:00.000Z',
        updated_at: '2026-08-27T00:00:00.000Z',
      },
    ],
    isLoading: false,
    savePreset: vi.fn(),
    updatePreset: vi.fn(),
    deletePreset: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

async function renderAndOpen(activePresetId?: string) {
  const onApplyPreset = vi.fn();
  const user = userEvent.setup();

  render(
    <TooltipProvider>
      <PresetsBar
        activePresetId={activePresetId}
        currentFilters={defaultFilters}
        onApplyPreset={onApplyPreset}
      />
    </TooltipProvider>,
  );

  await user.click(screen.getByRole('button', { name: 'Presets de filtros salvos' }));

  return {
    onApplyPreset,
    presetControl: await screen.findByRole('button', {
      name: 'Aplicar preset Campanha de Verão',
    }),
    user,
  };
}

describe('PresetsBar — paridade mouse/teclado', () => {
  it('aplica preset inativo por clique, Enter e Espaço, sem permitir o comportamento padrão do Espaço', async () => {
    const { onApplyPreset, presetControl, user } = await renderAndOpen();

    await user.click(presetControl);
    expect(onApplyPreset).toHaveBeenLastCalledWith(presetFilters, 'preset-verao');

    onApplyPreset.mockClear();
    presetControl.focus();
    await user.keyboard('{Enter}');
    expect(onApplyPreset).toHaveBeenLastCalledWith(presetFilters, 'preset-verao');

    onApplyPreset.mockClear();
    const spaceEvent = createEvent.keyDown(presetControl, { key: ' ' });
    fireEvent(presetControl, spaceEvent);
    expect(spaceEvent.defaultPrevented).toBe(true);
    expect(onApplyPreset).toHaveBeenLastCalledWith(presetFilters, 'preset-verao');
  });

  it('limpa preset ativo por clique, Enter e Espaço, tal como o mouse', async () => {
    const { onApplyPreset, presetControl, user } = await renderAndOpen('preset-verao');

    expect(presetControl).toHaveAttribute('aria-pressed', 'true');

    await user.click(presetControl);
    expect(onApplyPreset).toHaveBeenLastCalledWith(defaultFilters, undefined);

    onApplyPreset.mockClear();
    presetControl.focus();
    await user.keyboard('{Enter}');
    expect(onApplyPreset).toHaveBeenLastCalledWith(defaultFilters, undefined);

    onApplyPreset.mockClear();
    const spaceEvent = createEvent.keyDown(presetControl, { key: ' ' });
    fireEvent(presetControl, spaceEvent);
    expect(spaceEvent.defaultPrevented).toBe(true);
    expect(onApplyPreset).toHaveBeenLastCalledWith(defaultFilters, undefined);
  });
});
