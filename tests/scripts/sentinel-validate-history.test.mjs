import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const validator = resolve(root, 'scripts/sentinel-validate-history.sh');

function withGitRepository(run) {
  const directory = mkdtempSync(join(tmpdir(), 'sentinel-validate-history-'));
  try {
    const git = (...args) => execFileSync('git', args, { cwd: directory, encoding: 'utf8' }).trim();
    git('init', '--quiet', '-b', 'main');
    git('config', 'user.name', 'Sentinel Test');
    git('config', 'user.email', 'sentinel-test@example.invalid');
    const commit = (subject) => {
      writeFileSync(join(directory, 'history.txt'), `${subject}\n${Math.random()}\n`);
      git('add', 'history.txt');
      git('commit', '--quiet', '-m', subject);
      return git('rev-parse', 'HEAD');
    };
    run({ directory, git, commit });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe('sentinel-validate-history', () => {
  it('reconhece commit grandfathered via SENTINEL_SHA_ALLOWLIST.txt (passa o SHA ao sentinel-check.sh)', () => {
    withGitRepository(({ directory, commit }) => {
      // Mensagem que nenhuma regra do sentinel-check.sh aceita por si só.
      const sha = commit('push direto histórico sem padrão aceito');

      mkdirSync(join(directory, '.github'), { recursive: true });
      writeFileSync(
        join(directory, '.github', 'SENTINEL_SHA_ALLOWLIST.txt'),
        `${sha}  # grandfathered para este teste\n`,
      );

      const output = execFileSync('bash', [validator, '1', 'main'], {
        cwd: directory,
        encoding: 'utf8',
      });

      // O sentinel-check.sh real (chamado pelo workflow) recebe o SHA como 4º
      // argumento e aceita commits na allowlist (Regra 7.5). O validador
      // histórico precisa reproduzir exatamente essa chamada — caso
      // contrário reporta FAIL para commits legitimamente isentos.
      expect(output).toContain('✅ PASS');
      expect(output).toContain('sha-allowlist');
      expect(output).not.toContain('❌ FAIL');
      expect(output).toMatch(/Passou: 1/);
      expect(output).toMatch(/Falhou: 0/);
    });
  });
});
