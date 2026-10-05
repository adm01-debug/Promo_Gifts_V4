/**
 * commitlint — enforcement local de Conventional Commits (REGRA #6).
 *
 * Tipos aceitos (mesmos de CONTRIBUTING.md): feat, fix, test, refactor,
 * chore, docs, ci, build — mais `merge`/`revert` gerados por tooling e
 * `perf`/`style`/`hotfix` usados no histórico do repo.
 *
 * A auditoria 20-dim (2026-10-02, dim. Qualidade de Código) flagou que a
 * convenção era documentada mas não enforced — este hook fecha o gap.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'test',
        'refactor',
        'chore',
        'docs',
        'ci',
        'build',
        'perf',
        'style',
        'hotfix',
        'revert',
        'merge',
      ],
    ],
    // Mensagens geradas por merge/squash do GitHub já passam no formato —
    // sem exigir scope (o repo usa scopes livres: fix(ci):, feat(auth):...).
    'subject-case': [0],
    'header-max-length': [1, 'always', 120],
  },
};
