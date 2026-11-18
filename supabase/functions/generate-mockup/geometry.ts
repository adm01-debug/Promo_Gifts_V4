/**
 * geometry.ts — conversão cm→px da logo no generate-mockup (Deno).
 *
 * REPLICA a função compartilhada do cliente `cmParaPx` (src/lib/mockup-geometry.ts),
 * usada pelo editor (LogoPositionEditor) e pelo documento (MockupLayoutButtons), para
 * que o mockup tenha o MESMO tamanho de logo que o usuário vê na tela (WYSIWYG).
 *
 * Módulo separado de index.ts porque index.ts não é importável sob Node/vitest
 * (Deno.serve no topo, imports `npm:` e `_shared/*` que leem Deno.env no import);
 * a prova exige um teste que importe a fórmula pura. Mesmo padrão de fetch-guard.ts.
 *
 * Diferenças DELIBERADAS em relação ao cliente:
 *  - o cliente ESTIMA 8×20 cm sem medidas cadastradas; aqui, sem dimensões reais, o
 *    handler RECUSA (422 missing_dimensions), espelhando o portão que o cliente já
 *    aplica antes de invocar (MISSING_DIMENSIONS_REFUSAL em
 *    src/hooks/mockup/mockupGeneratorModel.ts). A estimativa segue em `cmParaPx`
 *    apenas como último recurso interno, que o handler nunca alcança.
 *    Destravado por #3818: `buildKitMockupRequest` (kitMockupDimensions.ts) passou a
 *    enviar as medidas reais do produto, e o próprio kit-builder recusa antes da
 *    chamada quando o produto não tem medidas cadastradas.
 *  - o cliente não sanitiza logoWidthCm/logoHeightCm (a entrada dele é local); aqui
 *    valor ≤ 0 cai nos mesmos defaults (5×3 cm) que o `computeLogoPx` anterior usava,
 *    porque a edge é pública e um cm negativo viraria caixa negativa no canvas.
 *  - não há teto de 98% do quadro (o `MAX_LOGO_CANVAS_FRACTION` anterior): o canvas
 *    recorta o excesso, como o `overflow-hidden` do editor — era justamente esse teto
 *    que encolhia a logo grande e quebrava o WYSIWYG. Resta só o teto de absurdo
 *    MAX_LOGO_PX (ver abaixo), que nenhum produto real alcança.
 */

/** Lado mínimo (px) abaixo do qual a logo é ampliada para continuar visível. */
export const MIN_LOGO_PX = 40;

/**
 * Teto de sanidade (px) do lado maior da caixa desenhada: 8× o lado do canvas
 * (CANVAS_PX = 1024 em index.ts). NÃO é regra de WYSIWYG — uma logo que
 * transborda o quadro continua transbordando, como na tela. É o que resta da
 * proteção do `MAX_LOGO_CANVAS_FRACTION` do main: sem nenhum teto, um payload
 * com productWidthCm absurdamente pequeno (0.001 cm) geraria `cmToPx` enorme e
 * um `drawImage` com destino de milhões de px. Só dispara quando a logo é mais
 * de ~9× o produto, o que não existe em catálogo real.
 */
export const MAX_LOGO_PX = 8 * 1024;

/**
 * Fração (0–1) da imagem do produto ocupada pelo produto, quando o cliente não
 * envia productFractionX/Y. Espelha `DEFAULT_BOUNDS` do cliente
 * (src/lib/product-bounds-detector.ts).
 */
export const DEFAULT_PRODUCT_FRACTION = 0.85;

/** Código/status do erro de entrada quando faltam as dimensões reais. */
export const MISSING_DIMENSIONS_ERROR_CODE = "missing_dimensions";
export const MISSING_DIMENSIONS_STATUS = 422;

const positiveOrNull = (v: unknown): number | null =>
  (typeof v === "number" && Number.isFinite(v) && v > 0) ? v : null;

const positiveOr = (v: unknown, fallback: number): number =>
  positiveOrNull(v) ?? fallback;

const fractionOr = (v: unknown): number => {
  const n = typeof v === "number" && Number.isFinite(v) ? v : NaN;
  return (n > 0 && n <= 1) ? n : DEFAULT_PRODUCT_FRACTION;
};

/** true quando o payload trouxe pelo menos uma dimensão real (cm) > 0. */
export function hasProductDimensions(
  productWidthCm: unknown,
  productHeightCm: unknown,
): boolean {
  return positiveOrNull(productWidthCm) !== null || positiveOrNull(productHeightCm) !== null;
}

export type DimensionsGate =
  | { ok: true }
  | {
    ok: false;
    status: typeof MISSING_DIMENSIONS_STATUS;
    errorCode: typeof MISSING_DIMENSIONS_ERROR_CODE;
    message: string;
  };

/**
 * Portão de entrada: sem dimensões reais do produto o servidor RECUSA (422).
 * O editor assume 8×20 cm nesse caso; o mockup entregue ao cliente não pode
 * (medida inventada). A edge é pública: sem este portão um chamador direto pula
 * a regra que a UI já aplica.
 */
export function checkProductDimensions(
  productWidthCm: unknown,
  productHeightCm: unknown,
): DimensionsGate {
  if (hasProductDimensions(productWidthCm, productHeightCm)) return { ok: true };
  return {
    ok: false,
    status: MISSING_DIMENSIONS_STATUS,
    errorCode: MISSING_DIMENSIONS_ERROR_CODE,
    message:
      "Dimensões reais do produto são obrigatórias para gerar o mockup. " +
      "Envie productWidthCm e/ou productHeightCm (cm) do produto cadastrado.",
  };
}

export interface CmParaPxInput {
  /** Largura/altura (px) da imagem do produto já renderizada (object-contain). */
  renderedImgW: number;
  renderedImgH: number;
  logoWidthCm: number;
  logoHeightCm: number;
  productWidthCm?: number | null;
  productHeightCm?: number | null;
  /** Fração da imagem ocupada pelo produto (0–1); inválida ⇒ default 0.85. */
  fractionX?: number | null;
  fractionY?: number | null;
}

export interface CmParaPxResult {
  widthPx: number;
  heightPx: number;
  /** Pixels por centímetro aplicados. */
  cmToPx: number;
  /** Dimensões físicas do produto usadas na conta (cm). */
  physW: number;
  physH: number;
}

/**
 * Converte o tamanho da logo (cm) em px. Estrutura idêntica à do cliente
 * (`cmParaPx` em src/lib/mockup-geometry.ts): mesma inferência de physW/physH
 * a partir de UMA dimensão, mesmo `Math.min(scaleByW, scaleByH)` e MESMO
 * mínimo de 40 px (o servidor anterior usava 8 px e um produto-referência de
 * 20 cm). A rotação não entra na conta — é aplicada depois, sobre a caixa.
 */
export function cmParaPx(input: CmParaPxInput): CmParaPxResult {
  const prodW = positiveOrNull(input.productWidthCm);
  const prodH = positiveOrNull(input.productHeightCm);

  // Inferência: uma dimensão conhecida estima a outra (mesma razão do editor).
  // O caso "nenhuma das duas" é inalcançável pelo handler desde o portão 422
  // (checkProductDimensions); o 8×20 fica só como último recurso interno.
  const physW = prodW ?? (prodH ? prodH * 0.4 : 8);
  const physH = prodH ?? (prodW ? prodW * 2.5 : 20);

  const logoW = positiveOr(input.logoWidthCm, 5);
  const logoH = positiveOr(input.logoHeightCm, 3);

  const scaleByW = (input.renderedImgW * fractionOr(input.fractionX)) / physW;
  const scaleByH = (input.renderedImgH * fractionOr(input.fractionY)) / physH;
  const cmToPx = Math.min(scaleByW, scaleByH);

  let widthPx = logoW * cmToPx;
  let heightPx = logoH * cmToPx;
  const maior = Math.max(widthPx, heightPx);
  if (widthPx < MIN_LOGO_PX && heightPx < MIN_LOGO_PX && maior > 0) {
    const boost = MIN_LOGO_PX / maior;
    widthPx *= boost;
    heightPx *= boost;
  }

  return { widthPx, heightPx, cmToPx, physW, physH };
}

/**
 * Tamanho final desenhado no canvas: a caixa de `cmParaPx` (já com o mínimo de
 * 40 px, como no editor) multiplicada pelo fator de escala do usuário — no
 * editor esse fator é um `transform: scale()` sobre a caixa, então a ordem
 * boost→escala é a que mantém os dois lados com os mesmos números. O teto
 * MAX_LOGO_PX é aplicado por último, sobre o tamanho que vai de fato ao
 * `drawImage`, e de forma PROPORCIONAL (preserva o aspecto).
 */
export function logoSizePx(
  input: CmParaPxInput & { scalePct: number },
): { lw: number; lh: number } {
  const { widthPx, heightPx } = cmParaPx(input);
  const s = input.scalePct / 100;
  let lw = widthPx * s;
  let lh = heightPx * s;
  const maior = Math.max(lw, lh);
  if (maior > MAX_LOGO_PX) {
    const shrink = MAX_LOGO_PX / maior;
    lw *= shrink;
    lh *= shrink;
  }
  return { lw, lh };
}
