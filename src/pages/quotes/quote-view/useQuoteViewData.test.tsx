import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QUOTE_VIEW_LOAD_TIMEOUT_MS, useQuoteViewData } from './useQuoteViewData';

const { fetchQuote, toastError } = vi.hoisted(() => ({
  fetchQuote: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/hooks/quotes', () => ({
  useQuotes: () => ({
    fetchQuote,
    logQuoteHistory: vi.fn(),
    duplicateQuote: vi.fn(),
    deleteQuote: vi.fn(),
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null }),
}));

vi.mock('@/lib/crm-db', () => ({
  selectCrmById: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: toastError,
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('@/utils/proposalPdfReactGenerator', () => ({
  generateProposalPDFv2: vi.fn(),
  downloadPDF: vi.fn(),
}));

describe('useQuoteViewData', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchQuote.mockReset();
    toastError.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('encerra o loading e oferece erro recuperável quando a leitura trava', async () => {
    fetchQuote.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useQuoteViewData('00000000-0000-0000-0000-000000000000'));

    expect(result.current.isLoadingQuote).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(QUOTE_VIEW_LOAD_TIMEOUT_MS);
    });

    expect(result.current.isLoadingQuote).toBe(false);
    expect(result.current.quote).toBeNull();
    expect(result.current.quoteLoadError).toMatch(/8 segundos/i);
    expect(toastError).toHaveBeenCalledWith(
      'Não foi possível carregar o orçamento',
      expect.objectContaining({ description: expect.stringMatching(/tente novamente/i) }),
    );
  });

  it('não deixa a tela carregando quando a rota não tem id', () => {
    const { result } = renderHook(() => useQuoteViewData(undefined));

    expect(result.current.isLoadingQuote).toBe(false);
    expect(fetchQuote).not.toHaveBeenCalled();
  });
});
