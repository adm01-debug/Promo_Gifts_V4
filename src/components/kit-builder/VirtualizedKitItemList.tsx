import { useRef, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { CompatibilityResult, KitItem } from '@/lib/kit-builder';

/**
 * Below this limit the regular DOM is faster, simpler and keeps all results
 * available to assistive technology. Above it, mounting every product card
 * would make the Kit Maker unusable with the production catalogue.
 */
export const VIRTUALIZED_KIT_ITEM_THRESHOLD = 48;

type CatalogItem = KitItem & { compatibility: CompatibilityResult | null };

interface VirtualizedKitItemListProps {
  items: CatalogItem[];
  view: 'grid' | 'list';
  renderItem: (item: CatalogItem) => ReactNode;
}

export function shouldVirtualizeKitItems(itemCount: number): boolean {
  return itemCount > VIRTUALIZED_KIT_ITEM_THRESHOLD;
}

export function VirtualizedKitItemList({ items, view, renderItem }: VirtualizedKitItemListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const columns = view === 'list' ? 1 : 3;
  const rowCount = Math.ceil(items.length / columns);
  const estimatedRowHeight = view === 'list' ? 88 : 420;
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedRowHeight,
    measureElement: (element) => element?.getBoundingClientRect().height ?? estimatedRowHeight,
    overscan: view === 'list' ? 8 : 3,
  });
  const virtualRows = virtualizer.getVirtualItems();

  // A virtualizer has no measured scroll viewport during the first client
  // render (and in non-layout environments). Never leave the catalogue blank
  // while its observer connects; render only the first visible window until
  // the measured virtual rows take over.
  if (virtualRows.length === 0) {
    const initialItems = items.slice(0, columns * 3);
    return (
      <div
        ref={parentRef}
        className="max-h-[65vh] overflow-auto pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        role="list"
        aria-label={`Resultados do catálogo — ${items.length} produtos`}
        tabIndex={0}
      >
        <div
          className={
            view === 'grid' ? 'grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3' : 'space-y-2'
          }
        >
          {initialItems.map((item) => (
            <div key={item.id} role="listitem">
              {renderItem(item)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="max-h-[65vh] overflow-auto pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      role="list"
      aria-label={`Resultados do catálogo — ${items.length} produtos`}
      tabIndex={0}
    >
      <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualRows.map((virtualRow) => {
          const start = virtualRow.index * columns;
          const rowItems = items.slice(start, start + columns);

          return (
            <div
              key={virtualRow.key}
              ref={virtualizer.measureElement}
              data-index={virtualRow.index}
              className={
                view === 'grid'
                  ? 'grid grid-cols-1 gap-3 pb-3 md:grid-cols-2 lg:grid-cols-3'
                  : 'space-y-2 pb-2'
              }
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {rowItems.map((item) => (
                <div key={item.id} role="listitem">
                  {renderItem(item)}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
