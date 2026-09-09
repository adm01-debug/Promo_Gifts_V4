/**
 * TemplatePreviewDialog — inspector do template (Blue Premium §23/§63-C).
 *
 * Dialog muito largo (min(1500px, 100vw − 64px)) com metadados à esquerda
 * (descrição, formato, características, casos de uso, tipografia, paleta) e
 * canvas A4 central com navegação de páginas, zoom e tela cheia. As páginas
 * vêm da paginação REAL da revista mock (capa, produtos, contracapa), rendidas
 * pelo `MagazinePageRenderer`.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Heart,
  LayoutGrid,
  Maximize2,
  MoreVertical,
  RectangleVertical,
  Sparkles,
  Users,
  ZoomIn,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { TemplateEntry } from '../components/templates/TemplateRegistry';
import { MagazinePageRenderer } from '../components/MagazinePageRenderer';
import { paginateMagazine } from '../pagination';
import { buildMockMagazine } from './mockMagazine';
import { PAGE_H, PAGE_W } from './constants';
import { TemplatePreviewBoundary } from './TemplatePreviewBoundary';
import { FAMILY_LABEL, densityLabel } from './TemplateCard';
import { PG_BTN, PG_ICON_BTN, PG_OVERLINE, PG_SELECT } from '../pg';

interface Props {
  entry: TemplateEntry | null;
  onOpenChange: (open: boolean) => void;
  onUse: (id: TemplateEntry['id']) => void;
  useLabel: string;
  isBusy?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (id: TemplateEntry['id']) => void;
}

const ZOOM_OPTIONS = [50, 75, 100, 125, 150] as const;
const STAGE_PADDING = 48;

/** Escala "fit" do A4 dentro do stage (ResizeObserver; fallback pela viewport). */
function useFitScale(open: boolean, stageRef: React.RefObject<HTMLDivElement | null>) {
  const [fit, setFit] = useState(0.35);

  useEffect(() => {
    if (!open) return;
    const compute = () => {
      const el = stageRef.current;
      const w = el?.clientWidth || Math.min(window.innerWidth - 96, 1400);
      const h = el?.clientHeight || window.innerHeight - 200;
      const s = Math.min((w - STAGE_PADDING) / PAGE_W, (h - STAGE_PADDING) / PAGE_H);
      setFit(Math.max(0.1, s));
    };
    compute();
    window.addEventListener('resize', compute);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && stageRef.current) {
      ro = new ResizeObserver(compute);
      ro.observe(stageRef.current);
    }
    return () => {
      window.removeEventListener('resize', compute);
      ro?.disconnect();
    };
  }, [open, stageRef]);

  return fit;
}

const SPEC_ROW = 'flex items-center gap-3 py-2 text-[12px]';
const SPEC_LABEL = 'w-[120px] shrink-0 text-muted-foreground';

function TemplatePreviewDialogImpl({
  entry,
  onOpenChange,
  onUse,
  useLabel,
  isBusy = false,
  isFavorite = false,
  onToggleFavorite,
}: Props) {
  const open = entry !== null; // entry: TemplateEntry|null, nunca undefined
  const stageRef = useRef<HTMLDivElement>(null);
  const fit = useFitScale(open, stageRef);
  const [zoom, setZoom] = useState<(typeof ZOOM_OPTIONS)[number]>(100);
  const [pageIdx, setPageIdx] = useState(0);

  const magazine = useMemo(() => (entry ? buildMockMagazine(entry.id) : null), [entry]);
  const pages = useMemo(() => (magazine ? paginateMagazine(magazine) : []), [magazine]);

  // Ao abrir outro template: volta o zoom e posiciona na 1ª página de produtos.
  useEffect(() => {
    if (!entry) return;
    setZoom(100);
    const firstProducts = pages.findIndex((p) => p.kind === 'products');
    setPageIdx(firstProducts >= 0 ? firstProducts : 0);
  }, [entry, pages]);

  const canPrev = pageIdx > 0;
  const canNext = pageIdx < pages.length - 1;
  const goPrev = useCallback(() => setPageIdx((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(
    () => setPageIdx((i) => Math.min(pages.length - 1, i + 1)),
    [pages.length],
  );

  const canFullscreen =
    typeof document !== 'undefined' &&
    typeof document.documentElement.requestFullscreen === 'function';
  const toggleFullscreen = useCallback(() => {
    const el = stageRef.current;
    if (!el || !canFullscreen) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen();
  }, [canFullscreen]);

  if (!entry || !magazine) {
    return (
      <Dialog open={false} onOpenChange={onOpenChange}>
        <DialogContent />
      </Dialog>
    );
  }

  const scale = fit * (zoom / 100);
  const scaledW = PAGE_W * scale;
  const scaledH = PAGE_H * scale;
  const page = pages[pageIdx] ?? pages[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="pg-module flex h-[calc(100vh-48px)] w-[min(1500px,calc(100vw-64px))] max-w-none flex-col gap-0 overflow-hidden rounded-2xl border-border bg-popover p-0 shadow-xl"
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') goPrev();
          if (e.key === 'ArrowRight') goNext();
        }}
      >
        {/* Header */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4 pr-16">
          <div className="min-w-0">
            <DialogTitle className="font-display text-[24px] font-bold leading-tight tracking-tight text-foreground">
              {entry.name}
            </DialogTitle>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex h-6 items-center rounded-sm border border-border bg-card-elevated px-2 text-[11px] font-medium text-muted-foreground">
                {FAMILY_LABEL[entry.family]}
              </span>
              <span className="inline-flex h-6 items-center rounded-sm border border-primary/30 bg-primary/10 px-2 text-[11px] font-medium text-primary">
                {entry.productsPerPage} / página
              </span>
              <DialogDescription className="text-[12px] text-muted-foreground">
                {entry.description}
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onToggleFavorite && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={PG_ICON_BTN}
                    aria-label="Mais opções do template"
                  >
                    <MoreVertical className="h-4 w-4" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="pg-module w-56 rounded-lg border-border bg-popover p-1.5"
                >
                  <DropdownMenuItem
                    onSelect={() => onToggleFavorite(entry.id)}
                    className="h-9 rounded-md text-[13px]"
                  >
                    <Heart
                      className={cn('mr-2 h-4 w-4', isFavorite && 'fill-current text-primary')}
                      aria-hidden
                    />
                    {isFavorite ? 'Remover dos favoritos' : 'Marcar como favorito'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              size="sm"
              onClick={() => onUse(entry.id)}
              disabled={isBusy}
              aria-busy={isBusy}
              className={cn(PG_BTN, 'h-11 rounded-md px-5 text-[14px]')}
              data-testid="template-preview-use"
            >
              <Sparkles className="mr-2 h-4 w-4" aria-hidden />
              {useLabel}
            </Button>
          </div>
        </div>

        {/* Body: metadata | canvas */}
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="min-h-0 overflow-y-auto border-b border-border p-6 lg:border-b-0 lg:border-r">
            <h3 className="text-[15px] font-semibold text-foreground">Sobre o template</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              {entry.description}
            </p>

            <dl className="mt-4 divide-y divide-border border-y border-border">
              <div className={SPEC_ROW}>
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <dt className={SPEC_LABEL}>Formato</dt>
                <dd className="text-foreground">A4 (210 × 297 mm)</dd>
              </div>
              <div className={SPEC_ROW}>
                <RectangleVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <dt className={SPEC_LABEL}>Orientação</dt>
                <dd className="text-foreground">Retrato (vertical)</dd>
              </div>
              <div className={SPEC_ROW}>
                <LayoutGrid className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <dt className={SPEC_LABEL}>Produtos por página</dt>
                <dd className="text-foreground">{densityLabel(entry.productsPerPage)}</dd>
              </div>
              {entry.visualStyle && (
                <div className={SPEC_ROW}>
                  <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <dt className={SPEC_LABEL}>Estilo visual</dt>
                  <dd className="text-foreground">{entry.visualStyle}</dd>
                </div>
              )}
              {entry.audience && (
                <div className={SPEC_ROW}>
                  <Users className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <dt className={SPEC_LABEL}>Público-alvo</dt>
                  <dd className="text-foreground">{entry.audience}</dd>
                </div>
              )}
            </dl>

            {entry.features && entry.features.length > 0 && (
              <section className="mt-5" aria-label="Principais características">
                <h4 className="text-[14px] font-semibold text-foreground">
                  Principais características
                </h4>
                <ul className="m-0 mt-2.5 list-none space-y-2 p-0">
                  {entry.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-[13px] text-foreground">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" aria-hidden />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {entry.useCases && entry.useCases.length > 0 && (
              <section className="mt-5" aria-label="Casos de uso ideais">
                <h4 className="text-[14px] font-semibold text-foreground">Casos de uso ideais</h4>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {entry.useCases.map((u) => (
                    <span
                      key={u}
                      className="inline-flex h-7 items-center rounded-md border border-border bg-card-elevated px-2.5 text-[12px] text-foreground"
                    >
                      {u}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-5" aria-label="Tipografia">
              <h4 className="text-[14px] font-semibold text-foreground">Tipografia</h4>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                {[
                  { role: 'Títulos', font: entry.fonts.heading },
                  { role: 'Textos', font: entry.fonts.body },
                ].map((f) => (
                  <div
                    key={f.role}
                    className="flex items-center gap-3 rounded-md border border-border bg-card-elevated px-3 py-2.5"
                  >
                    <span
                      className="text-[20px] font-semibold leading-none text-foreground"
                      style={{ fontFamily: `'${f.font}', serif` }}
                      aria-hidden
                    >
                      Aa
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-semibold text-foreground">
                        {f.font}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">{f.role}</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-5" aria-label="Paleta de cores">
              <h4 className="text-[14px] font-semibold text-foreground">Paleta de cores</h4>
              <div className="mt-2.5 flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  {(['primary', 'secondary', 'text'] as const).map((k) => (
                    <span
                      key={k}
                      aria-hidden
                      className="h-7 w-7 rounded-full ring-1 ring-border-strong"
                      style={{ background: entry.defaultColors[k] }}
                      title={`${k}: ${entry.defaultColors[k]}`}
                    />
                  ))}
                </div>
                <span aria-hidden className="h-7 w-px bg-border-strong" />
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Paleta padrão do template — substituída pelas cores do cliente na etapa
                  Identidade.
                </p>
              </div>
            </section>
          </aside>

          <div className="flex min-h-0 flex-col">
            {/* Canvas toolbar */}
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
              <div
                role="group"
                aria-label="Navegação de páginas"
                className="flex items-center gap-1 rounded-md border border-border bg-card-elevated p-0.5"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 min-h-0 w-8 min-w-0 rounded-sm"
                  onClick={goPrev}
                  disabled={!canPrev}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </Button>
                <span
                  className="min-w-[110px] px-2 text-center text-[13px] font-medium tabular-nums text-foreground"
                  aria-live="polite"
                >
                  Página {pageIdx + 1} de {pages.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 min-h-0 w-8 min-w-0 rounded-sm"
                  onClick={goNext}
                  disabled={!canNext}
                  aria-label="Próxima página"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={String(zoom)}
                  onValueChange={(v) => setZoom(Number(v) as typeof zoom)}
                >
                  <SelectTrigger
                    className={cn(PG_SELECT, 'h-10 w-[112px]')}
                    aria-label="Zoom do preview"
                  >
                    <ZoomIn className="mr-1.5 h-4 w-4 text-muted-foreground" aria-hidden />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="pg-module rounded-lg border-border">
                    {ZOOM_OPTIONS.map((z) => (
                      <SelectItem key={z} value={String(z)}>
                        {z}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  className={PG_ICON_BTN}
                  onClick={toggleFullscreen}
                  disabled={!canFullscreen}
                  aria-label="Tela cheia"
                >
                  <Maximize2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>

            {/* Stage */}
            <div className="relative min-h-0 flex-1">
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  PG_ICON_BTN,
                  'absolute left-4 top-1/2 z-10 h-11 w-11 -translate-y-1/2 rounded-full bg-card/90',
                )}
                onClick={goPrev}
                disabled={!canPrev}
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  PG_ICON_BTN,
                  'absolute right-4 top-1/2 z-10 h-11 w-11 -translate-y-1/2 rounded-full bg-card/90',
                )}
                onClick={goNext}
                disabled={!canNext}
                aria-label="Próxima página"
              >
                <ChevronRight className="h-5 w-5" aria-hidden />
              </Button>
              <div
                ref={stageRef}
                className="pg-stage flex h-full w-full items-center justify-center overflow-auto p-6"
              >
                <div
                  className="relative shrink-0 shadow-[0_24px_70px_rgba(0,0,0,0.52)]"
                  style={{ width: scaledW, height: scaledH }}
                  aria-label={`Preview do template ${entry.name}, página ${pageIdx + 1} de ${pages.length}`}
                  role="img"
                >
                  <TemplatePreviewBoundary templateName={entry.name}>
                    <div
                      aria-hidden
                      className="pointer-events-none absolute left-0 top-0 origin-top-left"
                      style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${scale})` }}
                    >
                      {page && (
                        <MagazinePageRenderer
                          magazine={magazine}
                          page={page}
                          totalPages={pages.length}
                        />
                      )}
                    </div>
                  </TemplatePreviewBoundary>
                </div>
              </div>
            </div>

            {/* Dots */}
            {pages.length > 1 && pages.length <= 16 && (
              <div className="flex shrink-0 items-center justify-center gap-1.5 py-2.5" aria-hidden>
                {pages.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    tabIndex={-1}
                    onClick={() => setPageIdx(i)}
                    className={cn(
                      'h-2 rounded-full transition-all duration-150',
                      i === pageIdx
                        ? 'w-5 bg-primary'
                        : 'w-2 bg-border-strong hover:bg-muted-foreground',
                    )}
                  />
                ))}
              </div>
            )}
            <span className={cn(PG_OVERLINE, 'sr-only')}>
              Use as setas do teclado para navegar entre as páginas
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const TemplatePreviewDialog = memo(
  TemplatePreviewDialogImpl,
  (a, b) =>
    a.entry?.id === b.entry?.id &&
    a.useLabel === b.useLabel &&
    a.isBusy === b.isBusy &&
    a.isFavorite === b.isFavorite &&
    a.onToggleFavorite === b.onToggleFavorite,
);
