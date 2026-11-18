/**
 * useKillSwitchNotice — traduz o estado de kill-switches de
 * `public.system_kill_switches` no aviso que o USUÁRIO FINAL deve ver.
 *
 * Semântica medida na própria tabela (coluna `reason` da linha
 * `edge_generate_mockup`): «Ativo intencional: … Em incidente, set
 * enabled=false (usuários passam a ver legacy_message)». Ou seja,
 * `enabled = true` é o estado operacional normal e NÃO gera aviso; o aviso
 * nasce quando o dono desliga o switch (`enabled = false`) E há
 * `legacy_message` configurada. Sem mensagem não há o que mostrar — o texto
 * nunca é inventado no front.
 *
 * Fail-open: qualquer falha de leitura devolve lista vazia (nenhum aviso,
 * nada bloqueado). Telemetria não pode travar venda.
 *
 * Cache: react-query com `staleTime` de CACHE_TIMES.REALTIME (60s) — o mesmo
 * TTL de memória do kill-switch-client, que ainda guarda 5min em
 * localStorage. Sem `refetchInterval`: nada de polling.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getKillSwitchState } from '@/lib/external-db/kill-switch-client';
import { isSupabaseLighthousePlaceholder } from '@/lib/env/supabase-placeholder';
import { CACHE_TIMES, GC_TIMES } from '@/lib/query-config';

export interface KillSwitchNoticeItem {
  switchName: string;
  /** Texto vindo de `system_kill_switches.legacy_message` (nunca hardcoded). */
  message: string;
}

export interface KillSwitchNoticeResult {
  /** Um item por switch desligado COM mensagem; vazio quando tudo opera. */
  notices: KillSwitchNoticeItem[];
  /** true quando há ao menos um aviso — use para desabilitar a ação. */
  isBlocked: boolean;
  /** Mensagem do primeiro aviso, ou null. Conveniência para tooltip/prop. */
  blockedMessage: string | null;
}

const EMPTY_NOTICES: KillSwitchNoticeItem[] = [];

async function readNotices(switchNames: string[]): Promise<KillSwitchNoticeItem[]> {
  const states = await Promise.all(
    switchNames.map(async (switchName) => ({
      switchName,
      state: await getKillSwitchState(switchName),
    })),
  );

  const notices: KillSwitchNoticeItem[] = [];
  for (const { switchName, state } of states) {
    if (state.enabled) continue;
    const message = typeof state.message === 'string' ? state.message.trim() : '';
    if (message.length === 0) continue;
    notices.push({ switchName, message });
  }
  return notices;
}

/**
 * @param switchNames nomes em `system_kill_switches.switch_name`. O hook é
 *   genérico: quem chama decide quais switches governam aquela tela.
 */
export function useKillSwitchNotice(switchNames: readonly string[]): KillSwitchNoticeResult {
  const names = useMemo(() => Array.from(new Set(switchNames)).sort(), [switchNames]);

  const { data } = useQuery({
    queryKey: ['kill-switch-notice', names],
    queryFn: () => readNotices(names),
    enabled: names.length > 0 && !isSupabaseLighthousePlaceholder(),
    staleTime: CACHE_TIMES.REALTIME,
    gcTime: GC_TIMES.DEFAULT,
    // Fail-open imediato: não insistir numa leitura que já falhou.
    retry: false,
  });

  const notices = data ?? EMPTY_NOTICES;
  return {
    notices,
    isBlocked: notices.length > 0,
    blockedMessage: notices[0]?.message ?? null,
  };
}
