/**
 * KillSwitchNotice — aviso visível ao usuário final quando um kill-switch
 * está DESLIGADO e o banco traz uma `legacy_message`.
 *
 * O texto é sempre o do banco; aqui só existe a moldura (título e cor de
 * atenção). Não renderiza nada quando os switches estão operando.
 */
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useKillSwitchNotice } from '@/hooks/system/useKillSwitchNotice';
import { cn } from '@/lib/utils';

interface KillSwitchNoticeProps {
  /** Nomes em `system_kill_switches.switch_name` que governam esta tela. */
  switchNames: readonly string[];
  className?: string;
}

export function KillSwitchNotice({ switchNames, className }: KillSwitchNoticeProps) {
  const { notices } = useKillSwitchNotice(switchNames);

  if (notices.length === 0) return null;

  return (
    <Alert
      aria-live="polite"
      data-testid="kill-switch-notice"
      className={cn('border-warning/50 bg-warning/10', className)}
    >
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertTitle className="text-warning">Aviso do sistema</AlertTitle>
      <AlertDescription className="space-y-1">
        {notices.map((notice) => (
          <p key={notice.switchName}>{notice.message}</p>
        ))}
      </AlertDescription>
    </Alert>
  );
}
