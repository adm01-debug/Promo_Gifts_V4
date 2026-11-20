import { describe, expect, it } from 'vitest';

import { ALIAS_MAP, TARGET_FIELDS, TEMPLATE_EXAMPLES } from '../types';
import { parseBooleanCell, parseStrictBooleanCell } from '../parseBooleanCell';
import { normalizeStr } from '../StepUpload';

describe('parseBooleanCell', () => {
  it.each([
    { celula: 'sim', esperado: true },
    { celula: 'Sim', esperado: true },
    { celula: ' SIM ', esperado: true },
    { celula: 'true', esperado: true },
    { celula: '1', esperado: true },
    { celula: 1, esperado: true },
    { celula: 'não', esperado: false },
    { celula: 'false', esperado: false },
    { celula: '0', esperado: false },
    { celula: 0, esperado: false },
    { celula: 'talvez', esperado: false },
  ])('"$celula" vira $esperado', ({ celula, esperado }) => {
    expect(parseBooleanCell(celula)).toBe(esperado);
  });
});

describe('coluna "não mistura" na importação', () => {
  it('está entre os campos de destino e no modelo CSV', () => {
    const campo = TARGET_FIELDS.find((f) => f.key === 'ships_separately');
    expect(campo?.label).toBe('Não mistura (sim/não)');
    expect(TEMPLATE_EXAMPLES.ships_separately).toBe('Não');
  });

  it.each(['naomistura', 'naomisturar', 'shipsseparately', 'caixapropria'])(
    'o cabeçalho "%s" mapeia sozinho para ships_separately',
    (cabecalho) => {
      expect(ALIAS_MAP[cabecalho]).toBe('ships_separately');
    },
  );
});

describe('parseStrictBooleanCell (campo "Não mistura")', () => {
  it.each([
    'sim',
    'Sim',
    ' SIM ',
    's',
    'S',
    'true',
    'TRUE',
    '1',
    'yes',
    'verdadeiro',
    'Verdadeiro',
    'VERDADEIRO',
  ])('"%s" vira true', (celula) => {
    expect(parseStrictBooleanCell(celula)).toBe(true);
  });

  it.each(['nao', 'não', 'Não', 'NÃO', ' n ', 'false', 'FALSE', '0', 'no', 'falso', 'Falso'])(
    '"%s" vira false',
    (celula) => {
      expect(parseStrictBooleanCell(celula)).toBe(false);
    },
  );

  it.each(['talvez', 'ok', '2', 'SIM.', 'x', ''])(
    '"%s" não é reconhecido (undefined: aviso e campo não enviado)',
    (celula) => {
      expect(parseStrictBooleanCell(celula)).toBeUndefined();
    },
  );

  it('números do Excel (1 e 0) valem', () => {
    expect(parseStrictBooleanCell(1)).toBe(true);
    expect(parseStrictBooleanCell(0)).toBe(false);
  });
});

describe('cabeçalho do próprio modelo', () => {
  it('o rótulo de "Não mistura" no modelo mapeia sozinho para ships_separately', () => {
    const campo = TARGET_FIELDS.find((f) => f.key === 'ships_separately');
    // O modelo escreve "Não mistura (sim/não)"; normalizeStr dá "naomisturasimnao".
    expect(normalizeStr(campo?.label ?? '')).toBe('naomisturasimnao');
    expect(ALIAS_MAP[normalizeStr(campo?.label ?? '')]).toBe('ships_separately');
  });
});
