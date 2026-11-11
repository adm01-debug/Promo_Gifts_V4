import { describe, expect, it } from 'vitest';
import { branchAllowed, matchesPatternList, pathsAllowed, selectWorkflows } from '../../scripts/ci-local/select.mjs';
import { classifyJob, classifyStep, normalizeTriggers } from '../../scripts/ci-local/inventory.mjs';
import { checkName, parseActJsonl, verdict, buildEvent } from '../../scripts/ci-local/run-act.mjs';
import { compareResults } from '../../scripts/ci-local/compare.mjs';
import { makeEvaluator, stepShouldRun } from '../../scripts/ci-local/native.mjs';

describe('filtros de paths/branches (semântica do GitHub Actions)', () => {
  it('** atravessa diretórios e * não', () => {
    expect(matchesPatternList('src/a/b.ts', ['src/**'])).toBe(true);
    expect(matchesPatternList('src/a/b.ts', ['src/*'])).toBe(false);
    expect(matchesPatternList('.github/workflows/x.yml', ['.github/**'])).toBe(true); // dotfiles casam
  });
  it('negação "!" retira o que um padrão anterior incluiu (ordem importa)', () => {
    expect(matchesPatternList('docs/a.md', ['**', '!docs/**'])).toBe(false);
    expect(matchesPatternList('docs/keep.md', ['**', '!docs/**', 'docs/keep.md'])).toBe(true);
  });
  it('paths: roda se ALGUM arquivo casa; sem arquivos não roda', () => {
    expect(pathsAllowed({ paths: ['src/**'] }, ['README.md', 'src/x.ts'])).toBe(true);
    expect(pathsAllowed({ paths: ['src/**'] }, ['README.md'])).toBe(false);
    expect(pathsAllowed({ paths: ['src/**'] }, [])).toBe(false);
  });
  it('paths-ignore: só pula quando TODOS os arquivos são ignorados', () => {
    expect(pathsAllowed({ 'paths-ignore': ['**/*.md'] }, ['a.md', 'b.md'])).toBe(false);
    expect(pathsAllowed({ 'paths-ignore': ['**/*.md'] }, ['a.md', 'src/x.ts'])).toBe(true);
  });
  it('branches / branches-ignore / push só de tags', () => {
    expect(branchAllowed({ branches: ['main'] }, 'main')).toBe(true);
    expect(branchAllowed({ branches: ['main'] }, 'feat/x')).toBe(false);
    expect(branchAllowed({ 'branches-ignore': ['dependabot/**'] }, 'dependabot/npm/x')).toBe(false);
    expect(branchAllowed({ tags: ['v*'] }, 'main')).toBe(false);
    expect(branchAllowed({}, 'qualquer')).toBe(true);
  });
  it('pull_request filtra pelo branch BASE; push pelo branch enviado', () => {
    const inv = [{ file: 'a.yml', triggers: { pull_request: { branches: ['main'] }, push: { branches: ['main'] } }, jobs: [] }];
    expect(selectWorkflows(inv, { event: 'pull_request', branch: 'feat/x', baseBranch: 'main', changedFiles: ['x'] })[0].run).toBe(true);
    expect(selectWorkflows(inv, { event: 'push', branch: 'feat/x', changedFiles: ['x'] })[0].run).toBe(false);
    expect(selectWorkflows(inv, { event: 'schedule', branch: 'main', changedFiles: [] })[0].run).toBe(false);
  });
  it('YAML inválido nunca "passa" silenciosamente', () => {
    const r = selectWorkflows([{ file: 'bad.yml', triggers: {}, jobs: [], parseError: 'boom' }], { event: 'pull_request', branch: 'x', changedFiles: [] });
    expect(r[0]).toMatchObject({ run: false, reason: expect.stringContaining('YAML inválido') });
  });
});

describe('inventário: classificação por passo', () => {
  it('normaliza on: string, lista e objeto', () => {
    expect(Object.keys(normalizeTriggers({ on: 'push' }))).toEqual(['push']);
    expect(Object.keys(normalizeTriggers({ on: ['push', 'pull_request'] }))).toEqual(['push', 'pull_request']);
    expect(normalizeTriggers({ true: { pull_request: null } })).toEqual({ pull_request: {} });
  });
  it('segredo com fallback (secrets.X || ...) não bloqueia; GITHUB_TOKEN nunca conta', () => {
    expect(classifyStep({ run: 'x', env: { T: '${{ secrets.TOKEN || github.token }}' } }).cls).toBe('local');
    expect(classifyStep({ run: 'x', env: { T: '${{ secrets.GITHUB_TOKEN }}' } }).cls).toBe('local');
    expect(classifyStep({ run: 'x', env: { T: '${{ secrets.PROD_KEY }}' } })).toMatchObject({ cls: 'secret', secrets: ['PROD_KEY'] });
  });
  it('passos que escrevem no GitHub são github-only', () => {
    expect(classifyStep({ uses: 'actions/dependency-review-action@v4' }).cls).toBe('github-only');
    expect(classifyStep({ run: 'gh pr comment 1 --body x' }).cls).toBe('github-only');
    expect(classifyStep({ run: 'git push origin HEAD' }).cls).toBe('github-only');
    expect(classifyStep({ uses: 'actions/github-script@v7', with: { script: 'github.rest.issues.createComment({})' } }).cls).toBe('github-only');
    expect(classifyStep({ uses: 'actions/github-script@v7', with: { script: 'const r = await github.rest.pulls.get({})' } }).cls).toBe('local');
  });
  it('um único passo github-only NÃO rebaixa o job inteiro (ex.: attest no Build)', () => {
    const job = { steps: [{ uses: 'actions/checkout@v4' }, { run: 'npm run build' }, { uses: 'actions/attest-build-provenance@v1' }] };
    expect(classifyJob('build', job).cls).toBe('local');
    const onlyGh = { steps: [{ uses: 'actions/checkout@v4' }, { uses: 'actions/dependency-review-action@v4' }] };
    expect(classifyJob('dr', onlyGh).cls).toBe('github-only');
  });
  it('segredo em env: do job é herdado por todos os passos', () => {
    const job = { env: { K: '${{ secrets.DB }}' }, steps: [{ run: 'node a.mjs' }] };
    expect(classifyJob('j', job)).toMatchObject({ cls: 'secret', secrets: ['DB'] });
  });
});

describe('act: leitura do log, nome do check e veredito', () => {
  const lines = [
    { job: 'WF/Build', jobID: 'build', stage: 'Main', step: 'Compile', stepResult: 'failure', matrix: {} },
    { job: 'WF/Build', jobID: 'build', jobResult: 'failure', matrix: {} },
    { job: 'WF/Shard', jobID: 'shard', jobResult: 'success', matrix: { shard: 1, project: 'chromium' } },
    'lixo não-JSON',
  ].map((o) => (typeof o === 'string' ? o : JSON.stringify(o)));
  it('consolida jobs e o passo que falhou; ignora linhas não-JSON', () => {
    const jobs = parseActJsonl(lines);
    expect(jobs).toHaveLength(2);
    expect(jobs.find((j) => j.jobId === 'build')).toMatchObject({ result: 'failure', failedStep: 'Compile', check: 'Build' });
  });
  it('nome do check segue o GitHub: "Job (v1, v2)" para matrix', () => {
    expect(checkName('e2e-shard', { shard: 1, project: 'chromium-public' })).toBe('e2e-shard (1, chromium-public)');
    expect(checkName('Build', {})).toBe('Build');
    expect(checkName('Já tem (x)', { a: 1 })).toBe('Já tem (x)');
  });
  it('falha num passo que precisa de segredo ausente → inconclusivo; em passo comum → FALHOU', () => {
    const info = { cls: 'secret', secrets: ['K'], steps: [{ name: 'Live', cls: 'secret', secrets: ['K'] }, { name: 'Compile', cls: 'local', secrets: [] }] };
    expect(verdict({ result: 'failure', failedStep: 'Live' }, info).status).toBe('inconclusivo');
    expect(verdict({ result: 'failure', failedStep: 'Live' }, info, { secretsProvided: ['K'] }).status).toBe('FALHOU');
    expect(verdict({ result: 'failure', failedStep: 'Compile' }, info).status).toBe('FALHOU');
    expect(verdict({ result: 'success' }, info).status).toBe('ok');
    expect(verdict(undefined, info).status).toBe('não executado');
  });
  it('evento de PR traz head/base/labels coerentes', () => {
    const ev = buildEvent({ event: 'pull_request', sha: 'h', baseSha: 'b', headRef: 'feat', labels: ['large-pr-approved'] });
    expect(ev.pull_request).toMatchObject({ head: { sha: 'h', ref: 'feat' }, base: { sha: 'b', ref: 'main' }, labels: [{ name: 'large-pr-approved' }] });
  });
});

describe('comparação local × GitHub', () => {
  it('classifica igual / DIVERGE / não comparável / só GitHub', () => {
    const gh = new Map([['A', 'success'], ['B', 'failure'], ['C', 'success'], ['D', 'success'], ['E', 'in_progress']]);
    const { rows, counts } = compareResults(
      [{ check: 'A', status: 'ok' }, { check: 'B', status: 'ok' }, { check: 'C', status: 'inconclusivo' }, { check: 'E', status: 'ok' }, { check: 'Z', status: 'ok' }],
      gh,
    );
    const kind = Object.fromEntries(rows.map((r) => [r.check, r.kind]));
    expect(kind).toMatchObject({ A: 'igual', B: 'DIVERGE', C: 'não comparável', D: 'só GitHub', E: 'GitHub sem resultado', Z: 'só local' });
    expect(counts.DIVERGE).toBe(1);
  });
});

describe('motor nativo: expressões e if:', () => {
  const ev = makeEvaluator({ github: { event_name: 'pull_request', event: { pull_request: { base: { sha: 'abc' } } } }, secrets: {} });
  it('resolve contexto, literais e "a || b"', () => {
    expect(ev('${{ github.event_name }}')).toBe('pull_request');
    expect(ev("BASE=${{ github.event.pull_request.base.sha || 'HEAD~1' }}")).toBe('BASE=abc');
    expect(ev("${{ github.nao.existe || 'fallback' }}")).toBe('fallback');
    expect(ev('${{ secrets.NADA }}')).toBe('');
  });
  it('if: de passo — failure()/always()/igualdade', () => {
    expect(stepShouldRun(undefined, { failed: false, evaluate: ev })).toBe(true);
    expect(stepShouldRun(undefined, { failed: true, evaluate: ev })).toBe(false);
    expect(stepShouldRun('${{ failure() }}', { failed: true, evaluate: ev })).toBe(true);
    expect(stepShouldRun('always()', { failed: true, evaluate: ev })).toBe(true);
    expect(stepShouldRun("github.event_name == 'push'", { failed: false, evaluate: ev })).toBe(false);
    expect(stepShouldRun("github.event_name != 'push'", { failed: false, evaluate: ev })).toBe(true);
  });
});

describe('nomes de check em workflows reutilizáveis', async () => {
  const { displayName } = await import('../../scripts/ci-local/run-act.mjs');
  it('"<chamador>/<workflow chamado>/<job>" vira "<chamador> / <job>" (job com "/" no nome)', () => {
    const ctx = { workflowName: 'Deploy Gates', reusable: [{ callerId: 'e2e-relevance', callerName: 'e2e-relevance', calledName: 'Reusable — E2E Runtime Relevance' }] };
    expect(displayName('e2e-relevance/Reusable — E2E Runtime Relevance/Detectar impacto de runtime/E2E  ', ctx)).toBe('e2e-relevance / Detectar impacto de runtime/E2E');
    expect(displayName('Deploy Gates/Gate 1 - Lint + TypeScript ', ctx)).toBe('Gate 1 - Lint + TypeScript');
  });
});

describe('shim local de dorny/paths-filter', () => {
  it('calcula filtros via git diff com o mesmo contrato de saídas', async () => {
    const { mkdtempSync, mkdirSync, writeFileSync, readFileSync, cpSync } = await import('node:fs');
    const { execFileSync } = await import('node:child_process');
    const { tmpdir } = await import('node:os');
    const { join, resolve } = await import('node:path');
    const ROOT = resolve(import.meta.dirname, '../..');
    const repo = mkdtempSync(join(tmpdir(), 'pf-shim-'));
    const git = (...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', ...a], { cwd: repo, encoding: 'utf8' }).trim();
    git('init', '-q');
    mkdirSync(join(repo, 'docs'));
    writeFileSync(join(repo, 'docs/a.md'), 'x');
    git('add', '.');
    git('commit', '-qm', 'base');
    const base = git('rev-parse', 'HEAD');
    mkdirSync(join(repo, 'src'));
    writeFileSync(join(repo, 'src/app.ts'), 'x');
    writeFileSync(join(repo, 'docs/b.md'), 'y');
    git('add', '.');
    git('commit', '-qm', 'head');
    const shim = join(repo, '.shim');
    cpSync(join(ROOT, 'scripts/ci-local/shims/paths-filter'), shim, { recursive: true });
    mkdirSync(join(shim, 'vendor'));
    cpSync(join(ROOT, 'node_modules/js-yaml/dist/js-yaml.mjs'), join(shim, 'vendor/js-yaml.mjs'));
    cpSync(join(ROOT, 'node_modules/picomatch'), join(shim, 'vendor/picomatch'), { recursive: true });
    writeFileSync(join(repo, 'event.json'), JSON.stringify({ pull_request: { base: { sha: base } } }));
    writeFileSync(join(repo, 'out.txt'), '');
    execFileSync(process.execPath, [join(shim, 'index.mjs')], {
      cwd: repo,
      env: { ...process.env, GITHUB_EVENT_PATH: join(repo, 'event.json'), GITHUB_OUTPUT: join(repo, 'out.txt'), INPUT_FILTERS: "code:\n  - 'src/**'\ndocs_only:\n  - '**/*.md'\nnada:\n  - 'supabase/**'\nadded_src:\n  - added: 'src/**'\n", 'INPUT_LIST-FILES': 'json' },
    });
    const out = readFileSync(join(repo, 'out.txt'), 'utf8');
    const val = (k) => out.match(new RegExp(`^${k}<<__EOF__\\n([\\s\\S]*?)\\n__EOF__`, 'm'))?.[1];
    expect(val('code')).toBe('true');
    expect(val('code_files')).toBe('["src/app.ts"]');
    expect(val('docs_only')).toBe('true');
    expect(val('docs_only_count')).toBe('1'); // docs/a.md é da base, não conta
    expect(val('nada')).toBe('false');
    expect(val('added_src')).toBe('true');
    expect(JSON.parse(val('changes'))).toEqual(['code', 'docs_only', 'added_src']);
  });
});

describe('reutilizáveis, neutralização no clone e ok-parcial', async () => {
  const { displayName, matchReusable, neutralizeUnverifiable, verdict: v } = await import('../../scripts/ci-local/run-act.mjs');
  const { classifyStep: cs } = await import('../../scripts/ci-local/inventory.mjs');
  const ctx = { workflowName: 'Deploy Gates', reusable: [
    { callerId: 'secrets-check', callerName: 'Gate E23 - Verifica secrets E2E', calledName: '_secrets-check (reusable)' },
    { callerId: 'e2e-relevance', callerName: 'e2e-relevance', calledName: 'Reusable — E2E Runtime Relevance' },
  ] };
  it('act prefixa pelo NOME do chamador (ou id); GitHub mostra "<chamador> / <job>"', () => {
    expect(displayName('Gate E23 - Verifica secrets E2E/_secrets-check (reusable)/Verifica secrets E2E', ctx)).toBe('Gate E23 - Verifica secrets E2E / Verifica secrets E2E');
    expect(matchReusable('e2e-relevance/Reusable — E2E Runtime Relevance/Detectar', ctx).callerId).toBe('e2e-relevance');
  });
  it('neutraliza só passos com segredo ausente ou API do GitHub', () => {
    const doc = { jobs: { a: { steps: [
      { run: 'npm test' },
      { run: 'x', env: { T: '${{ secrets.SUPABASE_ACCESS_TOKEN }}' } },
      { uses: 'actions/dependency-review-action@v4' },
      { run: 'y', env: { K: '${{ secrets.PROVIDED }}' } },
    ] } } };
    expect(neutralizeUnverifiable(doc, cs, ['PROVIDED'])).toBe(2);
    const flags = doc.jobs.a.steps.map((st) => st['continue-on-error'] ?? false);
    expect(flags).toEqual([false, true, true, false]);
  });
  it('job verde com passo neutralizado que falhou → ok-parcial (nunca "ok" puro)', () => {
    const info = { cls: 'secret', secrets: ['K'], steps: [{ name: 'Live', cls: 'secret', secrets: ['K'] }, { name: 'Build', cls: 'local', secrets: [] }] };
    expect(v({ result: 'success', failedSteps: ['Live'] }, info).status).toBe('ok-parcial');
    expect(v({ result: 'success', failedSteps: [] }, info).status).toBe('ok');
  });
});

describe('veredito considera TODOS os passos que falharam', async () => {
  const { verdict: v } = await import('../../scripts/ci-local/run-act.mjs');
  const info = { cls: 'secret', secrets: ['K'], steps: [{ name: 'Live', cls: 'secret', secrets: ['K'], reasons: [] }, { name: 'Ledger', cls: 'local', secrets: [], reasons: [] }] };
  it('falha real depois de um passo inconclusivo → FALHOU (não esconde)', () => {
    expect(v({ result: 'failure', failedSteps: ['Live', 'Ledger'] }, info)).toMatchObject({ status: 'FALHOU', why: 'passo: Ledger' });
  });
  it('só passos sem segredo falharam → inconclusivo', () => {
    expect(v({ result: 'failure', failedSteps: ['Live'] }, info).status).toBe('inconclusivo');
  });
});

describe('shims locais de upload/download-artifact', () => {
  it('upload (pasta, glob com !exclusão, artifact-id) → download por nome e por id', async () => {
    const { mkdtempSync, mkdirSync, writeFileSync, readFileSync, cpSync, existsSync } = await import('node:fs');
    const { spawnSync } = await import('node:child_process');
    const { tmpdir } = await import('node:os');
    const { join, resolve } = await import('node:path');
    const ROOT = resolve(import.meta.dirname, '../..');
    const t = mkdtempSync(join(tmpdir(), 'art-shim-'));
    const shims = join(t, 'shims');
    for (const s of ['upload-artifact', 'download-artifact']) {
      cpSync(join(ROOT, 'scripts/ci-local/shims', s), join(shims, s), { recursive: true });
      cpSync(join(ROOT, 'scripts/ci-local/shims/artifact-store.mjs'), join(shims, s, 'artifact-store.mjs'));
    }
    const ws = join(t, 'ws');
    mkdirSync(join(ws, 'dist/assets'), { recursive: true });
    writeFileSync(join(ws, 'dist/index.html'), 'html');
    writeFileSync(join(ws, 'dist/assets/a.js'), 'js');
    writeFileSync(join(ws, 'dist/assets/a.js.map'), 'map');
    const store = join(t, 'store');
    const run = (shim, inputs) => {
      const out = join(t, `out-${Math.random()}`);
      writeFileSync(out, '');
      const env = { ...process.env, GITHUB_WORKSPACE: ws, GITHUB_OUTPUT: out, CI_LOCAL_ARTIFACTS: store };
      for (const [k, v] of Object.entries(inputs)) env[`INPUT_${k.toUpperCase()}`] = v;
      const r = spawnSync(process.execPath, [join(shims, shim, 'index.mjs')], { cwd: ws, env, encoding: 'utf8' });
      return { ...r, out: readFileSync(out, 'utf8') };
    };
    const up = run('upload-artifact', { name: 'dist', path: 'dist' });
    expect(up.status, up.stderr).toBe(0);
    const id = up.out.match(/artifact-id<<__EOF__\n(\d+)/)[1];
    const up2 = run('upload-artifact', { name: 'js-only', path: 'dist/**/*.js*\n!dist/**/*.map' });
    expect(up2.status, up2.stderr).toBe(0);
    expect(existsSync(join(store, 'dist/index.html'))).toBe(true); // raiz = a própria pasta
    expect(existsSync(join(store, 'js-only/assets/a.js'))).toBe(true);
    expect(existsSync(join(store, 'js-only/assets/a.js.map'))).toBe(false); // exclusão "!"
    const miss = run('upload-artifact', { name: 'x', path: 'nao-existe/**', 'if-no-files-found': 'error' });
    expect(miss.status).toBe(1);
    const d1 = run('download-artifact', { name: 'dist', path: 'baixado' });
    expect(d1.status, d1.stderr).toBe(0);
    expect(readFileSync(join(ws, 'baixado/assets/a.js'), 'utf8')).toBe('js');
    const d2 = run('download-artifact', { 'artifact-ids': id, path: 'por-id' });
    expect(d2.status, d2.stderr).toBe(0);
    expect(existsSync(join(ws, 'por-id/index.html'))).toBe(true);
    expect(run('download-artifact', { name: 'inexistente', path: 'z' }).status).toBe(1);
  });
});

describe('emulação de job always() não executado pelo act', async () => {
  const { emulateAlwaysJob } = await import('../../scripts/ci-local/run-act.mjs');
  const job = { always: true, needs: ['a', 'b'] };
  const m = (sa, sb) => new Map([['a', { check: 'A', status: sa }], ['b', { check: 'B', status: sb }]]);
  it('pior resultado dos needs vence, e sai marcado como EMULADO', () => {
    expect(emulateAlwaysJob(job, m('ok', 'ok')).status).toBe('ok');
    expect(emulateAlwaysJob(job, m('ok', 'ok-parcial')).status).toBe('ok-parcial');
    expect(emulateAlwaysJob(job, m('inconclusivo', 'ok-parcial')).status).toBe('inconclusivo');
    expect(emulateAlwaysJob(job, m('inconclusivo', 'FALHOU'))).toMatchObject({ status: 'FALHOU', why: expect.stringContaining('EMULADO') });
  });
  it('não emula sem always() ou com need sem resultado', () => {
    expect(emulateAlwaysJob({ always: false, needs: ['a'] }, m('ok', 'ok'))).toBeNull();
    expect(emulateAlwaysJob({ always: true, needs: ['a', 'z'] }, m('ok', 'ok'))).toBeNull();
  });
});
