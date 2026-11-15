/**
 * useLayoutCaptureRequest — monta o pedido de captura da ficha de aprovação
 * (OffscreenLayoutCapture) a partir do estado do gerador. Extraído de
 * MockupGenerator.tsx sem mudança de comportamento.
 */
import { useMemo } from 'react';
import type { useMockupGenerator } from '@/hooks/mockup';
import type { Profile } from '@/contexts/AuthContext';
import type { MockupApprovalData } from '@/types/mockup-approval';
import type { LayoutCaptureRequest } from '@/components/mockup/approval/OffscreenLayoutCapture';

type MockupGeneratorState = ReturnType<typeof useMockupGenerator>;

export function useLayoutCaptureRequest(
  mg: MockupGeneratorState,
  profile: Profile | null | undefined,
  userId: string | undefined,
): LayoutCaptureRequest | null {
  // Desestruturado ANTES do memo de propósito: assim o corpo lê só variáveis
  // locais e a lista de dependências fica completa de verdade, sem precisar
  // suprimir a regra react-hooks/exhaustive-deps (o `mg` inteiro é um objeto
  // novo a cada render e, como dependência, mataria o memo).
  const {
    lastSavedRecordId,
    lastSavedMockupUrl,
    lastSavedLayoutMode,
    generatedMockup,
    selectedProduct,
    selectedTechnique,
    selectedClient,
    productSelection,
    lastSavedArea,
    techniqueColorConfig,
    logoColorAnalysis,
    getProductImage,
  } = mg;
  const coresDaLogo = logoColorAnalysis.colors;

  return useMemo((): LayoutCaptureRequest | null => {
    if (!lastSavedRecordId || !userId || !selectedProduct || !selectedTechnique) return null;
    const mockupUrl = lastSavedMockupUrl || generatedMockup || '';
    if (!mockupUrl) return null;

    // recordId é estável por captura → derivamos data/numeroDoc dele para manter o memo determinístico
    const stableSeed = lastSavedRecordId;
    const seedDate = new Date(parseInt(stableSeed.slice(0, 8), 16) * 1000 || Date.now());
    const dateStr = seedDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const docNumber = `MK-${stableSeed.slice(0, 12).toUpperCase()}`;

    const tech = selectedTechnique;
    const techLocationName = typeof tech.locationName === 'string' ? tech.locationName : null;
    const approvalData: MockupApprovalData = {
      documentNumber: docNumber,
      date: dateStr,
      client: {
        name:
          selectedClient?.nome_fantasia ||
          selectedClient?.razao_social ||
          selectedClient?.name ||
          '—',
        cnpj: selectedClient?.cnpj,
        logoUrl: selectedClient?.logo_url || undefined,
      },
      seller: { name: profile?.full_name || '—', email: profile?.email || undefined },
      product: {
        name: selectedProduct.name,
        sku: selectedProduct.sku,
        imageUrl: getProductImage() || undefined,
        color: productSelection?.colorName,
        colorHex: productSelection?.colorHex,
        material: selectedProduct.materials?.[0],
        heightCm: selectedProduct.dimensions?.height_cm ?? null,
        widthCm: selectedProduct.dimensions?.width_cm ?? null,
        diameterCm: selectedProduct.dimensions?.diameter_cm ?? null,
        depthCm: selectedProduct.dimensions?.length_cm ?? null,
        capacityMl: selectedProduct.dimensions?.capacity_ml ?? null,
        weightG: selectedProduct.dimensions?.weight_g ?? null,
      },
      personalization: {
        techniqueName: tech.name ?? '',
        techniqueCode: tech.code ?? '',
        // Local e medidas vêm da área que gerou a IMAGEM gravada, nunca da área
        // ATIVA: num lote de várias áreas elas são diferentes, e a ficha que o
        // cliente aprova chegava com a imagem de uma e as medidas de outra.
        locationName: techLocationName ?? lastSavedArea?.name ?? 'Frente',
        widthCm: lastSavedArea?.logoWidth || 0,
        heightCm: lastSavedArea?.logoHeight || 0,
        colorsCount: techniqueColorConfig?.colorCount,
      },
      pantoneColors: (coresDaLogo || []).map((c) => ({
        name: c.selectedPantone || c.pantoneMatch?.pantoneCode || c.name || '',
        hex: c.hex,
      })),
      mockupImageUrl: mockupUrl,
      layoutMode: lastSavedLayoutMode,
    };

    return { data: approvalData, recordId: lastSavedRecordId, userId };
  }, [
    lastSavedRecordId,
    lastSavedMockupUrl,
    lastSavedLayoutMode,
    generatedMockup,
    userId,
    selectedProduct,
    selectedTechnique,
    selectedClient,
    productSelection,
    lastSavedArea,
    techniqueColorConfig,
    coresDaLogo,
    getProductImage,
    profile,
  ]);
}
