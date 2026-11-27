# Auditoria das ~110 branches locais — 2026-11-27

Continuação de `2026-11-24-auditoria-branches-restantes.md`. Objetivo: garantir que
nenhum trabalho de agente de IA ficou em branch sem entrar em `main`.

## Método

Para cada branch local (exceto `main` e `tmp*`):

1. `git merge-base origin/main <branch>`; se a branch é ancestral de `main` → **incorporada**.
2. `git diff -U0 base..branch` arquivo a arquivo; cada linha adicionada significativa é
   testada contra o conteúdo atual de `main` (`git show origin/main:<path>`).
3. `A` (arquivo novo na branch) e `R` (renomeação, resolve o destino) tratados à parte.

Resultado: **30 arquivos** de código/config com linhas ausentes na `main`. Documentação,
baselines e o `contexto` regenerado foram descartados como ruído (não são trabalho autoral
de agente).

Limite conhecido do método: ele **não detecta reemissão** de migration (mesmo efeito em
arquivo com outro nome). Por isso cada migration suspeita foi conferida por `git grep` do
nome do objeto, não só do arquivo.

## Veredito dos 30

### Trabalho parcial recuperado — 1

| Arquivo | Branch | O que se perdeu | Resgate |
| --- | --- | --- | --- |
| `supabase/migrations/20261122200000_fix_cadeia_views_compras_e_compositions.sql` | `claude/fix-views-cadeia-invoker-261122-1450` | o `COMMENT ON VIEW public.mv_product_compositions` dizia **"refresh CONCURRENTLY pelo cron 47"**; a reemissão perdeu a palavra `CONCURRENTLY` | PR #4194 + #4196, aplicada em produção (`20261126230000`) |

Por que importa: `20260602010000_fix_mv_refresh_cron_missing.sql:25` executa
`REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_product_compositions`. Texto sem
`CONCURRENTLY` induz a rodar `REFRESH` bloqueante, que trava a página pública de produto
enquanto recalcula.

### Superado por implementação melhor na `main` — 3

| Arquivo | Branch | Superado por |
| --- | --- | --- |
| `scripts/check-public-views-drift.mjs` | `claude/fix-qa-etapa-005-open-view-gate-261123-1200` | `buildAnonSql()` na `main` já descobre **todo** objeto de `public` com `has_table_privilege('anon', ..., 'SELECT')` (relkind `v`/`m`/`r`/`p`), cruzado com `.security/public-views-columns.json` (10 views), `.security/anon-select-allowlist.json` (7 objetos justificados) e `.security/anon-tables-baseline.json`. Roda com `--require-live` em `.github/workflows/deploy-gates.yml:501` |
| `tests/security/public-views-columns.test.ts` | `claude/fix-qa-etapa-005-...` | mesma cobertura, agora com allowlist |
| `tests/security/public-views-columns.test.ts` | `claude/fix-qa-etapa-006-contract-compras-views-261123-1215` | `main` já tem `it('cobre exatamente as 10 views do contrato público')` |

A etapa 005 pedia "não filtrar pela lista fixa de views". A `main` resolveu isso de forma
mais completa: descoberta ampla **mais** allowlist explícita, para o gate ser bloqueante sem
listar 190 objetos.

### Trabalho apontando para objeto inexistente — 4

| Arquivo | Problema |
| --- | --- |
| `20261123130000_view_tabela_preco_faixa_public.sql` (+ rollback), na branch `pr/4009` | cria `v_tabela_preco_gravacao_oficial_faixa_public`, que **não existe** em nenhuma migration nem no dump de produção (`grep -c` = 0 em `supabase/migrations-snapshot/SCHEMA_LIVE.sql`); e a revogação contradiz `fn_verify_anon_catalog_grants()` |
| `src/lib/db/postgrest.ts`, `src/lib/external-db/rest-native.ts`, `src/lib/supabase-direct.ts` | redirecionam `customization_price_tiers` para essa view inexistente — aplicado, quebraria a leitura (404) |

Rejeição correta. A view de faixa que existe é `v_compras_precos_faixa` (está no contrato).

### Superado por migration posterior — 6

`20261123100000_mask_cost_compras_catalogo`, `20261123110000_mask_cost_compras_precos_faixa`
e `20261123120000_revoke_variante_anon_grants` (as três, com rollbacks) foram rejeitadas
porque a máscara quebrava a ordem de compra. A vigente é
`20261124140000_close_anon_cost_surface.sql`, na `main`.

### Reemissão com outro nome — 4

| Branch | Situação |
| --- | --- |
| `fix-comment-view-gravacao-261125-1116` | `20261125150000` virou `20261125180000`, na `main` |
| `fix-perf005-drop-concurrently-261126-0105` / `-header-approvedby-` / `-approvedby-nome-` | cadeia `20261126012000` → `20261126020000` → `20261126030000`; a final está na `main` e com recibo em `MIGRATIONS_SYNC_LOG.md` |
| `fix-anon-grants-searchpath-261125-1134` | `20261125114837` virou `20261125120000`, na `main` |

### `main` tem versão mais correta/endurecida — 2

| Arquivo | Branch | `main` |
| --- | --- | --- |
| `20261126060000_crm_seller_identity_admin_rpc.sql` | header antigo, `BEGIN;/COMMIT;` de topo (reprovado pelo preflight) | header de rollback + `approved-by`, sem transação de topo |
| `20261125120000_revoke_anon_internal_grants_public.sql` | `SET search_path TO 'public'` | `SET search_path TO 'public', 'pg_temp'` (fecha shadowing) |

### Já incorporado — 3

| Arquivo | Evidência |
| --- | --- |
| `src/components/admin/security/SecurityTabsList.tsx` | `main` é **superset**: tem `anon-exposure` e `raio-x-anon`, que a branch não tinha |
| `supabase/functions/webhook-dispatcher/index.ts` (etapas 043/044) | `main` já valida em **enforce**: bloqueio 403 + `webhook_deliveries` com `allowlist_blocked:${_host}` + `break` sem retry; `_shared/url-allowlist.ts` existe |
| aba de acessos bloqueados | `BlockedAccessLogTab.tsx`, `useBlockedAccessLog.ts`, `lib/security/blockedAccess.ts` já na `main` via #4186 |

### Só posição de comentário — 1

`20261122180000_restore_definer_views_p06_e_compras.sql`: a linha `-- Rollback:` mudou de
posição dentro do bloco de comentários. Sem diferença semântica.

## Conclusão

Nenhuma melhoria de agente ficou perdida além do `COMMENT` de `mv_product_compositions`,
que voltou em `20261126230000`. As branches listadas podem ser arquivadas.

## Pontos que continuam abertos (não são trabalho de agente perdido)

- `customization_price_tiers` resolve para a tabela base `tabela_preco_gravacao_oficial_faixa`
  nos três clientes de bridge. Não há view pública de faixa para redirecionar. Verificar se
  essa tabela base expõe custo ao `anon` é escopo de hardening, não de resgate.
- O preflight `scripts/preflight-migration-apply.mjs:154` acusa `CONCURRENTLY` dentro de
  **string literal** de `COMMENT` (falso positivo). Workaround usado: `-- transaction: none`
  no cabeçalho.
---

## Segunda passada — comparação byte a byte com normalização (2026-11-27)

A primeira passada comparou linha adicionada × linha da `main`. Isso gera ruído
(comentário, posição, whitespace) e pode tanto esconder trabalho real quanto
produzir falso positivo. A segunda passada removeu o ruído:

- **Escopo**: 80 branches + 12 refs de PR (`pr/4003`…`pr/4088`, `c4039`, `work`).
- **Método**: `git merge-base origin/main <ref>` → `git diff --name-status` →
  para cada arquivo **relevante** (`src/`, `supabase/migrations/`,
  `supabase/rollbacks/`, `scripts/`, `.github/workflows/`, `.security/`,
  `tests/`), comparar `git show <ref>:<path>` com `git show origin/main:<path>`
  após remover comentários (`--`, `/* */`, `//`) e colapsar whitespace.
- **Ignorados por construção**: `docs/`, `*.md`, `MIGRATIONS_SYNC_LOG.md`,
  `migrations-snapshot/`, `package-lock.json`, `public/`.
- **Resultado**: 43 arquivos relevantes comparados → **20 candidatos**
  (12 existem só na branch, 8 divergem). Todos com veredito abaixo.

### Arquivo existe só na branch — 12

| Arquivo | Branch | Veredito |
| --- | --- | --- |
| `20261123100000_mask_cost_compras_catalogo.sql` (+ rollback) | `pr/4004` | superado por `20261124140000_close_anon_cost_surface.sql` |
| `20261123110000_mask_cost_compras_precos_faixa.sql` (+ rollback) | `pr/4005` | idem |
| `20261123120000_revoke_variante_anon_grants.sql` (+ rollback) | `pr/4006` | idem |
| `20261123130000_view_tabela_preco_faixa_public.sql` (+ rollback) | `pr/4009` | **rejeitado com razão**: `security_invoker = false` + `grant select … to anon` numa view de `public`, sem consumidor anon — o próprio cabeçalho diz "essas telas sao admin-only". Leak cross-tenant e contra o endurecimento de custo anon |
| `20261125114837_revoke_anon_internal_grants_public.sql` (+ rollback) | `pr/4071` | reemitido como `20261125120000`, com `search_path` mais restrito (`'public', 'pg_temp'`) |
| `20261125150000_fix_comment_v_tabela_gravacao_publica.sql` (+ rollback) | `claude/fix-comment-view-gravacao-261125-1116` | reemitido como `20261125180000` (mesmo `COMMENT ON VIEW`) |

### Conteúdo diverge — 8

| Arquivo | Veredito |
| --- | --- |
| `.security/policies-baseline.json` | só `generated_at` difere; `sha256` idêntico → mesmo conteúdo |
| `src/pages/admin/AdminCadastrosPage.tsx` | `main` é superset: tem a aba `ramos` **e** a aba `classificacao`; a branch só tem `ramos` |
| `20261101205400_perf005_drop_unused_indexes.sql` | branch usa `DROP INDEX CONCURRENTLY`; a `main` já tem isso em `20261126030000_perf005_drop_unused_indexes_concurrently.sql` (49 DROPs) |
| `.github/workflows/schema-snapshot-export.yml` | branch usa `db.<ref>.supabase.co` (IPv6-only, inalcançável no runner — E037); `main` usa secrets Supavisor IPv4. A `main` é a correção |
| `src/lib/db/postgrest.ts` | só a linha do alias `customization_price_tiers` → view inexistente |
| `src/lib/external-db/rest-native.ts` | idem (+ entrada no `REST_NATIVE_SAFE_TABLES`) |
| `src/lib/supabase-direct.ts` | idem |
| `.security/anon-tables-baseline.json` | branch lista 42 tabelas; `main` tem 29 (mais restritiva e verde ao vivo) |

### Conclusão

Dos 43 arquivos relevantes comparados, **um único** continha trabalho
inaproveitado: o `COMMENT ON VIEW public.mv_product_compositions` com a palavra
`CONCURRENTLY`, resgatado na migration `20261126230000` e aplicado em produção.
Todo o resto era reemissão, superset na `main`, referência a objeto inexistente
ou exposição anon sem consumidor.
