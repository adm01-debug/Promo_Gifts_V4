import { beforeEach, describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => ({
  filters: [] as Array<[string, string]>,
  operations: [] as string[],
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      calls.operations.push(table);
      return {
        select: () => ({
          eq: (column: string, value: string) => {
            calls.filters.push([column, value]);
            return { order: async () => ({ data: [], error: null }) };
          },
        }),
        delete: () => ({
          eq: (column: string, value: string) => {
            calls.filters.push([column, value]);
            return {
              eq: async (ownerColumn: string, ownerId: string) => {
                calls.filters.push([ownerColumn, ownerId]);
                return { error: null };
              },
            };
          },
        }),
        update: () => ({
          eq: (column: string, value: string) => {
            calls.filters.push([column, value]);
            return {
              eq: async (ownerColumn: string, ownerId: string) => {
                calls.filters.push([ownerColumn, ownerId]);
                return { error: null };
              },
            };
          },
        }),
      };
    },
  },
}));

import {
  deleteOwnKit,
  fetchOwnKits,
  setOwnKitFavorite,
} from '@/pages/kit-builder/KitLibraryPage';

beforeEach(() => {
  calls.filters.length = 0;
  calls.operations.length = 0;
});

describe('Kit Library ownership boundary', () => {
  it('filtra Meus kits pelo usuário, mesmo se a RLS do coordenador lê outras contas', async () => {
    await fetchOwnKits('user-A');
    expect(calls.operations).toEqual(['custom_kits']);
    expect(calls.filters).toEqual([['user_id', 'user-A']]);
  });

  it('restringe exclusão e favorito ao proprietário e bloqueia usuário ausente', async () => {
    await deleteOwnKit('user-A', 'kit-1');
    expect(calls.filters).toEqual([['id', 'kit-1'], ['user_id', 'user-A']]);
    calls.filters.length = 0;
    await setOwnKitFavorite('user-A', 'kit-1', true);
    expect(calls.filters).toEqual([['id', 'kit-1'], ['user_id', 'user-A']]);
    await expect(deleteOwnKit('', 'kit-1')).rejects.toThrow('Não autenticado');
    await expect(setOwnKitFavorite('', 'kit-1', true)).rejects.toThrow('Não autenticado');
  });
});
