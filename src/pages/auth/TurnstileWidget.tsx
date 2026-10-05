import { useEffect, useRef } from 'react';

/**
 * Cloudflare Turnstile — anti-bot invisível no login.
 *
 * Ativação (as duas pontas precisam estar configuradas):
 *   - Cliente: `VITE_TURNSTILE_SITE_KEY` (site key pública — aparece no bundle
 *     por design, não é segredo).
 *   - Edge `check-login`: secret `TURNSTILE_SECRET_KEY` no Supabase. Quando a
 *     secret existe, a edge EXIGE `turnstile_token` válido no body.
 *
 * Sem site key o componente não renderiza nada e nenhum script externo é
 * carregado — feature totalmente desligada por omissão de env.
 */
export const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '') as string;

interface TurnstileApi {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      'expired-callback'?: () => void;
      'error-callback'?: () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('turnstile_script_failed'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function TurnstileWidget({ onToken }: { onToken: (token: string | null) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  // Ref evita re-render do widget quando o pai muda a identidade do callback.
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !hostRef.current) return;
    let cancelled = false;
    let widgetId: string | null = null;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !hostRef.current || !window.turnstile) return;
        widgetId = window.turnstile.render(hostRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
        });
      })
      .catch(() => onTokenRef.current(null));

    return () => {
      cancelled = true;
      if (widgetId) window.turnstile?.remove(widgetId);
    };
  }, []);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={hostRef} className="flex justify-center" data-testid="turnstile-widget" />;
}
