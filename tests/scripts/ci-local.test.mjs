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
