/**
 * Produtos reais de `doufsxqlfjyuvxuezpln` (produção), lidos por `execute_sql`
 * em 2026-11-19. Cobrem os dois caminhos de `resolveItemDimensions` e os dois
 * motivos de bloqueio.
 *
 * Não são inventados de propósito: a heurística precisa falhar nos dados que
 * existem, não nos que seriam convenientes.
 *
 * Cada fixture registra, no comentário, o que o banco tem nas colunas `box_*`
 * **que o motor não lê** (ver `columns.ts`). É a evidência de por que a
 * precedência mudou: a "embalagem" do catálogo é a caixa master do fornecedor.
 */
import type { ProductMeasureRow } from '../../columns';

/**
 * Garrafa esportiva 400 ml, 67 g. Três dimensões da peça → `product`.
 *
 * No banco: `box` 380 × 360 × 360 mm e `box_weight_kg` 5,500, com
 * `box_quantity` 24. Isto é, 38 × 36 × 36 cm e 5,5 kg de caixa master para uma
 * garrafa de 67 g. É o caso que torna a leitura de `box_*` indefensável.
 */
export const GARRAFA_ESPORTIVA: ProductMeasureRow = {
  id: '82e20777-032d-4721-8afe-27e1f99c0750',
  sku: '54601',
  name: 'Garrafa esportiva em alumínio e acabamento metálico com mosquetão 400 ml',
  height_cm: 17.6,
  width_cm: 6.6,
  length_cm: 6.6,
  diameter_cm: 6.6,
  weight_g: 67,
  ships_separately: false,
};

/**
 * Suporte para garrafas, 1 g. Peça fina e larga (12 × 31,6 × 1,2 cm): o pior
 * caso de aproveitamento de volume, útil nos testes de encaixe do bloco B.
 *
 * No banco: `box` 100 × 100 × 100 mm com `box_weight_kg` 0,000 — a embalagem
 * sem peso que o motor antigo tinha de tratar como ausência de dado.
 */
export const SUPORTE_PARA_GARRAFAS: ProductMeasureRow = {
  id: '83da3c36-c1eb-47f7-969a-c07a94343d59',
  sku: '34702',
  name: 'Suporte para garrafas',
  height_cm: 12,
  width_cm: 31.6,
  length_cm: 1.2,
  diameter_cm: null,
  weight_g: 1,
  ships_separately: false,
};

/**
 * Kit squeeze com 4 peças, 1.184 g. O item mais pesado e mais comprido do
 * conjunto (34,2 cm): estoura o peso máximo da caixa P antes do volume.
 *
 * No banco: `box_weight_kg` 1,183 e **nenhum** lado de embalagem.
 */
export const KIT_SQUEEZE: ProductMeasureRow = {
  id: '7038affc-2ffa-4e5b-8331-885045ca28c2',
  sku: 'KT-9059K',
  name: 'Kit squeeze e acessórios - 4 pçs',
  height_cm: 21,
  width_cm: 6.5,
  length_cm: 34.2,
  diameter_cm: null,
  weight_g: 1184,
  ships_separately: false,
};

/** Caderneta B6, 162 g. O caso médio: peça pequena, peso conhecido. */
export const CADERNETA: ProductMeasureRow = {
  id: '8e3ff0f1-bba8-4413-8e44-b337c6b077ea',
  sku: '02601',
  name: 'Caderneta kraft B6 com porta caneta',
  height_cm: 17.5,
  width_cm: 13.5,
  length_cm: 13.5,
  diameter_cm: 13.5,
  weight_g: 162,
  ships_separately: false,
};

/** Caneta reciclável, 6 g. A peça mais leve: testa o teto por volume, não por peso. */
export const CANETA: ProductMeasureRow = {
  id: '37e92529-695f-48e8-923a-d42237c90915',
  sku: '00001',
  name: 'Caneta reciclavel',
  height_cm: 13.7,
  width_cm: 3,
  length_cm: 3,
  diameter_cm: 3,
  weight_g: 6,
  ships_separately: false,
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
  ships_separately: false,
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
  ships_separately: false,
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
  ships_separately: false,
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

/**
 * `CANETA` sem largura e sem comprimento, só com diâmetro e altura: o único
 * caminho para a fonte `cylinder`.
 *
 * Nenhum produto ativo está nesse estado hoje (`so_cilindro = 0` em
 * 19/11/2026; dos 1.709 com diâmetro, 1.523 já têm o diâmetro copiado em
 * largura e comprimento), então o ramo é defensivo — e é por isso que precisa
 * de um fixture explícito.
 */
export const CANETA_CILINDRICA: ProductMeasureRow = {
  ...CANETA,
  id: '22222222-2222-4222-8222-222222222222',
  sku: '00001-CILINDRO',
  name: 'Caneta reciclavel (só diâmetro e altura)',
  width_cm: null,
  length_cm: null,
};

/** Todos os fixtures, para percorrer em teste de tabela. */
export const ALL_PRODUCT_FIXTURES: ProductMeasureRow[] = [
  GARRAFA_ESPORTIVA,
  SUPORTE_PARA_GARRAFAS,
  KIT_SQUEEZE,
  CADERNETA,
  CANETA,
  GARRAFA_TERMICA_SEM_PESO,
  ENFEITE_SEM_NADA,
  ZEROS,
  CADERNETA_SEM_ALTURA,
  CANETA_CILINDRICA,
];
