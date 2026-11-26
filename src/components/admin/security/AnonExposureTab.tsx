/**
 * AnonExposureTab — aba "Exposição anon" de /admin/seguranca-acesso.
 *
 * Fecha o buraco entre backend e UI: o banco já tem, em produção, o tripwire do
 * contrato de leitura do `anon` (`fn_verify_anon_catalog_grants`, v5) e o
 * histórico assinado das execuções (`anon_catalog_grant_audit_log`), mas
 * nenhuma tela consumia nada disso — descobrir "o que o visitante anônimo
 * consegue ler hoje" só era possível rodando SQL na mão.
 *
 * O que a tela faz:
 *   • mostra o status da última verificação (0 violações = contrato intacto);
 *   • lista as violações da verificação mais recente, agrupadas por tipo de
 *     objeto (view, tabela, função, policy…) com busca;
 *   • mostra o histórico das verificações com a variação de cada uma;
 *   • roda uma nova verificação (`fn_anon_catalog_grant_audit_run`), que grava
 *     um snapshot e devolve a contagem.
 *
 * Só leitura + a ação de rodar a auditoria: nenhuma DDL, nenhum grant novo.
 */
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, CheckCircle2, Eye, PlayCircle, RefreshCw, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/ui';
import { logger } from '@/lib/logger';
import {
  agruparViolacoes,
  descreverVariacao,
  filtrarViolacoes,
  ordenarSnapshots,
  resumirExposicao,
  variacoesPorSnapshot,
} from '@/lib/security/anonExposure';
import {
  useAnonExposureAudit,
  useRunAnonExposureAudit,
} from '@/hooks/security/useAnonExposureAudit';

const MAX_VIOLACOES_RENDERIZADAS = 200;

function formatMomento(valor: string | null): string {
  if (!valor) return '—';
  const timestamp = Date.parse(valor);
  if (Number.isNaN(timestamp)) return '—';
  return format(new Date(timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR });
}

interface KpiCardProps {
  label: string;
  value: number | string;
  hint?: string;
  tone?: 'default' | 'warning';
}

function KpiCard({ label, value, hint, tone = 'default' }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className={tone === 'warning' ? 'text-destructive' : undefined}>
          {value}
        </CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent className="pt-0 text-xs text-muted-foreground">{hint}</CardContent>
      ) : null}
    </Card>
  );
}

export function AnonExposureTab() {
  const [busca, setBusca] = useState('');
  const { snapshots, isLoading, error, refetch } = useAnonExposureAudit();
  const rodar = useRunAnonExposureAudit();
  const { toast } = useToast();

  const resumo = useMemo(() => resumirExposicao(snapshots), [snapshots]);
  const historico = useMemo(() => variacoesPorSnapshot(snapshots), [snapshots]);
  const atual = useMemo(() => ordenarSnapshots(snapshots).at(0) ?? null, [snapshots]);
  const violacoesVisiveis = useMemo(
    () => filtrarViolacoes(atual ? atual.violations : [], busca),
    [atual, busca],
  );
  const grupos = useMemo(() => agruparViolacoes(violacoesVisiveis), [violacoesVisiveis]);
  const renderizadas = violacoesVisiveis.slice(0, MAX_VIOLACOES_RENDERIZADAS);

  const handleRodar = () => {
    rodar.mutate(undefined, {
      onSuccess: (resultado) => {
        if (resultado.saudavel) {
          toast({ title: 'Contrato do anon intacto', description: resultado.mensagem });
          return;
        }
        toast({
          title: 'Violações encontradas',
          description: resultado.mensagem,
          variant: 'destructive',
        });
      },
      onError: (falha) => {
        logger.warn('[anon-exposure] falha ao rodar a verificação:', falha);
        toast({
          title: 'Não foi possível rodar a verificação',
          description: 'A auditoria exige perfil de administrador.',
          variant: 'destructive',
        });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="anon-exposure-loading">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card data-testid="anon-exposure-error">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" /> Não foi possível carregar a
            auditoria do anon
          </CardTitle>
          <CardDescription>
            {error.message} — a leitura exige perfil de administrador (policy{' '}
            <code>anon_catalog_grant_audit_log_admin_read</code>).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={refetch} data-testid="anon-exposure-retry">
            <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  const semHistorico = resumo.snapshots === 0;

  return (
    <div className="space-y-3" data-testid="anon-exposure-tab">
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" /> Contrato de leitura do anon
            </CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleRodar}
                disabled={rodar.isPending}
                data-testid="anon-exposure-run"
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                {rodar.isPending ? 'Verificando…' : 'Rodar verificação agora'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={refetch}
                data-testid="anon-exposure-refresh"
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
              </Button>
            </div>
          </div>
          <CardDescription>
            O tripwire <code>fn_verify_anon_catalog_grants</code> confere em tempo real tudo o que
            um visitante anônimo consegue ler (views públicas, RPCs de busca, matviews e travas de
            objetos sensíveis). Zero violações significa que nenhum objeto saiu do contrato. Cada
            execução grava um snapshot no histórico abaixo.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card data-testid="anon-exposure-status">
        <CardHeader className="pb-2">
          <CardDescription>Status da verificação mais recente</CardDescription>
          <CardTitle className="flex items-center gap-2">
            {resumo.saudavel ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Contrato intacto
              </>
            ) : (
              <>
                <ShieldAlert className="h-5 w-5 text-destructive" /> {resumo.violacoesAtuais}{' '}
                objeto(s) fora do contrato
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          {semHistorico
            ? 'Nenhuma verificação registrada ainda — rode a primeira auditoria para criar o histórico.'
            : `${descreverVariacao(resumo.variacao)} · última verificação em ${formatMomento(
                resumo.ultimaVerificacao,
              )}`}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Violações agora"
          value={resumo.violacoesAtuais}
          tone={resumo.saudavel ? 'default' : 'warning'}
        />
        <KpiCard label="Objetos distintos" value={resumo.objetosDistintos} />
        <KpiCard label="Tipos de objeto" value={resumo.tiposDeObjeto} />
        <KpiCard
          label="Verificações guardadas"
          value={resumo.snapshots}
          hint="Máximo de 40 lidas"
        />
        <KpiCard
          label="Pior contagem"
          value={resumo.piorContagem}
          tone={resumo.piorContagem > 0 ? 'warning' : 'default'}
          hint="Maior número de violações já registrado"
        />
      </div>

      {semHistorico ? (
        <div
          className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground"
          data-testid="anon-exposure-empty"
        >
          Sem histórico de auditoria. Clique em "Rodar verificação agora" para gerar o primeiro
          snapshot.
        </div>
      ) : null}

      {grupos.length > 0 ? (
        <div className="flex flex-wrap gap-2" data-testid="anon-exposure-grupos">
          {grupos.map((grupo) => (
            <Badge key={grupo.kind} variant="destructive" title={grupo.objetos.join(', ')}>
              {grupo.label} ({grupo.total})
            </Badge>
          ))}
        </div>
      ) : null}

      {resumo.snapshots > 0 && resumo.violacoesAtuais > 0 ? (
        <Input
          placeholder="Buscar por objeto, tipo ou problema"
          value={busca}
          onChange={(event) => {
            setBusca(event.target.value);
          }}
          aria-label="Buscar violações do contrato anon"
          data-testid="anon-exposure-search"
        />
      ) : null}

      {renderizadas.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4" /> Objetos fora do contrato
            </CardTitle>
            <CardDescription>
              {renderizadas.length} de {violacoesVisiveis.length} violação(ões) da verificação mais
              recente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto" data-testid="anon-exposure-tabela">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Objeto</TableHead>
                    <TableHead>Problema</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renderizadas.map((violacao) => (
                    <TableRow key={`${violacao.objectKind}:${violacao.objectName}`}>
                      <TableCell className="text-xs">{violacao.objectKind}</TableCell>
                      <TableCell className="font-mono text-xs">{violacao.objectName}</TableCell>
                      <TableCell className="text-xs">{violacao.issue}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {resumo.snapshots > 0 && resumo.violacoesAtuais > 0 && violacoesVisiveis.length === 0 ? (
        <div
          className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground"
          data-testid="anon-exposure-sem-resultado"
        >
          Nenhuma violação corresponde à busca.
        </div>
      ) : null}

      {historico.length > 0 ? (
        <Card data-testid="anon-exposure-historico">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Histórico de verificações</CardTitle>
            <CardDescription>
              Snapshots gravados por <code>fn_anon_catalog_grant_audit_run</code> — a variação
              compara cada execução com a anterior.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Violações</TableHead>
                    <TableHead>Variação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historico.map((item) => (
                    <TableRow key={item.snapshot.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatMomento(item.snapshot.checkedAt)}
                      </TableCell>
                      <TableCell className="text-xs">{item.snapshot.violationCount}</TableCell>
                      <TableCell className="text-xs">{descreverVariacao(item.variacao)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
