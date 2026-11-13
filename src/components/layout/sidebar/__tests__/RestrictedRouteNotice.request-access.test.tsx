/**
 * PM-06 — botão "Solicitar Acesso" do aviso de rota restrita na sidebar
 * precisa disparar requestDevAccess com a rota bloqueada e dar feedback.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const requestDevAccess = vi.fn();
const getThrottleStatus = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();
const toastWarning = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'vendedor@example.com' },
    isAdmin: false,
    isDev: false,
    rolesLoaded: true,
  }),
}));
vi.mock('@/lib/access/request-dev-access', () => ({
  requestDevAccess: (...args: unknown[]) => requestDevAccess(...args),
  getThrottleStatus: (...args: unknown[]) => getThrottleStatus(...args),
  DEV_ACCESS_CONTACT_EMAIL: 'dev@example.com',
}));
vi.mock('sonner', () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
    warning: (...a: unknown[]) => toastWarning(...a),
  },
}));

import { RestrictedRouteNotice } from '../RestrictedRouteNotice';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RestrictedRouteNotice isCollapsed={false} />
    </MemoryRouter>,
  );
}

describe('RestrictedRouteNotice — Solicitar Acesso', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getThrottleStatus.mockReturnValue({ throttled: false, retryInSeconds: 0 });
  });

  it('envia a solicitação com a rota bloqueada e mostra sucesso', async () => {
    requestDevAccess.mockResolvedValue({ ok: true });
    renderAt('/admin/telemetria');

    fireEvent.click(screen.getByRole('button', { name: /solicitar acesso/i }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(requestDevAccess).toHaveBeenCalledWith({
      userId: 'u1',
      userEmail: 'vendedor@example.com',
      blockedPath: '/admin/telemetria',
    });
  });

  it('mostra erro quando a solicitação falha', async () => {
    requestDevAccess.mockResolvedValue({ ok: false, error: 'boom' });
    renderAt('/admin/telemetria');

    fireEvent.click(screen.getByRole('button', { name: /solicitar acesso/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('respeita o throttle sem chamar requestDevAccess', () => {
    getThrottleStatus.mockReturnValue({ throttled: true, retryInSeconds: 120 });
    renderAt('/admin/telemetria');

    fireEvent.click(screen.getByRole('button', { name: /solicitar acesso/i }));

    expect(toastWarning).toHaveBeenCalled();
    expect(requestDevAccess).not.toHaveBeenCalled();
  });
});
