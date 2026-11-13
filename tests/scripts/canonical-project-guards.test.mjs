/**
 * Regressão dos fail-opens do Gate 0 (validate-supabase-config) e do guard canônico:
 * o ID canônico em comentário / em qualquer lugar do arquivo passava como válido, e
 * um erro de leitura em supabase/migrations descartava o resto da varredura E064.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '../..');
const CANON = 'doufsxqlfjyuvxuezpln';
const LEGACY = 'pqpdolkaeqlyzpdpbizo';
const sandboxes = [];

/** Mini-repo com só o necessário para os dois scripts. */
function sandbox({ client, toml, migrations = { '20260101000000_ok.sql': 'select 1;' }, snapshot = true }) {
  const dir = mkdtempSync(join(tmpdir(), 'canon-guard-'));
  sandboxes.push(dir);
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  cpSync(join(ROOT, 'scripts/validate-supabase-config.mjs'), join(dir, 'scripts/validate-supabase-config.mjs'));
  cpSync(join(ROOT, 'scripts/guard-canonical-project.mjs'), join(dir, 'scripts/guard-canonical-project.mjs'));
  mkdirSync(join(dir, 'src/integrations/supabase'), { recursive: true });
  writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
  if (client !== null) writeFileSync(join(dir, 'src/integrations/supabase/client.ts'), client);
  mkdirSync(join(dir, 'supabase/migrations'), { recursive: true });
  mkdirSync(join(dir, 'supabase/migrations-snapshot'), { recursive: true });
  if (toml !== null) writeFileSync(join(dir, 'supabase/config.toml'), toml);
  for (const [name, body] of Object.entries(migrations)) writeFileSync(join(dir, 'supabase/migrations', name), body);
  if (snapshot) writeFileSync(join(dir, 'supabase/migrations-snapshot/SNAPSHOT.sql'), 'select 1;');
  return dir;
}

const goodClient = `const CURRENT_PROJECT_ID = "${CANON}";\nfunction validateEnv() { return CURRENT_PROJECT_ID; }\n`;
const goodToml = `project_id = "${CANON}"\n`;

const run = (dir, script) =>
  spawnSync('node', [join(dir, 'scripts', script)], { cwd: dir, encoding: 'utf8', env: { PATH: process.env.PATH } });

afterAll(() => sandboxes.forEach((d) => rmSync(d, { recursive: true, force: true })));

describe('validate-supabase-config (Gate 0)', () => {
  it('aceita a declaração real', () => {
    const r = run(sandbox({ client: goodClient, toml: goodToml }), 'validate-supabase-config.mjs');
    expect(r.status, r.stderr).toBe(0);
  });

  it('recusa quando o ID canônico só aparece em comentário e a constante aponta outro projeto', () => {
    const client = `// const CURRENT_PROJECT_ID = "${CANON}";\nconst CURRENT_PROJECT_ID  = "abcdefghijklmnopqrst";\nfunction validateEnv() { return CURRENT_PROJECT_ID; }\n`;
    const r = run(sandbox({ client, toml: goodToml }), 'validate-supabase-config.mjs');
    expect(r.status).toBe(1);
  });

  it('recusa symlink quebrado em supabase/migrations (antes descartava o resto da varredura)', () => {
    const dir = sandbox({
      client: goodClient,
      toml: goodToml,
      migrations: { '20260101000001_legacy.sql': `select '${'https://' + LEGACY + '.supabase.co'}';` },
    });
    symlinkSync('/nao/existe/x.sql', join(dir, 'supabase/migrations/000_quebrado.sql'));
    const r = run(dir, 'validate-supabase-config.mjs');
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('000_quebrado.sql');
  });

  it('recusa quando não há nenhuma migration .sql para varrer', () => {
    const r = run(sandbox({ client: goodClient, toml: goodToml, migrations: {}, snapshot: false }), 'validate-supabase-config.mjs');
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('nenhum .sql encontrado');
  });
});

describe('guard-canonical-project (Fase 2)', () => {
  it('aceita client.ts e config.toml canônicos', () => {
    const r = run(sandbox({ client: goodClient, toml: goodToml }), 'guard-canonical-project.mjs');
    expect(r.status, r.stdout + r.stderr).toBe(0);
  });

  it.each([
    ['config.toml com ID canônico só em comentário e project_id legado', goodClient, `# canonico: ${CANON} (legado abaixo)\nproject_id = "${LEGACY}"\n`],
    ['config.toml com project_id errado e ID canônico em comentário no fim da linha', goodClient, `project_id = "abcdefghijklmnopqrst" # era ${CANON}\n`],
    ['client.ts com ID canônico só em comentário', `// ${CANON}\nconst CURRENT_PROJECT_ID = "abcdefghijklmnopqrst";\n`, goodToml],
  ])('recusa %s', (_name, client, toml) => {
    const r = run(sandbox({ client, toml }), 'guard-canonical-project.mjs');
    expect(r.status).toBe(1);
  });

  it('recusa arquivo crítico ausente (antes pulava com continue)', () => {
    const r = run(sandbox({ client: null, toml: goodToml }), 'guard-canonical-project.mjs');
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/ausente/);
  });
});
