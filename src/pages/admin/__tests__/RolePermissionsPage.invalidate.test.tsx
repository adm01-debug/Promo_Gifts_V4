/**
 * Prova da etapa 084 (ACH-034): gravar permissoes de papel invalida a familia de chaves
 * `role-permissions`, que e a que o RBAC le (useRBAC.tsx, staleTime 5 min).
 *
 * Sem a invalidacao, a UI continuaria liberando/escondendo acoes pelo conjunto antigo.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const db = {
  perms: [{ code: 'p1', label: 'L-p1', description: null, category: 'cat', created_at: '' }],
  rp: [{ id: 'id-p1', role: 'supervisor', permission_code: 'p1' }],
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      const b: Record<string, unknown> = {};
      b.select = () => b;
      b.order = () => b;
      b.limit = () => b;
      b.eq = () => b;
      b.insert = () => Promise.resolve({ error: null });
      b.delete = () => b;
      b.then = (res: (v: unknown) => void) =>
        Promise.resolve({
          data: table === 'permissions' ? db.perms : db.rp,
          error: null,
        }).then(res);
      return b;
    },
  },
}));
vi.mock('@/hooks/ui', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/components/seo/PageSEO', () => ({ PageSEO: () => null }));
vi.mock('@/components/common/BackButton', () => ({ BackButton: () => null }));

import RolePermissionsPage from '@/pages/admin/RolePermissionsPage';

describe('RolePermissionsPage - etapa 084: invalida role-permissions', () => {
  let client: QueryClient;

  beforeEach(() => {
    client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
  });

  it('invalida a familia role-permissions depois de salvar', async () => {
    // Semeia a chave que o RBAC consome, para provar que ela e invalidada.
    client.setQueryData(['role-permissions', 'supervisor'], ['p1']);
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <RolePermissionsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await screen.findAllByText('L-p1');
    const checkbox = document.getElementById('p1')!;
    fireEvent.click(checkbox);
    fireEvent.click(checkbox);
    fireEvent.click(checkbox);

    const save = await screen.findByRole('button', { name: /Salvar .+ altera/ });
    act(() => {
      fireEvent.click(save);
    });

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['role-permissions'] }),
    );
  });
});
