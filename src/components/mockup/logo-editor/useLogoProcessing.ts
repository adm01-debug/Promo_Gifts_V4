import { useState, useEffect } from 'react';
import { processLogoForLaser, processLogoForSerigrafia } from '@/utils/laser-logo-processor';
import { logger } from '@/lib/logger';
import type { TechniqueColorConfig } from '../techniqueColorUtils';

/**
 * Maior lado (px) do logo entregue ao loop de pixel de laser/serigrafia.
 *
 * O loop percorre TODOS os pixels na thread principal: um logo de 4000 px tem
 * 16 M pixels (~64 M operações) e travava o editor. Acima deste limite o logo é
 * reduzido antes de processar; a prévia renderiza em uma caixa de poucas
 * centenas de px, então 2048 px é visualmente idêntico.
 *
 * A redução vale SÓ para a prévia: a geração e a exportação final continuam
 * usando o logo ORIGINAL (`area.logoPreview`).
 */
const MAX_PROCESSING_DIMENSION = 2048;

/**
 * Prepara o logo para o processamento: devolve o próprio URL quando o maior
 * lado já cabe em `maxDimension`; acima disso devolve um PNG reduzido a
 * `maxDimension` no maior lado, com a proporção preservada.
 */
export async function downscaleLogoForProcessing(
  imageUrl: string,
  maxDimension: number = MAX_PROCESSING_DIMENSION,
): Promise<string> {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const largestSide = Math.max(width, height);

      if (largestSide <= maxDimension) {
        URL.revokeObjectURL(blobUrl);
        resolve(imageUrl);
        return;
      }

      const scale = maxDimension / largestSide;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(blobUrl);
        reject(new Error('Canvas 2D context not available'));
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(blobUrl);
      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error('Failed to load image for downscaling'));
    };

    img.src = blobUrl;
  });
}

/**
 * Canvas-based logo processing for Laser + Serigrafia techniques.
 * Laser: converts all visible pixels to a single solid tone (claro/escuro).
 * Serigrafia: maps each pixel to the nearest selected Pantone color.
 * Both preserve white/transparent gaps between logo elements.
 */
export function useLogoProcessing(
  logoPreview: string | null,
  techniqueColorConfig?: TechniqueColorConfig | null,
) {
  const [processedLogoUrl, setProcessedLogoUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const isLaser = techniqueColorConfig?.category === 'laser';
    const isSerigrafia = techniqueColorConfig?.category === 'serigrafia';
    const needsProcessing = isLaser || isSerigrafia;

    if (!needsProcessing || !logoPreview) {
      setProcessedLogoUrl(null);
      return;
    }

    let cancelled = false;
    setIsProcessing(true);

    let promise: Promise<string>;

    if (isLaser) {
      const tone = techniqueColorConfig?.laserTone || 'escuro';
      promise = downscaleLogoForProcessing(logoPreview).then((source) =>
        processLogoForLaser(source, tone),
      );
    } else {
      const selectedColors = techniqueColorConfig?.selectedColors ?? [];
      if (selectedColors.length === 0) {
        setIsProcessing(false);
        setProcessedLogoUrl(null);
        return;
      }
      promise = downscaleLogoForProcessing(logoPreview).then((source) =>
        processLogoForSerigrafia(source, selectedColors),
      );
    }

    promise
      .then((dataUrl) => {
        if (!cancelled) setProcessedLogoUrl(dataUrl);
      })
      .catch((err: unknown) => {
        logger.error('[useLogoProcessing] Falha ao processar logo para técnica:', err);
        if (!cancelled) setProcessedLogoUrl(null);
      })
      .finally(() => {
        if (!cancelled) setIsProcessing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    logoPreview,
    techniqueColorConfig?.category,
    techniqueColorConfig?.laserTone,
    techniqueColorConfig?.selectedColors,
  ]);

  return { processedLogoUrl, isProcessing };
}
