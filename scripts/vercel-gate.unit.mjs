// Testes do gate do Vercel (vercel-gate.mjs) com um `vercel` falso.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, chmodSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { main, classify, nodeBinFor } from './vercel-gate.mjs';

const g = (cwd, ...a) => execFileSync('git', ['-c', 'user.name=F', '-c', 'user.email=f@l', ...a], { cwd, encoding: 'utf8' }).trim();
function fixture(t, { behavior = 'ok', linked = true } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'vgate-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  const repo = path.join(dir, 'Repo'); mkdirSync(repo); g(repo, 'init', '-q', '-b', 'main');
  writeFileSync(path.join(repo, 'a.txt'), 'v1'); g(repo, 'add', '.'); g(repo, 'commit', '-qm', 'base');
  if (linked) { mkdirSync(path.join(repo, '.vercel')); writeFileSync(path.join(repo, '.vercel/project.json'), '{"projectId":"p","orgId":"o"}'); writeFileSync(path.join(repo, '.vercel/.env.preview.local'), 'X=1'); writeFileSync(path.join(repo, '.vercel/.env.production.local'), 'X=2'); writeFileSync(path.join(repo, '.vercel/README.txt'), 'nao copiar'); }
  writeFileSync(path.join(repo, '.git/info/exclude'), '/.vercel/\n');
  const seen = path.join(dir, 'seen.json'), vercel = path.join(dir, 'vercel');
  const body = { ok: 'echo "Build Completed in .vercel/output"; exit 0', fail: 'echo "Error: Command \\"npm run build\\" exited with 1"; exit 1', net: 'echo "npm error network request failed"; echo "Error: getaddrinfo ENOTFOUND api.vercel.com"; exit 1', dirty: 'echo mudou > a.txt; exit 0',
    husky: 'git config core.hooksPath .husky/_; exit 0', netpath: 'echo "Running \\"build\\" command: vite build"; echo "Rollup failed to resolve import @/hooks/useNetworkStatus (network)"; exit 1',
    hang: `(sleep 60; touch ${JSON.stringify(path.join(dir, 'neto-vivo'))}) & sleep 60` }[behavior];
  writeFileSync(vercel, `#!/bin/sh\nnode -e 'const fs=require("fs");fs.writeFileSync(${JSON.stringify(seen)},JSON.stringify({args:process.argv.slice(1),cwd:process.cwd(),files:fs.existsSync(".vercel")?fs.readdirSync(".vercel"):[],mode:fs.existsSync(".vercel/.env.preview.local")?(fs.statSync(".vercel/.env.preview.local").mode&0o777):null,a:fs.readFileSync("a.txt","utf8")}))' "$@"\n${body}\n`);
  chmodSync(vercel, 0o755);
  const logs = []; const opts = { vercel, logDir: path.join(dir, 'logs'), tmpDir: dir, nodeBin: null, log: (m) => logs.push(m) };
  return { dir, repo, opts, logs, seen: () => JSON.parse(readFileSync(seen, 'utf8')) };
}
const leftovers = (f) => readdirSync(f.dir).filter((n) => n.startsWith('wt-'));

test('classify: ok, quebrado e infraestrutura', () => {
  assert.equal(classify(0, ''), 0); assert.equal(classify(1, 'Error: Command "vite build" exited with 1'), 1);
  for (const o of ['getaddrinfo ENOTFOUND api.vercel.com', 'Error: No existing credentials found.', 'socket hang up', 'npm error code EAI_AGAIN']) assert.equal(classify(1, o), 75);
  assert.equal(classify(127, ''), 75);
});
test('build ok: roda no worktree temporário com vínculo e variáveis (600), checkout intocado, limpa tudo', async (t) => {
  const f = fixture(t); writeFileSync(path.join(f.repo, 'a.txt'), 'edição local não commitada');
  assert.equal(await main(['--root', f.repo], f.opts), 0);
  const s = f.seen(); assert.notEqual(s.cwd, f.repo); assert.deepEqual(s.files.sort(), ['.env.preview.local', '.env.production.local', 'project.json']);
  assert.equal(s.mode, 0o600); assert.equal(s.a, 'v1', 'build vê o commit, não a edição local');
  assert.ok(s.args.includes('--prod'), 'na main usa --prod');
  assert.equal(readFileSync(path.join(f.repo, 'a.txt'), 'utf8'), 'edição local não commitada');
  assert.deepEqual(leftovers(f), []); assert.equal(g(f.repo, 'worktree', 'list').split('\n').length, 1);
});
test('branch de trabalho usa preview', async (t) => {
  const f = fixture(t); g(f.repo, 'checkout', '-q', '-b', 'feat/x');
  assert.equal(await main(['--root', f.repo], f.opts), 0); assert.ok(!f.seen().args.includes('--prod'));
});
test('build quebrado bloqueia (1) e mostra as últimas linhas', async (t) => {
  const f = fixture(t, { behavior: 'fail' }); assert.equal(await main(['--root', f.repo], f.opts), 1);
  assert.ok(f.logs.some((l) => /FALHOU/.test(l))); assert.ok(f.logs.some((l) => /exited with 1/.test(l))); assert.deepEqual(leftovers(f), []);
});
test('rede/login fora: não verificado (75), não bloqueia', async (t) => {
  const f = fixture(t, { behavior: 'net' }); assert.equal(await main(['--root', f.repo], f.opts), 75);
});
test('sem vínculo, sem CLI ou desligado: 75', async (t) => {
  const f = fixture(t, { linked: false }); assert.equal(await main(['--root', f.repo], f.opts), 75);
  const h = fixture(t); assert.equal(await main(['--root', h.repo], { ...h.opts, vercel: '/nao/existe/vercel' }), 75); assert.deepEqual(leftovers(h), []);
  const k = fixture(t); process.env.VERCEL_GATE = '0'; t.after(() => delete process.env.VERCEL_GATE); assert.equal(await main(['--root', k.repo], k.opts), 75);
});
test('build que suja arquivos versionados não afeta o checkout de trabalho', async (t) => {
  const f = fixture(t, { behavior: 'dirty' }); assert.equal(await main(['--root', f.repo], f.opts), 0);
  assert.equal(readFileSync(path.join(f.repo, 'a.txt'), 'utf8'), 'v1'); assert.equal(g(f.repo, 'status', '--porcelain'), '');
});
test('a partir de um worktree secundário usa o vínculo do checkout principal', async (t) => {
  const f = fixture(t); const wt = path.join(f.dir, 'outro'); g(f.repo, 'worktree', 'add', '-q', '-b', 'feat/y', wt);
  writeFileSync(path.join(wt, 'a.txt'), 'da branch'); g(wt, 'commit', '-qam', 'branch');
  assert.equal(await main(['--root', wt], f.opts), 0); assert.ok(f.seen().files.includes('project.json'));
  assert.equal(f.seen().a, 'da branch', 'constrói o commit da branch enviada, não o HEAD do checkout principal');
});

test('classify só considera infraestrutura ANTES do build começar', () => {
  assert.equal(classify(1, 'Running "build" command: vite build\nsrc/lib/network.ts: error TS2322 x'), 1);
  assert.equal(classify(1, 'Running "build" command\nfetch failed ETIMEDOUT getaddrinfo ENOTFOUND x'), 1);
  assert.equal(classify(1, 'npm error network request to https://registry failed'), 75);
  assert.equal(classify(1, 'x', true), 75);
});
test('erro de build com "network" no caminho bloqueia', async (t) => {
  const f = fixture(t, { behavior: 'netpath' }); assert.equal(await main(['--root', f.repo], f.opts), 1);
});
test('instalador de hooks (husky) mexendo na config compartilhada é revertido', async (t) => {
  const f = fixture(t, { behavior: 'husky' }); g(f.repo, 'config', 'core.hooksPath', '/ponte/hooks');
  assert.equal(await main(['--root', f.repo], f.opts), 0);
  assert.equal(g(f.repo, 'config', '--get', 'core.hooksPath'), '/ponte/hooks');
  assert.ok(f.logs.some((l) => /restaurado/.test(l)));
});
test('GIT_DIR do hook não vaza para o build nem confunde o commit', async (t) => {
  const f = fixture(t); const wt = path.join(f.dir, 'w2'); g(f.repo, 'worktree', 'add', '-q', '-b', 'feat/z', wt);
  writeFileSync(path.join(wt, 'a.txt'), 'z'); g(wt, 'commit', '-qam', 'z');
  process.env.GIT_DIR = path.join(f.repo, '.git/worktrees/w2'); process.env.GIT_INDEX_FILE = '/nao/existe'; t.after(() => { delete process.env.GIT_DIR; delete process.env.GIT_INDEX_FILE; });
  assert.equal(await main(['--root', wt], f.opts), 0); assert.equal(f.seen().a, 'z');
});
test('timeout mata o build e os netos, devolve 75 e limpa o worktree', async (t) => {
  const f = fixture(t, { behavior: 'hang' });
  const r = await main(['--root', f.repo], { ...f.opts, timeoutMs: 800 }); assert.equal(r, 75);
  await new Promise((res) => setTimeout(res, 1500)); assert.equal(existsSync(path.join(f.dir, 'neto-vivo')), false);
  assert.deepEqual(leftovers(f), []);
});
test('restos antigos de execução morta são limpos; recentes ficam', async (t) => {
  const f = fixture(t); const old = path.join(f.dir, 'wt-velho'), fresh = path.join(f.dir, 'wt-novo');
  g(f.repo, 'worktree', 'add', '-q', '--detach', old); mkdirSync(fresh);
  execFileSync('touch', ['-d', '3 hours ago', old]);
  assert.equal(await main(['--root', f.repo], f.opts), 0);
  assert.equal(existsSync(old), false); assert.equal(existsSync(fresh), true);
});
test('Node do projeto no Vercel (settings.nodeVersion)', (t) => {
  const d = mkdtempSync(path.join(tmpdir(), 'nvm-')); t.after(() => rmSync(d, { recursive: true, force: true }));
  for (const v of ['v22.23.4', 'v24.22.2', 'v24.1.0']) mkdirSync(path.join(d, v, 'bin'), { recursive: true });
  assert.equal(nodeBinFor({ settings: { nodeVersion: '24.x' } }, d), path.join(d, 'v24.22.2', 'bin'));
  assert.equal(nodeBinFor({ settings: {} }, d), path.join(d, 'v24.22.2', 'bin'), 'sem config: padrão do Vercel (24), não o Node do PATH'); assert.equal(nodeBinFor({ settings: { nodeVersion: '18.x' } }, d), null);
});

test('restos de gate morto (pid inexistente) são limpos já, inclusive .env; gate vivo é preservado', async (t) => {
  const { main } = await import('./vercel-gate.mjs');
  const { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os'); const { join } = await import('node:path'); const { execFileSync } = await import('node:child_process');
  const dir = mkdtempSync(join(tmpdir(), 'vg-pid-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  const repo = join(dir, 'r'); mkdirSync(repo); execFileSync('git', ['init', '-q', repo]);
  execFileSync('git', ['-C', repo, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'i']);
  mkdirSync(join(repo, '.vercel')); writeFileSync(join(repo, '.vercel/project.json'), '{}');
  const base = join(dir, 'cache'); mkdirSync(base);
  const dead = join(base, 'wt-morto'); mkdirSync(join(dead, '.vercel'), { recursive: true }); writeFileSync(join(dead, '.vercel/.env.production.local'), 'X=1'); writeFileSync(`${dead}.pid`, '999999');
  const live = join(base, 'wt-vivo'); mkdirSync(live); writeFileSync(`${live}.pid`, String(process.pid));
  const fake = join(dir, 'vercel'); writeFileSync(fake, '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  const code = await main(['--root', repo], { tmpDir: base, vercel: fake, nodeBin: null, log: () => {} });
  assert.equal(code, 0);
  assert.equal(existsSync(dead), false); assert.equal(existsSync(`${dead}.pid`), false);
  assert.equal(existsSync(live), true);
});

test('QA4: gate morto restaura o hooksPath gravado; gate concorrente no mesmo repo sai 75; resto antigo com pid vivo é limpo', async (t) => {
  const { main } = await import('./vercel-gate.mjs');
  const { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync, utimesSync } = await import('node:fs');
  const { tmpdir } = await import('node:os'); const { join } = await import('node:path'); const { execFileSync } = await import('node:child_process');
  const { createHash } = await import('node:crypto');
  const dir = mkdtempSync(join(tmpdir(), 'vg-qa4-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  const repo = join(dir, 'r'); execFileSync('git', ['init', '-q', repo]);
  execFileSync('git', ['-C', repo, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'i']);
  execFileSync('git', ['-C', repo, 'config', 'core.hooksPath', '.husky/_']);   // estado deixado pelo husky do gate morto
  mkdirSync(join(repo, '.vercel')); writeFileSync(join(repo, '.vercel/project.json'), '{}');
  const base = join(dir, 'cache'); mkdirSync(base);
  const dead = join(base, 'wt-morto'); mkdirSync(dead);
  writeFileSync(`${dead}.pid`, JSON.stringify({ pid: 999999, primary: repo, hooksBefore: '/ponte/hooks' }));
  const old = join(base, 'wt-velho'); mkdirSync(join(old, '.vercel'), { recursive: true }); writeFileSync(`${old}.pid`, String(process.pid));
  const past = (Date.now() - 2 * 3600 * 1000) / 1000; utimesSync(old, past, past);
  const fake = join(dir, 'vercel'); writeFileSync(fake, '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  assert.equal(await main(['--root', repo], { tmpDir: base, vercel: fake, nodeBin: null, log: () => {} }), 0);
  assert.equal(execFileSync('git', ['-C', repo, 'config', '--get', 'core.hooksPath'], { encoding: 'utf8' }).trim(), '/ponte/hooks');
  assert.equal(existsSync(dead), false); assert.equal(existsSync(old), false, 'pid vivo mas com mais de 1 h = resto');
  // trava por repositório
  const lock = join(base, `lock-${createHash('sha256').update(repo).digest('hex').slice(0, 16)}`);
  writeFileSync(lock, String(process.pid));
  assert.equal(await main(['--root', repo], { tmpDir: base, vercel: fake, nodeBin: null, log: () => {} }), 75);
  writeFileSync(lock, '999999');   // dono morto: trava é retomada
  assert.equal(await main(['--root', repo], { tmpDir: base, vercel: fake, nodeBin: null, log: () => {} }), 0);
  assert.equal(existsSync(lock), false, 'trava liberada ao final');
});

test('13/11: engines.node do package.json tem precedência sobre settings.nodeVersion (como no Vercel)', async (t) => {
  const { nodeBinFor } = await import('./vercel-gate.mjs');
  const { mkdtempSync, mkdirSync, rmSync } = await import('node:fs'); const { tmpdir } = await import('node:os'); const path = await import('node:path');
  const nvm = mkdtempSync(path.join(tmpdir(), 'nvm-')); t.after(() => rmSync(nvm, { recursive: true, force: true }));
  for (const v of ['v20.20.2', 'v22.23.4', 'v24.22.2']) mkdirSync(path.join(nvm, v, 'bin'), { recursive: true });
  const proj = { settings: { nodeVersion: '24.x' } };
  assert.match(nodeBinFor(proj, nvm, { engines: { node: '22.x' } }), /v22\.23\.4/);
  assert.equal(nodeBinFor(proj, nvm, { engines: { node: '>=20 <21' } }), null, 'Node 20 descontinuado no Vercel: bloqueia');
  assert.match(nodeBinFor(proj, nvm, null), /v24\./, 'sem engines: segue o projeto');
  assert.match(nodeBinFor(proj, nvm, { engines: {} }), /v24\./);
  assert.equal(nodeBinFor({}, nvm, { engines: { node: '18.x' } }), null, 'nenhum major suportado: null');
});

test('13/11 revisão: faixa de engines resolve para o MAIOR major suportado, como o Vercel', async () => {
  const { majorParaFaixa, nodeMajorFor } = await import('./vercel-gate.mjs');
  const casos = [['>=18', 24], ['>= 20', 24], ['>=22.0.0', 24], ['>=20 <23', 22], ['18 || 20', null], ['20 - 22', 22], ['22.x || 24.x', 24],
    ['^20.11', null], ['22.x', 22], ['~22.1', 22], ['<=20', null], ['v22', 22], ['>=22.22.1 <25', 24], ['>=18.18.0', 24], ['<21', null],
    ['>20', 24], ['24', 24], ['=22.1.0', 22], ['20.x || 22.x', 22], ['x.x', 24], ['>=*', 24], ['==22', 22], ['v=22', 22], ['22-beta', null], ['22.x-0', null], ['>=20 <21', null],
    ['^8', null], ['18.x', null], ['>24', null], ['^0.1', null], ['*', 24], ['x', 24], ['||', 24], ['lts', null], ['lts/*', null], ['', undefined], ['foo1', null],
    ['~>22', 22], ['24.1 - 24.0', null], ['20.1.1 - 20.0.0', null], ['=24.0 ^24.5.0 || =22.5', 22], ['^20.19.0 || >=22.12.0', 24]];
  for (const [f, e] of casos) assert.equal(majorParaFaixa(f), e, f);
  assert.equal(nodeMajorFor({ settings: { nodeVersion: '22.x' } }, { engines: { node: 'lts' } }), null, 'faixa inválida: o build do Vercel falha');
  assert.equal(nodeMajorFor({ settings: { nodeVersion: '22.x' } }, { engines: { node: '' } }), 22, 'engines vazio: segue o projeto');
  assert.equal(nodeMajorFor({}, null), 24, 'sem engines e sem config: padrão 24');
  assert.equal(nodeMajorFor({ settings: { nodeVersion: '20.x' } }, null), null, 'projeto configurado em Node 20 (descontinuado): bloqueia');
  assert.equal(nodeMajorFor({ settings: { nodeVersion: '18.x' } }, null), null);
  assert.equal(nodeMajorFor({ settings: { nodeVersion: '24.x' } }, { engines: { node: '>=18.18.0' } }), 24, 'Finance: antes ia para o Node do PATH');
});

test('13/11 revisão: Node que o Vercel vai usar não instalado → 75 (antes simulava no Node do PATH)', async (t) => {
  const { mkdtempSync, mkdirSync, rmSync } = await import('node:fs'); const { tmpdir } = await import('node:os'); const path = await import('node:path');
  const nvm = mkdtempSync(path.join(tmpdir(), 'nvm-')); t.after(() => rmSync(nvm, { recursive: true, force: true }));
  mkdirSync(path.join(nvm, 'v22.23.4', 'bin'), { recursive: true });
  const { nodeBinFor } = await import('./vercel-gate.mjs');
  assert.equal(nodeBinFor({ settings: { nodeVersion: '24.x' } }, nvm, { engines: { node: '>=22' } }), null, 'Vercel usaria 24, que não está instalado');
});
