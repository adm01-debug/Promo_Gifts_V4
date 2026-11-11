// scripts/ci-local/native.mjs
// Motor RÁPIDO (sem Docker): executa os passos `run:` de jobs dos workflows direto
// no WSL, lendo o YAML a cada execução (nunca fica desatualizado em relação ao CI).
// Fidelidade menor que o act — serve para o ciclo rápido antes do push; o act é a
// referência. Ações de preparação (checkout/setup-node/...) são puladas porque o
// ambiente local já está pronto; actions locais compostas são expandidas.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { classifyStep } from './inventory.mjs';
import { tokenlessEnv } from './run-act.mjs';

/** Actions de ambiente: localmente já satisfeitas (node_modules, deno, git). */
const ENV_ACTIONS = [
  'actions/checkout', 'actions/setup-node', 'actions/setup-python', 'denoland/setup-deno',
  'actions/cache', 'actions/upload-artifact', 'actions/download-artifact', 'supabase/setup-cli',
  'pnpm/action-setup', 'oven-sh/setup-bun',
];

/** Avalia o subconjunto de expressões `${{ }}` que os passos usam. Desconhecido → ''. */
export function makeEvaluator(ctx) {
  const lookup = (path) => {
    const parts = path.trim().split('.');
    let cur = ctx;
    for (const p of parts) {
      if (cur == null) return '';
      cur = cur[p];
    }
    if (cur == null) return '';
    return typeof cur === 'object' ? JSON.stringify(cur) : String(cur);
  };
  const evalExpr = (expr) => {
    const e = expr.trim();
    // a || b  → primeiro valor não vazio (literais '...' suportados)
    if (e.includes('||')) {
      for (const part of e.split('||')) {
        const v = evalExpr(part);
        if (v !== '' && v !== 'false') return v;
      }
      return '';
    }
    const lit = e.match(/^'(.*)'$/);
    if (lit) return lit[1];
    if (/^(true|false)$/.test(e)) return e;
    if (/^[0-9]+$/.test(e)) return e;
    const join = e.match(/^join\(([^,]+),\s*'([^']*)'\)$/);
    if (join) return '';
    const fn = e.match(/^(format|toJSON|fromJSON|hashFiles|contains|startsWith|endsWith)\(/);
    if (fn) return '';
    return lookup(e.replace(/\[['"]?([^'"\]]+)['"]?\]/g, '.$1'));
  };
  return (s) => String(s ?? '').replace(/\$\{\{([\s\S]*?)\}\}/g, (_, x) => evalExpr(x));
}

/** Contextos que o modo nativo não tem (needs/vars/jobs): condição que os usa não é avaliável. */
const UNKNOWN_CTX = /\b(needs|vars|jobs)\./;

/**
 * `if:` de passo: avalia o mínimo seguro. Devolve true/false, ou null quando depende de
 * contexto que o modo nativo não tem (o passo vira inconclusivo — nunca "pulado" calado).
 */
export function stepShouldRun(cond, { failed, evaluate, steps = null }) {
  if (cond === undefined || cond === null || cond === '') return !failed;
  const c = String(cond).replace(/^\$\{\{\s*|\s*\}\}$/g, '').trim();
  // steps.<id> de passo que não rodou de fato (inconclusivo/ambiente/ausente) = desconhecido.
  if (steps) {
    const refs = [...c.matchAll(/\bsteps\.([\w-]+)\./g)].map((m) => m[1]);
    if (refs.some((id) => !steps[id] || steps[id].unknown)) return null;
  }
  if (/^failure\(\)$/.test(c)) return failed;
  if (/^always\(\)$/.test(c)) return true;
  if (/^!\s*cancelled\(\)$/.test(c)) return true;
  if (/^cancelled\(\)$/.test(c)) return false;
  if (/^success\(\)$/.test(c)) return !failed;
  if (UNKNOWN_CTX.test(c)) return null;
  if (/\balways\(\)/.test(c)) return true;
  if (/\bfailure\(\)/.test(c)) return failed;
  if (failed) return false;
  const eq = c.match(/^([\w.\-[\]'"]+)\s*(==|!=)\s*'([^']*)'$/);
  if (eq) {
    const left = evaluate(`\${{ ${eq[1]} }}`);
    return eq[2] === '==' ? left === eq[3] : left !== eq[3];
  }
  return true;
}

/** `if:` de JOB: só roda o que entende com certeza; o resto NÃO roda (vira inconclusivo). */
export function jobShouldRun(cond, evaluate) {
  if (cond === undefined || cond === null || cond === '' || cond === true) return true;
  if (cond === false) return false;
  const c = String(cond).replace(/^\$\{\{\s*|\s*\}\}$/g, '').trim();
  if (/^(always|success|!\s*cancelled)\(\)$/.test(c)) return true;
  if (/\b(needs|steps|vars|inputs|jobs)\./.test(c)) return null; // contexto ausente no nativo
  const eq = c.match(/^([\w.\-[\]'"]+)\s*(==|!=)\s*'([^']*)'$/);
  if (eq) {
    const left = evaluate(`\${{ ${eq[1]} }}`);
    return eq[2] === '==' ? left === eq[3] : left !== eq[3];
  }
  return null; // não entendido
}

/** Substitui `${{ inputs.X }}` (defaults do action.yml + `with:` do chamador) nos passos da composite. */
function bindInputs(steps, inputs) {
  const sub = (v) => (typeof v === 'string'
    ? v.replace(/\$\{\{\s*inputs\.([\w-]+)\s*\}\}/g, (_, k) => String(inputs[k] ?? ''))
    : Array.isArray(v) ? v.map(sub) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, sub(x)])) : v);
  return steps.map(sub);
}

function expandSteps(root, steps, depth = 0) {
  const out = [];
  for (const s of steps ?? []) {
    const uses = s?.uses ? String(s.uses) : '';
    if (uses.startsWith('./') && depth < 4) {
      const dir = join(root, uses);
      const file = ['action.yml', 'action.yaml'].map((f) => join(dir, f)).find(existsSync);
      const action = file ? yaml.load(readFileSync(file, 'utf8')) : null;
      if (action?.runs?.using === 'composite') {
        const defaults = Object.fromEntries(Object.entries(action.inputs ?? {}).map(([k, v]) => [k, v?.default ?? '']));
        const bound = bindInputs(action.runs.steps ?? [], { ...defaults, ...(s.with ?? {}) });
        out.push(...expandSteps(root, bound, depth + 1).map((x) => ({ ...x, _from: uses })));
        continue;
      }
    }
    out.push(s);
  }
  return out;
}

/**
 * Neutraliza comandos de instalação (o node_modules local é reaproveitado; nunca instala no
 * worktree nem no host) trocando o comando por `:` — o resto da linha vira argumento ignorado,
 * então `if/else`, `&&`, continuação com `\` e heredocs seguem sintaticamente válidos.
 * `onlyInstall`: o passo não fazia nada além de instalar.
 */
export function stripInstallLines(script) {
  const re = /(^[ \t]*|&&\s*|\|\|\s*|;\s*|\bthen\s+|\belse\s+|\bdo\s+)(?=(?:npm\s+ci|npm\s+install|bun\s+install|npx\s+playwright\s+install)\b)/gm;
  let removed = 0;
  const out = String(script).replace(re, (m, pre) => {
    removed += 1;
    return `${pre}: `;
  });
  const meaningful = out.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const onlyInstall = removed > 0 && meaningful.every((l) => /^:\s/.test(l) || /^--?[\w-]/.test(l) || l === '\\');
  return { script: out, removed, onlyInstall };
}

/** Instaladores de pacotes do sistema / root: nunca rodam no host pelo modo nativo. */
export const SYSTEM_INSTALL_RE = /(^|[\s;&|(!])(?:sudo\s|(?:apt-get|apt|dnf|yum|apk|brew)\s+(?:-\S+\s+)*install\b|pip3?\s+install\b|pipx\s+install\b|python3?\s+-m\s+pip\s+install\b)/m;

const SHIM = `#!/usr/bin/env bash
# ci-local: shim do gerenciador de pacotes — ignora só a instalação (node_modules local é reaproveitado).
real="__REAL__"; me="$(basename "$0")"
skip() { echo "[ci-local] '$me $*' ignorado no modo nativo (dependências locais reaproveitadas)" >&2; exit 0; }
case "$me" in
  yarn) [ $# -eq 0 ] && skip ;;
esac
has_pw=0; has_inst=0
for a in "$@"; do
  [ "$a" = "--" ] && break
  case "$a" in playwright|@playwright/test) has_pw=1 ;; esac
  case "$a" in install|ci|i|add|isntall) has_inst=1 ;; esac
done
case "$me" in
  npx|bunx) [ $has_pw = 1 ] && [ $has_inst = 1 ] && skip ;;
  *) [ $has_inst = 1 ] && skip ;;
esac
exec "$real" "$@"
`;

/** Cria shims de npm/pnpm/yarn/bun/npx/bunx em `dir` apontando para os binários reais. */
export function writeInstallShims(dir, pathEnv = process.env.PATH) {
  mkdirSync(dir, { recursive: true });
  for (const tool of ['npm', 'pnpm', 'yarn', 'bun', 'npx', 'bunx']) {
    const r = spawnSync('bash', ['-c', `command -v ${tool}`], { env: { PATH: pathEnv }, encoding: 'utf8' });
    const real = (r.stdout ?? '').trim();
    if (!real) continue;
    writeFileSync(join(dir, tool), SHIM.replace('__REAL__', real), { mode: 0o755 });
  }
  return dir;
}

/**
 * Prefixo bwrap que esconde a home real (token do gh, ~/.netrc, ~/.gitconfig, ~/.ssh) do código
 * do branch, mantendo visíveis só o repo, o .git comum, o node (nvm) e os caches.
 * null quando o bwrap não está disponível (o relatório marca "sem isolamento").
 */
export function sandboxPrefix(root, realHome = homedir()) {
  if (spawnSync('bwrap', ['--version'], { encoding: 'utf8' }).status !== 0) return null;
  const commonDir = spawnSync('git', ['-C', root, 'rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8' }).stdout?.trim();
  const args = ['--dev-bind', '/', '/', '--tmpfs', realHome];
  const bind = (flag, p) => { if (p && existsSync(p)) args.push(flag, p, p); };
  bind('--bind', root);
  bind('--bind', commonDir);
  for (const ro of ['.nvm', '.deno', '.bun', '.local/bin']) bind('--ro-bind', join(realHome, ro));
  for (const rw of ['.npm', '.cache']) bind('--bind', join(realHome, rw));
  return [...args, '--'];
}

/** Lê o GITHUB_OUTPUT de um passo (KEY=VAL e KEY<<DELIM … DELIM). */
export function parseGithubOutput(text) {
  const out = {};
  const lines = String(text).split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const h = lines[i].match(/^([A-Za-z_][\w-]*)<<(.+)$/);
    if (h) {
      const buf = [];
      let j = i + 1;
      for (; j < lines.length && lines[j] !== h[2]; j += 1) buf.push(lines[j]);
      // Como o runner do GitHub: delimitador sem fechamento é erro, não "engole o resto".
      if (j >= lines.length) throw new Error(`GITHUB_OUTPUT: delimitador ${h[2]} não encontrado`);
      out[h[1]] = buf.join('\n');
      i = j;
      continue;
    }
    const m = lines[i].match(/^([A-Za-z_][\w-]*)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

/**
 * Executa um job nativamente.
 * @returns {{status:'ok'|'FALHOU'|'inconclusivo', steps:Array}}
 */
export function runJobNative({ root, workflowDoc, jobId, context, secrets = {}, skipInstall = true, log = () => {} }) {
  const job = workflowDoc.jobs[jobId];
  const tmp = mkdtempSync(join(tmpdir(), 'ci-local-native-'));
  const ghEnv = join(tmp, 'env');
  const ghOut = join(tmp, 'output');
  const ghSummary = join(tmp, 'summary');
  for (const f of [ghEnv, ghOut, ghSummary]) writeFileSync(f, '');
  // `steps` é preenchido a cada passo com id (outputs/outcome), para `if: steps.x.outputs.y`.
  const ctx = { ...context, secrets, env: {}, steps: {} };
  const evaluate = makeEvaluator(ctx);
  // HOME isolado: código do branch não lê ~/.config/gh, ~/.netrc, ~/.gitconfig do usuário;
  // os caches (npm, playwright, deno) continuam apontando para os reais.
  const realHome = homedir();
  const fakeHome = join(tmp, 'home');
  mkdirSync(fakeHome, { recursive: true });
  const homeEnv = {
    HOME: fakeHome,
    XDG_CONFIG_HOME: join(fakeHome, '.config'),
    XDG_CACHE_HOME: process.env.XDG_CACHE_HOME || join(realHome, '.cache'),
    npm_config_cache: process.env.npm_config_cache || join(realHome, '.npm'),
    PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || join(realHome, '.cache', 'ms-playwright'),
    DENO_DIR: process.env.DENO_DIR || join(realHome, '.cache', 'deno'),
  };
  const shimDir = writeInstallShims(join(tmp, 'shims'));
  const sandbox = sandboxPrefix(root, realHome);
  const baseEnv = { ...workflowDoc.env, ...job.env };
  const persisted = {};
  const results = [];
  let failed = false;
  let inconclusive = false;
  const shell = job?.defaults?.run?.shell ?? workflowDoc?.defaults?.run?.shell ?? 'bash';

  const jobRun = jobShouldRun(job.if, evaluate);
  if (jobRun !== true) {
    rmSync(tmp, { recursive: true, force: true });
    return jobRun === false
      ? { status: 'pulado', steps: [{ name: '(job)', status: 'pulado', why: `if: ${job.if}` }] }
      : { status: 'inconclusivo', steps: [{ name: '(job)', status: 'inconclusivo', why: `if: do job não avaliável no modo nativo (${job.if}) — use o modo act` }] };
  }

  for (const step of expandSteps(root, job.steps)) {
    const name = step.name ?? step.uses ?? String(step.run ?? '').split('\n')[0].slice(0, 60);
    const should = stepShouldRun(step.if, { failed, evaluate, steps: ctx.steps });
    // Passo com id que não roda de fato: seus outputs são desconhecidos para os seguintes.
    const markUnknown = () => { if (step.id) ctx.steps[step.id] = { outputs: {}, unknown: true }; };
    if (should === null) {
      results.push({ name, status: 'inconclusivo', why: `if: não avaliável no modo nativo (${step.if}) — use o modo act` });
      inconclusive = true;
      markUnknown();
      continue;
    }
    if (!should) {
      results.push({ name, status: 'pulado' });
      if (step.id) ctx.steps[step.id] = { outputs: {}, outcome: 'skipped', conclusion: 'skipped' };
      continue;
    }
    if (classifyStep(step).cls === 'github-only') {
      results.push({ name, status: 'pulado', why: 'só GitHub (nunca roda localmente)' });
      markUnknown();
      continue;
    }
    if (step.uses) {
      const u = String(step.uses).split('@')[0];
      results.push({ name, status: ENV_ACTIONS.includes(u) ? 'ambiente' : 'inconclusivo', why: ENV_ACTIONS.includes(u) ? '' : `action ${u} sem equivalente nativo` });
      if (!ENV_ACTIONS.includes(u)) inconclusive = true;
      markUnknown();
      continue;
    }
    const run = String(step.run ?? '');
    if (SYSTEM_INSTALL_RE.test(run)) {
      results.push({ name, status: 'inconclusivo', why: 'instala pacotes do sistema / usa sudo — nunca roda no host; use o modo act' });
      inconclusive = true;
      markUnknown();
      continue;
    }
    // A instalação em si é barrada pelos shims no PATH (o script roda intacto); aqui só o rótulo.
    if (skipInstall && stripInstallLines(run).onlyInstall) {
      results.push({ name, status: 'ambiente', why: 'instalação reaproveitada do node_modules local' });
      markUnknown();
      continue;
    }
    const neededSecrets = [...run.matchAll(/secrets\.([A-Za-z_]\w*)/g), ...JSON.stringify(step.env ?? {}).matchAll(/secrets\.([A-Za-z_]\w*)/g)]
      .map((m) => m[1]).filter((s) => s !== 'GITHUB_TOKEN' && !(s in secrets));
    if (neededSecrets.length) {
      results.push({ name, status: 'inconclusivo', why: `segredo ausente: ${[...new Set(neededSecrets)].join(', ')}` });
      inconclusive = true;
      continue;
    }
    const stepEnv = Object.fromEntries(Object.entries({ ...baseEnv, ...step.env }).map(([k, v]) => [k, evaluate(v)]));
    const wd = step['working-directory'] ? join(root, evaluate(step['working-directory'])) : root;
    if (!existsSync(wd)) {
      results.push({ name, status: 'inconclusivo', why: `working-directory não existe localmente: ${wd}` });
      inconclusive = true;
      continue;
    }
    const env = {
      ...tokenlessEnv(join(tmp, 'no-gh')), ...homeEnv, ...persisted, ...stepEnv, CI: 'true', GITHUB_ACTIONS: 'true',
      PATH: `${shimDir}:${process.env.PATH}`,
      GITHUB_ENV: ghEnv, GITHUB_OUTPUT: ghOut, GITHUB_STEP_SUMMARY: ghSummary,
      GITHUB_EVENT_NAME: context.github.event_name, GITHUB_BASE_REF: context.github.base_ref ?? '',
      GITHUB_HEAD_REF: context.github.head_ref ?? '', GITHUB_SHA: context.github.sha, GITHUB_REPOSITORY: context.github.repository,
      GITHUB_WORKSPACE: root, RUNNER_TEMP: tmp,
    };
    const script = evaluate(run);
    const bashArgs = ['--noprofile', '--norc', '-e', '-o', 'pipefail', '-c', script];
    const cmd = /pwsh|python/.test(shell) ? null : sandbox ? ['bwrap', [...sandbox, 'bash', ...bashArgs]] : ['bash', bashArgs];
    if (!cmd) {
      results.push({ name, status: 'inconclusivo', why: `shell ${shell} não suportado no modo nativo` });
      inconclusive = true;
      continue;
    }
    const t0 = Date.now();
    const r = spawnSync(cmd[0], cmd[1], { cwd: wd, env, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, timeout: (step['timeout-minutes'] ?? job['timeout-minutes'] ?? 60) * 60_000 });
    // GITHUB_ENV persiste para os próximos passos (formato KEY=VAL; heredoc não suportado).
    for (const line of readFileSync(ghEnv, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z_]\w*)=(.*)$/);
      if (m) persisted[m[1]] = m[2];
    }
    let ok = r.status === 0;
    let parsed = {};
    try {
      parsed = parseGithubOutput(readFileSync(ghOut, 'utf8'));
    } catch (e) {
      ok = false;
      r.stderr = `${r.stderr ?? ''}\n${e.message}`;
    }
    if (step.id) {
      const outcome = ok ? 'success' : 'failure';
      ctx.steps[step.id] = { outputs: parsed, outcome, conclusion: ok || step['continue-on-error'] ? 'success' : 'failure' };
    }
    writeFileSync(ghOut, ''); // GITHUB_OUTPUT é por passo
    const output = `${r.stdout ?? ''}${r.stderr ?? ''}`;
    results.push({ name, status: ok ? 'ok' : 'FALHOU', ms: Date.now() - t0, tail: ok ? '' : output.split('\n').slice(-25).join('\n') });
    log(`${ok ? '✅' : '❌'} ${name} (${Math.round((Date.now() - t0) / 1000)}s)`);
    if (!ok && !step['continue-on-error']) failed = true;
  }
  rmSync(tmp, { recursive: true, force: true });
  return { status: failed ? 'FALHOU' : inconclusive ? 'inconclusivo' : 'ok', steps: results, sandboxed: Boolean(sandbox) };
}
