import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const selector = resolve(root, 'scripts/sentinel-push-range.sh');
const sentinelCheck = resolve(root, 'scripts/sentinel-check.sh');

function withGitRepository(run) {
  const directory = mkdtempSync(join(tmpdir(), 'sentinel-push-range-'));
  try {
    const git = (...args) => execFileSync('git', args, { cwd: directory, encoding: 'utf8' }).trim();
    git('init', '--quiet', '-b', 'main');
    git('config', 'user.name', 'Sentinel Test');
    git('config', 'user.email', 'sentinel-test@example.invalid');
    const commit = (subject, file = 'history.txt') => {
      writeFileSync(join(directory, file), `${subject}\n`);
      git('add', file);
      git('commit', '--quiet', '-m', subject);
      return git('rev-parse', 'HEAD');
    };
    const select = (before, after) => execFileSync('bash', [selector, before, after], {
      cwd: directory,
      encoding: 'utf8',
    }).trim().split('\n');
    run({ directory, git, commit, select });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function sentinelAccepts(directory, sha) {
  const subject = execFileSync('git', ['log', '-1', '--pretty=%s', sha], { cwd: directory, encoding: 'utf8' }).trim();
  const fullMessage = execFileSync('git', ['log', '-1', '--pretty=%B', sha], { cwd: directory, encoding: 'utf8' }).trim();
  const author = execFileSync('git', ['log', '-1', '--pretty=%an', sha], { cwd: directory, encoding: 'utf8' }).trim();
  try {
    execFileSync('bash', [sentinelCheck, subject, fullMessage, author, sha], { cwd: directory, stdio: 'pipe' });
    return true;
  } catch (error) {
    if (error.status !== 0) return false;
    throw error;
  }
}

function selectFailure(directory, before, after) {
  try {
    const stdout = execFileSync('bash', [selector, before, after], {
      cwd: directory,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return { status: 0, stdout };
  } catch (error) {
    return { status: error.status, stdout: error.stdout?.toString() ?? '' };
  }
}

describe('sentinel-push-range', () => {
  it('não deixa um commit sem PR escapar quando o push termina em squash', () => {
    withGitRepository(({ directory, commit, select }) => {
      const before = commit('chore(docs): baseline');
      const unreviewed = commit('feat: alteração humana sem PR');
      const squash = commit('feat: mudança revisada (#123)');

      expect(select(before, squash)).toEqual([unreviewed, squash]);
      expect(sentinelAccepts(directory, unreviewed)).toBe(false);
      expect(sentinelAccepts(directory, squash)).toBe(true);
    });
  });

  it('seleciona o squash quando ele é o único commit do push', () => {
    withGitRepository(({ commit, select }) => {
      const before = commit('chore(docs): baseline');
      const squash = commit('fix: mudança revisada (#456)');

      expect(select(before, squash)).toEqual([squash]);
    });
  });

  it('inclui todas as integrações first-parent no mesmo push', () => {
    withGitRepository(({ commit, select }) => {
      const before = commit('chore(docs): baseline');
      const firstSquash = commit('feat: primeira mudança revisada (#111)');
      const secondSquash = commit('fix: segunda mudança revisada (#222)');

      expect(select(before, secondSquash)).toEqual([firstSquash, secondSquash]);
    });
  });

  it('preserva o first-parent e exclui commits laterais de merge de PR', () => {
    withGitRepository(({ directory, git, commit, select }) => {
      const before = commit('chore(docs): baseline');
      const unreviewed = commit('feat: alteração humana sem PR');
      git('switch', '--quiet', '-c', 'feature', before);
      const sideCommit = commit('fix: alteração revisada dentro da PR (#789)', 'feature.txt');
      git('switch', '--quiet', 'main');
      execFileSync('git', ['merge', '--no-ff', 'feature', '-m', 'Merge pull request #789 from exemplo/feature'], { cwd: directory, stdio: 'pipe' });
      const merge = git('rev-parse', 'HEAD');

      expect(select(before, merge)).toEqual([unreviewed, merge]);
      expect(select(before, merge)).not.toContain(sideCommit);
    });
  });

  it('retorna erro se before não for ancestral first-parent de after', () => {
    withGitRepository(({ git, commit, directory }) => {
      const before = commit('chore(docs): baseline');
      git('switch', '--quiet', '--orphan', 'unrelated');
      const after = commit('fix: change não relacionada');
      expect(selectFailure(directory, before, after)).toMatchObject({ status: 3, stdout: '' });
    });
  });

  it('rejeita before alcançável apenas pelo segundo pai de um merge', () => {
    withGitRepository(({ directory, git, commit }) => {
      const base = commit('chore(docs): baseline');
      git('switch', '--quiet', '-c', 'feature', base);
      const before = commit('fix: commit da branch lateral (#789)', 'feature.txt');
      git('switch', '--quiet', 'main');
      commit('docs(redeploy): atualização no ramo principal');
      execFileSync('git', ['merge', '--quiet', '--no-ff', 'feature', '-m', 'Merge pull request #789 from exemplo/feature'], { cwd: directory, stdio: 'pipe' });
      const after = git('rev-parse', 'HEAD');

      expect(selectFailure(directory, before, after)).toMatchObject({ status: 3, stdout: '' });
    });
  });

  it('falha fechado para intervalo vazio, SHA malformado e SHA inexistente', () => {
    withGitRepository(({ directory, commit }) => {
      const before = commit('chore(docs): baseline');

      expect(selectFailure(directory, before, before)).toMatchObject({ status: 3, stdout: '' });
      expect(selectFailure(directory, 'not-a-sha', before)).toMatchObject({ status: 2, stdout: '' });
      expect(selectFailure(directory, 'f'.repeat(40), before)).toMatchObject({ status: 2, stdout: '' });
    });
  });
});
