/**
 * TurnstileWidget — ciclo de vida do desafio anti-bot (validação exaustiva
 * 2026-10). O script da Cloudflare é simulado: o teste aciona o `onload` do
 * <script> que o loader injeta no <head> e instala um `window.turnstile`
 * fake para dirigir callbacks.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import type { TurnstileWidgetHandle } from '../TurnstileWidget';

type TurnstileCallbacks = {
  callback: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
};

let lastRender: { el: HTMLElement; opts: TurnstileCallbacks } | null = null;

function installFakeTurnstile() {
  const renderMock = vi.fn((el: HTMLElement, opts: TurnstileCallbacks) => {
    lastRender = { el, opts };
    return 'widget-1';
  });
  const resetMock = vi.fn();
  const removeMock = vi.fn();
  window.turnstile = { render: renderMock, reset: resetMock, remove: removeMock };
  return { renderMock, resetMock, removeMock };
}

async function fireScriptOnload() {
  const script = document.head.querySelector<HTMLScriptElement>(
    'script[src*="challenges.cloudflare.com"]',
  );
  expect(script).not.toBeNull();
  await act(async () => {
    script!.onload?.(new Event('load'));
    await Promise.resolve();
  });
}

async function importFresh() {
  vi.resetModules();
  return import('../TurnstileWidget');
}

beforeEach(() => {
  lastRender = null;
  vi.unstubAllEnvs();
  delete window.turnstile;
  document.head
    .querySelectorAll('script[src*="challenges.cloudflare.com"]')
    .forEach((s) => s.remove());
});

afterEach(() => {
  vi.unstubAllEnvs();
  delete window.turnstile;
});

describe('TurnstileWidget', () => {
  it('sem site key → não renderiza e não injeta script', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '');
    const { TurnstileWidget } = await importFresh();
    const { container } = render(<TurnstileWidget onToken={vi.fn()} />);
    expect(container.firstChild).toBeNull();
    expect(document.head.querySelector('script[src*="challenges.cloudflare.com"]')).toBeNull();
  });

  it('com site key → injeta script e renderiza widget com a sitekey', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site-key-1');
    const { TurnstileWidget } = await importFresh();
    const fake = installFakeTurnstile();
    render(<TurnstileWidget onToken={vi.fn()} />);
    expect(screen.getByTestId('turnstile-widget')).toBeInTheDocument();
    await fireScriptOnload();
    await waitFor(() => expect(fake.renderMock).toHaveBeenCalled());
    expect(lastRender?.opts.sitekey).toBe('site-key-1');
  });

  it('token do callback vai para onToken', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site-key-1');
    const { TurnstileWidget } = await importFresh();
    installFakeTurnstile();
    const onToken = vi.fn();
    render(<TurnstileWidget onToken={onToken} />);
    await fireScriptOnload();
    await waitFor(() => expect(lastRender).not.toBeNull());
    act(() => lastRender!.opts.callback('tok-abc'));
    expect(onToken).toHaveBeenCalledWith('tok-abc');
  });

  it('expired/error callbacks emitem null', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site-key-1');
    const { TurnstileWidget } = await importFresh();
    installFakeTurnstile();
    const onToken = vi.fn();
    render(<TurnstileWidget onToken={onToken} />);
    await fireScriptOnload();
    await waitFor(() => expect(lastRender).not.toBeNull());
    act(() => lastRender!.opts['expired-callback']?.());
    expect(onToken).toHaveBeenLastCalledWith(null);
    act(() => lastRender!.opts['error-callback']?.());
    expect(onToken).toHaveBeenLastCalledWith(null);
  });

  it('reset() chama turnstile.reset no widget id', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site-key-1');
    const { TurnstileWidget } = await importFresh();
    const fake = installFakeTurnstile();
    const ref = createRef<TurnstileWidgetHandle>();
    render(<TurnstileWidget ref={ref} onToken={vi.fn()} />);
    await fireScriptOnload();
    await waitFor(() => expect(lastRender).not.toBeNull());
    act(() => ref.current!.reset());
    expect(fake.resetMock).toHaveBeenCalledWith('widget-1');
  });

  it('getToken() resolve o PRÓXIMO token (não vai para onToken)', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site-key-1');
    const { TurnstileWidget } = await importFresh();
    installFakeTurnstile();
    const onToken = vi.fn();
    const ref = createRef<TurnstileWidgetHandle>();
    render(<TurnstileWidget ref={ref} onToken={onToken} />);
    await fireScriptOnload();
    await waitFor(() => expect(lastRender).not.toBeNull());
    let resolved: string | null | undefined;
    act(() => {
      void ref.current!.getToken().then((t) => {
        resolved = t;
      });
    });
    act(() => lastRender!.opts.callback('tok-segundo-desafio'));
    await vi.waitFor(() => expect(resolved).toBe('tok-segundo-desafio'));
    expect(onToken).not.toHaveBeenCalled();
  });

  it('getToken() sem widget pronto → resolve null', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site-key-1');
    const { TurnstileWidget } = await importFresh();
    const ref = createRef<TurnstileWidgetHandle>();
    render(<TurnstileWidget ref={ref} onToken={vi.fn()} />);
    await expect(ref.current!.getToken()).resolves.toBeNull();
  });

  it('unmount remove o widget', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site-key-1');
    const { TurnstileWidget } = await importFresh();
    const fake = installFakeTurnstile();
    const { unmount } = render(<TurnstileWidget onToken={vi.fn()} />);
    await fireScriptOnload();
    await waitFor(() => expect(lastRender).not.toBeNull());
    unmount();
    expect(fake.removeMock).toHaveBeenCalledWith('widget-1');
  });
});
