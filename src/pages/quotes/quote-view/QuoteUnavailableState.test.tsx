import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QuoteUnavailableState } from './QuoteUnavailableState';

describe('QuoteUnavailableState', () => {
  it('distingue orçamento inexistente de falha transitória', () => {
    render(<QuoteUnavailableState error={null} onBack={vi.fn()} onRetry={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Orçamento não encontrado' })).toBeInTheDocument();
    expect(
      screen.getByText('O orçamento solicitado não existe ou foi removido.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /tentar novamente/i })).not.toBeInTheDocument();
  });

  it('expõe retry e retorno sem engolir os callbacks', () => {
    const onBack = vi.fn();
    const onRetry = vi.fn();
    const error = 'A consulta demorou mais de 8 segundos.';
    render(<QuoteUnavailableState error={error} onBack={onBack} onRetry={onRetry} />);

    expect(
      screen.getByRole('heading', { name: 'Não foi possível carregar o orçamento' }),
    ).toBeInTheDocument();
    expect(screen.getByText(error)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
    fireEvent.click(screen.getByRole('button', { name: /voltar para orçamentos/i }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onBack).toHaveBeenCalledOnce();
  });
});
