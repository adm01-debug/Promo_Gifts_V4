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
import { MagazineStatsCards } from './components/MagazineStatsCards';
import {
  PG_BTN,
  PG_BTN_OUTLINE_PRIMARY,
  PG_CARD,
  PG_CARD_HOVER,
  PG_ICON_BOX,
  PG_INPUT,
  PG_PAGE,
  PG_PANEL,
  PG_SELECT,
  pgPill,
  pgPillCount,
  pgStatusBadge,
  pgToggleIcon,
} from './pg';

type StatusFilter = 'all' | 'draft' | 'published' | 'archived';
type SortField = 'updated' | 'name' | 'views';
type SortDir = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'draft', label: 'Rascunhos' },
  { id: 'published', label: 'Publicadas' },
  { id: 'archived', label: 'Arquivadas' },
];

function SortButton({
  field,
  current,
  dir,
  onClick,
  children,
}: {
  field: SortField;
  current: SortField;
  dir: SortDir;
  onClick: (f: SortField) => void;
  children: React.ReactNode;
}) {
  const active = field === current;
  return (
    <button
      type="button"
      onClick={() => onClick(field)}
      className={cn(
        'flex items-center gap-1 text-[13px] font-medium',
        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
      {active &&
        (dir === 'asc' ? (
          <SortAsc className="h-3.5 w-3.5" />
        ) : (
          <SortDesc className="h-3.5 w-3.5" />
        ))}
    </button>
  );
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
  const [isLoading, setIsLoading] = useState(true);

  // FIX C12: dispara a migração 1x por usuário, em background — não bloqueia
  // a renderização da lista (que continua lendo do localStorage normalmente
  // até o próximo passo do roadmap trocar magazineService por Supabase).
  useMagazineGoldImport(user?.id);

  const refresh = async () => {
    if (!user) return;
    setIsLoading(true);
    const list = await magazineService.list(user.id);
    setMagazines(list);
    setIsLoading(false);
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
    const mag = await magazineService.create(user.id);
    navigate(`/magazine/${mag.id}`);
  };

  const openCard = (m: Magazine) => navigate(`/magazine/${m.id}`);

  const handleDuplicate = async (m: Magazine) => {
    if (!user) return;
    const copy = await magazineService.duplicate(m, user.id);
    navigate(`/magazine/${copy.id}`);
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    const backup = pendingDelete;
    setPendingDelete(null);
    setMagazines((prev) => prev.filter((m) => m.id !== backup.id));
    toast(`“${backup.title}” excluída`, {
      action: {
        label: 'Desfazer',
        onClick: async () => {
          await magazineService.restore(backup);
          void refresh();
        },
      },
    });
    await magazineService.delete(backup.id);
  };

  // — View toggle renderizado na toolbar —
  const ViewToggle = (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Vista em grade"
        aria-pressed={view === 'grid'}
        onClick={() => setView('grid')}
        className={pgToggleIcon(view === 'grid')}
      >
        <LayoutGrid className="h-4 w-4" aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Vista em lista"
        aria-pressed={view === 'list'}
        onClick={() => setView('list')}
        className={pgToggleIcon(view === 'list')}
      >
        <List className="h-4 w-4" aria-hidden />
      </Button>
    </>
  );

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
              className={cn(PG_BTN_OUTLINE_PRIMARY, 'h-9 rounded-md px-3 text-xs')}
              data-testid="magazine-templates-gallery-btn"
            >
              <Link to="/magazine/templates" className="link-unstyled">
                <LayoutTemplate className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Explorar templates
              </Link>
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              className={cn(PG_BTN, 'h-9 rounded-md px-3 text-xs')}
              data-testid="magazine-create-btn"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Nova revista
            </Button>
          </div>
        </header>

        {/* KPI strip (§15) — padrão Novidades: Card + count-up + glow */}
        <section aria-label="Resumo das revistas" className="mb-4">
          <MagazineStatsCards counts={counts} isLoading={isLoading} />
        </section>

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
              variant="ghost"
              size="icon"
              aria-label="Inverter ordem"
              onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              className={pgToggleIcon(false)}
            >
              {sortDir === 'asc' ? (
                <SortAsc className="h-4 w-4" aria-hidden />
              ) : (
                <SortDesc className="h-4 w-4" aria-hidden />
              )}
            </Button>
            <div className="ml-auto flex items-center gap-1">{ViewToggle}</div>
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
                <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Criar primeira revista
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
                    <MagazineCardThumbnail magazine={m} template={template} />
                  </Clickable>

                  {/* Card footer */}
                  <div className="flex flex-1 flex-col gap-0 px-3.5 pb-3 pt-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-[14px] font-semibold leading-snug text-foreground"
                          title={m.title}
                        >
                          {m.title}
                        </p>
                        {m.branding?.clientName && (
                          <p className="truncate text-[12px] text-muted-foreground">
                            {m.branding.clientName}
                          </p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                            aria-label="Opções da revista"
                            data-testid={`magazine-menu-${m.id}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => openCard(m)}>
                            <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(m)}>
                            <Copy className="mr-2 h-3.5 w-3.5" /> Duplicar
                          </DropdownMenuItem>
                          {m.status === 'published' && m.publicToken && (
                            <DropdownMenuItem asChild>
                              <a
                                href={`/m/${m.publicToken}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="mr-2 h-3.5 w-3.5" /> Ver pública
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setPendingDelete(m)}
                            data-testid={`magazine-delete-${m.id}`}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Meta row */}
                    <div className="mt-2 flex items-center gap-3">
                      <span className={pgStatusBadge(m.status)}>
                        {m.status === 'published'
                          ? 'Publicada'
                          : m.status === 'draft'
                            ? 'Rascunho'
                            : 'Arquivada'}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        {(m.viewCount ?? 0).toLocaleString('pt-BR')}
                      </span>
                      <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock3 className="h-3 w-3" />
                        {formatDistanceToNow(new Date(m.updatedAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          /* List view */
          <div className={cn(PG_PANEL, 'overflow-hidden')}>
            {/* List header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 border-b border-border px-4 py-2.5">
              <SortButton field="name" current={sortField} dir={sortDir} onClick={setSortField}>
                Título
              </SortButton>
              <span className="w-20 text-right text-[12px] font-medium text-muted-foreground">
                Status
              </span>
              <SortButton field="views" current={sortField} dir={sortDir} onClick={setSortField}>
                Views
              </SortButton>
              <SortButton field="updated" current={sortField} dir={sortDir} onClick={setSortField}>
                Atualizado
              </SortButton>
              <span className="w-8" />
            </div>
            {filtered.map((m) => (
              <div
                key={m.id}
                className="group grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 border-b border-border px-4 py-3 last:border-0 hover:bg-card-elevated"
                data-testid={`magazine-card-${m.id}`}
              >
                <button
                  type="button"
                  onClick={() => openCard(m)}
                  className="flex min-w-0 items-center gap-3 text-left"
                  aria-label={`Abrir ${m.title}`}
                >
                  <div
                    className={cn(
                      PG_ICON_BOX,
                      'hidden h-9 w-9 shrink-0 text-muted-foreground sm:flex',
                    )}
                  >
                    <Package className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-foreground">{m.title}</p>
                    {m.branding?.clientName && (
                      <p className="truncate text-[12px] text-muted-foreground">
                        {m.branding.clientName}
                      </p>
                    )}
                  </div>
                </button>
                <span className={cn(pgStatusBadge(m.status), 'w-20 justify-center')}>
                  {m.status === 'published'
                    ? 'Publicada'
                    : m.status === 'draft'
                      ? 'Rascunho'
                      : 'Arquivada'}
                </span>
                <span className="flex w-16 items-center justify-end gap-1 text-[12px] tabular-nums text-muted-foreground">
                  <Eye className="h-3 w-3" />
                  {(m.viewCount ?? 0).toLocaleString('pt-BR')}
                </span>
                <span className="w-28 text-right text-[12px] text-muted-foreground">
                  {formatDistanceToNow(new Date(m.updatedAt), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                      aria-label="Opções da revista"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => openCard(m)}>
                      <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicate(m)}>
                      <Copy className="mr-2 h-3.5 w-3.5" /> Duplicar
                    </DropdownMenuItem>
                    {m.status === 'published' && m.publicToken && (
                      <DropdownMenuItem asChild>
                        <a
                          href={`/m/${m.publicToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-2 h-3.5 w-3.5" /> Ver pública
                        </a>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setPendingDelete(m)}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir revista?</AlertDialogTitle>
            <AlertDialogDescription>
              A revista <strong>{pendingDelete?.title}</strong> será excluída. Você pode desfazer
              essa ação por alguns segundos após confirmar.
              {pendingDelete?.status === 'published' && (
                <span className="mt-1 block text-warning">
                  Esta revista está publicada e ficará inacessível imediatamente.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="magazine-delete-confirm"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
