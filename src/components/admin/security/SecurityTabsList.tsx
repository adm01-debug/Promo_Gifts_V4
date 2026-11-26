/**
 * SecurityTabsList — barra de abas de /admin/seguranca-acesso.
 *
 * Extraída da página para respeitar o ratchet de tamanho de arquivo
 * (`scripts/check-file-size-baseline.mjs`), que não permite crescimento de
 * `AdminSegurancaAcessoPage.tsx`. Mesmo markup, mesma ordem e mesmos rótulos de
 * antes — a única diferença é a aba "Bloqueios", que passa a existir aqui.
 */
import { BarChart3, Ban, History, KeySquare, Network, Siren, TrendingUp } from 'lucide-react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SecurityTabsListProps {
  ipCount: number;
}

export function SecurityTabsList({ ipCount }: SecurityTabsListProps) {
  return (
    <TabsList className="h-auto flex-wrap">
      <TabsTrigger value="anomalias">
        <Siren className="mr-1.5 h-3.5 w-3.5" /> Anomalias 24h
      </TabsTrigger>
      <TabsTrigger value="audit">
        <History className="mr-1.5 h-3.5 w-3.5" /> Auditoria
      </TabsTrigger>
      <TabsTrigger value="tokens">
        <KeySquare className="mr-1.5 h-3.5 w-3.5" /> Tokens suspeitos
      </TabsTrigger>
      <TabsTrigger value="bloqueios">
        <Ban className="mr-1.5 h-3.5 w-3.5" /> Bloqueios
      </TabsTrigger>
      <TabsTrigger value="active-ips">
        <Network className="mr-1.5 h-3.5 w-3.5" /> IPs ativos
      </TabsTrigger>
      <TabsTrigger value="auto-defense">
        <TrendingUp className="mr-1.5 h-3.5 w-3.5" /> Histórico & Auto-defesa
      </TabsTrigger>
      <TabsTrigger value="analytics">
        <BarChart3 className="mr-1.5 h-3.5 w-3.5" /> Analytics
      </TabsTrigger>
      <TabsTrigger value="bots">Bot Detection</TabsTrigger>
      <TabsTrigger value="rate">Rate Limits</TabsTrigger>
      <TabsTrigger value="ips">Allow/Block IPs ({ipCount})</TabsTrigger>
    </TabsList>
  );
}
