import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const script = resolve(root, 'scripts/sentinel-pr-merge-subject.sh');

function isPrMergeSubject(subject) {
  try {
    execFileSync('bash', [script, subject], { cwd: root, stdio: 'pipe' });
    return true;
  } catch (error) {
    if (error.status === 1) return false;
    throw error;
  }
}

describe('sentinel-pr-merge-subject', () => {
  it.each([
    ['squash GitHub com sufixo de PR real', 'feat(e128): split PromoFlixPlayer.tsx 1512→699 linhas + usePromoFlixPlayer hook (#2810)'],
    ['squash com espaço terminal', 'fix: corrige falha (#2839) '],
    ['merge commit padrão', 'Merge pull request #456 from exemplo/branch'],
    ['merge commit customizado', 'Merge PR #1812: consolida correções'],
    ['merge lowercase do repositório', 'merge(pr-1852): corrige revista'],
  ])('reconhece %s como merge de PR', (_description, subject) => {
    expect(isPrMergeSubject(subject)).toBe(true);
  });

  it.each([
    'feat: alteração sem PR',
    'chore: bump de CI',
    'Merge branch \'main\' into \'claude/feature\'',
    'feat: PR sem número (#ABC)',
  ])('continua auditando push comum: %s', (subject) => {
    expect(isPrMergeSubject(subject)).toBe(false);
  });
});
