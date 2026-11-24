/**
 * Prova que `/magazine/print` é uma rota PÚBLICA (não exige login).
 *
 * ACH-046: o link de impressão gerado em PublicMagazineView abre
 * `/magazine/print?token=…`. Se a rota ficar dentro do ProtectedRoute,
 * o cliente anônimo é redirecionado para /auth e não imprime o catálogo.
 *
 * Este teste trava a rota em `public-routes`, de modo que qualquer PR que
 * mova `/magazine/print` de volta para o ProtectedRoute falha aqui.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes } from 'react-router-dom';
import { publicRoutes } from '../public-routes';

vi.mock('@/pages/magazine/components/MagazineErrorBoundary', () => ({
  MagazineErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="magazine-boundary">{children}</div>
  ),
}));

vi.mock('../lazy-pages', async () => {
  const React = await import('react');
  return {
    Auth: () => React.createElement('div', { 'data-testid': 'auth' }, 'Auth'),
    ResetPassword: () => React.createElement('div', null, 'ResetPassword'),
    ForgotPasswordConfirmation: () => React.createElement('div', null, 'Forgot'),
    SSOCallbackPage: () => React.createElement('div', null, 'SSO'),
    Unauthorized: () => React.createElement('div', null, 'Unauthorized'),
    TermsPage: () => React.createElement('div', null, 'Termos'),
    PrivacyPage: () => React.createElement('div', null, 'Privacidade'),
    PublicMagazineView: () => React.createElement('div', null, 'Revista'),
    MagazinePrintPage: () =>
      React.createElement('div', { 'data-testid': 'magazine-print' }, 'Impressao'),
  };
});

describe('publicRoutes — impressão de revista sem login (ACH-046)', () => {
  it('/magazine/print renderiza a tela de impressão sem autenticação', () => {
    render(
      <MemoryRouter initialEntries={['/magazine/print?token=abc']}>
        <Routes>{publicRoutes}</Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('magazine-print')).toBeInTheDocument();
    expect(screen.queryByTestId('auth')).not.toBeInTheDocument();
  });

  it('/magazine/print continua envolvida pelo MagazineErrorBoundary', () => {
    render(
      <MemoryRouter initialEntries={['/magazine/print?token=abc']}>
        <Routes>{publicRoutes}</Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('magazine-boundary')).toBeInTheDocument();
  });
});
