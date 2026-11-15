/**
 * Testes de `logoColorToGroups` — base de cor do Encaixe do Cliente.
 *
 * Os 18 grupos da fixture são os dados REAIS de `color_groups` no banco
 * canônico `doufsxqlfjyuvxuezpln`, lidos em 2026-11-15 com
 * `select id, name, slug, hex_code, is_active, sort_order from color_groups
 *  order by name` (18 linhas, todas ativas, todas com hex de 6 dígitos).
 *
 * Os Delta-E esperados também são medidos, não estimados: cada número veio
 * da saída da própria função contra esta fixture. `Transparente` é o único
 * grupo gravado em minúsculas no banco (`#d8d8d8`) e está aqui como está lá.
 */

import { describe, expect, it } from 'vitest';

import {
  classificarConfianca,
  logoColorToGroups,
  normalizarHex,
  type GrupoDeCorCatalogo,
} from '@/lib/assistant/logoColorToGroups';

/** Cópia fiel das 18 linhas de `color_groups` (produção, 2026-11-15). */
const GRUPOS_REAIS: GrupoDeCorCatalogo[] = [
  { id: '0d73b500-f376-46b5-9810-f1205f69c1c3', name: 'Amarelo', hex_code: '#FFEB3B' },
  { id: '85e0e385-508b-4fda-ac37-ec50d592d8d0', name: 'Azul', hex_code: '#2196F3' },
  { id: '2587cead-8666-4ab1-9a8c-396572f91d21', name: 'Bege', hex_code: '#D4C4A8' },
  { id: '062acdd0-35ed-4e42-826d-c04332e7314c', name: 'Branco', hex_code: '#FFFFFF' },
  { id: '11a77781-39a8-48d9-bfa6-c0e3c08391e9', name: 'Cinza', hex_code: '#9E9E9E' },
  { id: '12e929ba-87ab-4e02-8598-059558fb1dc8', name: 'Cobre', hex_code: '#B87333' },
  { id: 'a88ea2b9-8080-40ad-85ee-f2607cd0ab23', name: 'Colorido', hex_code: '#ABABAB' },
  { id: 'ecb4778d-c472-4577-be0a-b923f1e7072e', name: 'Dourado', hex_code: '#FFD700' },
  { id: '9cea4523-97dd-400a-874e-284d698cadbe', name: 'Laranja', hex_code: '#FF9800' },
  { id: '419ad481-cb82-49df-9e2e-9b1ab262c831', name: 'Marrom', hex_code: '#795548' },
  { id: 'f8f2599c-3950-464c-b91d-28ebd4548279', name: 'Natural', hex_code: '#BB8B64' },
  { id: '23bb328d-f7cb-417b-8351-c8579cbd7cb7', name: 'Prata', hex_code: '#C0C0C0' },
  { id: '0ccd0d09-a5a1-49f9-a633-585d1ba4c6ea', name: 'Preto', hex_code: '#000000' },
  { id: 'ce4c9f22-d0aa-4661-9cce-faa8264b583a', name: 'Rosa', hex_code: '#E91E63' },
  { id: 'd5ac13dc-8554-4ee2-845b-b7d5a084a42c', name: 'Roxo', hex_code: '#9C27B0' },
  { id: '26e985d7-be96-4728-8163-b244f5e8ce55', name: 'Transparente', hex_code: '#d8d8d8' },
  { id: '8a1228e6-cc13-409f-b198-a69759030991', name: 'Verde', hex_code: '#4CAF50' },
  { id: '338990e8-ba94-49f7-a6f5-2894d9dd9e46', name: 'Vermelho', hex_code: '#F44336' },
];

const ID_AZUL = '85e0e385-508b-4fda-ac37-ec50d592d8d0';
const ID_PRATA = '23bb328d-f7cb-417b-8351-c8579cbd7cb7';
const ID_CINZA = '11a77781-39a8-48d9-bfa6-c0e3c08391e9';
const ID_TRANSPARENTE = '26e985d7-be96-4728-8163-b244f5e8ce55';
const ID_VERMELHO = '338990e8-ba94-49f7-a6f5-2894d9dd9e46';

const nomes = (encaixes: ReturnType<typeof logoColorToGroups>) =>
  encaixes.map((e) => e.nomeDoGrupo);

describe('logoColorToGroups — azul institucional', () => {
  // #0057B8 é o azul institucional típico de papelaria corporativa.
  it('põe Azul na frente, com a distância medida e folga sobre o 2º lugar', () => {
    const encaixes = logoColorToGroups(['#0057B8'], GRUPOS_REAIS);

    expect(nomes(encaixes)).toEqual(['Azul', 'Roxo', 'Cinza']);
    expect(encaixes[0].colorGroupId).toBe(ID_AZUL);
    expect(encaixes[0].deltaE).toBeCloseTo(26.7604, 4);
    expect(encaixes[1].deltaE).toBeCloseTo(47.9083, 4);
    // O catálogo tem 18 baldes para o espaço inteiro: 26,76 é "família certa",
    // não "mesma cor". A folga de ~21 sobre Roxo é o que sustenta a escolha.
    expect(encaixes[0].confianca).toBe('aproximada');
    expect(encaixes[1].deltaE - encaixes[0].deltaE).toBeGreaterThan(20);
  });

  it('devolve o hex do grupo e o hex da logo normalizados em minúsculo', () => {
    const [melhor] = logoColorToGroups(['#0057B8'], GRUPOS_REAIS);

    expect(melhor.hexDaLogo).toBe('#0057b8');
    expect(melhor.hexDoGrupo).toBe('#2196f3');
  });

  it('trata a logo que usa literalmente o hex do grupo como cor exata', () => {
    const [melhor] = logoColorToGroups(['#2196f3'], GRUPOS_REAIS, { limite: 2 });

    expect(melhor.nomeDoGrupo).toBe('Azul');
    expect(melhor.deltaE).toBe(0);
    expect(melhor.confianca).toBe('exata');
  });

  it('aceita a forma curta de 3 dígitos', () => {
    const [melhor] = logoColorToGroups(['#09F'], GRUPOS_REAIS);

    expect(melhor.hexDaLogo).toBe('#0099ff');
    expect(melhor.nomeDoGrupo).toBe('Azul');
    expect(melhor.deltaE).toBeCloseTo(5.0327, 4);
    expect(melhor.confianca).toBe('proxima');
  });
});

describe('logoColorToGroups — tom ambíguo entre dois grupos', () => {
  // #CCCCCC cai quase exatamente entre Transparente (#d8d8d8) e Prata
  // (#C0C0C0): 4,2939 contra 4,3414, diferença medida de 0,0475.
  it('devolve os dois grupos vizinhos, na ordem da distância medida', () => {
    const encaixes = logoColorToGroups(['#CCCCCC'], GRUPOS_REAIS, { limite: 2 });

    expect(nomes(encaixes)).toEqual(['Transparente', 'Prata']);
    expect(encaixes[0].deltaE).toBeCloseTo(4.2939, 4);
    expect(encaixes[1].deltaE).toBeCloseTo(4.3414, 4);
    expect(encaixes[1].deltaE - encaixes[0].deltaE).toBeLessThan(0.1);
    // Ambos na mesma faixa: quem chama precisa ver que a escolha é disputada
    // em vez de receber um vencedor fabricado.
    expect(encaixes.map((e) => e.confianca)).toEqual(['proxima', 'proxima']);
  });

  it('não esconde o 2º lugar quando o limite permite', () => {
    const encaixes = logoColorToGroups(['#CCCCCC'], GRUPOS_REAIS, { limite: 4 });

    expect(nomes(encaixes)).toEqual(['Transparente', 'Prata', 'Colorido', 'Bege']);
  });

  it('desempata empate exato por nome e depois por id, sem localeCompare', () => {
    // Cenário permitido pelo schema: as únicas UNIQUE de `color_groups` são
    // `(organization_id, name)` e `slug` — nada impede dois grupos com o mesmo
    // `hex_code`. Aqui Cinza e Prata carregam o mesmo hex real (#C0C0C0), a
    // logo usa esse hex, e as duas distâncias são 0 exato.
    const comHexRepetido: GrupoDeCorCatalogo[] = [
      { id: ID_PRATA, name: 'Prata', hex_code: '#C0C0C0' },
      { id: ID_CINZA, name: 'Cinza', hex_code: '#C0C0C0' },
    ];

    const encaixes = logoColorToGroups(['#C0C0C0'], comHexRepetido);

    expect(encaixes.map((e) => e.deltaE)).toEqual([0, 0]);
    expect(nomes(encaixes)).toEqual(['Cinza', 'Prata']);
    // Mesma entrada em ordem invertida devolve a mesma ordem de saída.
    expect(nomes(logoColorToGroups(['#C0C0C0'], [...comHexRepetido].reverse()))).toEqual([
      'Cinza',
      'Prata',
    ]);
  });
});

describe('logoColorToGroups — hex malformado', () => {
  it.each([
    ['vazio', ''],
    ['só espaços', '   '],
    ['letras fora do hex', '#ZZZZZZ'],
    ['5 dígitos', '#12345'],
    ['7 dígitos', '#1234567'],
    ['nome de cor', 'azul'],
    ['rgb() em vez de hex', 'rgb(0,87,184)'],
    ['hex com 8 dígitos (alfa)', '#0057b8ff'],
  ])('ignora hex inválido (%s) e devolve lista vazia', (_rotulo, hex) => {
    expect(logoColorToGroups([hex], GRUPOS_REAIS)).toEqual([]);
  });

  it('ignora valores não-string vindos de JSON do CRM', () => {
    expect(logoColorToGroups([null, undefined, 123, {}, []], GRUPOS_REAIS)).toEqual([]);
  });

  it('aproveita as cores válidas e descarta só as ilegíveis', () => {
    const encaixes = logoColorToGroups(['#ZZZZZZ', '  #0057B8  ', ''], GRUPOS_REAIS, {
      limite: 1,
    });

    expect(encaixes).toHaveLength(1);
    expect(encaixes[0].nomeDoGrupo).toBe('Azul');
    expect(encaixes[0].hexDaLogo).toBe('#0057b8');
  });

  it('descarta grupo cujo hex_code é nulo ou ilegível, sem contaminar com NaN', () => {
    // `hex_code` é nullable no schema; `hexToRgb` não valida e devolveria NaN.
    const grupos: GrupoDeCorCatalogo[] = [
      { id: ID_AZUL, name: 'Azul', hex_code: null },
      { id: ID_PRATA, name: 'Prata', hex_code: '' },
      { id: ID_CINZA, name: 'Cinza', hex_code: '#9E9E9E' },
    ];

    const encaixes = logoColorToGroups(['#0057B8'], grupos);

    expect(nomes(encaixes)).toEqual(['Cinza']);
    expect(Number.isNaN(encaixes[0].deltaE)).toBe(false);
  });
});

describe('logoColorToGroups — lista vazia e estados de borda', () => {
  it('devolve [] quando a logo não tem cor', () => {
    expect(logoColorToGroups([], GRUPOS_REAIS)).toEqual([]);
  });

  it('devolve [] quando o catálogo de grupos vem vazio', () => {
    expect(logoColorToGroups(['#0057B8'], [])).toEqual([]);
  });

  it('devolve [] quando os dois lados vêm vazios', () => {
    expect(logoColorToGroups([], [])).toEqual([]);
  });

  it('devolve [] quando todo grupo do catálogo está sem hex', () => {
    const semHex: GrupoDeCorCatalogo[] = [
      { id: ID_AZUL, name: 'Azul', hex_code: null },
      { id: ID_PRATA, name: 'Prata', hex_code: null },
    ];

    expect(logoColorToGroups(['#0057B8'], semHex)).toEqual([]);
  });

  it('descarta grupo inativo', () => {
    const grupos: GrupoDeCorCatalogo[] = [
      { id: ID_AZUL, name: 'Azul', hex_code: '#2196F3', is_active: false },
      { id: ID_CINZA, name: 'Cinza', hex_code: '#9E9E9E', is_active: true },
    ];

    expect(nomes(logoColorToGroups(['#0057B8'], grupos))).toEqual(['Cinza']);
  });

  it('devolve [] para limite menor que 1 ou NaN', () => {
    expect(logoColorToGroups(['#0057B8'], GRUPOS_REAIS, { limite: 0 })).toEqual([]);
    expect(logoColorToGroups(['#0057B8'], GRUPOS_REAIS, { limite: -3 })).toEqual([]);
    expect(logoColorToGroups(['#0057B8'], GRUPOS_REAIS, { limite: Number.NaN })).toEqual([]);
  });

  it('corta pelo deltaEMaximo', () => {
    const encaixes = logoColorToGroups(['#0057B8'], GRUPOS_REAIS, { deltaEMaximo: 30 });

    expect(nomes(encaixes)).toEqual(['Azul']);
    expect(logoColorToGroups(['#0057B8'], GRUPOS_REAIS, { deltaEMaximo: 10 })).toEqual([]);
  });

  it('nunca devolve mais que o limite, nem com o catálogo inteiro', () => {
    expect(logoColorToGroups(['#0057B8'], GRUPOS_REAIS)).toHaveLength(3);
    expect(logoColorToGroups(['#0057B8'], GRUPOS_REAIS, { limite: 50 })).toHaveLength(18);
  });
});

describe('logoColorToGroups — logo com várias cores', () => {
  it('usa a menor distância de cada grupo e não repete grupo', () => {
    const encaixes = logoColorToGroups(['#0057B8', '#E30613'], GRUPOS_REAIS, { limite: 4 });

    expect(nomes(encaixes)).toEqual(['Vermelho', 'Azul', 'Rosa', 'Roxo']);
    expect(encaixes[0].deltaE).toBeCloseTo(13.4137, 4);
    expect(encaixes[0].hexDaLogo).toBe('#e30613');
    expect(encaixes[1].deltaE).toBeCloseTo(26.7604, 4);
    expect(encaixes[1].hexDaLogo).toBe('#0057b8');
    expect(new Set(encaixes.map((e) => e.colorGroupId)).size).toBe(encaixes.length);
  });

  it('não deixa uma cor repetida da logo ocupar o ranking', () => {
    const encaixes = logoColorToGroups(
      ['#0057B8', '#0057b8', '  #0057B8  ', '#E30613'],
      GRUPOS_REAIS,
      { limite: 2 },
    );

    expect(nomes(encaixes)).toEqual(['Vermelho', 'Azul']);
    expect(encaixes.map((e) => e.colorGroupId)).toEqual([ID_VERMELHO, ID_AZUL]);
  });

  it('conta o grupo repetido no catálogo uma vez só', () => {
    const duplicado = [...GRUPOS_REAIS, ...GRUPOS_REAIS];

    const encaixes = logoColorToGroups(['#CCCCCC'], duplicado, { limite: 50 });

    expect(encaixes).toHaveLength(18);
    expect(encaixes[0].colorGroupId).toBe(ID_TRANSPARENTE);
  });
});

describe('normalizarHex', () => {
  it.each([
    ['#0057B8', '#0057b8'],
    ['0057B8', '#0057b8'],
    ['  #D8D8D8  ', '#d8d8d8'],
    ['#d8d8d8', '#d8d8d8'],
    ['#09F', '#0099ff'],
    ['09f', '#0099ff'],
    ['#FFF', '#ffffff'],
  ])('normaliza %s para %s', (entrada, esperado) => {
    expect(normalizarHex(entrada)).toBe(esperado);
  });

  it.each([
    [''],
    ['   '],
    ['#12345'],
    ['#ZZZZZZ'],
    ['#0057b8ff'],
    ['azul'],
    [null],
    [undefined],
    [42],
  ])('devolve null para entrada inválida (%s)', (entrada) => {
    expect(normalizarHex(entrada)).toBeNull();
  });
});

describe('classificarConfianca', () => {
  it.each([
    [0, 'exata'],
    [2.3, 'exata'],
    [2.31, 'proxima'],
    [12, 'proxima'],
    [12.01, 'aproximada'],
    [30, 'aproximada'],
    [30.01, 'distante'],
    [62.26, 'distante'],
  ])('classifica Delta-E %s como %s', (distancia, esperado) => {
    expect(classificarConfianca(distancia)).toBe(esperado);
  });
});
