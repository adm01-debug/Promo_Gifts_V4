/**
 * Regras do formulário de `/admin/frete`: máscara do CEP, validação e o que
 * vai para o banco. Os limites conferidos aqui são os CHECK da migration
 * 20261119213100_create_freight_settings.sql.
 */
import { describe, expect, it } from 'vitest';
import type { FreightSettingsRow } from '@/services/freightSettingsService';
import {
  buildFreightSettingsPatch,
  formatFillFactor,
  maskCep,
  parseFreightSettingsDraft,
  toFreightSettingsDraft,
  type FreightSettingsDraft,
  type FreightSettingsField,
} from '../freightSettingsFormSchema';

/** A linha como nasce na migration, com os padrões confirmados pelo dono. */
const LINHA: FreightSettingsRow = {
  id: true,
  origin_cep: '03377-000',
  cubic_divisor_correios: 6000,
  cubic_divisor_rodoviario: 3333,
  default_fill_factor: 0.9,
  internal_buffer_days: 0,
  multi_personalization_rule: 'max',
  updated_at: '2026-11-19T21:31:00Z',
  updated_by: null,
};

const RASCUNHO: FreightSettingsDraft = {
  originCep: '03377-000',
  cubicDivisorCorreios: '6000',
  cubicDivisorRodoviario: '3333',
  defaultFillFactor: '0,90',
  internalBufferDays: '0',
  multiPersonalizationRule: 'max',
};

describe('maskCep', () => {
  it.each([
    // 8 dígitos: 5 antes do hífen, 3 depois.
    ['03377000', '03377-000'],
    // Até 5 dígitos ainda não há o que separar.
    ['03377', '03377'],
    // 6 dígitos: o hífen entra depois do 5º.
    ['033770', '03377-0'],
    // Pontuação colada é descartada: sobram 03377000.
    ['03.377-000', '03377-000'],
    // 12 dígitos: só os 8 primeiros (03377000) contam.
    ['033770001234', '03377-000'],
    ['abc', ''],
  ])('%s vira %s', (digitado, esperado) => {
    expect(maskCep(digitado)).toBe(esperado);
  });
});

describe('formatFillFactor', () => {
  it.each([
    [0.9, '0,90'],
    [0.5, '0,50'],
    [1, '1,00'],
    [0.75, '0,75'],
  ])('%d vira %s', (valor, esperado) => {
    expect(formatFillFactor(valor)).toBe(esperado);
  });
});

describe('toFreightSettingsDraft', () => {
  it('preenche os campos com a linha salva', () => {
    expect(toFreightSettingsDraft(LINHA)).toEqual(RASCUNHO);
  });

  it('lê a regra "sum" e trata qualquer outro texto como "max"', () => {
    expect(
      toFreightSettingsDraft({ ...LINHA, multi_personalization_rule: 'sum' })
        .multiPersonalizationRule,
    ).toBe('sum');
    expect(
      toFreightSettingsDraft({ ...LINHA, multi_personalization_rule: 'outro' })
        .multiPersonalizationRule,
    ).toBe('max');
  });
});

describe('parseFreightSettingsDraft', () => {
  it('aceita a linha padrão e devolve os valores no formato do banco', () => {
    expect(parseFreightSettingsDraft(RASCUNHO)).toEqual({
      ok: true,
      values: {
        origin_cep: '03377-000',
        cubic_divisor_correios: 6000,
        cubic_divisor_rodoviario: 3333,
        default_fill_factor: 0.9,
        internal_buffer_days: 0,
        multi_personalization_rule: 'max',
      },
    });
  });

  it.each<[FreightSettingsField, string, string]>([
    // CEP: precisa de 5 dígitos, hífen e 3 dígitos.
    ['originCep', '', 'Informe o CEP completo, no formato 00000-000.'],
    ['originCep', '0337', 'Informe o CEP completo, no formato 00000-000.'],
    ['originCep', '03377-00', 'Informe o CEP completo, no formato 00000-000.'],
    ['originCep', '03377000', 'Informe o CEP completo, no formato 00000-000.'],
    // Divisores: inteiro maior que zero (CHECK > 0).
    ['cubicDivisorCorreios', '', 'Use um número inteiro maior que zero.'],
    ['cubicDivisorCorreios', '0', 'Use um número inteiro maior que zero.'],
    ['cubicDivisorCorreios', '-1', 'Use um número inteiro maior que zero.'],
    ['cubicDivisorCorreios', '6000,5', 'Use um número inteiro maior que zero.'],
    ['cubicDivisorRodoviario', 'abc', 'Use um número inteiro maior que zero.'],
    ['cubicDivisorRodoviario', '0', 'Use um número inteiro maior que zero.'],
    // Fator: 0,49 fica 0,01 abaixo do mínimo 0,50; 1,01 fica 0,01 acima do máximo 1,00.
    ['defaultFillFactor', '0,49', 'Use um valor entre 0,50 e 1,00, com até duas casas decimais.'],
    ['defaultFillFactor', '1,01', 'Use um valor entre 0,50 e 1,00, com até duas casas decimais.'],
    // Três casas não cabem na coluna numeric(3,2).
    ['defaultFillFactor', '0,905', 'Use um valor entre 0,50 e 1,00, com até duas casas decimais.'],
    ['defaultFillFactor', '', 'Use um valor entre 0,50 e 1,00, com até duas casas decimais.'],
    // Folga: inteiro, zero ou mais (CHECK >= 0).
    ['internalBufferDays', '', 'Use um número inteiro de dias, zero ou mais.'],
    ['internalBufferDays', '-1', 'Use um número inteiro de dias, zero ou mais.'],
    ['internalBufferDays', '1,5', 'Use um número inteiro de dias, zero ou mais.'],
  ])('recusa %s = "%s"', (campo, texto, mensagem) => {
    const resultado = parseFreightSettingsDraft({ ...RASCUNHO, [campo]: texto });
    expect(resultado).toEqual({ ok: false, errors: { [campo]: mensagem } });
  });

  it.each([
    // Os dois limites do CHECK (0,50 e 1,00) são aceitos.
    ['0,50', 0.5],
    ['1,00', 1],
    ['1', 1],
    // Vírgula ou ponto, com uma ou duas casas.
    ['0,9', 0.9],
    ['0.75', 0.75],
  ])('aceita o fator "%s" como %d', (texto, esperado) => {
    const resultado = parseFreightSettingsDraft({ ...RASCUNHO, defaultFillFactor: texto });
    expect(resultado.ok && resultado.values.default_fill_factor).toBe(esperado);
  });

  it('aponta todos os campos inválidos de uma vez', () => {
    const resultado = parseFreightSettingsDraft({
      ...RASCUNHO,
      originCep: '0337',
      cubicDivisorCorreios: '0',
      internalBufferDays: 'x',
    });
    expect(resultado).toEqual({
      ok: false,
      errors: {
        originCep: 'Informe o CEP completo, no formato 00000-000.',
        cubicDivisorCorreios: 'Use um número inteiro maior que zero.',
        internalBufferDays: 'Use um número inteiro de dias, zero ou mais.',
      },
    });
  });
});

describe('buildFreightSettingsPatch', () => {
  const VALORES = {
    origin_cep: '03377-000',
    cubic_divisor_correios: 6000,
    cubic_divisor_rodoviario: 3333,
    default_fill_factor: 0.9,
    internal_buffer_days: 0,
    multi_personalization_rule: 'max',
  } as const;

  it('sem mudança não há o que salvar', () => {
    expect(buildFreightSettingsPatch(LINHA, VALORES)).toEqual({});
  });

  it('6000 → 5000 no divisor dos Correios leva só esse campo', () => {
    expect(buildFreightSettingsPatch(LINHA, { ...VALORES, cubic_divisor_correios: 5000 })).toEqual({
      cubic_divisor_correios: 5000,
    });
  });

  it('leva todos os campos quando todos mudam', () => {
    const novos = {
      origin_cep: '01310-100',
      cubic_divisor_correios: 5000,
      cubic_divisor_rodoviario: 3000,
      default_fill_factor: 0.85,
      internal_buffer_days: 2,
      multi_personalization_rule: 'sum',
    } as const;
    expect(buildFreightSettingsPatch(LINHA, novos)).toEqual(novos);
  });

  it('fator igual em centésimos não conta como mudança', () => {
    // 0,9 × 100 = 90 nos dois lados, mesmo que a soma em ponto flutuante não seja exata:
    // 0.3 + 0.6 = 0.8999999999999999, que arredonda para 90 centésimos.
    expect(
      buildFreightSettingsPatch(LINHA, { ...VALORES, default_fill_factor: 0.3 + 0.6 }),
    ).toEqual({});
  });
});
