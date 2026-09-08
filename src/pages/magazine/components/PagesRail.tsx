/**
 * PagesRail — trilho "Páginas da revista" (Blue Premium §31).
 *
 * Lista vertical de miniaturas reais (thumb A4 + número + rótulo). Compartilha
 * o contrato de rings com o `PreviewSidebar` — os testes de regressão em
 * `tests/magazine/preview-ring-*.test.tsx` e o harness `/__test/magazine-ring`
 * dependem destas classes:
 *
 *   ativa            → `ring-2 ring-primary`   (nunca âmbar)
 *   destacada (hover) → `ring-2 ring-amber-500` (nunca primary)
 *   foco por teclado → `focus-visible:ring-primary`
 */

import { useMemo } from 'react';
import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Magazine, MagazinePage } from '@/types/magazine';
import { MagazinePageRenderer } from './MagazinePageRenderer';
import { PG_PANEL, PG_PANEL_TITLE } from '../pg';

export function pageLabel(p: MagazinePage): string {
  if (p.kind === 'cover') return 'Capa';
  if (p.kind === 'back-cover') return 'Contracapa';
  if (p.kind === 'section') return `Seção: ${p.sectionTitle ?? '—'}`;
  return `${p.items.length} produto${p.items.length === 1 ? '' : 's'}`;
}

interface Props {
  magazine: Magazine;
  pages: MagazinePage[];
  activeIdx: number;
  onSelect: (idx: number) => void;
  highlightedItemId?: string | null;
  /** Painel próprio (borda/título) ou lista nua para embutir em outro painel. */
  framed?: boolean;
  className?: string;
}

export function PagesRail({
  magazine,
  pages,
  activeIdx,
  onSelect,
  highlightedItemId,
  framed = true,
  className,
}: Props) {
  const highlightedPageIdx = useMemo(() => {
    if (!highlightedItemId) return -1;
    return pages.findIndex((p) => p.items.some((it) => it.id === highlightedItemId));
  }, [highlightedItemId, pages]);

  const list = (
    <ol className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Páginas da revista">
      {pages.map((p, idx) => {
        const isHighlighted = idx === highlightedPageIdx;
        const isActive = idx === activeIdx;
        return (
          <li key={p.index}>
            <button
              type="button"
              onClick={() => onSelect(idx)}
              className={cn(
                'group flex w-full items-center gap-3 rounded-md border bg-card-elevated p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isActive && 'border-primary/50 bg-primary/10 ring-2 ring-primary',
                !isActive && isHighlighted && 'ring-2 ring-amber-500',
                !isActive && !isHighlighted && 'border-border hover:border-border-strong',
              )}
              aria-label={`Ir para página ${idx + 1}: ${pageLabel(p)}`}
              aria-current={isActive ? 'true' : undefined}
            >
              <div className="aspect-[3/4] w-[72px] shrink-0 overflow-hidden rounded-sm bg-neutral-100">
                <MagazinePageRenderer
                  magazine={magazine}
                  page={p}
                  totalPages={pages.length}
                  fitContainer
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold tabular-nums text-foreground">
                  {idx + 1}
                </div>
                <div className="truncate text-xs text-muted-foreground">{pageLabel(p)}</div>
              </div>
            </button>
          </li>
        );
      })}
    </ol>
  );

  if (!framed) return <div className={className}>{list}</div>;

  return (
    <section
      aria-label="Páginas da revista"
      className={cn(PG_PANEL, 'flex min-h-0 flex-col p-3', className)}
    >
      <header className="mb-3 flex items-center gap-2 px-1">
        <Layers className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h3 className={cn(PG_PANEL_TITLE, 'text-[15px]')}>Páginas da revista</h3>
        <span className="ml-auto rounded-md bg-background px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
          {pages.length}
        </span>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">{list}</div>
    </section>
  );
}
