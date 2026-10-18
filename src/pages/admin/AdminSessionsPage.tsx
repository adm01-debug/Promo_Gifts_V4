import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MonitorSmartphone, Search, ShieldOff, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageSEO } from '@/components/seo/PageSEO';
import {
  useAdminSessions,
  useRevokeUserSessions,
  type AdminSessionRow,
} from '@/hooks/admin/useAdminSessions';
import { useAuth } from '@/contexts/AuthContext';

function fmt(ts: string | null): string {
  if (!ts) return '—';
  return format(new Date(ts), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

function shortAgent(ua: string | null): string {
  if (!ua) return '—';
  return ua.length > 60 ? `${ua.slice(0, 60)}…` : ua;
}

export default function AdminSessionsPage() {
  const { user } = useAuth();
  const [emailFilter, setEmailFilter] = useState('');
  const [target, setTarget] = useState<AdminSessionRow | null>(null);

  const { data: sessions, isLoading, error } = useAdminSessions();
  const revoke = useRevokeUserSessions();

  const filtered = useMemo(() => {
    const rows = sessions ?? [];
    const q = emailFilter.trim().toLowerCase();
    return q ? rows.filter((s) => (s.email ?? '').toLowerCase().includes(q)) : rows;
  }, [sessions, emailFilter]);

  const uniqueUsers = useMemo(() => new Set(filtered.map((s) => s.user_id)).size, [filtered]);

  return (
    <>
      <PageSEO
        title="Sessões Ativas"
        description="Sessões de autenticação ativas por usuário e revogação remota."
        path="/admin/sessoes"
        noIndex
      />
      <div className="mx-auto w-full max-w-[1920px] animate-fade-in space-y-3 px-3 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8">
        <div>
          <h1
            data-testid="page-title-sessions"
            className="font-display text-2xl font-bold text-foreground"
          >
            Sessões Ativas
          </h1>
          <p className="text-muted-foreground">
            Sessões de autenticação vivas por usuário — a revogação desconecta todos os dispositivos
            do usuário
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{uniqueUsers}</p>
                  <p className="text-sm text-muted-foreground">Usuários com sessão ativa</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <MonitorSmartphone className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{filtered.length}</p>
                  <p className="text-sm text-muted-foreground">Sessões abertas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filtrar por e-mail…"
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            className="pl-9"
          />
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Dispositivo</TableHead>
                  <TableHead>Sessão criada</TableHead>
                  <TableHead>Última atividade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Carregando sessões…
                    </TableCell>
                  </TableRow>
                )}
                {error && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-destructive">
                      Falha ao carregar sessões — confira se a migration admin_active_sessions foi
                      aplicada.
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && !error && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Nenhuma sessão ativa encontrada.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((s) => (
                  <TableRow key={s.session_id}>
                    <TableCell className="font-medium">
                      {s.email ?? `sem e-mail (${s.user_id.slice(0, 8)}…)`}
                    </TableCell>
                    <TableCell>{s.ip ?? '—'}</TableCell>
                    <TableCell className="max-w-[280px] truncate" title={s.user_agent ?? ''}>
                      {shortAgent(s.user_agent)}
                    </TableCell>
                    <TableCell>{fmt(s.session_created_at)}</TableCell>
                    <TableCell>{fmt(s.refreshed_at ?? s.session_updated_at)}</TableCell>
                    <TableCell>
                      {s.live_refresh_token ? (
                        <Badge variant="default">ativa</Badge>
                      ) : (
                        <Badge variant="secondary">expirando</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={s.user_id === user?.id || revoke.isPending}
                        title={
                          s.user_id === user?.id
                            ? 'Você não pode revogar a própria sessão por aqui'
                            : 'Revogar todas as sessões deste usuário'
                        }
                        onClick={() => setTarget(s)}
                      >
                        <ShieldOff className="mr-1.5 h-3.5 w-3.5" /> Revogar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Revogar sessões de {target?.email ?? 'usuário sem e-mail'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Todos os tokens deste usuário serão revogados: as edges protegidas passam a rejeitar
              as sessões dele e ele precisará fazer login novamente. A ação fica registrada na
              auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (target) revoke.mutate(target.user_id);
                setTarget(null);
              }}
            >
              Revogar todas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
