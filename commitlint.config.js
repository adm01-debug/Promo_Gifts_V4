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
    // E184 (P200): lista fechada de escopos. Nível warn (1) para não bloquear
    // commits retroativos, mas guia os agentes para terminologia consistente.
    // ci/workflows/gates/governanca → usar só "ci"; fix(revisão) → fix(docs).
    'scope-enum': [
      1,
      'always',
      [
        // Domínios de produto
        'auth', 'catalog', 'quotes', 'kit', 'magazine', 'stock', 'mockup', 'cart',
        // Infraestrutura e plataforma
        'ci', 'db', 'supabase', 'migrations', 'edge-fn', 'vercel', 'deploy',
        // Código e build
        'types', 'config', 'deps', 'build', 'lint', 'test',
        // Qualidade e segurança
        'security', 'perf', 'a11y', 'ux', 'seo',
        // Documentação e governança
        'docs', 'plan', 'audit', 'governance',
        // Ondas P200 (prefixo onda + número)
        'onda15', 'onda16', 'onda17', 'onda18', 'onda19', 'onda20',
        // Código de componente específico (escopo livre mas registrado)
        'components', 'hooks', 'pages', 'services', 'utils',
        // update-snapshots é gerado automaticamente pelo workflow
        'update-snapshots',
      ],
    ],
    // Mensagens geradas por merge/squash do GitHub já passam no formato.
    'subject-case': [0],
    'header-max-length': [1, 'always', 120],
  },
};
