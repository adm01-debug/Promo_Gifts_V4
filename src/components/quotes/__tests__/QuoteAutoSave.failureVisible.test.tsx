/**
 * Falha de auto-save tem de ser VISÍVEL, não só anunciada ao leitor de tela.
 *
 * QuoteBuilderPage.tsx:198 renderiza o indicador com `sr-only pointer-events-none`
 * (indicador discreto no estado normal). Como o container aplica esse className
 * direto, o estado 'error' — único retorno de uma falha de gravação do rascunho,
 * incluindo QuotaExceededError (QuoteAutoSave.tsx:190-197) — ficava invisível:
 * o vendedor seguia editando achando que estava salvo.
 *
 * Nada mais no fluxo avisa: não existe toast nem outro indicador de erro de
 * auto-save em QuoteAutoSave.tsx (`grep -n toast` = 0 ocorrências).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QuoteAutoSave } from '../QuoteAutoSave';
import { QUOTE_AUTOSAVE_STATUS_TEXT } from '../quoteAutoSaveStatus';

const renderIndicator = (data: unknown) =>
  render(
    <TooltipProvider>
      <QuoteAutoSave
        quoteId="q-1"
        data={data}
        debounceMs={1}
        // Exatamente o que a página passa hoje.
        className="sr-only pointer-events-none"
      />
    </TooltipProvider>,
  );

describe('QuoteAutoSave — falha de gravação não pode ficar invisível', () => {
  beforeEach(() => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const err = new Error('quota');
      err.name = 'QuotaExceededError';
      throw err;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('revela o indicador quando o rascunho não pôde ser salvo', async () => {
    const { rerender } = renderIndicator({ items: [] });

    // Estado normal: a página esconde o indicador de propósito.
    expect(screen.getByTestId('quote-autosave-indicator').className).toContain('sr-only');

    // Qualquer edição dispara o auto-save, que falha por quota.
    rerender(
      <TooltipProvider>
        <QuoteAutoSave
          quoteId="q-1"
          data={{ items: [{ id: 'p-1' }] }}
          debounceMs={1}
          className="sr-only pointer-events-none"
        />
      </TooltipProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('quote-autosave-indicator')).toHaveAttribute(
        'data-status',
        'error',
      );
    });

    const indicator = screen.getByTestId('quote-autosave-indicator');
    // twMerge resolve o conflito: `not-sr-only` elimina o `sr-only` da página.
    // classList, não substring: 'not-sr-only' contém 'sr-only' como texto.
    expect(indicator.classList.contains('sr-only')).toBe(false);
    expect(indicator.classList.contains('not-sr-only')).toBe(true);
    expect(indicator.classList.contains('pointer-events-none')).toBe(false);
  });

  it('mostra o texto do erro também no mobile (sem o `hidden sm:inline`)', async () => {
    const { rerender } = renderIndicator({ items: [] });

    rerender(
      <TooltipProvider>
        <QuoteAutoSave
          quoteId="q-1"
          data={{ items: [{ id: 'p-2' }] }}
          debounceMs={1}
          className="sr-only pointer-events-none"
        />
      </TooltipProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('quote-autosave-text')).toHaveTextContent(
        QUOTE_AUTOSAVE_STATUS_TEXT.error,
      );
    });

    const text = screen.getByTestId('quote-autosave-text');
    expect(text.classList.contains('hidden')).toBe(false);
    expect(text.classList.contains('text-destructive')).toBe(true);
  });
});
