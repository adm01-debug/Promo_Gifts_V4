import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from './AppRoutes';

vi.mock('@/lib/lazyWithRetry', async () => {
  const React = await import('react');
  const { Outlet } = await import('react-router-dom');
  return {
    lazyWithRetry: (_loader: () => Promise<unknown>) => {
      const Mock = () =>
        React.createElement('div', { 'data-testid': 'lazy-shell' }, React.createElement(Outlet));
      return Mock;
    },
  };
});

vi.mock('@/components/layout/ProtectedRoute', async () => {
  const React = await import('react');
  const { Outlet } = await import('react-router-dom');
  return { ProtectedRoute: () => React.createElement(Outlet) };
});

vi.mock('./public-routes', async () => {
  const React = await import('react');
  const { Route } = await import('react-router-dom');
  return {
    publicRoutes: React.createElement(Route, {
      path: '/auth',
      element: React.createElement('div', null, 'Auth'),
    }),
  };
});

vi.mock('./product-routes', () => ({ productRoutes: null }));
vi.mock('./quote-routes', () => ({ quoteRoutes: null }));
vi.mock('./admin-routes', () => ({ adminRoutes: null }));
vi.mock('./tools-routes', () => ({ toolsRoutes: null }));

vi.mock('./client-routes', async () => {
  const React = await import('react');
  const { Link, Route } = await import('react-router-dom');
  return {
    homeAndClientRoutes: React.createElement(
      React.Fragment,
      null,
      React.createElement(Route, {
        path: '/',
        element: React.createElement(Link, { to: '/clientes' }, 'Ir clientes'),
      }),
      React.createElement(Route, {
        path: '/clientes',
        element: React.createElement('div', null, 'Clientes'),
      }),
    ),
    notFoundRoute: React.createElement(Route, {
      path: '*',
      element: React.createElement('div', { 'data-testid': 'not-found' }, '404'),
    }),
  };
});

describe('AppRoutes navigation', () => {
  it('navigates across main routes without render errors', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Ir clientes')).toBeInTheDocument();
    await user.click(screen.getByText('Ir clientes'));
    expect(screen.getByText('Clientes')).toBeInTheDocument();
  });

  it('renders not found fallback for unknown routes', () => {
    render(
      <MemoryRouter initialEntries={['/rota-inexistente']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('not-found')).toBeInTheDocument();
  });
});
