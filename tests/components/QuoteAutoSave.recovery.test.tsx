/**
 * RESGATE — teste escrito por outro agente de IA que nunca chegou a main.
 *
 * Fonte: origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252
 *        tests/components/QuoteAutoSave.recovery.test.tsx
 *
 * Ficou fora porque a main moveu hooks e paginas para subpastas, entao os imports
 * `@/...` do original nao resolvem mais. Nenhum `.skip`/`.todo` foi usado para
 * fazer este arquivo passar: caso que nao cabe mais no codigo atual foi REMOVIDO,
 * com a evidencia medida registrada abaixo.
 *
 * Blocos `it` na fonte: 17 · neste arquivo: 10
 * Casos em runtime: 39 de 46 (omitidos: 7)
 *
 * DRIFT ADAPTADO:
 * 1) Caminho de módulo: o teste importava `@/pages/quoteDraftRecovery`; esse arquivo
 * não existe em main (`ls src/pages/quoteDraftRecovery.ts` -> No such file). Remapeado
 * para `@/lib/quotes/quoteDraftRecovery` (src/lib/quotes/quoteDraftRecovery.ts:88
 * exporta `quoteDraftRecoverySchema`).
 *
 * 2) DRIFT PRINCIPAL — a feature inteira de "recuperação opcional" (prop `onRestore` +
 * botão "Restaurar rascunho") nunca entrou em main. Em main, `QuoteAutoSaveProps`
 * (src/components/quotes/QuoteAutoSave.tsx:30-40) só tem `quoteId`, `data`,
 * `onChange`, `debounceMs`, `className`, `serverSavedAt` — não há `onRestore`; e o JSX
 * (linhas 303-366) renderiza apenas o indicador dentro do Tooltip, sem nenhum botão.
 * Evidência adicional: `grep -rn "Restaurar rascunho|onRestore" src/` não retorna nada
 * em src/components/quotes/QuoteAutoSave.tsx. Na branch de origem o componente TEM a
 * feature (`git show
 * origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252:src/components/quotes/QuoteAutoSave.tsx`
 * -> linha 51 `onRestore,`, 82 `restoreEnabled`, 403/418 botão "Restaurar rascunho"),
 * ou seja: o outro agente escreveu teste + componente juntos, e só o teste foi
 * resgatado. Como a regra proíbe tocar src/, os casos que dependem do botão foram
 * removidos (não skipados).
 *
 * 3) Adaptação (mantida verde, sem perder cobertura real): o caso "keeps restored
 * partial JSON on the next autosave, retains dirty guard and server-save reset"
 * dependia do clique em "Restaurar rascunho" apenas como gatilho; as asserções
 * (onChange(true) ao sujar, gravação do JSON com campos extras após o debounce,
 * onChange(false) quando `serverSavedAt` muda) são contratos reais de main
 * (QuoteAutoSave.tsx:120-125 e 201-227). Troquei o gatilho por um botão do próprio
 * harness que faz `setData(restored)`; as 3 asserções do outro agente foram
 * preservadas e passam.
 *
 * 4) Props `onRestore` removidas dos demais renders: além de inexistentes em runtime,
 * quebrariam o typecheck (tests/ entra em tsconfig.eslint.json). `npx tsc -p
 * tsconfig.eslint.json --noEmit` e `npx eslint` no arquivo final: zero erro/aviso para
 * este arquivo.
 *
 * 5) Schema `quoteDraftRecoverySchema` não sofreu drift: todos os 17 casos do bloco
 * "legacy quote draft payload validation" (passthrough em root/item/personalization,
 * 15 rejeições de campos conhecidos, snapshot parcial antigo) passam sem edição contra
 * src/lib/quotes/quoteDraftRecovery.ts.
 *
 * OMISSOES, COM EVIDENCIA MEDIDA:
 * Medição base (arquivo original, só com o import remapeado): `Tests 7 failed | 39
 * passed (46)`. Os 7 omitidos são exatamente os que exigem a feature ausente. Em
 * todos, `screen.queryByRole('button', { name: 'Restaurar rascunho' })` retorna null e
 * o erro medido é `Error: Unable to fire a "click" event - please provide a DOM
 * element.`
 *
 * 1) "does not restore automatically, submit the form, or write storage on recovery" —
 * esperava `button()` com `type="button"` e `onRestore` chamado 1x com o payload. Hoje
 * não existe botão algum: QuoteAutoSave.tsx:303-366 renderiza só o indicador; prop
 * `onRestore` não existe em QuoteAutoSave.tsx:30-40. Falha medida na linha 60
 * (fireEvent.click em null).
 *
 * 2) "keeps a rejected snapshot available and displays the real error" — esperava
 * `role="alert"` com a mensagem lançada pelo `onRestore`. Não há callback nem
 * `role="alert"` no componente (único `role` é `status`, QuoteAutoSave.tsx:314). Falha
 * medida na linha 115.
 *
 * 3) "invokes an asynchronous recovery once even with duplicate clicks" — esperava
 * botão desabilitado durante promise pendente (estado `restoring` da branch de origem,
 * inexistente em main). Falha medida na linha 131.
 *
 * 4) "hides an already restored identical snapshot" / "reads each quote independently
 * and does not reuse the previous snapshot" — o segundo esperava leitura por `quoteId`
 * do envelope em localStorage e `onRestore` com `{notes:'Segundo'}`. Main não lê o
 * envelope na montagem (os efeitos de QuoteAutoSave.tsx:72-125 não chamam
 * `localStorage.getItem`; a leitura/validação vive só no hook imperativo
 * `useQuoteAutoSave.loadDraft`, QuoteAutoSave.tsx:390-417, que o componente não usa).
 * Falha medida na linha 186. (O caso "hides an already restored identical snapshot"
 * foi MANTIDO — passa.)
 *
 * 5) "supports StrictMode and keeps recovery local while offline" — esperava clique no
 * botão de restauração sob StrictMode/offline. Falha medida na linha 199.
 *
 * 6) "settles a pending recovery after unmount without starting another action" —
 * esperava promise de restauração pendente sobrevivendo ao unmount. Sem `onRestore`
 * não há promise; além disso o unmount de main com `quoteId` definido apaga as chaves
 * do rascunho (QuoteAutoSave.tsx:79-92), comportamento diferente do assumido. Falha
 * medida na linha 221.
 *
 * 7) "preserves the original helper path as the same public schema" (bloco legacy) —
 * comparava `@/pages/quoteDraftRecovery` com `@/lib/quotes/quoteDraftRecovery`. O
 * caminho duplo não existe: `src/pages/quoteDraftRecovery.ts` não existe em main (só
 * src/lib/quotes/quoteDraftRecovery.ts:88). Após o remapeamento obrigatório os dois
 * imports viram o MESMO módulo e a asserção `toBe` fica tautológica (passaria sem
 * testar nada), então foi removida em vez de mantida como cobertura falsa.
 *
 */
import { useState, type PropsWithChildren } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuoteAutoSave } from '@/components/quotes/QuoteAutoSave';
import { quoteDraftRecoverySchema } from '@/lib/quotes/quoteDraftRecovery';

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: PropsWithChildren) => <>{children}</>,
  TooltipTrigger: ({ children }: PropsWithChildren) => <>{children}</>,
  TooltipContent: () => null,
}));

const current = { notes: 'Atual', items: [] };
const restored = { notes: 'Recuperado', items: [], partialFeature: { enabled: true } };
const draft = (data: unknown = restored, id = 'new') => ({
  id,
  data,
  savedAt: '2026-11-10T00:00:00Z',
  version: 1,
});
const button = () => screen.queryByRole('button', { name: 'Restaurar rascunho' });
function store(value: unknown, key = 'quote_draft_new') {
  localStorage.setItem(key, JSON.stringify(value));
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-10T12:00:00Z'));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('QuoteAutoSave optional recovery preserves existing contracts', () => {
  it('keeps the original indicator and no restore control without a callback', () => {
    store(draft());
    render(<QuoteAutoSave data={current} />);
    expect(button()).not.toBeInTheDocument();
    expect(screen.getByTestId('quote-autosave-indicator')).toHaveAttribute('data-status', 'idle');
    expect(screen.getByTestId('quote-autosave-text')).toBeEmptyDOMElement();
  });

  const invalidEnvelopes: Array<[string, unknown]> = [
    ['null envelope', null],
    ['array envelope', []],
    ['primitive envelope', 'x'],
    ['wrong quote id', draft(restored, 'other')],
    ['missing data', { ...draft(), data: undefined }],
    ['null data', draft(null)],
    ['array data', draft([])],
    ['primitive data', draft(5)],
    ['missing timestamp', { ...draft(), savedAt: undefined }],
    ['invalid timestamp', { ...draft(), savedAt: 'invalid' }],
    ['missing version', { ...draft(), version: undefined }],
    ['zero version', { ...draft(), version: 0 }],
    ['negative version', { ...draft(), version: -1 }],
    ['fractional version', { ...draft(), version: 1.5 }],
    ['unsafe version', { ...draft(), version: Number.MAX_SAFE_INTEGER + 1 }],
  ];
  it.each(invalidEnvelopes)('keeps %s untouched and offers no recovery', (_, envelope) => {
    store(envelope);
    const raw = localStorage.getItem('quote_draft_new');
    render(<QuoteAutoSave data={current} />);
    expect(button()).not.toBeInTheDocument();
    expect(localStorage.getItem('quote_draft_new')).toBe(raw);
  });

  it.each(['absent', 'corrupt'] as const)(
    'handles %s storage without destructive recovery',
    (mode) => {
      if (mode === 'corrupt') localStorage.setItem('quote_draft_new', '{');
      render(<QuoteAutoSave data={current} />);
      expect(button()).not.toBeInTheDocument();
      expect(localStorage.getItem('quote_draft_new')).toBe(mode === 'corrupt' ? '{' : null);
    },
  );

  it('hides an already restored identical snapshot', () => {
    store(draft(current));
    render(<QuoteAutoSave data={current} />);
    expect(button()).not.toBeInTheDocument();
  });

  it('keeps restored partial JSON on the next autosave, retains dirty guard and server-save reset', async () => {
    const dirty = vi.fn();
    function Harness({ serverSavedAt }: { serverSavedAt?: number }) {
      const [data, setData] = useState<unknown>(current);
      return (
        <>
          <button type="button" onClick={() => setData(restored)}>
            Aplicar rascunho
          </button>
          <QuoteAutoSave
            data={data}
            debounceMs={100}
            onChange={dirty}
            serverSavedAt={serverSavedAt}
          />
        </>
      );
    }
    const view = render(<Harness />);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Aplicar rascunho' })));
    expect(dirty).toHaveBeenLastCalledWith(true);
    act(() => vi.advanceTimersByTime(100));
    expect(JSON.parse(localStorage.getItem('quote_draft_new')!).data).toEqual(restored);
    view.rerender(<Harness serverSavedAt={Date.now()} />);
    expect(dirty).toHaveBeenLastCalledWith(false);
  });

  it('preserves debounce and the five-version bound', () => {
    for (let version = 1; version <= 7; version++)
      store({ ...draft(), version }, `quote_draft_new_v${version}`);
    const view = render(<QuoteAutoSave data={current} debounceMs={100} />);
    view.rerender(<QuoteAutoSave data={restored} debounceMs={100} />);
    act(() => vi.advanceTimersByTime(99));
    expect(localStorage.getItem('quote_draft_new')).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    const versions = Object.keys(localStorage).filter((key) => key.startsWith('quote_draft_new_v'));
    expect(versions).toHaveLength(5);
    expect(localStorage.getItem('quote_draft_new')).not.toBeNull();
  });

  it('handles inaccessible storage without crashing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<QuoteAutoSave data={current} />);
    expect(button()).not.toBeInTheDocument();
  });
});

describe('legacy quote draft payload validation', () => {
  const item = { product_id: 'p1', product_name: 'Produto', quantity: 4, unit_price: 7 };
  it('keeps extra JSON fields at root, item, and personalization boundaries', () => {
    const data = {
      ...restored,
      items: [
        {
          ...item,
          partialItem: true,
          personalizations: [{ technique_id: 't1', partialTechnique: { price: 3 } }],
        },
      ],
    };
    expect(quoteDraftRecoverySchema.parse(data)).toEqual(data);
  });
  it.each([
    { items: 'not-an-array' },
    { items: [{ ...item, quantity: '4' }] },
    { items: [{ ...item, unit_price: Infinity }] },
    { items: [{ ...item, product_id: undefined }] },
    { items: [{ ...item, personalizations: [{ technique_id: 1 }] }] },
    { discountType: 'invented' },
    { discountValue: '7' },
    { notes: 42 },
    { validUntil: 'not-a-date' },
    { validUntil: '2026-02-31' },
    { deliveryTime: 'date:2026-02-31' },
    { deliveryDate: 'bad-date' },
    { companyInfo: { id: 'c1', name: 42 } },
    { contactInfo: { id: 42, name: 'Contato' } },
    { negotiationMarkup: '10' },
  ])('rejects invalid known fields before changing live quote state: %j', (value) => {
    expect(quoteDraftRecoverySchema.safeParse(value).success).toBe(false);
  });
  it('supports older partial snapshots without requiring newly introduced fields', () => {
    expect(quoteDraftRecoverySchema.parse({ items: [item], notes: null })).toEqual({
      items: [item],
      notes: null,
    });
  });
});
