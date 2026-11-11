// scripts/ci-local/run-act.mjs
// Executa workflows do GitHub Actions localmente com o `act` (Docker), num clone
// isolado do commit alvo, e devolve o resultado de cada job com o MESMO nome de
// check que o GitHub mostra.
//
// Segurança (de propósito):
//   • Nenhum GITHUB_TOKEN/PAT é repassado → nada pode escrever no GitHub
//     (comentar PR, abrir issue, push, release). Jobs que dependem disso são
//     reportados como "github-only", não como falha.
//   • Segredos só entram se o usuário apontar um arquivo (--secrets); o `.secrets`
//     padrão do act NUNCA é lido (passamos --secret-file explícito).
//   • Clone isolado: o worktree do usuário não é tocado nem montado.
import { spawn, execFileSync } from 'node:child_process';
import { cpSync, createWriteStream, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const GITHUB_URL = 'https://github.com/adm01-debug/Promo_Gifts_V4.git';

/**
 * Prepara os shims locais (actions que dependem da API do GitHub) e devolve os
 * argumentos --local-repository para cada ref usada nos workflows.
 * Hoje: dorny/paths-filter (lista de arquivos da PR via API → git diff local).
 */
export function prepareShims({ root, workflowsText, dest }) {
  const src = join(root, 'scripts', 'ci-local', 'shims', 'paths-filter');
  const dir = join(dest, 'paths-filter');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, 'vendor'), { recursive: true });
  cpSync(src, dir, { recursive: true });
  cpSync(join(root, 'node_modules', 'js-yaml', 'dist', 'js-yaml.mjs'), join(dir, 'vendor', 'js-yaml.mjs'));
  cpSync(join(root, 'node_modules', 'picomatch'), join(dir, 'vendor', 'picomatch'), { recursive: true });
  const refs = [...new Set([...workflowsText.matchAll(/dorny\/paths-filter@([0-9A-Za-z._-]+)/g)].map((m) => m[1]))];
  return refs.flatMap((ref) => ['--local-repository', `dorny/paths-filter@${ref}=${dir}`]);
}

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

/** Clone raso e independente (sem alternates) do commit alvo + ref origin/<base>. */
export function prepareClone({ repoRoot, sha, baseRef = 'origin/main', dest, depth = 80 }) {
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  const commonDir = git(repoRoot, 'rev-parse', '--path-format=absolute', '--git-common-dir');
  execFileSync('git', ['clone', '-q', '--no-checkout', `--depth=${depth}`, '--no-single-branch', `file://${commonDir}`, dest], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // O commit alvo pode não estar na ponta de nenhum branch do clone raso: busca-o explicitamente.
  try {
    git(dest, 'cat-file', '-e', `${sha}^{commit}`);
  } catch {
    git(dest, 'fetch', '-q', `--depth=${depth}`, `file://${commonDir}`, sha);
  }
  git(dest, 'checkout', '-q', '--detach', sha);
  const baseSha = git(repoRoot, 'rev-parse', baseRef);
  try {
    git(dest, 'cat-file', '-e', `${baseSha}^{commit}`);
  } catch {
    git(dest, 'fetch', '-q', `--depth=${depth}`, `file://${commonDir}`, baseSha);
  }
  git(dest, 'update-ref', 'refs/remotes/origin/main', baseSha);
  git(dest, 'remote', 'set-url', 'origin', GITHUB_URL);
  return { dir: dest, sha, baseSha };
}

/** Payload mínimo e coerente do evento, como o GitHub entregaria. */
export function buildEvent({ event, sha, baseSha, headRef, baseRef = 'main', labels = [] }) {
  const repository = { full_name: 'adm01-debug/Promo_Gifts_V4', name: 'Promo_Gifts_V4', default_branch: 'main', owner: { login: 'adm01-debug' } };
  if (event === 'pull_request' || event === 'pull_request_target') {
    return {
      action: 'synchronize',
      number: 0,
      repository,
      pull_request: {
        number: 0,
        draft: false,
        labels: labels.map((name) => ({ name })),
        head: { sha, ref: headRef, repo: { full_name: repository.full_name } },
        base: { sha: baseSha, ref: baseRef, repo: { full_name: repository.full_name } },
      },
    };
  }
  if (event === 'push') return { ref: `refs/heads/${headRef}`, before: baseSha, after: sha, repository, head_commit: { id: sha } };
  if (event === 'schedule') return { schedule: '0 0 * * *', repository };
  if (event === 'workflow_dispatch') return { inputs: {}, ref: `refs/heads/${headRef}`, repository };
  return { repository };
}

/** Nome do check como o GitHub mostra: nome do job + " (valores da matrix)" quando houver. */
export function checkName(jobName, matrix) {
  const values = matrix && typeof matrix === 'object' ? Object.values(matrix) : [];
  if (!values.length || /\(.*\)\s*$/.test(jobName)) return jobName;
  return `${jobName} (${values.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join(', ')})`;
}

/**
 * Nome de exibição do job a partir do campo `job` do act:
 *   "<Nome do workflow>/<Nome do job>"                       → "<Nome do job>"
 *   "<job chamador>/<Nome do workflow chamado>/<Nome do job>" → "<chamador> / <Nome do job>" (como o GitHub)
 * Nomes de job podem conter "/", então o corte usa os nomes conhecidos (ctx), não split cego.
 */
export function displayName(actJob, ctx = {}) {
  const s = String(actJob).trim();
  if (ctx.workflowName && s.startsWith(`${ctx.workflowName}/`)) return s.slice(ctx.workflowName.length + 1).trim();
  const hit = matchReusable(s, ctx);
  if (hit) return `${hit.callerName ?? hit.callerId} / ${hit.rest}`;
  const i = s.indexOf('/');
  return i >= 0 ? s.slice(i + 1).trim() : s;
}

/** O act prefixa jobs reutilizáveis com o NOME do job chamador (ou o id, se não houver nome). */
export function matchReusable(actJob, ctx = {}) {
  const s = String(actJob).trim();
  for (const r of ctx.reusable ?? []) {
    for (const head of [r.callerName, r.callerId].filter(Boolean)) {
      const prefix = `${head}/${r.calledName}/`;
      if (s.startsWith(prefix)) return { ...r, rest: s.slice(prefix.length).trim() };
    }
  }
  return null;
}

/** Lê o JSONL do act e consolida o resultado final de cada job (com matrix). */
export function parseActJsonl(lines, ctx = {}) {
  const jobs = new Map();
  const failedStep = new Map();
  for (const line of lines) {
    let o;
    try {
      o = JSON.parse(line);
    } catch {
      continue;
    }
    if (!o.job) continue;
    const display = displayName(o.job, ctx);
    const key = `${o.job}|${JSON.stringify(o.matrix ?? {})}`;
    if (o.stepResult === 'failure' && o.stage === 'Main') failedStep.set(key, [...(failedStep.get(key) ?? []), o.step]);
    if (o.jobResult) {
      const reusable = matchReusable(o.job, ctx);
      jobs.set(key, {
        jobId: reusable ? reusable.callerId : o.jobID,
        check: checkName(display, o.matrix),
        matrix: o.matrix ?? {},
        result: o.jobResult,
        failedStep: (failedStep.get(key) ?? [])[0] ?? null,
        failedSteps: failedStep.get(key) ?? [],
      });
    }
  }
  return [...jobs.values()];
}

/** Roda um workflow inteiro no act; grava o JSONL bruto e devolve os jobs. */
export function runWorkflow({ cloneDir, workflowFile, event, eventPath, logPath, secretsFile, concurrentJobs = 4, timeoutMs = 90 * 60_000, artifactDir, extraArgs = [], nameCtx = {} }) {
  return new Promise((resolve) => {
    const args = [
      event,
      '-W', `.github/workflows/${workflowFile}`,
      '-e', eventPath,
      '--json',
      '--secret-file', secretsFile && existsSync(secretsFile) ? secretsFile : '/dev/null',
      '--var-file', '/dev/null',
      '--concurrent-jobs', String(concurrentJobs),
      '--artifact-server-path', artifactDir,
      ...extraArgs,
    ];
    const out = createWriteStream(logPath);
    const lines = [];
    const child = spawn('act', args, { cwd: cloneDir, env: { ...process.env, GITHUB_TOKEN: '' } });
    let buf = '';
    const onData = (chunk) => {
      out.write(chunk);
      buf += chunk;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        lines.push(buf.slice(0, i));
        buf = buf.slice(i + 1);
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', (c) => out.write(c));
    const timer = setTimeout(() => child.kill('SIGTERM'), timeoutMs);
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      if (buf) lines.push(buf);
      out.end();
      resolve({ exitCode: code, signal, timedOut: signal === 'SIGTERM', jobs: parseActJsonl(lines, nameCtx) });
    });
  });
}

/** Junta o resultado do act com a classificação do inventário → veredito local. */
export function verdict(jobResult, jobInfo, { secretsProvided = [] } = {}) {
  if (!jobResult) return { status: 'não executado', why: 'job não reportou (if: falso, needs pulado ou workflow abortado)' };
  if (jobResult.result === 'success') {
    // Passos neutralizados no clone (segredo ausente / API do GitHub) que falharam: o resto passou.
    const unverified = (jobResult.failedSteps ?? []).filter((n) => {
      const st = (jobInfo?.steps ?? []).find((x) => x.name === n);
      return st && (st.cls === 'github-only' || st.secrets.some((x) => !secretsProvided.includes(x)));
    });
    if (unverified.length) return { status: 'ok-parcial', why: `não verificado(s) sem segredo/GitHub: ${[...new Set(unverified)].join('; ')}` };
    return { status: 'ok' };
  }
  if (jobResult.result === 'skipped') return { status: 'pulado', why: 'if: falso' };
  if (jobInfo?.cls === 'github-only') return { status: 'só GitHub', why: jobInfo.reasons.join('; ') };
  // Decide pelo PASSO que falhou: só ele pode justificar "inconclusivo"/"só GitHub".
  const step = jobResult.failedStep ? (jobInfo?.steps ?? []).find((s) => s.name === jobResult.failedStep) : null;
  if (step?.cls === 'github-only') return { status: 'só GitHub', why: `passo ${step.name}: ${step.reasons.join(', ')}` };
  const missing = (step?.secrets ?? []).filter((s) => !secretsProvided.includes(s));
  if (step && missing.length) return { status: 'inconclusivo', why: `passo ${step.name}: segredo(s) ausente(s): ${missing.join(', ')}` };
  // Passo não identificado (ex.: falha em action composta) num job que usa segredos: não afirmar regressão.
  const jobMissing = (jobInfo?.secrets ?? []).filter((s) => !secretsProvided.includes(s));
  if (!step && jobInfo?.cls === 'secret' && jobMissing.length) {
    return { status: 'inconclusivo', why: `passo "${jobResult.failedStep ?? '?'}" não mapeado; job usa segredo(s) ausente(s): ${jobMissing.join(', ')}` };
  }
  return { status: 'FALHOU', why: jobResult.failedStep ? `passo: ${jobResult.failedStep}` : '' };
}

/**
 * Cópia do workflow SÓ para o clone isolado: passos que precisam de segredo ausente ou da API do
 * GitHub ganham `continue-on-error: true`, para que o resto do job (e os jobs dependentes, como o
 * Gate Final) rode e seja verificado. Esses passos saem no relatório como "não verificado".
 * Devolve quantos passos foram neutralizados. O repositório do usuário nunca é alterado.
 */
export function neutralizeUnverifiable(doc, classify, secretsProvided = []) {
  let n = 0;
  for (const job of Object.values(doc?.jobs ?? {})) {
    for (const step of job?.steps ?? []) {
      const info = classify(step);
      const missing = info.secrets.filter((x) => !secretsProvided.includes(x));
      if ((info.cls === 'github-only' || missing.length) && step['continue-on-error'] !== true) {
        step['continue-on-error'] = true;
        n += 1;
      }
    }
  }
  return n;
}

export function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}
