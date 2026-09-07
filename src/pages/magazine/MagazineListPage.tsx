/**
 * MagazineListPage — /magazine
 * Biblioteca de revistas (Blue Premium §20/§63-A): page header + KPI strip +
 * toolbar (busca, status, ordenação, grade/lista) + cards com capa real.
 * Duplicar / excluir com Undo vivem no menu contextual de cada card.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Archive,
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  LayoutGrid,
  LayoutTemplate,
  List,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Search,
  SortAsc,
  SortDesc,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { magazineService } from '@/services/magazineService';
import type { Magazine } from '@/types/magazine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { PageSEO } from '@/components/seo/PageSEO';
import { cn } from '@/lib/utils';
import { Clickable } from '@/components/shared/Clickable';
import { getTemplate } from './components/templates/TemplateRegistry';
import { MagazineCardThumbnail } from './components/MagazineCardThumbnail';
// FIX C12 (auditoria BD, 2026-07-12): migração one-shot do localStorage
// para o BD Gold via edge magazine-import-local. Ver hook para detalhes
// de idempotência e fallback gracioso.
import { useMagazineGoldImport } from './hooks/useMagazineGoldImport';
import { useBluePremiumTheme } from './hooks/useBluePremiumTheme';
import {
  PG_BTN,
  PG_BTN_OUTLINE_PRIMARY,
  PG_CARD,
  PG_CARD_HOVER,
  PG_ICON_BOX,
  PG_ICON_BOX_SM,
  PG_INPUT,
  PG_PAGE,
  PG_PANEL,
  PG_SELECT,
  pgPill,
  pgPillCount,
  pgStatusBadge,
  pgToggleIcon,
} from './pg';

type SortField = 'name' | 'updated' | 'views';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'archived' | 'draft' | 'published';
type ViewMode = 'grid' | 'list';

const STATUS_LABEL: Record<Magazine['status'], string> = {
  draft: 'Rascunho',
  published: 'Publicada',
  archived: 'Arquivada',
};

const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'draft', label: 'Rascunhos' },
  { id: 'published', label: 'Publicadas' },
  { id: 'archived', label: 'Arquivadas' },
];

function editedLabel(m: Magazine): string {
  return `Editada ${formatDistanceToNow(new Date(m.updatedAt), { addSuffix: true, locale: ptBR })}`;
}

function primaryActionLabel(m: Magazine): string {
  return m.status === 'published' ? 'Abrir revista' : 'Continuar edição';
}

export default function MagazineListPage() {
  useBluePremiumTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [magazines, setMagazines] = useState<Magazine[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('updated');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [view, setView] = useState<ViewMode>('grid');
  const [pendingDelete, setPendingDelete] = useState<Magazine | null>(null);

  // FIX C12: dispara a migração 1x por usuário, em background — não bloqueia
  // a renderização da lista (que continua lendo do localStorage normalmente
  // até o próximo passo do roadmap trocar magazineService por Supabase).
  useMagazineGoldImport(user?.id);

  const refresh = async () => {
    if (!user) return;
    const list = await magazineService.list(user.id);
    setMagazines(list);
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const counts = useMemo(() => {
    const c = { all: magazines.length, draft: 0, published: 0, archived: 0, views: 0 };
    for (const m of magazines) {
      c[m.status] += 1;
      c.views += m.viewCount ?? 0;
    }
    return c;
  }, [magazines]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = magazines.filter((m) => {
      if (status !== 'all' && m.status !== status) return false;
      if (!q) return true;
      return (
        m.title.toLowerCase().includes(q) ||
        (m.branding?.clientName ?? '').toLowerCase().includes(q)
      );
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...out].sort((a, b) => {
      switch (sortField) {
        case 'name':
          return a.title.localeCompare(b.title, 'pt-BR') * dir;
        case 'views':
          return ((a.viewCount ?? 0) - (b.viewCount ?? 0)) * dir;
        default:
          return a.updatedAt.localeCompare(b.updatedAt) * dir;
      }
    });
  }, [magazines, query, status, sortField, sortDir]);

  const empty = magazines.length === 0;

  const handleCreate = async () => {
    if (!user) return;
    const mag = await magazineService.create({ ownerId: user.id, organizationId: null });
    navigate(`/magazine/${mag.id}`);
  };

  const handleDuplicate = async (id: string) => {
    const cloned = await magazineService.duplicate(id);
    if (cloned) {
      toast.success('Revista duplicada.');
      await refresh();
    }
  };

  const confirmDelete = (m: Magazine) => setPendingDelete(m);

  const executeDelete = async () => {
    if (!pendingDelete) return;
    const backup = pendingDelete;
    await magazineService.delete(backup.id);
    setPendingDelete(null);
    await refresh();
    toast('Revista excluída.', {
      description: backup.title,
      action: {
        label: 'Desfazer',
        onClick: () => {
          void (async () => {
            await magazineService.restore(backup);
            await refresh();
            toast.success('Revista restaurada.');
          })();
        },
      },
      duration: 8000,
    });
  };

  const openCard = (m: Magazine) => navigate(`/magazine/${m.id}`);

  const renderMenu = (m: Magazine) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(pgToggleIcon(false), 'h-10 w-10')}
          aria-label={`Mais ações para ${m.title}`}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="pg-module w-52 rounded-lg border-border bg-popover p-1.5 shadow-lg"
      >
        <DropdownMenuItem onSelect={() => openCard(m)} className="h-9 rounded-md text-[13px]">
          <Pencil className="mr-2 h-4 w-4" aria-hidden /> Editar
        </DropdownMenuItem>
        {m.status === 'published' && m.publicToken && (
          <DropdownMenuItem
            onSelect={() => window.open(`/revista-publica/${m.publicToken}`, '_blank', 'noopener')}
            className="h-9 rounded-md text-[13px]"
          >
            <ExternalLink className="mr-2 h-4 w-4" aria-hidden /> Ver publicação
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onSelect={() => {
            handleDuplicate(m.id);
          }}
          className="h-9 rounded-md text-[13px]"
        >
          <Copy className="mr-2 h-4 w-4" aria-hidden /> Duplicar
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          onSelect={() => confirmDelete(m)}
          className="h-9 rounded-md text-[13px] text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" aria-hidden /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const renderPrimaryAction = (m: Magazine, className?: string) => (
    <Button
      asChild
      size="sm"
      className={cn(PG_BTN, 'h-10 min-h-0 rounded-md text-[13px]', className)}
    >
      <Link
        to={`/magazine/${m.id}`}
        className="link-unstyled"
        aria-label={`${primaryActionLabel(m)}: ${m.title}`}
      >
        {primaryActionLabel(m)}
        {m.status === 'published' && <ExternalLink className="ml-1 h-3.5 w-3.5" aria-hidden />}
      </Link>
    </Button>
  );

  const kpis = [
    {
      label: 'Total de revistas',
      value: counts.all,
      icon: BookOpen,
      tone: 'text-primary bg-primary/10',
    },
    {
      label: 'Rascunhos',
      value: counts.draft,
      icon: FileText,
      tone: 'text-muted-foreground bg-card-elevated',
    },
    {
      label: 'Publicadas',
      value: counts.published,
      icon: CheckCircle2,
      tone: 'text-success bg-success/15',
    },
    {
      label: counts.archived === 1 ? 'Arquivada' : 'Arquivadas',
      value: counts.archived,
      icon: Archive,
      tone: 'text-muted-foreground bg-card-elevated',
    },
    {
      label: 'Visualizações totais',
      value: counts.views,
      icon: BarChart3,
      tone: 'text-primary bg-primary/10',
    },
  ];

  return (
    <>
      <PageSEO
        title="Magazine — Revistas de Produtos"
        description="Monte revistas e catálogos personalizados com o nosso catálogo em minutos."
        path="/magazine"
      />
      <div className={PG_PAGE}>
        {/* Page header (§14) */}
        <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className={cn(PG_ICON_BOX, 'h-14 w-14 rounded-lg')}>
              <BookOpen className="h-7 w-7" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1
                data-testid="page-title-magazine"
                className="font-display text-[30px] font-bold leading-[1.12] tracking-tight text-foreground"
              >
                Magazine
              </h1>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Crie catálogos personalizados para clientes e compartilhe por link ou PDF.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              asChild
              className={cn(PG_BTN_OUTLINE_PRIMARY, 'h-11 rounded-md px-4 text-[14px]')}
              data-testid="magazine-templates-gallery-btn"
            >
              <Link to="/magazine/templates" className="link-unstyled">
                <LayoutTemplate className="mr-2 h-4 w-4" aria-hidden />
                Explorar templates
              </Link>
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              className={cn(PG_BTN, 'h-11 rounded-md px-5 text-[14px]')}
              data-testid="magazine-create-btn"
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Nova revista
            </Button>
          </div>
        </header>

        {/* KPI strip (§15) */}
        {!empty && (
          <section
            aria-label="Resumo das revistas"
            className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5"
          >
            {kpis.map((k) => (
              <div key={k.label} className={cn(PG_CARD, 'flex items-center gap-3.5 px-4 py-3.5')}>
                <div className={cn(PG_ICON_BOX_SM, 'h-11 w-11', k.tone)}>
                  <k.icon className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <div className="font-display text-[22px] font-bold tabular-nums leading-none text-foreground">
                    {k.value.toLocaleString('pt-BR')}
                  </div>
                  <div className="mt-1 truncate text-[12px] text-muted-foreground">{k.label}</div>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Toolbar (§16) */}
        {!empty && (
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[240px] flex-1">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por título, cliente ou descrição…"
                className={cn(PG_INPUT, 'h-11 pl-10')}
                aria-label="Buscar revistas"
              />
            </div>
            <div
              role="group"
              aria-label="Filtrar por status"
              className="flex flex-wrap items-center gap-2"
            >
              {STATUS_FILTERS.map((f) => {
                const active = status === f.id;
                const count = f.id === 'all' ? counts.all : counts[f.id];
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStatus(f.id)}
                    aria-pressed={active}
                    className={pgPill(active, 'h-11')}
                  >
                    {f.label}
                    <span className={pgPillCount(active)}>{count}</span>
                  </button>
                );
              })}
            </div>
            <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
              <SelectTrigger
                className={cn(PG_SELECT, 'h-11 w-[176px]')}
                aria-label="Ordenar revistas"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="pg-module rounded-lg border-border">
                <SelectItem value="updated">Mais recentes</SelectItem>
                <SelectItem value="name">Nome</SelectItem>
                <SelectItem value="views">Visualizações</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className={cn(pgToggleIcon(false), 'h-11 w-11')}
              onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              aria-label={
                sortDir === 'desc'
                  ? 'Ordem decrescente — clique para crescente'
                  : 'Ordem crescente — clique para decrescente'
              }
              aria-pressed={sortDir === 'asc'}
            >
              {sortDir === 'desc' ? (
                <SortDesc className="h-4 w-4" aria-hidden />
              ) : (
                <SortAsc className="h-4 w-4" aria-hidden />
              )}
            </Button>
            <div role="group" aria-label="Modo de exibição" className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className={cn(pgToggleIcon(view === 'grid'), 'h-11 w-11')}
                onClick={() => setView('grid')}
                aria-label="Exibir em grade"
                aria-pressed={view === 'grid'}
              >
                <LayoutGrid className="h-4 w-4" aria-hidden />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className={cn(pgToggleIcon(view === 'list'), 'h-11 w-11')}
                onClick={() => setView('list')}
                aria-label="Exibir em lista"
                aria-pressed={view === 'list'}
              >
                <List className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            <span className="sr-only" aria-live="polite">
              {filtered.length} revista{filtered.length === 1 ? '' : 's'}
            </span>
          </div>
        )}

        {empty ? (
          <div className={cn(PG_PANEL, 'border-dashed')}>
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
              <div className={PG_ICON_BOX}>
                <BookOpen className="h-6 w-6" aria-hidden />
              </div>
              <h2 className="text-[17px] font-semibold text-foreground">Nenhuma revista ainda</h2>
              <p className="max-w-md text-[13px] text-muted-foreground">
                Monte sua primeira revista escolhendo produtos do catálogo, ajustando os campos
                exibidos e selecionando um dos templates de design.
              </p>
              <Button
                onClick={handleCreate}
                size="sm"
                className={cn(PG_BTN, 'mt-1 h-10 rounded-md')}
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden /> Criar primeira revista
              </Button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div
            className={cn(
              PG_PANEL,
              'border-dashed px-6 py-12 text-center text-[13px] text-muted-foreground',
            )}
          >
            Nenhuma revista corresponde à busca.
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((m) => {
              const template = getTemplate(m.templateId);
              return (
                <article
                  key={m.id}
                  className={cn(PG_CARD, PG_CARD_HOVER, 'group flex flex-col overflow-hidden')}
                  data-testid={`magazine-card-${m.id}`}
                >
                  <Clickable
                    role="link"
                    aria-label={`Abrir revista ${m.title}`}
                    onClick={() => openCard(m)}
                    className="relative block focus-visible:ring-inset"
                  >
                    <MagazineCardThumbnail magazine={m} />
                    <span
                      className={cn(pgStatusBadge(m.status), 'absolute right-3 top-3 shadow-sm')}
                    >
                      {STATUS_LABEL[m.status]}
                    </span>
                  </Clickable>
                  <div className="flex flex-1 flex-col gap-2.5 p-4">
                    <h3 className="truncate text-[16px] font-semibold leading-tight text-foreground">
                      {m.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="truncate">
                        {m.branding?.clientName || 'Sem cliente vinculado'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                      <Package className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span>
                        {(m.items ?? []).length} produto{(m.items ?? []).length === 1 ? '' : 's'}
                      </span>
                      <span aria-hidden className="h-3 w-px bg-border-strong" />
                      <span className="truncate">{template.name}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {editedLabel(m)}
                      </span>
                      <span className="flex items-center gap-1 tabular-nums" title="Visualizações">
                        <Eye className="h-3.5 w-3.5" aria-hidden />
                        {(m.viewCount ?? 0).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="mt-auto flex items-center gap-2 pt-2">
                      {renderMenu(m)}
                      {renderPrimaryAction(m, 'flex-1')}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={cn(PG_PANEL, 'overflow-hidden')}>
            <ul className="m-0 list-none divide-y divide-border p-0">
              {filtered.map((m) => {
                const template = getTemplate(m.templateId);
                return (
                  <li key={m.id} data-testid={`magazine-card-${m.id}`}>
                    <div className="flex items-center gap-4 px-4 py-2.5 transition-colors hover:bg-card-elevated">
                      <Clickable
                        role="link"
                        aria-label={`Abrir revista ${m.title}`}
                        onClick={() => openCard(m)}
                        className="flex min-w-0 flex-1 items-center gap-4 rounded-md"
                      >
                        <MagazineCardThumbnail magazine={m} className="w-24 shrink-0 rounded-sm" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14px] font-semibold text-foreground">
                            {m.title}
                          </div>
                          <div className="truncate text-[12px] text-muted-foreground">
                            {m.branding?.clientName || 'Sem cliente vinculado'} · {template.name} ·{' '}
                            {(m.items ?? []).length} produto
                            {(m.items ?? []).length === 1 ? '' : 's'}
                          </div>
                        </div>
                        <div className="hidden w-40 shrink-0 text-[11px] text-muted-foreground md:block">
                          {editedLabel(m)}
                        </div>
                        <div className="hidden w-16 shrink-0 items-center gap-1 text-[11px] tabular-nums text-muted-foreground sm:flex">
                          <Eye className="h-3.5 w-3.5" aria-hidden />
                          {(m.viewCount ?? 0).toLocaleString('pt-BR')}
                        </div>
                        <span className={cn(pgStatusBadge(m.status), 'shrink-0')}>
                          {STATUS_LABEL[m.status]}
                        </span>
                      </Clickable>
                      <div className="flex shrink-0 items-center gap-2">
                        {renderMenu(m)}
                        {renderPrimaryAction(m, 'hidden sm:inline-flex')}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent className="pg-module rounded-2xl border-border bg-popover">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir revista?</AlertDialogTitle>
            <AlertDialogDescription>
              A revista <strong>{pendingDelete?.title}</strong> será excluída. Você pode desfazer
              imediatamente pelo toast, mas depois disso a exclusão é permanente.
              {pendingDelete?.status === 'published' && (
                <span className="mt-2 block rounded-md bg-destructive/10 p-2 text-destructive">
                  Atenção: esta revista está <strong>publicada</strong> — o link público deixará de
                  funcionar.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={cn(PG_BTN, 'rounded-md')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              className={cn(
                PG_BTN,
                'rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90',
              )}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
