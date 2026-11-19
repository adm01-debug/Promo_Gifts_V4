/**
 * Contrato do motor de frete.
 *
 * Unidades canônicas do módulo: **centímetro** e **grama**. Nada aqui lê mm ou kg:
 * a conversão acontece na borda de entrada (`resolveItemDimensions`), que traduz
 * `box_*_mm` e `box_weight_kg` do catálogo. Volume em cm³, exceto `volumeM3`.
 *
 * Nenhum tipo deste arquivo conhece React, Supabase ou formatação de tela.
 */

// ============================================
// MEDIDAS
// ============================================

/** Caixa envolvente de uma peça ou de um volume, em cm. */
export interface Dimensions {
  heightCm: number;
  widthCm: number;
  lengthCm: number;
}

/**
 * De onde saíram as medidas de uma peça. Mantido no plano porque muda a
 * confiança do número: `packaging` vem do cadastro de embalagem, `product` da
 * peça nua e `cylinder` é a caixa envolvente de um cilíndrico (diâmetro × altura).
 */
export type MeasureSource = 'cylinder' | 'packaging' | 'product';

/** Campo de medida que faltou no cadastro e por isso bloqueou o cálculo. */
export type MissingMeasure = 'height' | 'length' | 'weight' | 'width';

// ============================================
// ENTRADA
// ============================================

/** Uma peça pronta para empacotar: medidas resolvidas e quantidade conhecida. */
export interface PackItem {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  dims: Dimensions;
  weightG: number;
  /** `true` força caixa própria no frete e vence a escolha do vendedor. */
  shipsSeparately: boolean;
  source: MeasureSource;
}

/**
 * Produto que não pode entrar no cálculo. A decisão 7 do projeto é explícita:
 * sem peso ou sem dimensão não existe estimativa parcial — o plano inteiro
 * para e aponta o cadastro.
 */
export interface IncompleteItem {
  productId: string;
  name: string;
  missing: MissingMeasure[];
}

// ============================================
// CAIXAS DE TRANSPORTE
// ============================================

/**
 * Caixa padrão da empresa. `inner` é o que realmente recebe carga; `outer`
 * é o que a transportadora cuba. `emptyWeightG` conta contra `maxWeightG`.
 */
export interface ShippingBox {
  id: string;
  code: string;
  name: string;
  inner: Dimensions;
  outer: Dimensions;
  emptyWeightG: number;
  maxWeightG: number;
  /** Fração do volume interno considerada aproveitável (0,50–1,00). */
  fillFactor: number;
}

// ============================================
// SAÍDA
// ============================================

/** Peso cubado do mesmo volume nos dois divisores usados no mercado. */
export interface CubicWeightG {
  correios: number;
  rodoviario: number;
}

/** Uma caixa fechada do plano, com o que foi colocado dentro dela. */
export interface PackVolume {
  box: ShippingBox;
  items: Array<{ productId: string; quantity: number }>;
  grossWeightG: number;
  cubicWeightG: CubicWeightG;
  volumeM3: number;
  /** Fração do volume interno aproveitável que foi ocupada (0–1). */
  fillRatio: number;
}

/** Como o vendedor pediu para distribuir produtos diferentes entre as caixas. */
export type MixMode = 'misturar' | 'separar';

/**
 * `ok` = plano calculado. `dados_insuficientes` = algum produto sem medida
 * (ver `missing`). `nao_cabe` = a peça não entra nem na maior caixa ativa.
 */
export type FreightPlanStatus = 'dados_insuficientes' | 'nao_cabe' | 'ok';

export interface FreightPlanTotals {
  /** Quantas caixas de cada código, ex.: `{ G: 3, P: 1 }`. */
  boxesByCode: Record<string, number>;
  grossWeightG: number;
  volumeM3: number;
  cubicWeightG: CubicWeightG;
}

export interface FreightPlan {
  status: FreightPlanStatus;
  volumes: PackVolume[];
  totals: FreightPlanTotals;
  warnings: string[];
  missing: IncompleteItem[];
  mixMode: MixMode;
  /** ISO. Injetável para teste; nunca lido do relógio dentro do motor. */
  computedAt: string;
  /** Impressão digital de ids+quantidades: detecta plano velho sem recalcular. */
  itemsHash: string;
}

// ============================================
// PARÂMETROS
// ============================================

/**
 * Parâmetros globais do cálculo. Vêm de `freight_settings` (bloco C) e nunca
 * do código — por isso são argumento de toda função do motor.
 */
export interface FreightSettings {
  cubicDivisorCorreios: number;
  cubicDivisorRodoviario: number;
  defaultFillFactor: number;
}

// ============================================
// ERRO DE VALIDAÇÃO
// ============================================

/**
 * Erro de entrada do motor. É **retornado**, nunca lançado: o motor é puro e
 * a tela precisa decidir o que mostrar sem try/catch.
 */
export interface ValidationError {
  code: 'invalid_item_quantity' | 'invalid_kit_quantity';
  message: string;
  /** Produto que causou o erro, quando o erro é de um item. */
  productId?: string;
}
