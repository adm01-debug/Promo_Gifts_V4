/**
 * Testes de corrida (race) — useMockupDraft
 *
 * B F-10: clearDraft cancelava o timer do debounce, mas NÃO considerava um
 * saveToBackend que já estava em voo. A gravação resolvia DEPOIS do delete e
 * recriava a linha em mockup_drafts — o rascunho reaparecia depois de limpar.
 *
 * Cobre:
 *   - clearDraft durante uma gravação em voo: nada é persistido nem restaurado
 *   - clearDraft antes do debounce disparar: nenhum save é enviado
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockupDraftData } from '../useMockupDraft';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-test-001' } }),
}));

const { mockUpsert, mockSelect, mockDelete, mockMaybeSingle, mockFrom } = vi.hoisted(() => {
  const _mockMaybeSingle = vi.fn();
  const _mockSelect = vi.fn(() => ({
    eq: vi.fn().mockReturnThis(),
    maybeSingle: _mockMaybeSingle,
  }));
  const _mockUpsert = vi.fn();
  const _mockDelete = vi.fn();
  const _mockFrom = vi.fn((table: string) => {
    if (table === 'mockup_drafts') {
      return { select: _mockSelect, upsert: _mockUpsert, delete: _mockDelete };
    }
    return {};
  });
  return {
    mockUpsert: _mockUpsert,
    mockSelect: _mockSelect,
    mockDelete: _mockDelete,
    mockMaybeSingle: _mockMaybeSingle,
    mockFrom: _mockFrom,
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}));

// ── Fake backend ──────────────────────────────────────────────────────────────
// Modela a linha de `mockup_drafts`: o upsert só "grava" quando o deferred do
// teste é resolvido; o delete grava a remoção no momento em que a cadeia é
// executada. Assim o estado final de `backendRow` revela a ORDEM real das
// escritas — exatamente o que a corrida B F-10 decide.
let backendRow: Record<string, unknown> | null = null;

// ── Helpers ───────────────────────────────────────────────────────────────────

const T = '2026-06-01T10:00:00.000Z';

function makeDraft(updatedAt = T): MockupDraftData {
  return {
    productId: 'prod-1',
    productName: 'Caneca',
    techniqueId: 'tec-1',
    techniqueName: 'Serigrafia',
    clientId: 'cli-1',
    clientName: 'João',
    personalizationAreas: [
      {
        id: 'area-1',
        name: 'Frente',
        positionX: 50,
        positionY: 50,
        logoWidth: 10,
        logoHeight: 5,
        logoPreview: null,
      },
    ],
    updatedAt,
  };
}

function localKey(userId = 'user-test-001', draftKey = 'default') {
  return `mockup_draft_v1_${userId}_${draftKey}`;
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

// Node >= 22.4 expõe um `localStorage` experimental no globalThis que fica
// `undefined` sem `--localstorage-file` — e, como o global já existe, o Vitest
// não instala o localStorage do jsdom por cima. Sem este stub o teste (e o hook)
// quebra com "Cannot read properties of undefined" em qualquer runtime Node
// moderno. Storage em memória: o teste passa a depender só do contrato, não do
// runtime. O hook usa exatamente este mesmo global.
function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    removeItem: (k: string) => {
      store.delete(k);
    },
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
  } as Storage;
}

const memoryStorage = createMemoryStorage();

let resolveUpsert: ((value: { error: null }) => void) | undefined;

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: memoryStorage,
    configurable: true,
    writable: true,
  });
  memoryStorage.clear();
  vi.useFakeTimers();
  localStorage.clear();
  backendRow = null;
  resolveUpsert = undefined;
  mockFrom.mockClear();
  mockUpsert.mockClear();
  mockSelect.mockClear();
  mockDelete.mockClear();
  mockMaybeSingle.mockClear();

  // upsert em voo: grava em backendRow apenas quando o teste resolver.
  mockUpsert.mockImplementation(
    (payload: Record<string, unknown>) =>
      new Promise<{ error: null }>((resolve) => {
        resolveUpsert = (value) => {
          backendRow = { ...payload };
          resolve(value);
        };
      }),
  );

  // delete: remove a linha no momento em que a cadeia .eq().eq() roda.
  mockDelete.mockImplementation(() => ({
    eq: () => ({
      eq: () => {
        backendRow = null;
        return Promise.resolve({ error: null });
      },
    }),
  }));

  // leitura: devolve o estado atual do backend fake.
  mockMaybeSingle.mockImplementation(() => Promise.resolve({ data: backendRow, error: null }));
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

// ── B F-10 ────────────────────────────────────────────────────────────────────
describe('clearDraft vs gravação em voo (B F-10)', () => {
  it('não deixa rascunho persistido nem restaurado quando o save resolve depois', async () => {
    const { useMockupDraft } = await import('../useMockupDraft');
    const { result } = renderHook(() => useMockupDraft());

    // 1. iniciar gravação: agenda e deixa o upsert em voo.
    act(() => {
      result.current.saveDraft(makeDraft());
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(mockUpsert).toHaveBeenCalledTimes(1);

    // 2. limpar rascunho enquanto a gravação está em voo (ainda sem aguardar).
    let clearPromise: Promise<void>;
    await act(async () => {
      clearPromise = result.current.clearDraft();
    });

    // Enquanto a gravação está em voo, o delete do backend NÃO pode ter rodado:
    // se rodasse agora, o upsert resolveria depois e recriaria a linha.
    expect(mockDelete).not.toHaveBeenCalled();

    // 3. deixar a gravação terminar e só então concluir o clear.
    await act(async () => {
      resolveUpsert?.({ error: null });
      await clearPromise;
    });

    // Nada persistido no backend (delete foi a última escrita) nem no localStorage.
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(backendRow).toBeNull();
    expect(localStorage.getItem(localKey())).toBeNull();

    // Nem restaurado: um load posterior não reencontra o rascunho.
    let restored: MockupDraftData | null | undefined;
    await act(async () => {
      restored = await result.current.loadDraft();
    });
    expect(restored).toBeNull();
  });

  it('quando o clear acontece antes do debounce, nenhum save é enviado', async () => {
    const { useMockupDraft } = await import('../useMockupDraft');
    const { result } = renderHook(() => useMockupDraft());

    act(() => {
      result.current.saveDraft(makeDraft());
    });

    await act(async () => {
      await result.current.clearDraft();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(mockUpsert).not.toHaveBeenCalled();
    expect(localStorage.getItem(localKey())).toBeNull();
  });
});
