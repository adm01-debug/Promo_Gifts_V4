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
    expect(flags).toEqual([false, true, false, false]);
    // só-GitHub é PULADO (nunca roda sem token), não apenas tolerado
    expect(doc.jobs.a.steps.map((st) => st.if ?? null)).toEqual([null, null, 'false', null]);
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

describe('achados da revisão adversarial (token, exit do act, nomes, matrix, types, nativo)', async () => {
  const ra = await import('../../scripts/ci-local/run-act.mjs');
  const nat = await import('../../scripts/ci-local/native.mjs');
  const { selectWorkflows } = await import('../../scripts/ci-local/select.mjs');

  it('act recebe -s GITHUB_TOKEN= e o processo não herda token nem config do gh', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(`${import.meta.dirname}/../../scripts/ci-local/run-act.mjs`, 'utf8');
    expect(src).toMatch(/'-s', 'GITHUB_TOKEN='/);
    const saved = { ...process.env };
    process.env.GITHUB_TOKEN = 'gho_x';
    process.env.GH_TOKEN = 'gho_y';
    process.env.SSH_AUTH_SOCK = '/tmp/agent';
    try {
      const env = ra.tokenlessEnv('/tmp/vazio');
      expect(env.GITHUB_TOKEN).toBeUndefined();
      expect(env.GH_TOKEN).toBeUndefined();
      expect(env.SSH_AUTH_SOCK).toBeUndefined();
      expect(env.GH_CONFIG_DIR).toBe('/tmp/vazio');
    } finally {
      for (const k of ['GITHUB_TOKEN', 'GH_TOKEN', 'SSH_AUTH_SOCK']) (k in saved ? (process.env[k] = saved[k]) : delete process.env[k]);
    }
  });

  it('arquivo de segredos com token do GitHub é recusado', () => {
    expect(() => ra.assertNoGithubTokenInSecrets(['SUPABASE_ACCESS_TOKEN', 'GITHUB_TOKEN'])).toThrow(/GITHUB_TOKEN/);
    expect(() => ra.assertNoGithubTokenInSecrets(['SUPABASE_ACCESS_TOKEN'])).not.toThrow();
  });

  it('nome com ${{ }} e uses@sha ligam ao passo do YAML', () => {
    expect(ra.sameStepName('Run E2E · ${{ matrix.suite }}', 'Run E2E · cart')).toBe(true);
    expect(ra.sameStepName('actions/checkout', 'actions/checkout@08eba0b27e820071cde6df949e0beb9ba4906955')).toBe(true);
    expect(ra.sameStepName('Build', 'Build all')).toBe(false);
  });

  it('falha real em passo com nome interpolado num job com segredo → FALHOU (não inconclusivo)', () => {
    const info = { cls: 'secret', secrets: ['API_KEY'], steps: [{ name: 'Teste ${{ matrix.node }}', cls: 'local', secrets: [], reasons: [] }] };
    expect(ra.verdict({ result: 'failure', failedSteps: ['Teste 20'] }, info).status).toBe('FALHOU');
    // passo que nem se liga ao YAML também é falha, nunca "inconclusivo"
    expect(ra.verdict({ result: 'failure', failedSteps: ['algo/desconhecido'] }, info).status).toBe('FALHOU');
  });

  it('Gate emulado: não executado / só GitHub nos needs → inconclusivo (nunca ok)', () => {
    const gate = { always: true, needs: ['a', 'b'] };
    const m = (a, b) => new Map([['a', { check: 'a', status: a }], ['b', { check: 'b', status: b }]]);
    expect(ra.emulateAlwaysJob(gate, m('ok', 'não executado')).status).toBe('inconclusivo');
    expect(ra.emulateAlwaysJob(gate, m('ok', 'só GitHub')).status).toBe('inconclusivo');
    expect(ra.emulateAlwaysJob(gate, m('FALHOU', 'não executado')).status).toBe('FALHOU');
    expect(ra.emulateAlwaysJob(gate, m('ok', 'ok')).status).toBe('ok');
  });

  it('pull_request com types: [opened, closed] não dispara em synchronize', () => {
    const wf = (types) => ({ file: 'x.yml', triggers: { pull_request: types ? { types } : {} }, jobs: [] });
    const [a, b] = selectWorkflows([wf(['opened', 'closed']), wf(null)], { event: 'pull_request', branch: 'f', changedFiles: ['a'] });
    expect(a.run).toBe(false);
    expect(b.run).toBe(true);
  });

  it('nativo: if: do job não entendido não roda; instalação some do script multi-linha', () => {
    const ev = nat.makeEvaluator({ github: { event_name: 'pull_request' } });
    expect(nat.jobShouldRun("github.event_name == 'schedule'", ev)).toBe(false);
    expect(nat.jobShouldRun("github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'", ev)).toBe(null);
    expect(nat.jobShouldRun(undefined, ev)).toBe(true);
    const s = nat.stripInstallLines('set -e\nnpm ci --no-audit\nnpm run build');
    expect(s.removed).toBe(1);
    expect(s.script).toBe('set -e\n: npm ci --no-audit\nnpm run build');
    expect(s.onlyInstall).toBe(false);
  });
});

describe('2ª revisão adversarial (socket, strip, needs/steps, curinga, HOME, segredos)', async () => {
  const ra = await import('../../scripts/ci-local/run-act.mjs');
  const nat = await import('../../scripts/ci-local/native.mjs');
  const { spawnSync } = await import('node:child_process');
  const { readFileSync } = await import('node:fs');
  const bashOk = (script) => spawnSync('bash', ['--noprofile', '--norc', '-e', '-o', 'pipefail', '-c', script], { encoding: 'utf8' });

  it('socket do Docker só é montado em workflow que chama docker num passo', () => {
    const src = readFileSync(`${import.meta.dirname}/../../scripts/ci-local/run-act.mjs`, 'utf8');
    expect(src).toMatch(/'--container-daemon-socket', allowDocker \? 'unix:\/\/\/var\/run\/docker\.sock' : '-'/);
    expect(ra.workflowNeedsDocker('run: npx supabase start')).toBe(true);
    expect(ra.workflowNeedsDocker('run: docker run --rm alpine true')).toBe(true);
    expect(ra.workflowNeedsDocker('services:\n  postgres:\n    image: postgres')).toBe(false);
    expect(ra.workflowNeedsDocker('run: npm test # dockerfile lint')).toBe(false);
  });

  it('instalação neutralizada mantém if/else, &&, continuação e heredoc válidos (setup-node-ci)', () => {
    const setup = readFileSync(`${import.meta.dirname}/../../.github/actions/setup-node-ci/action.yml`, 'utf8');
    const run = setup.match(/run: \|\n((?:\s{8}.*\n)+)/)[1].replace(/^ {8}/gm, '');
    const s = nat.stripInstallLines(run);
    expect(s.removed).toBeGreaterThan(0);
    expect(bashOk(`IGNORE_SCRIPTS=true\n${s.script}`).status).toBe(0);
    // `npm ci && npm run build && exit 7` preserva a falha do resto da cadeia
    expect(bashOk(nat.stripInstallLines('npm ci && exit 7').script).status).toBe(7);
    // continuação de linha não vira comando solto
    expect(bashOk(nat.stripInstallLines('npm ci \\\n  --ignore-scripts\necho fim').script).status).toBe(0);
    expect(nat.stripInstallLines('npm ci --no-audit').onlyInstall).toBe(true);
  });

  it('if: com needs/vars não avaliável → null (inconclusivo), nunca pulado calado; steps.* usa outputs reais', () => {
    const ctx = { github: { event_name: 'pull_request' }, steps: {} };
    const ev = nat.makeEvaluator(ctx);
    expect(nat.jobShouldRun("needs.e2e-gates.result == 'success'", ev)).toBe(null);
    expect(nat.stepShouldRun("needs.x.outputs.relevant == 'true'", { failed: false, evaluate: ev })).toBe(null);
    expect(nat.stepShouldRun('${{ !cancelled() }}', { failed: true, evaluate: ev })).toBe(true);
    ctx.steps.guard = { outputs: nat.parseGithubOutput('enabled=true\nbody<<EOF\na\nb\nEOF\n') };
    expect(ctx.steps.guard.outputs.body).toBe('a\nb');
    expect(nat.stepShouldRun("steps.guard.outputs.enabled == 'true'", { failed: false, evaluate: ev })).toBe(true);
  });

  it('nome curinga não engole a falha de outro passo; exato tem prioridade; ambíguo = não mapeado', () => {
    const steps = [
      { name: 'Test ${{ matrix.suite }}', cls: 'secret', secrets: ['K'], reasons: [] },
      { name: 'Build', cls: 'local', secrets: [], reasons: [] },
    ];
    expect(ra.matchStep(steps, 'Build')?.name).toBe('Build');
    expect(ra.verdict({ result: 'failure', failedSteps: ['Build'] }, { cls: 'secret', secrets: ['K'], steps }).status).toBe('FALHOU');
    const amb = [{ name: '${{ matrix.a }}', cls: 'secret', secrets: ['K'], reasons: [] }, { name: '${{ matrix.b }}', cls: 'secret', secrets: ['K'], reasons: [] }];
    expect(ra.matchStep(amb, 'qualquer')).toBeUndefined();
    expect(ra.verdict({ result: 'failure', failedSteps: ['qualquer'] }, { cls: 'secret', secrets: ['K'], steps: amb }).status).toBe('FALHOU');
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

describe('3ª revisão adversarial (sudo, segredos YAML, docker por comentário, shims, steps desconhecidos, CRLF)', async () => {
  const ra = await import('../../scripts/ci-local/run-act.mjs');
  const nat = await import('../../scripts/ci-local/native.mjs');
  const { mkdtempSync, writeFileSync, readFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { spawnSync } = await import('node:child_process');

  it('sudo / apt-get install / pip install nunca rodam no host (inconclusivo)', () => {
    for (const s of ['sudo apt-get update', 'apt-get install -y poppler-utils', 'pip install pyyaml', 'python3 -m pip install x', 'if true; then sudo true; fi'])
      expect(nat.SYSTEM_INSTALL_RE.test(s), s).toBe(true);
    for (const s of ['npm run build', 'echo pipeline', 'node scripts/sudoku.mjs']) expect(nat.SYSTEM_INSTALL_RE.test(s), s).toBe(false);
    const doc = { jobs: { j: { steps: [{ name: 'apt', run: 'sudo apt-get install -y x' }] } } };
    const r = nat.runJobNative({ root: process.cwd(), workflowDoc: doc, jobId: 'j', context: { github: { event_name: 'pull_request', sha: 'x', repository: 'r' } } });
    expect(r.steps[0].status).toBe('inconclusivo');
  });

  it('segredos: "NOME: valor", token no meio do valor e export são lidos/recusados como o act faz', () => {
    expect(() => ra.parseSecretsText(`MY_TOK: ghp_${'a'.repeat(36)}`)).toThrow(/token do GitHub/);
    expect(() => ra.parseSecretsText(`FOO=Bearer ghp_${'b'.repeat(36)}`)).toThrow(/token do GitHub/);
    expect(() => ra.parseSecretsText('GITHUB_TOKEN: x')).toThrow(/GITHUB_TOKEN/);
    expect(ra.parseSecretsText('export A="1"\nB: 2\n# C=3\nD=\'4\'')).toEqual({ A: '1', B: '2', D: '4' });
  });

  it('docker: comentário não conta; reutilizável/composite local que usa docker conta', () => {
    expect(ra.workflowNeedsDocker('steps:\n  - run: npm test # necessário para docker pull')).toBe(false);
    const files = { './.github/workflows/drift.yml': 'steps:\n  - run: docker pull ghcr.io/x' };
    expect(ra.workflowNeedsDocker('jobs:\n  a:\n    uses: ./.github/workflows/drift.yml', (p) => files[p] ?? '')).toBe(true);
    expect(ra.workflowNeedsDocker('run: npx supabase db diff --linked')).toBe(true);
    expect(ra.workflowNeedsDocker('run: supabase --workdir x start')).toBe(true);
  });

  it('shims barram instalação em qualquer forma e repassam o resto ao binário real', () => {
    const d = mkdtempSync(join(tmpdir(), 'shims-'));
    nat.writeInstallShims(d);
    const run = (script) => spawnSync('bash', ['-c', script], { env: { ...process.env, PATH: `${d}:${process.env.PATH}` }, encoding: 'utf8' });
    for (const s of ['npm ci', 'npm i', 'npm --prefix x ci', 'CI=1 npm install', 'time npm ci', 'if npm ci; then echo ok; fi', 'npx --yes playwright install --with-deps'])
      expect(run(s).stderr, s).toMatch(/ignorado no modo nativo/);
    expect(run('npm --version').stdout.trim()).toMatch(/^\d+\./);
    expect(run('echo "falhou; npm install resolve"').stdout).toBe('falhou; npm install resolve\n'); // string intacta
  });

  it('if: steps.<id> de passo que não rodou de fato → inconclusivo, nunca pulado calado', () => {
    const ev = nat.makeEvaluator({ steps: {} });
    expect(nat.stepShouldRun("steps.guard.outputs.x == 'true'", { failed: false, evaluate: ev, steps: {} })).toBe(null);
    expect(nat.stepShouldRun("steps.guard.outputs.x == 'true'", { failed: false, evaluate: ev, steps: { guard: { unknown: true } } })).toBe(null);
  });

  it('GITHUB_OUTPUT: CRLF lido; delimitador sem fechamento é erro', () => {
    expect(nat.parseGithubOutput('a=1\r\nb<<EOF\r\nx\r\nEOF\r\n')).toEqual({ a: '1', b: 'x' });
    expect(() => nat.parseGithubOutput('b<<EOF\nx\n')).toThrow(/delimitador/);
  });

  it('modo nativo isola a home real (bwrap) quando disponível', () => {
    const doc = { jobs: { j: { steps: [{ name: 'home', run: 'test ! -e "$(getent passwd $(id -un) | cut -d: -f6)/.config/gh/hosts.yml"' }] } } };
    const r = nat.runJobNative({ root: process.cwd(), workflowDoc: doc, jobId: 'j', context: { github: { event_name: 'pull_request', sha: 'x', repository: 'r' } } });
    if (r.sandboxed) expect(r.status).toBe('ok');
  });
});

describe('4ª revisão adversarial (sandbox, shims por subcomando, segredos)', async () => {
  const nat = await import('../../scripts/ci-local/native.mjs');
  const ra = await import('../../scripts/ci-local/run-act.mjs');
  const { mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { spawnSync } = await import('node:child_process');

  it('sandbox: docker, /mnt/c, interop do Windows, .git comum e token do gh ficam inacessíveis', () => {
    const steps = [
      ['docker', 'if docker version >/dev/null 2>&1; then exit 9; fi'],
      ['windows', 'if ls /mnt/c >/dev/null 2>&1 && [ -n "$(ls /mnt/c)" ]; then exit 9; fi'],
      ['githooks', 'cd "$(git rev-parse --git-common-dir)" && if touch hooks/zz-pwn 2>/dev/null; then rm -f hooks/zz-pwn; exit 9; fi'],
      ['ghtoken', 'if test -e "/home/$(id -un)/.config/gh/hosts.yml"; then exit 9; fi'],
      ['git ainda funciona', 'git status --short >/dev/null'],
    ];
    const doc = { jobs: { j: { steps: steps.map(([name, run]) => ({ name, run })) } } };
    const r = nat.runJobNative({ root: process.cwd(), workflowDoc: doc, jobId: 'j', context: { github: { event_name: 'pull_request', sha: 'x', repository: 'r' } } });
    if (!r.sandboxed) return; // sem bwrap o job sai inconclusivo (coberto abaixo)
    expect(r.steps.map((s) => `${s.name}=${s.status}`)).toEqual(steps.map(([n]) => `${n}=ok`));
  });

  it('shim decide pelo subcomando: scripts chamados install/ci rodam; variantes de install são barradas', () => {
    const d = mkdtempSync(join(tmpdir(), 'shims4-'));
    nat.writeInstallShims(d);
    const run = (script) => spawnSync('bash', ['-c', script], { env: { ...process.env, PATH: `${d}:${process.env.PATH}` }, encoding: 'utf8' });
    for (const s of ['npm clean-install', 'npm ic', 'npm in', 'npm --prefix x ci', 'npx playwright@1.50 install', 'npm exec -- playwright install'])
      expect(run(s).stderr, s).toMatch(/ignorado no modo nativo/);
    for (const s of ['npm run install', 'npm run ci']) expect(run(s).stderr, s).not.toMatch(/ignorado no modo nativo/);
  });

  it('segredos: token colado a outro texto e github_token minúsculo são recusados; " #" é comentário', () => {
    expect(() => ra.parseSecretsText(`A=xghp_${'a'.repeat(36)}`)).toThrow(/token do GitHub/);
    expect(() => ra.parseSecretsText('github_token=abc')).toThrow(/GITHUB_TOKEN/);
    expect(ra.parseSecretsText('B=abc #comentario\nC="x #y"')).toEqual({ B: 'abc', C: 'x #y' });
  });

  it('if: steps["id"] de passo desconhecido → inconclusivo', () => {
    const ev = nat.makeEvaluator({ steps: {} });
    expect(nat.stepShouldRun("steps['ghost'].outputs.y == 'true'", { failed: false, evaluate: ev, steps: {} })).toBe(null);
  });
});
