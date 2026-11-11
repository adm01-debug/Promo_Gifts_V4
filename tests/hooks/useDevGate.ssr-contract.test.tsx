import { renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDevGate } from '@/hooks/admin/useDevGate';
import { devInfraGate } from '@/lib/system/dev-gate/DevInfraGate';

interface AuthProbe {
  roles: null | string[] | undefined;
  isDev: boolean;
  isLoading: boolean;
}

const auth = vi.hoisted((): { value: AuthProbe } => ({
  value: { roles: [], isDev: false, isLoading: false },
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth.value }));
vi.mock('@/lib/system/dev-gate/DevInfraGate', () => ({
  devInfraGate: { subscribe: vi.fn(() => () => {}), shouldShow: vi.fn(() => true) },
}));

beforeEach(() => {
  vi.clearAllMocks();
  auth.value = { roles: [], isDev: false, isLoading: false };
});

function ServerView() {
  const gate = useDevGate();
  return (
    <span>{`${gate.isAllowed ? 'allowed' : 'denied'}:${gate.isDev ? 'dev' : 'not-dev'}`}</span>
  );
}

describe('Dev Gate server rendering and defensive role boundary', () => {
  it.each([
    [true, false],
    [false, false],
    [true, true],
  ])('denies access before client mount for isDev=%s loading=%s', (isDev, isLoading) => {
    auth.value = { roles: ['dev'], isDev, isLoading };
    expect(renderToString(<ServerView />)).toContain('denied:not-dev');
    expect(devInfraGate.shouldShow).not.toHaveBeenCalled();
    expect(devInfraGate.subscribe).not.toHaveBeenCalled();
  });

  it.each([undefined, null, ['admin']])('normalizes the runtime roles value %j', (roles) => {
    auth.value = { roles, isDev: true, isLoading: false };
    const { result } = renderHook(() => useDevGate());
    expect(result.current.isAllowed).toBe(true);
    expect(devInfraGate.shouldShow).toHaveBeenCalledWith(roles ?? []);
  });
});
