// Testes para scripts/audit-db-frontend-coverage.mjs
//
// O script roda main() incondicionalmente no top-level (sem guarda de
// `import.meta.url === ...`), então não pode ser importado diretamente em
// testes sem disparar toda a execução. Por isso o script é copiado para um
// repositório fixture em /tmp e executado como subprocesso (mesmo padrão de
// tests/scripts/fuzz-testing.test.mjs), com um `psql` stub no PATH para
// controlar a saída do "BD interno" sem precisar de um Postgres real.
//
// Cobre dois bugs reais encontrados por fuzzing manual (ver PR):
//   1. Linha vazia/malformada na saída do psql (`out.trim().split("\n")`
//      produz "" quando a saída é vazia; uma linha com menos de 4 campos
//      deixa `col`/`table` undefined) -> `camelize(undefined)` lançava
//      TypeError e abortava toda a auditoria sem gerar relatório.
//   2. Nome de tabela/coluna com metacaractere de regex (identificador
//      citado no Postgres, ex.: `"valor("`) interpolado sem escape em
//      `new RegExp(...)` -> SyntaxError: Invalid regular expression,
//      também abortando a auditoria inteira.
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REAL_SCRIPT = resolve(ROOT, 'scripts/audit-db-frontend-coverage.mjs');

const temporaryRoots = [];
afterEach(() => {
  for (const dir of temporaryRoots.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/**
 * Monta um repositório fixture isolado em /tmp:
 *   <fixture>/scripts/audit-db-frontend-coverage.mjs  (cópia do script real)
 *   <fixture>/src/x.ts                                (código mínimo)
 *   <fixture>/bin/psql                                 (stub, se psqlOutput for dado)
 */
function makeFixture({ psqlOutput } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'audit-db-frontend-coverage-'));
  temporaryRoots.push(dir);

  mkdirSync(resolve(dir, 'scripts'), { recursive: true });
  writeFileSync(resolve(dir, 'scripts/audit-db-frontend-coverage.mjs'), readFileSync(REAL_SCRIPT));

  mkdirSync(resolve(dir, 'src'), { recursive: true });
  writeFileSync(
    resolve(dir, 'src/x.ts'),
    "export const q = supabase.from('products').select('id, nome');\n",
  );

  let path = process.env.PATH;
  if (psqlOutput !== undefined) {
    const binDir = resolve(dir, 'bin');
    mkdirSync(binDir, { recursive: true });
    const stubPath = resolve(binDir, 'psql');
    writeFileSync(stubPath, `#!/bin/sh\nprintf '%s' ${shQuote(psqlOutput)}\n`);
    chmodSync(stubPath, 0o755);
    path = `${binDir}:${path}`;
  }

  return { dir, path };
}

function shQuote(str) {
  return `'${str.replace(/'/g, `'\\''`)}'`;
}

function runScript({ dir, path }) {
  return spawnSync(process.execPath, ['scripts/audit-db-frontend-coverage.mjs'], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, PATH: path, PGHOST: '', PGPORT: '', PGUSER: '', PGPASSWORD: '' },
    timeout: 30_000,
  });
}

describe('audit-db-frontend-coverage — robustez contra saída malformada do psql', () => {
  it('não quebra quando a saída do psql está vazia (0 linhas)', () => {
    const fixture = makeFixture({ psqlOutput: '' });
    const result = runScript(fixture);

    expect(result.status).toBe(0);
    expect(result.stderr).not.toMatch(/TypeError/);
    expect(result.stdout).toContain('✅ docs/DB_FRONTEND_COVERAGE.md');

    const json = JSON.parse(readFileSync(resolve(fixture.dir, 'audit/db-frontend-coverage.json'), 'utf8'));
    const interno = json.reports.find((r) => r.label === 'BD Interno (app)');
    expect(interno.tables).toEqual([]);
  });

  it('não quebra com linha truncada (menos campos que o esperado)', () => {
    const fixture = makeFixture({
      psqlOutput: 'onlytable\nprodutos\tid\nprodutos\tnome\ttext\t3\n',
    });
    const result = runScript(fixture);

    expect(result.status).toBe(0);
    expect(result.stderr).not.toMatch(/TypeError/);

    const json = JSON.parse(readFileSync(resolve(fixture.dir, 'audit/db-frontend-coverage.json'), 'utf8'));
    const interno = json.reports.find((r) => r.label === 'BD Interno (app)');
    const produtos = interno.tables.find((t) => t.table === 'produtos');
    expect(produtos).toBeTruthy();
    // "id" (truncada, sem type/rows) e "nome" foram ambas indexadas sem crash.
    expect(produtos.columns.map((c) => c.name).sort()).toEqual(['id', 'nome']);
  });

  it('não quebra com nome de coluna contendo metacaractere de regex ("(")', () => {
    const fixture = makeFixture({
      psqlOutput: 'produtos\tid\tuuid\t5\nprodutos\tvalor(\ttext\t5\n',
    });
    const result = runScript(fixture);

    expect(result.status).toBe(0);
    expect(result.stderr).not.toMatch(/SyntaxError/);
    expect(result.stdout).toContain('✅ docs/DB_FRONTEND_COVERAGE.md');

    const json = JSON.parse(readFileSync(resolve(fixture.dir, 'audit/db-frontend-coverage.json'), 'utf8'));
    const interno = json.reports.find((r) => r.label === 'BD Interno (app)');
    const produtos = interno.tables.find((t) => t.table === 'produtos');
    const col = produtos.columns.find((c) => c.name === 'valor(');
    // Coluna inválida deve ser classificada como ORPHAN (não referenciada no
    // código), não travar a regex de detecção de uso.
    expect(col.status).toBe('ORPHAN');
  });

  it('caminho feliz: continua funcionando com saída válida do psql', () => {
    const fixture = makeFixture({
      psqlOutput: 'produtos\tid\tuuid\t5\nprodutos\tnome\ttext\t5\n',
    });
    const result = runScript(fixture);

    expect(result.status).toBe(0);
    const json = JSON.parse(readFileSync(resolve(fixture.dir, 'audit/db-frontend-coverage.json'), 'utf8'));
    const interno = json.reports.find((r) => r.label === 'BD Interno (app)');
    const produtos = interno.tables.find((t) => t.table === 'produtos');
    const nome = produtos.columns.find((c) => c.name === 'nome');
    expect(nome.status).toBe('READ'); // src/x.ts faz .select('id, nome')
  });
});

describe('audit-db-frontend-coverage — varredura em Node sem ripgrep (revisão 12/11)', () => {
  function withFakeRg(fixture, exitCode) {
    const binDir = resolve(fixture.dir, 'fakebin');
    mkdirSync(binDir, { recursive: true });
    writeFileSync(resolve(binDir, 'rg'), `#!/bin/sh\nexit ${exitCode}\n`);
    chmodSync(resolve(binDir, 'rg'), 0o755);
    return { ...fixture, path: `${binDir}:${fixture.path}` };
  }
  const psql = 'produtos\tid\tuuid\t5\nprodutos\tnome\ttext\t5\nprodutos\tfantasma\ttext\t5\n';

  it('rg ausente (127): lista os fontes em Node e pula node_modules/dist/.next', () => {
    const fx = withFakeRg(makeFixture({ psqlOutput: psql }), 127);
    for (const d of ['node_modules/pkg', 'dist', '.next']) {
      mkdirSync(resolve(fx.dir, 'src', d), { recursive: true });
      writeFileSync(resolve(fx.dir, 'src', d, 'y.ts'), "supabase.from('produtos').select('fantasma');\n");
    }
    const result = runScript(fx);
    expect(result.status).toBe(0);
    const json = JSON.parse(readFileSync(resolve(fx.dir, 'audit/db-frontend-coverage.json'), 'utf8'));
    const cols = json.reports.find((r) => r.label === 'BD Interno (app)').tables.find((t) => t.table === 'produtos').columns;
    expect(cols.find((c) => c.name === 'nome').status).toBe('READ'); // src/x.ts foi lido pela varredura
    expect(cols.find((c) => c.name === 'fantasma').status).toBe('ORPHAN'); // diretórios pulados
  });

  it('rg com status 1 (nada casou) = lista vazia, sem cair na varredura', () => {
    const fx = withFakeRg(makeFixture({ psqlOutput: psql }), 1);
    const result = runScript(fx);
    expect(result.status).toBe(0);
    const json = JSON.parse(readFileSync(resolve(fx.dir, 'audit/db-frontend-coverage.json'), 'utf8'));
    const cols = json.reports.find((r) => r.label === 'BD Interno (app)').tables.find((t) => t.table === 'produtos').columns;
    expect(cols.find((c) => c.name === 'nome').status).toBe('ORPHAN');
  });
});

describe('audit-db-frontend-coverage — rg falha de verdade (A1, reforço 12/11)', () => {
  const psql = 'produtos\tid\tuuid\t5\nprodutos\tnome\ttext\t5\n';
  function withBrokenRg(fixture, exitCode, stderrLine) {
    const binDir = resolve(fixture.dir, 'brokenbin');
    mkdirSync(binDir, { recursive: true });
    writeFileSync(resolve(binDir, 'rg'), `#!/bin/sh\necho ${shQuote(stderrLine)} >&2\nexit ${exitCode}\n`);
    chmodSync(resolve(binDir, 'rg'), 0o755);
    return { ...fixture, path: `${binDir}:${fixture.path}` };
  }
  const readCols = (dir) =>
    JSON.parse(readFileSync(resolve(dir, 'audit/db-frontend-coverage.json'), 'utf8'))
      .reports.find((r) => r.label === 'BD Interno (app)')
      .tables.find((t) => t.table === 'produtos').columns;

  it('rg com status 2 (erro real, não ENOENT/127): emite warn com status+stderr e usa a varredura em Node', () => {
    const fx = withBrokenRg(makeFixture({ psqlOutput: psql }), 2, 'rg: regex parse error');
    const result = runScript(fx);
    expect(result.status).toBe(0);
    expect(result.stderr).toMatch(/rg falhou \(status 2\); usando varredura em Node: rg: regex parse error/);
    expect(readCols(fx.dir).find((c) => c.name === 'nome').status).toBe('READ'); // fallback leu src/x.ts
  });

  it('rg ausente (127) usa a varredura em Node SEM warn (ausência é esperada no runner)', () => {
    const fx = withBrokenRg(makeFixture({ psqlOutput: psql }), 127, 'rg: not found');
    const result = runScript(fx);
    expect(result.status).toBe(0);
    expect(result.stderr).not.toMatch(/rg falhou/);
    expect(readCols(fx.dir).find((c) => c.name === 'nome').status).toBe('READ');
  });
});
