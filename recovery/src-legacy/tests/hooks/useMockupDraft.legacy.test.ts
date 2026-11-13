import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
const m = vi.hoisted(() => ({
  user: { id: 'u1' },
  upsert: vi.fn(),
  update: vi.fn(),
  maybeSingle: vi.fn(),
  delete: vi.fn(),
  from: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: m.user }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: m.from } }));
import { useMockupDraft } from '@/hooks/useMockupDraft';
const area = {
  id: 'a1',
  name: 'Frente',
  positionX: 20,
  positionY: 30,
  logoWidth: 4,
  logoHeight: 2,
  logoRotation: 15,
  logoScale: 90,
  logoPreview: 'data:image/png;base64,AAAA',
  maxWidthCm: 10,
  maxHeightCm: 8,
  maxColors: 4,
  isCurved: true,
  techniquesAvailable: 3,
};
const data = {
  productId: 'external-product',
  productName: 'Produto',
  techniqueId: 'external-technique',
  techniqueName: 'Laser',
  clientId: 'crm-client',
  clientName: 'Cliente',
  personalizationAreas: [area],
  updatedAt: '2026-11-09T12:00:00Z',
};
const row = {
  id: 'd1',
  user_id: 'u1',
  draft_key: 'default',
  product_id: 'external-product',
  product_name: 'Produto',
  technique_id: 'external-technique',
  technique_name: 'Laser',
  client_id: 'crm-client',
  client_name: 'Cliente',
  personalization_areas: [area],
  logo_data: null,
  updated_at: '2026-11-09T12:00:00Z',
  created_at: '2026-11-09T12:00:00Z',
};
function query() {
  return {
    eq: vi.fn(() => query()),
    maybeSingle: m.maybeSingle,
    then: (resolve, reject) => Promise.resolve({ error: null }).then(resolve, reject),
  };
}
beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  vi.clearAllMocks();
  m.user = { id: 'u1' };
  m.upsert.mockResolvedValue({ error: null });
  m.maybeSingle.mockResolvedValue({ data: null, error: null });
  m.update.mockImplementation(() => query());
  m.delete.mockImplementation(() => query());
  m.from.mockImplementation((table) => {
    if (table !== 'mockup_drafts') throw new Error('Unexpected legacy table lookup ' + table);
    return { select: () => query(), upsert: m.upsert, update: m.update, delete: m.delete };
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
async function save(input = data) {
  const hook = renderHook(() => useMockupDraft());
  act(() => hook.result.current.saveDraft(input));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000);
  });
  return hook;
}
describe('Mockup draft retains TEXT reference IDs and original save/load flow', () => {
  it('saves local immediately and backend only after debounce', async () => {
    const hook = renderHook(() => useMockupDraft());
    act(() => hook.result.current.saveDraft(data));
    expect(JSON.parse(localStorage.getItem('mockup_draft_v1_u1_default'))).toEqual(data);
    expect(m.upsert).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(m.upsert).toHaveBeenCalledOnce();
    expect(hook.result.current.lastSaved).toBeInstanceOf(Date);
  });
  it.each([
    ['external-id', 'external-id'],
    ['b4bfdc3c-8158-4f1f-9fdb-3cbe0b05374b', 'b4bfdc3c-8158-4f1f-9fdb-3cbe0b05374b'],
    [null, null],
    [undefined, null],
    [123, null],
    ['', ''],
  ])('persists text references %j without nonexistent FK lookups', async (id, expected) => {
    await save({ ...data, productId: id, techniqueId: id, clientId: id });
    expect(m.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        product_id: expected,
        technique_id: expected,
        client_id: expected,
      }),
      { onConflict: 'user_id,draft_key' },
    );
    expect(m.from.mock.calls.every(([table]) => table === 'mockup_drafts')).toBe(true);
  });
  it('keeps local base64 logo but strips backend image body and metadata stays', async () => {
    await save();
    const payload = m.upsert.mock.calls[0][0];
    expect(payload.logo_data).toBeNull();
    expect(payload.personalization_areas[0]).toMatchObject({
      logoPreview: null,
      maxWidthCm: 10,
      maxColors: 4,
      isCurved: true,
    });
    expect(
      JSON.parse(localStorage.getItem('mockup_draft_v1_u1_default')).personalizationAreas[0]
        .logoPreview,
    ).toContain('base64');
  });
  it('keeps a URL logo reference in separate backend column', async () => {
    await save({
      ...data,
      personalizationAreas: [{ ...area, logoPreview: 'https://example.test/logo.png' }],
    });
    expect(m.upsert.mock.calls[0][0].logo_data).toBe('https://example.test/logo.png');
  });
  it('loads backend areas with dimensions, colors and curvature metadata preserved', async () => {
    m.maybeSingle.mockResolvedValue({ data: row, error: null });
    const hook = renderHook(() => useMockupDraft());
    let result;
    await act(async () => {
      result = await hook.result.current.loadDraft();
    });
    expect(result.personalizationAreas[0]).toMatchObject(area);
    expect(result.clientId).toBe('crm-client');
  });
  it('normalizes malformed JSON entries without accessing null properties', async () => {
    m.maybeSingle.mockResolvedValue({
      data: {
        ...row,
        personalization_areas: [
          null,
          [],
          123,
          'bad',
          { positionX: 'bad', logoWidth: null, maxWidthCm: 'bad' },
        ],
        logo_data: 'https://example.test/logo.png',
      },
      error: null,
    });
    const hook = renderHook(() => useMockupDraft());
    let result;
    await act(async () => {
      result = await hook.result.current.loadDraft();
    });
    expect(result.personalizationAreas).toHaveLength(1);
    expect(result.personalizationAreas[0]).toMatchObject({
      name: 'Frente',
      positionX: 50,
      logoWidth: 5,
      maxWidthCm: null,
      logoPreview: 'https://example.test/logo.png',
    });
  });
  it.each([
    ['2026-11-10T00:00:00Z', 'local'],
    ['2026-11-08T00:00:00Z', 'external-product'],
  ])('retains newest-draft precedence for local %s', async (updatedAt, expected) => {
    localStorage.setItem(
      'mockup_draft_v1_u1_default',
      JSON.stringify({ ...data, productId: 'local', updatedAt }),
    );
    m.maybeSingle.mockResolvedValue({ data: row, error: null });
    const hook = renderHook(() => useMockupDraft());
    let result;
    await act(async () => {
      result = await hook.result.current.loadDraft();
    });
    expect(result.productId).toBe(expected);
  });
  it('keeps local fallback when backend fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('mockup_draft_v1_u1_default', JSON.stringify(data));
    m.maybeSingle.mockResolvedValue({ data: null, error: { message: 'offline' } });
    const hook = renderHook(() => useMockupDraft());
    let result;
    await act(async () => {
      result = await hook.result.current.loadDraft();
    });
    expect(result.productId).toBe('external-product');
    expect(result.personalizationAreas[0].logoPreview).toContain('base64');
  });
  it('clears both existing local key and backend draft', async () => {
    localStorage.setItem('mockup_draft_v1_u1_default', JSON.stringify(data));
    const hook = renderHook(() => useMockupDraft());
    await act(async () => {
      await hook.result.current.clearDraft();
    });
    expect(localStorage.getItem('mockup_draft_v1_u1_default')).toBeNull();
    expect(m.delete).toHaveBeenCalledOnce();
  });
  it('skips backend for unauthenticated user while retaining local draft', async () => {
    m.user = null;
    await save();
    expect(m.upsert).not.toHaveBeenCalled();
    expect(localStorage.getItem('mockup_draft_v1_anonymous_default')).not.toBeNull();
  });
  it('cancels pending backend save on unmount', async () => {
    const hook = renderHook(() => useMockupDraft());
    act(() => hook.result.current.saveDraft(data));
    hook.unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(m.upsert).not.toHaveBeenCalled();
  });
});
