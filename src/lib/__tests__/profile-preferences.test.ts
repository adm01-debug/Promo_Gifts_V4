import { describe, it, expect, beforeEach, vi } from 'vitest';

import { mergeProfilePreferences } from '@/lib/profile-preferences';

const state = vi.hoisted(() => ({
  server: {} as Record<string, Record<string, unknown> | null>,
  updates: 0,
  failNextUpdate: false,
}));

vi.mock('@/integrations/supabase/client', () => {
  const wait = () =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, Math.floor(Math.random() * 8));
    });

  return {
    supabase: {
      from: () => ({
        select: () => ({
          eq: (_column: string, userId: string) => ({
            maybeSingle: async () => {
              await wait();
              return { data: { preferences: state.server[userId] ?? null }, error: null };
            },
          }),
        }),
        update: (patch: { preferences: Record<string, unknown> }) => ({
          eq: async (_column: string, userId: string) => {
            await wait();
            if (state.failNextUpdate) {
              state.failNextUpdate = false;
              return { error: new Error('update falhou') };
            }
            state.updates += 1;
            state.server[userId] = patch.preferences;
            return { error: null };
          },
        }),
      }),
    },
  };
});

describe('mergeProfilePreferences', () => {
  beforeEach(() => {
    state.server = {};
    state.updates = 0;
    state.failNextUpdate = false;
  });

  it('duas abas gravando chaves diferentes preservam as duas (ACH-039)', async () => {
    const badge = { '/catalog': { light: false, dark: true } };

    await Promise.all([
      mergeProfilePreferences('u1', { catalog: { sortBy: 'price' } }),
      mergeProfilePreferences('u1', { badge_visibility: badge }),
    ]);

    expect(state.server.u1).toEqual({
      catalog: { sortBy: 'price' },
      badge_visibility: badge,
    });
  });

  it('não grava quando as chaves pedidas já têm o valor atual', async () => {
    state.server.u2 = { catalog: { sortBy: 'price' } };

    await mergeProfilePreferences('u2', { catalog: { sortBy: 'price' } });

    expect(state.updates).toBe(0);
  });

  it('preserva chaves que o hook chamador não conhece', async () => {
    state.server.u3 = { flow_autoplay_tts: true, catalog: { sortBy: 'name' } };

    await mergeProfilePreferences('u3', { simulator: { lastQuantity: 250 } });

    expect(state.server.u3).toEqual({
      flow_autoplay_tts: true,
      catalog: { sortBy: 'name' },
      simulator: { lastQuantity: 250 },
    });
  });

  it('propaga o erro da gravação em vez de engolir', async () => {
    state.failNextUpdate = true;

    await expect(mergeProfilePreferences('u4', { catalog: { sortBy: 'name' } })).rejects.toThrow(
      'update falhou',
    );
  });
});
