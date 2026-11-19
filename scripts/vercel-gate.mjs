#!/usr/bin/env node
// Gate do Vercel antes do push (11/11/2026, revisado após QA): reproduz localmente o build que o Vercel fará.
//
//   node vercel-gate.mjs [--root <worktree>] [--ref <commit>] [--prod|--preview]
//   VERCEL_GATE=0 desliga (sai 75).
//
// Isolamento: worktree TEMPORÁRIO do commit enviado (resolvido no worktree de origem); o checkout de trabalho nunca é
// tocado. Vínculo e variáveis vêm do .vercel/ do checkout principal (vercel link + pull; excluído do git).
// Garantias:
//  - Node: o do projeto no Vercel (settings.nodeVersion do project.json), se instalado no nvm;
//  - hooks: HUSKY=0 e o core.hooksPath do repositório é conferido e restaurado ao final (o `prepare: husky` do npm
//    install reescrevia a config COMPARTILHADA e desinstalava a ponte da automação — incidente de 11/11);
//  - ambiente do hook (GIT_DIR, GIT_INDEX_FILE...) não vaza para o build;
//  - processo em grupo próprio: timeout/sinal matam o build inteiro e o worktree temporário é sempre removido;
//    restos de execuções mortas (wt-* com mais de 2 h) são limpos no início.
// Saída: 0 = build ok; 1 = build QUEBROU (bloqueia o push); 75 = não verificável (sem vínculo, sem CLI, sem rede,
// sem login, timeout, desligado) — avisa e não bloqueia. Log completo (com o veredito) em ~/.cache/vercel-gate/.
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Só vale ANTES de o build começar: depois disso, "network"/"ETIMEDOUT" no meio de um erro de compilação é do código.
const INFRA = /\bnpm (?:error|ERR!) network\b|\bcode (?:EAI_AGAIN|ENOTFOUND|ECONNRESET|ECONNREFUSED|ETIMEDOUT)\b|getaddrinfo (?:EAI_AGAIN|ENOTFOUND)|No existing credentials|The specified token is not valid|Your codebase isn['’]t linked|Could not retrieve Project Settings|socket hang up/i;
const BUILD_STARTED = /Running ["']?(?:build|vercel-build)["']? command|> \S+ build\b|Running "(?:npm|bun|pnpm|yarn) run build"/i;
const GIT_ENV = ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_PREFIX', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_QUARANTINE_PATH'];

export function classify(code, output, timedOut = false) {
  if (timedOut) return 75;
  if (code === 0) return 0;
  if (code === 127) return 75;
  const at = output.search(BUILD_STARTED);
  const before = at >= 0 ? output.slice(0, at) : output;
  return INFRA.test(before) ? 75 : 1;
}

// (13/11) No Vercel, `engines.node` do package.json TEM PRECEDÊNCIA sobre settings.nodeVersion do projeto, e a faixa
// resolve para o MAIOR major suportado que ela permite (">=18" → 24, "18 || 20" → 20), não para o primeiro número.
// Ordem: engines.node (faixa semver) → settings.nodeVersion. Major determinado mas não instalado = null + motivo.
// (rev3) só majors NÃO descontinuados no @vercel/build-utils local (Node 20: discontinueDate 2026-10-01 → o Vercel lança
// BUILD_UTILS_NODE_VERSION_DISCONTINUED). Faixa que só alcança 20 → null → push bloqueado sem gastar um build.
export const VERCEL_MAJORS = [24, 22];
const vnum = (a, b = 0, c = 0) => a * 1e6 + b * 1e3 + c;
// Uma versão parcial "a", "a.b", "a.b.c" (x/X/* = curinga) → { p: [números], n: quantos definidos }.
function parcial(t) {
  const m = /^[v=\s]*(\d+|[xX*])(?:\.(\d+|[xX*])(?:\.(\d+|[xX*])([-+].*)?)?)?$/.exec(t);   // (rev3) prefixo como o semver; sufixo só em versão completa
  if (m && m[4] && !/^\d+$/.test(m[3])) return null;
  if (!m) return null;
  const p = []; for (const x of m.slice(1, 4)) { if (x === undefined || /[xX*]/.test(x)) break; p.push(Number(x)); }
  return { p, n: p.length };
}
const piso = ({ p }) => vnum(p[0] ?? 0, p[1] ?? 0, p[2] ?? 0);
// Primeira versão DEPOIS de todas as que casam com o parcial ("22" → 23.0.0, "22.1" → 22.2.0, "22.1.3" → 22.1.4).
const teto = ({ p, n }) => (n === 0 ? Infinity : n === 1 ? vnum(p[0] + 1) : n === 2 ? vnum(p[0], p[1] + 1) : vnum(p[0], p[1], p[2] + 1));
// Um conjunto de comparadores (sem "||") → intervalo [lo, hi) ou null se não entendido.
function intervalo(conj) {
  let lo = 0, hi = Infinity;
  const hif = conj.match(/^\s*(\S+)\s+-\s+(\S+)\s*$/);
  if (hif) { const a = parcial(hif[1]), b = parcial(hif[2]); return a && b ? [piso(a), teto(b)] : null; }
  const toks = conj.replace(/~>/g, '~').replace(/(>=|<=|[<>=^~])\s+/g, '$1').trim().split(/\s+/).filter(Boolean);
  if (!toks.length) return [0, Infinity];
  for (const tk of toks) {
    const m = /^(>=|<=|>|<|=|\^|~)?(.+)$/.exec(tk); const v = parcial(m[2]); if (!v) return null;
    const op = m[1] || '=';
    if (op === '>=') lo = Math.max(lo, piso(v));
    else if (op === '>') lo = Math.max(lo, v.n === 0 ? Infinity : teto(v));
    else if (op === '<') hi = Math.min(hi, v.n === 0 ? 0 : piso(v));
    else if (op === '<=') hi = Math.min(hi, teto(v));
    else if (op === '=') { lo = Math.max(lo, piso(v)); hi = Math.min(hi, teto(v)); }
    else if (op === '~') { lo = Math.max(lo, piso(v)); hi = Math.min(hi, v.n >= 2 ? vnum(v.p[0], v.p[1] + 1) : teto(v)); }
    else if (op === '^') { lo = Math.max(lo, piso(v)); hi = Math.min(hi, v.n === 0 ? Infinity : v.p[0] > 0 ? vnum(v.p[0] + 1) : teto(v)); }
  }
  return [lo, hi];
}
// Major que o Vercel usaria para a faixa: o maior suportado que ela permite. undefined = faixa não entendida/sem número.
// (13/11, fuzz contra o @vercel/build-utils local: semver 6, primeiro major suportado que `intersects`) — faixa só
// com curinga (*, x, ||) → o maior suportado; faixa inválida → null (o build do Vercel lança erro); intervalo vazio
// ("24.1 - 24.0") não casa nada; "~>" = "~". Vazio/ausente → undefined (cai na config do projeto).
export function majorParaFaixa(faixa) {
  const f = String(faixa ?? '').trim();
  if (!f) return undefined;
  const ints = f.split('||').map(intervalo);
  if (ints.some((i) => i === null)) return null;
  for (const M of VERCEL_MAJORS) if (ints.some(([lo, hi]) => lo < hi && lo < vnum(M + 1) && hi > vnum(M))) return M;
  return null;   // faixa válida mas nenhum major suportado pelo Vercel cabe nela (o build lá também falha)
}
export function nodeMajorFor(projectJson, packageJson = null) {
  const e = majorParaFaixa(packageJson?.engines?.node);
  if (e !== undefined) return e;
  const p = String(projectJson?.settings?.nodeVersion || '').match(/^(\d+)/)?.[1];
  if (p) return VERCEL_MAJORS.includes(Number(p)) ? Number(p) : null;   // config do projeto em major descontinuado: o build lá falha
  return VERCEL_MAJORS[0];   // sem engines e sem config: o Vercel usa o padrão atual (24), não o Node do PATH
}
export function nodeBinFor(projectJson, nvmDir, packageJson = null) {
  const v = nodeMajorFor(projectJson, packageJson);
  if (!v || !existsSync(nvmDir)) return null;
  const found = readdirSync(nvmDir).filter((d) => d.startsWith(`v${v}.`)).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  return found.length ? path.join(nvmDir, found[0], 'bin') : null;
}

function runAsync(argv, cwd, env, timeoutMs, onSpawn = () => {}) {
  return new Promise((resolve) => {
    const child = spawn(argv[0], argv.slice(1), { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    if (child.pid) onSpawn(child.pid);
    let out = '', timedOut = false, done = false;
    const kill = (sig) => { try { process.kill(-child.pid, sig); } catch { /* encerrado */ } };
    const timer = setTimeout(() => { timedOut = true; kill('SIGTERM'); setTimeout(() => kill('SIGKILL'), 5000).unref(); }, timeoutMs);
    const onSignal = () => { kill('SIGTERM'); setTimeout(() => kill('SIGKILL'), 3000).unref(); };
    process.once('SIGTERM', onSignal); process.once('SIGINT', onSignal);
    const collect = (d) => { out += d; if (out.length > 8 * 1024 * 1024) out = out.slice(-4 * 1024 * 1024); };
    child.stdout.on('data', collect); child.stderr.on('data', collect);
    const finish = (code) => {
      if (done) return; done = true; clearTimeout(timer);
      process.removeListener('SIGTERM', onSignal); process.removeListener('SIGINT', onSignal);
      kill('SIGKILL');
      resolve({ code, out, timedOut });
    };
    child.once('error', (e) => finish(e.code === 'ENOENT' ? 127 : 1));
    child.once('close', (code) => finish(code ?? 1));
  });
}

export async function main(args, options = {}) {
  const say = options.log || ((m) => console.error(`[vercel-gate] ${m}`));
  if (process.env.VERCEL_GATE === '0') { say('desligado por VERCEL_GATE=0'); return 75; }
  const arg = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
  const root = path.resolve(arg('--root') || process.cwd());
  const ref = arg('--ref') || 'HEAD';
  const env = { ...process.env, ...(options.env || {}) };
  for (const k of GIT_ENV) delete env[k];
  const gitEnv = { ...env, GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'core.hooksPath', GIT_CONFIG_VALUE_0: '/dev/null' };
  const git = (argv, cwd = root, plain = false) => {
    const r = spawnSync('git', argv, { cwd, env: plain ? env : gitEnv, encoding: 'utf8', timeout: 120000 });
    return { code: r.status ?? 1, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
  };
  // config real do repositório (sem o hooksPath=/dev/null injetado por variável de ambiente)
  const config = (...a) => git(['-C', primary, 'config', ...a], primary, true);
  const common = git(['-C', root, 'rev-parse', '--path-format=absolute', '--git-common-dir']);
  if (common.code !== 0) { say('não é um repositório git'); return 75; }
  const primary = path.dirname(common.out);
  const link = path.join(primary, '.vercel');
  if (!existsSync(path.join(link, 'project.json'))) { say(`repositório não vinculado ao Vercel (${link}/project.json ausente); rode vercel link + vercel pull no checkout principal`); return 75; }
  // O commit é resolvido no worktree DE ORIGEM (`HEAD` no checkout principal seria outra branch).
  const full = git(['-C', root, 'rev-parse', '--verify', `${ref}^{commit}`]).out;
  if (!/^[0-9a-f]{40}$/.test(full)) { say(`referência inválida: ${ref}`); return 75; }
  const sha = full.slice(0, 9);
  const branch = git(['-C', root, 'branch', '--show-current']).out;
  const prod = args.includes('--prod') || (!args.includes('--preview') && branch === 'main');
  const base = options.tmpDir || path.join(homedir(), '.cache/vercel-gate');
  const logs = options.logDir || base; mkdirSync(logs, { recursive: true, mode: 0o700 }); mkdirSync(base, { recursive: true, mode: 0o700 });
  // (QA 11/11, 2 rodadas) Estado de cada gate em wt-XXXX.pid (JSON): pid do gate, grupo do build, repositório e o
  // core.hooksPath de ANTES. Resto é "morto" se o dono não existe OU tem mais de 1 h (gate vive no máx. ~26 min; cobre
  // reuso de pid/EPERM). Ao limpar um morto: mata o grupo do build órfão, devolve o hooksPath gravado e apaga os .env.
  const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
  const readInfo = (f) => { try { const t = readFileSync(f, 'utf8'); return /^\d+$/.test(t.trim()) ? { pid: Number(t) } : JSON.parse(t); } catch { return null; } };
  const MAX_AGE = 3600 * 1000;
  for (const d of readdirSync(base).filter((n) => n.startsWith('wt-') && !n.endsWith('.pid'))) {
    const dir = path.join(base, d), pidFile = `${dir}.pid`;
    try {
      const info = existsSync(pidFile) ? readInfo(pidFile) : null;
      const age = Date.now() - statSync(dir).mtimeMs;
      const stale = info?.pid ? !alive(info.pid) || age > MAX_AGE : age > 2 * MAX_AGE;
      if (!stale) continue;
      if (info?.pgid) { try { process.kill(-info.pgid, 'SIGKILL'); } catch { /* já encerrado */ } }
      if (info?.primary && typeof info.hooksBefore === 'string') {
        const cur = git(['-C', info.primary, 'config', '--get', 'core.hooksPath'], info.primary, true).out;
        if (cur !== info.hooksBefore) {
          if (info.hooksBefore) git(['-C', info.primary, 'config', 'core.hooksPath', info.hooksBefore], info.primary, true);
          else git(['-C', info.primary, 'config', '--unset', 'core.hooksPath'], info.primary, true);
          say(`gate anterior morreu no meio: core.hooksPath de ${path.basename(info.primary)} restaurado (${cur || 'vazio'} -> ${info.hooksBefore || 'vazio'})`);
        }
      }
      for (const w of [path.join(dir, 'w'), dir]) { rmSync(path.join(w, '.vercel'), { recursive: true, force: true }); git(['-C', info?.primary || primary, 'worktree', 'remove', '--force', w], primary); }
      rmSync(dir, { recursive: true, force: true }); rmSync(pidFile, { force: true });
    } catch { /* outro processo */ }
  }
  for (const f of readdirSync(base).filter((n) => n.startsWith('wt-') && n.endsWith('.pid'))) if (!existsSync(path.join(base, f.slice(0, -4)))) rmSync(path.join(base, f), { force: true });
  git(['-C', primary, 'worktree', 'prune'], primary);
  // Um gate por repositório: dois gates simultâneos se confundiam no hooksPath "de antes" (o 2º gravava o do husky).
  const lockFile = path.join(base, `lock-${createHash('sha256').update(primary).digest('hex').slice(0, 16)}`);
  const takeLock = () => { try { writeFileSync(lockFile, String(process.pid), { flag: 'wx', mode: 0o600 }); return true; } catch { return false; } };
  if (!takeLock()) {
    const owner = Number(readFileSync(lockFile, 'utf8')) || 0;
    if (owner && alive(owner) && Date.now() - statSync(lockFile).mtimeMs < MAX_AGE) { say(`outro gate deste repositório está em andamento (pid ${owner}); este push não foi verificado`); return 75; }
    rmSync(lockFile, { force: true });
    if (!takeLock()) { say('não consegui a trava do gate; este push não foi verificado'); return 75; }
  }
  const hooksBefore = config('--get', 'core.hooksPath').out;
  const dirTmp = mkdtempSync(path.join(base, 'wt-'));
  const tmp = path.join(dirTmp, 'w');   // a pasta do mkdtemp nunca some durante o gate (o .pid não fica órfão)
  const infoFile = `${dirTmp}.pid`;
  const writeInfo = (extra = {}) => writeFileSync(infoFile, JSON.stringify({ pid: process.pid, primary, hooksBefore, at: new Date().toISOString(), ...extra }), { mode: 0o600 });
  writeInfo();
  const logFile = path.join(logs, `${path.basename(primary)}-${sha}-${Date.now()}.log`);
  try {
    const add = git(['-C', primary, 'worktree', 'add', '--detach', tmp, full], primary);
    if (add.code !== 0) { say(`não consegui criar o worktree temporário: ${add.err.slice(0, 200)}`); return 75; }
    mkdirSync(path.join(tmp, '.vercel'), { recursive: true, mode: 0o700 });
    for (const f of readdirSync(link)) {
      if (f === 'project.json' || /^\.env\.[a-z]+\.local$/.test(f)) {
        copyFileSync(path.join(link, f), path.join(tmp, '.vercel', f));
        if (f.startsWith('.env')) chmodSync(path.join(tmp, '.vercel', f), 0o600);
      }
    }
    let project = {};
    try { project = JSON.parse(readFileSync(path.join(link, 'project.json'), 'utf8')); } catch { /* sem settings */ }
    let pkg = null;
    try { pkg = JSON.parse(readFileSync(path.join(tmp, 'package.json'), 'utf8')); } catch { /* sem package.json */ }
    const nodeBin = options.nodeBin !== undefined ? options.nodeBin : nodeBinFor(project, options.nvmDir || path.join(homedir(), '.nvm/versions/node'), pkg);
    if (options.nodeBin === undefined && !nodeBin) {
      // (13/11) Sem o Node que o Vercel vai usar, simular no Node do PATH dá veredito falso: não verificar.
      const maj = nodeMajorFor(project, pkg);
      if (maj === null) { say(`engines.node "${pkg?.engines?.node}" não aceita nenhum Node suportado pelo Vercel (${VERCEL_MAJORS.join('/')}), é inválido ou o projeto usa um Node descontinuado: o build lá VAI FALHAR. Push bloqueado.`); return 1; }
      if (maj !== undefined) { say(`o Vercel vai usar Node ${maj}, que não está instalado (nvm install ${maj}); push não verificado`); return 75; }
    }
    const buildEnv = { ...env, HUSKY: '0', ...(nodeBin ? { PATH: `${nodeBin}:${env.PATH || ''}` } : {}) };
    say(`vercel build ${prod ? '--prod' : '(preview)'} de ${path.basename(primary)} @ ${sha} (worktree temporário${nodeBin ? `, ${path.basename(path.dirname(nodeBin))}` : ''})...`);
    const started = Date.now();
    const b = await runAsync([options.vercel || 'vercel', 'build', '--yes', ...(prod ? ['--prod'] : [])], tmp, buildEnv, options.timeoutMs || 20 * 60 * 1000, (pgid) => writeInfo({ pgid }));
    const verdict = classify(b.code, b.out, b.timedOut);
    const secs = Math.round((Date.now() - started) / 1000);
    writeFileSync(logFile, `${b.out}\n\n[vercel-gate] exit=${b.code} timeout=${b.timedOut} veredito=${verdict} (0 ok, 1 bloqueia, 75 não verificado) em ${secs}s\n`, { mode: 0o600 });
    if (verdict === 0) say(`OK em ${secs}s (log: ${logFile})`);
    else if (verdict === 75) say(`NÃO VERIFICADO${b.timedOut ? ' (tempo esgotado)' : ' (infraestrutura/rede/login)'} — push liberado. Log: ${logFile}`);
    else {
      say(`FALHOU em ${secs}s: o Vercel vai falhar igual. Últimas linhas:`);
      for (const l of b.out.split('\n').filter((x) => x.trim()).slice(-15)) say(`  ${l.slice(0, 240)}`);
      say(`log completo: ${logFile} · para pular só desta vez: VERCEL_GATE=0 git push`);
    }
    return verdict;
  } finally {
    // Ordem importa se o processo for morto no meio (QA 11/11): primeiro o que é barato e crítico —
    // 1) devolver o core.hooksPath (husky do install pode ter trocado a config COMPARTILHADA);
    // 2) apagar as cópias dos .env; só depois a remoção lenta do worktree (node_modules).
    const hooksAfter = config('--get', 'core.hooksPath').out;
    if (hooksAfter !== hooksBefore) {
      if (hooksBefore) config('core.hooksPath', hooksBefore);
      else config('--unset', 'core.hooksPath');
      say(`core.hooksPath tinha sido alterado pelo install (${hooksAfter || 'vazio'}); restaurado.`);
    }
    rmSync(path.join(tmp, '.vercel'), { recursive: true, force: true });
    git(['-C', primary, 'worktree', 'remove', '--force', tmp], primary);
    rmSync(dirTmp, { recursive: true, force: true });
    git(['-C', primary, 'worktree', 'prune'], primary);
    rmSync(infoFile, { force: true });
    rmSync(lockFile, { force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
