/**
 * "Projeto salvo" e "Ficha disponível" seguem o resultado EXIBIDO.
 *
 * O que está provado aqui:
 *  1. num lote com URLs diferentes, a gravação devolvida é a do resultado que
 *     o card EXIBE (o primeiro), não a da última área gravada — era por isso
 *     que um lote inteiro gravado aparecia como "Projeto ainda não salvo";
 *  2. a ficha é rastreada separadamente: depois da captura (que zera o
 *     recordId) ela continua "disponível", e "Projeto salvo" não regride.
 *
 * Execução: npx vitest run src/hooks/mockup/__tests__/mockupProjectSaved.test.ts
 */
import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { saveBatchResults, type BatchMockupResult } from '../mockupGeneratorModel';
import { useMockupCompletionStatus } from '@/pages/mockups/mockup-generator/useMockupCompletionStatus';

const AREAS = [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }];
const LOTE: BatchMockupResult[] = [
  { url: 'u1', areaName: 'Frente', areaId: 'a1' },
  { url: 'u2', areaName: 'Costas', areaId: 'a2' },
  { url: 'u3', areaName: 'Lado', areaId: 'a3' },
];

describe('saveBatchResults — a gravação devolvida é a do resultado exibido', () => {
  it('lote todo gravado: devolve o registro da PRIMEIRA área (a que o card exibe)', async () => {
    const saved = await saveBatchResults(LOTE, AREAS, async (_url, area) => `rec-${area.id}`);

    // O card exibe batchResults[0].url (useMockupGenerator.ts:598); é essa a
    // gravação que o indicador "Projeto salvo" compara.
    expect(saved).toEqual({ recordId: 'rec-a1', url: 'u1' });
  });

  it('quando a área exibida não gravou, devolve outra gravação (sem reivindicar a exibida)', async () => {
    const saved = await saveBatchResults(LOTE, AREAS, async (_url, area) =>
      area.id === 'a1' ? null : `rec-${area.id}`,
    );

    expect(saved?.url).not.toBe('u1');
    expect(saved?.recordId).toBeTruthy();
  });
});

type StatusArgs = Parameters<typeof useMockupCompletionStatus>;

function statusHook(mg: Record<string, unknown>, isCapturing: boolean) {
  return renderHook(
    ({ mg: m, capturing }: { mg: Record<string, unknown>; capturing: boolean }) =>
      useMockupCompletionStatus(m as StatusArgs[0], capturing),
    { initialProps: { mg, capturing: isCapturing } },
  );
}

function generatorState(over: Record<string, unknown> = {}) {
  return {
    generatedMockup: 'u1',
    lastSavedRecordId: 'rec-a1',
    lastSavedMockupUrl: 'u1',
    setLastSavedRecordId: vi.fn(),
    setLastSavedMockupUrl: vi.fn(),
    fetchHistory: vi.fn(),
    ...over,
  };
}

describe('useMockupCompletionStatus — salvo e ficha rastreados à parte', () => {
  it('gravação confirmada da imagem exibida: "salvo" com a ficha em preparo', () => {
    const { result } = statusHook(generatorState(), true);

    expect(result.current.projectSaveStatus).toBe('done');
    expect(result.current.sheetStatus).toBe('running');
  });

  it('depois da captura, a ficha fica disponível e o salvo não regride', () => {
    const { result, rerender } = statusHook(generatorState(), true);

    // handleLayoutCaptured atualiza estado: fora de act(), o React emite
    // console.error e o setup strict-test-side-effects reprova o teste.
    act(() => {
      result.current.handleLayoutCaptured();
    });
    // A captura zera recordId/URL no dono do estado (handleLayoutCaptured).
    rerender({
      mg: generatorState({ lastSavedRecordId: null, lastSavedMockupUrl: null }),
      capturing: false,
    });

    expect(result.current.projectSaveStatus).toBe('done');
    expect(result.current.sheetStatus).toBe('done');
  });

  it('sem gravação confirmada da imagem exibida, não diz salvo nem ficha pronta', () => {
    const { result } = statusHook(
      generatorState({ lastSavedRecordId: null, lastSavedMockupUrl: null }),
      false,
    );

    expect(result.current.projectSaveStatus).toBe('idle');
    expect(result.current.sheetStatus).toBe('idle');
  });
});
