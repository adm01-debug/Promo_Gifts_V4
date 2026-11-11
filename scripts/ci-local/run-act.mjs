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
import { createWriteStream, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const GITHUB_URL = 'https://github.com/adm01-debug/Promo_Gifts_V4.git';

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

/** Lê o JSONL do act e consolida o resultado final de cada job (com matrix). */
export function parseActJsonl(lines) {
  const jobs = new Map();
  let failedStep = new Map();
  for (const line of lines) {
    let o;
    try {
      o = JSON.parse(line);
    } catch {
      continue;
    }
    if (!o.job) continue;
    const display = String(o.job).includes('/') ? String(o.job).split('/').slice(1).join('/') : String(o.job);
    const key = `${o.jobID}|${JSON.stringify(o.matrix ?? {})}`;
    if (o.stepResult === 'failure' && o.stage === 'Main') failedStep.set(key, o.step);
    if (o.jobResult) {
      jobs.set(key, {
        jobId: o.jobID,
        check: checkName(display, o.matrix),
        matrix: o.matrix ?? {},
        result: o.jobResult,
        failedStep: failedStep.get(key) ?? null,
      });
    }
  }
  return [...jobs.values()];
}

/** Roda um workflow inteiro no act; grava o JSONL bruto e devolve os jobs. */
export function runWorkflow({ cloneDir, workflowFile, event, eventPath, logPath, secretsFile, concurrentJobs = 4, timeoutMs = 90 * 60_000, artifactDir, extraArgs = [] }) {
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
      resolve({ exitCode: code, signal, timedOut: signal === 'SIGTERM', jobs: parseActJsonl(lines) });
    });
  });
}

/** Junta o resultado do act com a classificação do inventário → veredito local. */
export function verdict(jobResult, jobInfo, { secretsProvided = [] } = {}) {
  if (!jobResult) return { status: 'não executado', why: 'job não reportou (if: falso, needs pulado ou workflow abortado)' };
  if (jobResult.result === 'success') return { status: 'ok' };
  if (jobResult.result === 'skipped') return { status: 'pulado', why: 'if: falso' };
  if (jobInfo?.cls === 'github-only') return { status: 'só GitHub', why: jobInfo.reasons.join('; ') };
  const missing = (jobInfo?.secrets ?? []).filter((s) => !secretsProvided.includes(s));
  if (jobInfo?.cls === 'secret' && missing.length) return { status: 'inconclusivo', why: `segredo(s) ausente(s): ${missing.join(', ')}` };
  return { status: 'FALHOU', why: jobResult.failedStep ? `passo: ${jobResult.failedStep}` : '' };
}

export function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}
