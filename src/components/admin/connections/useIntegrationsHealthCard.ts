/**
 * useIntegrationsHealthCard — estado, leitura e ações do IntegrationsHealthCard.
 * Extraído de IntegrationsHealthCard.tsx para manter os arquivos sob o limite de
 * 500 linhas do gate de tamanho. É extração pura: mesmas chamadas, mesma ordem,
 * mesmas mensagens e mesmo tratamento de erro do componente original.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toErrorMessage } from '@/lib/to-error-message';
import { toast } from 'sonner';
import { useCredentialsSourceFilter, resolveSource } from './CredentialsSourceFilterContext';
import {
  fetchPendingDestructiveCounts,
  type PendingDestructiveCounts,
} from './pendingDestructiveCounts';
import type { SecretStatus } from '@/hooks/admin';
import { invokeEdge } from '@/lib/edge/safeInvokeCall';

/** Tons aceitos pelo <Metric> do IntegrationsHealthCard. */
export type MetricTone = 'default' | 'destructive' | 'success' | 'warning';

export interface HealthData {
  activeWebhooks: number;
  totalWebhooks: number;
  successRate24h: number | null;
  totalDeliveries24h: number;
  lastSuccessAt: string | null;
  failingConnections: number;
  mcpKeysUsed24h: number;
  staleSecrets: number; // secrets sem rotação há >90 dias (ou nunca rotacionados, com webhooks ativos)
  autoDisabledWebhooks: number;
  lastAutoTestAt: string | null;
  autoTestOkLastHour: number;
  autoTestFailLastHour: number;
}

export async function fetchHealth(): Promise<HealthData> {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const sinceLastHour = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: activeWebhooks },
    { count: totalWebhooks },
    { data: deliveries24h },
    { data: lastSuccess },
    { count: failingConnections },
    { count: mcpKeysUsed24h },
    { data: rotations },
    { count: autoDisabledWebhooks },
  ] = await Promise.all([
    supabase
      .from('outbound_webhooks')
      .select('id', { count: 'exact', head: true })
      .eq('active', true),
    supabase.from('outbound_webhooks').select('id', { count: 'exact', head: true }),
    supabase.from('webhook_deliveries').select('success').gte('delivered_at', since24h),
    supabase
      .from('webhook_deliveries')
      .select('delivered_at')
      .eq('success', true)
      .order('delivered_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('external_connections')
      .select('id', { count: 'exact', head: true })
      .eq('last_test_ok', false),
    supabase
      .from('mcp_api_keys')
      .select('id', { count: 'exact', head: true })
      .gte('last_used_at', since24h)
      .is('revoked_at', null),
    supabase
      .from('secret_rotation_log')
      .select('secret_name, rotated_at')
      .order('rotated_at', { ascending: false }),
    supabase
      .from('outbound_webhooks')
      .select('id', { count: 'exact', head: true })
      .not('auto_disabled_at', 'is', null),
  ]);

  // Auto-test stats (cron-triggered runs in the last hour + most recent timestamp)
  const [{ data: autoTestRecent }, { data: lastAutoTest }] = await Promise.all([
    supabase
      .from('connection_test_history')
      .select('success')
      .eq('triggered_by', 'cron')
      .gte('tested_at', sinceLastHour),
    supabase
      .from('connection_test_history')
      .select('tested_at')
      .eq('triggered_by', 'cron')
      .order('tested_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const total = deliveries24h?.length ?? 0;
  const success = deliveries24h?.filter((d) => d.success).length ?? 0;
  const rate = total > 0 ? (success / total) * 100 : null;

  // Últimas rotações por nome de secret
  const lastBySecret = new Map<string, string>();
  for (const r of rotations ?? []) {
    if (!lastBySecret.has(r.secret_name)) lastBySecret.set(r.secret_name, r.rotated_at);
  }
  const staleSecrets = Array.from(lastBySecret.values()).filter((t) => t < ninetyDaysAgo).length;

  return {
    activeWebhooks: activeWebhooks ?? 0,
    totalWebhooks: totalWebhooks ?? 0,
    successRate24h: rate,
    totalDeliveries24h: total,
    lastSuccessAt: lastSuccess?.delivered_at ?? null,
    failingConnections: failingConnections ?? 0,
    mcpKeysUsed24h: mcpKeysUsed24h ?? 0,
    staleSecrets,
    autoDisabledWebhooks: autoDisabledWebhooks ?? 0,
    lastAutoTestAt: lastAutoTest?.tested_at ?? null,
    autoTestOkLastHour: (autoTestRecent ?? []).filter((r) => r.success).length,
    autoTestFailLastHour: (autoTestRecent ?? []).filter((r) => !r.success).length,
  };
}

export function useIntegrationsHealthCard(secrets: SecretStatus[]) {
  // BUG-HEAD-GUARD FIX (2026-06-23): 5 HEAD requests sem JWT validado.
  const { rolesLoaded, isAdmin } = useAuth();
  const [auditing, setAuditing] = useState(false);
  const [runningRealActions, setRunningRealActions] = useState(false);
  const [realActionsConfirmOpen, setRealActionsConfirmOpen] = useState(false);
  const [pendingDestructiveCounts, setPendingDestructiveCounts] =
    useState<PendingDestructiveCounts | null>(null);
  const { setFilter } = useCredentialsSourceFilter();
  const sourceCounts = useMemo(() => {
    let db = 0,
      env = 0,
      none = 0;
    for (const s of secrets) {
      const src = resolveSource(s);
      if (src === 'db') db++;
      else if (src === 'env') env++;
      else none++;
    }
    return { db, env, none, total: secrets.length };
  }, [secrets]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['integrations-health'],
    queryFn: fetchHealth,
    enabled: rolesLoaded && Boolean(isAdmin),
    refetchInterval: 60_000,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const handleAudit = async () => {
    setAuditing(true);
    try {
      const { data: report, error } = await invokeEdge<{
        score: number;
        passed: number;
        total: number;
      }>('connections-hub-audit');
      if (error) throw new Error(error.message);
      const score = report?.score ?? 0;
      const passed = report?.passed ?? 0;
      const total = report?.total ?? 0;
      const msg = `Auditoria: ${score}/10 (${passed}/${total} checks)`;
      if (score >= 8) toast.success(msg);
      else if (score >= 5) toast.warning(msg);
      else toast.error(msg);
    } catch (err) {
      toast.error(`Falha na auditoria: ${toErrorMessage(err)}`);
    } finally {
      setAuditing(false);
    }
  };

  // P0 (QA): "Rodar auditoria" é só leitura por padrão (edge function não chama mais
  // as RPCs reais sem confirmação). Reenviar webhooks falhados e apagar logs antigos
  // só acontece via este fluxo, com confirmação explícita do usuário sobre o impacto.
  const handleOpenRealActionsConfirm = async () => {
    setRunningRealActions(true);
    try {
      const counts = await fetchPendingDestructiveCounts();
      setPendingDestructiveCounts(counts);
      setRealActionsConfirmOpen(true);
    } catch (err) {
      toast.error(`Falha ao calcular impacto: ${toErrorMessage(err)}`);
    } finally {
      setRunningRealActions(false);
    }
  };

  const handleConfirmRealActions = async () => {
    setRunningRealActions(true);
    try {
      const { error } = await invokeEdge('connections-hub-audit', {
        body: { confirm: true, action: 'retry_and_cleanup' },
      });
      if (error) throw new Error(error.message);
      toast.success('Retry de webhooks e limpeza de logs executados.');
      refetch();
    } catch (err) {
      toast.error(`Falha ao executar: ${toErrorMessage(err)}`);
    } finally {
      setRunningRealActions(false);
    }
  };

  const successTone: MetricTone =
    data?.successRate24h === null
      ? 'default'
      : (data?.successRate24h ?? 0) >= 95
        ? 'success'
        : (data?.successRate24h ?? 0) >= 70
          ? 'warning'
          : 'destructive';

  const failingTone: MetricTone = (data?.failingConnections ?? 0) > 0 ? 'destructive' : 'success';

  return {
    data,
    isLoading,
    isFetching,
    refetch,
    auditing,
    runningRealActions,
    realActionsConfirmOpen,
    setRealActionsConfirmOpen,
    pendingDestructiveCounts,
    sourceCounts,
    setFilter,
    handleAudit,
    handleOpenRealActionsConfirm,
    handleConfirmRealActions,
    successTone,
    failingTone,
  };
}
