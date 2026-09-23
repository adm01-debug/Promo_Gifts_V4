/**
 * Selected Items Badges
 * Exibe os itens selecionados como badges compactos com Drag & Drop
 */

import { X, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { VariantSelector, type VariantSelectionData } from './VariantSelector';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getKitItemLineId, type KitItem } from '@/lib/kit-builder';

interface SelectedItemsBadgesProps {
  items: KitItem[];
  onRemoveItem: (itemId: string) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onUpdateVariant: (itemId: string, data: VariantSelectionData) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  /** Batched stock lookup — only known for already-selected items, never per catalog card. */
  stockByProduct?: Map<string, number>;
  stockByVariant?: Map<string, number>;
  kitQuantity?: number;
}

function StockBadge({
  item,
  stockByProduct,
  stockByVariant,
  kitQuantity = 1,
}: {
  item: KitItem;
  stockByProduct?: Map<string, number>;
  stockByVariant?: Map<string, number>;
  kitQuantity?: number;
}) {
  if (!stockByProduct && !stockByVariant) return null;
  const available = item.selectedVariantId
    ? stockByVariant?.get(item.selectedVariantId)
    : stockByProduct?.get(item.id);
  if (available === undefined) return null;
  const required = item.quantity * kitQuantity;
  const enough = available >= required;
  return (
    <Badge
      variant={enough ? 'secondary' : 'destructive'}
      className="px-1 py-0 text-[10px] font-normal"
    >
      {enough ? `Em estoque (${available})` : 'Indisponível'}
    </Badge>
  );
}

function SortableItemBadge({
  item,
  onRemoveItem,
  onUpdateQuantity,
  onUpdateVariant,
  stockByProduct,
  stockByVariant,
  kitQuantity,
}: {
  item: KitItem;
  onRemoveItem: (id: string) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
  onUpdateVariant: (id: string, data: VariantSelectionData) => void;
  stockByProduct?: Map<string, number>;
  stockByVariant?: Map<string, number>;
  kitQuantity?: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: getKitItemLineId(item),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Badge
      ref={setNodeRef}
      style={style}
      variant="secondary"
      className="flex cursor-default items-center gap-1.5 py-1 pl-1 pr-1"
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none active:cursor-grabbing"
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </span>
      <span className="font-medium">{item.quantity}x</span>
      <span className="max-w-[150px] truncate">{item.name}</span>
      <StockBadge
        item={item}
        stockByProduct={stockByProduct}
        stockByVariant={stockByVariant}
        kitQuantity={kitQuantity}
      />
      {item.isReplaceable && item.allowedVariantIds && item.allowedVariantIds.length > 0 && (
        <VariantSelector
          itemId={getKitItemLineId(item)}
          itemName={item.name}
          allowedVariantIds={item.allowedVariantIds}
          selectedColor={item.selectedColor}
          selectedSize={item.selectedSize}
          onSelectVariant={onUpdateVariant}
        />
      )}
      <div className="ml-1 flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={() =>
            item.quantity <= 1
              ? onRemoveItem(getKitItemLineId(item))
              : onUpdateQuantity(getKitItemLineId(item), item.quantity - 1)
          }
          aria-label="Diminuir quantidade"
        >
          -
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={() => onUpdateQuantity(getKitItemLineId(item), item.quantity + 1)}
          aria-label="Aumentar quantidade"
        >
          +
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Fechar"
          className="h-5 w-5 text-destructive hover:text-destructive"
          onClick={() => onRemoveItem(getKitItemLineId(item))}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </Badge>
  );
}

export function SelectedItemsBadges({
  items,
  onRemoveItem,
  onUpdateQuantity,
  onUpdateVariant,
  onReorder,
  stockByProduct,
  stockByVariant,
  kitQuantity,
}: SelectedItemsBadgesProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (items.length === 0) return null;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorder) return;
    const oldIndex = items.findIndex((item) => getKitItemLineId(item) === active.id);
    const newIndex = items.findIndex((item) => getKitItemLineId(item) === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(oldIndex, newIndex);
    }
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">
        Itens no Kit ({items.length}){' '}
        {onReorder && <span className="text-xs">— arraste para reordenar</span>}
      </h4>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={items.map((item) => getKitItemLineId(item))}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <SortableItemBadge
                key={getKitItemLineId(item)}
                item={item}
                onRemoveItem={onRemoveItem}
                onUpdateQuantity={onUpdateQuantity}
                onUpdateVariant={onUpdateVariant}
                stockByProduct={stockByProduct}
                stockByVariant={stockByVariant}
                kitQuantity={kitQuantity}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
