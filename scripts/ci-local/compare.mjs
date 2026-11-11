// scripts/ci-local/compare.mjs
// Cruza o resultado local (report.json) com os check-runs do GitHub para o mesmo
// commit. Só LÊ a API (gh api, GET) — nada é escrito no GitHub.
import { execFileSync } from 'node:child_process';

const REPO = 'adm01-debug/Promo_Gifts_V4';

export function fetchGithubChecks(sha) {
  const out = execFileSync('gh', ['api', '--paginate', `repos/${REPO}/commits/${sha}/check-runs?per_page=100`, '--jq', '.check_runs[] | [.name, (.conclusion // .status)] | @tsv'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const map = new Map();
  for (const line of out.split('\n').filter(Boolean)) {
    const [name, state] = line.split('\t');
    // mesmo nome repetido (re-run): falha em qualquer tentativa vence só se não houver sucesso posterior;
    // a API devolve a mais recente primeiro, então mantemos a primeira ocorrência.
    if (!map.has(name)) map.set(name, state);
  }
  return map;
}

const norm = (s) => {
  if (['success', 'ok'].includes(s)) return 'ok';
  if (['failure', 'FALHOU', 'timed_out', 'startup_failure'].includes(s)) return 'falha';
  if (['skipped', 'pulado', 'neutral', 'não executado'].includes(s)) return 'pulado';
  if (['cancelled'].includes(s)) return 'cancelado';
  if (['queued', 'in_progress', 'pending', 'waiting'].includes(s)) return 'pendente';
  return s;
};

/** @returns {{rows:Array, counts:Object}} */
export function compareResults(localJobs, githubMap) {
  const rows = [];
  const seen = new Set();
  for (const j of localJobs) {
    seen.add(j.check);
    const gh = githubMap.get(j.check);
    const l = norm(j.status);
    const g = gh === undefined ? 'ausente' : norm(gh);
    let kind;
    if (g === 'ausente') kind = 'só local';
    else if (['inconclusivo', 'só GitHub'].includes(j.status)) kind = 'não comparável';
    else if (g === 'pendente' || g === 'cancelado') kind = 'GitHub sem resultado';
    else kind = l === g ? 'igual' : 'DIVERGE';
    rows.push({ check: j.check, local: j.status, github: gh ?? '—', kind });
  }
  for (const [name, state] of githubMap) {
    if (!seen.has(name)) rows.push({ check: name, local: '—', github: state, kind: 'só GitHub' });
  }
  const counts = rows.reduce((acc, r) => ((acc[r.kind] = (acc[r.kind] ?? 0) + 1), acc), {});
  return { rows: rows.sort((a, b) => a.kind.localeCompare(b.kind) || a.check.localeCompare(b.check)), counts };
}
