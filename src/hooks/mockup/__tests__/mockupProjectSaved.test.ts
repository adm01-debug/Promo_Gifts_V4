/**
 * "Projeto salvo" segue o resultado EXIBIDO.
 *
 * O que está provado aqui:
 *  1. num lote com URLs diferentes, a gravação devolvida é a do resultado que
 *     o card EXIBE (o primeiro), não a da última área gravada — era por isso
 *     que um lote inteiro gravado aparecia como "Projeto ainda não salvo";
 *  2. a confirmação não regride depois da captura da ficha, que zera o recordId;
 *  3. numa re-geração que FALHA, com a imagem anterior preservada na tela, o
 *     card continua dizendo que o projeto está salvo.
 *
 * Execução: npx vitest run src/hooks/mockup/__tests__/mockupProjectSaved.test.ts
 */
import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { saveBatchResults, type BatchMockupResult } from '../mockupGeneratorModel';
import { useMockupCompletionStatus } from '@/pages/mockups/mockup-generator/useMockupCompletionStatus';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { toast } from 'sonner';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const AREAS = [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }];
const LOTE: BatchMockupResult[] = [
  { url: 'u1', areaName: 'Frente', areaId: 'a1' },
  { url: 'u2', areaName: 'Costas', areaId: 'a2' },
  { url: 'u3', areaName: 'Lado', areaId: 'a3' },
];

describe('saveBatchResults — a gravação devolvida é a do resultado exibido', () => {
  it('lote todo gravado: devolve o registro da PRIMEIRA área (a que o card exibe)', async () => {
    const saved = await saveBatchResults(LOTE, AREAS, (_url, area) =>
      Promise.resolve(`rec-${area.id}`),
    );

    // O card exibe batchResults[0].url (useMockupGenerator.ts:598); é essa a
    // gravação que o indicador "Projeto salvo" compara.
    // ...e carrega a ÁREA daquela gravação: é dela que a ficha tira as medidas.
    expect(saved).toEqual({ recordId: 'rec-a1', url: 'u1', area: AREAS[0] });
  });

  it('quando a área exibida não gravou, devolve outra gravação (sem reivindicar a exibida)', async () => {
    const saved = await saveBatchResults(LOTE, AREAS, (_url, area) =>
      Promise.resolve(area.id === 'a1' ? null : `rec-${area.id}`),
    );

    expect(saved?.url).not.toBe('u1');
    expect(saved?.recordId).toBeTruthy();
  });
});

type StatusArgs = Parameters<typeof useMockupCompletionStatus>;

function statusHook(mg: Record<string, unknown>) {
  return renderHook(
    ({ mg: m }: { mg: Record<string, unknown> }) => useMockupCompletionStatus(m as StatusArgs[0]),
    { initialProps: { mg } },
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

describe('useMockupCompletionStatus — o salvo é da imagem exibida', () => {
  it('gravação confirmada da imagem exibida: "salvo"', () => {
    const { result } = statusHook(generatorState());

    expect(result.current.projectSaveStatus).toBe('done');
  });

  it('depois da captura da ficha, que zera o recordId, o salvo não regride', () => {
    const { result, rerender } = statusHook(generatorState());

    // handleLayoutCaptured atualiza estado: fora de act(), o React emite
    // console.error e o setup strict-test-side-effects reprova o teste.
    act(() => {
      result.current.handleLayoutCaptured();
    });
    // A captura zera recordId/URL no dono do estado (handleLayoutCaptured).
    rerender({ mg: generatorState({ lastSavedRecordId: null, lastSavedMockupUrl: null }) });

    expect(result.current.projectSaveStatus).toBe('done');
  });

  it('sem gravação confirmada da imagem exibida, não diz salvo', () => {
    const { result } = statusHook(
      generatorState({ lastSavedRecordId: null, lastSavedMockupUrl: null }),
    );

    expect(result.current.projectSaveStatus).toBe('idle');
  });
});

describe('useMockupCompletionStatus — gravar OUTRO resultado não apaga o rastreio do exibido', () => {
  it('"Gerar Layout" grava o PNG estático e a confirmação da imagem de IA fica de pé', () => {
    const { result, rerender } = statusHook(generatorState());

    act(() => {
      result.current.handleLayoutCaptured();
    });
    rerender({ mg: generatorState({ lastSavedRecordId: null, lastSavedMockupUrl: null }) });
    expect(result.current.projectSaveStatus).toBe('done');

    // "Gerar Layout" grava OUTRO registro (o PNG estático). A imagem EXIBIDA
    // continua sendo a de IA ('u1') — a confirmação dela não pode regredir.
    rerender({
      mg: generatorState({ lastSavedRecordId: 'rec-static', lastSavedMockupUrl: 'static-png' }),
    });
    expect(result.current.projectSaveStatus).toBe('done');

    act(() => {
      result.current.handleLayoutCaptured();
    });
    rerender({ mg: generatorState({ lastSavedRecordId: null, lastSavedMockupUrl: null }) });
    expect(result.current.projectSaveStatus).toBe('done');
  });
});

describe('useMockupCompletionStatus — re-geração que falha não desfaz "Projeto salvo"', () => {
  it('com a imagem anterior preservada na tela, o projeto continua salvo', () => {
    const { result, rerender } = statusHook(generatorState());
    expect(result.current.projectSaveStatus).toBe('done');

    // É o que o dono do estado produz numa re-geração que falha: generatedMockup
    // volta a null (useMockupGenerator.ts:563) e o erro é preenchido no catch
    // (:625). O card preserva 'u1' na tela — e 'u1' está salvo.
    rerender({
      mg: generatorState({ generatedMockup: null, generationError: 'A geração falhou' }),
    });

    expect(result.current.projectSaveStatus).toBe('done');
  });
});

describe('ficha de aprovação que falha: avisa o vendedor e libera o pedido', () => {
  it('handleLayoutFailed avisa na tela e zera o pedido pendente', () => {
    const setRec = vi.fn();
    const setUrl = vi.fn();
    const { result } = statusHook(
      generatorState({ setLastSavedRecordId: setRec, setLastSavedMockupUrl: setUrl }),
    );

    act(() => {
      result.current.handleLayoutFailed('rec-a1');
    });

    // Sem zerar o pedido, o processedRef da captura barra nova tentativa e a
    // ficha fica pendente para sempre.
    expect(setRec).toHaveBeenCalledWith(null);
    expect(setUrl).toHaveBeenCalledWith(null);
    expect(toast.error).toHaveBeenCalledWith(
      'Não foi possível preparar a ficha de aprovação deste mockup. O mockup está salvo — gere a ficha de novo.',
    );
  });

  it('falha de uma ficha ANTERIOR não apaga o pedido do mockup novo', () => {
    const setRec = vi.fn();
    const setUrl = vi.fn();
    // Reproduz a sequência REAL, não uma chamada conveniente: o efeito de
    // OffscreenLayoutCapture tem deps [request?.recordId, isCapturing] com
    // exhaustive-deps desligado, então o `capture()` assíncrono RETÉM o
    // callback do render que o iniciou. Por isso o teste guarda o callback
    // daquele render, re-renderiza com outro pedido corrente e só então invoca
    // o callback retido. Comparar o recordId com um `lastSavedRecordId`
    // capturado daria igual (os dois velhos) e apagaria o pedido novo; o
    // handler lê o pedido corrente por ref justamente por isso.
    const { result, rerender } = statusHook(
      generatorState({
        lastSavedRecordId: 'rec-antigo',
        lastSavedMockupUrl: 'url-antiga',
        setLastSavedRecordId: setRec,
        setLastSavedMockupUrl: setUrl,
      }),
    );

    const callbackRetido = result.current.handleLayoutFailed;

    // O vendedor salvou outro mockup enquanto o upload da ficha anterior corria.
    rerender({
      mg: generatorState({
        lastSavedRecordId: 'rec-novo',
        lastSavedMockupUrl: 'url-nova',
        setLastSavedRecordId: setRec,
        setLastSavedMockupUrl: setUrl,
      }),
    });

    act(() => {
      callbackRetido('rec-antigo');
    });

    // O aviso sai: a ficha daquele mockup falhou e o vendedor precisa saber.
    expect(toast.error).toHaveBeenCalledWith(
      'Não foi possível preparar a ficha de aprovação deste mockup. O mockup está salvo — gere a ficha de novo.',
    );
    // Mas o pedido do mockup NOVO fica de pe.
    expect(setRec).not.toHaveBeenCalled();
    expect(setUrl).not.toHaveBeenCalled();
  });

  it('o mockup continua salvo: a falha da ficha não derruba "Projeto salvo"', () => {
    const { result } = statusHook(generatorState());
    expect(result.current.projectSaveStatus).toBe('done');

    act(() => {
      result.current.handleLayoutFailed('rec-a1');
    });

    expect(result.current.projectSaveStatus).toBe('done');
  });

  // As 4 saídas de falha da captura são travadas por asserção no TEXTO do
  // componente: ele espera 1s em timers e carrega html2canvas por import
  // dinâmico, o que torna um teste de render desproporcional para o que há a
  // provar — que nenhuma delas volta calada.
  it('toda saída de falha da captura chama onFailed, nenhuma volta calada', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/components/mockup/approval/OffscreenLayoutCapture.tsx'),
      'utf-8',
    );

    expect(src).toMatch(/onFailed\?: \(recordId: string, motivo: string\) => void/);

    // trava de loop, upload, gravação do layout_url e catch
    expect(src).toMatch(/loop de captura apos/);
    expect(src).toMatch(/onFailed\?\.\(currentRecordId, `upload:/);
    expect(src).toMatch(/onFailed\?\.\(currentRecordId, `layout_url:/);
    expect(src).toMatch(/err instanceof Error \? err\.message : String\(err\)/);

    // 4 chamadas de onFailed, uma por saída de falha
    expect(src.match(/onFailed\?\./g)?.length).toBe(4);

    // Nenhum `return;` logo depois de um logger.error sem avisar antes
    expect(src).not.toMatch(/logger\.error\('Layout auto-capture upload error:', uploadError\);\s*\n\s*return;/);
    expect(src).not.toMatch(/logger\.error\('Layout auto-capture DB update error:', updateError\);\s*\n\s*return;/);
  });
});
