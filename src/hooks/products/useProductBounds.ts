import { useState, useEffect } from 'react';
import { detectProductBounds, type ProductBounds } from '@/lib/product-bounds-detector';

const DEFAULT: ProductBounds = {
  fractionX: 0.85,
  fractionY: 0.85,
  centerX: 0.5,
  centerY: 0.5,
  detected: false,
  imageAspectRatio: 1,
};

type ProductBoundsDetectOptions = {
  whiteThreshold?: number;
  alphaThreshold?: number;
  margin?: number;
  maxSize?: number;
};

/**
 * Hook that detects the product's real bounding box in its catalog image.
 * Returns fraction values used for cm→px scaling.
 *
 * `bounds.detected` reflects whether PRECISE pixel-level detection succeeded —
 * it is `false` for the (common) case of supplier CDN images loaded without
 * CORS, which taints the canvas and falls back to heuristic defaults. That is
 * an expected, permanent outcome for most catalog images, not a "still
 * loading" state — callers that need to know when the async detection has
 * settled (loading vs. resolved, regardless of precision) should use `loading`
 * instead of gating on `detected`.
 */
export function useProductBounds(
  imageUrl: string | null | undefined,
  options?: ProductBoundsDetectOptions,
): ProductBounds & { loading: boolean } {
  const [bounds, setBounds] = useState<ProductBounds>(DEFAULT);
  const [loading, setLoading] = useState(!!imageUrl);

  const optionsKey = `${options?.whiteThreshold ?? ''}|${options?.alphaThreshold ?? ''}|${options?.margin ?? ''}|${options?.maxSize ?? ''}`;

  useEffect(() => {
    if (!imageUrl) {
      setBounds(DEFAULT);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    detectProductBounds(imageUrl, options).then((result) => {
      if (!cancelled) {
        setBounds(result);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, optionsKey]);

  return { ...bounds, loading };
}
