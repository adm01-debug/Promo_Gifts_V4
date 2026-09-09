/**
 * MagazineTemplatesGalleryPage — /magazine/templates
 *
 * Vitrine dos 12 templates de revista (Blue Premium §22/§63-B). Cada card
 * renderiza o template REAL com produtos mock, permitindo ao usuário conhecer
 * o visual antes de aplicar. Filtros por família e densidade, ordenação e
 * modos grade/lista.
 *
 * Se `?returnTo=/magazine/:id` estiver na URL, "Usar este template" navega
 * de volta com `?applyTemplate=<id>` — o editor aplica o template automaticamente.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, LayoutGrid, LayoutTemplate, List } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { magazineService } from '@/services/magazineService';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageSEO } from '@/components/seo/PageSEO';
import { cn } from '@/lib/utils';
import {
  TEMPLATE_REGISTRY,
  listTemplates,
  type TemplateEntry,
} from '../components/templates/TemplateRegistry';
import type { MagazineTemplateFamily } from '@/types/magazine';
import { TemplateCard } from './TemplateCard';
import { TemplatePreviewDialog } from './TemplatePreviewDialog';
import { parseReturnTo } from './safeReturn';
import { useFavoriteTemplate } from './useFavoriteTemplate';
import { useBluePremiumTheme } from '../hooks/useBluePremiumTheme';
import {
  PG_BTN_OUTLINE_PRIMARY,
  PG_ICON_BOX,
  PG_PAGE,
  PG_PANEL,
  PG_SELECT,
  pgPill,
  pgToggleIcon,
} from '../pg';

type FamilyFilter = MagazineTemplateFamily | 'all';
type DensityFilter = '1' | '2-4' | '5+' | 'all';
type SortMode = 'density-asc' | 'density-desc' | 'name' | 'recent';
type ViewMode = 'grid' | 'list';

const FAMILY_TABS: Array<{ id: FamilyFilter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'editorial', label: 'Editorial' },
  { id: 'catalog', label: 'Catálogo' },
  { id: 'corporate', label: 'Corporativo' },
];

const DENSITY_TABS: Array<{ id: DensityFilter; label: string; match: (n: number) => boolean }> = [
  { id: '1', label: '1 produto/página', match: (n) => n === 1 },
  { id: '2-4', label: '2–4 produtos', match: (n) => n >= 2 && n <= 4 },
  { id: '5+', label: '5+ produtos', match: (n) => n >= 5 },
];

function isValidTemplateId(id: string): id is TemplateEntry['id'] {
  return Object.hasOwn(TEMPLATE_REGISTRY, id);
}

export default function MagazineTemplatesGalleryPage() {
  useBluePremiumTheme();
  const { user } = useAuth();
  const creating = useRef(false);
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const parsedReturn = useMemo(() => parseReturnTo(params.get('returnTo')), [params]);
  const isFromEditor = parsedReturn !== null;

  const [family, setFamily] = useState<FamilyFilter>('all');
  const [density, setDensity] = useState<DensityFilter>('all');
  const [sort, setSort] = useState<SortMode>('recent');
  const [view, setView] = useState<ViewMode>('grid');
  const [previewId, setPreviewId] = useState<TemplateEntry['id'] | null>(null);
  const { favoriteId, toggleFavorite } = useFavoriteTemplate();

  const templates = useMemo(() => {
    const all = listTemplates();
    const densityRule = DENSITY_TABS.find((d) => d.id === density)?.match;
    let filtered = family === 'all' ? all : all.filter((t) => t.family === family);
    if (densityRule) filtered = filtered.filter((t) => densityRule(t.productsPerPage));
    if (sort !== 'recent') {
      filtered = [...filtered].sort((a, b) => {
        if (sort === 'name') return a.name.localeCompare(b.name, 'pt-BR');
        if (sort === 'density-asc') return a.productsPerPage - b.productsPerPage;
        return b.productsPerPage - a.productsPerPage;
      });
    }
    if (!favoriteId) return filtered;
    // favorito primeiro (se estiver no filtro atual), demais preservam ordem
    const fav = filtered.find((t) => t.id === favoriteId);
    if (!fav) return filtered;
    return [fav, ...filtered.filter((t) => t.id !== favoriteId)];
  }, [family, density, sort, favoriteId]);

  const previewEntry = useMemo(
    () => (previewId ? (listTemplates().find((t) => t.id === previewId) ?? null) : null),
    [previewId],
  );

  const useLabel = isCreating
    ? 'Criando revista…'
    : isFromEditor
      ? 'Usar este template'
      : 'Usar template';

  const handleUse = useCallback(
    async (id: TemplateEntry['id']) => {
      if (!isValidTemplateId(id)) {
        toast.error('Template inválido. Escolha outro da galeria.');
        return;
      }
      if (parsedReturn) {
        navigate(`${parsedReturn.path}?applyTemplate=${encodeURIComponent(id)}`);
        return;
      }
      if (creating.current) return;
      if (!user) {
        toast.error('Entre na sua conta para criar uma revista.');
        return;
      }
      creating.current = true;
      setIsCreating(true);
      try {
        const magazine = await magazineService.create({ ownerId: user.id, templateId: id });
        navigate(`/magazine/${magazine.id}`);
      } catch {
        toast.error('Não foi possível criar a revista. Tente novamente.');
      } finally {
        creating.current = false;
        setIsCreating(false);
      }
    },
    [navigate, parsedReturn, user],
  );

  const handlePreview = useCallback((id: TemplateEntry['id']) => setPreviewId(id), []);

  return (
    <>
      <PageSEO
        title="Templates de Revista — Promo Brindes"
        description="Conheça os 12 templates de revista disponíveis: editorial, catálogo e corporativo. Preview real de cada design antes de aplicar."
        path="/magazine/templates"
      />

      <div className={PG_PAGE}>
        <a
          href="#templates-grid"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
        >
          Pular para os templates
        </a>

        {/* Header (§14) */}
        <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className={cn(PG_ICON_BOX, 'h-14 w-14 rounded-lg')}>
              <LayoutTemplate className="h-7 w-7" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1
                data-testid="page-title-magazine-templates"
                className="font-display text-[30px] font-bold leading-[1.12] tracking-tight text-foreground"
              >
                Templates de Revista
              </h1>
              <p className="mt-1 max-w-3xl text-[13px] text-muted-foreground">
                Escolha um design profissional para a sua revista. Personalize com a identidade da
                sua marca e crie catálogos incríveis.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            asChild
            className={cn(PG_BTN_OUTLINE_PRIMARY, 'h-11 rounded-md px-4 text-[14px]')}
          >
            <Link to={parsedReturn ? parsedReturn.path : '/magazine'} className="link-unstyled">
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
              {isFromEditor ? 'Voltar ao editor' : 'Voltar para revistas'}
            </Link>
          </Button>
        </header>

        {/* Toolbar (§16): família · densidade · ordenação · modo */}
        <div className="mb-5 flex flex-wrap items-center gap-2.5">
          <div
            className="flex flex-wrap items-center gap-2"
            role="tablist"
            aria-label="Filtrar templates por família"
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const tabs = Array.from(
                event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
              );
              const current = tabs.findIndex((tab) => tab === document.activeElement);
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? tabs.length - 1
                    : event.key === 'ArrowLeft'
                      ? (current - 1 + tabs.length) % tabs.length
                      : (current + 1) % tabs.length;
              tabs[next]?.focus();
              tabs[next]?.click();
            }}
          >
            {FAMILY_TABS.map((tab) => {
              const active = family === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  type="button"
                  id={`template-family-tab-${tab.id}`}
                  aria-selected={active}
                  aria-controls="templates-grid"
                  tabIndex={active ? 0 : -1}
                  onClick={() => setFamily(tab.id)}
                  className={pgPill(active, 'h-11 px-4')}
                  data-testid={`template-family-${tab.id}`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <span aria-hidden className="mx-1 hidden h-7 w-px bg-border-strong sm:block" />
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Filtrar por densidade"
          >
            {DENSITY_TABS.map((tab) => {
              const active = density === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setDensity(active ? 'all' : tab.id)}
                  className={pgPill(active, 'h-11 px-4')}
                  data-testid={`template-density-${tab.id}`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
              <SelectTrigger
                className={cn(PG_SELECT, 'h-11 w-[176px]')}
                aria-label="Ordenar templates"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="pg-module rounded-lg border-border">
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="name">Nome A–Z</SelectItem>
                <SelectItem value="density-asc">Menos produtos/página</SelectItem>
                <SelectItem value="density-desc">Mais produtos/página</SelectItem>
              </SelectContent>
            </Select>
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
          </div>
        </div>

        {/* Grid de cards */}
        <main
          id="templates-grid"
          aria-labelledby={`template-family-tab-${family}`}
          className={cn(
            view === 'grid'
              ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : 'flex flex-col gap-3',
          )}
          aria-live="polite"
          aria-label={`${templates.length} templates disponíveis`}
        >
          {templates.map((entry) => (
            <TemplateCard
              key={entry.id}
              entry={entry}
              onPreview={handlePreview}
              onUse={handleUse}
              useLabel={useLabel}
              isBusy={isCreating}
              isFavorite={entry.id === favoriteId}
              onToggleFavorite={toggleFavorite}
              variant={view === 'grid' ? 'grid' : 'row'}
            />
          ))}
          {templates.length === 0 && (
            <div
              className={cn(
                PG_PANEL,
                'col-span-full border-dashed p-12 text-center text-[13px] text-muted-foreground',
              )}
            >
              Nenhum template nesta combinação de filtros.
            </div>
          )}
        </main>
      </div>

      <TemplatePreviewDialog
        entry={previewEntry}
        onOpenChange={(o) => !o && setPreviewId(null)}
        onUse={(id) => {
          setPreviewId(null);
          handleUse(id);
        }}
        useLabel={useLabel}
        isBusy={isCreating}
        isFavorite={previewEntry !== null && previewEntry.id === favoriteId}
        onToggleFavorite={toggleFavorite}
      />
    </>
  );
}
