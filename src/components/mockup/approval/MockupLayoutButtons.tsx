/**
 * MockupLayoutButtons — botões de ação do painel de mockup.
 * "Gerar Mockup" só compõe a imagem; "Gerar documento" monta o papel timbrado a partir do mockup pronto.
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, ImageIcon, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { MockupApprovalPreview } from './MockupApprovalPreview';
import type { MockupApprovalData } from '@/types/mockup-approval';
import type { MockupClient } from '@/components/mockup/MockupConfigPanel';
import type { DetectedColor } from '@/hooks/simulation';

import { logger } from '@/lib/logger';
interface MockupLayoutButtonsProps {
  /** The AI-generated mockup URL */
  generatedMockup: string | null;
  /** Product info */
  product: {
    name: string;
    sku?: string;
    imageUrl?: string;
    color?: string;
    colorHex?: string;
    material?: string;
    heightCm?: number | null;
    widthCm?: number | null;
    diameterCm?: number | null;
    depthCm?: number | null;
    capacityMl?: number | null;
    weightG?: number | null;
  } | null;
  /** Selected technique */
  technique: {
    name: string;
    code?: string | null;
    maxWidth?: number | null;
    maxHeight?: number | null;
    locationName?: string | null;
  } | null;
  /** Selected client */
  client: MockupClient | null;
  /** Seller info */
  seller: {
    name: string;
    email?: string;
  } | null;
  /** Active personalization area dimensions */
  activeArea: {
    logoWidth: number;
    logoHeight: number;
    logoPreview?: string | null;
    positionX: number;
    positionY: number;
    logoRotation?: number;
    logoScale?: number;
    name: string;
  } | null;
  /** Physical product dimensions in cm */
  productHeightCm?: number | null;
  productWidthCm?: number | null;
  /** Pantone colors from logo analysis */
  pantoneColors?: DetectedColor[];
  /** Number of colors from technique config */
  colorsCount?: number;
  /** @deprecated sem uso: a composição estática saiu deste componente; mantido p/ compatibilidade do chamador */
  onStaticGenerated?: (
    dataUrl: string,
    extra?: { locationName?: string; colorsCount?: number },
  ) => void;
  /** Callback when layout image is captured from the approval template */
  onLayoutCaptured?: (layoutDataUrl: string) => void;
  /** Dispara a geração do mockup (async) */
  onGenerateMockup?: () => Promise<void>;
  /** Mockup em geração */
  isGeneratingMockup?: boolean;
}

export function MockupLayoutButtons({
  generatedMockup,
  product,
  technique,
  client,
  seller,
  activeArea,
  pantoneColors,
  colorsCount,
  onLayoutCaptured,
  onGenerateMockup,
  isGeneratingMockup,
}: MockupLayoutButtonsProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [approvalData, setApprovalData] = useState<MockupApprovalData | null>(null);

  const buildApprovalData = useCallback(
    (mockupUrl: string, mode: 'ai' | 'static'): MockupApprovalData => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const docNumber = `MK-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

      return {
        documentNumber: docNumber,
        date: dateStr,
        client: {
          name: client?.nome_fantasia || client?.razao_social || client?.name || '—',
          cnpj: client?.cnpj,
          logoUrl: client?.logo_url || undefined,
        },
        seller: {
          name: seller?.name || '—',
          email: seller?.email,
        },
        product: {
          name: product?.name || '—',
          sku: product?.sku,
          imageUrl: product?.imageUrl,
          color: product?.color,
          colorHex: product?.colorHex,
          material: product?.material,
          heightCm: product?.heightCm,
          widthCm: product?.widthCm,
          diameterCm: product?.diameterCm,
          depthCm: product?.depthCm,
          capacityMl: product?.capacityMl,
          weightG: product?.weightG,
        },
        personalization: {
          techniqueName: technique?.name || '—',
          techniqueCode: technique?.code || undefined,
          locationName: technique?.locationName || activeArea?.name || 'Frente',
          widthCm: activeArea?.logoWidth || technique?.maxWidth || 0,
          heightCm: activeArea?.logoHeight || technique?.maxHeight || 0,
          colorsCount,
        },
        pantoneColors: (pantoneColors || []).map((c) => ({
          name: c.selectedPantone || c.pantoneMatch?.pantoneCode || c.name,
          hex: c.hex,
        })),
        mockupImageUrl: mockupUrl,
        layoutMode: mode,
      };
    },
    [client, seller, product, technique, activeArea, pantoneColors, colorsCount],
  );

  const handleGenerateDocument = useCallback(() => {
    if (!generatedMockup) return;
    setApprovalData(buildApprovalData(generatedMockup, 'ai'));
    setPreviewOpen(true);
  }, [generatedMockup, buildApprovalData]);

  const handleGenerateMockup = useCallback(async () => {
    if (!onGenerateMockup) {
      toast.error('Configure o gerador de mockup primeiro.');
      return;
    }
    try {
      // Só compõe a imagem: o documento timbrado abre pelo botão "Gerar documento".
      await onGenerateMockup();
    } catch (err) {
      logger.error('Mockup generation error:', err);
    }
  }, [onGenerateMockup]);

  // Don't show if no product/technique selected
  if (!product || !technique || !activeArea) return null;

  const noLogo = !activeArea.logoPreview;

  return (
    <>
      <div
        className="flex w-full flex-wrap items-center gap-2 sm:w-auto"
        data-testid="mockup-action-buttons"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="min-w-[8.5rem] flex-1">
              <Button
                size="sm"
                onClick={handleGenerateMockup}
                disabled={noLogo || !!isGeneratingMockup}
                className="w-full gap-1.5 !bg-primary font-semibold !text-primary-foreground shadow-md shadow-primary/30 transition-all hover:!bg-primary/80 hover:shadow-lg hover:shadow-primary/40 disabled:cursor-not-allowed disabled:!opacity-40"
              >
                {isGeneratingMockup ? (
                  <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ImageIcon aria-hidden="true" className="h-3.5 w-3.5" />
                )}
                Gerar Mockup
              </Button>
            </span>
          </TooltipTrigger>
          {noLogo && (
            <TooltipContent side="bottom">
              <p>Faça upload do logo primeiro</p>
            </TooltipContent>
          )}
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <span className="min-w-[8.5rem] flex-1">
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateDocument}
                disabled={!generatedMockup || !!isGeneratingMockup}
                className="w-full gap-1.5 font-semibold disabled:cursor-not-allowed disabled:!opacity-40"
              >
                <FileText aria-hidden="true" className="h-3.5 w-3.5" />
                Gerar documento
              </Button>
            </span>
          </TooltipTrigger>
          {!generatedMockup && (
            <TooltipContent side="bottom">
              <p>Gere o mockup primeiro</p>
            </TooltipContent>
          )}
        </Tooltip>
      </div>

      {approvalData && (
        <MockupApprovalPreview
          data={approvalData}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          onLayoutCaptured={onLayoutCaptured}
        />
      )}
    </>
  );
}

