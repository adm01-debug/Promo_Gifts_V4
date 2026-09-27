/**
 * check-workflow-contracts — mutation tests (E11)
 *
 * Verifica que as funções exportadas detectam violações conhecidas
 * e aceitam workflows corretos.
 */
import { describe, it, expect } from 'vitest';
import {
  checkC1Permissions,
  checkC2Concurrency,
  checkC3Timeout,
  checkC4NoDeadBranches,
  checkC5NoInjection,
  checkC6PlaywrightProjects,
  checkC7NpmScripts,
  checkC8NodeScripts,
} from '../../scripts/check-workflow-contracts.mjs';

// ---------------------------------------------------------------------------
// C1 — permissions
// ---------------------------------------------------------------------------
describe('C1 — permissions', () => {
  it('flags workflow without top-level permissions', () => {
    const wf = { file: 'foo.yml', text: 'on:\n  push:\njobs:\n  x:\n    runs-on: ubuntu-latest\n', doc: { on: { push: null }, jobs: { x: { 'runs-on': 'ubuntu-latest' } } } };
    expect(checkC1Permissions(wf).length).toBe(1);
  });

  it('accepts workflow with top-level permissions', () => {
    const wf = { file: 'foo.yml', text: '', doc: { permissions: { contents: 'read' }, jobs: {} } };
    expect(checkC1Permissions(wf).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// C2 — concurrency
// ---------------------------------------------------------------------------
describe('C2 — concurrency', () => {
  it('flags PR workflow without concurrency', () => {
    const wf = { file: 'foo.yml', text: 'pull_request:\n', doc: { on: { pull_request: null }, jobs: {} } };
    expect(checkC2Concurrency(wf).length).toBe(1);
  });

  it('accepts schedule-only workflow without concurrency', () => {
    const wf = { file: 'foo.yml', text: 'schedule:\n', doc: { on: { schedule: null }, concurrency: undefined, jobs: {} } };
    expect(checkC2Concurrency(wf).length).toBe(0);
  });

  it('accepts PR workflow with concurrency', () => {
    const wf = { file: 'foo.yml', text: 'pull_request:\n', doc: { on: { pull_request: null }, concurrency: { group: 'foo-${{ github.ref }}' }, jobs: {} } };
    expect(checkC2Concurrency(wf).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// C3 — timeout-minutes
// ---------------------------------------------------------------------------
describe('C3 — timeout-minutes', () => {
  it('flags job without timeout-minutes', () => {
    const wf = { file: 'foo.yml', doc: { jobs: { build: { 'runs-on': 'ubuntu-latest' } } } };
    expect(checkC3Timeout(wf).length).toBe(1);
  });

  it('accepts job with timeout-minutes', () => {
    const wf = { file: 'foo.yml', doc: { jobs: { build: { 'runs-on': 'ubuntu-latest', 'timeout-minutes': 10 } } } };
    expect(checkC3Timeout(wf).length).toBe(0);
  });

  it('flags only jobs missing timeout (not all jobs)', () => {
    const wf = { file: 'foo.yml', doc: { jobs: {
      ok: { 'runs-on': 'ubuntu-latest', 'timeout-minutes': 5 },
      bad: { 'runs-on': 'ubuntu-latest' },
    } } };
    const violations = checkC3Timeout(wf);
    expect(violations.length).toBe(1);
    expect(violations[0]).toContain('bad');
  });
});

// ---------------------------------------------------------------------------
// C4 — no dead branches
// ---------------------------------------------------------------------------
describe('C4 — no dead branches in triggers', () => {
  it('flags master in branches trigger', () => {
    const wf = { file: 'foo.yml', text: 'on:\n  push:\n    branches: [main, master]\n' };
    expect(checkC4NoDeadBranches(wf).length).toBeGreaterThan(0);
  });

  it('flags develop in branches trigger', () => {
    const wf = { file: 'foo.yml', text: 'on:\n  push:\n    branches: [main, develop]\n' };
    expect(checkC4NoDeadBranches(wf).length).toBeGreaterThan(0);
  });

  it('accepts only main in branches trigger', () => {
    const wf = { file: 'foo.yml', text: 'on:\n  push:\n    branches: [main]\n' };
    expect(checkC4NoDeadBranches(wf).length).toBe(0);
  });

  it('does not flag master when used in runtime condition outside on:', () => {
    // e.g., github.ref == 'refs/heads/master' in a job step — not a trigger
    const wf = { file: 'foo.yml', text: 'on:\n  push:\n    branches: [main]\njobs:\n  x:\n    if: github.ref != "refs/heads/master"\n' };
    expect(checkC4NoDeadBranches(wf).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// C5 — no injection in run:
// ---------------------------------------------------------------------------
describe('C5 — no injection in run blocks', () => {
  it('flags ${{ inputs.x }} in run block', () => {
    const wf = { file: 'foo.yml', text: '    run: |\n      echo "${{ inputs.name }}"\n' };
    expect(checkC5NoInjection(wf).length).toBeGreaterThan(0);
  });

  it('flags ${{ github.event.inputs.x }} in run block', () => {
    const wf = { file: 'foo.yml', text: '    run: echo ${{ github.event.inputs.branch }}\n' };
    expect(checkC5NoInjection(wf).length).toBeGreaterThan(0);
  });

  it('accepts env var expansion (not expression injection)', () => {
    // Using env: section is safe — $ENV_VAR is not expression injection
    const wf = { file: 'foo.yml', text: '    run: echo "$NAME"\n' };
    expect(checkC5NoInjection(wf).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// C6 — playwright projects
// ---------------------------------------------------------------------------
describe('C6 — playwright project names', () => {
  const knownProjects = new Set(['chromium-public', 'chromium-smoke', 'setup']);

  it('flags unknown project name', () => {
    const wf = { file: 'foo.yml', text: 'run: npx playwright test --project=inexistente\n' };
    expect(checkC6PlaywrightProjects(wf, knownProjects).length).toBe(1);
  });

  it('accepts known project name', () => {
    const wf = { file: 'foo.yml', text: 'run: npx playwright test --project=chromium-smoke\n' };
    expect(checkC6PlaywrightProjects(wf, knownProjects).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// C7 — npm scripts
// ---------------------------------------------------------------------------
describe('C7 — npm run scripts', () => {
  const knownScripts = new Set(['test', 'build', 'lint']);

  it('flags unknown npm script', () => {
    const wf = { file: 'foo.yml', text: 'run: npm run nonexistent\n' };
    expect(checkC7NpmScripts(wf, knownScripts).length).toBe(1);
  });

  it('accepts known npm script', () => {
    const wf = { file: 'foo.yml', text: 'run: npm run build\n' };
    expect(checkC7NpmScripts(wf, knownScripts).length).toBe(0);
  });
});
