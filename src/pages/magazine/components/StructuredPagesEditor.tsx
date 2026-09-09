import { ArrowDown, ArrowUp, Copy, FilePlus2, LayoutList, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type {
  Magazine,
  MagazinePageDefinition,
  MagazinePageOrder,
  MagazineStructuredPageKind,
} from '@/types/magazine';
import {
  createMagazinePageDefinition,
  createStructuredPageOrder,
  isMagazinePageOrderV2,
} from '../pagination';
import { PG_BTN_OUTLINE, PG_PANEL, PG_PANEL_TITLE, PG_SUBTITLE } from '../pg';

interface Props {
  magazine: Magazine;
  onChange: (pageOrder: MagazinePageOrder) => void;
}

const PAGE_LABELS: Record<MagazineStructuredPageKind, string> = {
  'back-cover': 'Contracapa',
  contact: 'Contato',
  cover: 'Capa',
  institutional: 'Institucional',
  products: 'Produtos',
  section: 'Seção',
};

function isClosingPage(page: MagazinePageDefinition): boolean {
  return page.kind === 'contact' || page.kind === 'back-cover';
}

export function StructuredPagesEditor({ magazine, onChange }: Props) {
  const order = isMagazinePageOrderV2(magazine.pageOrder) ? magazine.pageOrder : null;

  if (!order) {
    return (
      <section className={cn(PG_PANEL, 'mb-4 p-4')} aria-labelledby="structured-pages-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <LayoutList className="mt-0.5 h-4 w-4 text-primary" aria-hidden />
            <div>
              <h2 id="structured-pages-title" className={PG_PANEL_TITLE}>
                Páginas estruturadas
              </h2>
              <p className={cn(PG_SUBTITLE, 'mt-0.5 max-w-2xl')}>
                Converta o layout automático em páginas editáveis: capa, institucional, seções,
                produtos e contato. Produtos novos continuam sendo incorporados automaticamente.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => onChange(createStructuredPageOrder(magazine))}
            className={cn(PG_BTN_OUTLINE, 'rounded-md')}
          >
            <FilePlus2 className="mr-2 h-4 w-4" aria-hidden /> Estruturar páginas
          </Button>
        </div>
      </section>
    );
  }

  const commit = (pages: MagazinePageDefinition[]) => onChange({ version: 2, pages });
  const updatePage = (id: string, patch: Partial<MagazinePageDefinition>) =>
    commit(order.pages.map((page) => (page.id === id ? { ...page, ...patch } : page)));
  const movePage = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target <= 0 || target >= order.pages.length - 1) return;
    const next = [...order.pages];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  };
  const addPage = (kind: 'institutional' | 'section') => {
    const closingIndex = order.pages.findIndex(isClosingPage);
    const next = [...order.pages];
    next.splice(
      closingIndex < 0 ? next.length : closingIndex,
      0,
      createMagazinePageDefinition(kind, {
        title: kind === 'institutional' ? 'Nova página institucional' : 'Nova seção',
      }),
    );
    commit(next);
  };

  return (
    <section className={cn(PG_PANEL, 'mb-4 p-4')} aria-labelledby="structured-pages-title">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="structured-pages-title" className={PG_PANEL_TITLE}>
            Páginas estruturadas ({order.pages.length})
          </h2>
          <p className={cn(PG_SUBTITLE, 'mt-0.5')}>
            Capa e contato permanecem nas extremidades; páginas intermediárias podem ser reordenadas
            e personalizadas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => addPage('section')}>
            <FilePlus2 className="mr-2 h-4 w-4" aria-hidden /> Seção
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addPage('institutional')}
          >
            <FilePlus2 className="mr-2 h-4 w-4" aria-hidden /> Institucional
          </Button>
        </div>
      </header>

      <ol className="m-0 space-y-2 p-0" aria-label="Ordem das páginas estruturadas">
        {order.pages.map((page, index) => {
          const editable = page.kind === 'institutional' || page.kind === 'section';
          const canMoveUp = index > 1 && !isClosingPage(page);
          const canMoveDown = index > 0 && index < order.pages.length - 2;
          return (
            <li
              key={page.id}
              className="rounded-md border border-border bg-card-elevated p-3"
              data-testid={`structured-page-${page.id}`}
            >
              <div className="flex items-center gap-2">
                <span className="w-7 shrink-0 text-center font-mono text-[11px] text-muted-foreground">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1 text-[13px] font-semibold text-foreground">
                  {PAGE_LABELS[page.kind]}
                  {page.kind === 'products' && page.itemIds?.length
                    ? ` · ${page.itemIds.length} produto${page.itemIds.length === 1 ? '' : 's'}`
                    : ''}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={!canMoveUp}
                  onClick={() => movePage(index, -1)}
                  aria-label={`Mover página ${index + 1} para cima`}
                  className="h-8 w-8"
                >
                  <ArrowUp className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={!canMoveDown}
                  onClick={() => movePage(index, 1)}
                  aria-label={`Mover página ${index + 1} para baixo`}
                  className="h-8 w-8"
                >
                  <ArrowDown className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={!editable}
                  onClick={() => {
                    const next = [...order.pages];
                    next.splice(
                      index + 1,
                      0,
                      createMagazinePageDefinition(page.kind, {
                        ...page,
                        id: undefined,
                        title: page.title ? `${page.title} (cópia)`.slice(0, 120) : undefined,
                      }),
                    );
                    commit(next);
                  }}
                  aria-label={`Duplicar página ${index + 1}`}
                  className="h-8 w-8"
                >
                  <Copy className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={!editable}
                  onClick={() =>
                    commit(order.pages.filter((candidate) => candidate.id !== page.id))
                  }
                  aria-label={`Excluir página ${index + 1}`}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>

              {editable && (
                <div className="ml-9 mt-3 grid gap-2">
                  <Input
                    value={page.title ?? ''}
                    maxLength={120}
                    onChange={(event) => updatePage(page.id, { title: event.target.value })}
                    aria-label={`Título da página ${index + 1}`}
                    placeholder={
                      page.kind === 'section' ? 'Título da seção' : 'Título institucional'
                    }
                  />
                  {page.kind === 'institutional' && (
                    <Textarea
                      value={page.body ?? ''}
                      maxLength={800}
                      onChange={(event) => updatePage(page.id, { body: event.target.value })}
                      aria-label={`Texto da página ${index + 1}`}
                      placeholder="Conteúdo institucional…"
                      className="min-h-20 resize-y"
                    />
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
