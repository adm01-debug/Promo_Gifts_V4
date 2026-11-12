#!/usr/bin/env node
// scripts/ci-local/index.mjs — roda localmente os workflows do GitHub Actions.
//
//   npm run ci:local:list                 inventário: todos os workflows/jobs e o que dispararia agora
//   npm run ci:local                      roda no act (Docker) tudo que o GitHub rodaria numa PR contra main
//   npm run ci:local -- --all             roda TODOS os workflows do evento, ignorando filtros de paths
//   npm run ci:local -- --event schedule  idem para os agendados (nightly/fuzz/semanais)
//   npm run ci:local -- --workflow deploy-gates.yml,ci.yml
//   npm run ci:local:fast                 modo nativo rápido (sem Docker), sem E2E/Lighthouse
//   npm run ci:local:compare              cruza o último resultado local com os checks do GitHub
//   npm run ci:local:extras               roda os scripts test:/check: que NENHUM workflow roda (--list só lista)
//
// Segredos (opcional): arquivo KEY=VALUE em ~/.config/ci-local/secrets.env (ou --secrets <arq>).
// Sem eles, jobs que precisam de segredo saem como "inconclusivo", nunca como "falhou".
// Nenhum token do GitHub é repassado: o CI local NUNCA escreve no GitHub.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { buildInventory, summarize } from './inventory.mjs';
import { selectWorkflows } from './select.mjs';
import { parseSecretsText, workflowNeedsDocker, buildEvent, emulateAlwaysJob, neutralizeUnverifiable, prepareClone, prepareShims, runWorkflow, verdict, writeJson } from './run-act.mjs';
import { classifyStep } from './inventory.mjs';
import { runJobNative } from './native.mjs';
import { compareResults, fetchGithubChecks } from './compare.mjs';
import { findUncovered } from './extras.mjs';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../..');
const OUT = join(ROOT, '.ci-local');
// O clone (cópia inteira do repo) fica FORA do worktree: dentro dele, os scanners do repositório
// (guards de pre-commit, rg, eslint) varreriam a cópia e acusariam achados duplicados.
const CLONE_DIR = join(process.env.XDG_CACHE_HOME || join(homedir(), '.cache'), 'ci-local', `${basename(ROOT)}-${createHash('sha1').update(ROOT).digest('hex').slice(0, 8)}`, 'clone');

function parseArgs(argv) {
  const [cmd = 'run', ...rest] = argv;
  const o = { cmd, unsafe: false, listOnly: false, event: 'pull_request', base: 'origin/main', sha: 'HEAD', all: false, workflows: [], exclude: [], jobs: 2, timeout: 90, secrets: null, withE2E: false, strict: false, run: 'latest', json: false, trusted: false };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    const next = () => rest[++i];
    if (a === '--event') o.event = next();
    else if (a === '--base') o.base = next();
    else if (a === '--sha') o.sha = next();
    else if (a === '--all') o.all = true;
    else if (a === '--workflow' || a === '-w') o.workflows.push(...next().split(','));
    else if (a === '--exclude') o.exclude.push(...next().split(','));
    else if (a === '--jobs') o.jobs = Number(next());
    else if (a === '--timeout') o.timeout = Number(next());
    else if (a === '--secrets') o.secrets = next();
    else if (a === '--with-e2e') o.withE2E = true;
    else if (a === '--strict') o.strict = true;
    else if (a === '--run') o.run = next();
    else if (a === '--json') o.json = true;
    else if (a === '--unsafe') o.unsafe = true;
    else if (a === '--codigo-confiavel') o.trusted = true;
    else if (a === '--list') o.listOnly = true;
    else if (a === '-h' || a === '--help') o.cmd = 'help';
    else throw new Error(`argumento desconhecido: ${a}`);
  }
  return o;
}

const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();

function changedFiles(base, sha) {
  const mb = git('merge-base', base, sha);
  const committed = git('diff', '--name-only', mb, sha).split('\n').filter(Boolean);
  // Em HEAD, inclui também o que está modificado/novo no working tree (ainda não commitado).
  const dirty = sha === 'HEAD' ? git('status', '--porcelain').split('\n').filter(Boolean).map((l) => l.slice(3).split(' -> ').pop()) : [];
  return [...new Set([...committed, ...dirty])];
}

function secretsFile(opt) {
  const f = opt ?? join(homedir(), '.config', 'ci-local', 'secrets.env');
  if (!existsSync(f)) return { file: null, names: [], values: {} };
  const values = parseSecretsText(readFileSync(f, 'utf8'));
  return { file: f, names: Object.keys(values), values };
}

function headRef() {
  try {
    return git('symbolic-ref', '--short', 'HEAD');
  } catch {
    return 'detached';
  }
}

function pad(s, n) {
  s = String(s);
  return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length);
}

function cmdList(o) {
  const inv = buildInventory(ROOT);
  const sum = summarize(inv);
  const files = changedFiles(o.base, o.sha);
  const sel = selectWorkflows(inv, { event: o.event, branch: headRef(), baseBranch: o.base.replace(/^origin\//, ''), changedFiles: files, all: o.all });
  const runs = sel.filter((s) => s.run);
  if (o.json) return console.log(JSON.stringify({ summary: sum, changedFiles: files, selection: sel.map((s) => ({ file: s.wf.file, run: s.run, reason: s.reason, jobs: s.wf.jobs })) }, null, 2));
  console.log(`Workflows: ${sum.workflows} · jobs: ${sum.jobs} · roda local: ${sum.byCls.local} · precisa segredo: ${sum.byCls.secret} · só GitHub: ${sum.byCls['github-only']}`);
  console.log(`Evento: ${o.event} · arquivos alterados vs ${o.base}: ${files.length} · dispararia: ${runs.length} workflow(s)\n`);
  for (const s of sel.filter((x) => x.run || o.all)) {
    console.log(`▶ ${s.wf.file}  — ${s.reason}`);
    for (const j of s.wf.jobs) {
      const extra = j.cls === 'secret' ? ` [segredos: ${j.secrets.join(', ')}]` : j.cls === 'github-only' ? ` [${j.reasons.join('; ')}]` : '';
      console.log(`    ${pad(j.cls, 12)} ${j.name}${j.matrix ? ' (matrix)' : ''}${j.services.length ? ` (services: ${j.services.join(',')})` : ''}${extra}`);
    }
  }
  const skipped = sel.filter((x) => !x.run && x.wf.triggers[o.event] !== undefined);
  if (skipped.length && !o.all) {
    console.log(`\nNão disparariam agora (${skipped.length}):`);
    for (const s of skipped) console.log(`    ${pad(s.wf.file, 48)} ${s.reason}`);
  }
}

async function cmdRun(o) {
  const inv = buildInventory(ROOT);
  const sha = git('rev-parse', o.sha);
  const files = changedFiles(o.base, o.sha);
  let sel = selectWorkflows(inv, { event: o.event, branch: headRef(), baseBranch: o.base.replace(/^origin\//, ''), changedFiles: files, all: o.all }).filter((s) => s.run);
  if (o.workflows.length) sel = sel.filter((s) => o.workflows.includes(s.wf.file));
  if (o.exclude.length) sel = sel.filter((s) => !o.exclude.includes(s.wf.file));
  if (!sel.length) {
    console.log('Nenhum workflow dispararia para este evento/alterações. Use --all para forçar.');
    return 0;
  }
  const id = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = join(OUT, 'runs', id);
  mkdirSync(join(dir, 'logs'), { recursive: true });
  if (sha === git('rev-parse', 'HEAD') && git('status', '--porcelain', '--untracked-files=no')) {
    console.log('⚠ Há alterações não commitadas: o act roda o COMMIT (clone isolado). Commite para incluí-las.');
  }
  console.log(`Preparando clone isolado de ${sha.slice(0, 9)} …`);
  const clone = prepareClone({ repoRoot: ROOT, sha, baseRef: o.base, dest: CLONE_DIR, headRef: headRef() });
  const sec0 = secretsFile(o.secrets);
  const eventPath = join(dir, 'event.json');
  writeJson(eventPath, buildEvent({ event: o.event, sha, baseSha: clone.baseSha, headRef: headRef() }));
  // Neutraliza (só no clone) passos que exigem segredo ausente ou API do GitHub — ver run-act.mjs.
  let neutralized = 0;
  for (const wf of inv) {
    const file = join(clone.dir, '.github', 'workflows', wf.file);
    if (!existsSync(file) || wf.parseError) continue;
    const doc = yaml.load(readFileSync(file, 'utf8'));
    const n = neutralizeUnverifiable(doc, (st) => classifyStep(st), sec0.names);
    if (n) {
      writeFileSync(file, yaml.dump(doc, { lineWidth: -1, noRefs: true }));
      neutralized += n;
    }
  }
  const shimArgs = prepareShims({ root: ROOT, workflowsText: inv.map((w) => w.text ?? '').join('\n'), dest: join(OUT, 'shims'), artifactsDir: join(dir, 'artifacts') });
  const sec = secretsFile(o.secrets);
  console.log(`${sel.length} workflow(s) · evento ${o.event} · segredos: ${sec.names.length ? sec.names.join(', ') : 'nenhum'} · passos neutralizados no clone: ${neutralized}\n`);

  const report = { id, sha, base: clone.baseSha, event: o.event, startedAt: new Date().toISOString(), workflows: [] };
  for (const [i, s] of sel.entries()) {
    const t0 = Date.now();
    process.stdout.write(`[${i + 1}/${sel.length}] ${s.wf.file} … `);
    const res = await runWorkflow({
      cloneDir: clone.dir, workflowFile: s.wf.file, event: o.event, eventPath,
      logPath: join(dir, 'logs', `${s.wf.file}.jsonl`), secretsFile: sec.file, concurrentJobs: o.jobs,
      timeoutMs: o.timeout * 60_000, artifactDir: join(dir, 'artifacts'), extraArgs: shimArgs,
      allowDocker: workflowNeedsDocker(readFileSync(join(clone.dir, '.github/workflows', s.wf.file), 'utf8'), (p) => readFileSync(join(clone.dir, p.endsWith('.yml') || p.endsWith('.yaml') ? p : `${p}/action.yml`), 'utf8')),
      nameCtx: {
        workflowName: s.wf.name,
        reusable: s.wf.jobs.filter((j) => j.reusable?.startsWith('./')).map((j) => ({ callerId: j.id, callerName: j.name, calledName: j.calledName ?? '' })),
      },
    });
    const jobs = [];
    const byId = new Map(s.wf.jobs.map((j) => [j.id, j]));
    for (const r of res.jobs) {
      const v = verdict(r, byId.get(r.jobId), { secretsProvided: sec.names });
      jobs.push({ check: r.check, jobId: r.jobId, status: v.status, why: v.why ?? '' });
    }
    // Matrix: várias pernas com o mesmo jobId — o need vale pela PIOR perna.
    const rank = { FALHOU: 0, 'não executado': 1, inconclusivo: 2, 'só GitHub': 3, 'ok-parcial': 4, pulado: 5, ok: 6 };
    const byJobId = new Map();
    for (const j of jobs) {
      const prev = byJobId.get(j.jobId);
      if (!prev || (rank[j.status] ?? 0) < (rank[prev.status] ?? 0)) byJobId.set(j.jobId, j);
    }
    for (const j of s.wf.jobs) {
      if (res.jobs.some((r) => r.jobId === j.id)) continue;
      const em = res.timedOut ? null : emulateAlwaysJob(j, byJobId);
      jobs.push(em
        ? { check: j.name, jobId: j.id, status: em.status, why: em.why }
        : { check: j.name, jobId: j.id, status: res.timedOut ? 'FALHOU' : 'não executado', why: res.timedOut ? `timeout de ${o.timeout} min` : 'job não reportou' });
    }
    // act quebrou (exit ≠ 0) sem nenhum job reprovado: não é "verde" — é falha da execução.
    if (!res.timedOut && res.exitCode !== 0 && !res.jobs.some((r) => r.result === 'failure')) {
      jobs.push({ check: `(act) ${s.wf.file}`, jobId: '_act', status: 'FALHOU', why: `act saiu com ${res.exitCode ?? res.signal} sem job falho reportado (ver logs/${s.wf.file}.jsonl)` });
    }
    const bad = jobs.filter((j) => j.status === 'FALHOU').length;
    // (ok-parcial conta como passou: só os passos sem segredo/GitHub não foram verificados)
    console.log(`${bad ? `❌ ${bad} falha(s)` : '✅'} (${Math.round((Date.now() - t0) / 1000)}s)`);
    for (const j of jobs.filter((x) => x.status !== 'ok')) console.log(`      ${pad(j.status, 14)} ${j.check}${j.why ? ` — ${j.why}` : ''}`);
    report.workflows.push({ file: s.wf.file, exitCode: res.exitCode, timedOut: res.timedOut, jobs });
  }
  report.finishedAt = new Date().toISOString();
  writeJson(join(dir, 'report.json'), report);
  writeFileSync(join(OUT, 'latest'), `${id}\n`);
  return finish(report, dir, o);
}

function finish(report, dir, o) {
  const all = report.workflows.flatMap((w) => w.jobs.map((j) => ({ ...j, workflow: w.file })));
  const c = (st) => all.filter((j) => j.status === st).length;
  const md = [
    `# CI local — ${report.event} @ ${report.sha.slice(0, 9)}`, '',
    `ok ${c('ok')} · ok-parcial ${c('ok-parcial')} · FALHOU ${c('FALHOU')} · inconclusivo ${c('inconclusivo')} · só GitHub ${c('só GitHub')} · pulado ${c('pulado')} · não executado ${c('não executado')}`, '',
    '| workflow | check | resultado | detalhe |', '|---|---|---|---|',
    ...all.map((j) => `| ${j.workflow} | ${j.check} | ${j.status} | ${String(j.why ?? '').replace(/\|/g, '/')} |`),
  ].join('\n');
  writeFileSync(join(dir, 'report.md'), `${md}\n`);
  console.log(`\nResumo: ok ${c('ok')} · ok-parcial ${c('ok-parcial')} · FALHOU ${c('FALHOU')} · inconclusivo ${c('inconclusivo')} · só GitHub ${c('só GitHub')} · pulado ${c('pulado')}`);
  console.log(`Relatório: ${join(dir, 'report.md')}`);
  if (c('FALHOU')) return 1;
  if (o.strict && (c('inconclusivo') || c('não executado'))) return 3;
  return 0;
}

const HEAVY = /playwright\s+test|run test:e2e|lhci|lighthouse|stryker|mutation/i;

async function cmdFast(o) {
  // O modo nativo roda os passos com os SEUS privilégios (o bwrap reduz, mas 5 rodadas de revisão
  // adversarial acharam fugas). Por isso só roda código que você confia (seu próprio commit).
  // Código de outro branch/agente/PR: use o modo act (contêiner) — `npm run ci:local`.
  if (!o.trusted) {
    console.error('✋ ci:local:fast executa os passos do workflow no seu computador. Só use em código seu e confiável:');
    console.error('   npm run ci:local:fast -- --codigo-confiavel   (código de outros: npm run ci:local, em contêiner)');
    return 2;
  }
  const inv = buildInventory(ROOT);
  const files = changedFiles(o.base, o.sha);
  let sel = selectWorkflows(inv, { event: 'pull_request', branch: headRef(), baseBranch: o.base.replace(/^origin\//, ''), changedFiles: files, all: o.all }).filter((s) => s.run);
  if (o.workflows.length) sel = sel.filter((s) => o.workflows.includes(s.wf.file));
  const sha = git('rev-parse', 'HEAD');
  const baseSha = git('rev-parse', o.base);
  const context = { github: { event_name: 'pull_request', base_ref: 'main', head_ref: headRef(), sha, repository: 'adm01-debug/Promo_Gifts_V4', event: buildEvent({ event: 'pull_request', sha, baseSha, headRef: headRef() }) }, needs: {}, matrix: {}, vars: {}, inputs: {}, runner: { os: 'Linux', temp: '/tmp' } };
  const sec = secretsFile(o.secrets);
  const secrets = sec.values;
  const id = `fast-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const dir = join(OUT, 'runs', id);
  mkdirSync(dir, { recursive: true });
  const report = { id, sha, base: baseSha, event: 'pull_request (nativo)', workflows: [] };
  for (const s of sel) {
    const doc = yaml.load(readFileSync(join(ROOT, '.github/workflows', s.wf.file), 'utf8'));
    const jobs = [];
    for (const j of s.wf.jobs) {
      const job = doc.jobs[j.id];
      const text = yaml.dump(job ?? {});
      if (j.cls === 'github-only') { jobs.push({ check: j.name, status: 'só GitHub', why: j.reasons.join('; ') }); continue; }
      if (j.reusable || j.matrix || j.services.length) { jobs.push({ check: j.name, status: 'inconclusivo', why: 'reusable/matrix/services: use o modo act' }); continue; }
      if (!o.withE2E && HEAVY.test(text)) { jobs.push({ check: j.name, status: 'pulado', why: 'pesado (E2E/Lighthouse/mutação) — use --with-e2e ou o modo act' }); continue; }
      console.log(`\n▶ ${s.wf.file} · ${j.name}`);
      const r = runJobNative({ root: ROOT, workflowDoc: doc, jobId: j.id, context, secrets, log: (m) => console.log(`   ${m}`) });
      const failedStep = r.steps.find((x) => x.status === 'FALHOU');
      if (failedStep) console.log(failedStep.tail.split('\n').map((l) => `      │ ${l}`).join('\n'));
      jobs.push({ check: j.name, status: r.status, why: failedStep ? `passo: ${failedStep.name}` : r.steps.filter((x) => x.status === 'inconclusivo').map((x) => x.why).join('; ') });
    }
    report.workflows.push({ file: s.wf.file, jobs });
  }
  writeJson(join(dir, 'report.json'), report);
  writeFileSync(join(OUT, 'latest'), `${id}\n`);
  return finish(report, dir, o);
}

function cmdExtras(o) {
  const rows = findUncovered(ROOT);
  const runnable = rows.filter((r) => r.kind === 'órfão' || (o.withE2E && r.kind === 'órfão-e2e') || (o.unsafe && r.kind === 'inseguro'));
  const counts = rows.reduce((acc, r) => ((acc[r.kind] = (acc[r.kind] ?? 0) + 1), acc), {});
  console.log(`Scripts de verificação no package.json: ${rows.length} · ${Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(' · ')}`);
  if (o.listOnly) {
    for (const r of rows.filter((x) => x.kind !== 'coberto')) console.log(`  ${pad(r.kind, 11)} ${pad(r.name, 36)} ${r.body.slice(0, 90)}`);
    return 0;
  }
  // Mesmo comando com nomes diferentes (test / test:run) roda uma vez só.
  const seen = new Set();
  const todo = runnable.filter((r) => (seen.has(r.body) ? false : (seen.add(r.body), true)));
  console.log(`Rodando ${todo.length} script(s) órfão(s)${o.withE2E ? ' (com E2E)' : ' (sem E2E: use --with-e2e)'}${o.unsafe ? ' (com inseguros)' : ''}\n`);
  const id = `extras-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const dir = join(OUT, 'runs', id);
  mkdirSync(join(dir, 'logs'), { recursive: true });
  const jobs = [];
  for (const r of todo) {
    const t0 = Date.now();
    process.stdout.write(`▶ npm run ${r.name} … `);
    const res = spawnSync('npm', ['run', '--silent', r.name], { cwd: ROOT, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, env: { ...process.env, CI: 'true' }, timeout: o.timeout * 60_000 });
    writeFileSync(join(dir, 'logs', `${r.name.replace(/[:/]/g, '_')}.log`), `${res.stdout ?? ''}${res.stderr ?? ''}`);
    const ok = res.status === 0;
    console.log(`${ok ? '✅' : '❌'} (${Math.round((Date.now() - t0) / 1000)}s)`);
    if (!ok) console.log(`${res.stdout ?? ''}${res.stderr ?? ''}`.split('\n').slice(-12).map((l) => `      │ ${l}`).join('\n'));
    jobs.push({ check: `npm run ${r.name}`, status: ok ? 'ok' : 'FALHOU', why: ok ? '' : `exit ${res.status ?? res.signal}` });
  }
  const report = { id, sha: git('rev-parse', 'HEAD'), event: 'extras (scripts sem workflow)', workflows: [{ file: 'package.json', jobs }] };
  writeJson(join(dir, 'report.json'), report);
  return finish(report, dir, o);
}

function cmdCompare(o) {
  const id = o.run === 'latest' ? readFileSync(join(OUT, 'latest'), 'utf8').trim() : o.run;
  const report = JSON.parse(readFileSync(join(OUT, 'runs', id, 'report.json'), 'utf8'));
  const sha = o.sha === 'HEAD' ? report.sha : git('rev-parse', o.sha);
  const local = report.workflows.flatMap((w) => w.jobs);
  const { rows, counts } = compareResults(local, fetchGithubChecks(sha));
  console.log(`Comparação local (${id}) × GitHub @ ${sha.slice(0, 9)}\n`);
  for (const r of rows.filter((x) => x.kind !== 'só GitHub' || o.all)) console.log(`${pad(r.kind, 22)} ${pad(r.local, 14)} ${pad(r.github, 12)} ${r.check}`);
  console.log(`\n${Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(' · ')}`);
  return rows.some((r) => r.kind === 'DIVERGE') ? 1 : 0;
}

const HELP = readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 18).map((l) => l.replace(/^\/\/ ?/, '')).join('\n');

const o = parseArgs(process.argv.slice(2));
const handlers = { list: cmdList, run: cmdRun, fast: cmdFast, extras: cmdExtras, compare: cmdCompare, help: () => console.log(HELP) };
if (!handlers[o.cmd]) {
  console.error(`comando desconhecido: ${o.cmd}\n${HELP}`);
  process.exit(2);
}
Promise.resolve(handlers[o.cmd](o)).then((code) => process.exit(code ?? 0), (err) => {
  console.error(`ci-local: ${err.stack ?? err}`);
  process.exit(2);
});

