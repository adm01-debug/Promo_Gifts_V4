/**
 * resolveItemDimensions.test.ts — precedência de medidas e bloqueio por
 * cadastro incompleto. Todos os produtos vêm de produção (ver fixtures).
 */
import { describe, expect, it } from 'vitest';

import { PRODUCT_MEASURE_COLUMNS } from '../columns';
import { resolveItemDimensions } from '../resolveItemDimensions';
import {
  CADERNETA,
  CADERNETA_SEM_ALTURA,
  CANETA,
  CANETA_CILINDRICA,
  ENFEITE_SEM_NADA,
  GARRAFA_ESPORTIVA,
  GARRAFA_TERMICA_SEM_PESO,
  KIT_SQUEEZE,
  SUPORTE_PARA_GARRAFAS,
  ZEROS,
} from './fixtures/products';

describe('resolveItemDimensions — medidas da peça', () => {
  it('1. peça com as três dimensões resolve como product', () => {
    const result = resolveItemDimensions(CADERNETA);

    expect(result).toEqual({
      status: 'ok',
      measures: {
        dims: { heightCm: 17.5, widthCm: 13.5, lengthCm: 13.5 },
        weightG: 162,
        source: 'product',
      },
    });
  });

  it('2. a caixa master do fornecedor é ignorada: vale a peça', () => {
    // `54601` tem box 380 × 360 × 360 mm e box_weight_kg 5,500 no banco
    // (box_quantity 24). O resultado tem de ser a garrafa de 17,6 × 6,6 × 6,6 cm
    // e 67 g — não um volume de 38 × 36 × 36 cm e 5.500 g.
    const result = resolveItemDimensions(GARRAFA_ESPORTIVA);

    expect(result).toEqual({
      status: 'ok',
      measures: {
        dims: { heightCm: 17.6, widthCm: 6.6, lengthCm: 6.6 },
        weightG: 67,
        source: 'product',
      },
    });
  });

  it('3. peça fina e larga mantém os lados como estão, sem normalizar', () => {
    const result = resolveItemDimensions(SUPORTE_PARA_GARRAFAS);

    expect(result).toEqual({
      status: 'ok',
      measures: {
        dims: { heightCm: 12, widthCm: 31.6, lengthCm: 1.2 },
        weightG: 1,
        source: 'product',
      },
    });
  });

  it('4. peso da peça vence, mesmo quando o catálogo tem peso de embalagem', () => {
    // KT-9059K tem box_weight_kg 1,183 (= 1.183 g) e weight_g 1.184.
    // O motor não lê box_weight_kg: o peso é 1.184 g.
    const result = resolveItemDimensions(KIT_SQUEEZE);

    expect(result).toEqual({
      status: 'ok',
      measures: {
        dims: { heightCm: 21, widthCm: 6.5, lengthCm: 34.2 },
        weightG: 1184,
        source: 'product',
      },
    });
  });

  it('5. cilíndrico usa o diâmetro nos dois lados quando falta largura e comprimento', () => {
    const result = resolveItemDimensions(CANETA_CILINDRICA);

    expect(result).toEqual({
      status: 'ok',
      measures: {
        dims: { heightCm: 13.7, widthCm: 3, lengthCm: 3 },
        weightG: 6,
        source: 'cylinder',
      },
    });
  });

  it('6. com os três lados da peça, o diâmetro não muda nada', () => {
    // CANETA tem diameter_cm 3 e também width/length 3: product vence cylinder
    const result = resolveItemDimensions(CANETA);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.measures.source).toBe('product');
  });
});

describe('resolveItemDimensions — bloqueio por cadastro incompleto', () => {
  it('7. sem altura, reporta só o campo que falta', () => {
    const result = resolveItemDimensions(CADERNETA_SEM_ALTURA);

    // largura, comprimento e diâmetro estão lá: nem cilíndrico nem peça fecham
    // sem altura, e é só a altura que o admin precisa digitar
    expect(result).toEqual({
      status: 'incomplete',
      incomplete: {
        productId: CADERNETA_SEM_ALTURA.id,
        name: CADERNETA_SEM_ALTURA.name,
        missing: ['height'],
      },
    });
  });

  it('8. altura presente e comprimento ausente reporta só o comprimento', () => {
    const result = resolveItemDimensions({
      ...CADERNETA,
      diameter_cm: null,
      length_cm: null,
    });

    expect(result).toEqual({
      status: 'incomplete',
      incomplete: {
        productId: CADERNETA.id,
        name: CADERNETA.name,
        missing: ['length'],
      },
    });
  });

  it('9. diâmetro conhecido cobre largura e comprimento: falta só a altura', () => {
    const result = resolveItemDimensions({
      ...CADERNETA_SEM_ALTURA,
      width_cm: null,
      length_cm: null,
    });

    expect(result).toEqual({
      status: 'incomplete',
      incomplete: {
        productId: CADERNETA_SEM_ALTURA.id,
        name: CADERNETA_SEM_ALTURA.name,
        missing: ['height'],
      },
    });
  });

  it('10. sem peso bloqueia mesmo com as três dimensões (decisão 7)', () => {
    const result = resolveItemDimensions(GARRAFA_TERMICA_SEM_PESO);

    expect(result).toEqual({
      status: 'incomplete',
      incomplete: {
        productId: GARRAFA_TERMICA_SEM_PESO.id,
        name: GARRAFA_TERMICA_SEM_PESO.name,
        missing: ['weight'],
      },
    });
  });

  it('11. zeros em tudo são tratados como ausência, não como medida', () => {
    const result = resolveItemDimensions(ZEROS);

    expect(result).toEqual({
      status: 'incomplete',
      incomplete: {
        productId: ZEROS.id,
        name: ZEROS.name,
        missing: ['height', 'width', 'length', 'weight'],
      },
    });
  });

  it('12. produto sem nenhuma medida lista os quatro campos', () => {
    const result = resolveItemDimensions(ENFEITE_SEM_NADA);

    expect(result).toEqual({
      status: 'incomplete',
      incomplete: {
        productId: ENFEITE_SEM_NADA.id,
        name: ENFEITE_SEM_NADA.name,
        missing: ['height', 'width', 'length', 'weight'],
      },
    });
  });

  it('13. altura e comprimento presentes, largura ausente reporta só a largura', () => {
    // 39 produtos ativos estavam assim em 19/11/2026 (altura e comprimento
    // preenchidos, largura e diâmetro vazios). Sem esta checagem a peça passaria
    // adiante com largura nula e o plano diria "não cabe" em vez de apontar o
    // campo que o admin precisa digitar.
    const result = resolveItemDimensions({
      ...CADERNETA,
      diameter_cm: null,
      width_cm: null,
    });

    expect(result).toEqual({
      status: 'incomplete',
      incomplete: {
        productId: CADERNETA.id,
        name: CADERNETA.name,
        missing: ['width'],
      },
    });
  });
});

describe('resolveItemDimensions — contrato de leitura', () => {
  it('nenhuma coluna box_* é lida: o motor não tem como vê-las', () => {
    // Guarda estrutural da decisão: se alguém devolver box_* à lista de
    // colunas, este teste cai antes de o número errado chegar à tela.
    for (const coluna of PRODUCT_MEASURE_COLUMNS) {
      expect(coluna.startsWith('box_')).toBe(false);
    }
  });
});
