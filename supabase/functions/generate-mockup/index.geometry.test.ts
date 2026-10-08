/**
 * Prova do cartão (etapa 51): o servidor usa a MESMA geometria do editor.
 *
 * Antes: generate-mockup/index.ts:216-247 tinha um produto-referência de 20 cm
 * (`FALLBACK_PRODUCT_REFERENCE_CM`) e mínimo de 8 px (`MIN_LOGO_PX`) — o mockup
 * saía com tamanho diferente do que o usuário posicionou na tela.
 * Depois: a fórmula é a do `cmParaPx` do cliente (src/lib/mockup-geometry.ts) e,
 * sem dimensões reais do produto, a edge RECUSA (422 missing_dimensions).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRODUCT_FRACTION,
  MIN_LOGO_PX,
  type CmParaPxInput,
  checkProductDimensions,
  cmParaPx,
  logoSizePx,
} from "./geometry.ts";

const INDEX_SRC = readFileSync(new URL("./index.ts", import.meta.url), "utf8");

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

describe("geometry (generate-mockup) — portão de dimensões", () => {
  it("payload SEM dimensões é recusado com 422 / missing_dimensions", () => {
    for (const [w, h] of [[undefined, undefined], [null, null], [0, 0], [-1, -2], ["20", "10"]] as const) {
      const gate = checkProductDimensions(w, h);
      expect(gate.ok).toBe(false);
      if (!gate.ok) {
        expect(gate.status).toBe(422);
        expect(gate.errorCode).toBe("missing_dimensions");
      }
    }
  });

  it("uma única dimensão real já basta (o resto é inferido como no editor)", () => {
    expect(checkProductDimensions(20, undefined)).toEqual({ ok: true });
    expect(checkProductDimensions(undefined, 20)).toEqual({ ok: true });
  });

  it("sem dimensões a conta cairia na medida inventada 8×20 cm — por isso o portão existe", () => {
    const estimado = cmParaPx(SEM_DIMS);
    expect(estimado.physW).toBe(8);
    expect(estimado.physH).toBe(20);
    // O handler barra ANTES de chegar aqui, então a medida estimada nunca vira mockup.
    expect(INDEX_SRC).toContain("checkProductDimensions(body.productWidthCm, body.productHeightCm)");
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
});

describe("index.ts está ligado à geometria compartilhada", () => {
  it("importa e usa o portão e o cálculo, sem o fallback de 20 cm nem o mínimo de 8 px", () => {
    expect(INDEX_SRC).toContain('from "./geometry.ts"');
    expect(INDEX_SRC).toContain("checkProductDimensions(body.productWidthCm, body.productHeightCm)");
    expect(INDEX_SRC).toContain("logoSizePx(");
    expect(INDEX_SRC).not.toContain("FALLBACK_PRODUCT_REFERENCE_CM");
    expect(INDEX_SRC).not.toMatch(/MIN_LOGO_PX\s*=\s*8\b/);
  });
});
