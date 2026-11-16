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
export function prepareShims({ root, workflowsText, dest, artifactsDir }) {
  const base = join(root, 'scripts', 'ci-local', 'shims');
  const args = [];
  const refsOf = (action) => [...new Set([...workflowsText.matchAll(new RegExp(`${action.replace('/', '\\/')}@([0-9A-Za-z._-]+)`, 'g'))].map((m) => m[1]))];
  const stage = (shim, vendor = false) => {
    const dir = join(dest, shim);
    rmSync(dir, { recursive: true, force: true });
    cpSync(join(base, shim), dir, { recursive: true });
    cpSync(join(base, 'artifact-store.mjs'), join(dir, 'artifact-store.mjs'));
    if (vendor) {
      mkdirSync(join(dir, 'vendor'), { recursive: true });
      cpSync(join(root, 'node_modules', 'js-yaml', 'dist', 'js-yaml.mjs'), join(dir, 'vendor', 'js-yaml.mjs'));
      cpSync(join(root, 'node_modules', 'picomatch'), join(dir, 'vendor', 'picomatch'), { recursive: true });
    }
    return dir;
  };
  // paths-filter: lista de arquivos da PR via API → git diff local.
  const pf = stage('paths-filter', true);
  for (const ref of refsOf('dorny/paths-filter')) args.push('--local-repository', `dorny/paths-filter@${ref}=${pf}`);
  // upload/download-artifact v4+: protocolo novo que o servidor do act não entende → diretório compartilhado.
  const up = stage('upload-artifact');
  const down = stage('download-artifact');
  for (const ref of refsOf('actions/upload-artifact')) args.push('--local-repository', `actions/upload-artifact@${ref}=${up}`);
  for (const ref of refsOf('actions/download-artifact')) args.push('--local-repository', `actions/download-artifact@${ref}=${down}`);
  if (artifactsDir) {
    mkdirSync(artifactsDir, { recursive: true });
    args.push('--container-options', `-v ${artifactsDir}:/ci-local-artifacts`);
  }
  return args;
}

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

/** Clone raso e independente (sem alternates) do commit alvo + ref origin/<base>. */
export function prepareClone({ repoRoot, sha, baseRef = 'origin/main', dest, depth = 80, headRef = null }) {
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
  // Gates que comparam origin/<base>...origin/<head> (ex.: E188) precisam do ref do branch da PR.
  if (headRef && headRef !== 'main' && headRef !== 'detached') {
    git(dest, 'update-ref', `refs/remotes/origin/${headRef}`, sha);
    git(dest, 'update-ref', `refs/heads/${headRef}`, sha);
  }
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

/** Variáveis que dariam escrita no GitHub a um processo filho. */
export const TOKEN_ENV = ['GITHUB_TOKEN', 'GH_TOKEN', 'GH_ENTERPRISE_TOKEN', 'GITHUB_ENTERPRISE_TOKEN', 'GITHUB_PAT', 'GH_PAT'];

/**
 * Ambiente do processo filho sem nenhuma credencial do GitHub: tira os tokens, aponta o `gh`
 * para uma configuração vazia e desliga credential helpers/ssh-agent do git.
 */
export function tokenlessEnv(emptyGhDir) {
  const env = { ...process.env };
  for (const k of TOKEN_ENV) delete env[k];
  delete env.SSH_AUTH_SOCK;
  return { ...env, GH_CONFIG_DIR: emptyGhDir, GIT_TERMINAL_PROMPT: '0', GIT_ASKPASS: '/bin/false', GIT_CONFIG_NOSYSTEM: '1' };
}

/** Recusa arquivo de segredos que traga credencial do GitHub (o CI local nunca escreve no GitHub). */
export function assertNoGithubTokenInSecrets(names) {
  const bad = names.filter((n) => TOKEN_ENV.includes(n));
  if (bad.length) throw new Error(`arquivo de segredos não pode conter ${bad.join(', ')}: o CI local nunca recebe credencial do GitHub`);
}

/** Normaliza nome de passo: `${{ … }}` vira curinga e `@ref` final some (o act reporta `uses@sha`). */
export function sameStepName(yamlName, actName) {
  const norm = (s) => String(s ?? '').replace(/@[^@\s]+$/, '').trim();
  const a = norm(yamlName);
  const b = norm(actName);
  if (a === b) return true;
  if (!a.includes('${{')) return false;
  const re = a.split(/\$\{\{[\s\S]*?\}\}/).map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
  return new RegExp(`^${re}$`).test(b);
}

/** Roda um workflow inteiro no act; grava o JSONL bruto e devolve os jobs. */
/**
 * Passo do YAML correspondente ao nome reportado pelo act: nome exato primeiro; curinga
 * (`${{ }}`) só se casar com UM passo — ambíguo = não mapeado (vira FALHOU, nunca esconde).
 */
export function matchStep(steps, actName) {
  const exact = steps.find((x) => x.name === actName);
  if (exact) return exact;
  const wild = steps.filter((x) => sameStepName(x.name, actName));
  return wild.length === 1 ? wild[0] : undefined;
}

const DOCKER_RE = /\bdocker(?:-compose\b|\s+[a-z])|\buses:\s*['"]?docker\/(?:build-push|setup-buildx)|\bsupabase\s+(?:--?\S+(?:\s+(?!start\b|db\b|test\b|functions\b)[^-\s]\S*)?\s+)*(?:start|db\s+(?:start|dump|diff|reset|pull)|test\s+db|functions\s+serve)\b/;

/**
 * O workflow chama docker de dentro de um passo (precisa do socket do daemon)? Ignora
 * comentários e segue workflows reutilizáveis/actions compostas locais (`uses: ./…`).
 * `services:`/`container:`/`uses: docker://` não precisam: o act os cria no daemon do host.
 */
export function workflowNeedsDocker(text, readLocal = () => '', seen = new Set()) {
  const t = String(text).split('\n').map((l) => l.replace(/(^|\s)#.*$/, '')).join('\n');
  if (DOCKER_RE.test(t)) return true;
  for (const [, p] of t.matchAll(/uses:\s*['"]?(\.\/[^\s'"@]+)/g)) {
    if (seen.has(p)) continue;
    seen.add(p);
    let sub = '';
    try {
      sub = readLocal(p);
    } catch {
      sub = '';
    }
    if (workflowNeedsDocker(sub, readLocal, seen)) return true;
  }
  return false;
}

/** Token do GitHub em qualquer posição (gh*_ / github_pat_). */
export const GITHUB_TOKEN_VALUE_RE = /(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/; // sem \b: pega xghp_…/_ghp_…

/**
 * Lê um arquivo de segredos como o act (godotenv): `NOME=v`, `export NOME=v`, `NOME: v`,
 * aspas opcionais. Recusa credencial do GitHub por nome OU por valor.
 */
export function parseSecretsText(text) {
  const values = {};
  for (const l of String(text).split(/\r?\n/)) {
    const m = l.match(/^\s*(?:export\s+)?([A-Za-z_]\w*)\s*[=:]\s*(.*?)\s*$/);
    if (!m || l.trim().startsWith('#')) continue;
    const raw = m[2];
    // como o godotenv: sem aspas, ' #' inicia comentário
    values[m[1]] = /^['"]/.test(raw) ? raw.replace(/^(['"])(.*)\1$/, '$2') : raw.replace(/\s+#.*$/, '');
  }
  // o act resolve secrets.* sem diferenciar maiúsculas: github_token=… também injetaria o token
  assertNoGithubTokenInSecrets(Object.keys(values).map((k) => k.toUpperCase()));
  if (String(text).match(GITHUB_TOKEN_VALUE_RE)) throw new Error('arquivo de segredos contém um token do GitHub (gh*_ / github_pat_): o CI local nunca recebe credencial do GitHub');
  return values;
}

export function runWorkflow({ cloneDir, workflowFile, event, eventPath, logPath, secretsFile, concurrentJobs = 4, timeoutMs = 90 * 60_000, artifactDir, extraArgs = [], nameCtx = {}, allowDocker = false }) {
  return new Promise((resolve) => {
    const args = [
      event,
      '-W', `.github/workflows/${workflowFile}`,
      '-e', eventPath,
      '--json',
      '--secret-file', secretsFile && existsSync(secretsFile) ? secretsFile : '/dev/null',
      // Sem isto o act roda `gh auth token` sozinho e injeta o token do usuário em
      // secrets.GITHUB_TOKEN de todos os jobs (provado: API devolveu 200).
      '-s', 'GITHUB_TOKEN=',
      '--var-file', '/dev/null',
      '--env-file', '/dev/null',
      '--input-file', '/dev/null',
      // Socket do Docker dentro do job = root no host (lê ~/.config/gh/hosts.yml, monta /).
      // Só para workflows que chamam docker num passo; os demais rodam sem ele.
      '--container-daemon-socket', allowDocker ? 'unix:///var/run/docker.sock' : '-',
      '--concurrent-jobs', String(concurrentJobs),
      '--artifact-server-path', artifactDir,
      ...extraArgs,
    ];
    const out = createWriteStream(logPath);
    const lines = [];
    const child = spawn('act', args, { cwd: cloneDir, env: tokenlessEnv(join(cloneDir, '.no-gh')) });
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
  const findStep = (n) => matchStep(jobInfo?.steps ?? [], n);
  if (jobResult.result === 'success') {
    // Passos neutralizados no clone (segredo ausente) que falharam: o resto passou.
    const unverified = (jobResult.failedSteps ?? []).filter((n) => {
      const st = findStep(n);
      return st && (st.cls === 'github-only' || st.secrets.some((x) => !secretsProvided.includes(x)));
    });
    // Passos só-GitHub são PULADOS no clone (nunca rodam sem token): também não verificados.
    const skippedGh = (jobInfo?.steps ?? []).filter((x) => x.cls === 'github-only').map((x) => x.name);
    const all = [...new Set([...unverified, ...skippedGh])];
    if (all.length) return { status: 'ok-parcial', why: `não verificado(s) sem segredo/GitHub: ${all.join('; ')}` };
    return { status: 'ok' };
  }
  if (jobResult.result === 'skipped') return { status: 'pulado', why: 'if: falso' };
  if (jobInfo?.cls === 'github-only') return { status: 'só GitHub', why: jobInfo.reasons.join('; ') };
  // Considera TODOS os passos que falharam: basta um "verificável" (não depende de segredo
  // ausente nem da API do GitHub) para o job ser FALHOU — nunca esconder falha real atrás
  // de um passo inconclusivo que falhou antes.
  const failed = jobResult.failedSteps?.length ? jobResult.failedSteps : [jobResult.failedStep].filter(Boolean);
  const steps = jobInfo?.steps ?? [];
  const unverifiable = (name) => {
    const st = matchStep(steps, name);
    if (!st) return null; // passo não mapeado
    if (st.cls === 'github-only') return `passo ${st.name}: ${st.reasons.join(', ')}`;
    const missing = st.secrets.filter((x) => !secretsProvided.includes(x));
    return missing.length ? `passo ${st.name}: segredo(s) ausente(s): ${missing.join(', ')}` : null;
  };
  const isMapped = (n) => Boolean(matchStep(steps, n));
  const real = failed.find((n) => isMapped(n) && !unverifiable(n));
  if (real) return { status: 'FALHOU', why: `passo: ${real}` };
  // Passo que não se consegue ligar ao YAML NÃO é presumido inconclusivo: falha não provada
  // como dependente de segredo é falha (nunca esconder regressão real).
  const unmapped = failed.find((n) => !isMapped(n));
  if (unmapped) return { status: 'FALHOU', why: `passo: ${unmapped} (não mapeado no YAML; tratado como falha real)` };
  if (failed.length) {
    const ghOnly = failed.every((n) => matchStep(steps, n)?.cls === 'github-only');
    return { status: ghOnly ? 'só GitHub' : 'inconclusivo', why: failed.map(unverifiable).join('; ') };
  }
  return { status: 'FALHOU', why: 'job falhou sem passo identificado' };
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
      // Só-GitHub (comentar PR, abrir issue, push, release…): PULADO no clone — nunca roda localmente.
      if (info.cls === 'github-only') {
        step.if = 'false';
        n += 1;
        continue;
      }
      if (missing.length && step['continue-on-error'] !== true) {
        step['continue-on-error'] = true;
        n += 1;
      }
    }
  }
  return n;
}

/**
 * O act não executa jobs `if: always()` depois que um job reutilizável falha (limitação do act);
 * no GitHub eles rodam e agregam os `needs` (ex.: Gate Final). Quando isso acontece e todos os
 * needs reportaram, o veredito é EMULADO a partir deles — e sinalizado como tal.
 */
export function emulateAlwaysJob(jobInfo, byJobId) {
  if (!jobInfo?.always || !jobInfo.needs.length) return null;
  const needs = jobInfo.needs.map((n) => byJobId.get(n));
  if (needs.some((n) => !n)) return null;
  // `não executado`/`só GitHub` num need: o GitHub teria um resultado que não temos → inconclusivo.
  const order = ['FALHOU', 'não executado', 'inconclusivo', 'só GitHub', 'ok-parcial'];
  const worst = order.find((st) => needs.some((n) => n.status === st));
  const status = worst === 'não executado' || worst === 'só GitHub' ? 'inconclusivo' : (worst ?? 'ok');
  const detail = worst ? needs.filter((n) => n.status === worst).map((n) => n.check).join('; ') : '';
  return { status, why: `EMULADO (act não roda always() após falha em reutilizável) a partir de ${needs.length} needs${detail ? ` — ${worst}: ${detail}` : ''}` };
}

export function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}
