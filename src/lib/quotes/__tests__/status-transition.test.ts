import { describe, it, expect, vi, beforeEach } from 'vitest';

const { warnMock } = vi.hoisted(() => ({ warnMock: vi.fn() }));

vi.mock('@/lib/telemetry/structuredLogger', () => ({
  createClientLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: warnMock,
    error: vi.fn(),
    child: vi.fn(),
    headers: () => ({}),
    scope: 'test',
    requestId: 'test',
  }),
}));

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: { from: vi.fn() },
}));

vi.mock('@/integrations/supabase/client', () => ({ supabase: supabaseMock }));

import {
  assertQuoteStatusTransition,
  updateQuoteStatusSafely,
  QuoteStatusTransitionError,
} from '@/lib/quotes/status-transition';

type FromMock = { from: ReturnType<typeof vi.fn> };

function selectReturning(status: string) {
  return {
    select: () => ({
      eq: () => ({ single: () => Promise.resolve({ data: { status }, error: null }) }),
    }),
  };
}

function updateReturning(error: unknown = null) {
  const eq = vi.fn(() => Promise.resolve({ error }));
  const update = vi.fn(() => ({ eq }));
  return { update, eq };
}

const from = (supabaseMock as unknown as FromMock).from;

describe('assertQuoteStatusTransition', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('não lança para par permitido pelo mapa', () => {
    expect(() => assertQuoteStatusTransition('draft', 'sent')).not.toThrow();
  });

  it('não lança quando o status não muda', () => {
    expect(() => assertQuoteStatusTransition('cancelled', 'cancelled')).not.toThrow();
  });

  it('lança QuoteStatusTransitionError e emite telemetria para par proibido', () => {
    expect(() => assertQuoteStatusTransition('cancelled', 'approved', { quoteId: 'q-9' })).toThrow(
      QuoteStatusTransitionError,
    );
    expect(warnMock).toHaveBeenCalledWith(
      'quote_status_transition_blocked',
      expect.objectContaining({
        quote_id: 'q-9',
        from_status: 'cancelled',
        to_status: 'approved',
        reason: 'not_allowed_by_config',
      }),
    );
  });

  it('aceita o orçamento inteiro no lugar do status cru', () => {
    expect(() => assertQuoteStatusTransition({ status: 'rejected' }, 'approved')).toThrow(
      QuoteStatusTransitionError,
    );
  });

  it('rejeita valor que não é status conhecido', () => {
    expect(() => assertQuoteStatusTransition(undefined, 'sent')).toThrow(/inválido/);
  });
});

describe('updateQuoteStatusSafely', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('escreve no banco quando o par é permitido e o status de origem é informado', async () => {
    const updateSpy = updateReturning(null);
    from.mockReturnValueOnce({ update: updateSpy.update });

    const result = await updateQuoteStatusSafely({
      quoteId: 'q-1',
      from: 'draft',
      to: 'sent',
    });

    expect(result).toEqual({ fromStatus: 'draft', toStatus: 'sent', unchanged: false });
    expect(updateSpy.update).toHaveBeenCalledWith({ status: 'sent' });
    expect(updateSpy.eq).toHaveBeenCalledWith('id', 'q-1');
  });

  it('não escreve no banco quando o par é proibido', async () => {
    await expect(
      updateQuoteStatusSafely({ quoteId: 'q-2', from: 'rejected', to: 'approved' }),
    ).rejects.toBeInstanceOf(QuoteStatusTransitionError);
    expect(from).not.toHaveBeenCalled();
  });

  it('lê o status atual do banco quando o chamador não informa', async () => {
    from.mockReturnValueOnce(selectReturning('pending_approval'));
    const updateSpy = updateReturning(null);
    from.mockReturnValueOnce({ update: updateSpy.update });

    const result = await updateQuoteStatusSafely({ quoteId: 'q-3', to: 'cancelled' });

    expect(result.fromStatus).toBe('pending_approval');
    expect(updateSpy.update).toHaveBeenCalledWith({ status: 'cancelled' });
  });

  it('bloqueia com base no status lido do banco', async () => {
    from.mockReturnValueOnce(selectReturning('converted'));

    await expect(
      updateQuoteStatusSafely({ quoteId: 'q-4', to: 'pending' }),
    ).rejects.toBeInstanceOf(QuoteStatusTransitionError);
  });

  it('não envia UPDATE quando o status já é o destino', async () => {
    const updateSpy = updateReturning(null);
    from.mockReturnValueOnce({ update: updateSpy.update });

    const result = await updateQuoteStatusSafely({ quoteId: 'q-5', from: 'sent', to: 'sent' });

    expect(result.unchanged).toBe(true);
    expect(updateSpy.update).not.toHaveBeenCalled();
  });

  it('traduz a recusa de transição do banco em erro legível', async () => {
    from.mockReturnValueOnce(
      updateReturning({
        code: '23514',
        message: 'Transicao de status nao permitida: draft para converted',
        hint: null,
      }),
    );

    await expect(
      updateQuoteStatusSafely({ quoteId: 'q-6', from: 'draft', to: 'pending' }),
    ).rejects.toThrow(/banco recusou a mudança de status/);

    expect(warnMock).toHaveBeenCalledWith(
      'quote_status_transition_blocked',
      expect.objectContaining({ reason: 'db_check_violation', source: 'db' }),
    );
  });

  it('propaga erro do banco que não é de transição', async () => {
    from.mockReturnValueOnce(updateReturning({ code: '42501', message: 'permission denied' }));

    await expect(
      updateQuoteStatusSafely({ quoteId: 'q-7', from: 'draft', to: 'sent' }),
    ).rejects.toMatchObject({ code: '42501' });
  });
});