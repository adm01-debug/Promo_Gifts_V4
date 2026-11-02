// Contrato de scripts/inventario/gerar-repo.mjs: inventario das edge functions do repositorio
// (segredos lidos, quem chama cada uma, e sobretudo `sem_chamador` — a metrica mais citada no
// README do inventario). O script nao exporta nenhuma funcao pura e roda o corpo inteiro no
// top-level (sem guarda `if (import.meta.url === ...) main()` como gerar-rotas.mjs), por isso
// o teste roda o ARQUIVO REAL como subprocesso contra um sandbox descartavel (mkdtempSync) e
// confere o inventario/estado/edges.json gerado — nunca mexe no repo real nem no proprio script.
//
// Precisa de `rg` (ripgrep) no PATH, igual ao script em producao (ele aborta sem isso).
import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT_SRC = join(ROOT, 'scripts/inventario/gerar-repo.mjs');
const ROTAS_SRC = join(ROOT, 'scripts/inventario/gerar-rotas.mjs');

const sandboxes = [];
afterEach(() => {
  for (const dir of sandboxes.splice(0)) rmSync(dir, { recursive: true, force: true });
});

// Sandbox minimo com a mesma forma relativa que o script espera: scripts/inventario/gerar-repo.mjs
// (copiado do arquivo REAL, nunca editado) + sua unica dependencia local (gerar-rotas.mjs), pra
// RAIZ (duas pastas acima do proprio script) cair exatamente na raiz do sandbox.
function novoSandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'inv-repo-'));
  sandboxes.push(dir);
  mkdirSync(join(dir, 'scripts/inventario'), { recursive: true });
  cpSync(SCRIPT_SRC, join(dir, 'scripts/inventario/gerar-repo.mjs'));
  cpSync(ROTAS_SRC, join(dir, 'scripts/inventario/gerar-rotas.mjs'));
  return dir;
}

function arquivo(dir, caminhoRelativo, conteudo) {
  const p = join(dir, caminhoRelativo);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, conteudo);
}

function edge(dir, nome, codigo) {
  arquivo(dir, `supabase/functions/${nome}/index.ts`, codigo);
}

function bancoComCron(dir, jobs) {
  arquivo(dir, 'inventario/estado/banco.json', JSON.stringify({ cron: { jobs } }));
}

function rodar(dir) {
  const stdout = execFileSync('node', [join(dir, 'scripts/inventario/gerar-repo.mjs')], {
    cwd: dir,
    encoding: 'utf8',
  });
  const edges = JSON.parse(readFileSync(join(dir, 'inventario/estado/edges.json'), 'utf8'));
  return { stdout, edges };
}

describe('chamadasEdge — deteccao de chamador no codigo (via gerar-rotas.mjs:edgesChamadasNoCodigo)', () => {
  it('conta chamada via .invoke() com nome literal, no src', () => {
    const dir = novoSandbox();
    edge(dir, 'chamada-literal', "export default () => new Response('ok');");
    arquivo(dir, 'src/hooks/useX.ts', "await supabase.functions.invoke('chamada-literal');\n");

    const { edges } = rodar(dir);

    expect(edges.edge_functions['chamada-literal'].chamada_em.src).toBe(1);
    expect(edges.edge_functions['chamada-literal'].sem_chamador).toBe(false);
  });

  it("conta chamada via variavel (const NOME = 'x'; invoke(NOME)), no src", () => {
    const dir = novoSandbox();
    edge(dir, 'chamada-variavel', "export default () => new Response('ok');");
    arquivo(
      dir,
      'src/hooks/useY.ts',
      "const NOME_EDGE = 'chamada-variavel';\nawait supabase.functions.invoke(NOME_EDGE);\n",
    );

    const { edges } = rodar(dir);

    expect(edges.edge_functions['chamada-variavel'].chamada_em.src).toBe(1);
    expect(edges.edge_functions['chamada-variavel'].sem_chamador).toBe(false);
  });

  it('conta chamada via cron (banco.json -> cron.jobs[].edges), mesmo sem nenhuma chamada no src', () => {
    const dir = novoSandbox();
    edge(dir, 'chamada-via-cron', "export default () => new Response('ok');");
    bancoComCron(dir, [{ nome: 'job-noturno', edges: ['chamada-via-cron'] }]);

    const { edges } = rodar(dir);

    expect(edges.edge_functions['chamada-via-cron'].chamada_em.src).toBe(0);
    expect(edges.edge_functions['chamada-via-cron'].chamada_em.cron).toEqual(['job-noturno']);
    expect(edges.edge_functions['chamada-via-cron'].sem_chamador).toBe(false);
  });

  it('conta chamada feita de dentro de OUTRA edge function (outras_edges), nunca como chamada propria', () => {
    const dir = novoSandbox();
    edge(dir, 'chamada-por-outra-edge', "export default () => new Response('ok');");
    edge(dir, 'orquestradora', "await supabase.functions.invoke('chamada-por-outra-edge');\n");

    const { edges } = rodar(dir);

    expect(edges.edge_functions['chamada-por-outra-edge'].chamada_em.outras_edges).toBe(1);
    expect(edges.edge_functions['chamada-por-outra-edge'].sem_chamador).toBe(false);
    // a propria orquestradora nao chama a si mesma
    expect(edges.edge_functions['orquestradora'].chamada_em.outras_edges).toBe(0);
  });

  it('ignora teste (.test./.spec./__tests__) como chamador: arquivo de teste nao conta como uso real', () => {
    const dir = novoSandbox();
    edge(dir, 'so-chamada-em-teste', "export default () => new Response('ok');");
    arquivo(dir, 'src/hooks/useZ.test.ts', "await supabase.functions.invoke('so-chamada-em-teste');\n");

    const { edges } = rodar(dir);

    expect(edges.edge_functions['so-chamada-em-teste'].chamada_em.src).toBe(0);
    expect(edges.edge_functions['so-chamada-em-teste'].sem_chamador).toBe(true);
  });
});

describe('segredosDaEdge — segredos lidos (Deno.env.get, resolver de credenciais, import local)', () => {
  it('conta Deno.env.get direto na propria edge', () => {
    const dir = novoSandbox();
    edge(dir, 'com-segredo-direto', "const k = Deno.env.get('MY_SECRET_KEY');\n");

    const { edges } = rodar(dir);

    expect(edges.edge_functions['com-segredo-direto'].segredos_lidos).toEqual(['MY_SECRET_KEY']);
  });

  it('conta segredo lido via resolveCredential/getCredential (_shared/credentials.ts)', () => {
    const dir = novoSandbox();
    edge(
      dir,
      'com-resolver',
      "import { resolveCredential } from '../_shared/credentials.ts';\nconst k = resolveCredential('RESOLVER_SECRET');\n",
    );
    arquivo(dir, 'supabase/functions/_shared/credentials.ts', "export function resolveCredential(n) { return Deno.env.get(n); }\n");

    const { edges } = rodar(dir);

    expect(edges.edge_functions['com-resolver'].segredos_lidos).toEqual(['RESOLVER_SECRET']);
  });

  it('NAO conta exemplo de Deno.env.get dentro de linha de comentario', () => {
    const dir = novoSandbox();
    edge(dir, 'comentario-nao-conta', "// Exemplo: Deno.env.get('NAO_DEVERIA_CONTAR')\nconst ok = true;\n");

    const { edges } = rodar(dir);

    expect(edges.edge_functions['comentario-nao-conta'].segredos_lidos).toEqual([]);
  });

  it('segue import local (./helper.ts) e conta segredo lido dentro do modulo importado', () => {
    const dir = novoSandbox();
    edge(dir, 'via-import-local', "import { lerSegredo } from './helper.ts';\nlerSegredo();\n");
    arquivo(dir, 'supabase/functions/via-import-local/helper.ts', "export const lerSegredo = () => Deno.env.get('SEGREDO_IMPORTADO');\n");

    const { edges } = rodar(dir);

    expect(edges.edge_functions['via-import-local'].segredos_lidos).toEqual(['SEGREDO_IMPORTADO']);
  });

  it('edge sem nenhum Deno.env.get nem resolver fica com segredos_lidos vazio', () => {
    const dir = novoSandbox();
    edge(dir, 'sem-segredo', "export default () => new Response('ok');\n");

    const { edges } = rodar(dir);

    expect(edges.edge_functions['sem-segredo'].segredos_lidos).toEqual([]);
  });
});

describe('sem_chamador — a metrica mais citada do inventario', () => {
  it('edge sem NENHUMA chamada (src, migrations, outras edges ou cron) fica sem_chamador: true e entra na lista agregada', () => {
    const dir = novoSandbox();
    edge(dir, 'ninguem-chama', "export default () => new Response('ok');\n");

    const { edges, stdout } = rodar(dir);

    expect(edges.edge_functions['ninguem-chama'].sem_chamador).toBe(true);
    expect(edges.sem_chamador).toEqual(['ninguem-chama']);
    expect(edges.total).toBe(1);
    expect(stdout).toMatch(/sem chamador \(src\/migrations\/edges\/cron\): 1/);
  });

  it('edge chamada (de qualquer origem) fica sem_chamador: false e sai da lista agregada', () => {
    const dir = novoSandbox();
    edge(dir, 'chamada-ok', "export default () => new Response('ok');\n");
    arquivo(dir, 'src/hooks/useOk.ts', "await supabase.functions.invoke('chamada-ok');\n");

    const { edges, stdout } = rodar(dir);

    expect(edges.edge_functions['chamada-ok'].sem_chamador).toBe(false);
    expect(edges.sem_chamador).toEqual([]);
    expect(stdout).toMatch(/sem chamador \(src\/migrations\/edges\/cron\): 0/);
  });

  it('mistura: 1 edge chamada + 1 sem chamador no mesmo repo — cada uma com o valor certo, sem contaminar a outra', () => {
    const dir = novoSandbox();
    edge(dir, 'tem-chamador', "export default () => new Response('ok');\n");
    edge(dir, 'orfa', "export default () => new Response('ok');\n");
    arquivo(dir, 'src/hooks/useAmbas.ts', "await supabase.functions.invoke('tem-chamador');\n");

    const { edges } = rodar(dir);

    expect(edges.edge_functions['tem-chamador'].sem_chamador).toBe(false);
    expect(edges.edge_functions['orfa'].sem_chamador).toBe(true);
    expect(edges.sem_chamador).toEqual(['orfa']);
    expect(edges.total).toBe(2);
  });
});
