import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PropsWithChildren } from 'react';
import MagicUp from '@/pages/MagicUp';

const state = vi.hoisted(() => ({
  variations: [],
  history: [],
  selectedClient: null,
  selectedProduct: null,
  brief: { channel: 'social', objective: 'vender', tone: 'formal' },
  step: 1,
  loadingProducts: false,
  initialProductsLoaded: true,
}));
vi.mock('@/hooks/useMagicUpState', () => ({ useMagicUpState: () => state }));
vi.mock('@/components/layout/MainLayout', () => ({
  MainLayout: ({ children }: PropsWithChildren) => <>{children}</>,
}));
vi.mock('@/components/seo/PageSEO', () => ({ PageSEO: () => null }));
vi.mock('@/pages/magic-up/MagicUpConfigPanel', () => ({
  MagicUpConfigPanel: () => <input aria-label="Edição parcial da campanha" />,
}));
vi.mock('@/pages/magic-up/MagicUpResultPanel', () => ({
  MagicUpResultPanel: () => <p>Resultado existente</p>,
}));
afterEach(() => {
  cleanup();
  state.loadingProducts = false;
  state.initialProductsLoaded = true;
});

describe('legacy MagicUp product search lifetime', () => {
  it('keeps the existing editor mounted while a subsequent product search is loading', () => {
    const view = render(<MagicUp />);
    const editor = screen.getByLabelText('Edição parcial da campanha');
    fireEvent.change(editor, { target: { value: 'Trabalho parcial preservado' } });
    state.loadingProducts = true;
    view.rerender(<MagicUp />);
    expect(screen.getByLabelText('Edição parcial da campanha')).toBe(editor);
    expect(editor).toHaveValue('Trabalho parcial preservado');
    expect(screen.getByText('Resultado existente')).toBeInTheDocument();
  });
  it('waits for the initial product request before mounting the editing panels', () => {
    state.initialProductsLoaded = false;
    state.loadingProducts = true;
    const view = render(<MagicUp />);
    expect(screen.queryByLabelText('Edição parcial da campanha')).not.toBeInTheDocument();
    state.initialProductsLoaded = true;
    state.loadingProducts = false;
    view.rerender(<MagicUp />);
    expect(screen.getByLabelText('Edição parcial da campanha')).toBeInTheDocument();
  });
});
