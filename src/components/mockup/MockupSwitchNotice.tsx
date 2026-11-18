/**
 * Aviso de manutenção da geração de mockup + estado do switch que o governa.
 *
 * O dono controla a linha `edge_generate_mockup` em
 * `public.system_kill_switches`: `enabled = false` + `legacy_message` faz o
 * vendedor ver a mensagem aqui, em vez de um erro cru da edge.
 */
import { KillSwitchNotice } from '@/components/system/KillSwitchNotice';
import {
  useKillSwitchNotice,
  type KillSwitchNoticeResult,
} from '@/hooks/system/useKillSwitchNotice';

/** Switches de `system_kill_switches` que governam a edge `generate-mockup`. */
export const MOCKUP_KILL_SWITCHES = ['edge_generate_mockup'] as const;

/** Estado dos switches de mockup — para desabilitar o botão de gerar. */
export function useMockupKillSwitch(): KillSwitchNoticeResult {
  return useKillSwitchNotice(MOCKUP_KILL_SWITCHES);
}

/** Aviso (texto do banco) exibido ANTES de o usuário tentar gerar. */
export function MockupSwitchNotice({ className }: { className?: string }) {
  return <KillSwitchNotice switchNames={MOCKUP_KILL_SWITCHES} className={className} />;
}
