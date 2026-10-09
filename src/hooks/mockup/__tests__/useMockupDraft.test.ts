/**
 * Testes unitários — useMockupDraft
 *
 * Cobre:
 *   - saveDraft: persiste no localStorage imediatamente
 *   - saveDraft: dispara saveToBackend via debounce após 2s
 *   - loadDraft: prefere backend quando mais recente que localStorage
 *   - loadDraft: prefere localStorage quando mais recente que backend
 *   - loadDraft: cai para localStorage se backend falhar
 *   - saveToBackend: fallback para null IDs em erro FK (23503/409)
 *   - clearDraft: remove de localStorage e chama delete no backend
 *   - retorna estado inicial (isSaving=false, isLoading=true, lastSaved=null)
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockupDraftData } from '../useMockupDraft';

// ── Mocks ─────────────────────────────────────────────────────────────────────

// AuthContext — usuário autenticado por padrão
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-test-001' } }),
}));

const { mockUpsert, mockUpdate, mockSelect, mockDelete, mockMaybeSingle, mockFrom } = vi.hoisted(
  () => {
    const _mockMaybeSingle = vi.fn();
    const _mockSelect = vi.fn(() => ({
      eq: vi.fn().mockReturnThis(),
      maybeSingle: _mockMaybeSingle,
    }));
    const _mockUpsert = vi.fn();
    const _mockUpdate = vi.fn(() => ({
      eq: vi.fn().mockReturnThis(),
    }));
    const _mockDelete = vi.fn(() => ({
      eq: vi.fn().mockReturnThis(),
    }));
    const _mockFrom = vi.fn((table: string) => {
      if (table === 'mockup_drafts') {
        return {
          select: _mockSelect,
          upsert: _mockUpsert,
          update: _mockUpdate,
          delete: _mockDelete,
        };
      }
      return {};
    });
    return {
      mockUpsert: _mockUpsert,
      mockUpdate: _mockUpdate,
      mockSelect: _mockSelect,
      mockDelete: _mockDelete,
      mockMaybeSingle: _mockMaybeSingle,
      mockFrom: _mockFrom,
    };
  },
);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

const { mockUploadLogo } = vi.hoisted(() => ({ mockUploadLogo: vi.fn() }));
vi.mock('@/lib/mockup-storage', () => ({ uploadLogoToStorage: mockUploadLogo }));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const T_OLD = '2026-06-01T10:00:00.000Z';
const T_NEW = '2026-06-01T11:00:00.000Z';

function makeDraft(updatedAt = T_OLD): MockupDraftData {
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

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  mockFrom.mockClear();
  mockUpsert.mockClear();
  mockUpdate.mockClear();
  mockMaybeSingle.mockClear();
  mockDelete.mockClear();
  mockSelect.mockClear();
  mockUploadLogo.mockReset();
  mockUploadLogo.mockResolvedValue('https://storage.test/mockup-assets/u/logos/logo.png');

  // Default backend: nenhum draft
  mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  mockUpsert.mockResolvedValue({ error: null });
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

// ── Estado inicial ────────────────────────────────────────────────────────────
describe('estado inicial', () => {
  it('retorna isSaving=false, isLoading=true, lastSaved=null, error=null', async () => {
    const { useMockupDraft } = await import('../useMockupDraft');
    const { result } = renderHook(() => useMockupDraft());

    expect(result.current.isSaving).toBe(false);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.lastSaved).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('expõe saveDraft, loadDraft, clearDraft como funções', async () => {
    const { useMockupDraft } = await import('../useMockupDraft');
    const { result } = renderHook(() => useMockupDraft());

    expect(result.current.saveDraft).toBeTypeOf('function');
    expect(result.current.loadDraft).toBeTypeOf('function');
    expect(result.current.clearDraft).toBeTypeOf('function');
  });
});

// ── saveDraft: localStorage imediato ─────────────────────────────────────────
describe('saveDraft — localStorage', () => {
  it('persiste imediatamente no localStorage', async () => {
    const { useMockupDraft } = await import('../useMockupDraft');
    const { result } = renderHook(() => useMockupDraft());
    const draft = makeDraft();

    act(() => {
      result.current.saveDraft(draft);
    });

    const stored = JSON.parse(localStorage.getItem(localKey()) || '{}') as MockupDraftData;
    expect(stored.productId).toBe('prod-1');
    expect(stored.productName).toBe('Caneca');
  });

  it('não chama o backend antes do debounce de 2s', async () => {
    const { useMockupDraft } = await import('../useMockupDraft');
    const { result } = renderHook(() => useMockupDraft());

    act(() => {
      result.current.saveDraft(makeDraft());
    });

    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('chama o backend após 2s de debounce', async () => {
    const { useMockupDraft } = await import('../useMockupDraft');
    const { result } = renderHook(() => useMockupDraft());

    act(() => {
      result.current.saveDraft(makeDraft());
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });

  it('debounce: múltiplas chamadas rápidas resultam em um único upsert', async () => {
    const { useMockupDraft } = await import('../useMockupDraft');
    const { result } = renderHook(() => useMockupDraft());

    act(() => {
      result.current.saveDraft(makeDraft());
      result.current.saveDraft(makeDraft());
      result.current.saveDraft(makeDraft());
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });
});

// ── saveToBackend: fallback FK ────────────────────────────────────────────────
describe('saveToBackend — fallback FK (23503)', () => {
  it('tenta upsert normal primeiro', async () => {
    const { useMockupDraft } = await import('../useMockupDraft');
    mockUpsert.mockResolvedValueOnce({ error: null });

    const { result } = renderHook(() => useMockupDraft());

    act(() => {
      result.current.saveDraft(makeDraft());
    });
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  // BUG-17 FIX: fallback now uses .upsert() (not .update()) so that the row is
  // created even on first-ever save. Tests updated from mockUpdate → mockUpsert.
  it('ao receber erro 23503 (FK violation), tenta upsert de fallback com IDs nulos', async () => {
    const { useMockupDraft } = await import('../useMockupDraft');
    // First upsert (normal path) → 23503 FK violation
    mockUpsert.mockResolvedValueOnce({ error: { code: '23503', message: 'fk violation' } });
    // Second upsert (fallback path) → success (default from beforeEach)

    const { result } = renderHook(() => useMockupDraft());
    act(() => {
      result.current.saveDraft(makeDraft());
    });
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Two upsert calls total: normal + fallback. No .update() ever.
    expect(mockUpsert).toHaveBeenCalledTimes(2);
    expect(mockUpdate).not.toHaveBeenCalled();

    const fallbackCall = (mockUpsert.mock.calls[1] as unknown[])[0] as Record<string, unknown>;
    expect(fallbackCall.product_id).toBeNull();
    expect(fallbackCall.technique_id).toBeNull();
    expect(fallbackCall.client_id).toBeNull();
    // Dados de texto ainda são preservados
    expect(fallbackCall.product_name).toBe('Caneca');
  });

  // Only error code '23503' triggers the null-ID fallback. Other codes are
  // propagated to the catch block and surface as the hook's error state.
  it('ao receber erro não-23503, não faz fallback — apenas um upsert tentado', async () => {
    const { useMockupDraft } = await import('../useMockupDraft');
    mockUpsert.mockResolvedValueOnce({ error: { code: '409', message: 'conflict' } });

    const { result } = renderHook(() => useMockupDraft());
    act(() => {
      result.current.saveDraft(makeDraft());
    });
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Only the first (failing) upsert is attempted, no fallback
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

// ── loadDraft: prioridade backend vs localStorage ─────────────────────────────
describe('loadDraft — prioridade de dados', () => {
  it('retorna dados do backend quando mais recente', async () => {
    const { useMockupDraft } = await import('../useMockupDraft');

    // localStorage com timestamp antigo
    localStorage.setItem(localKey(), JSON.stringify(makeDraft(T_OLD)));

    // backend com timestamp novo
    mockMaybeSingle.mockResolvedValue({
      data: {
        product_id: 'prod-backend',
        product_name: 'Copo Backend',
        technique_id: 'tec-b',
        technique_name: 'Digital',
        client_id: 'cli-b',
        client_name: 'Maria',
        personalization_areas: [],
        logo_data: null,
        updated_at: T_NEW,
      },
      error: null,
    });

    const { result } = renderHook(() => useMockupDraft());
    let draft: MockupDraftData | null = null;

    await act(async () => {
      draft = await result.current.loadDraft();
    });

    expect((draft as MockupDraftData | null)?.productId).toBe('prod-backend');
    expect((draft as MockupDraftData | null)?.productName).toBe('Copo Backend');
  });

  it('retorna dados do localStorage quando mais recente', async () => {
    const { useMockupDraft } = await import('../useMockupDraft');

    // localStorage com timestamp novo
    localStorage.setItem(localKey(), JSON.stringify(makeDraft(T_NEW)));

    // backend com timestamp antigo
    mockMaybeSingle.mockResolvedValue({
      data: {
        product_id: 'prod-old',
        product_name: 'Produto Antigo',
        technique_id: null,
        technique_name: null,
        client_id: null,
        client_name: null,
        personalization_areas: [],
        logo_data: null,
        updated_at: T_OLD,
      },
      error: null,
    });

    const { result } = renderHook(() => useMockupDraft());
    let draft: MockupDraftData | null = null;

    await act(async () => {
      draft = await result.current.loadDraft();
    });

    expect((draft as MockupDraftData | null)?.productId).toBe('prod-1');
  });

  it('retorna dados do localStorage se backend retornar erro', async () => {
    const { useMockupDraft } = await import('../useMockupDraft');

    localStorage.setItem(localKey(), JSON.stringify(makeDraft(T_OLD)));
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'permission denied' } });

    const { result } = renderHook(() => useMockupDraft());
    let draft: MockupDraftData | null = null;

    await act(async () => {
      draft = await result.current.loadDraft();
    });

    expect((draft as MockupDraftData | null)?.productName).toBe('Caneca');
  });

  it('retorna null quando não há dados em nenhum lugar', async () => {
    const { useMockupDraft } = await import('../useMockupDraft');
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useMockupDraft());
    let draft: MockupDraftData | null | undefined;

    await act(async () => {
      draft = await result.current.loadDraft();
    });

    expect(draft).toBeNull();
  });

  it('seta isLoading=false após loadDraft completar', async () => {
    const { useMockupDraft } = await import('../useMockupDraft');
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useMockupDraft());

    await act(async () => {
      await result.current.loadDraft();
    });

    expect(result.current.isLoading).toBe(false);
  });
});

// ── clearDraft ────────────────────────────────────────────────────────────────
describe('clearDraft', () => {
  it('remove do localStorage', async () => {
    const { useMockupDraft } = await import('../useMockupDraft');
    localStorage.setItem(localKey(), JSON.stringify(makeDraft()));

    const { result } = renderHook(() => useMockupDraft());

    await act(async () => {
      await result.current.clearDraft();
    });

    expect(localStorage.getItem(localKey())).toBeNull();
  });

  it('chama delete no Supabase para o user_id e draft_key corretos', async () => {
    const { useMockupDraft } = await import('../useMockupDraft');

    const eqMock = vi.fn().mockReturnThis();
    mockDelete.mockReturnValue({ eq: eqMock });

    const { result } = renderHook(() => useMockupDraft());

    await act(async () => {
      await result.current.clearDraft();
    });

    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(eqMock).toHaveBeenCalledWith('user_id', 'user-test-001');
    expect(eqMock).toHaveBeenCalledWith('draft_key', 'default');
  });

  it('quando Supabase delete retorna erro, loga o erro mas clearDraft não lança exceção', async () => {
    const { useMockupDraft } = await import('../useMockupDraft');
    const { logger } = await import('@/lib/logger');

    const deleteErr = { code: 'PGRST301', message: 'JWT expired' };
    // Two .eq() calls in the chain: first is chainable, second resolves to { error }
    const secondEq = vi.fn().mockResolvedValue({ error: deleteErr });
    const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
    mockDelete.mockReturnValue({ eq: firstEq });

    const { result } = renderHook(() => useMockupDraft());

    // clearDraft must NOT throw even when Supabase returns an API error
    await act(async () => {
      await result.current.clearDraft();
    });

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('limpar rascunho'),
      expect.objectContaining({ code: 'PGRST301' }),
    );
  });
});

// ── logo enviada (data: URL) sobrevive ao rascunho ───────────────────────────
describe('logo do rascunho', () => {
  const DATA_URL = 'data:image/png;base64,iVBORw0KGgo=';
  const STORAGE_URL = 'https://storage.test/mockup-assets/u/logos/logo.png';

  function draftWithLogo(logo: string | null, updatedAt = T_NEW): MockupDraftData {
    const d = makeDraft(updatedAt);
    d.personalizationAreas[0].logoPreview = logo;
    return d;
  }

  async function saveAndFlush(draft: MockupDraftData) {
    const { useMockupDraft } = await import('../useMockupDraft');
    const hook = renderHook(() => useMockupDraft());
    act(() => {
      hook.result.current.saveDraft(draft);
    });
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    return hook;
  }

  function firstPayload(i = 0): Record<string, unknown> {
    return (mockUpsert.mock.calls[i] as unknown[])[0] as Record<string, unknown>;
  }

  it('sobe a data: URL ao storage e grava a URL http no rascunho do backend', async () => {
    await saveAndFlush(draftWithLogo(DATA_URL));

    expect(mockUploadLogo).toHaveBeenCalledTimes(1);
    expect(mockUploadLogo).toHaveBeenCalledWith('user-test-001', DATA_URL, expect.any(String));
    const payload = firstPayload();
    const areas = payload.personalization_areas as Array<{ logoPreview: string | null }>;
    expect(areas[0].logoPreview).toBe(STORAGE_URL);
    expect(payload.logo_data).toBe(STORAGE_URL);
    expect(JSON.stringify(payload)).not.toContain('data:image');
  });

  it('loadDraft devolve a logo utilizável (URL http) após salvar com data: URL', async () => {
    const { result } = await saveAndFlush(draftWithLogo(DATA_URL));
    const payload = firstPayload();

    // outro dispositivo / localStorage limpo: só o backend resta
    localStorage.clear();
    mockMaybeSingle.mockResolvedValue({ data: payload, error: null });

    let draft: MockupDraftData | null = null;
    await act(async () => {
      draft = await result.current.loadDraft();
    });
    expect((draft as MockupDraftData | null)?.personalizationAreas[0].logoPreview).toBe(
      STORAGE_URL,
    );
  });

  // URL que o storage devolve: contém o nome de arquivo pedido (como o real).
  const urlFor = (name: string) => `https://storage.test/mockup-assets/u/logos/1-${name}.png`;
  const OTHER_LOGO = urlFor('draft-default-deadbeef'); // upload de OUTRA imagem

  // Backend mais VELHO que o local, com a área informada (só os campos lidos).
  async function loadWith(areaId: string, logo: string | null, error: unknown = null) {
    const { useMockupDraft } = await import('../useMockupDraft');
    const row = error
      ? null
      : {
          personalization_areas: [{ id: areaId, logoPreview: logo }],
          logo_data: logo,
          updated_at: T_OLD,
        };
    mockMaybeSingle.mockResolvedValue({ data: row, error });
    const { result } = renderHook(() => useMockupDraft());
    const box: { draft: MockupDraftData | null } = { draft: null };
    await act(async () => {
      box.draft = await result.current.loadDraft();
    });
    return box.draft?.personalizationAreas[0];
  }

  it('localStorage guarda marcador da logo pendente, nunca o base64', async () => {
    await saveAndFlush(draftWithLogo(DATA_URL));
    const raw = localStorage.getItem(localKey()) ?? '';
    expect(raw).not.toContain('data:image');
    expect(raw).toMatch(/"logoPreview":"draft-logo-pending:[0-9a-f]{8}"/);
  });

  it('quando o localStorage vence, recupera do backend a URL do upload da MESMA logo', async () => {
    mockUploadLogo.mockImplementation((_u: string, _d: string, name: string) =>
      Promise.resolve(urlFor(name)),
    );
    await saveAndFlush(draftWithLogo(DATA_URL, T_NEW));
    const url = urlFor(String(mockUploadLogo.mock.calls[0]?.[2]));
    expect(url).toMatch(/-draft-default-[0-9a-f]{8}\.png$/);
    expect((await loadWith('area-1', url))?.logoPreview).toBe(url);
  });

  // [caso, logo local, id da área local, logo do backend na area-1] -> área local sem logo
  it.each([
    ['área nova sem logo NÃO herda a logo de outra área', null, 'area-nova', STORAGE_URL],
    ['logo pendente de área nova NÃO pega a de outra área', DATA_URL, 'area-nova', OTHER_LOGO],
    ['logo pendente NÃO pega logo antiga da mesma área', DATA_URL, 'area-1', OTHER_LOGO],
    ['logo removida pelo usuário NÃO volta do backend', null, 'area-1', STORAGE_URL],
  ])('%s', async (_t, localLogo, localAreaId, backendLogo) => {
    const local = draftWithLogo(localLogo, T_NEW);
    local.personalizationAreas[0].id = localAreaId;
    await saveAndFlush(local);
    const area = await loadWith('area-1', backendLogo);
    expect(area?.id).toBe(localAreaId);
    expect(area?.logoPreview).toBeNull();
  });

  it('backend com erro: marcador pendente nunca vaza como logoPreview', async () => {
    await saveAndFlush(draftWithLogo(DATA_URL, T_NEW));
    expect((await loadWith('area-1', null, { message: 'denied' }))?.logoPreview).toBeNull();
  });

  it('logo_data só leva a logo da 1ª área (não a de outra área)', async () => {
    const d = draftWithLogo(null);
    d.personalizationAreas.push({ ...d.personalizationAreas[0], id: 'a2', logoPreview: DATA_URL });
    await saveAndFlush(d);
    expect(JSON.stringify(firstPayload().personalization_areas)).toContain(STORAGE_URL);
    expect(firstPayload().logo_data).toBeNull();
  });

  it('não reenvia a mesma logo a cada autosave', async () => {
    const { result } = await saveAndFlush(draftWithLogo(DATA_URL));
    act(() => {
      result.current.saveDraft(draftWithLogo(DATA_URL));
    });
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(mockUploadLogo).toHaveBeenCalledTimes(1);
    expect(mockUpsert).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['upload devolve null', () => mockUploadLogo.mockResolvedValueOnce(null)],
    ['upload LANÇA erro', () => mockUploadLogo.mockRejectedValueOnce(new Error('network down'))],
  ])('%s: salva sem logo, logger.warn com contexto, erro exposto e retry', async (_t, arrange) => {
    const { logger } = await import('@/lib/logger');
    vi.mocked(logger.warn).mockClear();
    arrange();
    const { result } = await saveAndFlush(draftWithLogo(DATA_URL));
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(firstPayload().logo_data).toBeNull();
    expect(JSON.stringify(firstPayload())).not.toContain('data:image');
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('upload da logo'),
      expect.objectContaining({ draftKey: 'default', areaIndex: 0, areaId: 'area-1' }),
    );
    expect(result.current.error).toBe('Não foi possível salvar a logo no rascunho');

    // falha não fica em cache: o próximo autosave reenvia e limpa o erro
    act(() => {
      result.current.saveDraft(draftWithLogo(DATA_URL));
    });
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(mockUploadLogo).toHaveBeenCalledTimes(2);
    expect(firstPayload(1).logo_data).toBe(STORAGE_URL);
    expect(result.current.error).toBeNull();
  });

  it('dois autosaves com upload pendente: um só upload e só a versão nova grava', async () => {
    let finishUpload: (url: string) => void = () => undefined;
    mockUploadLogo.mockReturnValue(
      new Promise<string>((resolve) => {
        finishUpload = resolve;
      }),
    );
    const { useMockupDraft } = await import('../useMockupDraft');
    const { result } = renderHook(() => useMockupDraft());
    // cada save passa o debounce e fica preso no upload: os dois rodam ao mesmo tempo
    for (const productName of ['Versão antiga', 'Versão nova']) {
      act(() => {
        result.current.saveDraft({ ...draftWithLogo(DATA_URL), productName });
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
    }
    expect(mockUploadLogo).toHaveBeenCalledTimes(1);
    await act(async () => {
      finishUpload(STORAGE_URL);
      await vi.runAllTimersAsync();
    });
    const names = mockUpsert.mock.calls.map((_c, i) => firstPayload(i).product_name);
    expect(names).toEqual(['Versão nova']);
    expect(mockUploadLogo).toHaveBeenCalledTimes(1);
  });

  it('rascunho sem logo continua funcionando e não chama o storage', async () => {
    await saveAndFlush(draftWithLogo(null));
    expect(mockUploadLogo).not.toHaveBeenCalled();
    const payload = firstPayload();
    expect(payload.logo_data).toBeNull();
    expect(payload.product_name).toBe('Caneca');
  });
});
