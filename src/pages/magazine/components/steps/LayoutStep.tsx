/**
 * Step 5 — Layout & Gerar (Blue Premium §30): DnD para ordenar produtos.
 * Usa @dnd-kit (já presente no projeto). O preview e o trilho de páginas são
 * compostos pelo editor ao lado (LISTA | PREVIEW | PÁGINAS).
 *
 * Onda 3 — acessibilidade WCAG 2.1 AA:
 *  - Estrutura semântica <ul>/<li> na ordenação
 *  - aria-labelledby + aria-describedby ligando lista à instrução de DnD
 *  - aria-label dinâmico com nome do produto nos botões arrastar/remover
 *  - aria-current="true" no item destacado (sincroniza com Preview)
 *  - Imagens com alt = nome do produto
 */

import { useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';

import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ListOrdered, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Magazine, MagazineItem } from '@/types/magazine';
import { formatPrice, itemPrice } from '../templates/shared';
import { PG_ICON_BOX_SM, PG_PANEL, PG_PANEL_TITLE, PG_SUBTITLE } from '../../pg';

interface Props {
  magazine: Magazine;
  onReorder: (orderedIds: string[]) => void;
  onRemove: (itemId: string) => void;
  /** Onda 1 — coordena highlight LayoutStep ↔ Preview. */
  onItemHover?: (itemId: string | null) => void;
  highlightedItemId?: string | null;
}

export function LayoutStep({
  magazine,
  onReorder,
  onRemove,
  onItemHover,
  highlightedItemId,
}: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const items = useMemo(
    () => [...(magazine.items ?? [])].sort((a, b) => a.position - b.position),
    [magazine.items],
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((i) => i.id === active.id);
    const newIdx = items.findIndex((i) => i.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    onReorder(arrayMove(items, oldIdx, newIdx).map((i) => i.id));
  };

  return (
    <section className={cn(PG_PANEL, 'p-4')} aria-labelledby="layout-step-title">
      <header className="mb-4 flex items-start gap-3">
        <div className={PG_ICON_BOX_SM}>
          <ListOrdered className="h-4 w-4" aria-hidden />
        </div>
        <div>
          <h2 className={PG_PANEL_TITLE} id="layout-step-title">
            Ordenar produtos ({items.length})
          </h2>
          <p className={cn(PG_SUBTITLE, 'mt-0.5')} id="layout-step-help">
            Arraste para reordenar. A paginação é recalculada automaticamente com base no template
            escolhido.
          </p>
        </div>
      </header>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <ul
            aria-labelledby="layout-step-title"
            aria-describedby="layout-step-help"
            className="m-0 list-none space-y-2 p-0"
          >
            {items.map((it, idx) => (
              <SortableRow
                key={it.id}
                item={it}
                index={idx}
                total={items.length}
                onRemove={onRemove}
                onHover={onItemHover}
                highlighted={highlightedItemId === it.id}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {items.length === 0 && (
        <p className="rounded-md border border-dashed border-border-strong px-4 py-8 text-center text-[12px] text-muted-foreground">
          Adicione produtos na etapa anterior para ordenar as páginas.
        </p>
      )}
    </section>
  );
}

function SortableRow({
  item,
  index,
  total,
  onRemove,
  onHover,
  highlighted,
}: {
  item: MagazineItem;
  index: number;
  total: number;
  onRemove: (id: string) => void;
  onHover?: (id: string | null) => void;
  highlighted?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const productName = item.productSnapshot.name;
  return (
    <li
      ref={setNodeRef}
      style={style}
      data-item-id={item.id}
      onMouseEnter={() => onHover?.(item.id)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(item.id)}
      onBlur={() => onHover?.(null)}
      tabIndex={-1}
      aria-current={highlighted ? 'true' : undefined}
      aria-label={`Produto ${index + 1} de ${total}: ${productName}`}
      className={cn(
        'flex items-center gap-3 rounded-md border bg-card-elevated p-2 transition-colors duration-150',
        highlighted
          ? 'border-primary ring-2 ring-primary/40'
          : 'border-border hover:border-border-strong',
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex h-8 w-8 cursor-grab items-center justify-center rounded-sm text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`Arrastar para reordenar ${productName}`}
      >
        <GripVertical className="h-4 w-4" aria-hidden />
      </button>
      <span className="w-7 text-center font-mono text-[11px] text-muted-foreground" aria-hidden>
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-sm bg-neutral-100">
        <img
          src={item.productSnapshot.image_url}
          alt={productName}
          className="h-full w-full object-contain p-1"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="line-clamp-1 text-[13px] font-semibold text-foreground">{productName}</div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>SKU {item.productSnapshot.sku}</span>
          <span aria-hidden>·</span>
          <span className="font-medium text-primary">{formatPrice(itemPrice(item))}</span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(item.id)}
        aria-label={`Remover ${productName} da revista`}
        className="h-8 min-h-0 w-8 min-w-0 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </Button>
    </li>
  );
}
