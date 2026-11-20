#!/usr/bin/env node
/**
 * Gerador do seed das caixas de transporte (etapa 29 do plano de frete).
 *
 * Lê um CSV (padrão: scripts/freight/caixas.csv) e ESCREVE o texto SQL de uma
 * migration só de dados para public.shipping_boxes e, se pedido, o rollback
 * dela. Este script não abre conexão com banco nenhum: o SQL gerado entra em
 * supabase/migrations/ por PR e chega à produção só pelo workflow
 * db-apply-migration.yml (AGENTS.md, seção "Banco, migrations e edge functions").
 *
 * As validações repetem os CHECKs de
 * supabase/migrations/20261119213000_create_shipping_boxes.sql, para o erro
 * aparecer aqui, com o número da linha do CSV, e não no meio da aplicação.
 *
 * Uso:
 *   node scripts/freight/seed-shipping-boxes.mjs [--csv <arquivo>] --out <arquivo.sql>
 *     [--version <14 dígitos>] [--rollback-out <arquivo.sql>]
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export const CSV_PADRAO = 'scripts/freight/caixas.csv';
/** Migration que cria a tabela: o seed só pode rodar depois dela. */
export const VERSAO_DA_TABELA = '20261119213000';
/** Colunas que a aplicação grava, na ordem da tabela. As inner_*_cm são geradas. */
export const COLUNAS = [
  'code',
  'name',
  'outer_height_cm',
  'outer_width_cm',
  'outer_length_cm',
  'wall_thickness_mm',
  'empty_weight_g',
  'max_weight_g',
  'fill_factor',
  'is_active',
  'sort_order',
];

const COLUNAS_GERADAS = ['inner_height_cm', 'inner_width_cm', 'inner_length_cm'];
const COLUNAS_DE_TEXTO = ['code', 'name'];
const MEDIDAS = ['outer_height_cm', 'outer_width_cm', 'outer_length_cm'];
// `code` e `name` são text livre no banco; a regra é a do formulário do admin
// (shippingBoxFormSchema.ts), para a caixa semeada continuar editável por lá.
const CODIGO = /^[A-Z0-9]{1,6}$/;
const NOME_MAX = 80;
const MEDIDA = /^(\d{1,6})(?:\.(\d{1,2}))?$/; // numeric(8,2)
const FATOR = /^(\d)(?:\.(\d{1,2}))?$/; // numeric(3,2)
const MAX_INT4 = 2_147_483_647;

const USO = `Uso: node scripts/freight/seed-shipping-boxes.mjs [--csv <arquivo>] --out <arquivo.sql>
         [--version <14 dígitos>] [--rollback-out <arquivo.sql>]

  --csv           CSV das caixas (padrão: ${CSV_PADRAO})
  --out           onde escrever o SQL da migration (ex.: <versão>_seed_shipping_boxes.sql)
  --version       versão da migration, AAAAMMDDHHMMSS em UTC; se faltar, sai do nome de --out
  --rollback-out  onde escrever o rollback; o nome tem de ser <versão>_rollback.sql

Só escreve arquivo. Nunca grava no banco.`;

const temControle = (texto) =>
  [...texto].some((c) => c.codePointAt(0) < 32 || c.codePointAt(0) === 127);

function separarCampos(texto, linha) {
  const campos = [];
  let atual = '';
  let entreAspas = false;
  for (let i = 0; i < texto.length; i += 1) {
    const c = texto[i];
    if (entreAspas) {
      if (c !== '"') atual += c;
      else if (texto[i + 1] === '"') {
        atual += '"';
        i += 1;
      } else entreAspas = false;
    } else if (c === '"' && atual.trim() === '') {
      atual = '';
      entreAspas = true;
    } else if (c === ',') {
      campos.push(atual);
      atual = '';
    } else atual += c;
  }
  if (entreAspas) throw new Error(`linha ${linha}: aspas duplas abertas e não fechadas.`);
  campos.push(atual);
  return campos.map((campo) => campo.trim());
}

function conferirCabecalho(colunas, linha) {
  const problemas = [];
  const lista = (nomes) => nomes.join(', ');
  const geradas = colunas.filter((c) => COLUNAS_GERADAS.includes(c));
  const estranhas = colunas.filter((c) => !COLUNAS.includes(c) && !COLUNAS_GERADAS.includes(c));
  const repetidas = colunas.filter((c, i) => colunas.indexOf(c) !== i);
  const faltando = COLUNAS.filter((c) => !colunas.includes(c));
  if (geradas.length)
    problemas.push(`coluna gerada pelo banco não entra no CSV: ${lista(geradas)}`);
  if (estranhas.length) problemas.push(`coluna desconhecida: ${lista(estranhas)}`);
  if (repetidas.length) problemas.push(`coluna repetida: ${lista(repetidas)}`);
  if (faltando.length) problemas.push(`coluna faltando: ${lista(faltando)}`);
  if (problemas.length) throw new Error(`linha ${linha} (cabeçalho): ${problemas.join('; ')}.`);
  return colunas;
}

/**
 * Lê o texto do CSV e devolve `[{ linha, valores }]`, com `linha` contada a
 * partir de 1 no arquivo (o cabeçalho é a primeira linha não vazia). Não valida
 * os valores — isso é de `validarCaixas`.
 */
export function parseCsv(texto) {
  let colunas = null;
  const registros = [];
  const semBom = texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto;
  for (const [indice, bruta] of semBom.split(/\r?\n/).entries()) {
    if (bruta.trim() === '') continue;
    const linha = indice + 1;
    const campos = separarCampos(bruta, linha);
    if (!colunas) {
      colunas = conferirCabecalho(campos, linha);
      continue;
    }
    if (campos.length !== colunas.length)
      throw new Error(
        `linha ${linha}: ${campos.length} campo(s), o cabeçalho tem ${colunas.length}. Texto com vírgula vai entre aspas duplas.`,
      );
    registros.push({ linha, valores: Object.fromEntries(colunas.map((c, i) => [c, campos[i]])) });
  }
  if (!colunas) throw new Error('CSV vazio: falta a linha de cabeçalho.');
  return registros;
}

/** Inteiro que cabe em `integer` do Postgres, ou null. */
const inteiro = (texto) =>
  /^-?\d+$/.test(texto) && Math.abs(Number(texto)) <= MAX_INT4 ? Number(texto) + 0 : null;

/** Decimal com até 2 casas → centésimos inteiros (sem ponto flutuante), ou null. */
function centesimos(texto, padrao) {
  const m = padrao.exec(texto);
  return m ? Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0')) : null;
}

const decimal = (cent) => `${Math.trunc(cent / 100)}.${String(cent % 100).padStart(2, '0')}`;

function validarCaixa(v, erro) {
  if (!CODIGO.test(v.code))
    erro('code', `"${v.code}" inválido: de 1 a 6 caracteres, letras maiúsculas de A a Z e números`);
  if (v.name === '' || v.name.length > NOME_MAX || temControle(v.name))
    erro('name', `nome obrigatório, com até ${NOME_MAX} caracteres e sem caractere de controle`);

  const parede = inteiro(v.wall_thickness_mm);
  const paredeOk = parede !== null && parede >= 1 && parede <= 20;
  if (!paredeOk)
    erro('wall_thickness_mm', `"${v.wall_thickness_mm}" inválido: inteiro de 1 a 20 (mm)`);

  const externas = {};
  for (const coluna of MEDIDAS) {
    const cent = centesimos(v[coluna], MEDIDA);
    if (cent === null || cent <= 0) {
      erro(
        coluna,
        `"${v[coluna]}" inválido: medida em cm maior que zero, com ponto decimal e até 2 casas (ex.: 27 ou 26.5)`,
      );
      continue;
    }
    externas[coluna] = decimal(cent);
    // interna = externa − 2 × parede. Em centésimos de cm, 1 mm vale 10: 2 paredes = parede × 20.
    if (paredeOk && cent - parede * 20 <= 0)
      erro(
        coluna,
        `${decimal(cent)} cm não deixa medida interna: com parede de ${parede} mm a externa tem de ser maior que ${decimal(parede * 20)} cm`,
      );
  }

  const vazio = inteiro(v.empty_weight_g);
  if (vazio === null || vazio < 0)
    erro('empty_weight_g', `"${v.empty_weight_g}" inválido: inteiro em gramas, zero ou mais`);
  const maximo = inteiro(v.max_weight_g);
  if (maximo === null) erro('max_weight_g', `"${v.max_weight_g}" inválido: inteiro em gramas`);
  else if (vazio !== null && vazio >= 0 && maximo <= vazio)
    erro('max_weight_g', `${maximo} g tem de ser maior que o peso da caixa vazia (${vazio} g)`);

  const fator = centesimos(v.fill_factor, FATOR);
  const fatorOk = fator !== null && fator >= 50 && fator <= 100;
  if (!fatorOk)
    erro(
      'fill_factor',
      `"${v.fill_factor}" inválido: de 0.50 a 1.00, com ponto decimal e até 2 casas`,
    );
  if (v.is_active !== 'true' && v.is_active !== 'false')
    erro('is_active', `"${v.is_active}" inválido: use true ou false`);
  const ordem = inteiro(v.sort_order);
  if (ordem === null) erro('sort_order', `"${v.sort_order}" inválido: use um número inteiro`);

  return {
    code: v.code,
    name: v.name,
    ...externas,
    wall_thickness_mm: parede,
    empty_weight_g: vazio,
    max_weight_g: maximo,
    fill_factor: fatorOk ? decimal(fator) : null,
    is_active: v.is_active === 'true',
    sort_order: ordem,
  };
}

/**
 * Valida o retorno de `parseCsv` e devolve as caixas prontas para `gerarSql`
 * (medidas e fator como texto com 2 casas, para não passar por ponto flutuante).
 * Junta todos os problemas num erro só, um por linha, cada um com a linha do CSV.
 */
export function validarCaixas(registros) {
  const erros = [];
  const caixas = [];
  const linhaDoCodigo = new Map();
  if (registros.length === 0) erros.push('nenhuma caixa: o CSV só tem o cabeçalho.');
  for (const { linha, valores } of registros) {
    const antes = erros.length;
    const caixa = validarCaixa(valores, (campo, motivo) =>
      erros.push(`linha ${linha}: ${campo} — ${motivo}.`),
    );
    if (!CODIGO.test(caixa.code)) continue;
    if (linhaDoCodigo.has(caixa.code))
      erros.push(
        `linha ${linha}: code — "${caixa.code}" repetido (já está na linha ${linhaDoCodigo.get(caixa.code)}).`,
      );
    else linhaDoCodigo.set(caixa.code, linha);
    if (erros.length === antes) caixas.push(caixa);
  }
  if (erros.length) throw new Error(erros.join('\n'));
  return caixas;
}

/** Literal de texto SQL: aspa simples dobrada (standard_conforming_strings = on, padrão do Postgres). */
export const escaparTexto = (texto) => `'${texto.replaceAll("'", "''")}'`;

function conferirVersao(version) {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(String(version ?? ''));
  const [ano, mes, dia, hora, minuto, segundo] = m ? m.slice(1).map(Number) : [];
  const data = m ? new Date(Date.UTC(ano, mes - 1, dia, hora, minuto, segundo)) : null;
  if (!data || data.toISOString().replace(/\D/g, '').slice(0, 14) !== version)
    throw new Error(
      `versão "${version}" inválida: use 14 dígitos AAAAMMDDHHMMSS (UTC) de uma data e hora reais.`,
    );
  if (version <= VERSAO_DA_TABELA)
    throw new Error(
      `versão ${version} tem de ser maior que ${VERSAO_DA_TABELA}, a migration que cria public.shipping_boxes.`,
    );
}

function conferirEntrada(caixas, version, rotulo) {
  conferirVersao(version);
  if (!Array.isArray(caixas) || caixas.length === 0)
    throw new Error('nenhuma caixa para gerar o SQL.');
  if (temControle(rotulo))
    throw new Error(
      `"${rotulo}" tem caractere de controle e não pode ir para o comentário do SQL.`,
    );
}

/**
 * Id fixo da caixa do seed: UUID versão 8 (RFC 9562) tirado dos 16 primeiros bytes do sha256 de
 * "shipping_boxes:<code>". Mesmo código, mesmo id: é por ele que o rollback acha a linha do seed.
 */
export function idDaCaixa(code) {
  const bytes = createHash('sha256').update(`shipping_boxes:${code}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x80; // versão 8: o 13º dígito hexadecimal vira 8
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC: o 17º dígito fica entre 8 e b
  return bytes.toString('hex').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
}

const tupla = (caixa) =>
  `(${[`'${idDaCaixa(caixa.code)}'`, ...COLUNAS.map((c) => (COLUNAS_DE_TEXTO.includes(c) ? escaparTexto(caixa[c]) : String(caixa[c])))].join(', ')})`;

const listaDeColunas = (recuo) =>
  [['id', ...COLUNAS.slice(0, 5)], COLUNAS.slice(5, 9), COLUNAS.slice(9)]
    .map((grupo) => grupo.join(', '))
    .join(`,\n${recuo}`);

/** SQL da migration de seed. `caixas` é o retorno de `validarCaixas`. */
export function gerarSql(caixas, { version, origemCsv = CSV_PADRAO } = {}) {
  conferirEntrada(caixas, version, origemCsv);
  return [
    `-- Rollback: supabase/rollbacks/${version}_rollback.sql`,
    '--',
    '-- Migration SÓ DE DADOS: cadastra em public.shipping_boxes as caixas de',
    `-- transporte padrão da empresa (${caixas.map((c) => c.code).join(', ')}).`,
    '--',
    '-- GERADA por scripts/freight/seed-shipping-boxes.mjs a partir de',
    `-- ${origemCsv}. Não edite à mão: corrija o CSV e gere de novo.`,
    '--',
    '-- Cada caixa entra com id FIXO, calculado pelo gerador a partir do código',
    '-- (UUID versão 8 tirado do sha256 de "shipping_boxes:<code>"): é por ele que o',
    '-- rollback reconhece a linha que veio daqui. O trigger guard_shipping_boxes_row',
    '-- (20261120030000) mantém o id enviado: a migration roda sem usuário logado.',
    '--',
    '-- Idempotente. O ON CONFLICT sem alvo vale para a chave primária (id) e para o',
    '-- índice único parcial de code (WHERE deleted_at IS NULL). Efeito:',
    '--   - código que já tem caixa viva: nada é inserido nem sobrescrito (o que',
    '--     o admin cadastrou ou editou fica como está);',
    '--   - caixa deste seed que continua na tabela (mesmo id), mesmo editada ou',
    '--     excluída pelo admin: nada é inserido;',
    '--   - nos outros casos a caixa é criada.',
    '--',
    '-- As colunas inner_*_cm ficam de fora: são geradas (externa − 2 × parede).',
    `-- Depende da migration ${VERSAO_DA_TABELA}, que cria a tabela.`,
    '',
    'INSERT INTO public.shipping_boxes',
    `  (${listaDeColunas('   ')})`,
    'VALUES',
    caixas.map((c) => `  ${tupla(c)}`).join(',\n'),
    'ON CONFLICT DO NOTHING;',
    '',
  ].join('\n');
}

/**
 * SQL do rollback do seed: um bloco só, que copia a tabela e apaga as caixas vivas que têm o id do
 * seed e continuam idênticas a ele. `migration` é o nome do arquivo da migration, sem `.sql`.
 */
export function gerarRollbackSql(
  caixas,
  { version, migration = `${version}_seed_shipping_boxes` } = {},
) {
  conferirEntrada(caixas, version, migration);
  // Os valores vão dentro do bloco DO $seed$: a marca num nome fecharia o bloco antes da hora.
  const comMarca = caixas.find((c) => c.name.includes('$seed$'));
  if (comMarca) throw new Error(`caixa ${comMarca.code}: o nome não pode conter $seed$.`);
  return [
    `-- Rollback: ${migration}`,
    '--',
    `-- Desfaz o seed das caixas de transporte (${caixas.map((c) => c.code).join(', ')}). GERADO por`,
    '-- scripts/freight/seed-shipping-boxes.mjs junto com a migration, com os mesmos',
    '-- ids e valores do INSERT dela. Não edite à mão: gere de novo.',
    '--',
    '-- Apaga SÓ a linha que tem o id do seed E continua viva e IDÊNTICA ao seed em',
    '-- todas as colunas gravadas. Ficam de propósito:',
    '--   - a caixa cadastrada antes do seed, mesmo com valores iguais (outro id);',
    '--   - a caixa do seed que o admin editou (qualquer coluna diferente);',
    '--   - a caixa do seed que o admin excluiu (deleted_at preenchido).',
    '--',
    '-- Efeito no negócio: sem caixa ativa, todo plano de frete (src/lib/freight)',
    '-- sai como "nao_cabe: nenhuma caixa ativa cadastrada" até alguém recadastrar.',
    '--',
    '-- Antes de apagar, copia shipping_boxes para _backup_shipping_boxes_YYYYMMDD',
    '-- (CONTRIBUTING.md; data em UTC), com RLS ligada e sem acesso de',
    '-- anon/authenticated. Se o backup do dia já existe, usa o primeiro nome livre',
    '-- (_YYYYMMDD_2, depois _3, ...): cada execução tem o seu backup. Cópia,',
    '-- conferência da contagem e DELETE ficam no mesmo bloco, com a tabela travada',
    '-- para escrita: se um passo falhar, nada fica.',
    '--',
    `-- Rodar ANTES do rollback ${VERSAO_DA_TABELA}, que derruba a tabela. Sem a`,
    '-- tabela, avisa e termina sem erro.',
    '',
    'DO $seed$',
    'DECLARE',
    "  dia text := '_backup_shipping_boxes_' || to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDD');",
    '  b text := dia;',
    '  n integer := 1;',
    '  linhas_tabela bigint;',
    '  linhas_backup bigint;',
    '  apagadas bigint;',
    'BEGIN',
    "  IF to_regclass('public.shipping_boxes') IS NULL THEN",
    "    RAISE NOTICE 'public.shipping_boxes não existe: nada a desfazer.';",
    '    RETURN;',
    '  END IF;',
    '',
    '  -- Primeiro nome livre do dia: _YYYYMMDD, depois _YYYYMMDD_2, _3, ...',
    "  WHILE to_regclass('public.' || b) IS NOT NULL LOOP",
    '    n := n + 1;',
    "    b := dia || '_' || n;",
    '  END LOOP;',
    '',
    '  -- Ninguém grava entre a cópia e o DELETE; a leitura continua liberada.',
    '  LOCK TABLE public.shipping_boxes IN SHARE ROW EXCLUSIVE MODE;',
    '',
    "  EXECUTE format('CREATE TABLE public.%I AS TABLE public.shipping_boxes', b);",
    "  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', b);",
    "  EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', b);",
    '',
    '  SELECT count(*) INTO linhas_tabela FROM public.shipping_boxes;',
    "  EXECUTE format('SELECT count(*) FROM public.%I', b) INTO linhas_backup;",
    '  IF linhas_backup IS DISTINCT FROM linhas_tabela THEN',
    '    RAISE EXCEPTION',
    "      'Rollback recusado: o backup public.% ficou com % linha(s) e public.shipping_boxes tem %. Nada foi apagado.',",
    '      b, linhas_backup, linhas_tabela;',
    '  END IF;',
    '',
    '  DELETE FROM public.shipping_boxes AS c',
    '   USING (VALUES',
    caixas.map((c) => `      ${tupla(c)}`).join(',\n'),
    `   ) AS s (${listaDeColunas('           ')})`,
    '   WHERE c.id = s.id::uuid',
    '     AND c.deleted_at IS NULL',
    ...COLUNAS.map((c, i) => `     AND c.${c} = s.${c}${i === COLUNAS.length - 1 ? ';' : ''}`),
    '  GET DIAGNOSTICS apagadas = ROW_COUNT;',
    "  RAISE NOTICE '% caixa(s) do seed apagada(s). Backup em public.% (% linha(s)).', apagadas, b, linhas_backup;",
    'END $seed$;',
    '',
  ].join('\n');
}

function lerOpcoes(argv) {
  const nomes = new Map([
    ['--csv', 'csv'],
    ['--out', 'out'],
    ['--version', 'version'],
    ['--rollback-out', 'rollbackOut'],
  ]);
  const opcoes = { csv: null, out: null, version: null, rollbackOut: null, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      opcoes.help = true;
      continue;
    }
    const chave = nomes.get(arg);
    const valor = argv[i + 1];
    if (!chave) throw new Error(`opção desconhecida: ${arg}`);
    if (valor === undefined || valor.startsWith('--')) throw new Error(`${arg} exige um valor`);
    opcoes[chave] = valor;
    i += 1;
  }
  if (!opcoes.help && !opcoes.out) throw new Error('--out é obrigatório');
  return opcoes;
}

/** Caminho como aparece no comentário do SQL: relativo ao repo, ou só o nome se for de fora. */
function rotuloDoCsv(caminho) {
  const rel = relative(ROOT, caminho);
  return rel.startsWith('..') ? basename(caminho) : rel.split(sep).join('/');
}

function escrever(caminho, conteudo) {
  mkdirSync(dirname(caminho), { recursive: true });
  writeFileSync(caminho, conteudo);
}

/** Roda a CLI e devolve o código de saída: 0 gerou, 1 CSV/versão recusados, 2 uso errado. */
export function executarCli(argv, saida = console) {
  let opcoes;
  try {
    opcoes = lerOpcoes(argv);
  } catch (e) {
    saida.error(`ERRO: ${e.message}\n\n${USO}`);
    return 2;
  }
  if (opcoes.help) {
    saida.log(USO);
    return 0;
  }
  const out = resolve(opcoes.out);
  const rollbackOut = opcoes.rollbackOut ? resolve(opcoes.rollbackOut) : null;
  const versaoDoNome = /^(\d{14})_/.exec(basename(out))?.[1] ?? null;
  const version = opcoes.version ?? versaoDoNome;
  const recusa = !version
    ? 'informe --version ou dê a --out um nome <AAAAMMDDHHMMSS>_<slug>.sql.'
    : versaoDoNome && versaoDoNome !== version
      ? `--version ${version} não bate com a versão do nome de --out (${versaoDoNome}).`
      : rollbackOut && basename(rollbackOut) !== `${version}_rollback.sql`
        ? `--rollback-out tem de se chamar ${version}_rollback.sql (é o nome que o cabeçalho da migration aponta).`
        : null;
  if (recusa) {
    saida.error(`ERRO: ${recusa}`);
    return 1;
  }

  const csv = resolve(opcoes.csv ?? resolve(ROOT, CSV_PADRAO));
  const origemCsv = rotuloDoCsv(csv);
  let caixas;
  try {
    caixas = validarCaixas(parseCsv(readFileSync(csv, 'utf8')));
  } catch (e) {
    saida.error(`ERRO em ${origemCsv}:\n${e.message}`);
    return 1;
  }
  try {
    const sql = gerarSql(caixas, { version, origemCsv });
    const rollback = gerarRollbackSql(caixas, { version, migration: basename(out, '.sql') });
    escrever(out, sql);
    if (rollbackOut) escrever(rollbackOut, rollback);
  } catch (e) {
    saida.error(`ERRO: ${e.message}`);
    return 1;
  }
  saida.log(
    `${caixas.length} caixa(s) de ${origemCsv} (${caixas.map((c) => c.code).join(', ')})\n  migration: ${out}${rollbackOut ? `\n  rollback:  ${rollbackOut}` : ''}\nNada foi gravado no banco: o SQL vai por PR e db-apply-migration.yml.`,
  );
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = executarCli(process.argv.slice(2));
}
