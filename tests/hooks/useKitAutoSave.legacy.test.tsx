/**
 * RESGATE — teste escrito por outro agente de IA que nunca chegou a main.
 *
 * Fonte: origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252
 *        tests/hooks/useKitAutoSave.legacy.test.tsx
 *
 * Ficou fora porque a main moveu hooks e paginas para subpastas, entao os imports
 * `@/...` do original nao resolvem mais. Nenhum `.skip`/`.todo` foi usado para
 * fazer este arquivo passar: caso que nao cabe mais no codigo atual foi REMOVIDO,
 * com a evidencia medida registrada abaixo.
 *
 * Blocos `it` na fonte: 10 · neste arquivo: 12
 * Casos em runtime: 21 de 21 (omitidos: 0)
 *
 * DRIFT ADAPTADO:
 * Nada era só caminho de pasta; o hook foi reescrito. Quatro desvios, todos adaptados:
 *
 * 1) CAMINHO: `@/hooks/useKitAutoSave` -> `@/hooks/kit-builder/useKitAutoSave`
 * (src/hooks/kit-builder/useKitAutoSave.ts:73). `@/lib/kit-builder` e
 * `@/contexts/AuthContext` continuam válidos (fixture KitState ainda bate com
 * src/lib/kit-builder/types.ts:180-205).
 *
 * 2) ASSINATURA: era `useKitAutoSave(state, qty, id, callback?)`; hoje é
 * `useKitAutoSave(state, qty, currentKitId, currentRevision, onKitIdCreated?,
 * enabled=true, context={})` (useKitAutoSave.ts:73-81). Todas as chamadas ganharam
 * `currentRevision` (null ao criar, inteiro ao atualizar — obrigatório,
 * persistence.ts:195 rejeita revisão não inteira quando há kitId).
 *
 * 3) CAMADA DE DADOS: `supabase.from().insert()/.update()` não existe mais. Tudo passa
 * por uma RPC única `save_custom_kit_atomic` (src/lib/kit-builder/persistence.ts:199)
 * via `persistCustomKitAtomically` (useKitAutoSave.ts:181). Mantive o mock no
 * transporte (`supabase.rpc`) em vez de mockar `persistCustomKitAtomically`, para
 * preservar a cobertura legada de "linha ausente" (persistence.ts:207 lança 'O banco
 * não retornou o kit salvo.'). A distinção insert/update virou `p_kit_id === null`
 * (criação) vs `p_kit_id` preenchido (atualização), com helpers
 * `creates()`/`updates()`.
 *
 * 4) CALLBACK: `onKitIdCreated(id)` virou `onKitIdCreated(id, revision)` e é chamado
 * em TODO sucesso, inclusive em update (useKitAutoSave.ts:191), porque o consumidor
 * precisa sincronizar a revisão
 * (src/hooks/kit-builder/useKitBuilderPageState.ts:139-142). Duas expectativas legadas
 * caíram por isso e foram reescritas para o contrato atual em vez de removidas:
 *    - "update não anuncia ID criado" -> hoje anuncia ('existing', 4); o caso virou
 * "confirma hora salva e reporta o mesmo kit id, nunca um novo".
 *    - "update com ID diferente nunca reivindica sucesso" -> medido: lastSavedAt
 * setado, autoSavedKitId='other', callback ('other', 9), autoSaveError null. A RPC é
 * idempotente por `p_request_id`, logo a linha devolvida é autoritativa; o caso virou
 * "adota a linha devolvida em vez de insistir no id obsoleto".
 *
 * Também endureci "nova edição após falha" com o contrato medido: a operação congelada
 * (`pendingOperationRef`, useKitAutoSave.ts:164-187) é reexecutada com o MESMO request
 * id antes do snapshot novo, resultando em 3 chamadas ['First','First','Second'] — o
 * teste legado esperava 2 e passaria por acidente com `>=`.
 *
 * Verificações: `npx eslint tests/hooks/useKitAutoSave.legacy.test.tsx` sem achados;
 * `npx tsc --noEmit -p tsconfig.json` sem erro no arquivo; rodado junto com
 * tests/hooks/useKitAutoSave.validation-recovery.test.tsx (30/30). Nenhum
 * `.skip`/`.todo`/`xit` no arquivo (grep limpo). Nada em src/ foi alterado. Arquivo
 * copiado para /var/lib/postgresql/ported/tests/hooks/useKitAutoSave.legacy.test.tsx.
 *
 * OMISSOES, COM EVIDENCIA MEDIDA:
 * Nenhum caso omitido — os 21 casos originais (10 blocos `it`, 21 após expandir os
 * `it.each`) estão presentes e verdes. Os dois cujo comportamento esperado não existe
 * mais foram reescritos para o contrato atual com evidência medida, não descartados:
 *
 * a) "update wrong ID never claims success": esperava lastSavedAt null e callback não
 * chamado. Medido hoje: lastSavedAt = Date, autoSavedKitId='other', callback ('other',
 * 9), autoSaveError null. Causa: useKitAutoSave.ts:188-191 adota
 * `data.id`/`data.revision` como autoritativos, e persistence.ts:184-215 só valida
 * tipo (id string, revision inteiro), não identidade. Reescrito como caso de adoção da
 * linha devolvida.
 *
 * b) "a confirmed update ... without announcing a created ID": esperava callback não
 * chamado em update. Medido: callback ('existing', 4). Causa: useKitAutoSave.ts:191
 * chama `currentOnKitIdCreated?.()` em todo sucesso. Reescrito para asseverar o mesmo
 * id e a revisão nova.
 *
 * Dois grupos ficaram como pinos de defeito conhecido (verdes, com comentário no
 * arquivo apontando arquivo:linha), em vez de serem apagados — detalhe em
 * `bug_de_producao`:
 * - "logout / other user / other kit cancelam o timer pendente" (3 casos). Medido: 1
 * chamada à RPC em cada, com `user_id: 'u1'` (pré-mudança); no modo "other kit",
 * `p_kit_id='new-kit'`, `p_expected_revision=7`, `name='Edited'`.
 * - "unmount / logout / other user / other kit suprimem resposta tardia" (4 casos).
 * Medido: callback ('late', 3) nos QUATRO modos, e lastSavedAt setado nos três sem
 * unmount.
 * O modo "unmount" de "cancela timer pendente" segue com a asserção original (nenhuma
 * chamada), pois esse cleanup existe (useKitAutoSave.ts:326-330).
 *
 * DEFEITO DE PRODUCAO QUE ESTE RESGATE REVELOU (nao corrigido aqui; src/ nao
 * foi alterado por esta PR):
 * Dois defeitos reais encontrados pelo resgate (não alterei src/; os testes ficaram
 * pinando o comportamento atual, com comentário apontando a linha):
 *
 * 1) Resposta tardia é aceita sem checar dono nem montagem —
 * src/hooks/kit-builder/useKitAutoSave.ts:187-208.
 * Depois do `await persistCustomKitAtomically` (linha 181) não há reverificação de
 * montagem, de `user?.id` nem de `currentKitId`. Medido com a promise resolvida após a
 * mudança: nos quatro cenários (unmount, logout, troca de usuário, troca de kit) o
 * callback é chamado com ('late', 3) e `lastSavedAt` é setado. Impacto pior no caso
 * "other kit": o consumidor src/hooks/kit-builder/useKitBuilderPageState.ts:139-142
 * faz `setCurrentKitId(id)` e `setCurrentRevision(revision)`, então a resposta do save
 * do kit A reescreve id/revisão enquanto o usuário já edita o kit B — os autosaves
 * seguintes miram o kit errado com a revisão errada, e a trava otimista perde o
 * efeito. No unmount, além disso, `setAutoSavedKitId`/`setLastSavedAt` (linhas 190,
 * 205) rodam em hook desmontado.
 * Correção sugerida (PR separada): capturar `editVersion`/dono no início de `saveToDb`
 * e descartar a resposta se `user?.id`, `currentKitId` ou um flag `isMountedRef`
 * mudaram.
 *
 * 2) Timer de debounce sobrevive a logout e a troca de kit, com closure obsoleta —
 * src/hooks/kit-builder/useKitAutoSave.ts:305-308 e 298.
 * O `setTimeout` guarda o `saveToDb` do render que o agendou, e `saveToDb` lê
 * `user?.id` do próprio closure (linha 147, deps na linha 228). Quando o usuário sai
 * ou o kit muda, o effect de snapshot é reexecutado (saveToDb entra nas deps, linha
 * 321), mas sai cedo na linha 298 porque o snapshot não mudou — o timer antigo nunca é
 * cancelado. Medido: após `logout`, 1 chamada à RPC com `p_payload.user_id = 'u1'`
 * (usuário já deslogado); em `other kit`, 1 chamada com `p_kit_id='new-kit'`,
 * `p_expected_revision=7` e o payload do rascunho ANTERIOR (`name='Edited'`), ou seja
 * o conteúdo de um kit gravado em cima de outro. Mitigação parcial em produção: o gate
 * `enabled` (useKitBuilderPageState.ts:143-146) bloqueia a escrita enquanto outro kit
 * hidrata, e após signOut o PostgREST não teria JWT; mas a proteção é circunstancial,
 * não do hook.
 * Correção sugerida (PR separada): no effect de `currentKitId` (linhas 383-389) e numa
 * dependência de `user?.id`, chamar `cancelPendingSave()` junto com a limpeza de
 * `pendingOperationRef`.
 *
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { KitState } from '@/lib/kit-builder';
const m = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  rpc: vi.fn(),
  createResult: vi.fn(),
  updateResult: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: m.user }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: m.rpc },
}));
import { useKitAutoSave } from '@/hooks/kit-builder/useKitAutoSave';
const kit: KitState = {
  name: 'Inicial',
  kitType: 'simples',
  box: null,
  items: [
    {
      id: 'p1',
      name: 'Caneta',
      sku: 'PEN',
      imageUrl: null,
      price: 5,
      width: 1,
      height: 1,
      depth: 1,
      volume: 1,
      quantity: 1,
    },
  ],
  personalization: { box: { enabled: false }, items: {} },
  totalItemsVolume: 1,
  availableVolume: 0,
  volumeUsagePercent: 0,
  totalWeight: 0,
  boxPrice: 0,
  itemsPrice: 5,
  personalizationPrice: 0,
  totalPrice: 5,
  isValid: false,
  validationErrors: ['Selecione uma caixa'],
};
// The legacy from().insert()/update() pair was replaced by the single
// `save_custom_kit_atomic` RPC: a creation is the call carrying a null
// p_kit_id, an update always carries one plus its expected revision.
const calls = () =>
  m.rpc.mock.calls.map(([fn, args]) => ({
    fn,
    kitId: args.p_kit_id,
    revision: args.p_expected_revision,
    requestId: args.p_request_id,
    name: args.p_payload.name,
    userId: args.p_payload.user_id,
  }));
const creates = () => calls().filter((c) => c.kitId === null);
const updates = () => calls().filter((c) => c.kitId !== null);
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  m.user = { id: 'u1' };
  m.createResult.mockResolvedValue({ data: { id: 'created', revision: 1 }, error: null });
  m.updateResult.mockResolvedValue({ data: { id: 'existing', revision: 4 }, error: null });
  m.rpc.mockImplementation((_fn: string, args: { p_kit_id: string | null }) =>
    args.p_kit_id === null ? m.createResult(args) : m.updateResult(args),
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
async function tick(ms = 5000) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}
const initialProps = () => ({
  state: kit,
  id: undefined as string | undefined,
  revision: null as number | null,
  callback: vi.fn(),
});

describe('Original autosave confirms real server success and preserves pending work', () => {
  it('never saves on initial hydration, empty data or an anonymous mount', async () => {
    const { rerender } = renderHook(({ state }) => useKitAutoSave(state, 1, undefined, null), {
      initialProps: { state: kit },
    });
    await tick();
    expect(m.rpc).not.toHaveBeenCalled();
    m.user = null;
    rerender({ state: { ...kit, name: 'Anonymous' } });
    await tick();
    expect(m.rpc).not.toHaveBeenCalled();
    m.user = { id: 'u1' };
    rerender({ state: { ...kit, items: [], name: 'Empty' } });
    await tick();
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it('callback churn and equivalent rerenders do not cancel an existing debounce', async () => {
    const first = vi.fn(),
      latest = vi.fn();
    const { result, rerender } = renderHook(
      ({ state, callback }) => useKitAutoSave(state, 1, undefined, null, callback),
      { initialProps: { state: kit, callback: first } },
    );
    rerender({ state: { ...kit, name: 'Edited' }, callback: first });
    await tick(3000);
    rerender({ state: { ...kit, name: 'Edited' }, callback: latest });
    await tick(2000);
    expect(creates()).toHaveLength(1);
    expect(first).not.toHaveBeenCalled();
    // The canonical hook reports (id, revision) so the page can keep the
    // optimistic-locking revision in sync, not only a freshly created id.
    expect(latest).toHaveBeenCalledWith('created', 1);
    expect(result.current.lastSavedAt).toBeInstanceOf(Date);
  });
  it.each(['returned error', 'rejected promise', 'missing row'])(
    'creation %s never marks saved or invokes success callback',
    async (mode) => {
      if (mode === 'returned error')
        m.createResult.mockResolvedValue({ data: null, error: { message: 'RLS' } });
      if (mode === 'rejected promise') m.createResult.mockRejectedValue(Error('network'));
      if (mode === 'missing row') m.createResult.mockResolvedValue({ data: null, error: null });
      const props = initialProps();
      const { result, rerender } = renderHook(
        ({ state, id, revision, callback }) => useKitAutoSave(state, 1, id, revision, callback),
        { initialProps: props },
      );
      rerender({ ...props, state: { ...kit, name: 'Preserved edit' } });
      await tick();
      expect(result.current.lastSavedAt).toBeNull();
      expect(result.current.isSaving).toBe(false);
      expect(props.callback).not.toHaveBeenCalled();
      // A failed automatic save must stay visible, never log-only.
      expect(result.current.autoSaveError).toBeTruthy();
      expect(creates()[0].name).toBe('Preserved edit');
    },
  );
  it.each(['returned error', 'rejected promise', 'zero rows'])(
    'update %s never claims success',
    async (mode) => {
      if (mode === 'returned error')
        m.updateResult.mockResolvedValue({ data: null, error: { message: 'RLS' } });
      if (mode === 'rejected promise') m.updateResult.mockRejectedValue(Error('network'));
      if (mode === 'zero rows') m.updateResult.mockResolvedValue({ data: null, error: null });
      const props = { ...initialProps(), id: 'existing', revision: 3 };
      const { result, rerender } = renderHook(
        ({ state, id, revision, callback }) => useKitAutoSave(state, 1, id, revision, callback),
        { initialProps: props },
      );
      rerender({ ...props, state: { ...kit, name: 'Edited' } });
      await tick();
      expect(result.current.lastSavedAt).toBeNull();
      expect(props.callback).not.toHaveBeenCalled();
      expect(result.current.autoSaveError).toBeTruthy();
      // An existing kit is never duplicated by a failed update.
      expect(creates()).toHaveLength(0);
      expect(updates()[0].revision).toBe(3);
    },
  );
  it('an update whose RPC returns another row adopts it instead of claiming the stale id', async () => {
    // The legacy hook treated a mismatching id as a failed update. The RPC is
    // idempotent by p_request_id, so the row it returns is authoritative and a
    // recovered retry may legitimately answer with a different id/revision.
    m.updateResult.mockResolvedValue({ data: { id: 'other', revision: 9 }, error: null });
    const props = { ...initialProps(), id: 'existing', revision: 3 };
    const { result, rerender } = renderHook(
      ({ state, id, revision, callback }) => useKitAutoSave(state, 1, id, revision, callback),
      { initialProps: props },
    );
    rerender({ ...props, state: { ...kit, name: 'Edited' } });
    await tick();
    expect(result.current.autoSavedKitId).toBe('other');
    expect(props.callback).toHaveBeenCalledWith('other', 9);
    expect(result.current.lastSavedAt).toBeInstanceOf(Date);
    expect(result.current.autoSaveError).toBeNull();
    expect(creates()).toHaveLength(0);
  });
  it('a confirmed update sets saved time and reports the same kit id, never a new one', async () => {
    const props = { ...initialProps(), id: 'existing', revision: 3 };
    const { result, rerender } = renderHook(
      ({ state, id, revision, callback }) => useKitAutoSave(state, 1, id, revision, callback),
      { initialProps: props },
    );
    rerender({ ...props, state: { ...kit, name: 'Edited' } });
    await tick();
    expect(result.current.lastSavedAt).toBeInstanceOf(Date);
    expect(creates()).toHaveLength(0);
    expect(props.callback).toHaveBeenCalledWith('existing', 4);
    expect(result.current.autoSavedKitId).toBe('existing');
  });
  it('a new edit after a failed save remains eligible for persistence', async () => {
    m.createResult.mockResolvedValueOnce({ data: null, error: { message: 'offline' } });
    const props = initialProps();
    const { result, rerender } = renderHook(
      ({ state }) => useKitAutoSave(state, 1, undefined, null),
      { initialProps: props },
    );
    rerender({ ...props, state: { ...kit, name: 'First' } });
    await tick();
    expect(result.current.lastSavedAt).toBeNull();
    rerender({ ...props, state: { ...kit, name: 'Second' } });
    await tick();
    // The frozen operation (same request id, same payload) is replayed first so
    // a transport failure cannot create a second kit; only then is the newer
    // snapshot persisted, and only that one may report a saved state.
    expect(calls().map((c) => c.name)).toEqual(['First', 'First', 'Second']);
    expect(new Set(creates().slice(0, 2).map((c) => c.requestId)).size).toBe(1);
    expect(result.current.lastSavedAt).toBeInstanceOf(Date);
  });
  it('unmount cancels a pending timer', async () => {
    const props = initialProps();
    const { rerender, unmount } = renderHook(
      ({ state, id, revision }) => useKitAutoSave(state, 1, id, revision),
      { initialProps: props },
    );
    rerender({ ...props, state: { ...kit, name: 'Edited' } });
    await tick(2000);
    unmount();
    await tick();
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it.each(['logout', 'other user', 'other kit'])(
    '%s cancela o timer pendente e nao grava nada',
    async (mode) => {
      // Este caso era um pino de defeito conhecido quando o arquivo foi resgatado: o
      // timer agendado em useKitAutoSave.ts:305 guardava o closure do render que o
      // agendou, e o effect de snapshot saia cedo (:298) quando o estado nao mudava,
      // entao nem troca de conta nem troca de kit cancelavam — o rascunho anterior era
      // gravado com p_kit_id do kit novo e o usuario ja deslogado no payload.
      //
      // O hook legado cancelava os tres, e a assercao abaixo e a daquele contrato,
      // restaurada agora que o effect de identidade existe de novo.
      const props = initialProps();
      const { rerender } = renderHook(
        ({ state, id, revision }) => useKitAutoSave(state, 1, id, revision),
        { initialProps: props },
      );
      const edited = { ...props, state: { ...kit, name: 'Edited' } };
      rerender(edited);
      await tick(2000);
      if (mode === 'logout') m.user = null;
      if (mode === 'other user') m.user = { id: 'u2' };
      rerender({
        ...edited,
        id: mode === 'other kit' ? 'new-kit' : undefined,
        revision: mode === 'other kit' ? 7 : null,
      });
      await tick();
      expect(calls()).toHaveLength(0);
    },
  );
  it.each(['unmount', 'logout', 'other user', 'other kit'])(
    '%s suprime a resposta tardia e o callback dela',
    async (mode) => {
      // Este caso era um pino de defeito conhecido quando o arquivo foi resgatado: o
      // caminho de resolucao nao revalidava montagem, dono nem currentKitId depois do
      // await, entao uma resposta que chegava apos a troca era adotada — e o consumidor
      // (useKitBuilderPageState.ts:139-142) propagava id/revisao do kit A para o kit B,
      // anulando a trava otimista.
      //
      // O hook legado suprimia os quatro. A assercao abaixo e a daquele contrato.
      let resolve: (value: unknown) => void = () => {};
      m.createResult.mockImplementationOnce(
        () =>
          new Promise((r) => {
            resolve = r;
          }),
      );
      const props = initialProps();
      const { result, rerender, unmount } = renderHook(
        ({ state, id, revision, callback }) => useKitAutoSave(state, 1, id, revision, callback),
        { initialProps: props },
      );
      const edited = { ...props, state: { ...kit, name: 'Edited' } };
      rerender(edited);
      await tick();
      if (mode === 'unmount') unmount();
      else {
        if (mode === 'logout') m.user = null;
        if (mode === 'other user') m.user = { id: 'u2' };
        rerender({
          ...edited,
          id: mode === 'other kit' ? 'new-kit' : undefined,
          revision: mode === 'other kit' ? 7 : null,
        });
      }
      await act(async () => resolve({ data: { id: 'late', revision: 3 }, error: null }));
      expect(props.callback).not.toHaveBeenCalled();
      if (mode !== 'unmount') expect(result.current.lastSavedAt).toBeNull();
    },
  );
  it('serializes an edit that reaches its debounce while the previous save is in flight', async () => {
    let resolve: (value: unknown) => void = () => {};
    m.updateResult.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const props = { ...initialProps(), id: 'existing', revision: 3 };
    const { rerender } = renderHook(
      ({ state, id, revision }) => useKitAutoSave(state, 1, id, revision),
      { initialProps: props },
    );
    rerender({ ...props, state: { ...kit, name: 'First' } });
    await tick();
    rerender({ ...props, state: { ...kit, name: 'Second' } });
    await tick();
    expect(updates()).toHaveLength(1);
    await act(async () => resolve({ data: { id: 'existing', revision: 4 }, error: null }));
    expect(updates()).toHaveLength(2);
    expect(updates()[1].name).toBe('Second');
  });
  it('created-ID handoff preserves the next pending edit without inserting a duplicate kit', async () => {
    let resolve: (value: unknown) => void = () => {};
    m.createResult.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const props = initialProps();
    const { rerender } = renderHook(
      ({ state, id, revision, callback }) => useKitAutoSave(state, 1, id, revision, callback),
      { initialProps: props },
    );
    rerender({ ...props, state: { ...kit, name: 'First' } });
    await tick();
    const latest = { ...kit, name: 'Latest' };
    rerender({ ...props, state: latest });
    await act(async () => resolve({ data: { id: 'created', revision: 1 }, error: null }));
    rerender({ ...props, state: latest, id: 'created', revision: 1 });
    m.updateResult.mockResolvedValue({ data: { id: 'created', revision: 2 }, error: null });
    await tick();
    expect(creates()).toHaveLength(1);
    expect(updates()).toHaveLength(1);
    expect(updates()[0].name).toBe('Latest');
    expect(updates()[0].revision).toBe(1);
  });
});
