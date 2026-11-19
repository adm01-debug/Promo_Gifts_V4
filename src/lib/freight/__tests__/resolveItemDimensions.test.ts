/**
 * resolveItemDimensions.test.ts — precedência de medidas e bloqueio por
 * cadastro incompleto. Todos os produtos vêm de produção (ver fixtures).
 */
import { describe, expect, it } from 'vitest';

import { resolveItemDimensions } from '../resolveItemDimensions';
import {
  CADERNETA,
  CADERNETA_SEM_ALTURA,
  CANETA,
  ENFEITE_SEM_NADA,
  GARRAFA_COM_EMBALAGEM,
  GARRAFA_TERMICA_SEM_PESO,
  KIT_SQUEEZE_EMBALAGEM_INCOMPLETA,
  SUPORTE_EMBALAGEM_SEM_PESO,
  ZEROS,
} from './fixtures/products';

describe('resolveItemDimensions — caminho da embalagem', () => {
  it('1. embalagem completa vence a peça e usa box_weight_kg', () => {
    const result = resolveItemDimensions(GARRAFA_COM_EMBALAGEM);

    // 380/360/360 mm → 38/36/36 cm; 5,5 kg → 5500 g
    expect(result).toEqual({
      status: 'ok',
      measures: {
        dims: { heightCm: 38, widthCm: 36, lengthCm: 36 },
        weightG: 5500,
        source: 'packaging',
      },
    });
  });

  it('2. embalagem com peso zero mantém a fonte e cai no weight_g da peça', () => {
    const result = resolveItemDimensions(SUPORTE_EMBALAGEM_SEM_PESO);

    // box 100/100/100 mm → 10/10/10 cm; box_weight_kg = 0.000 é ausência → weight_g = 1
    expect(result).toEqual({
      status: 'ok',
      measures: {
        dims: { heightCm: 10, widthCm: 10, lengthCm: 10 },
        weightG: 1,
        source: 'packaging',
      },
    });
  });

  it('3. embalagem incompleta cai nas medidas da peça, com weight_g', () => {
    const result = resolveItemDimensions(KIT_SQUEEZE_EMBALAGEM_INCOMPLETA);

    // tem box_weight_kg (1,183 kg) mas nenhum lado de embalagem:
    // dimensões da peça e peso da peça (1184 g), não os 1183 g da embalagem
    expect(result).toEqual({
      status: 'ok',
      measures: {
        dims: { heightCm: 21, widthCm: 6.5, lengthCm: 34.2 },
        weightG: 1184,
        source: 'product',
      },
    });
  });
});

describe('resolveItemDimensions — caminho da peça e do cilíndrico', () => {
  it('4. peça com as três dimensões resolve como product', () => {
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

  it('5. cilíndrico usa o diâmetro nos dois lados quando falta largura e comprimento', () => {
    // CANETA sem width/length, com diameter 3 e height 13,7
    const cilindro = { ...CANETA, width_cm: null, length_cm: null };
    const result = resolveItemDimensions(cilindro);

    expect(result).toEqual({
      status: 'ok',
      measures: {
        dims: { heightCm: 13.7, widthCm: 3, lengthCm: 3 },
        weightG: 6,
        source: 'cylinder',
      },
    });
  });
});

describe('resolveItemDimensions — bloqueio por cadastro incompleto', () => {
  it('6. sem altura, reporta só o campo que falta', () => {
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

  it('7. sem peso bloqueia mesmo com as três dimensões (decisão 7)', () => {
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

  it('8. zeros em tudo são tratados como ausência, não como medida', () => {
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

  it('9. diâmetro conhecido cobre largura e comprimento: falta só a altura', () => {
    // sem altura, sem largura, sem comprimento, mas com diâmetro 13,5:
    // o cilíndrico resolveria largura e comprimento — só a altura impede
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

  it('10. produto sem nenhuma medida lista os quatro campos', () => {
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

  it('11. altura presente e comprimento ausente reporta só o comprimento', () => {
    // sem diâmetro, a largura e o comprimento precisam vir preenchidos:
    // a altura está lá, então o cadastro só deve o comprimento
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
});

describe('resolveItemDimensions — fonte esperada por fixture (etapa 9)', () => {
  const casos = [
    { fixture: GARRAFA_COM_EMBALAGEM, source: 'packaging' },
    { fixture: SUPORTE_EMBALAGEM_SEM_PESO, source: 'packaging' },
    { fixture: KIT_SQUEEZE_EMBALAGEM_INCOMPLETA, source: 'product' },
    { fixture: CADERNETA, source: 'product' },
    { fixture: CANETA, source: 'product' },
  ] as const;

  it.each(casos)('$fixture.sku resolve como $source', ({ fixture, source }) => {
    const result = resolveItemDimensions(fixture);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.measures.source).toBe(source);
  });
});
