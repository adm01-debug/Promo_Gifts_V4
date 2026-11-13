import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

type RP = { id: string; role: string; permission_code: string };
const db: {
  perms: { code: string; label: string; description: null; category: string; created_at: string }[];
  rp: RP[];
} = {
  perms: [],
  rp: [],
};
const calls: { op: string; arg: unknown }[] = [];
let deleteBehavior: (code: string, nth: number) => 'error' | 'ok' | 'zero' = () => 'ok';
let insertBehavior: () => 'error' | 'ok' = () => 'ok';
let deleteCount = 0;

function makeBuilder(table: string) {
  const b: Record<string, unknown> = {};
  let mode: 'delete' | 'select' = 'select';
  const filters: Record<string, string> = {};
  b.select = () => b;
  b.order = () => b;
  b.limit = () => b;
  b.eq = (k: string, v: string) => {
    filters[k] = v;
    return b;
  };
  b.delete = () => {
    mode = 'delete';
    return b;
  };
  b.insert = (rows: { role: string; permission_code: string }[]) => {
    calls.push({ op: 'insert', arg: rows });
    if (insertBehavior() === 'error') return Promise.resolve({ error: { message: 'insert RLS' } });
    rows.forEach((r, i) => db.rp.push({ id: `new-${i}-${r.permission_code}`, ...r }));
    return Promise.resolve({ error: null });
  };
  b.then = (res: (v: unknown) => void, rej: (e: unknown) => void) => {
    let out: unknown;
    if (mode === 'delete') {
      deleteCount++;
      calls.push({ op: 'delete', arg: { ...filters } });
      const beh = deleteBehavior(filters.permission_code, deleteCount);
      if (beh === 'error') out = { data: null, error: { message: 'boom' } };
      else if (beh === 'zero') out = { data: [], error: null };
      else {
        const hit = db.rp.filter(
          (r) => r.role === filters.role && r.permission_code === filters.permission_code,
        );
        db.rp = db.rp.filter((r) => !hit.includes(r));
        out = { data: hit.map((h) => ({ id: h.id })), error: null };
      }
    } else if (table === 'permissions') out = { data: db.perms, error: null };
    else
      out = {
        data: db.rp.filter((r) =>
          Object.entries(filters).every(([k, v]) => (r as Record<string, string>)[k] === v),
        ),
        error: null,
      };
    return Promise.resolve(out).then(res, rej);
  };
  return b;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => makeBuilder(t) },
}));
const toastSpy = vi.fn();
vi.mock('@/hooks/ui', () => ({ useToast: () => ({ toast: toastSpy }) }));
vi.mock('@/components/seo/PageSEO', () => ({ PageSEO: () => null }));
vi.mock('@/components/common/BackButton', () => ({ BackButton: () => null }));

import RolePermissionsPage from '@/pages/admin/RolePermissionsPage';

function seed() {
  db.perms = ['p1', 'p2', 'p3', 'p4'].map((c) => ({
    code: c,
    label: `L-${c}`,
    description: null,
    category: 'cat',
    created_at: '',
  }));
  db.rp = ['p1', 'p2', 'p3'].map((c) => ({
    id: `id-${c}`,
    role: 'supervisor',
    permission_code: c,
  }));
}

async function renderPage() {
  render(
    <MemoryRouter>
      <RolePermissionsPage />
    </MemoryRouter>,
  );
  await screen.findAllByText('L-p1');
}
function clickPerm(code: string) {
  const cb = document.getElementById(code)!;
  fireEvent.click(cb);
}
function saveBtn() {
  return screen.getByRole('button', { name: /Salvar \d+ altera/ });
}

describe('RolePermissionsPage — salvar com falha parcial e concorrência', () => {
  beforeEach(() => {
    seed();
    calls.length = 0;
    deleteCount = 0;
    toastSpy.mockClear();
    deleteBehavior = () => 'ok';
    insertBehavior = () => 'ok';
  });

  it('falha no 2º de 3 deletes: mantém só p2,p3,p4 pendentes; retry não refaz p1', async () => {
    await renderPage();
    clickPerm('p1');
    clickPerm('p2');
    clickPerm('p3');
    clickPerm('p4');
    expect(saveBtn().textContent).toContain('Salvar 4');
    deleteBehavior = (_c, n) => (n === 2 ? 'zero' : 'ok');
    act(() => {
      fireEvent.click(saveBtn());
    });
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'Erro ao salvar' })),
    );
    // p1 de fato apagado; p2 não; nada inserido
    expect(db.rp.map((r) => r.permission_code).sort()).toEqual(['p2', 'p3']);
    expect(calls.filter((c) => c.op === 'insert')).toHaveLength(0);
    await waitFor(() => expect(saveBtn().textContent).toContain('Salvar 3'));
    // retry com sucesso
    calls.length = 0;
    deleteBehavior = () => 'ok';
    act(() => {
      fireEvent.click(saveBtn());
    });
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Permissões atualizadas com sucesso!' }),
      ),
    );
    const deleted = calls
      .filter((c) => c.op === 'delete')
      .map((c) => (c.arg as { permission_code: string }).permission_code);
    expect(deleted.sort()).toEqual(['p2', 'p3']);
    expect(db.rp.map((r) => r.permission_code).sort()).toEqual(['p4']);
  });

  it('erro no insert após deletes OK: só a adição fica pendente', async () => {
    await renderPage();
    clickPerm('p1');
    clickPerm('p4');
    insertBehavior = () => 'error';
    act(() => {
      fireEvent.click(saveBtn());
    });
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'Erro ao salvar' })),
    );
    await waitFor(() => expect(saveBtn().textContent).toContain('Salvar 1'));
    insertBehavior = () => 'ok';
    calls.length = 0;
    act(() => {
      fireEvent.click(saveBtn());
    });
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Permissões atualizadas com sucesso!' }),
      ),
    );
    expect(calls.filter((c) => c.op === 'delete')).toHaveLength(0);
  });

  it('erro de rede (delErr) no 1º delete: nada aplicado, tudo continua pendente', async () => {
    await renderPage();
    clickPerm('p1');
    clickPerm('p2');
    deleteBehavior = () => 'error';
    act(() => {
      fireEvent.click(saveBtn());
    });
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'Erro ao salvar' })),
    );
    await waitFor(() => expect(saveBtn().textContent).toContain('Salvar 2'));
  });

  it('linha já removida por outro admin: estado desejado já no banco → salva sem erro', async () => {
    await renderPage();
    clickPerm('p2');
    db.rp = db.rp.filter((r) => r.permission_code !== 'p2');
    act(() => {
      fireEvent.click(saveBtn());
    });
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Permissões atualizadas com sucesso!' }),
      ),
    );
    expect(toastSpy).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Erro ao salvar' }));
  });

  it('RLS nega (0 linhas e a linha continua no banco): mostra o motivo real, não a mensagem genérica', async () => {
    deleteBehavior = () => 'zero';
    await renderPage();
    clickPerm('p2');
    act(() => {
      fireEvent.click(saveBtn());
    });
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Erro ao salvar',
          description: 'Sem permissão para alterar permissões por papel (somente dev).',
        }),
      ),
    );
    await waitFor(() => expect(saveBtn().textContent).toContain('Salvar 1'));
  });
});
