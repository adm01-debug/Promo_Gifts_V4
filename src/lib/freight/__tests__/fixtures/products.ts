/**
 * Produtos reais de `doufsxqlfjyuvxuezpln` (produção), lidos por `execute_sql`
 * em 2026-11-19. Cobrem os quatro caminhos de `resolveItemDimensions` e os dois
 * motivos de bloqueio.
 *
 * Não são inventados de propósito: a heurística precisa falhar nos dados que
 * existem, não nos que seriam convenientes. `34702` tem `box_weight_kg = 0.000`
 * e `KT-9059K` tem peso de embalagem sem lados de embalagem — dois casos que um
 * fixture sintético não teria produzido.
 */
import type { ProductMeasureRow } from '../../columns';

/**
 * Garrafa esportiva 400 ml. Três lados de embalagem preenchidos → `packaging`.
 *
 * ATENÇÃO (evidência de negócio): 38 × 36 × 36 cm e 5,5 kg para uma garrafa de
 * 67 g é a **caixa master do fornecedor**, não a embalagem individual. Mantido
 * como está porque é o dado real; ver a nota de divergência na PR.
 */
export const GARRAFA_COM_EMBALAGEM: ProductMeasureRow = {
  id: '82e20777-032d-4721-8afe-27e1f99c0750',
  sku: '54601',
  name: 'Garrafa esportiva em alumínio e acabamento metálico com mosquetão 400 ml',
  height_cm: 17.6,
  width_cm: 6.6,
  length_cm: 6.6,
  diameter_cm: 6.6,
  weight_g: 67,
  box_height_mm: 380,
  box_width_mm: 360,
  box_length_mm: 360,
  box_weight_kg: 5.5,
};

/**
 * Suporte para garrafas. Embalagem 10 × 10 × 10 cm com `box_weight_kg = 0.000`:
 * a fonte é `packaging`, mas o peso tem de cair em `weight_g` porque zero é
 * ausência de dado, não um peso.
 */
export const SUPORTE_EMBALAGEM_SEM_PESO: ProductMeasureRow = {
  id: '83da3c36-c1eb-47f7-969a-c07a94343d59',
  sku: '34702',
  name: 'Suporte para garrafas',
  height_cm: 12,
  width_cm: 31.6,
  length_cm: 1.2,
  diameter_cm: null,
  weight_g: 1,
  box_height_mm: 100,
  box_width_mm: 100,
  box_length_mm: 100,
  box_weight_kg: 0,
};

/**
 * Kit squeeze. Tem `box_weight_kg` (1,183 kg) e **nenhum** lado de embalagem —
 * a embalagem incompleta precisa cair nas medidas da peça, com `weight_g`.
 */
export const KIT_SQUEEZE_EMBALAGEM_INCOMPLETA: ProductMeasureRow = {
  id: '7038affc-2ffa-4e5b-8331-885045ca28c2',
  sku: 'KT-9059K',
  name: 'Kit squeeze e acessórios - 4 pçs',
  height_cm: 21,
  width_cm: 6.5,
  length_cm: 34.2,
  diameter_cm: null,
  weight_g: 1184,
  box_height_mm: null,
  box_width_mm: null,
  box_length_mm: null,
  box_weight_kg: 1.183,
};

/** Caderneta B6. Três dimensões da peça e peso → `product`. */
export const CADERNETA: ProductMeasureRow = {
  id: '8e3ff0f1-bba8-4413-8e44-b337c6b077ea',
  sku: '02601',
  name: 'Caderneta kraft B6 com porta caneta',
  height_cm: 17.5,
  width_cm: 13.5,
  length_cm: 13.5,
  diameter_cm: 13.5,
  weight_g: 162,
  box_height_mm: null,
  box_width_mm: null,
  box_length_mm: null,
  box_weight_kg: null,
};

/** Caneta reciclável. O item mais leve do catálogo útil para testes de teto. */
export const CANETA: ProductMeasureRow = {
  id: '37e92529-695f-48e8-923a-d42237c90915',
  sku: '00001',
  name: 'Caneta reciclavel',
  height_cm: 13.7,
  width_cm: 3,
  length_cm: 3,
  diameter_cm: 3,
  weight_g: 6,
  box_height_mm: null,
  box_width_mm: null,
  box_length_mm: null,
  box_weight_kg: null,
};

/**
 * Garrafa térmica 500 ml. Dimensões completas e **sem peso** — bloqueia com
 * `missing: ['weight']`, que é o caso mais comum em produção (642 produtos
 * ativos sem peso em 19/11/2026).
 */
export const GARRAFA_TERMICA_SEM_PESO: ProductMeasureRow = {
  id: '786a47d1-fb11-4aec-a6ee-b5466eedce17',
  sku: '$@07045',
  name: 'Garrafa térmica 500ml',
  height_cm: 24.8,
  width_cm: 8,
  length_cm: 8,
  diameter_cm: 8,
  weight_g: null,
  box_height_mm: null,
  box_width_mm: null,
  box_length_mm: null,
  box_weight_kg: null,
};

/** Enfeite de porcelana. Nenhuma medida e nenhum peso — bloqueia por tudo. */
export const ENFEITE_SEM_NADA: ProductMeasureRow = {
  id: '80ff32a7-869e-4da4-97d1-099edf9c5e82',
  sku: '#TCM-02#',
  name: 'Enfeite de porcelana meditando',
  height_cm: null,
  width_cm: null,
  length_cm: null,
  diameter_cm: null,
  weight_g: null,
  box_height_mm: null,
  box_width_mm: null,
  box_length_mm: null,
  box_weight_kg: null,
};

/**
 * `CANETA` com todas as medidas zeradas. Zero é o jeito do catálogo de dizer
 * "não cadastrado", e nenhum produto real guarda esse estado de forma pura.
 */
export const ZEROS: ProductMeasureRow = {
  ...CANETA,
  id: '00000000-0000-4000-8000-000000000000',
  sku: '00001-ZEROS',
  name: 'Caneta reciclavel (medidas zeradas)',
  height_cm: 0,
  width_cm: 0,
  length_cm: 0,
  diameter_cm: 0,
  weight_g: 0,
  box_height_mm: 0,
  box_width_mm: 0,
  box_length_mm: 0,
  box_weight_kg: 0,
};

/**
 * `CADERNETA` sem altura. Largura, comprimento e diâmetro continuam lá, então
 * o único campo que falta é `height` — o relatório do bloco D precisa desse
 * nível de precisão para o admin saber o que digitar.
 */
export const CADERNETA_SEM_ALTURA: ProductMeasureRow = {
  ...CADERNETA,
  id: '11111111-1111-4111-8111-111111111111',
  sku: '02601-SEM-ALTURA',
  name: 'Caderneta kraft B6 (sem altura)',
  height_cm: null,
};

/** Todos os fixtures, para percorrer em teste de tabela. */
export const ALL_PRODUCT_FIXTURES: ProductMeasureRow[] = [
  GARRAFA_COM_EMBALAGEM,
  SUPORTE_EMBALAGEM_SEM_PESO,
  KIT_SQUEEZE_EMBALAGEM_INCOMPLETA,
  CADERNETA,
  CANETA,
  GARRAFA_TERMICA_SEM_PESO,
  ENFEITE_SEM_NADA,
  ZEROS,
  CADERNETA_SEM_ALTURA,
];
