/**
 * PreviewSidebar — stage do preview A4 (Blue Premium §23/§26) com:
 *  - Preview grande da página selecionada em stage profundo
 *  - Navegação anterior/próxima + contador "n / total"
 *  - Zoom (Fit / 150% / 200% / 300%) com scroll interno e atalhos + − 0
 *  - Tela cheia (Fullscreen API, quando disponível)
 *  - Trilho de páginas (`PagesRail`) nas variantes sidebar/drawer
 *  - Highlight da página que contém o item em hover no LayoutStep
 *  - Contador de páginas/produtos e botão "Ver todas" (nova aba)
 *
 * Variantes:
 *  - 'sidebar' (default): painel sticky com stage + trilho de páginas.
 *  - 'drawer': fluido, sem borda — usado dentro do Sheet.
 *  - 'stage': só o stage (o trilho é renderizado à parte pelo editor).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, ImageOff, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Magazine, MagazinePage } from '@/types/magazine';
import { MagazinePageRenderer } from './MagazinePageRenderer';
import { PagesRail, pageLabel } from './PagesRail';
import { PG_OVERLINE, PG_PANEL } from '../pg';

interface Props {
  magazine: Magazine;
  pages: MagazinePage[];
  activeIdx: number;
  onSelect: (idx: number) => void;
  onOpenAll: () => void;
  /** Onda 1 — item destacado no LayoutStep para realçar a página correspondente. */
  highlightedItemId?: string | null;
  /** 'sidebar' (default, sticky + trilho), 'drawer' (fluido) ou 'stage' (só o stage). */
  variant?: 'drawer' | 'sidebar' | 'stage';
}

/** Níveis de zoom: 1 = página inteira ajustada à área disponível. */
const ZOOM_LEVELS = [1, 1.5, 2, 3] as const;
type ZoomLevel = (typeof ZOOM_LEVELS)[number];

const CTRL_BTN =
  'h-8 w-8 min-h-0 min-w-0 rounded-md text-muted-foreground hover:bg-card-elevated hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary';

export function PreviewSidebar({
  magazine,
  pages,
  activeIdx,
  onSelect,
  onOpenAll,
  highlightedItemId,
  variant = 'sidebar',
}: Props) {
  const [zoom, setZoom] = useState<ZoomLevel>(1);
  const stageRef = useRef<HTMLDivElement>(null);
  const [fitWidth, setFitWidth] = useState<number | null>(null);
  const active = pages[activeIdx] ?? pages[0];
  const stageHasPage = Boolean(active);
  const hasActive = activeIdx >= 0 && activeIdx < pages.length;

  useEffect(() => {
    const element = stageRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const css = getComputedStyle(element);
      const horizontal = parseFloat(css.paddingLeft || '0') + parseFloat(css.paddingRight || '0');
      const vertical = parseFloat(css.paddingTop || '0') + parseFloat(css.paddingBottom || '0');
      const width = element.clientWidth - horizontal;
      const height = parseFloat(css.maxHeight) - vertical - 2;
      if (width <= 0) return;
      setFitWidth(
        Math.min(width, Number.isFinite(height) && height > 0 ? (height * 1920) / 2716 : width),
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [stageHasPage, variant]);

  const canZoomIn = zoom < ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
  const canZoomOut = zoom > ZOOM_LEVELS[0];

  const stepZoom = useCallback((dir: -1 | 1) => {
    setZoom((cur) => {
      const idx = ZOOM_LEVELS.indexOf(cur);
      return ZOOM_LEVELS[Math.min(ZOOM_LEVELS.length - 1, Math.max(0, idx + dir))];
    });
  }, []);

  const resetZoom = useCallback(() => setZoom(1), []);

  const canFullscreen = useMemo(
    () =>
      typeof document !== 'undefined' &&
      typeof document.documentElement.requestFullscreen === 'function',
    [],
  );
  const toggleFullscreen = useCallback(() => {
    const el = stageRef.current;
    if (!el || !canFullscreen) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen();
    }
  }, [canFullscreen]);

  /**
   * Atalhos globais de zoom (`+`/`=`, `-`, `0`).
   *
   * - Ignoramos quando o foco está em campo editável (input/textarea/select/
   *   contentEditable) — assim não sequestramos digitação em outras partes do
   *   editor (título, form fields, etc.).
   * - Ignoramos com modificadores (Ctrl/Cmd/Alt) para não colidir com o zoom
   *   nativo do navegador.
   * - `preventDefault` só quando de fato tratamos a tecla, preservando Tab e
   *   demais navegação por teclado do editor.
   */
  useEffect(() => {
    const isEditable = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.isContentEditable) return true;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isEditable(e.target)) return;
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        stepZoom(1);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        stepZoom(-1);
      } else if (e.key === '0') {
        e.preventDefault();
        resetZoom();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stepZoom, resetZoom]);

  const canPrev = hasActive && activeIdx > 0;
  const canNext = hasActive && activeIdx < pages.length - 1;

  return (
    <div
      className={cn(
        variant !== 'drawer' && cn(PG_PANEL, 'sticky top-2 p-3'),
        variant === 'drawer' && 'pg-module',
      )}
      data-variant={variant}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <span className={cn(PG_OVERLINE, 'min-w-0 truncate')}>
            Preview {active ? `— ${pageLabel(active)}` : ''}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenAll}
            aria-label="Abrir todas as páginas em nova aba"
            className="h-8 min-h-0 gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-card-elevated hover:text-foreground"
          >
            <Eye className="h-3.5 w-3.5" aria-hidden /> Ver todas
          </Button>
        </div>

        {active ? (
          <div
            ref={stageRef}
            className={cn(
              'pg-stage overflow-auto rounded-lg border border-border p-3 sm:p-4',
              variant === 'stage'
                ? 'max-h-[calc(100vh-260px)] min-h-[320px]'
                : 'max-h-[55vh] sm:max-h-[60vh]',
            )}
          >
            {/*
              A largura-base respeita largura E altura do stage. O renderer
              aplica uma única transformação; zoom amplia a partir do Fit.
            */}
            <div
              style={{ width: fitWidth === null ? `${zoom * 100}%` : fitWidth * zoom }}
              className="mx-auto shadow-[0_12px_32px_rgba(0,0,0,0.32)]"
            >
              <MagazinePageRenderer
                magazine={magazine}
                page={active}
                totalPages={pages.length}
                fitContainer
              />
            </div>
          </div>
        ) : (
          <div
            data-testid="preview-empty-state"
            role="status"
            aria-live="polite"
            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong bg-background px-4 py-10 text-center"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-card-elevated">
              <ImageOff className="h-5 w-5 text-muted-foreground" aria-hidden />
            </div>
            <p className="text-sm font-medium text-foreground">Sem capa para exibir</p>
            <p className="max-w-[220px] text-xs text-muted-foreground">
              Adicione produtos ou escolha um template para gerar o preview da revista.
            </p>
          </div>
        )}

        {/* Barra de controles: navegação de página + zoom + tela cheia */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            role="group"
            aria-label="Navegação de páginas do preview"
            className="flex items-center gap-0.5 rounded-md border border-border bg-card-elevated p-0.5"
          >
            <Button
              variant="ghost"
              size="icon"
              className={CTRL_BTN}
              onClick={() => onSelect(activeIdx - 1)}
              disabled={!canPrev}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <span
              className="min-w-[64px] px-1 text-center text-xs font-medium tabular-nums text-foreground"
              aria-live="polite"
            >
              {hasActive ? activeIdx + 1 : '–'} / {pages.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className={CTRL_BTN}
              onClick={() => onSelect(activeIdx + 1)}
              disabled={!canNext}
              aria-label="Próxima página"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          <div
            role="group"
            aria-label="Controles de zoom do preview"
            className="flex items-center gap-0.5 rounded-md border border-border bg-card-elevated p-0.5"
          >
            <Button
              variant="ghost"
              size="icon"
              className={CTRL_BTN}
              onClick={() => stepZoom(-1)}
              disabled={!canZoomOut}
              aria-label="Diminuir zoom"
              aria-keyshortcuts="-"
              aria-controls="magazine-preview-zoom-value"
              title="Diminuir zoom (−)"
            >
              <ZoomOut className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            {/*
              O indicador de zoom age como spinbutton (ARIA) — daí o uso de
              `<div role="spinbutton">` em vez de `<button>` (axe recusa
              `role=spinbutton` em <button>). Suporta:
                - Click / Enter / Space  → reset para Fit
                - ArrowUp / ArrowDown    → step de zoom (compatível c/ spinbutton)
                - Home                   → reset para Fit
              A leitura por AT é comandada por aria-valuetext (texto humano).
            */}
            <div
              id="magazine-preview-zoom-value"
              role="spinbutton"
              tabIndex={0}
              onClick={resetZoom}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  resetZoom();
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  stepZoom(1);
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  stepZoom(-1);
                } else if (e.key === 'Home') {
                  e.preventDefault();
                  resetZoom();
                }
              }}
              className="min-w-[46px] cursor-pointer select-none rounded-sm px-1 py-0.5 text-center font-mono text-[11px] tabular-nums text-foreground hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Zoom do preview"
              aria-keyshortcuts="0"
              aria-valuemin={Math.round(ZOOM_LEVELS[0] * 100)}
              aria-valuemax={Math.round(ZOOM_LEVELS[ZOOM_LEVELS.length - 1] * 100)}
              aria-valuenow={Math.round(zoom * 100)}
              aria-valuetext={
                zoom === 1 ? 'Ajustar página inteira' : `${Math.round(zoom * 100)} por cento`
              }
              title="Ajustar página inteira (0)"
            >
              {zoom === 1 ? 'Fit' : `${Math.round(zoom * 100)}%`}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className={CTRL_BTN}
              onClick={() => stepZoom(1)}
              disabled={!canZoomIn}
              aria-label="Aumentar zoom"
              aria-keyshortcuts="+"
              aria-controls="magazine-preview-zoom-value"
              title="Aumentar zoom (+)"
            >
              <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={CTRL_BTN}
              onClick={toggleFullscreen}
              disabled={!canFullscreen || !active}
              aria-label="Tela cheia"
              title="Tela cheia"
            >
              <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {variant !== 'stage' && pages.length > 1 && (
          <PagesRail
            magazine={magazine}
            pages={pages}
            activeIdx={activeIdx}
            onSelect={onSelect}
            highlightedItemId={highlightedItemId}
            framed={false}
            className="max-h-[280px] overflow-y-auto pr-1"
          />
        )}

        <div className="border-t border-border pt-2 text-xs text-muted-foreground">
          {pages.length} página(s) · {(magazine.items ?? []).length} produto(s)
        </div>
      </div>
    </div>
  );
}
