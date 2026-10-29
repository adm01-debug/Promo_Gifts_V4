/** Fotos reais de uma variante/produto para a geração do mockup (original, nunca miniatura). */
import { getCdnUrl } from '@/utils/image-utils';
import type { ExternalVariantStock, Product } from '@/hooks/products';

/** Sufixo de tamanho do Cloudflare Images no fim da URL de uma foto. */
const CDN_SIZE_SUFFIX = /\/(thumbnail|small|card|medium|large|public)$/;

/**
 * Fotos REAIS disponíveis para a geração — sempre a ORIGINAL, nunca a miniatura,
 * nunca o placeholder.
 *
 * A variante manda: usa as fotos dela (`images`) e a foto por trás da
 * `selected_thumbnail` — que é uma miniatura, por isso é resolvida de volta ao
 * original correspondente. Só quando a variante não tem foto nenhuma é que caem
 * as fotos do próprio produto (ex.: produto sem variantes). A mesma foto em
 * tamanhos diferentes conta uma vez só (dedupe pela base do CDN).
 */
export function getMockupVariantPhotos(
  variant: ExternalVariantStock | null,
  product: Product | null,
): string[] {
  const isRealPhoto = (source: string | null | undefined): source is string => {
    const url = source?.trim();
    return Boolean(url) && url !== '/placeholder.svg';
  };

  const variantPhotos = (
    variant ? [...(variant.images ?? []), variant.selected_thumbnail] : []
  ).filter(isRealPhoto);
  const productPhotos = [...(product?.images ?? []), product?.image_url ?? null].filter(
    isRealPhoto,
  );
  const sources = variantPhotos.length > 0 ? variantPhotos : productPhotos;

  const seen = new Set<string>();
  const photos: string[] = [];
  for (const url of sources) {
    const base = url.replace(CDN_SIZE_SUFFIX, '');
    if (seen.has(base)) continue;
    seen.add(base);
    photos.push(getCdnUrl(url, 'public'));
  }
  return photos;
}
