/**
 * Ligação ponta a ponta da preservação de rascunho (opção A da PR #3788).
 *
 * O teste de unidade em tests/lib/restoredDraftBase.test.ts prova a função; este
 * prova a FIAÇÃO, que é o que a mutação quebra: QuoteAutoSave tem de gravar o
 * resultado de mesclarComBaseRestaurada e não `dataRef.current` cru.
 */
import { useState, type PropsWithChildren } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuoteAutoSave } from '@/components/quotes/QuoteAutoSave';
import {
  chaveDoRascunho,
  esquecerBaseRestaurada,
  registrarBaseRestaurada,
} from '@/hooks/quotes/restoredDraftBase';

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: PropsWithChildren) => <>{children}</>,
  TooltipTrigger: ({ children }: PropsWithChildren) => <>{children}</>,
  TooltipContent: () => null,
}));

const CHAVE = chaveDoRascunho(undefined); // orçamento novo: quote_draft_new

beforeEach(() => {
  localStorage.clear();
  esquecerBaseRestaurada(CHAVE);
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-10T12:00:00Z'));
});
afterEach(() => {
  cleanup();
  esquecerBaseRestaurada(CHAVE);
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function Harness({ proximo }: { proximo: unknown }) {
  const [data, setData] = useState<unknown>({ notes: 'inicial', items: [] });
  return (
    <>
      <button type="button" onClick={() => setData(proximo)}>
        editar
      </button>
      <QuoteAutoSave data={data} debounceMs={100} />
    </>
  );
}

function gravado() {
  return JSON.parse(localStorage.getItem(CHAVE) || '{}') as { data?: Record<string, unknown> };
}

describe('QuoteAutoSave grava preservando a base restaurada', () => {
  it('mantém no rascunho os campos que a tela não modela', () => {
    // Como se o vendedor tivesse acabado de restaurar um rascunho que trazia a
    // entrega por data e a validade em dias — campos que QuoteBuilderPage não grava.
    registrarBaseRestaurada(CHAVE, {
      notes: 'nota antiga',
      deliveryMode: 'data',
      deliveryDate: '2026-12-20T12:00:00',
      validityDays: 30,
    });

    // O autosave grava quando os dados MUDAM depois da montagem (contrato do
    // componente), igual ao vendedor editando a tela após restaurar.
    render(<Harness proximo={{ notes: 'nota nova', items: [] }} />);
    act(() => fireEvent.click(screen.getByRole('button', { name: 'editar' })));
    act(() => vi.advanceTimersByTime(100));

    const d = gravado().data ?? {};
    // A tela manda no que ela modela.
    expect(d.notes).toBe('nota nova');
    // E o que só o rascunho tinha continua lá.
    expect(d.deliveryMode).toBe('data');
    expect(d.deliveryDate).toBe('2026-12-20T12:00:00');
    expect(d.validityDays).toBe(30);
  });

  it('sem restauração, grava exatamente o que a tela tem', () => {
    render(<Harness proximo={{ notes: 'só a tela', items: [] }} />);
    act(() => fireEvent.click(screen.getByRole('button', { name: 'editar' })));
    act(() => vi.advanceTimersByTime(100));

    const d = gravado().data ?? {};
    expect(d).toEqual({ notes: 'só a tela', items: [] });
  });
});
