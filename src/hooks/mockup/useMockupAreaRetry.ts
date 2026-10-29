/**
 * Regerar SÓ a área que falhou no lote (Q14): estado de erro por área (id estável)
 * e a ação de regerar uma área isolada, sem tocar nas áreas já salvas.
 * Separado de `useMockupGenerator` para manter o hook dentro do ratchet de tamanho.
 */
import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import { toast } from 'sonner';
import type { PersonalizationArea } from '@/components/mockup/MultiAreaManager';
import type { Product } from '@/hooks/products';
import { generateMockupApi, type Technique } from '@/hooks/mockup/mockupGenerationService';
import type {
  BatchMockupResult,
  ProductPhysicalDimensions,
} from '@/hooks/mockup/mockupGeneratorModel';
import { logger } from '@/lib/logger';

export interface UseMockupAreaRetryParams {
  isGeneratingRef: MutableRefObject<boolean>;
  personalizationAreas: PersonalizationArea[];
  getProductImage: () => string | null;
  selectedTechnique: Technique | null;
  selectedProduct: Product | null | undefined;
  productDimensions: ProductPhysicalDimensions;
  saveMockupToHistory: (url: string, area: PersonalizationArea) => Promise<string | null>;
  fetchHistory: () => unknown;
  setGeneratedBatchMockups: Dispatch<SetStateAction<BatchMockupResult[]>>;
  setGeneratedMockup: Dispatch<SetStateAction<string | null>>;
}

export function useMockupAreaRetry({
  isGeneratingRef,
  personalizationAreas,
  getProductImage,
  selectedTechnique,
  selectedProduct,
  productDimensions,
  saveMockupToHistory,
  fetchHistory,
  setGeneratedBatchMockups,
  setGeneratedMockup,
}: UseMockupAreaRetryParams) {
  const [areaErrors, setAreaErrors] = useState<Record<string, string>>({});
  const [retryingAreaIds, setRetryingAreaIds] = useState<string[]>([]);
  const retryingRef = useRef<Set<string>>(new Set());

  const retryArea = useCallback(
    async (areaId: string) => {
      if (isGeneratingRef.current || retryingRef.current.has(areaId)) return;
      const area = personalizationAreas.find((a) => a.id === areaId);
      const productImage = getProductImage();
      if (!area?.logoPreview || !selectedTechnique || !productImage) {
        toast.error('Não foi possível regerar esta área: faltam logo, técnica ou imagem.');
        return;
      }
      retryingRef.current.add(areaId);
      setRetryingAreaIds((prev) => [...prev, areaId]);
      try {
        const result = await generateMockupApi({
          productImage,
          productName: selectedProduct?.name ?? '',
          technique: selectedTechnique,
          areas: [area],
          // Mesmo resolvedor de dimensões da geração em lote (fonte única).
          productWidthCm: productDimensions.widthCm,
          productHeightCm: productDimensions.heightCm,
        });
        const url = result.singleUrl ?? result.batchResults[0]?.url;
        if (!url) throw new Error('O serviço não retornou uma imagem.');
        await saveMockupToHistory(url, area);
        setGeneratedBatchMockups((prev) => [
          ...prev.filter((b) => b.areaId !== areaId),
          { areaId, areaName: area.name, url },
        ]);
        setGeneratedMockup((prev) => prev ?? url);
        setAreaErrors((prev) => {
          const rest = { ...prev };
          delete rest[areaId];
          return rest;
        });
        toast.success(`Área "${area.name}" gerada com sucesso!`);
        fetchHistory();
      } catch (error: unknown) {
        logger.error('Error regenerating area mockup:', error);
        const message = error instanceof Error ? error.message : 'Erro ao gerar esta área';
        setAreaErrors((prev) => ({ ...prev, [areaId]: message }));
        toast.error(message);
      } finally {
        retryingRef.current.delete(areaId);
        setRetryingAreaIds((prev) => prev.filter((id) => id !== areaId));
      }
    },
    [
      isGeneratingRef,
      personalizationAreas,
      getProductImage,
      selectedTechnique,
      selectedProduct,
      productDimensions,
      saveMockupToHistory,
      fetchHistory,
      setGeneratedBatchMockups,
      setGeneratedMockup,
    ],
  );

  return { areaErrors, setAreaErrors, retryingAreaIds, retryArea };
}
