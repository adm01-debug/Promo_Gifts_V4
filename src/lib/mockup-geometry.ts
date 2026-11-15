/**
 * SSOT da conversão cm → px da logo no mockup.
 * Usada pelo editor (LogoPositionEditor) e pelo documento (MockupLayoutButtons),
 * para que os dois devolvam o mesmo tamanho para a mesma entrada.
 */

/** Lado mínimo (px) abaixo do qual a logo é ampliada para continuar visível. */
export const MIN_LOGO_PX = 40;

export interface CmParaPxInput {
  logoWidthCm: number;
  logoHeightCm: number;
  /** Largura/altura (px) da imagem do produto já renderizada (object-contain). */
  renderedImgW: number;
  renderedImgH: number;
  /** Fração da imagem ocupada pelo produto (0–1). */
  fractionX: number;
  fractionY: number;
  productWidthCm?: number | null;
  productHeightCm?: number | null;
  /** Limites da técnica (cm); usados só para estimar o produto sem medidas. */
  maxWidthCm?: number | null;
  maxHeightCm?: number | null;
}

export interface CmParaPxResult {
  widthPx: number;
  heightPx: number;
  /** Pixels por centímetro aplicados. */
  cmToPx: number;
  /** Dimensões físicas do produto usadas na conta (cm). */
  physW: number;
  physH: number;
  /** true quando o produto não tinha altura nem largura e as medidas são estimadas. */
  estimated: boolean;
}

const positivo = (v: number | null | undefined): number | null => (v && v > 0 ? v : null);

/**
 * Converte o tamanho da logo (cm) em px. A rotação não entra na conta: ela é
 * aplicada depois, via transform, sobre a caixa devolvida aqui.
 */
export function cmParaPx(input: CmParaPxInput): CmParaPxResult {
  const prodH = positivo(input.productHeightCm);
  const prodW = positivo(input.productWidthCm);
  const maxW = positivo(input.maxWidthCm);
  const maxH = positivo(input.maxHeightCm);

  const physW = prodW || (prodH ? prodH * 0.4 : maxW ? maxW * 2 : 8);
  const physH = prodH || (prodW ? prodW * 2.5 : maxH ? maxH * 2.5 : 20);

  const scaleByW = (input.renderedImgW * input.fractionX) / physW;
  const scaleByH = (input.renderedImgH * input.fractionY) / physH;
  const cmToPx = Math.min(scaleByW, scaleByH);

  let widthPx = input.logoWidthCm * cmToPx;
  let heightPx = input.logoHeightCm * cmToPx;
  const maior = Math.max(widthPx, heightPx);
  if (widthPx < MIN_LOGO_PX && heightPx < MIN_LOGO_PX && maior > 0) {
    const boost = MIN_LOGO_PX / maior;
    widthPx *= boost;
    heightPx *= boost;
  }

  return { widthPx, heightPx, cmToPx, physW, physH, estimated: !prodH && !prodW };
}
