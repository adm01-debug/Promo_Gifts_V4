import { useState, useMemo, useEffect, useRef } from 'react';
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { QuoteItem } from '@/hooks/quotes';
import {
  loadCollapsedItems,
  toggleCollapsedItem,
  pruneCollapsedItems,
  saveCollapsedItems,
} from '@/lib/quotes/collapsedItemsStorage';
import { toast } from 'sonner';
import { releaseScrollLockIfIdle } from '@/lib/dom/scroll-lock';
import { logger } from '@/lib/logger';
import { round2 } from '@/hooks/quotes/quoteHelpers';
import { getPriceFreshness } from '@/utils/price-freshness';

interface UseQuoteSummaryStateParams {
  items: QuoteItem[];
  discountType: 'amount' | 'percent';
  setDiscountType: (v: 'amount' | 'percent') => void;
  discountValue: number;
  setDiscountValue: (v: number) => void;
  negotiationMarkup?: number;
  realSubtotal?: number;
  onSave: (status: 'draft' | 'pending_approval' | 'pending', sellerNotes?: string) => void;
  onReorder?: (items: QuoteItem[]) => void;
  quoteId?: string | null;
  setSkipAutosaveSortOrder?: (v: boolean) => void;
}

export function useQuoteSummaryState({
  items,
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  negotiationMarkup = 0,
  realSubtotal = 0,
  onSave,
  onReorder,
  quoteId,
  setSkipAutosaveSortOrder,
}: UseQuoteSummaryStateParams) {
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [sellerNotes, setSellerNotes] = useState('');
  const [confirmAllOpen, setConfirmAllOpen] = useState(false);
  const [confirmSaveDraftOpen, setConfirmSaveDraftOpen] = useState(false);
  const saveDraftBtnRef = useRef<HTMLButtonElement>(null);

  const [showOnlyStale, setShowOnlyStale] = useState(false);
  const [groupedByProduct, setGroupedByProduct] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Persistência do colapso por orçamento via SSOT `collapsedItemsStorage`.
  const [collapsedItemKeys, setCollapsedItemKeys] = useState<Set<string>>(() =>
    loadCollapsedItems(quoteId),
  );

  // Recarrega ao trocar de orçamento (transição "new" → id real após salvar).
  useEffect(() => {
    setCollapsedItemKeys(loadCollapsedItems(quoteId));
  }, [quoteId]);

  // Prune: remove do storage chaves de itens que não existem mais (exclusão).
  useEffect(() => {
    const currentIds = items.map((it, idx) => it.id ?? `__idx_${idx}`);
    setCollapsedItemKeys((prev) => pruneCollapsedItems(quoteId, prev, currentIds));
  }, [items, quoteId]);

  const toggleItemCollapsed = (key: string) => {
    setCollapsedItemKeys((prev) => toggleCollapsedItem(quoteId, prev, key));
  };

  const allItemKeys = useMemo(() => items.map((it, idx) => it.id ?? `__idx_${idx}`), [items]);
  const allCollapsed = allItemKeys.length > 0 && allItemKeys.every((k) => collapsedItemKeys.has(k));
  const toggleAllCollapsed = () => {
    const next = allCollapsed ? new Set<string>() : new Set<string>(allItemKeys);
    setCollapsedItemKeys(next);
    saveCollapsedItems(quoteId, next);
  };

  // Sensors do dnd-kit — pointer (mouse/touch) + keyboard (acessibilidade).
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /**
   * A ordem fica no estado do editor e segue no próximo save transacional do
   * orçamento. O antigo UPDATE granular em quote_items concorria com a RPC
   * global, podia deadlockar e não avançava quotes.version.
   */
  const stageOrderForTransactionalSave = () => {
    setSkipAutosaveSortOrder?.(false);
  };

  const handleDragStart = (e: DragStartEvent) => {
    setActiveDragId(String(e.active.id));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveDragId(null);
    if (!over || active.id === over.id || !onReorder) return;
    const oldIndex = items.findIndex((it, i) => (it.id ?? `__idx_${i}`) === String(active.id));
    const newIndex = items.findIndex((it, i) => (it.id ?? `__idx_${i}`) === String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(items, oldIndex, newIndex).map((it, i) => ({
      ...it,
      sort_order: i,
    }));
    onReorder(reordered);
    stageOrderForTransactionalSave();
  };

  const groupByProductId = () => {
    if (!onReorder || items.length < 2) return;
    const seen = new Map<string, number>();
    items.forEach((it, i) => {
      const key = it.product_id || `__no_pid_${i}`;
      if (!seen.has(key)) seen.set(key, seen.size);
    });
    const grouped = [...items]
      .map((it, i) => ({ it, i }))
      .sort((a, b) => {
        const ka = a.it.product_id || `__no_pid_${a.i}`;
        const kb = b.it.product_id || `__no_pid_${b.i}`;
        const ga = seen.get(ka) ?? 0;
        const gb = seen.get(kb) ?? 0;
        if (ga !== gb) return ga - gb;
        return a.i - b.i;
      })
      .map(({ it }, i) => ({ ...it, sort_order: i }));
    onReorder(grouped);
    stageOrderForTransactionalSave();
    setGroupedByProduct(true);
    toast.success('Itens agrupados por produto');
  };

  const groupByCategory = () => {
    if (!onReorder || items.length < 2) return;
    const BUCKET_UNCAT = '__uncategorized__';
    const seen = new Map<string, number>();
    items.forEach((it) => {
      const key = it.product_category_id || BUCKET_UNCAT;
      if (!seen.has(key)) seen.set(key, seen.size);
    });
    // Garante bucket sem categoria por último.
    if (seen.has(BUCKET_UNCAT)) {
      seen.delete(BUCKET_UNCAT);
      seen.set(BUCKET_UNCAT, seen.size);
    }
    const uncategorized = items.filter((it) => !it.product_category_id).length;
    if (uncategorized > 0) {
      logger.info('[QuoteBuilderSummaryColumn] quote_summary_group_uncategorized', {
        count: uncategorized,
        total: items.length,
      });
    }
    const grouped = [...items]
      .map((it, i) => ({ it, i }))
      .sort((a, b) => {
        const ka = a.it.product_category_id || BUCKET_UNCAT;
        const kb = b.it.product_category_id || BUCKET_UNCAT;
        const ga = seen.get(ka) ?? 0;
        const gb = seen.get(kb) ?? 0;
        if (ga !== gb) return ga - gb;
        return a.i - b.i;
      })
      .map(({ it }, i) => ({ ...it, sort_order: i }));
    onReorder(grouped);
    stageOrderForTransactionalSave();
    setGroupedByProduct(true);
    toast.success('Itens agrupados por categoria');
  };

  // Snapshot do item arrastado para o DragOverlay.
  const activeItemForOverlay = useMemo(() => {
    if (!activeDragId) return null;
    return items.find((it, i) => (it.id ?? `__idx_${i}`) === activeDragId) ?? null;
  }, [activeDragId, items]);

  // BUG-D FIX: clamp markup to [0,50] so this mirrors calculateQuoteTotals exactly
  const presentedSubtotal = useMemo(() => {
    const clampedMarkup = Math.max(0, Math.min(50, negotiationMarkup || 0));
    return round2((realSubtotal || 0) * (1 + clampedMarkup / 100));
  }, [realSubtotal, negotiationMarkup]);

  const handleDiscountTypeChange = (next: 'amount' | 'percent') => {
    if (next === discountType) return;
    if (presentedSubtotal > 0 && discountValue > 0) {
      if (next === 'amount') {
        setDiscountValue(
          round2(Math.min(presentedSubtotal, presentedSubtotal * (discountValue / 100))),
        );
      } else {
        const pct = (discountValue / presentedSubtotal) * 100;
        setDiscountValue(round2(Math.max(0, Math.min(100, pct))));
      }
    } else if (presentedSubtotal === 0 && discountValue > 0) {
      // BUG-DISCOUNT-ZERO FIX: with a 0 subtotal, any discount is meaningless.
      setDiscountValue(0);
    }
    setDiscountType(next);
  };

  const staleIndexes = useMemo(() => {
    const set = new Set<number>();
    items.forEach((item, idx) => {
      // BUG-STALE-CONFIRM FIX (summary): a confirmation is only valid when it
      // postdates the last price update.
      if (
        item.price_confirmed_at &&
        (!item.price_updated_at || item.price_confirmed_at >= item.price_updated_at)
      )
        return;
      const f = getPriceFreshness(item.price_updated_at, item.price_freshness_threshold_days);
      if (f.shouldWarn) set.add(idx);
    });
    return set;
  }, [items]);

  const staleCount = staleIndexes.size;
  const visibleItems = useMemo(
    () =>
      showOnlyStale
        ? items.map((it, idx) => ({ it, idx })).filter(({ idx }) => staleIndexes.has(idx))
        : items.map((it, idx) => ({ it, idx })),
    [items, showOnlyStale, staleIndexes],
  );

  useEffect(() => {
    if (showOnlyStale && staleCount === 0) setShowOnlyStale(false);
  }, [showOnlyStale, staleCount]);

  const handleRequestApproval = () => {
    onSave('pending_approval', sellerNotes);
    setApprovalDialogOpen(false);
    setSellerNotes('');
  };

  /**
   * SCROLL-FIX-03: Dialog close handler com scroll-lock release explícito.
   * O Dialog de aprovação usa Radix UI, que aplica `overflow: hidden` no body
   * durante a abertura. O `releaseScrollLockIfIdle` garante liberação imediata.
   */
  const handleApprovalDialogChange = (open: boolean) => {
    setApprovalDialogOpen(open);
    if (!open) {
      requestAnimationFrame(() => releaseScrollLockIfIdle());
    }
  };

  const handleConfirmAllDialogChange = (open: boolean) => {
    setConfirmAllOpen(open);
    if (!open) {
      requestAnimationFrame(() => releaseScrollLockIfIdle());
    }
  };

  return {
    approvalDialogOpen,
    setApprovalDialogOpen,
    sellerNotes,
    setSellerNotes,
    confirmAllOpen,
    setConfirmAllOpen,
    confirmSaveDraftOpen,
    setConfirmSaveDraftOpen,
    saveDraftBtnRef,
    showOnlyStale,
    setShowOnlyStale,
    groupedByProduct,
    activeDragId,
    setActiveDragId,
    collapsedItemKeys,
    toggleItemCollapsed,
    allCollapsed,
    toggleAllCollapsed,
    dndSensors,
    handleDragStart,
    handleDragEnd,
    groupByProductId,
    groupByCategory,
    activeItemForOverlay,
    presentedSubtotal,
    handleDiscountTypeChange,
    staleIndexes,
    staleCount,
    visibleItems,
    handleRequestApproval,
    handleApprovalDialogChange,
    handleConfirmAllDialogChange,
  };
}
