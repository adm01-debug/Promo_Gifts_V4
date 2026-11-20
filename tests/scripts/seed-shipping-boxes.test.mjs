// Contrato de scripts/freight/seed-shipping-boxes.mjs: lê o CSV das caixas de transporte, repete os
// CHECKs de public.shipping_boxes (migration 20261119213000) e gera o SQL idempotente do seed e o
// rollback dele. O script só escreve arquivo — nunca abre conexão com banco. O texto do rollback é
// conferido em seed-shipping-boxes-rollback.test.mjs.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

import {
  COLUNAS,
  escaparTexto,
  executarCli,
  gerarRollbackSql,
  gerarSql,
  idDaCaixa,
  parseCsv,
  validarCaixas,
} from '../../scripts/freight/seed-shipping-boxes.mjs';
import { CAIXAS_PADRAO } from '../../src/lib/freight/__tests__/fixtures/boxes';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CSV_REAL = readFileSync(join(ROOT, 'scripts/freight/caixas.csv'), 'utf8');
const VERSION = '20261120090000';
const CABECALHO = COLUNAS.join(',');

// Caixa P como está no CSV real: 27 × 33 × 33 cm, parede 3 mm, 10 kg = 10 × 1000 = 10000 g.
const P = {
  code: 'P',
  name: 'Caixa P',
  outer_height_cm: '27',
  outer_width_cm: '33',
  outer_length_cm: '33',
  wall_thickness_mm: '3',
  empty_weight_g: '0',
  max_weight_g: '10000',
  fill_factor: '0.90',
  is_active: 'true',
  sort_order: '1',
};
const P_VALIDADA = {
  code: 'P',
  name: 'Caixa P',
  outer_height_cm: '27.00',
  outer_width_cm: '33.00',
  outer_length_cm: '33.00',
  wall_thickness_mm: 3,
  empty_weight_g: 0,
  max_weight_g: 10000,
  fill_factor: '0.90',
  is_active: true,
  sort_order: 1,
};

const linhaCsv = (troca = {}) => COLUNAS.map((c) => ({ ...P, ...troca })[c]).join(',');
const csvCom = (...trocas) => `${CABECALHO}\n${trocas.map(linhaCsv).join('\n')}\n`;
const validar = (...trocas) => validarCaixas(parseCsv(csvCom(...trocas)));
const instrucao = (sql, inicio) => sql.slice(sql.indexOf(inicio));

// Id fixo de cada caixa: UUID versão 8 tirado do sha256 de "shipping_boxes:<code>". Conta da P,
// feita fora do gerador (`printf 'shipping_boxes:P' | sha256sum`):
//   sha256 = 1a43b67a2bea056c2ae0268d914f9d21 7baa92497e2e2726c83af1b0ce2da604
//   16 primeiros bytes, em 8-4-4-4-12  → 1a43b67a-2bea-056c-2ae0-268d914f9d21
//   13º dígito vira 8 (a versão)       → 1a43b67a-2bea-856c-2ae0-268d914f9d21
//   17º dígito: 2 = 0010 em binário; os 2 bits de cima viram 10 → 1010 = a (a variante)
//                                      → 1a43b67a-2bea-856c-aae0-268d914f9d21
// As outras três, pela mesma conta: M 184c412a392ebbc93ccd3852f0ecd0d1 (b → 8; 3 = 0011 → 1011 = b),
// G 3f990d5db2aa3c2ce1d1e76c6c089525 (3 → 8; e = 1110 → 1010 = a) e
// GG 3d412436292c19af61795b9433cc75e8 (1 → 8; 6 = 0110 → 1010 = a).
const IDS = {
  P: '1a43b67a-2bea-856c-aae0-268d914f9d21',
  M: '184c412a-392e-8bc9-bccd-3852f0ecd0d1',
  G: '3f990d5d-b2aa-8c2c-a1d1-e76c6c089525',
  GG: '3d412436-292c-89af-a179-5b9433cc75e8',
};

describe('parseCsv', () => {
  it('lê o CSV real: 4 caixas, cada uma com a linha do arquivo (cabeçalho é a linha 1)', () => {
    const registros = parseCsv(CSV_REAL);
    expect(registros.map((r) => r.linha)).toEqual([2, 3, 4, 5]);
    expect(registros.map((r) => r.valores.code)).toEqual(['P', 'M', 'G', 'GG']);
    expect(registros[0].valores).toEqual(P);
  });

  it('o cabeçalho do CSV real são as colunas graváveis, sem as inner_*_cm geradas', () => {
    expect(CSV_REAL.split('\n')[0]).toBe(
      'code,name,outer_height_cm,outer_width_cm,outer_length_cm,wall_thickness_mm,empty_weight_g,max_weight_g,fill_factor,is_active,sort_order',
    );
  });

  it.each([
    [
      'coluna gerada',
      `${CABECALHO},inner_height_cm`,
      'linha 1 (cabeçalho): coluna gerada pelo banco não entra no CSV: inner_height_cm.',
    ],
    ['coluna desconhecida', `${CABECALHO},id`, 'linha 1 (cabeçalho): coluna desconhecida: id.'],
    ['coluna repetida', `${CABECALHO},code`, 'linha 1 (cabeçalho): coluna repetida: code.'],
    [
      'coluna faltando',
      COLUNAS.filter((c) => c !== 'sort_order').join(','),
      'linha 1 (cabeçalho): coluna faltando: sort_order.',
    ],
  ])('recusa cabeçalho com %s', (_caso, cabecalho, mensagem) => {
    expect(() => parseCsv(`${cabecalho}\n`)).toThrow(mensagem);
  });

  it('aponta a linha que tem campo a mais ou a menos', () => {
    // 11 colunas no cabeçalho; a linha 3 ganha um campo extra: 11 + 1 = 12.
    expect(() => parseCsv(`${CABECALHO}\n${linhaCsv()}\n${linhaCsv()},extra\n`)).toThrow(
      'linha 3: 12 campo(s), o cabeçalho tem 11.',
    );
  });

  it('aceita texto entre aspas duplas, com vírgula e aspas dobradas', () => {
    const [registro] = parseCsv(csvCom({ name: '"Caixa ""especial"", grande"' }));
    expect(registro.valores.name).toBe('Caixa "especial", grande');
  });

  it('recusa aspas abertas e não fechadas, com a linha', () => {
    expect(() => parseCsv(csvCom({ name: '"Caixa P' }))).toThrow(
      'linha 2: aspas duplas abertas e não fechadas.',
    );
  });

  it('ignora BOM, CRLF e linha vazia sem perder a numeração do arquivo', () => {
    // linha 1 cabeçalho, linha 2 vazia, linha 3 a caixa.
    const registros = parseCsv(
      `${String.fromCharCode(0xfeff)}${CABECALHO}\r\n\r\n${linhaCsv()}\r\n`,
    );
    expect(registros).toEqual([{ linha: 3, valores: P }]);
  });

  it('recusa CSV sem cabeçalho', () => {
    expect(() => parseCsv('\n\n')).toThrow('CSV vazio: falta a linha de cabeçalho.');
  });
});

describe('validarCaixas — CSV real', () => {
  const caixas = validarCaixas(parseCsv(CSV_REAL));

  it('normaliza a caixa P: medidas e fator com 2 casas, inteiros como número', () => {
    expect(caixas).toHaveLength(4);
    expect(caixas[0]).toEqual(P_VALIDADA);
  });

  // O CSV tem de descrever as mesmas caixas que o motor de frete usa nos testes (fixtures/boxes.ts):
  // P 27×33×33 cm 10000 g · M 33×33×47 cm 20000 g · G 36×36×54 cm 25000 g · GG 40×50×60 cm 30000 g,
  // todas com parede de 3 mm, peso vazio 0 e fator 0,90; sort_order 1 a 4 na ordem do dono.
  it.each(CAIXAS_PADRAO.map((fixture, indice) => [fixture.code, fixture, indice]))(
    'a caixa %s do CSV bate com o fixture do motor',
    (_code, fixture, indice) => {
      const caixa = caixas[indice];
      expect(caixa.code).toBe(fixture.code);
      expect(caixa.name).toBe(fixture.name);
      expect(Number(caixa.outer_height_cm)).toBe(fixture.outer.heightCm);
      expect(Number(caixa.outer_width_cm)).toBe(fixture.outer.widthCm);
      expect(Number(caixa.outer_length_cm)).toBe(fixture.outer.lengthCm);
      expect(caixa.wall_thickness_mm).toBe(3);
      expect(caixa.empty_weight_g).toBe(fixture.emptyWeightG);
      expect(caixa.max_weight_g).toBe(fixture.maxWeightG);
      expect(Number(caixa.fill_factor)).toBe(fixture.fillFactor);
      expect(caixa.is_active).toBe(true);
      expect(caixa.sort_order).toBe(indice + 1);
    },
  );
});

describe('validarCaixas — as mesmas regras dos CHECKs da tabela', () => {
  it.each([
    ['código vazio', { code: '' }, 'linha 2: code — "" inválido'],
    ['código minúsculo', { code: 'p' }, 'linha 2: code — "p" inválido'],
    ['código com 7 caracteres', { code: 'ABCDEFG' }, 'linha 2: code — "ABCDEFG" inválido'],
    ['código com hífen', { code: 'P-1' }, 'linha 2: code — "P-1" inválido'],
    ['nome vazio', { name: '' }, 'linha 2: name — nome obrigatório'],
    // limite de 80 caracteres: 81 passa do limite.
    ['nome com 81 caracteres', { name: 'x'.repeat(81) }, 'linha 2: name — nome obrigatório'],
    ['medida zero', { outer_height_cm: '0' }, 'linha 2: outer_height_cm — "0" inválido'],
    ['medida negativa', { outer_width_cm: '-1' }, 'linha 2: outer_width_cm — "-1" inválido'],
    [
      'medida com vírgula decimal',
      { outer_length_cm: '"26,5"' },
      'linha 2: outer_length_cm — "26,5" inválido',
    ],
    // numeric(8,2): a terceira casa seria arredondada pelo banco sem aviso.
    [
      'medida com 3 casas',
      { outer_height_cm: '27.555' },
      'linha 2: outer_height_cm — "27.555" inválido',
    ],
    ['medida vazia', { outer_height_cm: '' }, 'linha 2: outer_height_cm — "" inválido'],
    ['parede 0 mm', { wall_thickness_mm: '0' }, 'linha 2: wall_thickness_mm — "0" inválido'],
    ['parede 21 mm', { wall_thickness_mm: '21' }, 'linha 2: wall_thickness_mm — "21" inválido'],
    [
      'parede fracionada',
      { wall_thickness_mm: '3.5' },
      'linha 2: wall_thickness_mm — "3.5" inválido',
    ],
    // interna = 0,60 cm − 2 × 3 mm = 0,60 − 0,60 = 0,00 cm: não é maior que zero.
    [
      'externa igual a duas paredes',
      { outer_height_cm: '0.60' },
      'linha 2: outer_height_cm — 0.60 cm não deixa medida interna: com parede de 3 mm a externa tem de ser maior que 0.60 cm',
    ],
    // parede 20 mm: 2 × 20 mm = 40 mm = 4,00 cm; interna = 4,00 − 4,00 = 0,00 cm.
    [
      'externa de 4 cm com parede de 20 mm',
      { outer_length_cm: '4', wall_thickness_mm: '20' },
      'linha 2: outer_length_cm — 4.00 cm não deixa medida interna: com parede de 20 mm a externa tem de ser maior que 4.00 cm',
    ],
    ['peso vazio negativo', { empty_weight_g: '-1' }, 'linha 2: empty_weight_g — "-1" inválido'],
    // CHECK (max_weight_g > empty_weight_g): 500 > 500 é falso.
    [
      'peso máximo igual ao vazio',
      { empty_weight_g: '500', max_weight_g: '500' },
      'linha 2: max_weight_g — 500 g tem de ser maior que o peso da caixa vazia (500 g)',
    ],
    // 0 > 0 é falso.
    [
      'peso máximo zero',
      { max_weight_g: '0' },
      'linha 2: max_weight_g — 0 g tem de ser maior que o peso da caixa vazia (0 g)',
    ],
    [
      'peso máximo não inteiro',
      { max_weight_g: '10.5' },
      'linha 2: max_weight_g — "10.5" inválido',
    ],
    ['fator 0,49', { fill_factor: '0.49' }, 'linha 2: fill_factor — "0.49" inválido'],
    ['fator 1,01', { fill_factor: '1.01' }, 'linha 2: fill_factor — "1.01" inválido'],
    ['fator com 3 casas', { fill_factor: '0.905' }, 'linha 2: fill_factor — "0.905" inválido'],
    ['ativa "sim"', { is_active: 'sim' }, 'linha 2: is_active — "sim" inválido'],
    ['ativa "TRUE"', { is_active: 'TRUE' }, 'linha 2: is_active — "TRUE" inválido'],
    ['ordem fracionada', { sort_order: '1.5' }, 'linha 2: sort_order — "1.5" inválido'],
    // integer do Postgres vai até 2^31 − 1 = 2147483647; 2147483648 passa em 1.
    [
      'ordem fora do integer',
      { sort_order: '2147483648' },
      'linha 2: sort_order — "2147483648" inválido',
    ],
  ])('recusa %s', (_caso, troca, mensagem) => {
    expect(() => validar(troca)).toThrow(mensagem);
  });

  it.each([
    // interna = 0,61 − 0,60 = 0,01 cm: maior que zero.
    [
      'externa 1 centésimo acima de duas paredes',
      { outer_height_cm: '0.61' },
      'outer_height_cm',
      '0.61',
    ],
    // parede 20 mm desconta 4,00 cm: 4,01 − 4,00 = 0,01 cm.
    [
      'externa 4,01 cm com parede de 20 mm',
      { outer_length_cm: '4.01', wall_thickness_mm: '20' },
      'outer_length_cm',
      '4.01',
    ],
    ['medida com 1 casa vira 2 casas', { outer_width_cm: '26.5' }, 'outer_width_cm', '26.50'],
    ['parede 1 mm (mínimo)', { wall_thickness_mm: '1' }, 'wall_thickness_mm', 1],
    ['parede 20 mm (máximo)', { wall_thickness_mm: '20' }, 'wall_thickness_mm', 20],
    // 501 > 500.
    [
      'peso máximo 1 g acima do vazio',
      { empty_weight_g: '500', max_weight_g: '501' },
      'max_weight_g',
      501,
    ],
    ['fator 0,50 (mínimo)', { fill_factor: '0.50' }, 'fill_factor', '0.50'],
    ['fator 1 (máximo) vira 1.00', { fill_factor: '1' }, 'fill_factor', '1.00'],
    ['inativa', { is_active: 'false' }, 'is_active', false],
    ['ordem negativa', { sort_order: '-2' }, 'sort_order', -2],
    ['nome com 80 caracteres', { name: 'x'.repeat(80) }, 'name', 'x'.repeat(80)],
    ['código de 6 caracteres com número', { code: 'GG2026' }, 'code', 'GG2026'],
  ])('aceita %s', (_caso, troca, campo, esperado) => {
    const [caixa] = validar(troca);
    expect(caixa[campo]).toBe(esperado);
  });

  it('junta os problemas de todas as linhas, cada um com a linha do CSV', () => {
    // linha 2 = P válida; linha 3 = fator fora da faixa; linha 4 = parede e peso errados.
    const erro = () =>
      validar(
        {},
        { code: 'M', fill_factor: '0.30' },
        { code: 'G', wall_thickness_mm: '25', max_weight_g: '0' },
      );
    expect(erro).toThrow(
      [
        'linha 3: fill_factor — "0.30" inválido: de 0.50 a 1.00, com ponto decimal e até 2 casas.',
        'linha 4: wall_thickness_mm — "25" inválido: inteiro de 1 a 20 (mm).',
        'linha 4: max_weight_g — 0 g tem de ser maior que o peso da caixa vazia (0 g).',
      ].join('\n'),
    );
  });

  it('recusa código repetido e diz onde está o primeiro', () => {
    expect(() => validar({}, { code: 'M' }, {})).toThrow(
      'linha 4: code — "P" repetido (já está na linha 2).',
    );
  });

  it('recusa CSV só com cabeçalho', () => {
    expect(() => validarCaixas(parseCsv(`${CABECALHO}\n`))).toThrow(
      'nenhuma caixa: o CSV só tem o cabeçalho.',
    );
  });
});

describe('idDaCaixa', () => {
  it('as 4 caixas reais têm o id calculado à mão', () => {
    expect(Object.fromEntries(Object.keys(IDS).map((code) => [code, idDaCaixa(code)]))).toEqual(
      IDS,
    );
  });

  it('é determinístico e é um UUID versão 8 válido, um por código', () => {
    const codigos = ['P', 'M', 'G', 'GG', 'P2', 'GG2026'];
    const ids = codigos.map(idDaCaixa);
    expect(codigos.map(idDaCaixa)).toEqual(ids);
    // 6 códigos diferentes → 6 ids diferentes.
    expect(new Set(ids).size).toBe(6);
    for (const id of ids)
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe('gerarSql', () => {
  const sqlP = gerarSql([P_VALIDADA], { version: VERSION });
  const sqlReal = gerarSql(validarCaixas(parseCsv(CSV_REAL)), { version: VERSION });

  it('INSERT da caixa P, escrito à mão', () => {
    expect(instrucao(sqlP, 'INSERT INTO')).toBe(
      [
        'INSERT INTO public.shipping_boxes',
        '  (id, code, name, outer_height_cm, outer_width_cm, outer_length_cm,',
        '   wall_thickness_mm, empty_weight_g, max_weight_g, fill_factor,',
        '   is_active, sort_order)',
        'VALUES',
        "  ('1a43b67a-2bea-856c-aae0-268d914f9d21', 'P', 'Caixa P', 27.00, 33.00, 33.00, 3, 0, 10000, 0.90, true, 1)",
        'ON CONFLICT DO NOTHING;',
        '',
      ].join('\n'),
    );
  });

  it('as 4 caixas reais viram 4 tuplas, na ordem do CSV, cada uma com o seu id fixo', () => {
    const linhas = sqlReal.split('\n');
    expect(linhas.slice(linhas.indexOf('VALUES') + 1, -2)).toEqual([
      `  ('${IDS.P}', 'P', 'Caixa P', 27.00, 33.00, 33.00, 3, 0, 10000, 0.90, true, 1),`,
      `  ('${IDS.M}', 'M', 'Caixa M', 33.00, 33.00, 47.00, 3, 0, 20000, 0.90, true, 2),`,
      `  ('${IDS.G}', 'G', 'Caixa G', 36.00, 36.00, 54.00, 3, 0, 25000, 0.90, true, 3),`,
      `  ('${IDS.GG}', 'GG', 'Caixa GG', 40.00, 50.00, 60.00, 3, 0, 30000, 0.90, true, 4)`,
    ]);
  });

  it('cabeçalho: a primeira linha aponta o rollback e tudo antes do INSERT é comentário', () => {
    const linhas = sqlReal.split('\n');
    expect(linhas[0]).toBe('-- Rollback: supabase/rollbacks/20261120090000_rollback.sql');
    const cabecalho = linhas.slice(0, linhas.indexOf('INSERT INTO public.shipping_boxes') - 1);
    expect(cabecalho.every((linha) => linha.startsWith('--'))).toBe(true);
    expect(cabecalho.join('\n')).toContain('transporte padrão da empresa (P, M, G, GG).');
    expect(cabecalho.join('\n')).toContain('-- scripts/freight/caixas.csv. Não edite à mão');
  });

  // Sem alvo, o ON CONFLICT vale para os dois índices únicos: o parcial de `code` e a chave primária
  // (`id`). Com o alvo só em `code`, reaplicar depois de o admin excluir uma caixa do seed (a linha
  // fica, com o mesmo id) parava em violação da chave primária.
  it('é idempotente no texto: ON CONFLICT sem alvo, e só DO NOTHING', () => {
    const insert = instrucao(sqlReal, 'INSERT INTO');
    expect(insert.endsWith(')\nON CONFLICT DO NOTHING;\n')).toBe(true);
    expect(insert.match(/ON CONFLICT/g)).toHaveLength(1);
    expect(insert).not.toContain('ON CONFLICT (');
    expect(insert).not.toContain('DO UPDATE');
  });

  it('não grava coluna gerada nem abre transação (o workflow aplica com psql -1)', () => {
    expect(instrucao(sqlReal, 'INSERT INTO')).not.toContain('inner_');
    expect(sqlReal).not.toMatch(/^\s*(?:BEGIN|COMMIT|ROLLBACK)\b/im);
  });

  it('é determinístico: o mesmo CSV gera o mesmo texto', () => {
    expect(gerarSql(validarCaixas(parseCsv(CSV_REAL)), { version: VERSION })).toBe(sqlReal);
  });

  it('escapa aspa simples do nome', () => {
    expect(escaparTexto("Caixa d'água")).toBe("'Caixa d''água'");
    // 1 aspa vira 2 e 2 aspas viram 4.
    expect(escaparTexto("a'b''c")).toBe("'a''b''''c'");
    const [caixa] = validar({ code: 'X1', name: "x'); DROP TABLE shipping_boxes;--" });
    expect(gerarSql([caixa], { version: VERSION })).toContain(
      "', 'X1', 'x''); DROP TABLE shipping_boxes;--', 27.00, 33.00, 33.00, 3, 0, 10000, 0.90, true, 1)\n",
    );
  });

  it.each([
    ['faltando', undefined],
    ['com 10 dígitos', '2026112009'],
    ['com mês 13', '20261320090000'],
    ['com dia 31 de novembro', '20261131090000'],
  ])('recusa versão %s', (_caso, version) => {
    expect(() => gerarSql([P_VALIDADA], { version })).toThrow('inválida: use 14 dígitos');
  });

  it('recusa versão que não vem depois da migration que cria a tabela', () => {
    expect(() => gerarSql([P_VALIDADA], { version: '20261119213000' })).toThrow(
      'versão 20261119213000 tem de ser maior que 20261119213000',
    );
  });

  it('recusa lista vazia e origem com quebra de linha (viraria SQL fora do comentário)', () => {
    expect(() => gerarSql([], { version: VERSION })).toThrow('nenhuma caixa para gerar o SQL.');
    expect(() =>
      gerarSql([P_VALIDADA], { version: VERSION, origemCsv: 'a.csv\nDROP TABLE x;' }),
    ).toThrow('tem caractere de controle');
  });
});

describe('executarCli', () => {
  const pasta = mkdtempSync(join(tmpdir(), 'seed-shipping-boxes-'));
  afterAll(() => rmSync(pasta, { recursive: true, force: true }));

  const rodar = (...argv) => {
    const linhas = [];
    const saida = { log: (texto) => linhas.push(texto), error: (texto) => linhas.push(texto) };
    return { codigo: executarCli(argv, saida), texto: linhas.join('\n') };
  };

  it('gera a migration e o rollback do CSV real; a versão sai do nome de --out', () => {
    const out = join(pasta, 'ok', '20261120090000_seed_shipping_boxes.sql');
    const rollbackOut = join(pasta, 'ok', '20261120090000_rollback.sql');
    const { codigo, texto } = rodar('--out', out, '--rollback-out', rollbackOut);
    const caixas = validarCaixas(parseCsv(CSV_REAL));
    expect(codigo).toBe(0);
    expect(texto).toContain('4 caixa(s) de scripts/freight/caixas.csv (P, M, G, GG)');
    expect(readFileSync(out, 'utf8')).toBe(gerarSql(caixas, { version: VERSION }));
    expect(readFileSync(rollbackOut, 'utf8')).toBe(
      gerarRollbackSql(caixas, {
        version: VERSION,
        migration: '20261120090000_seed_shipping_boxes',
      }),
    );
  });

  it('CSV inválido: sai com 1, aponta arquivo e linha e não escreve nada', () => {
    const csv = join(pasta, 'ruim.csv');
    const out = join(pasta, 'ruim', '20261120090000_seed_shipping_boxes.sql');
    writeFileSync(csv, csvCom({}, { code: 'M', fill_factor: '0.30' }));
    const { codigo, texto } = rodar('--csv', csv, '--out', out);
    expect(codigo).toBe(1);
    expect(texto).toBe(
      'ERRO em ruim.csv:\nlinha 3: fill_factor — "0.30" inválido: de 0.50 a 1.00, com ponto decimal e até 2 casas.',
    );
    expect(existsSync(out)).toBe(false);
  });

  it.each([
    ['sem --out', [], 2, 'ERRO: --out é obrigatório'],
    ['opção desconhecida', ['--out', 'x.sql', '--apply'], 2, 'ERRO: opção desconhecida: --apply'],
    ['opção sem valor', ['--out'], 2, 'ERRO: --out exige um valor'],
    [
      '--out sem versão no nome e sem --version',
      ['--out', 'seed.sql'],
      1,
      'ERRO: informe --version',
    ],
    [
      '--version diferente da versão do nome',
      ['--out', '20261120090000_seed.sql', '--version', '20261120100000'],
      1,
      'ERRO: --version 20261120100000 não bate com a versão do nome de --out (20261120090000).',
    ],
    [
      '--rollback-out com outro nome',
      ['--out', '20261120090000_seed.sql', '--rollback-out', 'desfaz.sql'],
      1,
      'ERRO: --rollback-out tem de se chamar 20261120090000_rollback.sql',
    ],
  ])('uso errado — %s', (_caso, argv, codigo, mensagem) => {
    const resultado = rodar(...argv);
    expect(resultado.codigo).toBe(codigo);
    expect(resultado.texto).toContain(mensagem);
  });
});
