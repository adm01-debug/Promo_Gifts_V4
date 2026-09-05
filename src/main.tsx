import './lib/console-filter';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { registerServiceWorker, scheduleStaleChunkReload } from '@/lib/sw-register';
import { installGlobalErrorHandlers } from '@/lib/error-reporter';
import { initSentry } from '@/lib/sentry';
import { initNavigationMetrics } from '@/lib/telemetry/navigationMetrics';
import { installSafeToast } from '@/lib/security/safeToast';
import { validateSupabaseConfig } from '@/integrations/supabase/runtime-validator';
import EnhancedErrorBoundary from '@/components/errors/EnhancedErrorBoundary';
import App from './App.tsx';
import './index.css';
import './styles/brand-tokens.css';
import './styles/missing-root-tokens.css';
import './styles/diversity-overrides.css';

validateSupabaseConfig();
initSentry();
initNavigationMetrics();
installGlobalErrorHandlers();
installSafeToast();

// ── Core Web Vitals monitoring (dev only) ─────────────────────────────────────
if (import.meta.env.DEV) {
  import('@/utils/performance-budget').then(({ initPerformanceBudget }) => {
    initPerformanceBudget();
  });
}

// ── Vite chunk-load recovery ─────────────────────────────────────────────────
// When Vercel deploys a new build, old chunk hashes are invalidated.
// Any user who has the app open will fail to lazy-load those stale chunks.
// `vite:preloadError` fires before React can catch it — we reload here
// so the user silently gets the latest version instead of a blank screen.
//
// Cap compartilhado com sw-register/index.html (contador __bare na URL, máx 2
// reloads em 20s, storage-free). O cooldown anterior de 10s em sessionStorage
// permitia 1 reload a cada 10s para sempre enquanto o edge servisse HTML antigo.
// Sem preventDefault: quando o cap estoura o erro segue para lazyWithRetry /
// GlobalCatcher, que mostram a tela de erro estável.
window.addEventListener('vite:preloadError', () => {
  scheduleStaleChunkReload();
});
// ─────────────────────────────────────────────────────────────────────────────

const root = document.getElementById('root');

if (!root) {
  throw new Error('Elemento root nao encontrado no DOM');
}

createRoot(root).render(
  <HelmetProvider>
    <EnhancedErrorBoundary>
      <App />
    </EnhancedErrorBoundary>
  </HelmetProvider>,
);

if (import.meta.env.PROD) {
  registerServiceWorker();
}
