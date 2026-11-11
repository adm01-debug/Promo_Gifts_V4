// scripts/ci-local/native.mjs
// Motor RÁPIDO (sem Docker): executa os passos `run:` de jobs dos workflows direto
// no WSL, lendo o YAML a cada execução (nunca fica desatualizado em relação ao CI).
// Fidelidade menor que o act — serve para o ciclo rápido antes do push; o act é a
// referência. Ações de preparação (checkout/setup-node/...) são puladas porque o
// ambiente local já está pronto; actions locais compostas são expandidas.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import yaml from 'js-yaml';

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

/** `if:` de passo: avalia o mínimo seguro; o que não entende, executa (fail-loud). */
export function stepShouldRun(cond, { failed, evaluate }) {
  if (cond === undefined || cond === null || cond === '') return !failed;
  const c = String(cond).replace(/^\$\{\{\s*|\s*\}\}$/g, '').trim();
  if (/^failure\(\)$/.test(c)) return failed;
  if (/^always\(\)$/.test(c)) return true;
  if (/^cancelled\(\)$/.test(c)) return false;
  if (/^success\(\)$/.test(c)) return !failed;
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

function expandSteps(root, steps, depth = 0) {
  const out = [];
  for (const s of steps ?? []) {
    const uses = s?.uses ? String(s.uses) : '';
    if (uses.startsWith('./') && depth < 4) {
      const dir = join(root, uses);
      const file = ['action.yml', 'action.yaml'].map((f) => join(dir, f)).find(existsSync);
      const action = file ? yaml.load(readFileSync(file, 'utf8')) : null;
      if (action?.runs?.using === 'composite') {
        out.push(...expandSteps(root, action.runs.steps, depth + 1).map((x) => ({ ...x, _from: uses })));
        continue;
      }
    }
    out.push(s);
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
  const evaluate = makeEvaluator({ ...context, secrets, env: {} });
  const baseEnv = { ...workflowDoc.env, ...job.env };
  const persisted = {};
  const results = [];
  let failed = false;
  let inconclusive = false;
  const shell = job?.defaults?.run?.shell ?? workflowDoc?.defaults?.run?.shell ?? 'bash';

  for (const step of expandSteps(root, job.steps)) {
    const name = step.name ?? step.uses ?? String(step.run ?? '').split('\n')[0].slice(0, 60);
    if (!stepShouldRun(step.if, { failed, evaluate })) {
      results.push({ name, status: 'pulado' });
      continue;
    }
    if (step.uses) {
      const u = String(step.uses).split('@')[0];
      results.push({ name, status: ENV_ACTIONS.includes(u) ? 'ambiente' : 'inconclusivo', why: ENV_ACTIONS.includes(u) ? '' : `action ${u} sem equivalente nativo` });
      if (!ENV_ACTIONS.includes(u)) inconclusive = true;
      continue;
    }
    const run = String(step.run ?? '');
    if (skipInstall && /^\s*(npm ci|npm install|bun install|npx playwright install)\b[^\n]*$/.test(run.trim())) {
      results.push({ name, status: 'ambiente', why: 'instalação reaproveitada do node_modules local' });
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
    const env = {
      ...process.env, ...persisted, ...stepEnv, CI: 'true', GITHUB_ACTIONS: 'true',
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
    const r = spawnSync(cmd[0], cmd[1], { cwd: step['working-directory'] ? join(root, step['working-directory']) : root, env, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, timeout: (step['timeout-minutes'] ?? job['timeout-minutes'] ?? 60) * 60_000 });
    // GITHUB_ENV persiste para os próximos passos (formato KEY=VAL; heredoc não suportado).
    for (const line of readFileSync(ghEnv, 'utf8').split('\n')) {
      const m = line.match(/^([A-Za-z_]\w*)=(.*)$/);
      if (m) persisted[m[1]] = m[2];
    }
    const ok = r.status === 0;
    const output = `${r.stdout ?? ''}${r.stderr ?? ''}`;
    results.push({ name, status: ok ? 'ok' : 'FALHOU', ms: Date.now() - t0, tail: ok ? '' : output.split('\n').slice(-25).join('\n') });
    log(`${ok ? '✅' : '❌'} ${name} (${Math.round((Date.now() - t0) / 1000)}s)`);
    if (!ok && !step['continue-on-error']) failed = true;
  }
  rmSync(tmp, { recursive: true, force: true });
  return { status: failed ? 'FALHOU' : inconclusive ? 'inconclusivo' : 'ok', steps: results };
}
