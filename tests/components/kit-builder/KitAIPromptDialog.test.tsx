import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { KitAIPromptDialog } from '@/components/kit-builder/KitAIPromptDialog';
import { invokeEdge } from '@/lib/edge/safeInvokeCall';

vi.mock('@/lib/edge/safeInvokeCall', () => ({ invokeEdge: vi.fn() }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const suggestion = {
  kit_type: 'montado' as const,
  box_keywords: ['rígida'],
  item_keywords: ['garrafa', 'caderno'],
  target_price_brl: { min: 100, max: 150 },
  narrative: 'Uma composição corporativa equilibrada.',
};

describe('KitAIPromptDialog', () => {
  it('collects an explicit briefing and applies only the returned filters after confirmation', async () => {
    vi.mocked(invokeEdge).mockResolvedValueOnce({ data: { suggestion }, error: null });
    const onApply = vi.fn();
    render(<KitAIPromptDialog onApply={onApply} />);

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
    expect(screen.getByText(/não adiciona itens automaticamente/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /aplicar filtros da sugestão/i }));
    expect(onApply).toHaveBeenCalledWith(suggestion);
  });

  it('keeps an empty result state truthful before a suggestion is generated', () => {
    render(<KitAIPromptDialog onApply={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /montar com ia/i }));

    expect(screen.getByText('Sua sugestão aparecerá aqui')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /gerar sugestões/i })).toBeDisabled();
  });
});
