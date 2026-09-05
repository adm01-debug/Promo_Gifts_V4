// src/lib/sw-register.ts

import { logger } from '@/lib/logger';
import { swConfirmedStaleUrls } from '@/lib/chunk-recovery';

// ── Reload de recuperação com cap storage-free ────────────────────────────────
// Mesmo contrato do boot guard inline em index.html: contador de tentativas na
// URL (__bare) + epoch da 1ª tentativa (__bart). Sobrevive a reloads sem
// sessionStorage e fecha o loop que existia aqui: o guard em memória
// (_staleChunkReloadScheduled) zerava a cada reload, então com o edge do
// Vercel ainda servindo HTML antigo o SW disparava reload → 503 → reload …
// sem fim. O SW lê __bare na navegação e busca /index.html com cache-bust.
const RELOAD_PARAM = '__bare';
const RELOAD_TS_PARAM = '__bart';
const RELOAD_MAX = 2;
const RELOAD_WINDOW_MS = 20_000;
const RELOAD_DELAY_MS = 300;
let _reloadScheduled = false;

/**
 * Agenda um reload de recuperação de chunk. Retorna false quando o cap
 * (2 reloads em 20s) foi atingido — o caller deve deixar o erro subir para
 * o ErrorBoundary/GlobalCatcher em vez de insistir.
 */
export function scheduleStaleChunkReload(): boolean {
  if (_reloadScheduled) return true;
  let url: URL;
  try {
    url = new URL(window.location.href);
  } catch {
    _reloadScheduled = true;
    window.setTimeout(() => window.location.reload(), RELOAD_DELAY_MS);
    return true;
  }
  const now = Date.now();
  let n = parseInt(url.searchParams.get(RELOAD_PARAM) ?? '', 10);
  let firstAt = parseInt(url.searchParams.get(RELOAD_TS_PARAM) ?? '', 10);
  if (!Number.isFinite(n) || n < 0) n = 0;
  if (!Number.isFinite(firstAt) || firstAt < 0) firstAt = 0;
  if (n === 0 || !firstAt || now - firstAt > RELOAD_WINDOW_MS) {
    n = 0;
    firstAt = now;
  }
  if (n >= RELOAD_MAX) return false;
  url.searchParams.set(RELOAD_PARAM, String(n + 1));
  url.searchParams.set(RELOAD_TS_PARAM, String(firstAt));
  _reloadScheduled = true;
  // 300ms: deixa o React registrar o erro (Sentry) antes de sair da página.
  window.setTimeout(() => window.location.replace(url.toString()), RELOAD_DELAY_MS);
  return true;
}

/**
 * Registra Service Worker para PWA
 *
 * Deve ser chamado no main.tsx após setupLocale()
 */
export async function registerServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      logger.log('✅ Service Worker registrado:', registration.scope);

      // Checar atualizações
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              logger.log('🔄 Nova versão do Service Worker disponível');
              // Reload automático removido para evitar auto-refresh intermitente.
              // O SW v3.2.0 usa Network First para navegação, garantindo HTML
              // atualizado sem precisar recarregar a aba atual.
            }
          });
        }
      });

      // ── SW_STALE_CHUNK recovery listener ──────────────────────────────────
      // Escuta mensagens do SW. Quando um chunk hashed retorna 404 do CDN
      // (deploy novo substituiu os hashes dos chunks), o SW:
      //   1. Invalida /index.html do cache
      //   2. Envia SW_STALE_CHUNK para todos os tabs abertos
      // Ao receber, recarregamos a página para obter o novo HTML com os
      // hashes corretos. O reload é throttled (no máximo 1 vez por 10s)
      // para evitar loops de refresh em caso de problemas persistentes.
      //
      // Diferença vs. controllerchange: este reload só ocorre quando o
      // app está QUEBRADO (chunk 404), não em toda atualização do SW.
      navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
        if (event.data?.type === 'SW_STALE_CHUNK') {
          // BUG-CR-2 FIX: registra URL stale ANTES do reload para que
          // probeAsset() pule o HEAD request — eliminando as mensagens
          // "Falha ao carregar Buscar: HEAD" no DevTools do browser.
          // Race window: se lazyWithRetry.attemptChunkRecovery() disparar
          // antes do reload em 300ms, encontrará a URL no set e skip o probe.
          const staleUrl = event.data?.url as string | undefined;
          if (staleUrl) {
            swConfirmedStaleUrls.add(staleUrl);
            logger.log('[SW] chunk stale confirmado — URL registrada:', staleUrl);
          }
          logger.log(
            '🔄 [SW] Chunk desatualizado detectado — recarregando para obter chunks atualizados:',
            event.data.url,
          );
          if (!scheduleStaleChunkReload()) {
            logger.error(
              '[SW] cap de reloads de recuperação atingido — HTML do edge continua obsoleto',
              { url: staleUrl },
            );
          }
        }
      });

      logger.log('✅ Service Worker configurado: Network First + stale chunk recovery ativo');
    } catch (error) {
      logger.error('❌ Falha ao registrar Service Worker:', error);
    }
  } else {
    logger.warn('⚠️ Service Workers não suportados neste navegador');
  }
}

/**
 * Desregistra Service Worker (útil para debug)
 */
export async function unregisterServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
      logger.log('🗑️ Service Worker desregistrado');
    }
  }
}

/**
 * Verifica se app está instalado como PWA.
 *
 * BUG-SW-REG-1 FIX: window.navigator.standalone é uma propriedade não-standard
 * exclusiva do iOS Safari — TypeScript (TS2339) e Chrome DevTools a flagam como
 * inexistente no tipo Navigator. Fix: acesso via type assertion seguro.
 *
 * Cobre todos os modos PWA registrados no manifest.json:
 *  - standalone + minimal-ui (Android Chrome, Edge, Samsung Internet)
 *  - fullscreen          (algumas versões do Chrome)
 *  - window-controls-overly (Chrome desktop)
 *  - navigator.standalone     (iOS Safari — não-standard, acessado com cast)
 */
export function isPWA(): boolean {
  const standaloneQuery =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches;

  // iOS Safari: navigator.standalone é boolean quando instalado como PWA.
  // Cast necessário: propriedade não-standard ausente do tipo Navigator TS.
  const iosStandalone = Boolean(
    (window.navigator as unknown as Record<string, unknown>).standalone,
  );

  return standaloneQuery || iosStandalone;
}

/**
 * Solicita permissão para notificações (para futura implementação)
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    logger.warn('⚠️ Notificações não suportadas');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}
