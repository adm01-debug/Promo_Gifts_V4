/**
 * magazineService.publish — contrato pós-trigger `fn_magazine_public_token`.
 *
 * Este teste valida o comportamento do trigger canônico
 * `tg_magazines_on_publish` no BD Gold (`doufsxqlfjyuvxuezpln`).
 *
 * Contrato coberto:
 *  1) UPDATE status='published' → linha volta do BD com public_token não-nulo
 *     (trigger BEFORE preenche antes do RETURNING).
 *  2) publish() resolve com Magazine.publicToken definido, sem depender de
 *     nenhum fallback client-side (crypto.getRandomValues NÃO deve ser
 *     chamado — se for, é sinal de que o fallback ainda está ativo).
 *  3) Se por qualquer motivo o BD devolver token nulo (trigger ausente ou
 *     revertida), o teste FALHA — isso é o gatilho de regressão que impede
 *     silenciosamente voltar ao estado anterior.
 *
 * O teste NÃO faz roundtrip real com o Gold — ele simula a linha que a
 * trigger produziria. O SQL da trigger é validado no próprio Gold via
 * bloco DO $verify$ da migração + consulta read-only por psql.
 *
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock Supabase in-memory que simula a trigger BEFORE:
// qualquer UPDATE que setar status='published' faz o BD retornar
// public_token = <hex 32> na próxima leitura.
// ---------------------------------------------------------------------------

interface MagRow {
  id: string;
  owner_id: string;
  organization_id: string | null;
  title: string;
  subtitle: string | null;
  template_id: string;
  branding: Record<string, unknown>;
  content_settings: Record<string, unknown>;
  page_order: number[] | null;
  status: string;
  public_token: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  edit_version: number;
}

const state = vi.hoisted(() => {
  const row: MagRow = {
    id: 'mag_pub_1',
    owner_id: 'u1',
    organization_id: null,
    title: 'Rev',
    subtitle: null,
    template_id: 'editorial-vogue',
    branding: {},
    content_settings: {},
    page_order: null,
    status: 'draft',
    public_token: null,
    published_at: null,
    created_at: '2026-07-15T00:00:00Z',
    updated_at: '2026-07-15T00:00:00Z',
    deleted_at: null,
    edit_version: 0,
  };
  return {
    row,
    // Flag do cenário: quando true, a "trigger" preenche public_token.
    triggerActive: true,
    randomBytesCalled: false,
  };
});

const builder = vi.hoisted(() => {
  return (table: string) => {
    const q: Record<string, unknown> = {};
    q.select = () => q;
    q.eq = () => q;
    q.is = () => q;
    q.order = () =>
      Promise.resolve({
        data: table === 'magazine_items' ? [] : [state.row],
        error: null,
      });
    q.maybeSingle = () =>
      Promise.resolve({
        data: table === 'magazines' ? state.row : null,
        error: null,
      });
    q.insert = () => Promise.resolve({ error: null });
    q.delete = () => q;
    q.update = (patch: Partial<MagRow>) => {
      // Simula a trigger BEFORE UPDATE OF status.
      if (patch.status === 'published' && state.triggerActive && !state.row.public_token) {
        state.row.public_token = 'ab'.repeat(16); // 32 hex chars
      }
      Object.assign(state.row, patch);
      return {
        eq: () => Promise.resolve({ error: null }),
      };
    };
    return q;
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (t: string) => builder(t),
    rpc: (name: string) => {
      if (name !== 'magazine_publish_v2') return { data: null, error: null };
      if (!state.triggerActive) {
        // A função levanta exceção e toda a mudança de status é revertida.
        return { data: null, error: { message: 'magazine_publish_token_missing' } };
      }
      if (!state.row.public_token) state.row.public_token = 'ab'.repeat(16);
      state.row.status = 'published';
      state.row.edit_version++;
      return {
        data: { public_token: state.row.public_token, edit_version: state.row.edit_version },
        error: null,
      };
    },
  },
}));

// Espia crypto.getRandomValues para provar que o fallback NÃO é usado.
beforeEach(() => {
  state.row.status = 'draft';
  state.row.public_token = null;
  state.row.published_at = null;
  state.row.edit_version = 0;
  state.triggerActive = true;
  state.randomBytesCalled = false;
  const original = globalThis.crypto?.getRandomValues?.bind(globalThis.crypto);
  if (original) {
    vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((buf) => {
      state.randomBytesCalled = true;
      return original(buf);
    });
  }
});

// import DEPOIS dos mocks
import { magazineService } from '@/services/magazineService';

describe('publish() — contrato pós-trigger tg_magazines_on_publish', () => {
  it('recebe public_token vindo do BD (trigger BEFORE UPDATE)', async () => {
    const result = await magazineService.publish('mag_pub_1', 0);
    expect(result).not.toBeNull();
    expect(result!.publicToken).toMatch(/^[a-f0-9]{32}$/i);
    expect(result!.status).toBe('published');
  });

  it('NÃO usa fallback client-side (crypto.getRandomValues não é chamado)', async () => {
    await magazineService.publish('mag_pub_1', 0);
    expect(
      state.randomBytesCalled,
      'crypto.getRandomValues foi chamado — o fallback client-side ainda está ativo. Remova-o.',
    ).toBe(false);
  });

  it('regressão: se a trigger sumir, bloqueia a publicação sem link público', async () => {
    state.triggerActive = false;
    await expect(magazineService.publish('mag_pub_1', 0)).rejects.toThrow(
      'magazine_publish_token_missing',
    );
    expect(state.row.status).toBe('draft');
  });
});
