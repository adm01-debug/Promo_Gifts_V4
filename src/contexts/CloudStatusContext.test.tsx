import type { PropsWithChildren } from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CloudStatusProvider, useCloudStatusContext } from './CloudStatusContext';

vi.mock('@/hooks/ui/useCloudStatus', async () => {
  const React = await import('react');

  return {
    useCloudStatus: () => {
      const [status] = React.useState<'degraded'>('degraded');
      return {
        status,
        snapshot: null,
        retry: () => Promise.resolve(),
        isChecking: false,
      };
    },
  };
});

describe('CloudStatusContext', () => {
  it('mantém o consumo estável ao montar e desmontar o provider', () => {
    let withProvider = false;
    const wrapper = ({ children }: PropsWithChildren) =>
      withProvider ? <CloudStatusProvider>{children}</CloudStatusProvider> : <>{children}</>;

    const { result, rerender } = renderHook(() => useCloudStatusContext(), { wrapper });

    expect(result.current.status).toBe('healthy');
    expect(result.current.snapshot).toBeNull();

    withProvider = true;
    expect(() => rerender()).not.toThrow();
    expect(result.current.status).toBe('degraded');

    withProvider = false;
    expect(() => rerender()).not.toThrow();
    expect(result.current.status).toBe('healthy');
  });
});
