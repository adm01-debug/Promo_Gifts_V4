import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, Link2, Search, Unlink, UserCheck, Zap } from 'lucide-react';
import { PageSEO } from '@/components/seo/PageSEO';
import {
  useCrmSellerLinks,
  useLinkCrmSeller,
  useUnlinkCrmSeller,
} from '@/hooks/admin/useCrmSellerLinks';
import {
  filterCrmSellerLinks,
  isManualLink,
  linkSourceLabel,
  summarizeCrmSellerLinks,
  validateLinkInput,
  type CrmSellerLinkRow,
} from '@/lib/crm/seller-links';

function fmt(ts: string | null): string {
  if (!ts) return '—';
  return format(new Date(ts), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export default function AdminCrmSellerLinksPage() {
  const { data: links, isLoading, error, refetch, isFetching } = useCrmSellerLinks();
  const linkSeller = useLinkCrmSeller();
  const unlinkSeller = useUnlinkCrmSeller();

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [correctTarget, setCorrectTarget] = useState<CrmSellerLinkRow | null>(null);
  const [email, setEmail] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [unlinkTarget, setUnlinkTarget] = useState<CrmSellerLinkRow | null>(null);

  const rows = useMemo(() => links ?? [], [links]);
  const filtered = useMemo(() => filterCrmSellerLinks(rows, search), [rows, search]);
  const summary = useMemo(() => summarizeCrmSellerLinks(rows), [rows]);

  function openLinkForm() {
    setCorrectTarget(null);
    setEmail('');
    setSellerId('');
    setFormError(null);
    setFormOpen(true);
  }

  function openCorrectForm(row: CrmSellerLinkRow) {
    setCorrectTarget(row);
    setEmail(row.email ?? '');
    setSellerId(String(row.crm_seller_id));
    setFormError(null);
    setFormOpen(true);
  }

  function submitForm() {
    const validation = validateLinkInput(email, sellerId);
    if (!validation.ok) {
      setFormError(validation.error);
      return;
    }
    setFormError(null);
    linkSeller.mutate(
      { email: validation.email, sellerId: validation.sellerId },
      { onSuccess: () => setFormOpen(false) },
    );
  }

  return (
    <>
      <PageSEO
        title="Vínculos de Vendedor (CRM)"
        description="Mapeamento entre usuários do sistema e o id do vendedor no CRM externo usado pelo atendimento."
        path="/admin/vinculos-vendedor-crm"
        noIndex
      />
      <div className="mx-auto w-full max-w-[1920px] animate-fade-in space-y-3 px-3 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              data-testid="page-title-crm-seller-links"
              className="font-display text-2xl font-bold text-foreground"
            >
              Vínculos de Vendedor (CRM)
            </h1>
            <p className="text-muted-foreground">
              Liga cada usuário do sistema ao id do vendedor no CRM externo. Sem vínculo, o CRM
              tenta casar automaticamente pelo e-mail.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <Search className="mr-1.5 h-4 w-4" />
              {isFetching ? 'Atualizando…' : 'Atualizar'}
            </Button>
            <Button onClick={openLinkForm}>
              <Link2 className="mr-1.5 h-4 w-4" />
              Vincular vendedor
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <UserCheck className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{summary.total}</p>
                  <p className="text-sm text-muted-foreground">Vínculos ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Link2 className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{summary.manual}</p>
                  <p className="text-sm text-muted-foreground">Definidos nesta tela</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Zap className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{summary.bootstrap}</p>
                  <p className="text-sm text-muted-foreground">Casados por e-mail no CRM</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            O vínculo manual tem prioridade: ele não é sobrescrito pelo casamento automático por
            e-mail. Desfazer um vínculo faz o CRM voltar a casar pelo e-mail no próximo acesso do
            vendedor.
          </span>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filtrar por e-mail, nome, id do CRM ou uuid…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Filtrar vínculos"
          />
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário do sistema</TableHead>
                  <TableHead>Vendedor no CRM</TableHead>
                  <TableHead>Origem do vínculo</TableHead>
                  <TableHead>Vinculado desde</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      Carregando vínculos…
                    </TableCell>
                  </TableRow>
                )}
                {error && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-destructive">
                      Falha ao carregar vínculos — confira se a migration
                      20261126060000_crm_seller_identity_admin_rpc foi aplicada.
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && !error && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      {rows.length === 0
                        ? 'Nenhum vínculo registrado. O CRM cria o vínculo automaticamente no primeiro acesso do vendedor.'
                        : 'Nenhum vínculo corresponde ao filtro.'}
                    </TableCell>
                  </TableRow>
                )}
                {!error &&
                  filtered.map((row) => (
                    <TableRow key={row.auth_user_id}>
                      <TableCell className="font-medium">
                        <div>{row.email ?? `sem e-mail (${row.auth_user_id.slice(0, 8)}…)`}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.full_name ?? row.auth_user_id}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{row.crm_seller_id}</TableCell>
                      <TableCell>
                        <Badge variant={isManualLink(row.link_source) ? 'default' : 'secondary'}>
                          {linkSourceLabel(row.link_source)}
                        </Badge>
                      </TableCell>
                      <TableCell>{fmt(row.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openCorrectForm(row)}
                            title="Apontar este usuário para outro id do CRM"
                          >
                            <Link2 className="mr-1.5 h-3.5 w-3.5" /> Corrigir
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={unlinkSeller.isPending}
                            onClick={() => setUnlinkTarget(row)}
                          >
                            <Unlink className="mr-1.5 h-3.5 w-3.5" /> Desvincular
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {correctTarget ? 'Corrigir vínculo do vendedor' : 'Vincular vendedor do CRM'}
            </DialogTitle>
            <DialogDescription>
              {correctTarget
                ? 'O usuário passa a apontar para o id informado. A alteração fica registrada na auditoria.'
                : 'Informe o e-mail do usuário do sistema e o id do vendedor no CRM externo. O vínculo manual prevalece sobre o casamento automático por e-mail.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="crm-link-email">E-mail do usuário</Label>
              <Input
                id="crm-link-email"
                type="email"
                inputMode="email"
                placeholder="vendedor@loja.com.br"
                value={email}
                disabled={!!correctTarget}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="crm-link-seller-id">Id do vendedor no CRM</Label>
              <Input
                id="crm-link-seller-id"
                inputMode="numeric"
                placeholder="ex.: 777"
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                É o <code>public.users.id</code> do projeto do CRM (número inteiro positivo).
              </p>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitForm} disabled={linkSeller.isPending}>
              {linkSeller.isPending ? 'Salvando…' : correctTarget ? 'Salvar correção' : 'Vincular'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!unlinkTarget} onOpenChange={(open) => !open && setUnlinkTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Desvincular {unlinkTarget?.email ?? 'este usuário'} do vendedor{' '}
              {unlinkTarget?.crm_seller_id}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O vínculo é apagado e o CRM volta a casar o vendedor pelo e-mail no próximo acesso. Se
              o e-mail não existir no CRM, o vendedor perde o acesso aos próprios dados. A ação fica
              registrada na auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (unlinkTarget) unlinkSeller.mutate(unlinkTarget.auth_user_id);
                setUnlinkTarget(null);
              }}
            >
              Desvincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
