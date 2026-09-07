/**
 * TemplateCard — Card individual da galeria de templates (Blue Premium §22).
 *
 * Renderiza o template REAL (1920×2716) escalado para a largura do card e
 * recortado em paisagem (16:9, alinhado ao topo) — grande o suficiente para
 * diferenciar layouts sem virar thumbnail minúscula. Adia a montagem até
 * estar visível via IntersectionObserver — evita renderizar 12 templates
 * de uma vez.
 */

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Eye, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TemplateEntry } from '../components/templates/TemplateRegistry';
import { buildMockMagazine, buildMockPage } from './mockMagazine';
import { PAGE_H, PAGE_W, THUMB_SCALE } from './constants';
import { TemplatePreviewBoundary } from './TemplatePreviewBoundary';
import { PG_BTN, PG_BTN_OUTLINE, PG_CARD, PG_CARD_HOVER } from '../pg';

interface Props {
  entry: TemplateEntry;
  onPreview: (id: TemplateEntry['id']) => void;
  onUse: (id: TemplateEntry['id']) => void;
  useLabel: string;
  isFavorite?: boolean;
  onToggleFavorite?: (id: TemplateEntry['id']) => void;
  /** 'grid' (default) ou 'row' (modo lista). */
  variant?: 'grid' | 'row';
}

export const FAMILY_LABEL: Record<TemplateEntry['family'], string> = {
  editorial: 'Editorial',
  catalog: 'Catálogo',
  corporate: 'Corporativo',
};

export function densityLabel(n: number): string {
  return n === 1 ? '1 produto/página' : `${n} produtos/página`;
}

/** Largura real do container (ResizeObserver) — fallback THUMB_SCALE em jsdom. */
function useElementWidth<T extends HTMLElement>(ref: React.RefObject<T | null>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

const CHIP = 'inline-flex h-6 items-center rounded-sm border px-2 text-[11px] font-medium';

function TemplateCardImpl({
  entry,
  onPreview,
  onUse,
  useLabel,
  isFavorite = false,
  onToggleFavorite,
  variant = 'grid',
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);
  const previewWidth = useElementWidth(previewRef);
  const scale = previewWidth > 0 ? previewWidth / PAGE_W : THUMB_SCALE;

  useEffect(() => {
    const el = rootRef.current;
    if (!el || visible) return;
    // SSR / jsdom fallback: se IntersectionObserver não existir, monta imediato
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  const magazine = useMemo(() => buildMockMagazine(entry.id), [entry.id]);
  const page = useMemo(() => buildMockPage(entry.id), [entry.id]);
  const Template = entry.Component;

  const handlePrefetch = () => {
    if (!visible) setVisible(true);
  };

  const row = variant === 'row';

  const preview = (
    <button
      ref={previewRef}
      type="button"
      aria-label={`Ver o template ${entry.name} em tamanho real`}
      onClick={() => onPreview(entry.id)}
      className={cn(
        'relative block w-full overflow-hidden bg-neutral-100 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
        row ? 'aspect-[16/9] rounded-md' : 'aspect-[16/9]',
      )}
      data-testid={`template-preview-${entry.id}`}
    >
      {visible ? (
        <TemplatePreviewBoundary templateName={entry.name}>
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 origin-top-left"
            style={{
              width: PAGE_W,
              height: PAGE_H,
              transform: `scale(${scale})`,
            }}
          >
            <Template magazine={magazine} page={page} totalPages={1} />
          </div>
        </TemplatePreviewBoundary>
      ) : (
        <div aria-hidden className="flex h-full w-full animate-pulse flex-col gap-2 bg-muted p-4">
          <div className="h-5 w-3/5 rounded-sm bg-muted-foreground/20" />
          <div className="mt-auto flex-1 rounded-sm bg-muted-foreground/10" />
        </div>
      )}
      <span className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-background/70 to-transparent opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none">
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
          <Eye className="h-3.5 w-3.5" aria-hidden />
          Ver em tamanho real
        </span>
      </span>
    </button>
  );

  const favorite = onToggleFavorite && (
    <button
      type="button"
      aria-label={isFavorite ? 'Remover dos favoritos' : 'Marcar como favorito'}
      aria-pressed={isFavorite}
      onClick={(e) => {
        e.stopPropagation();
        onToggleFavorite(entry.id);
      }}
      className={cn(
        'absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background/90 text-muted-foreground shadow-sm transition-colors duration-150 hover:border-border-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        isFavorite && 'border-primary/50 text-primary',
      )}
      data-testid={`template-favorite-${entry.id}`}
    >
      <Heart className={cn('h-4 w-4', isFavorite && 'fill-current')} aria-hidden />
    </button>
  );

  const favoriteBadge = isFavorite && (
    <span
      role="status"
      className="absolute left-3 top-3 z-10 inline-flex h-6 items-center gap-1 rounded-sm border border-primary/40 bg-primary/15 px-2 text-[11px] font-semibold text-primary"
    >
      <Heart className="h-3 w-3 fill-current" aria-hidden />
      Seu favorito
    </span>
  );

  const meta = (
    <>
      <div className="flex items-start justify-between gap-2">
        <h3 className="truncate text-[16px] font-semibold leading-tight text-foreground">
          {entry.name}
        </h3>
        <span className={cn(CHIP, 'shrink-0 border-border bg-card-elevated text-muted-foreground')}>
          {FAMILY_LABEL[entry.family]}
        </span>
      </div>
      <p className="line-clamp-2 text-[12px] leading-snug text-muted-foreground">
        {entry.description}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={cn(CHIP, 'border-primary/30 bg-primary/10 text-primary')}>
          {densityLabel(entry.productsPerPage)}
        </span>
        <span
          className={cn(CHIP, 'border-border bg-card-elevated text-foreground')}
          title={`Fontes: ${entry.fonts.heading} + ${entry.fonts.body}`}
        >
          {entry.fonts.heading}
        </span>
        <span className="ml-auto flex items-center gap-1" aria-label="Paleta padrão">
          {(['primary', 'secondary', 'text'] as const).map((k) => (
            <span
              key={k}
              aria-hidden
              className="h-3.5 w-3.5 rounded-full ring-1 ring-border-strong"
              style={{ background: entry.defaultColors[k] }}
              title={`${k}: ${entry.defaultColors[k]}`}
            />
          ))}
        </span>
      </div>
    </>
  );

  const actions = (
    <>
      <Button
        variant="outline"
        size="sm"
        className={cn(PG_BTN_OUTLINE, 'h-10 min-h-0 flex-1 rounded-md text-[13px]')}
        onClick={() => onPreview(entry.id)}
      >
        <Eye className="mr-1.5 h-4 w-4" aria-hidden />
        Preview
      </Button>
      <Button
        size="sm"
        className={cn(PG_BTN, 'h-10 min-h-0 flex-1 rounded-md text-[13px]')}
        onClick={() => onUse(entry.id)}
        data-testid={`template-use-${entry.id}`}
      >
        {useLabel}
        <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden />
      </Button>
    </>
  );

  if (row) {
    return (
      <div
        ref={rootRef}
        onMouseEnter={handlePrefetch}
        onFocus={handlePrefetch}
        className={cn(
          PG_CARD,
          PG_CARD_HOVER,
          'group relative grid grid-cols-1 gap-4 p-3 md:grid-cols-[224px_minmax(0,1fr)_auto] md:items-center',
          isFavorite && 'border-primary/40',
        )}
        data-testid={`template-card-${entry.id}`}
      >
        {favoriteBadge}
        {favorite}
        <div className="relative">{preview}</div>
        <div className="flex min-w-0 flex-col gap-2">{meta}</div>
        <div className="flex items-center gap-2 md:w-[260px]">{actions}</div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '380px' }}
      className={cn(
        PG_CARD,
        PG_CARD_HOVER,
        'group relative flex flex-col overflow-hidden',
        isFavorite && 'border-primary/40',
      )}
      data-testid={`template-card-${entry.id}`}
    >
      {favoriteBadge}
      {favorite}
      {preview}
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        {meta}
        <div className="mt-auto flex items-center gap-2 pt-1.5">{actions}</div>
      </div>
    </div>
  );
}

export const TemplateCard = memo(TemplateCardImpl);
