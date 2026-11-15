/**
 * A-7: pré-seleção do produto (e da técnica) do gerador a partir das entradas
 * externas — `?product_id=` (deep link legado), `?productId=` (QuickQuoteFAB),
 * `location.state.preSelectedProduct` (ProductCategoryBadges) e `?technique=`.
 * Aplica uma única vez, depois do catálogo e do rascunho, e limpa só os params
 * que consumiu. Separado de `useMockupGenerator` (ratchet de tamanho).
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import type { Product } from '@/hooks/products';
import type { MockupProductSelection } from '@/components/mockup/MockupProductSelector';
import type { Technique } from '@/hooks/mockup/mockupGenerationService';
import { resolveEntryProductId } from '@/hooks/mockup/mockupGeneratorModel';

export interface UseMockupEntryParamsArgs {
  isLoadingData: boolean;
  hasDraftRestored: boolean;
  techniques: Technique[];
  getProductById: (id: string) => Product | null | undefined;
  setProductSelection: (selection: MockupProductSelection | null) => void;
  setSelectedTechnique: (technique: Technique | null) => void;
}

export function useMockupEntryParams({
  isLoadingData,
  hasDraftRestored,
  techniques,
  getProductById,
  setProductSelection,
  setSelectedTechnique,
}: UseMockupEntryParamsArgs): void {
  const urlParamsApplied = useRef(false);
  const location = useLocation();
  useEffect(() => {
    if (urlParamsApplied.current || isLoadingData || !hasDraftRestored) return;
    const params = new URLSearchParams(window.location.search);
    // A-7: aceita os três formatos de entrada (deep link, QuickQuoteFAB, router state).
    const productId = resolveEntryProductId({
      search: window.location.search,
      routerState: location.state,
    });
    if (!productId) return;
    urlParamsApplied.current = true;
    const product = getProductById(productId);
    if (product)
      setProductSelection({
        product,
        variant: null,
        imageUrl: product.images?.[0] || '/placeholder.svg',
      });
    const techniqueName = params.get('technique');
    if (techniqueName && techniques.length > 0) {
      const technique = techniques.find(
        (t) => t.name.toLowerCase() === techniqueName.toLowerCase(),
      );
      if (technique) setSelectedTechnique(technique);
    }
    // T9 FIX: only remove the params we processed — preserve everything else.
    const hasEntryParams =
      params.has('product_id') || params.has('productId') || params.has('technique');
    if (!hasEntryParams) return;
    const newParams = new URLSearchParams(window.location.search);
    newParams.delete('product_id');
    newParams.delete('productId');
    newParams.delete('technique');
    const newSearch = newParams.toString();
    window.history.replaceState(
      {},
      '',
      window.location.pathname + (newSearch ? `?${newSearch}` : ''),
    );
  }, [
    isLoadingData,
    hasDraftRestored,
    techniques,
    getProductById,
    location.state,
    setProductSelection,
    setSelectedTechnique,
  ]);
}
