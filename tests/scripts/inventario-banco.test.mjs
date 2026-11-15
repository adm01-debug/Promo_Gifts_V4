// Contrato de scripts/inventario/gerar-banco.mjs (mesmo contrato do Zapp_Web_V2, scripts/ci/inventario-banco.unit.mjs):
// le a resposta do banco.sql (Management API, psql ou MCP), cruza com o uso no codigo e as edges
// publicadas e grava inventario/estado/banco.json com orfas e alertas calculados — nada escrito a mao.
// Aqui so as funcoes puras; o SQL e validado contra o banco real por quem roda o script.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LIMIARES,
  contarUsoNoCodigo,
  extrairFunctions,
  extrairInventario,
  montarInventario,
} from '../../scripts/inventario/gerar-banco.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const tabela = (nome, extra = {}) => ({
  nome, rls: true, rls_forcado: false, policies: 1, triggers: 0, linhas: 0, linhas_exatas: true, bytes: 8192,
  particao: false, particionada: false, citada_no_banco: false, ...extra,
});
const job = (nome, extra = {}) => ({
  nome, agenda: '* * * * *', ativo: true, chama: [], edges: [], execucoes_24h: 0, falhas_24h: 0, execucoes_7d: 100,
  falhas_7d: 0, startup_timeout_7d: 0, statement_timeout_7d: 0, taxa_falha_7d_pct: 0, ultima_falha: null, duracao_max_s_7d: 1, ...extra,
});
const base = () => ({
  format_version: 1,
  medido_em: '2026-11-02T00:00:00Z',
  resumo: { tabelas_public: 5 },
  tabelas: [
    tabela('orfa'),
    tabela('citada', { citada_no_banco: true }),
    tabela('com_linhas', { linhas: 5 }),
    tabela('usada_no_front'),
    tabela('evento_2026_11', { particao: true }),
  ],
  outros_schemas: [{ nome: 'prod_audit.x', rls: true, policies: 0, linhas_estimadas: 0 }],
  cron: { config: {}, jobs: [job('ok')], horas_paradas_7d: [], historico: { linhas: 10, mais_de_7_dias: 0, mais_antigo: null, bytes: 1 } },
});

describe('extrairInventario', () => {
  it('aceita a resposta da Management API, do MCP (texto embrulhado), a linha do psql e o objeto direto', () => {
    const dado = base();
    expect(extrairInventario([{ inventario: dado }]).medido_em).toBe(dado.medido_em);
    expect(extrairInventario({ rows: [{ inventario: dado }] }).tabelas).toHaveLength(5);
    expect(extrairInventario(JSON.stringify(dado) + '\n').tabelas).toHaveLength(5);
    const mcp = JSON.stringify({
      result: `Below is the result...\n<untrusted-data-x>\n${JSON.stringify([{ inventario: dado }])}\n</untrusted-data-x>\nUse this data...`,
    });
    expect(extrairInventario(mcp).tabelas).toHaveLength(5);
  });

  it('recusa entrada incompleta, vazia ou de outra versao', () => {
    expect(() => extrairInventario({ rows: [{ inventario: { format_version: 1 } }] })).toThrow(/sem as chaves/);
    expect(() => extrairInventario({ ...base(), format_version: 2 })).toThrow(/format_version 2/);
    expect(() => extrairInventario({ ...base(), tabelas: [] })).toThrow(/sem tabelas/);
    expect(() => extrairInventario('nao e json')).toThrow();
  });
});

describe('montarInventario', () => {
  it('orfa = 0 linhas, nao citada no banco, sem acesso no codigo e nao e particao', () => {
    const inv = montarInventario(base(), { usada_no_front: { src: 2, edges: 0 } });
    expect(inv.tabelas_orfas.lista).toEqual(['orfa']);
    expect(inv.tabelas.find((t) => t.nome === 'usada_no_front').uso_no_codigo).toEqual({ src: 2, edges: 0 });
  });

  it('sem problema nenhum, nenhum alerta', () => {
    expect(montarInventario(base(), {}).alertas).toEqual([]);
  });

  it('alertas: sem RLS (public e fora), cron falhando, cron parado, historico sem limpeza', () => {
    const dado = base();
    dado.tabelas[2].rls = false;
    dado.outros_schemas[0].rls = false;
    dado.cron.jobs.push(job('ruim', { taxa_falha_7d_pct: LIMIARES.taxaFalhaCronPct }));
    dado.cron.jobs.push(job('ruim-mas-inativo', { ativo: false, taxa_falha_7d_pct: 90 }));
    dado.cron.horas_paradas_7d = [{ hora: '2026-10-31T04:00Z', execucoes: 10, falhas: 9 }];
    dado.cron.historico.mais_de_7_dias = LIMIARES.historicoCronMaisDe7Dias + 1;
    const tipos = Object.fromEntries(montarInventario(dado, {}).alertas.map((a) => [a.tipo, a.detalhe]));
    expect(tipos.tabela_sem_rls).toEqual(['com_linhas']);
    expect(tipos.tabela_sem_rls_fora_de_public).toEqual(['prod_audit.x']);
    expect(tipos.cron_falhando).toEqual([`ruim (${LIMIARES.taxaFalhaCronPct}% em 7d)`]);
    expect(tipos.cron_parado).toEqual(['2026-10-31T04:00Z']);
    expect(tipos.historico_cron_sem_limpeza[0]).toMatch(/linhas com mais de 7 dias/);
  });

  it('edges: publicada sem codigo e codigo sem deploy viram alerta', () => {
    const publicadas = extrairFunctions({ functions: [{ slug: 'a', status: 'ACTIVE', verify_jwt: true, version: 1 }, { slug: 'fantasma', status: 'ACTIVE', verify_jwt: false, version: 3 }] });
    const inv = montarInventario(base(), {}, publicadas, ['a', 'nova']);
    expect(inv.edge_functions.publicadas_sem_codigo_no_repo).toEqual(['fantasma']);
    expect(inv.edge_functions.no_repo_sem_deploy).toEqual(['nova']);
    const tipos = inv.alertas.map((a) => a.tipo);
    expect(tipos).toContain('edge_publicada_sem_codigo_no_repo');
    expect(tipos).toContain('edge_no_repo_sem_deploy');
  });

  it('saida tem chaves ordenadas (diff estavel entre execucoes)', () => {
    const inv = montarInventario(base(), {});
    expect(Object.keys(inv)).toEqual([...Object.keys(inv)].sort());
    expect(Object.keys(inv.tabelas[0])).toEqual([...Object.keys(inv.tabelas[0])].sort());
  });
});

describe('contarUsoNoCodigo', () => {
  it('conta .from, untypedFrom, goldFrom e { table: } em src e edges; ignora storage e testes', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'inv-banco-'));
    try {
      fs.mkdirSync(path.join(dir, 'src/hooks'), { recursive: true });
      fs.mkdirSync(path.join(dir, 'src/__tests__'), { recursive: true });
      fs.mkdirSync(path.join(dir, 'supabase/functions/x'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'src/hooks/a.ts'),
        "supabase.from('produtos').select(); untypedFrom<T>(\"produtos\"); goldFrom(`grupos`);\n"
        + "dbInvoke({ table: 'grupos' }); supabase.storage.from('produtos');");
      fs.writeFileSync(path.join(dir, 'src/__tests__/a.test.ts'), "supabase.from('produtos')");
      fs.writeFileSync(path.join(dir, 'src/hooks/b.test.tsx'), "supabase.from('produtos')");
      fs.writeFileSync(path.join(dir, 'supabase/functions/x/index.ts'), "admin.from( 'produtos' )");
      expect(contarUsoNoCodigo(dir, ['produtos', 'grupos', 'nada'])).toEqual({
        produtos: { src: 2, edges: 1 }, grupos: { src: 2, edges: 0 }, nada: { src: 0, edges: 0 },
      });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('banco.sql', () => {
  const sql = fs.readFileSync(path.join(raiz, 'scripts/inventario/banco.sql'), 'utf8')
    .split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');

  it('so le: nenhum comando de escrita', () => {
    expect(sql).not.toMatch(/\b(INSERT|UPDATE|DELETE|TRUNCATE|DROP|ALTER|CREATE|GRANT|REVOKE)\b/i);
  });

  // Trecho so da CTE "proprios" (do "proprios AS (" ao "),") — isola a clausula de exclusao de
  // schema do resto do arquivo, pra nao confundir literal usado em outro lugar do SQL.
  const proprios = sql.match(/proprios AS \([\s\S]*?\n\),/)?.[0];
  // Schemas de sistema/extensao conhecidos (Postgres, Supabase e extensoes instaladas) — a UNICA
  // lista fixa que pode legitimamente existir na clausula de exclusao. Qualquer coisa fora disso
  // (schema de app) nao pode aparecer aqui, seja como literal direto ou disfarcado.
  const SISTEMA_CONHECIDOS = new Set([
    'public', 'information_schema', 'auth', 'storage', 'realtime', '_realtime',
    'supabase_functions', 'supabase_migrations', 'extensions', 'graphql',
    'graphql_public', 'vault', 'net', 'cron', 'pgsodium', 'pgsodium_masks',
    'pgbouncer', 'repack', 'pgmq',
  ]);
  // Schemas de app reais que precisam vir do catalogo (pg_namespace), nunca de lista fixa no SQL.
  const SCHEMAS_DE_APP = ['cf_recon', 'supplier_stricker', 'prod_audit', 'archive', 'analytics', 'api', 'internal', 'classification_audit'];

  it('schemas proprios vem do catalogo, sem lista fixa (um schema novo como archive entra sozinho)', () => {
    expect(sql).toMatch(/proprios AS \(/);
    expect(proprios, 'CTE proprios nao encontrada no SQL').toBeTruthy();
    expect(sql).not.toMatch(/'cf_recon'|'supplier_stricker'|'prod_audit'/);
    expect((sql.match(/IN \(SELECT nspname FROM proprios\)/g) || []).length).toBeGreaterThanOrEqual(4);
  });

  it("a exclusao de schema nao usa concatenacao/funcao pra esconder um nome (ex.: ('cf_' || 'recon') escaparia de um regex simples de ausencia)", () => {
    expect(proprios).not.toMatch(/\|\|/);
    expect(proprios).not.toMatch(/\bconcat\s*\(/i);
    const listaExclusao = proprios.match(/NOT IN \(([^)]*)\)/s)?.[1];
    expect(listaExclusao, 'lista NOT IN nao encontrada na CTE proprios').toBeTruthy();
    expect(listaExclusao).not.toMatch(/SELECT/i);
  });

  it('todo literal da exclusao de schema e um schema de sistema/extensao conhecido — nenhum schema de app na lista fixa', () => {
    const listaExclusao = proprios.match(/NOT IN \(([^)]*)\)/s)[1];
    const literais = [...listaExclusao.matchAll(/'([^']*)'/g)].map((m) => m[1]);
    expect(literais.length).toBeGreaterThan(0);
    for (const l of literais) {
      expect(SISTEMA_CONHECIDOS.has(l), `literal inesperado na exclusao de schema: '${l}' (nao e schema de sistema/extensao conhecido)`).toBe(true);
    }
    for (const app of SCHEMAS_DE_APP) {
      expect(literais, `schema de app '${app}' nao pode estar na lista fixa de exclusao`).not.toContain(app);
    }
  });

  it('a clausula de exclusao, aplicada a uma lista de candidatos, deixa passar so schema de app — nunca so confere 3 strings ausentes', () => {
    const listaExclusao = proprios.match(/NOT IN \(([^)]*)\)/s)[1];
    const excluidos = new Set([...listaExclusao.matchAll(/'([^']*)'/g)].map((m) => m[1]));
    const candidatos = ['public', 'auth', 'storage', 'pgmq', 'vault', 'pgsodium', ...SCHEMAS_DE_APP, 'nova_feature_2027'];
    const passam = candidatos.filter((c) => !c.startsWith('pg_') && !excluidos.has(c));
    expect(passam.sort()).toEqual([...SCHEMAS_DE_APP, 'nova_feature_2027'].sort());
  });

  // Chamadas jsonb_build_object com parenteses balanceados (ha chamadas aninhadas: subqueries
  // dentro de valores) — nao basta um regex [^)]* que para no primeiro ) interno.
  function chamadasJsonbBuildObject(texto) {
    const chamadas = [];
    const re = /jsonb_build_object\(/g;
    let m;
    while ((m = re.exec(texto))) {
      let profundidade = 1;
      let i = m.index + m[0].length;
      for (; i < texto.length && profundidade > 0; i++) {
        if (texto[i] === '(') profundidade++;
        else if (texto[i] === ')') profundidade--;
      }
      chamadas.push(texto.slice(m.index, i));
    }
    return chamadas;
  }

  it('de cron.job sai so o nome das funcoes/edges chamadas, nunca o command nem return_message (chave fixa)', () => {
    expect(sql).not.toMatch(/'command'|'comando'|'ultimo_erro'/);
    expect(sql).toMatch(/regexp_matches\(j\.command/);
    expect(sql).not.toMatch(/jsonb_build_object\([^)]*return_message/);
  });

  it('j.command e return_message nunca sao valor de jsonb_build_object sob QUALQUER chave (so regexp_matches(j.command,...) para extrair nome, nunca o command bruto)', () => {
    const chamadas = chamadasJsonbBuildObject(sql);
    expect(chamadas.length).toBeGreaterThan(0);
    for (const chamada of chamadas) {
      // regexp_matches(j.command, ...) e a UNICA forma permitida de citar j.command dentro de um
      // jsonb_build_object — e so extrai nomes via regex, nunca expoe o command inteiro. Qualquer
      // outra ocorrencia de j.command (ex.: 'raw_cmd', j.command) e o comando bruto vazando.
      const semExtracoesSeguras = chamada.replace(/regexp_matches\(\s*j\.command\s*,[^)]*\)/g, '');
      expect(semExtracoesSeguras, `j.command vazando como valor bruto em: ${chamada.slice(0, 120)}...`).not.toMatch(/\bj\.command\b/);
      // return_message (cru, pode ter URL/header do erro) nunca pode ser valor de jsonb_build_object,
      // seja qual for a chave usada.
      expect(chamada, `return_message vazando como valor bruto em: ${chamada.slice(0, 120)}...`).not.toMatch(/\.return_message\b/);
    }
  });

  // chamadasJsonbBuildObject + a checagem textual acima so pegam return_message citado DIRETO
  // dentro do jsonb_build_object. Esta checagem rastreia um hop a mais: para cada coluna
  // referenciada como valor (ex.: pj.falhas_7d), acha a definicao dessa coluna em QUALQUER CTE
  // anterior (busca por "AS <coluna>") e garante que o texto que a define nao cite return_message
  // fora de uma comparacao booleana (LIKE/=/IS/~) — ou seja, nenhuma coluna pode ser um
  // passthrough bruto de return_message "lavado" por um alias de CTE antes de chegar ao JSON final.
  it('nenhuma coluna referenciada em jsonb_build_object e um passthrough bruto de return_message vindo de uma CTE anterior (qualquer numero de hops)', () => {
    const chamadas = chamadasJsonbBuildObject(sql);
    const colunasReferenciadas = new Set();
    for (const chamada of chamadas) {
      for (const m of chamada.matchAll(/\b[a-z_][a-z0-9_]*\.([a-z_][a-z0-9_]*)\b/g)) {
        colunasReferenciadas.add(m[1]);
      }
    }
    expect(colunasReferenciadas.size).toBeGreaterThan(0);

    const EM_COMPARACAO = /return_message\s*(?:LIKE|=|IS|~|!~|<>)/i;
    // Rastreia a cadeia de alias por quantos hops de CTE existirem: se a definicao de uma coluna
    // referencia outra coluna (<alias2>.<col2>) em vez de um literal/agregado terminal, segue a
    // cadeia recursivamente ate achar return_message bruto ou esgotar as definicoes. `visitados`
    // evita loop infinito se duas colunas se referenciarem em ciclo.
    function derivaDeReturnMessageBruto(coluna, visitados) {
      if (visitados.has(coluna)) return false;
      visitados.add(coluna);
      const defRe = new RegExp(`AS\\s+${coluna}\\b`, 'g');
      let m;
      while ((m = defRe.exec(sql))) {
        const inicioJanela = Math.max(sql.lastIndexOf(',', m.index), sql.lastIndexOf('SELECT', m.index));
        const definicao = sql.slice(Math.max(inicioJanela, 0), m.index + m[0].length);
        if (/return_message/i.test(definicao) && !EM_COMPARACAO.test(definicao)) return true;
        // lado direito da definicao (sem o "AS <coluna>" final): se referencia outra coluna
        // (em vez de so um literal/agregado), segue a cadeia um hop a mais.
        const ladoDireito = definicao.slice(0, definicao.length - m[0].length);
        for (const ref of ladoDireito.matchAll(/\b[a-z_][a-z0-9_]*\.([a-z_][a-z0-9_]*)\b/g)) {
          if (derivaDeReturnMessageBruto(ref[1], visitados)) return true;
        }
      }
      return false;
    }

    for (const coluna of colunasReferenciadas) {
      expect(
        derivaDeReturnMessageBruto(coluna, new Set()),
        `coluna "${coluna}" parece derivar (direta ou via cadeia de CTEs) de return_message bruto`,
      ).toBe(false);
    }
  });
});
