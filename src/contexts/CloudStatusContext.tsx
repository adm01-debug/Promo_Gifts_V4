/**
 * CloudStatusContext — provedor singleton de status do backend.
 *
 * PROBLEMA (corrigido 2026-07-17):
 * `CloudStatusBanner` e `CloudStatusDot` eram montados simultaneamente em App.tsx
 * e cada um instanciava `useCloudStatus()` internamente → 2 timers de polling
 * independentes + 2 backoff schedulers independentes.
 * Embora o módulo cloud-status.ts coalesça chamadas HTTP via `inFlight`, os
 * timers rodavam em duplicata — dobrando a frequência de scheduling e consumindo
 * recursos desnecessariamente durante incidentes.
 *
 * SOLUÇÃO:
 * Extrair o hook para um Provider que monta 1× no App.tsx. Os componentes
 * filhos consomem via `useCloudStatusContext()` → zero instâncias adicionais do scheduler.
 *
 * E131 (2026-10-18): `useCloudStatus()` era chamado condicionalmente em
 * `useCloudStatusContext()` (fallback fora do provider) — violação de
 * react-hooks/rules-of-hooks e potencial React #310. Substituído por default
 * estático no createContext: fora do provider, o hook retorna o estado inicial
 * `healthy` / sem polling. Callers que precisam de polling real devem envolver
 * com `<CloudStatusProvider>`.
 *
 * E136 (2026-10-18): Provider value envolvido em useMemo para evitar re-render
 * da árvore toda a cada re-render do provider.
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useCloudStatus } from '@/hooks/ui/useCloudStatus';
import type { CloudStatus, CloudStatusSnapshot } from '@/lib/cloud-status';

interface CloudStatusContextValue {
  status: CloudStatus;
  snapshot: CloudStatusSnapshot | null;
  retry: () => Promise<void>;
  isChecking: boolean;
}

const DEFAULT_CLOUD_STATUS: CloudStatusContextValue = {
  status: 'healthy',
  snapshot: null,
  retry: async () => {},
  isChecking: false,
};

const CloudStatusContext = createContext<CloudStatusContextValue>(DEFAULT_CLOUD_STATUS);

/**
 * Wraps children with a single cloud-status scheduler.
 * Place high in the component tree (App.tsx) to cover Banner + Dot.
 */
export function CloudStatusProvider({ children }: { children: ReactNode }) {
  const { status, snapshot, retry, isChecking } = useCloudStatus();
  const value = useMemo<CloudStatusContextValue>(
    () => ({ status, snapshot, retry, isChecking }),
    [status, snapshot, retry, isChecking],
  );
  return <CloudStatusContext.Provider value={value}>{children}</CloudStatusContext.Provider>;
}

/**
 * Consumes cloud status from the nearest `CloudStatusProvider`.
 * Outside a provider returns the static default (status='healthy', no polling).
 * Wrap with <CloudStatusProvider> if live polling is needed.
 */
export function useCloudStatusContext(): CloudStatusContextValue {
  return useContext(CloudStatusContext);
}
