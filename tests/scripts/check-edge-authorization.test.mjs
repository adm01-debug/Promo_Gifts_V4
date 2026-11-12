/**
 * Regressão do E030: `/service_role/i` e `resolveCredential(` contavam como "primitiva de auth".
 * Toda edge cria client com SUPABASE_SERVICE_ROLE_KEY, então uma edge dev SEM nenhuma
 * autenticação do chamador passava verde (reproduzido trocando `secrets-manager` por um handler aberto).
 */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '../..');
const dirs = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

function repoWithEdge(source, category = 'dev') {
  const dir = mkdtempSync(join(tmpdir(), 'edgeauth-'));
  dirs.push(dir);
  mkdirSync(join(dir, 'scripts'));
  cpSync(join(ROOT, 'scripts/check-edge-authorization.mjs'), join(dir, 'scripts/check-edge-authorization.mjs'));
  writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
  mkdirSync(join(dir, 'supabase/functions/_shared'), { recursive: true });
  mkdirSync(join(dir, 'supabase/functions/alvo'), { recursive: true });
  writeFileSync(
    join(dir, 'supabase/functions/_shared/edge-authz-manifest.ts'),
    `export const MANIFEST = {\n  "alvo": { category: "${category}", rationale: "teste", enforcedBy: "custom" },\n};\n`,
  );
  writeFileSync(join(dir, 'supabase/functions/alvo/index.ts'), source);
  return dir;
}
const run = (dir) => spawnSync('node', ['scripts/check-edge-authorization.mjs'], { cwd: dir, encoding: 'utf8', env: { PATH: process.env.PATH } });

describe('E030: entradas enforcedBy "custom" precisam de autenticação real do chamador', () => {
  it('edge dev aberta que só cria client service_role reprova', () => {
    const src = `Deno.serve(async () => {\n  const sb = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);\n  return new Response("ok");\n});\n`;
    const r = run(repoWithEdge(src));
    expect(r.status, r.stdout + r.stderr).toBe(1);
    expect(r.stderr + r.stdout).toContain('alvo');
  });

  it('resolveCredential sozinho (não autentica o chamador) reprova', () => {
    const src = `Deno.serve(async () => {\n  const { value } = await resolveCredential("X");\n  return new Response(value);\n});\n`;
    expect(run(repoWithEdge(src)).status).toBe(1);
  });

  it.each([
    ['auth.getUser + user_roles', 'const { data } = await sb.auth.getUser(token);\nawait sb.from("user_roles").select("role");'],
    ['getClaims + user_roles', 'const claims = await sb.auth.getClaims(token);\nawait sb.from("user_roles").select("role");'],
    ['is_dev RPC', 'await sb.rpc("is_dev", { _user_id: id });'],
    ['has_role RPC', 'await sb.rpc("has_role", { _role: "dev" });'],
    ['timingSafeEqual de token', 'if (!timingSafeEqual(a, b)) return new Response("no", { status: 401 });'],
  ])('%s passa', (_n, body) => {
    const r = run(repoWithEdge(`Deno.serve(async () => {\n  ${body}\n  return new Response("ok");\n});\n`));
    expect(r.status, r.stdout + r.stderr).toBe(0);
  });

  it('primitiva só em comentário não conta', () => {
    const src = `// await sb.auth.getUser(token); has_role(\nDeno.serve(async () => new Response("ok"));\n`;
    expect(run(repoWithEdge(src)).status).toBe(1);
  });
});

describe('repo real', () => {
  it('as 111 edges declaradas continuam passando com o critério mais estrito', () => {
    const r = spawnSync('node', ['scripts/check-edge-authorization.mjs'], { cwd: ROOT, encoding: 'utf8' });
    expect(r.status, r.stderr).toBe(0);
  });
});
