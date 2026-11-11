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

const SAFE_SECRETS = new Set(['GITHUB_TOKEN']);

/** Actions de preparação de ambiente (não são "trabalho" do job). */
const SETUP_ACTIONS = ['actions/checkout', 'actions/setup-node', 'actions/setup-python', 'denoland/setup-deno', 'actions/cache', 'actions/upload-artifact', 'actions/download-artifact', 'supabase/setup-cli', './.github/actions/setup-node-ci'];

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

/** Classifica UM passo: local | secret | github-only (com motivo e segredos). */
export function classifyStep(step, inherited = []) {
  const uses = step?.uses ? actionName(step.uses) : '';
  const reasons = [];
  if (uses && GITHUB_ONLY_ACTIONS.some((p) => uses === p || uses.startsWith(`${p}/`))) reasons.push(`usa ${uses}`);
  if (uses === 'actions/github-script' && /\.(create|update|delete|add|remove|merge|dispatch)\w*\(/.test(String(step?.with?.script ?? ''))) {
    reasons.push('github-script escreve via API');
  }
  if (uses === './.github/actions/ci-issue') reasons.push('abre issue no GitHub');
  const run = String(step?.run ?? '');
  if (/\bgh\s+(pr|issue|release|api|run|workflow|label|repo|secret|variable)\b/.test(run)) reasons.push('run: gh (API do GitHub)');
  else if (/\bgit\s+push\b/.test(run)) reasons.push('run: git push');
  else if (/api\.github\.com/.test(run)) reasons.push('run: chama api.github.com');
  // Segredos referenciados no passo; os com fallback (`secrets.X || ...`) não bloqueiam.
  const text = yaml.dump(step ?? {});
  const all = secretsIn(text);
  const withFallback = new Set([...text.matchAll(/secrets\.([A-Za-z_]\w*)\s*\|\|/g)].map((m) => m[1]));
  const secrets = [...new Set([...all.filter((x) => !withFallback.has(x)), ...inherited])].sort();
  const cls = reasons.length ? 'github-only' : secrets.length ? 'secret' : 'local';
  return { name: step?.name ?? (uses || run.split('\n')[0].slice(0, 70)), uses: uses || null, cls, reasons, secrets };
}

/**
 * Classifica um job a partir dos passos. O job é:
 *   github-only — se TODO o trabalho depende do GitHub (reusable externo, ou todos os passos não-setup são github-only);
 *   secret      — se algum passo precisa de segredo (o resto roda; falha só vira "inconclusivo" se for nesse passo);
 *   local       — caso contrário.
 * `ctx.workflowSecrets`: segredos usados em env: de nível de workflow (herdados por todos os passos).
 */
export function classifyJob(jobId, job, ctx = {}) {
  const jobEnvSecrets = secretsIn(yaml.dump({ env: job?.env ?? {}, container: job?.container ?? {}, services: job?.services ?? {} }));
  const inherited = [...new Set([...(ctx.workflowSecrets ?? []), ...jobEnvSecrets])];
  const steps = (Array.isArray(job?.steps) ? job.steps : []).map((st) => classifyStep(st, inherited));
  const reasons = [];
  if (job?.permissions && typeof job.permissions === 'object' && job.permissions['id-token'] === 'write') reasons.push('OIDC (id-token: write)');
  const work = steps.filter((st) => !SETUP_ACTIONS.includes(st.uses ?? ''));
  const ghSteps = steps.filter((st) => st.cls === 'github-only');
  let cls = 'local';
  if (job?.uses && !String(job.uses).startsWith('./')) {
    cls = 'github-only';
    reasons.push(`reusable externo ${job.uses}`);
  } else if (work.length && work.every((st) => st.cls === 'github-only')) {
    cls = 'github-only';
  } else if (steps.some((st) => st.cls === 'secret') || (job?.uses && secretsIn(yaml.dump(job.with ?? {}) + yaml.dump(job.secrets ?? {})).length)) {
    cls = 'secret';
  }
  for (const st of ghSteps) reasons.push(`${st.name}: ${st.reasons.join(', ')}`);
  const secrets = [...new Set(steps.flatMap((st) => st.secrets))].sort();
  return {
    id: jobId,
    name: job?.name ?? jobId,
    cls,
    reasons,
    secrets,
    steps,
    needs: [].concat(job?.needs ?? []),
    matrix: Boolean(job?.strategy?.matrix),
    services: Object.keys(job?.services ?? {}),
    reusable: job?.uses ?? null,
    runsOn: job?.['runs-on'] ?? null,
  };
}

export function buildInventory(root) {
  const loaded = loadWorkflows(root);
  const byFile = new Map(loaded.map((w) => [w.file, w]));
  return loaded.map(({ file, text, doc, parseError }) => {
    const triggers = normalizeTriggers(doc);
    const topLevelText = yaml.dump({ env: doc?.env ?? {}, defaults: doc?.defaults ?? {} });
    const workflowSecrets = secretsIn(topLevelText);
    const jobs = Object.entries(doc?.jobs ?? {}).map(([id, job]) => {
      const info = classifyJob(id, job, { workflowSecrets });
      // Reusable local: os passos reais estão no workflow chamado — junta-os ao job chamador
      // (é neles que uma falha acontece; o veredito precisa enxergá-los).
      if (typeof job?.uses === 'string' && job.uses.startsWith('./')) {
        const called = byFile.get(job.uses.split('/').pop());
        if (called) {
          info.calledFile = called.file;
          info.calledName = called.doc?.name ?? called.file;
          const calledSecrets = secretsIn(yaml.dump({ env: called.doc?.env ?? {} }));
          const calledJobs = Object.entries(called.doc?.jobs ?? {}).map(([cid, cjob]) => classifyJob(cid, cjob, { workflowSecrets: calledSecrets }));
          info.steps.push(...calledJobs.flatMap((cj) => cj.steps));
          info.secrets = [...new Set([...info.secrets, ...calledJobs.flatMap((cj) => cj.secrets)])].sort();
          if (info.cls === 'local' && calledJobs.some((cj) => cj.cls === 'secret')) info.cls = 'secret';
          if (calledJobs.length && calledJobs.every((cj) => cj.cls === 'github-only')) info.cls = 'github-only';
        }
      }
      return info;
    });
    return { file, name: doc?.name ?? file, triggers, jobs, parseError, text, hasRun: /\brun:/.test(text) };
  });
}

export function summarize(inventory) {
  const byCls = { local: 0, secret: 0, 'github-only': 0 };
  for (const wf of inventory) for (const j of wf.jobs) byCls[j.cls] += 1;
  return { workflows: inventory.length, jobs: inventory.reduce((n, w) => n + w.jobs.length, 0), byCls };
}
