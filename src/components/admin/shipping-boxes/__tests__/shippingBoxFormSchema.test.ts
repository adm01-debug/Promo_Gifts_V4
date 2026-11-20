import { describe, expect, it } from 'vitest';
import type { ShippingBoxRow } from '@/services/shippingBoxService';
import {
  EMPTY_SHIPPING_BOX_DRAFT,
  SHIPPING_BOX_COLUMN_FILL_FACTOR,
  buildShippingBoxPatch,
  computeInnerPreview,
  innerDimensionCm,
  newShippingBoxDraft,
  nextShippingBoxSortOrder,
  parseShippingBoxForm,
  toShippingBoxDraft,
  type ShippingBoxFormDraft,
  type ShippingBoxFormField,
} from '../shippingBoxFormSchema';

/** Caixa P real do dono: externa 27 × 33 × 33 cm, parede 3 mm, 10 kg. */
const DRAFT_P: ShippingBoxFormDraft = {
  ...EMPTY_SHIPPING_BOX_DRAFT,
  code: 'P',
  name: 'Caixa P',
  outerHeightCm: '27',
  outerWidthCm: '33',
  outerLengthCm: '33',
  maxWeightKg: '10',
};

function draftWith(overrides: Partial<ShippingBoxFormDraft>): ShippingBoxFormDraft {
  return { ...DRAFT_P, ...overrides };
}

function errorsOf(draft: ShippingBoxFormDraft) {
  const result = parseShippingBoxForm(draft);
  return result.ok ? {} : result.errors;
}

function valuesOf(draft: ShippingBoxFormDraft) {
  const result = parseShippingBoxForm(draft);
  return result.ok ? result.values : null;
}

describe('parseShippingBoxForm — payload', () => {
  it('caixa P real vira o payload do serviço, em cm, mm e gramas, sem medida interna', () => {
    // 10 kg × 1000 = 10000 g. Parede, peso vazio, fator e ordem ficam nos padrões
    // do formulário: 3 mm, 0 g, 0,90 e 0.
    expect(valuesOf(DRAFT_P)).toEqual({
      code: 'P',
      name: 'Caixa P',
      outer_height_cm: 27,
      outer_width_cm: 33,
      outer_length_cm: 33,
      wall_thickness_mm: 3,
      empty_weight_g: 0,
      max_weight_g: 10000,
      fill_factor: 0.9,
      is_active: true,
      sort_order: 0,
    });
  });

  it.each([
    // vírgula e ponto valem como separador decimal
    { campo: 'outer_height_cm', draft: draftWith({ outerHeightCm: '26,5' }), esperado: 26.5 },
    { campo: 'outer_height_cm', draft: draftWith({ outerHeightCm: '26.5' }), esperado: 26.5 },
    { campo: 'outer_height_cm', draft: draftWith({ outerHeightCm: ' 27 ' }), esperado: 27 },
    // 12,5 kg × 1000 = 12500 g
    { campo: 'max_weight_g', draft: draftWith({ maxWeightKg: '12,5' }), esperado: 12500 },
    // 0,35 kg × 1000 = 350 g (em ponto flutuante daria 350,00000000000006)
    { campo: 'max_weight_g', draft: draftWith({ maxWeightKg: '0,35' }), esperado: 350 },
    // 0,001 kg × 1000 = 1 g, a menor resolução aceita
    { campo: 'max_weight_g', draft: draftWith({ maxWeightKg: '0,001' }), esperado: 1 },
    { campo: 'fill_factor', draft: draftWith({ fillFactor: '0,5' }), esperado: 0.5 },
    { campo: 'fill_factor', draft: draftWith({ fillFactor: '1' }), esperado: 1 },
    { campo: 'wall_thickness_mm', draft: draftWith({ wallThicknessMm: '20' }), esperado: 20 },
    { campo: 'sort_order', draft: draftWith({ sortOrder: '-1' }), esperado: -1 },
    { campo: 'code', draft: draftWith({ code: ' gg ' }), esperado: 'GG' },
    { campo: 'code', draft: draftWith({ code: 'm2' }), esperado: 'M2' },
    { campo: 'name', draft: draftWith({ name: '  Caixa P  ' }), esperado: 'Caixa P' },
    { campo: 'is_active', draft: draftWith({ isActive: false }), esperado: false },
  ] as const)('aceita e converte $campo = $esperado', ({ campo, draft, esperado }) => {
    expect(valuesOf(draft)).toHaveProperty(campo, esperado);
  });
});

describe('parseShippingBoxForm — recusas', () => {
  it.each<{ caso: string; draft: ShippingBoxFormDraft; campo: ShippingBoxFormField; erro: RegExp }>(
    [
      { caso: 'código vazio', draft: draftWith({ code: '' }), campo: 'code', erro: /1 a 6/ },
      { caso: 'código com hífen', draft: draftWith({ code: 'P-1' }), campo: 'code', erro: /1 a 6/ },
      {
        caso: 'código com espaço no meio',
        draft: draftWith({ code: 'P 1' }),
        campo: 'code',
        erro: /1 a 6/,
      },
      {
        caso: 'código com acento',
        draft: draftWith({ code: 'CÃO' }),
        campo: 'code',
        erro: /1 a 6/,
      },
      {
        caso: 'código com 7 caracteres',
        draft: draftWith({ code: 'ABCDEFG' }),
        campo: 'code',
        erro: /1 a 6/,
      },
      { caso: 'nome vazio', draft: draftWith({ name: '   ' }), campo: 'name', erro: /nome/ },
      {
        caso: 'altura em branco',
        draft: draftWith({ outerHeightCm: '' }),
        campo: 'outerHeightCm',
        erro: /Altura: informe/,
      },
      {
        caso: 'largura com letra',
        draft: draftWith({ outerWidthCm: '33cm' }),
        campo: 'outerWidthCm',
        erro: /Largura: informe/,
      },
      {
        caso: 'comprimento com 3 casas decimais',
        draft: draftWith({ outerLengthCm: '33,125' }),
        campo: 'outerLengthCm',
        erro: /Comprimento: informe/,
      },
      {
        caso: 'altura negativa',
        draft: draftWith({ outerHeightCm: '-27' }),
        campo: 'outerHeightCm',
        erro: /Altura: informe/,
      },
      {
        caso: 'altura zero',
        draft: draftWith({ outerHeightCm: '0' }),
        campo: 'outerHeightCm',
        erro: /Altura: use um valor entre 0,01 e 300 cm\./,
      },
      // 2 × 3 mm = 0,6 cm; 0,6 − 0,6 = 0 cm de altura interna
      {
        caso: 'parede de 3 mm come a altura de 0,6 cm',
        draft: draftWith({ outerHeightCm: '0,6' }),
        campo: 'outerHeightCm',
        erro: /Altura: a parede de 3 mm/,
      },
      // 2 × 20 mm = 4 cm; 4 − 4 = 0 cm de largura interna
      {
        caso: 'parede de 20 mm come a largura de 4 cm',
        draft: draftWith({ outerWidthCm: '4', wallThicknessMm: '20' }),
        campo: 'outerWidthCm',
        erro: /Largura: a parede de 20 mm/,
      },
      // 2 × 20 mm = 4 cm; 3 − 4 = −1 cm de comprimento interno
      {
        caso: 'parede de 20 mm maior que o comprimento de 3 cm',
        draft: draftWith({ outerLengthCm: '3', wallThicknessMm: '20' }),
        campo: 'outerLengthCm',
        erro: /Comprimento: a parede de 20 mm/,
      },
      {
        caso: 'parede 0 mm',
        draft: draftWith({ wallThicknessMm: '0' }),
        campo: 'wallThicknessMm',
        erro: /1 a 20 mm/,
      },
      {
        caso: 'parede 21 mm',
        draft: draftWith({ wallThicknessMm: '21' }),
        campo: 'wallThicknessMm',
        erro: /1 a 20 mm/,
      },
      {
        caso: 'parede fracionada',
        draft: draftWith({ wallThicknessMm: '3,5' }),
        campo: 'wallThicknessMm',
        erro: /número inteiro/,
      },
      {
        caso: 'peso máximo em branco',
        draft: draftWith({ maxWeightKg: '' }),
        campo: 'maxWeightKg',
        erro: /peso máximo em kg/,
      },
      {
        caso: 'peso máximo zero',
        draft: draftWith({ maxWeightKg: '0' }),
        campo: 'maxWeightKg',
        erro: /^Use um valor entre 0,001 e 100 kg\.$/,
      },
      {
        caso: 'peso máximo com 4 casas decimais',
        draft: draftWith({ maxWeightKg: '0,0005' }),
        campo: 'maxWeightKg',
        erro: /peso máximo em kg/,
      },
      // 0,5 kg × 1000 = 500 g; vazio 500 g; 500 não é maior que 500
      {
        caso: 'peso máximo igual ao vazio',
        draft: draftWith({ maxWeightKg: '0,5', emptyWeightG: '500' }),
        campo: 'maxWeightKg',
        erro: /maior que o peso da caixa vazia/,
      },
      // 10 kg × 1000 = 10000 g; vazio 12000 g; 10000 < 12000
      {
        caso: 'peso máximo menor que o vazio',
        draft: draftWith({ emptyWeightG: '12000' }),
        campo: 'maxWeightKg',
        erro: /maior que o peso da caixa vazia/,
      },
      {
        caso: 'peso vazio fracionado',
        draft: draftWith({ emptyWeightG: '0,5' }),
        campo: 'emptyWeightG',
        erro: /gramas/,
      },
      {
        caso: 'fator abaixo de 0,50',
        draft: draftWith({ fillFactor: '0,49' }),
        campo: 'fillFactor',
        erro: /0,50 a 1,00/,
      },
      {
        caso: 'fator acima de 1,00',
        draft: draftWith({ fillFactor: '1,01' }),
        campo: 'fillFactor',
        erro: /0,50 a 1,00/,
      },
      {
        caso: 'ordem fracionada',
        draft: draftWith({ sortOrder: '1,5' }),
        campo: 'sortOrder',
        erro: /número inteiro/,
      },
    ],
  )('$caso', ({ draft, campo, erro }) => {
    expect(errorsOf(draft)[campo]).toMatch(erro);
  });

  it('peso máximo 1 g acima do vazio passa (0,5 kg = 500 g contra 499 g)', () => {
    expect(valuesOf(draftWith({ maxWeightKg: '0,5', emptyWeightG: '499' }))).toMatchObject({
      max_weight_g: 500,
      empty_weight_g: 499,
    });
  });

  it('devolve um erro por campo quando vários estão errados', () => {
    const errors = errorsOf(
      draftWith({ code: 'P-1', name: '', outerHeightCm: 'x', fillFactor: '2' }),
    );
    expect(Object.keys(errors).sort()).toEqual(['code', 'fillFactor', 'name', 'outerHeightCm']);
  });
});

describe('medidas internas', () => {
  it.each([
    // 2 × 3 mm = 6 mm = 0,6 cm; 27 − 0,6 = 26,4
    { outerCm: 27, wallMm: 3, esperado: 26.4 },
    // 33 − 0,6 = 32,4
    { outerCm: 33, wallMm: 3, esperado: 32.4 },
    // 2 × 20 mm = 4 cm; 60 − 4 = 56
    { outerCm: 60, wallMm: 20, esperado: 56 },
    // 0,6 − 0,6 = 0
    { outerCm: 0.6, wallMm: 3, esperado: 0 },
    // 3 − 4 = −1: negativo não é medida
    { outerCm: 3, wallMm: 20, esperado: null },
    { outerCm: Number.NaN, wallMm: 3, esperado: null },
    { outerCm: 27, wallMm: Number.NaN, esperado: null },
  ])('innerDimensionCm($outerCm, $wallMm) = $esperado', ({ outerCm, wallMm, esperado }) => {
    expect(innerDimensionCm(outerCm, wallMm)).toBe(esperado);
  });

  it('prévia da caixa P: 26,4 × 32,4 × 32,4 cm e 27,71 L', () => {
    // 32,4 × 32,4 = 1049,76; × 26,4 = 27713,664 cm³; ÷ 1000 = 27,713664 L → 27,71
    expect(computeInnerPreview(DRAFT_P)).toEqual({
      heightCm: 26.4,
      widthCm: 32.4,
      lengthCm: 32.4,
      volumeL: 27.71,
    });
  });

  it('prévia sem volume enquanto falta uma medida', () => {
    expect(computeInnerPreview(draftWith({ outerLengthCm: '' }))).toEqual({
      heightCm: 26.4,
      widthCm: 32.4,
      lengthCm: null,
      volumeL: null,
    });
  });

  it('prévia não mostra medida interna zerada ou negativa', () => {
    // 2 × 20 mm = 4 cm; 4 − 4 = 0 e 3 − 4 = −1; 33 − 4 = 29
    expect(
      computeInnerPreview(
        draftWith({ outerHeightCm: '4', outerWidthCm: '3', wallThicknessMm: '20' }),
      ),
    ).toEqual({ heightCm: null, widthCm: null, lengthCm: 29, volumeL: null });
  });
});

/** Caixa GG já salva, com tudo fora do padrão: parede 5 mm, 350 g vazia, inativa, ordem 4. */
const ROW: ShippingBoxRow = {
  id: 'box-x',
  code: 'GG',
  name: 'Caixa GG',
  outer_height_cm: 40.5,
  outer_width_cm: 50,
  outer_length_cm: 60,
  wall_thickness_mm: 5,
  inner_height_cm: 39.5,
  inner_width_cm: 49,
  inner_length_cm: 59,
  empty_weight_g: 350,
  max_weight_g: 12500,
  fill_factor: 0.9,
  is_active: false,
  sort_order: 4,
  created_at: '2026-11-19T12:00:00Z',
  updated_at: '2026-11-19T12:00:00Z',
  deleted_at: null,
};

describe('toShippingBoxDraft', () => {
  it('preenche o formulário com vírgula decimal e peso máximo em kg', () => {
    // 12500 g ÷ 1000 = 12,5 kg; fator 0.9 exibido com duas casas
    expect(toShippingBoxDraft(ROW)).toEqual({
      code: 'GG',
      name: 'Caixa GG',
      outerHeightCm: '40,5',
      outerWidthCm: '50',
      outerLengthCm: '60',
      wallThicknessMm: '5',
      maxWeightKg: '12,5',
      emptyWeightG: '350',
      fillFactor: '0,90',
      sortOrder: '4',
      isActive: false,
    });
  });

  it('salvar sem mexer devolve os mesmos valores da linha, sem as internas', () => {
    expect(valuesOf(toShippingBoxDraft(ROW))).toEqual({
      code: 'GG',
      name: 'Caixa GG',
      outer_height_cm: 40.5,
      outer_width_cm: 50,
      outer_length_cm: 60,
      wall_thickness_mm: 5,
      empty_weight_g: 350,
      max_weight_g: 12500,
      fill_factor: 0.9,
      is_active: false,
      sort_order: 4,
    });
  });
});

describe('buildShippingBoxPatch — edição grava só o que mudou', () => {
  function patchOf(overrides: Partial<ShippingBoxFormDraft>) {
    const result = parseShippingBoxForm({ ...toShippingBoxDraft(ROW), ...overrides });
    if (!result.ok) throw new Error('rascunho inválido no teste');
    return buildShippingBoxPatch(ROW, result.values);
  }

  it('sem mexer em nada: patch vazio, nada a salvar', () => {
    expect(patchOf({})).toEqual({});
  });

  it.each<{ campo: string; digitado: Partial<ShippingBoxFormDraft>; patch: object }>([
    {
      campo: 'nome',
      digitado: { name: 'Caixa GG reforçada' },
      patch: { name: 'Caixa GG reforçada' },
    },
    { campo: 'código', digitado: { code: 'g2' }, patch: { code: 'G2' } },
    { campo: 'altura', digitado: { outerHeightCm: '41' }, patch: { outer_height_cm: 41 } },
    { campo: 'largura', digitado: { outerWidthCm: '50,5' }, patch: { outer_width_cm: 50.5 } },
    { campo: 'comprimento', digitado: { outerLengthCm: '61' }, patch: { outer_length_cm: 61 } },
    { campo: 'parede', digitado: { wallThicknessMm: '3' }, patch: { wall_thickness_mm: 3 } },
    // 30 kg × 1000 = 30000 g
    { campo: 'peso máximo', digitado: { maxWeightKg: '30' }, patch: { max_weight_g: 30000 } },
    { campo: 'peso vazio', digitado: { emptyWeightG: '400' }, patch: { empty_weight_g: 400 } },
    { campo: 'fator', digitado: { fillFactor: '0,85' }, patch: { fill_factor: 0.85 } },
    { campo: 'ordem', digitado: { sortOrder: '5' }, patch: { sort_order: 5 } },
    { campo: 'ativa', digitado: { isActive: true }, patch: { is_active: true } },
  ])('só $campo alterado: o patch leva só esse campo', ({ digitado, patch }) => {
    expect(patchOf(digitado)).toEqual(patch);
  });

  it('dois campos alterados: o patch leva os dois e mais nenhum', () => {
    // 12,5 kg → 15 kg = 15000 g
    expect(patchOf({ name: 'Caixa GG 2', maxWeightKg: '15' })).toEqual({
      name: 'Caixa GG 2',
      max_weight_g: 15000,
    });
  });

  it('o mesmo valor escrito de outro jeito não conta como alteração', () => {
    // 0.9 = 0,90 ; 40.50 = 40,5 ; 12.500 kg = 12,5 kg = 12500 g
    expect(patchOf({ fillFactor: '0.9', outerHeightCm: '40.50', maxWeightKg: '12.500' })).toEqual(
      {},
    );
  });
});

describe('newShippingBoxDraft — caixa nova', () => {
  it('usa o fator padrão de /admin/frete, com vírgula e duas casas', () => {
    expect(newShippingBoxDraft(0.8, 0)).toEqual({
      ...EMPTY_SHIPPING_BOX_DRAFT,
      fillFactor: '0,80',
    });
    expect(newShippingBoxDraft(1, 0).fillFactor).toBe('1,00');
  });

  it('com o DEFAULT da coluna (0,90) e ordem 0 é o formulário em branco de sempre', () => {
    expect(SHIPPING_BOX_COLUMN_FILL_FACTOR).toBe(0.9);
    expect(newShippingBoxDraft(SHIPPING_BOX_COLUMN_FILL_FACTOR, 0)).toEqual(
      EMPTY_SHIPPING_BOX_DRAFT,
    );
  });

  it('a ordem sugerida entra como texto no campo', () => {
    expect(newShippingBoxDraft(0.9, 4).sortOrder).toBe('4');
  });
});

describe('nextShippingBoxSortOrder', () => {
  it.each([
    // Sem caixas, a primeira começa em 0.
    { ordens: [], esperado: 0 },
    // P = 1, M = 2: maior 2 + 1 = 3.
    { ordens: [1, 2], esperado: 3 },
    // A lista não vem em ordem e tem buraco: maior 10 + 1 = 11.
    { ordens: [10, 1, 5], esperado: 11 },
    // Só ordens negativas: maior −2 + 1 = −1.
    { ordens: [-5, -2], esperado: -1 },
  ])('ordens $ordens sugerem $esperado', ({ ordens, esperado }) => {
    expect(nextShippingBoxSortOrder(ordens.map((ordem) => ({ sort_order: ordem })))).toBe(esperado);
  });
});

describe('limites do banco (migration de endurecimento)', () => {
  const MEDIDA = 'use um valor entre 0,01 e 300 cm.';
  const PESO = 'Use um valor entre 0,001 e 100 kg.';

  it.each([
    { campo: 'outerHeightCm', rotulo: 'Altura' },
    { campo: 'outerWidthCm', rotulo: 'Largura' },
    { campo: 'outerLengthCm', rotulo: 'Comprimento' },
  ] as const)('$campo: 0,01 e 300 passam; 0 e 300,01 são recusados', ({ campo, rotulo }) => {
    // 0,01 cm com parede de 1 mm (0,1 cm) daria interna negativa: a parede mínima é separada.
    expect(errorsOf(draftWith({ [campo]: '300' }))[campo]).toBeUndefined();
    expect(errorsOf(draftWith({ [campo]: '300,01' }))[campo]).toBe(`${rotulo}: ${MEDIDA}`);
    expect(errorsOf(draftWith({ [campo]: '0' }))[campo]).toBe(`${rotulo}: ${MEDIDA}`);
    expect(errorsOf(draftWith({ [campo]: '0,01' }))[campo]).not.toBe(`${rotulo}: ${MEDIDA}`);
  });

  it.each([
    // 100 kg × 1000 = 100000 g: o teto.
    { kg: '100', erro: undefined },
    // 100,001 kg × 1000 = 100001 g: 1 g acima do teto.
    { kg: '100,001', erro: PESO },
    // 0,001 kg × 1000 = 1 g: o piso.
    { kg: '0,001', erro: undefined },
    { kg: '0', erro: PESO },
  ])('peso máximo $kg kg: $erro', ({ kg, erro }) => {
    expect(errorsOf(draftWith({ maxWeightKg: kg })).maxWeightKg).toBe(erro);
  });

  it('100 kg viram exatamente 100000 g no payload', () => {
    expect(valuesOf(draftWith({ maxWeightKg: '100' }))).toMatchObject({ max_weight_g: 100000 });
  });
});
