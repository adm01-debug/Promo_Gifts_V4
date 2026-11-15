/**
 * Prova do resgate: o servidor usa a MESMA geometria do editor.
 *
 * Antes: generate-mockup/index.ts tinha um produto-referência de 20 cm e um
 * mínimo de 8 px — a logo saía na imagem gerada num tamanho diferente do que o
 * vendedor posicionou na tela, e um teto de 98% do quadro encolhia logo grande.
 * Depois: a fórmula é a do `cmParaPx` do cliente (src/lib/mockup-geometry.ts),
 * inclusive a estimativa 8×20 cm quando o produto não tem medidas — o mesmo
 * fallback que o editor desenha na tela. A edge NÃO recusa payload sem dimensões
 * (o kit-builder gera prévia sem productWidthCm/HeightCm); o 422 da branch de
 * origem ficou de fora de propósito.
 *
 * Runner: Vitest (a fórmula é pura; index.ts não é importável sob Node).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRODUCT_FRACTION,
  MAX_LOGO_PX,
  MIN_LOGO_PX,
  type CmParaPxInput,
  cmParaPx,
  logoSizePx,
} from "./geometry.ts";

// Caminho a partir da raiz do repo (root do Vitest): sob jsdom `import.meta.url`
// não é um file: URL, então `new URL("./index.ts", import.meta.url)` falharia.
const INDEX_SRC = readFileSync(
  resolve(process.cwd(), "supabase/functions/generate-mockup/index.ts"),
  "utf8",
);

type Caso = [nome: string, input: CmParaPxInput, escala: number, esperadoW: number, esperadoH: number];

const QUADRADO_20 = { renderedImgW: 1024, renderedImgH: 1024, logoWidthCm: 5, logoHeightCm: 3, productWidthCm: 20, productHeightCm: 20, fractionX: 0.85, fractionY: 0.85 };
const MINUSCULA = { renderedImgW: 512, renderedImgH: 512, logoWidthCm: 0.5, logoHeightCm: 0.3, productWidthCm: 20, productHeightCm: 20, fractionX: 0.85, fractionY: 0.85 };
const SEM_FRACAO = { renderedImgW: 1024, renderedImgH: 1024, logoWidthCm: 5, logoHeightCm: 3, productWidthCm: 20, productHeightCm: 20 };
const SEM_DIMS = { renderedImgW: 1024, renderedImgH: 1024, logoWidthCm: 5, logoHeightCm: 3, productWidthCm: null, productHeightCm: null, fractionX: 0.85, fractionY: 0.85 };

// Números conferidos contra a função compartilhada do cliente `cmParaPx`
// (src/lib/mockup-geometry.ts): mesmos physW/physH, mínimo de 40 px e ordem
// boost→escala.
const CASOS: Caso[] = [
  ["produto 20×20, fração 0.85, logo 5×3", QUADRADO_20, 100, 217.6, 130.56],
  ["imagem 1024×512 (produto largo), 30×15, fração 0.7, logo 10×5", { renderedImgW: 1024, renderedImgH: 512, logoWidthCm: 10, logoHeightCm: 5, productWidthCm: 30, productHeightCm: 15, fractionX: 0.7, fractionY: 0.7 }, 100, 238.93333333333334, 119.46666666666667],
  ["só altura (20 cm) ⇒ largura inferida 20×0.4", { renderedImgW: 1024, renderedImgH: 1024, logoWidthCm: 4, logoHeightCm: 2, productWidthCm: null, productHeightCm: 20, fractionX: 0.85, fractionY: 0.85 }, 100, 174.08, 87.04],
  ["só largura (25 cm) ⇒ altura inferida 25×2.5", { renderedImgW: 1024, renderedImgH: 1024, logoWidthCm: 5, logoHeightCm: 5, productWidthCm: 25, productHeightCm: null, fractionX: 1, fractionY: 1 }, 100, 81.92, 81.92],
  ["logo minúscula (0.5×0.3) sobe para o mínimo de 40 px", MINUSCULA, 100, 40, 24],
  ["boost de 40 px ANTES da escala (0.5×0.5, escala 50%)", { ...MINUSCULA, logoWidthCm: 0.5, logoHeightCm: 0.5 }, 50, 20, 20],
  ["escala 50% sobre caixa normal (5×3)", QUADRADO_20, 50, 108.8, 65.28],
];

describe("geometry (generate-mockup) — sem dimensões cadastradas, o fallback é a estimativa do editor", () => {
  it("sem dimensões a conta usa 8×20 cm (o que o editor mostra), não o produto-referência de 20 cm do canvas", () => {
    const estimado = cmParaPx(SEM_DIMS);
    expect(estimado.physW).toBe(8);
    expect(estimado.physH).toBe(20);
    // 1024 px × 0.85 / 20 cm = 43,52 px/cm (o fallback antigo era 1024/20 = 51,2 px/cm, só pela altura).
    expect(estimado.cmToPx).toBeCloseTo(43.52, 6);
    const { lw, lh } = logoSizePx({ ...SEM_DIMS, scalePct: 100 });
    expect(lw).toBeCloseTo(217.6, 6);
    expect(lh).toBeCloseTo(130.56, 6);
  });

  it("dimensões inválidas (0, negativa, string) valem como ausentes — mesmo fallback, nunca NaN", () => {
    for (const [w, h] of [[0, 0], [-1, -2], ["20", "10"]] as const) {
      const r = logoSizePx({ ...SEM_DIMS, productWidthCm: w as never, productHeightCm: h as never, scalePct: 100 });
      expect(r.lw).toBeCloseTo(217.6, 6);
      expect(r.lh).toBeCloseTo(130.56, 6);
    }
  });

  it("o handler não recusa payload sem dimensões (kit-builder depende disso)", () => {
    expect(INDEX_SRC).not.toContain("checkProductDimensions");
    expect(INDEX_SRC).not.toContain("missing_dimensions");
  });
});

describe("geometry (generate-mockup) — mesmos números da função compartilhada do cliente", () => {
  for (const [nome, input, escala, esperadoW, esperadoH] of CASOS) {
    it(nome, () => {
      const { lw, lh } = logoSizePx({ ...input, scalePct: escala });
      expect(lw).toBeCloseTo(esperadoW, 6);
      expect(lh).toBeCloseTo(esperadoH, 6);
      // A caixa do cliente (antes da escala) é exatamente a mesma.
      const box = cmParaPx(input);
      expect(box.widthPx * (escala / 100)).toBeCloseTo(lw, 6);
      expect(box.heightPx * (escala / 100)).toBeCloseTo(lh, 6);
    });
  }

  it("logo minúscula usa o mínimo de 40 px (o antigo mínimo de 8 px foi removido)", () => {
    const { lw, lh } = logoSizePx({ ...MINUSCULA, scalePct: 100 });
    expect(MIN_LOGO_PX).toBe(40);
    expect(Math.max(lw, lh)).toBeCloseTo(40, 6);
    expect(Math.max(lw, lh)).not.toBe(8);
  });

  it("fração ausente cai no default do cliente (0.85), não em 1", () => {
    const semFracao = logoSizePx({ ...SEM_FRACAO, scalePct: 100 });
    expect(DEFAULT_PRODUCT_FRACTION).toBe(0.85);
    expect(semFracao.lw).toBeCloseTo(217.6, 6);
    expect(semFracao.lh).toBeCloseTo(130.56, 6);
  });

  it("fração inválida (0, >1, NaN) também cai no default 0.85", () => {
    for (const frac of [0, 1.5, NaN]) {
      const r = logoSizePx({ ...SEM_FRACAO, fractionX: frac, fractionY: frac, scalePct: 100 });
      expect(r.lw).toBeCloseTo(217.6, 6);
      expect(r.lh).toBeCloseTo(130.56, 6);
    }
  });

  it("logo MAIOR que o quadro não é mais encolhida (o teto de 98% quebrava o WYSIWYG)", () => {
    // Produto de 2 cm, logo de 10 cm: cmToPx = 1024*0.85/2 = 435.2 ⇒ 4352 px de lado,
    // 4× o canvas. O canvas recorta o excesso, como o overflow-hidden do editor.
    const { lw } = logoSizePx({ ...QUADRADO_20, productWidthCm: 2, productHeightCm: 2, logoWidthCm: 10, logoHeightCm: 10, scalePct: 100 });
    expect(lw).toBeCloseTo(4352, 6);
    expect(lw).toBeGreaterThan(1024 * 0.98);
  });
});

describe("geometry (generate-mockup) — proteções herdadas do main", () => {
  it("teto proporcional de absurdo: productWidthCm minúsculo não gera drawImage de milhões de px", () => {
    const { lw, lh } = logoSizePx({ ...QUADRADO_20, productWidthCm: 0.001, productHeightCm: 0.001, logoWidthCm: 10, logoHeightCm: 5, scalePct: 300 });
    expect(MAX_LOGO_PX).toBe(8192);
    expect(Math.max(lw, lh)).toBeCloseTo(MAX_LOGO_PX, 6);
    // Encolhimento PROPORCIONAL: o aspecto 10:5 da logo é preservado.
    expect(lw / lh).toBeCloseTo(2, 6);
  });

  it("cm da logo ≤ 0 cai nos defaults 5×3 em vez de virar caixa negativa", () => {
    const negativa = logoSizePx({ ...QUADRADO_20, logoWidthCm: -5, logoHeightCm: 0, scalePct: 100 });
    expect(negativa.lw).toBeCloseTo(217.6, 6);
    expect(negativa.lh).toBeCloseTo(130.56, 6);
  });
});

describe("index.ts está ligado à geometria compartilhada", () => {
  it("importa e usa o cálculo compartilhado, sem o produto-referência de 20 cm nem o mínimo de 8 px", () => {
    expect(INDEX_SRC).toContain('from "./geometry.ts"');
    expect(INDEX_SRC).toContain("logoSizePx(");
    expect(INDEX_SRC).not.toContain("computeLogoPx");
    expect(INDEX_SRC).not.toContain("FALLBACK_PRODUCT_REFERENCE_CM");
    expect(INDEX_SRC).not.toContain("MAX_LOGO_CANVAS_FRACTION");
    expect(INDEX_SRC).not.toMatch(/MIN_LOGO_PX\s*=\s*8\b/);
  });

  it("validationError segue com 400 fixo (nenhum status novo entrou no handler)", () => {
    expect(INDEX_SRC).toContain('{ status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }');
    expect(INDEX_SRC).not.toContain("status = 400,");
  });
});
