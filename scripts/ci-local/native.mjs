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
export function stepShouldRun(cond, { failed, evaluate }) {
  if (cond === undefined || cond === null || cond === '') return !failed;
  const c = String(cond).replace(/^\$\{\{\s*|\s*\}\}$/g, '').trim();
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

/** Lê o GITHUB_OUTPUT de um passo (KEY=VAL e KEY<<DELIM … DELIM). */
export function parseGithubOutput(text) {
  const out = {};
  const lines = String(text).split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const h = lines[i].match(/^([A-Za-z_][\w-]*)<<(.+)$/);
    if (h) {
      const buf = [];
      for (i += 1; i < lines.length && lines[i] !== h[2]; i += 1) buf.push(lines[i]);
      out[h[1]] = buf.join('\n');
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
    const should = stepShouldRun(step.if, { failed, evaluate });
    if (should === null) {
      results.push({ name, status: 'inconclusivo', why: `if: não avaliável no modo nativo (${step.if}) — use o modo act` });
      inconclusive = true;
      continue;
    }
    if (!should) {
      results.push({ name, status: 'pulado' });
      continue;
    }
    if (classifyStep(step).cls === 'github-only') {
      results.push({ name, status: 'pulado', why: 'só GitHub (nunca roda localmente)' });
      continue;
    }
    if (step.uses) {
      const u = String(step.uses).split('@')[0];
      results.push({ name, status: ENV_ACTIONS.includes(u) ? 'ambiente' : 'inconclusivo', why: ENV_ACTIONS.includes(u) ? '' : `action ${u} sem equivalente nativo` });
      if (!ENV_ACTIONS.includes(u)) inconclusive = true;
      continue;
    }
    let run = String(step.run ?? '');
    if (skipInstall) {
      const s = stripInstallLines(run);
      if (s.onlyInstall) {
        results.push({ name, status: 'ambiente', why: 'instalação reaproveitada do node_modules local' });
        continue;
      }
      run = s.script;
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
      GITHUB_ENV: ghEnv, GITHUB_OUTPUT: ghOut, GITHUB_STEP_SUMMARY: ghSummary,
      GITHUB_EVENT_NAME: context.github.event_name, GITHUB_BASE_REF: context.github.base_ref ?? '',
      GITHUB_HEAD_REF: context.github.head_ref ?? '', GITHUB_SHA: context.github.sha, GITHUB_REPOSITORY: context.github.repository,
      GITHUB_WORKSPACE: root, RUNNER_TEMP: tmp,
    };
    const script = evaluate(run);
    const cmd = /pwsh|python/.test(shell) ? null : ['bash', ['--noprofile', '--norc', '-e', '-o', 'pipefail', '-c', script]];
    if (!cmd) {
      results.push({ name, status: 'inconclusivo', why: `shell ${shell} não suportado no modo nativo` });
      inconclusive = true;
      continue;
    }
    const t0 = Date.now();
    const r = spawnSync(cmd[0], cmd[1], { cwd: wd, env, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, timeout: (step['timeout-minutes'] ?? job['timeout-minutes'] ?? 60) * 60_000 });
    // GITHUB_ENV persiste para os próximos passos (formato KEY=VAL; heredoc não suportado).
    for (const line of readFileSync(ghEnv, 'utf8').split('\n')) {
      const m = line.match(/^([A-Za-z_]\w*)=(.*)$/);
      if (m) persisted[m[1]] = m[2];
    }
    const ok = r.status === 0;
    if (step.id) {
      const outcome = ok ? 'success' : 'failure';
      ctx.steps[step.id] = { outputs: parseGithubOutput(readFileSync(ghOut, 'utf8')), outcome, conclusion: ok || step['continue-on-error'] ? 'success' : 'failure' };
    }
    writeFileSync(ghOut, ''); // GITHUB_OUTPUT é por passo
    const output = `${r.stdout ?? ''}${r.stderr ?? ''}`;
    results.push({ name, status: ok ? 'ok' : 'FALHOU', ms: Date.now() - t0, tail: ok ? '' : output.split('\n').slice(-25).join('\n') });
    log(`${ok ? '✅' : '❌'} ${name} (${Math.round((Date.now() - t0) / 1000)}s)`);
    if (!ok && !step['continue-on-error']) failed = true;
  }
  rmSync(tmp, { recursive: true, force: true });
  return { status: failed ? 'FALHOU' : inconclusive ? 'inconclusivo' : 'ok', steps: results };
}
