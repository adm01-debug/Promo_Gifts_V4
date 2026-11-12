/**
 * useCatalogSelection — Shared selection + bulk-action logic for CatalogContent.
 * Extracted to eliminate 3x duplication of BulkActionBar wiring.
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { sanitizeError } from '@/lib/security/sanitize-error';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFavoriteLists } from '@/hooks/favorites/useFavoriteLists';
import { useFavoritesStore } from '@/stores/useFavoritesStore';
import { useComparisonStore } from '@/stores/useComparisonStore';
import type { Product } from '@/types/product-catalog';
import type { BulkVariantSelection, BulkWizardMode } from '@/components/catalog/BulkVariantWizard';

export function useCatalogSelection(
  paginatedProducts: Product[],
  selectionMode?: boolean,
  onSelectedCountChange?: (count: number) => void,
) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { defaultList } = useFavoriteLists();
  const favIsFavorite = useFavoritesStore((s) => s.isFavorite);
  const favAddFavorite = useFavoritesStore((s) => s.addFavorite);
  const compIsInCompare = useComparisonStore((s) => s.isInCompare);
  const compAddToCompare = useComparisonStore((s) => s.addToCompare);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [variantWizardOpen, setVariantWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<BulkWizardMode>('cart');
  const [wizardSelections, setWizardSelections] = useState<BulkVariantSelection[]>([]);

  // Clear when leaving selection mode
  useEffect(() => {
    if (!selectionMode) setSelectedIds(new Set());
  }, [selectionMode]);

  // BUG-CS-12: Stale ID removal must not drop products that were already loaded
  // and selected just because they are currently off-screen in the virtualized grid.
  // We only remove IDs if they are confirmed as no longer available in the whole
  // catalog data or if selection mode was exited (handled above).
  //
  // Note: paginatedProducts here corresponds to the current viewport slice.
  // We depend on the fact that if a product was selected, it was part of some slice.
  // The original effect:
  // useEffect(() => {
  //   setSelectedIds((prev) => {
  //     if (prev.size === 0) return prev;
  //     const validIds = new Set(paginatedProducts.map((p) => p.id));
  //     const filtered = new Set([...prev].filter((id) => validIds.has(id)));
  //     return filtered.size === prev.size ? prev : filtered;
  //   });
  // }, [paginatedProducts]);
  // was causing the "desync" because it cleared IDs not in the *current* slice.

  // Sync count
  useEffect(() => {
    onSelectedCountChange?.(selectedIds.size);
  }, [selectedIds.size, onSelectedCountChange]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(
    () => setSelectedIds(new Set(paginatedProducts.map((p) => p.id))),
    [paginatedProducts],
  );
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const openWizard = useCallback((mode: BulkWizardMode) => {
    setWizardMode(mode);
    setVariantWizardOpen(true);
  }, []);

  const handleBulkFavorite = useCallback(() => openWizard('favorite'), [openWizard]);
  const handleBulkCompare = useCallback(() => openWizard('compare'), [openWizard]);
  const handleBulkCollection = useCallback(() => openWizard('collection'), [openWizard]);
  const handleBulkQuote = useCallback(() => openWizard('quote'), [openWizard]);
  const handleBulkCart = useCallback(() => openWizard('cart'), [openWizard]);
  const handleBulkPDF = useCallback(() => openWizard('pdf'), [openWizard]);

  const handleWizardComplete = useCallback(
    (selections: BulkVariantSelection[]) => {
      if (wizardMode === 'cart') {
        setWizardSelections(selections);
        setCartModalOpen(true);
      } else if (wizardMode === 'quote') {
        if (selections.length === 0) return;
        const params = selections
          .map(
            (s) =>
              `items[]=${encodeURIComponent(
                JSON.stringify({
                  product_id: s.product.id,
                  product_name: s.product.name,
                  product_sku: s.product.sku || '',
                  product_price: s.product.price,
                  product_image: s.variant?.selected_thumbnail || s.product.images?.[0] || '',
                  quantity: 1,
                  color_name: s.variant?.color_name || null,
                  color_hex: s.variant?.color_hex || null,
                  size_code: s.variant?.size_code || null,
                }),
              )}`,
          )
          .join('&');
        navigate(`/orcamentos/novo?${params}`);
        toast.success(
          `${selections.length} produto${selections.length > 1 ? 's' : ''} enviado${selections.length > 1 ? 's' : ''} para orçamento`,
        );
        clearSelection();
      } else if (wizardMode === 'favorite') {
        if (user && defaultList) {
          const seen = new Set<string>();
          const rows = selections
            .filter((s) => {
              const key = `${s.product.id}:${s.variant?.id ?? ''}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            })
            .map((s) => ({
              list_id: defaultList.id,
              user_id: user.id,
              product_id: s.product.id,
              variant_id: s.variant?.id ?? null,
              variant_info: s.variant
                ? {
                    color_name: s.variant.color_name ?? null,
                    color_hex: s.variant.color_hex ?? null,
                    size_code: s.variant.size_code ?? null,
                    variant_id: s.variant.id ?? null,
                    thumbnail: s.variant.selected_thumbnail ?? null,
                  }
                : null,
              price_at_save:
                typeof s.product.sale_price === 'number'
                  ? s.product.sale_price
                  : typeof s.product.price === 'number'
                    ? s.product.price
                    : null,
            }));
          if (rows.length === 0) return;
          void supabase
            .from('favorite_items')
            .upsert(rows, { onConflict: 'list_id,product_id,variant_id', ignoreDuplicates: true })
            .then(({ error }) => {
              if (error) {
                toast.error('Não foi possível favoritar os produtos', {
                  description: sanitizeError(error),
                });
                return;
              }
              selections.forEach((s) => {
                if (!favIsFavorite(s.product.id)) {
                  favAddFavorite(
                    s.product.id,
                    s.variant
                      ? {
                          color_name: s.variant.color_name,
                          color_hex: s.variant.color_hex,
                          size_code: s.variant.size_code,
                          variant_id: s.variant.id,
                          thumbnail: s.variant.selected_thumbnail,
                        }
                      : undefined,
                  );
                }
              });
              qc.invalidateQueries({ queryKey: ['favorite-membership'] });
              qc.invalidateQueries({ queryKey: ['favorite-items'] });
              qc.invalidateQueries({ queryKey: ['favorite-lists'] });
              toast.success(
                `${rows.length} produto${rows.length > 1 ? 's' : ''} favoritado${rows.length > 1 ? 's' : ''} com cor selecionada`,
              );
              clearSelection();
            });
          return;
        }
        let added = 0;
        selections.forEach((s) => {
          if (!favIsFavorite(s.product.id)) {
            favAddFavorite(
              s.product.id,
              s.variant
                ? {
                    color_name: s.variant.color_name,
                    color_hex: s.variant.color_hex,
                    size_code: s.variant.size_code,
                    variant_id: s.variant.id,
                    thumbnail: s.variant.selected_thumbnail,
                  }
                : undefined,
            );
            added++;
          }
        });
        toast.success(
          `${added} produto${added > 1 ? 's' : ''} favoritado${added > 1 ? 's' : ''} com cor selecionada`,
        );
        clearSelection();
      } else if (wizardMode === 'compare') {
        const toAdd = selections.slice(0, 4);
        let added = 0;
        toAdd.forEach((s) => {
          if (!compIsInCompare(s.product.id)) {
            compAddToCompare(
              s.product.id,
              s.variant
                ? {
                    color_name: s.variant.color_name,
                    color_hex: s.variant.color_hex,
                    size_code: s.variant.size_code,
                    variant_id: s.variant.id,
                    thumbnail: s.variant.selected_thumbnail,
                  }
                : undefined,
            );
            added++;
          }
        });
        toast.success(
          `${added} produto${added > 1 ? 's' : ''} adicionado${added > 1 ? 's' : ''} à comparação`,
        );
        clearSelection();
      } else if (wizardMode === 'collection') {
        setWizardSelections(selections);
        setCollectionModalOpen(true);
      } else if (wizardMode === 'pdf') {
        if (selections.length === 0) return;

        const variantMap = new Map();
        selections.forEach((s) => {
          if (s.variant) {
            variantMap.set(s.product.id, {
              color_name: s.variant.color_name,
              color_hex: s.variant.color_hex,
            });
          }
        });

        // Export is async/dynamic-imported: only show success + clear the selection
        // AFTER it actually resolves, otherwise a failure shows both a success and an
        // error toast and wipes the selection so the user cannot retry.
        import('@/lib/export-collection-pdf')
          .then(({ exportCollectionPDF }) =>
            exportCollectionPDF({
              collectionName: `Catálogo Personalizado - ${new Date().toLocaleDateString('pt-BR')}`,
              products: selections.map((s) => s.product),
              variantMap,
            }),
          )
          .then(() => {
            toast.success(`PDF gerado com ${selections.length} produtos`);
            clearSelection();
          })
          .catch((err) => {
            toast.error('Erro ao gerar PDF', { description: sanitizeError(err) });
          });
      }
    },
    [
      wizardMode,
      navigate,
      clearSelection,
      user,
      defaultList,
      qc,
      favIsFavorite,
      favAddFavorite,
      compIsInCompare,
      compAddToCompare,
    ],
  );

  const bulkCartProducts = useMemo(
    () => paginatedProducts.filter((p) => selectedIds.has(p.id)),
    [selectedIds, paginatedProducts],
  );

  const firstSelectedId = selectedIds.size > 0 ? (selectedIds.values().next().value ?? '') : '';
  const firstSelectedProduct = paginatedProducts.find((p) => p.id === firstSelectedId);

  const selectedTotalValue = useMemo(() => {
    return bulkCartProducts.reduce((sum, p) => sum + (p.price || 0), 0);
  }, [bulkCartProducts]);

  return {
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    collectionModalOpen,
    setCollectionModalOpen,
    cartModalOpen,
    setCartModalOpen,
    variantWizardOpen,
    setVariantWizardOpen,
    wizardMode,
    wizardSelections,
    bulkCartProducts,
    firstSelectedId,
    firstSelectedProduct,
    selectedTotalValue,
    handleBulkFavorite,
    handleBulkCompare,
    handleBulkCollection,
    handleBulkQuote,
    handleBulkCart,
    handleBulkPDF,
    handleWizardComplete,
  };
}
