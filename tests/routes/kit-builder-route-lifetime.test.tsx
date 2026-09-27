import { act, fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ userId: 'user-A', listeners: new Set<() => void>() }));
vi.mock('@/contexts/AuthContext', async () => {
  const { useSyncExternalStore } = await import('react');
  return {
    useAuth: () => ({
      user: { id: useSyncExternalStore(
        (listener: () => void) => {
          auth.listeners.add(listener);
          return () => auth.listeners.delete(listener);
        },
        () => auth.userId,
      ) },
    }),
  };
});
let mountCount = 0;
vi.mock('@/routes/lazy-pages', async (importOriginal) => {
  const { useState } = await import('react');
  const actual = await importOriginal<typeof import('@/routes/lazy-pages')>();
  return {
    ...actual,
    KitBuilderPage: () => {
      const [instance] = useState(() => ++mountCount);
      return <div data-testid="editor-instance">{instance}</div>;
    },
  };
});

import { toolsRoutes } from '@/routes/tools-routes';

describe('Kit Maker route lifecycle', () => {
  it('não reaproveita autosave/histórico ao navegar entre kit, landing e outro kit', () => {
    auth.userId = 'user-A';
    mountCount = 0;
    render(
      <MemoryRouter initialEntries={['/montar-kit?kit=A']}>
        <Link to="/montar-kit">Início</Link>
        <Link to="/montar-kit?kit=B">Abrir B</Link>
        <Routes>{toolsRoutes}</Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('editor-instance')).toHaveTextContent('1');
    fireEvent.click(screen.getByText('Início'));
    expect(screen.getByTestId('editor-instance')).toHaveTextContent('2');
    fireEvent.click(screen.getByText('Abrir B'));
    expect(screen.getByTestId('editor-instance')).toHaveTextContent('3');
  });

  it('desmonta o editor anterior quando a conta muda sem navegação', () => {
    auth.userId = 'user-A';
    mountCount = 0;
    render(
      <MemoryRouter initialEntries={['/montar-kit?kit=A']}>
        <Routes>{toolsRoutes}</Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('editor-instance')).toHaveTextContent('1');
    act(() => {
      auth.userId = 'user-B';
      auth.listeners.forEach((listener) => listener());
    });
    expect(screen.getByTestId('editor-instance')).toHaveTextContent('2');
  });
});
