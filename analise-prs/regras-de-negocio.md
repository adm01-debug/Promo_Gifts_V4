# Regras de Negócio — Promo Brindes V4

**Fontes:** CLAUDE.md, src/types/, src/hooks/, docs/, supabase/migrations/, testes de integração

## Navegação e filtros de lista (useListUrlState)

- Filtros padrão da URL devem ser canonicalizados ao navegar (POP, deep-link): parâmetros com valor default são removidos da URL.
- Parâmetros externos (UTM, page) NÃO são removidos.
- A busca textual (searchKey) é tratada como parâmetro gerenciado.
- Fontes: `src/hooks/common/useListUrlState.ts`, `e2e/carrinhos/list-url-state-restore.spec.ts`

## Sidebar admin (navegação)

- Itens com `devOnly: true` são visíveis apenas para usuários em modo dev/admin.
- Itens com `adminOnly: true` são visíveis apenas para admins.
- Grupos de "Insights" são visíveis para todos os autenticados.
- Fonte: `src/components/layout/SidebarReorganized.tsx:531-537`

## Allowlist de funções SECURITY DEFINER (lint-0029)

- Toda função PostgreSQL com `SECURITY DEFINER` deve estar registrada em `.security/lint-0029-allowlist.json`.
- Funções removidas do banco devem ser removidas da allowlist (stale entries geram falso-positivo no lint).
- `mcp_kv_get`: REVOKE aplicado via migration `20260917060000_e18_revoke_authenticated_mcp_kv_get.sql` — entrada stale removida em PR #2941.
- `is_supervisor_or_above`, `log_rls_denial`: não existem como SECURITY DEFINER no banco — remoção correta.
- Fonte: `.security/lint-0029-allowlist.json`, `docs/security/ALLOWLISTS_MEMORY.md`

## Barra de progresso (fake progress bar)

- Componentes de progresso NÃO devem usar `Math.random()` para calcular incrementos.
- Substituir por progresso baseado em estado real ou seeded/determinístico.
- Fonte: PR #2960 `src/components/novidades/` e `src/components/reposicao/`

## Rotas públicas (deep-links)

- Rotas `/colecao`, `/comparar`, `/lista-publica` estão sem implementação e devem ser removidas do router.
- Fonte: PR #2985, PR #2950 `src/App.tsx`

## Rollback files (supabase/rollbacks/)

- `supabase/rollbacks/` é diretório de **referência apenas** — arquivos `.sql` NÃO são executados automaticamente.
- Rollback NÃO equivale a DDL aplicada — não requer regra E056.
- Fonte: PR #2947, PR #2948, PR #2951 diffs; REGRA #8 CLAUDE.md

## Gate 1.13 — Policies de partições mensais

- Tabelas particionadas por mês geram policies duplicadas do pai nas partições.
- O gate deve tolerar policies de partição semanticamente idênticas à tabela mãe.
- Normalizar nome da partição para `<__PARTITION__>` antes de comparar.
- Bloqueador E043 (policies anon/open) ainda se aplica nas partições.
- Fonte: PR #2952 `scripts/check-policies-baseline.mjs`

## Rate guards (kill_switch_hits)

- `kill_switch_hits` tem trigger `trg_anon_rate_guard` para limitar inserções anônimas.
- Migration `20261029160339_add_kill_switch_hits_anon_rate_guard.sql` aplicou este trigger.
- Rollback disponível em `supabase/rollbacks/20261029160339_rollback.sql`.
- Fonte: PR #2947

## Release management

- Release automatizado via release-please bot.
- NÃO mergear PRs de release manualmente.
- Fonte: PR #2944

## Produto (Product type) — campos obrigatórios

- `price: number`, `sale_price?: number`, `shortDescription: string`, `category_id?: string`, `category_name?: string`.
- Fonte: REGRA #2 CLAUDE.md, `src/types/product-catalog.ts`

## SSOT Supabase

- Projeto canônico de produção: `doufsxqlfjyuvxuezpln`.
- Qualquer referência ao projeto legado [LEGACY_INFORMATIVO] em código executável deve ser substituída pelo canônico.
- Fonte: REGRA #1 CLAUDE.md, `src/integrations/supabase/client.ts`
