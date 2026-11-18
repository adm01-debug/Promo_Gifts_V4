/**
 * RESGATE DE TESTE — useAutoSaveQuote (restauração de rascunho)
 *
 * Branch de origem: origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252
 * Caminho original: src/hooks/__tests__/useAutoSaveQuote.legacy.test.ts (mesmo caminho)
 *
 * DRIFT ADAPTADO
 *   - O hook saiu de `src/hooks/useAutoSaveQuote.ts` para
 *     `src/hooks/quotes/useAutoSaveQuote.ts`. O import relativo `../useAutoSaveQuote`
 *     virou o alias `@/hooks/quotes/useAutoSaveQuote`.
 *   - `logger` mockado: o hook passou a importar `@/lib/logger` e `sonner`
 *     (useAutoSaveQuote.ts:2-3), que não existiam na versão da branch de origem.
 *
 * OMISSÕES (casos removidos — contrato deliberadamente diferente hoje)
 *   1. "still restores a different draft when the storage key changes"
 *      O guard `hasRestoredRef` restaura UMA vez por instância do hook e não é
 *      resetado quando `key` muda (useAutoSaveQuote.ts:95 e 105-106). O guard é
 *      invariante declarada em src/hooks/quotes/__tests__/useAutoSaveQuote.test.ts:116
 *      ("guard: restaura apenas uma vez mesmo após re-renders"). Não é defeito de
 *      produção: o único call site não passa `key` — usa o default
 *      `quote_builder_autosave` (useQuoteBuilderState.ts:255-257), logo troca de
 *      chave em runtime é inalcançável.
 *   2. "restores when a callback is attached after mount"
 *      Mesmo guard: o efeito marca `hasRestoredRef` antes de checar `onRestore`
 *      (useAutoSaveQuote.ts:105-114), então anexar o callback depois do mount não
 *      dispara restauração. Em produção `onRestore` é sempre uma função definida
 *      no call site (useQuoteBuilderState.ts:276), nunca `undefined`.
 *   3. it.each "preserves the generic legacy unversioned payload %j" (3 casos:
 *      1, 'legacy value', true)
 *      `migratePayload` rejeita não-objeto por contrato:
 *      `if (!payload || typeof payload !== 'object') return null`
 *      (useAutoSaveQuote.ts:30), invariante fixada em
 *      src/hooks/quotes/__tests__/useAutoSaveQuote.test.ts:81-84
 *      ("retorna null para não-objeto"). Payload legado só migra como objeto.
 *
 * DEFEITO DE PRODUÇÃO: nenhum encontrado. Nenhum arquivo de src/ foi alterado.
 */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutoSaveQuote } from '@/hooks/quotes/useAutoSaveQuote';

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn(), log: vi.fn(), info: vi.fn() },
}));

const saved = (value: number) =>
  JSON.stringify({ version: 2, data: { value }, savedAt: '2026-01-01T00:00:00.000Z' });

describe('legacy autosave keeps draft restoration semantics without overwriting edits', () => {
  beforeEach(() => localStorage.clear());

  it('does not restore an old draft again just because its callback identity changes', () => {
    localStorage.setItem('draft-a', saved(1));
    const first = vi.fn<(data: { value: number }) => void>();
    const next = vi.fn<(data: { value: number }) => void>();
    const { rerender } = renderHook(
      ({ restore }) =>
        useAutoSaveQuote({
          enabled: true,
          data: { value: 99 },
          onRestore: restore,
          key: 'draft-a',
        }),
      { initialProps: { restore: first } },
    );
    expect(first).toHaveBeenCalledWith({ value: 1 });
    rerender({ restore: next });
    expect(next).not.toHaveBeenCalled();
  });

  it('keeps the enabled flag as an explicit restoration trigger', () => {
    localStorage.setItem('draft-a', saved(1));
    const restore = vi.fn<(data: { value: number }) => void>();
    const { rerender } = renderHook(
      ({ enabled }) =>
        useAutoSaveQuote({ enabled, data: { value: 99 }, onRestore: restore, key: 'draft-a' }),
      { initialProps: { enabled: false } },
    );
    expect(restore).not.toHaveBeenCalled();
    rerender({ enabled: true });
    expect(restore).toHaveBeenCalledWith({ value: 1 });
  });
});
