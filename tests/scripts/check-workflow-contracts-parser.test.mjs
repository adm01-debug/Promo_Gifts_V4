/**
 * Regressão do parser do check-workflow-contracts: workflows escritos com `- uses:` / `- run:`,
 * `pull_request_target`, `run: |-` e YAML inválido escapavam de C2/C5/C11/C12/C16/C18/C19/C20/C22.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { afterAll, describe, expect, it } from 'vitest';
import {
  checkC2Concurrency,
  checkC5NoInjection,
  checkC11ShellStrict,
  checkC12NoContentsWriteInPR,
  checkC16ShaPinned,
  checkC18ConditionalCancel,
  checkC22NoGitPushInPR,
  hasPullRequestTrigger,
  runChecks,
} from '../../scripts/check-workflow-contracts.mjs';

const wf = (text, file = 'x.yml') => ({ file, text, doc: yaml.load(text) });

describe('hasPullRequestTrigger', () => {
  it.each([
    ['on:\n  pull_request:\n    branches: [main]\njobs: {}\n', true],
    ['on:\n  pull_request_target:\njobs: {}\n', true],
    ['on: [push, pull_request]\njobs: {}\n', true],
    ['on: pull_request\njobs: {}\n', true],
    ['on:\n  push:\n    branches: [main]\njobs: {}\n', false],
    ['on: push\njobs: {}\n', false],
    ['on: push\n# pull_request:\njobs: {}\n', false],
    ['on: push\njobs:\n  a:\n    name: "pull_request: label"\n', false],
  ])('%j → %s', (text, expected) => {
    const w = wf(text);
    expect(hasPullRequestTrigger(w.doc, w.text)).toBe(expected);
  });
  it('C2/C12/C22 agora valem para pull_request_target (gatilho mais perigoso)', () => {
    const text =
      'on:\n  pull_request_target:\npermissions:\n  contents: write\njobs:\n  a:\n    runs-on: ubuntu-24.04\n    steps:\n      - run: git push origin HEAD\n';
    const w = wf(text);
    expect(checkC2Concurrency(w)).toHaveLength(1);
    expect(checkC12NoContentsWriteInPR(w).length).toBeGreaterThan(0);
    expect(checkC22NoGitPushInPR(w).length).toBeGreaterThan(0);
  });
  it('comentários não aplicam restrições de PR a um workflow apenas push', () => {
    const w = wf(
      'on: push\n# pull_request:\npermissions: {contents: write}\njobs:\n  a:\n    steps:\n      - run: git push origin HEAD\n',
    );
    expect(checkC2Concurrency(w)).toEqual([]);
    expect(checkC12NoContentsWriteInPR(w)).toEqual([]);
    expect(checkC22NoGitPushInPR(w)).toEqual([]);
  });
});

describe('C16 vê passos escritos com traço', () => {
  it('`- uses: actions/checkout@v4` sem SHA é violação', () => {
    const w = wf('jobs:\n  a:\n    steps:\n      - uses: actions/checkout@v4\n');
    expect(checkC16ShaPinned(w).length).toBe(1);
  });
  it('SHA de 40 caracteres passa', () => {
    const sha = 'a'.repeat(40);
    expect(
      checkC16ShaPinned(
        wf(`jobs:\n  a:\n    steps:\n      - uses: actions/checkout@${sha} # v4\n`),
      ),
    ).toEqual([]);
  });
  it.each(["'", '"'])('SHA entre aspas %s é normalizado pelo YAML', (quote) => {
    const ref = `actions/checkout@${'a'.repeat(40)}`;
    expect(
      checkC16ShaPinned(
        wf(`jobs:\n  a:\n    steps:\n      - uses: ${quote}${ref}${quote} # pinned\n`),
      ),
    ).toEqual([]);
  });
  it.each(["'", '"'])('tag entre aspas %s continua proibida', (quote) => {
    expect(
      checkC16ShaPinned(
        wf(`jobs:\n  a:\n    steps:\n      - uses: ${quote}actions/checkout@v4${quote}\n`),
      ),
    ).toHaveLength(1);
  });
  it('valida também o uses de um job reutilizável', () => {
    expect(
      checkC16ShaPinned(
        wf('jobs:\n  a:\n    uses: "org/repo/.github/workflows/shared.yml@main"\n'),
      ),
    ).toHaveLength(1);
  });
  it('não confunde uma linha uses em script com uma action', () => {
    expect(
      checkC16ShaPinned(
        wf('jobs:\n  a:\n    steps:\n      - run: |\n          uses: actions/checkout@v4\n'),
      ),
    ).toEqual([]);
  });
});

describe('C5 vê `- run:` e `run: |-`', () => {
  it('`- run:` inline com github.head_ref', () => {
    const w = wf('jobs:\n  a:\n    steps:\n      - run: echo "${{ github.head_ref }}"\n');
    expect(checkC5NoInjection(w).length).toBe(1);
  });
  it('`run: |-` em bloco com github.head_ref', () => {
    const w = wf(
      'jobs:\n  a:\n    steps:\n      - name: x\n        run: |-\n          echo "${{ github.head_ref }}"\n',
    );
    expect(checkC5NoInjection(w).length).toBe(1);
  });
  it('run seguro não gera violação', () => {
    expect(checkC5NoInjection(wf('jobs:\n  a:\n    steps:\n      - run: echo ok\n'))).toEqual([]);
  });
  it.each(['|2-', '|-2', '|2+', '|+2', '>2-', '>-2', '|2- # indent/chomp'])(
    'inspeciona conteúdo do scalar YAML válido %s',
    (scalar) => {
      const w = wf(
        `jobs:\n  a:\n    steps:\n      - run: ${scalar}\n          echo "\${{ github.head_ref }}"\n`,
      );
      expect(checkC5NoInjection(w)).toHaveLength(1);
    },
  );
  it('não trata comentário YAML após run inline como comando executado', () => {
    expect(
      checkC5NoInjection(
        wf('jobs:\n  a:\n    steps:\n      - run: echo ok # ${{ github.head_ref }}\n'),
      ),
    ).toEqual([]);
  });
  it('mantém a checagem de expressão em comentário dentro do bloco shell', () => {
    expect(
      checkC5NoInjection(
        wf('jobs:\n  a:\n    steps:\n      - run: |\n          # ${{ github.head_ref }}\n'),
      ),
    ).toHaveLength(1);
  });
});

describe('C18 usa eventos reais em todas as formas YAML', () => {
  it.each([
    'on: [push, pull_request]',
    'on: {push: {}, pull_request: {}}',
    'on:\n  push:\n  pull_request:',
    'on: [push, pull_request_target]',
  ])('rejeita cancelamento booleano no workflow misto %s', (events) => {
    const w = wf(`${events}\nconcurrency:\n  group: x\n  cancel-in-progress: false\njobs: {}\n`);
    expect(checkC18ConditionalCancel(w)).toHaveLength(1);
  });
  it('aceita expressão condicional no workflow misto', () => {
    const w = wf(
      "on: [push, pull_request]\nconcurrency:\n  group: x\n  cancel-in-progress: ${{ github.event_name == 'pull_request' }}\njobs: {}\n",
    );
    expect(checkC18ConditionalCancel(w)).toEqual([]);
  });
  it('não trata comentário push como trigger misto', () => {
    const w = wf(
      'on: pull_request\n#  push:\nconcurrency:\n  group: x\n  cancel-in-progress: true\njobs: {}\n',
    );
    expect(checkC18ConditionalCancel(w)).toEqual([]);
  });
});

describe('C11 enxerga `- run:` como início de linha', () => {
  it('workflow com `- run:` e sem defaults.run.shell reprova', () => {
    const w = wf(
      'on: push\njobs:\n  a:\n    runs-on: ubuntu-24.04\n    steps:\n      - run: echo ok\n',
    );
    expect(checkC11ShellStrict(w).length).toBe(1);
  });
});

describe('runChecks com YAML inválido', () => {
  const dirs = [];
  afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));
  it('workflow quebrado com comando inerte vira violação explícita e é contado em workflowCount', () => {
    const root = mkdtempSync(join(tmpdir(), 'wfc-'));
    dirs.push(root);
    mkdirSync(join(root, '.github/workflows'), { recursive: true });
    writeFileSync(join(root, 'package.json'), '{"scripts":{}}');
    writeFileSync(join(root, 'playwright.config.ts'), 'export default { projects: [] };\n');
    writeFileSync(
      join(root, '.github/workflows/zz-quebrado.yml'),
      'on: push\njobs:\n  a:\n  steps: [unclosed\n    - run: echo diagnostic\n',
    );
    const { violations, workflowCount } = runChecks(root);
    expect(workflowCount).toBe(1);
    expect(violations.some((v) => v.startsWith('zz-quebrado.yml: YAML inválido'))).toBe(true);
  });
});
