import type React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export type SortableRenderArgs = {
  dragAttributes: ReturnType<typeof useSortable>['attributes'];
  dragListeners: ReturnType<typeof useSortable>['listeners'];
  isDragging: boolean;
};

/**
 * SortableSummaryCard — wrapper de drag-and-drop para um card do Resumo.
 *
 * Mantido FORA do render do componente pai para não recriar o hook em
 * cada ciclo (regra de hooks + perf). Expõe `dragAttributes`/`dragListeners`
 * via render-prop para que o handle (GripVertical) seja posicionado
 * inline pelo consumidor sem precisar de portais.
 */
export function SortableSummaryCard({
  id,
  dragDisabled,
  children,
}: {
  id: string;
  dragDisabled: boolean;
  children: (args: SortableRenderArgs) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: dragDisabled,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ dragAttributes: attributes, dragListeners: listeners, isDragging })}
    </div>
  );
}
