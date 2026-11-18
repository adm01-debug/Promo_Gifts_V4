import type { GenerateMockupParams } from '@/hooks/mockup/mockupGenerationService';
import {
  MISSING_DIMENSIONS_MESSAGE,
  MISSING_DIMENSIONS_STATUS,
} from '@/hooks/mockup/mockupGeneratorModel';
import type { KitItemPersonalization } from '@/lib/kit-builder';

/**
 * Medidas reais do produto e montagem do payload de mockup do kit.
 *
 * Fica em módulo próprio porque PersonalizationConfig.tsx já está acima do limite
 * do gate de tamanho (baseline 1414 linhas; alvo 500).
 */

/** Par de medidas em centímetros que vai no payload da edge `generate-mockup`. */
export interface MedidasProdutoCm {
  widthCm?: number | null;
  heightCm?: number | null;
}

/**
 * Devolve as medidas apenas quando são autoritativas, ou `undefined`.
 *
 * `dimensionsKnown === false` marca estimativa da UI
 * (src/lib/kit-builder/types.ts:69). Mandar estimativa como medida real daria ao
 * cliente um mockup em escala errada **com a aparência de estar correto** — pior
 * que não gerar. Ausência do campo conta como autoritativa: é o caso do cadastro
 * que simplesmente não distingue.
 */
export function medidasAutoritativas(
  fonte: { dimensionsKnown?: boolean },
  widthCm: number | null | undefined,
  heightCm: number | null | undefined,
): MedidasProdutoCm | undefined {
  if (fonte.dimensionsKnown === false) return undefined;
  return { widthCm, heightCm };
}

export function buildKitMockupRequest(
  displayName: string,
  imageUrl: string | null,
  personalization: KitItemPersonalization,
  /**
   * Medidas reais do produto em cm. Sem elas a edge geraria o mockup numa escala
   * ESTIMADA (fallback 8x20 cm de `cmParaPx`), entregando ao cliente um desenho que
   * nao corresponde ao produto. Vem de KitItem.width/height ou, na caixa, de
   * KitBox.internalWidth/internalHeight (src/lib/kit-builder/types.ts:62-64 e :22-24),
   * e so quando `dimensionsKnown` nao e false — estimativa da UI nao vale como medida.
   */
  dimensoes?: MedidasProdutoCm,
): GenerateMockupParams | null {
  if (
    !imageUrl ||
    !personalization.enabled ||
    !personalization.techniqueName ||
    !personalization.artworkUrl
  ) {
    return null;
  }

  return {
    productImage: imageUrl,
    productName: displayName,
    productWidthCm: dimensoes?.widthCm ?? null,
    productHeightCm: dimensoes?.heightCm ?? null,
    technique: {
      id: personalization.techniqueId || personalization.techniqueName,
      name: personalization.techniqueName,
      code: personalization.techniqueCode || null,
    },
    areas: [
      {
        id: globalThis.crypto.randomUUID(),
        name: personalization.positionName || personalization.position || 'Frente',
        positionX: 50,
        positionY: 50,
        logoWidth: personalization.width || 5,
        logoHeight: personalization.height || 5,
        logoPreview: personalization.artworkUrl,
      },
    ],
  };
}

/** Aceita apenas número finito > 0 — mesma regra do `positiveOrNull` da edge. */
function medidaValida(value: number | null | undefined): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/**
 * Recusa a prévia quando o produto não tem NENHUMA medida real cadastrada.
 *
 * A edge `generate-mockup` recusa esse payload com 422 `missing_dimensions`
 * (supabase/functions/generate-mockup/geometry.ts → checkProductDimensions), e a
 * mensagem de lá é escrita para quem chama a API. Aqui a recusa acontece ANTES da
 * chamada, com a mensagem que o resto do app já mostra ao vendedor
 * (MISSING_DIMENSIONS_MESSAGE), para ele saber o que fazer: pedir ao catálogo que
 * cadastre largura/altura. Devolve `null` quando pode gerar.
 */
export function recusaPorMedidasAusentes(
  dimensoes?: MedidasProdutoCm,
): { message: string; status: number } | null {
  if (medidaValida(dimensoes?.widthCm) || medidaValida(dimensoes?.heightCm)) return null;
  return { message: MISSING_DIMENSIONS_MESSAGE, status: MISSING_DIMENSIONS_STATUS };
}
