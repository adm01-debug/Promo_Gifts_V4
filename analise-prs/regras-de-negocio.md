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

- Funções com SECURITY DEFINER que ainda têm EXECUTE para authenticated devem estar na allowlist `.security/lint-0029-allowlist.json` com justificativa.
- Funções cujo REVOKE foi aplicado via migration devem ser removidas da allowlist.
- Fontes: `.security/lint-0029-allowlist.json`, `docs/security/ALLOWLISTS_MEMORY.md`

## Migrations

- Apenas aditivas (CREATE TABLE, ADD COLUMN, CREATE INDEX) são seguras para merge automático.
- Migrations com CRON (pg_cron) precisam de DECISÃO HUMANA.
- Migrations com REVOKE, DROP, ALTER TYPE são DECISÃO HUMANA.
- Caminho autorizado: `.github/workflows/db-apply-migration.yml` (workflow_dispatch).
- Fonte: CLAUDE.md REGRA #8

## SSOT Supabase

- Projeto canônico: `doufsxqlfjyuvxuezpln`
- `src/integrations/supabase/client.ts` nunca deve ser alterado para outro projeto.
- Fonte: CLAUDE.md REGRA #1

## Segurança de dependências

- `scripts/check-dependency-audit.mjs`: advisory GHSA-g3hv-75wg-m249 (minimatch) tem duas representações de range no npm; ambas devem ser aceitas.
- `effects` de vulnerability deve ser Array.isArray — null/undefined não pode ser coagido a `[]`.
- Fonte: `scripts/check-dependency-audit.mjs`, `tests/scripts/check-dependency-audit.test.mjs`
