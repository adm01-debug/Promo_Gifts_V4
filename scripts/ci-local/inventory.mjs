// scripts/ci-local/inventory.mjs
// Lê TODOS os workflows de .github/workflows e classifica cada job pelo que ele
// precisa para rodar fora do GitHub. Nenhuma execução acontece aqui (puro).
//
// Classes (da mais para a menos executável localmente):
//   local        — roda no act sem segredo nem API do GitHub.
//   secret       — referencia segredo além de GITHUB_TOKEN; roda se o segredo for fornecido.
//   github-only  — depende da API/infra do GitHub (CodeQL, dependency-review, comentar PR,
//                  abrir issue, release, OIDC/attest...). Sem token não há como reproduzir,
//                  e de propósito NÃO repassamos token: o CI local nunca escreve no GitHub.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

/** Actions que só funcionam contra a API/infra do GitHub (prefixo antes do @). */
export const GITHUB_ONLY_ACTIONS = [
  'github/codeql-action',
  'actions/dependency-review-action',
  'actions/attest-build-provenance',
  'googleapis/release-please-action',
  'actions/stale',
  'crazy-max/ghaction-github-labeler',
  'actions/labeler',
  'peter-evans/create-pull-request',
  'peter-evans/create-or-update-comment',
  'marocchino/sticky-pull-request-comment',
  'actions/create-github-app-token',
];

/** Comandos em `run:` que escrevem no GitHub ou dependem da API autenticada. */
const GITHUB_API_RUN = [
  /\bgh\s+(pr|issue|release|api|run|workflow|label|repo|secret|variable)\b/,
  /\bgit\s+push\b/,
  /api\.github\.com/,
];

const SAFE_SECRETS = new Set(['GITHUB_TOKEN']);

export function loadWorkflows(root) {
  const dir = join(root, '.github', 'workflows');
  const files = readdirSync(dir).filter((f) => /\.ya?ml$/.test(f)).sort();
  return files.map((file) => {
    const text = readFileSync(join(dir, file), 'utf8');
    let doc;
    let parseError = null;
    try {
      doc = yaml.load(text) ?? {};
    } catch (error) {
      doc = {};
      parseError = error.message;
    }
    return { file, text, doc, parseError };
  });
}

/** Normaliza `on:` (string | lista | objeto; js-yaml lê `on` como chave "on"). */
export function normalizeTriggers(doc) {
  const on = doc?.on ?? doc?.true;
  if (!on) return {};
  if (typeof on === 'string') return { [on]: {} };
  if (Array.isArray(on)) return Object.fromEntries(on.map((e) => [e, {}]));
  return Object.fromEntries(Object.entries(on).map(([k, v]) => [k, v ?? {}]));
}

function secretsIn(text) {
  const found = new Set();
  for (const m of String(text).matchAll(/secrets\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
    if (!SAFE_SECRETS.has(m[1])) found.add(m[1]);
  }
  return [...found].sort();
}

function actionName(uses) {
  return String(uses).split('@')[0];
}

/** Classifica um job. `ctx.workflowText` permite herdar segredos de nível de workflow (env:). */
export function classifyJob(jobId, job, ctx = {}) {
  const reasons = [];
  const jobText = yaml.dump(job ?? {});
  const steps = Array.isArray(job?.steps) ? job.steps : [];
  const uses = steps.map((s) => s?.uses).filter(Boolean).map(actionName);
  if (job?.uses) uses.push(actionName(job.uses));

  const githubOnly = uses.filter((u) => GITHUB_ONLY_ACTIONS.some((p) => u === p || u.startsWith(`${p}/`)));
  if (githubOnly.length) reasons.push(`usa ${[...new Set(githubOnly)].join(', ')}`);

  const runText = steps.map((s) => s?.run ?? '').join('\n');
  for (const re of GITHUB_API_RUN) {
    if (re.test(runText)) {
      reasons.push(`run: chama ${re.source.replace(/\\[bs]/g, '').replace(/\\/g, '')}`);
      break;
    }
  }
  // github-script só é github-only quando escreve (comenta, cria issue/label, dispara workflow).
  const scriptBodies = steps.filter((s) => actionName(s?.uses ?? '') === 'actions/github-script').map((s) => String(s?.with?.script ?? ''));
  if (scriptBodies.some((b) => /\.(create|update|delete|add|remove|merge|dispatch|createComment|createLabel|addLabels)\w*\(/.test(b))) {
    reasons.push('github-script escreve via API');
  }
  // ./.github/actions/ci-issue abre issue no GitHub.
  if (uses.includes('./.github/actions/ci-issue') && !reasons.length) {
    // só a etapa de issue depende do GitHub; o job em si roda — o act falha só nessa etapa
    // quando ela é alcançada (if: failure()). Não rebaixa o job inteiro.
  }
  if (job?.permissions && typeof job.permissions === 'object' && job.permissions['id-token'] === 'write') {
    reasons.push('OIDC (id-token: write)');
  }

  const secrets = [...new Set([...secretsIn(jobText), ...(ctx.workflowSecrets ?? [])])].sort();
  let cls = 'local';
  if (reasons.length) cls = 'github-only';
  else if (secrets.length) cls = 'secret';

  return {
    id: jobId,
    name: job?.name ?? jobId,
    cls,
    reasons,
    secrets,
    needs: [].concat(job?.needs ?? []),
    matrix: Boolean(job?.strategy?.matrix),
    services: Object.keys(job?.services ?? {}),
    reusable: job?.uses ?? null,
    runsOn: job?.['runs-on'] ?? null,
  };
}

export function buildInventory(root) {
  return loadWorkflows(root).map(({ file, text, doc, parseError }) => {
    const triggers = normalizeTriggers(doc);
    const topLevelText = yaml.dump({ env: doc?.env ?? {}, defaults: doc?.defaults ?? {} });
    const workflowSecrets = secretsIn(topLevelText);
    const jobs = Object.entries(doc?.jobs ?? {}).map(([id, job]) => classifyJob(id, job, { workflowSecrets }));
    return { file, name: doc?.name ?? file, triggers, jobs, parseError, hasRun: /\brun:/.test(text) };
  });
}

export function summarize(inventory) {
  const byCls = { local: 0, secret: 0, 'github-only': 0 };
  for (const wf of inventory) for (const j of wf.jobs) byCls[j.cls] += 1;
  return { workflows: inventory.length, jobs: inventory.reduce((n, w) => n + w.jobs.length, 0), byCls };
}
