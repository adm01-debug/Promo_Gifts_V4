import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { KitAIPromptDialog } from '@/components/kit-builder/KitAIPromptDialog';
import { invokeEdge } from '@/lib/edge/safeInvokeCall';
import type { KitBox, KitItem } from '@/lib/kit-builder';

vi.mock('@/lib/edge/safeInvokeCall', () => ({ invokeEdge: vi.fn() }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const suggestion = {
  kit_type: 'montado' as const,
  box_keywords: ['rígida'],
  item_keywords: ['garrafa', 'caderno', 'caneta'],
  target_price_brl: { min: 100, max: 150 },
  narrative: 'Uma composição corporativa equilibrada.',
};

const catalogItems: KitItem[] = ['Garrafa', 'Caderno', 'Caneta'].map((name, index) => ({
  id: `product-${index}`,
  name,
  sku: `SKU-${index}`,
  imageUrl: null,
  price: 30,
  width: 2,
  height: 2,
  depth: 2,
  volume: 8,
  dimensionsKnown: true,
  quantity: 1,
}));
const catalogBoxes: KitBox[] = [
  {
    id: 'box-1',
    name: 'Caixa rígida',
    sku: 'BOX',
    imageUrl: null,
    price: 15,
    internalWidth: 30,
    internalHeight: 20,
    internalDepth: 20,
    internalVolume: 12_000,
    dimensionsKnown: true,
  },
];

describe('KitAIPromptDialog', () => {
  it('collects an explicit briefing and applies only the returned filters after confirmation', async () => {
    vi.mocked(invokeEdge).mockResolvedValueOnce({ data: { suggestion }, error: null });
    const onApply = vi.fn();
    render(
      <KitAIPromptDialog
        catalogItems={catalogItems}
        catalogBoxes={catalogBoxes}
        onApply={onApply}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /montar com ia/i }));
    fireEvent.change(screen.getByLabelText(/o que você deseja/i), {
      target: { value: 'Kit de boas-vindas sustentável para novos colaboradores.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /gerar sugestões/i }));

    await waitFor(() => expect(screen.getByText(suggestion.narrative)).toBeInTheDocument());
    expect(invokeEdge).toHaveBeenCalledWith(
      'kit-ai-builder',
      expect.objectContaining({
        body: expect.objectContaining({ prompt: expect.stringContaining('boas-vindas') }),
      }),
    );
    expect(screen.getByText(/estoque e preço comercial/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /usar esta composição/i }));
    expect(onApply).toHaveBeenCalledWith(
      suggestion,
      expect.objectContaining({ box: expect.objectContaining({ id: 'box-1' }) }),
    );
  });

  it('keeps an empty result state truthful before a suggestion is generated', () => {
    render(<KitAIPromptDialog onApply={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /montar com ia/i }));

    expect(screen.getByText('Sua sugestão aparecerá aqui')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /gerar sugestões/i })).toBeDisabled();
  });

  it('does not apply a malformed AI response', async () => {
    vi.mocked(invokeEdge).mockResolvedValueOnce({
      data: {
        suggestion: {
          ...suggestion,
          target_price_brl: { min: 250, max: 100 },
        },
      },
      error: null,
    });
    render(<KitAIPromptDialog onApply={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /montar com ia/i }));
    fireEvent.change(screen.getByLabelText(/o que você deseja/i), {
      target: { value: 'Kit de boas-vindas sustentável para novos colaboradores.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /gerar sugestões/i }));

    await waitFor(() => {
      expect(screen.queryByText(suggestion.narrative)).not.toBeInTheDocument();
    });
  });
});
