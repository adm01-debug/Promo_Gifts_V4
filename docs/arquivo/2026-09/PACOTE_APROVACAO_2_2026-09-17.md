# Pacote de Aprovação #2 — Segurança + Desempenho + Cron (2026-09-17)

`[REQUER-PO]`. Nenhuma ação abaixo foi executada — todas as migrations citadas existem no repositório (branch `claude/audit-gaps-20260915`, PR #1865) mas **nenhuma foi aplicada** ao banco canônico `doufsxqlfjyuvxuezpln` (confirmado ao vivo: nenhuma das 7 versões abaixo está em `supabase_migrations.schema_migrations`).

7 ações, sem dependência entre si — podem ser aprovadas em qualquer combinação. Cada migration já tem pré-condição e pós-condição embutidas (`DO $$ ... RAISE EXCEPTION` se o estado ao vivo não bater com o esperado) — aplicação via E15 (`.github/workflows/db-apply-migration.yml`) aborta sozinha se algo mudou desde esta revisão.

---

## Ação 1 — REVOKE: `mcp_kv_get` de `authenticated` (crítico)

**Arquivo:** `supabase/migrations/20260917060000_e18_revoke_authenticated_mcp_kv_get.sql`
**Origem:** E18 do plano DBA. Investigação completa: `docs/E18_MCP_KV_GET_ACHADO_CRITICO_2026-09-17.md`.

**O que é:** `public.mcp_kv_get(p_secret, p_key)` é SECURITY DEFINER e tem `EXECUTE` concedido a `authenticated` — qualquer usuário logado do app. A única guarda é comparar `p_secret` contra um token fixo embutido no corpo da função, mas `pg_get_functiondef` é legível por qualquer role com `authenticated`, então o "segredo" não protege nada de quem já tem `EXECUTE`. Isso expõe `public.mcp_kv` (hoje 1 linha: credencial de API `higgsfield_creds`) apesar de RLS deny-all correta na tabela.

**Efeito:** `REVOKE EXECUTE ON FUNCTION public.mcp_kv_get(text, text) FROM authenticated`. `service_role` mantém acesso. `mcp_kv_set`/`mcp_kv_try_lock` (funções irmãs) já não tinham esse grant — confirma que é exceção acidental, não decisão deliberada.

**Consumidor conhecido afetado:** nenhum (grep em `src/`/`supabase/functions/` só encontra o stub de tipo gerado).

**Teste de reversão:** `GRANT EXECUTE ON FUNCTION public.mcp_kv_get(text, text) TO authenticated;`

---

## Ação 2 — REVOKE: 4 gaps de autorização em funções `authenticated` (bundle)

**Arquivo:** `supabase/migrations/20260917061500_e18_revoke_authenticated_authz_gaps.sql`
**Origem:** E18 do plano DBA. Investigação completa: `docs/E18_ACHADOS_SECUNDARIOS_AUTHENTICATED_2026-09-17.md`.

**4 funções, 1 migration** (revisadas como bundle por serem do mesmo padrão — grant a `authenticated` sem necessidade, com gap real no corpo):

| Função | Gap |
|---|---|
| `confirm_notifications_dispatched(uuid[])` | IDOR — marca notificação de qualquer usuário como lida, sem checar `auth.uid()` |
| `registrar_entrada_estoque(...)` | sem checagem de identidade; `p_user_id` é parâmetro livre gravado como autor no log de auditoria (forjável) |
| `registrar_saida_estoque(...)` | idem |
| `fn_notify_user(...)` | exige `auth.uid()` mas não checa relação chamador↔alvo — qualquer authenticated envia notificação para qualquer usuário (spam/phishing) |

**Consumidor conhecido afetado:** `confirm_notifications_dispatched` é usada por `supabase/functions/process-queue/index.ts`, que usa `SUPABASE_SERVICE_ROLE_KEY` — `service_role` mantém `EXECUTE` próprio, REVOKE de `authenticated` não afeta esse consumidor. As outras 3: nenhum call-site real encontrado.

**Teste de reversão:** `GRANT EXECUTE` de volta, uma por função (comando exato no cabeçalho do arquivo).

---

## Ação 3 — Performance: reescreve predicado não-sargável em `fn_aggregate_stock_daily` + reduz frequência do cron

**Arquivo:** `supabase/migrations/20260917080000_e35_fix_reposicao_backfill_perf.sql`
**Origem:** E35 do plano DBA. Investigação completa: `docs/E35_REPOSICAO_BACKFILL_LENTO_2026-09-17.md`.

**Tipo:** `CREATE OR REPLACE FUNCTION` (reescreve 1 cláusula `WHERE`, sem mudar lógica de agregação) + `cron.alter_job` (schedule `5 * * * *` → `5 */4 * * *`).

**O que é:** o predicado `(captured_at AT TIME ZONE 'America/Sao_Paulo')::date = p_date` força varredura do índice inteiro (274.462 linhas) a cada chamada horária. Medido com `EXPLAIN (ANALYZE, BUFFERS)` real: 7.513 ms → **16 ms** (~470x) com range sargável equivalente (prova de equivalência por `count(*)`, reconfirmada em pré/pós-condição da própria migration). Redução de frequência (24→6 chamadas/dia) mitiga a 2ª causa raiz (anti-join de baseline, ~2,65s por chamada) sem reescrever lógica com histórico de bugs sutis.

**Efeito estimado:** ~427 s/dia → ~60 s/dia de custo total de cron para este job (~86% de redução).

**Teste de reversão:** `cron.alter_job` de volta para `5 * * * *` + `CREATE OR REPLACE` com o `WHERE` original (versão `v5_sp_tz_minmax_fix`, texto completo arquivado em `docs/E35_REPOSICAO_BACKFILL_LENTO_2026-09-17.md` e recuperável via `pg_get_functiondef` antes da aplicação).

---

## Ação 4 — Cron: divide 5 jobs genuinamente multi-statement

**Arquivo:** `supabase/migrations/20260917100000_e37_split_genuine_multistatement_cron.sql`
**Origem:** E37 do plano DBA. Investigação completa: `docs/E37_CRON_MULTISTATEMENT_2026-09-17.md`.

**Tipo:** `cron.alter_job` em 5 jobids (233, 208, 195, 53, 244) — só o `command`, nenhuma função alterada, nenhum schedule muda.

**O que é:** dos 57 jobs que a query antiga (falso-positivo, contava `;` no texto inteiro) apontava, só 6 têm statements internos genuinamente múltiplos — 1 (`schema-drift-check`, jobid 245) já corrigido pela Ação 6 (E47) abaixo. Dos 5 restantes, 4 (`ai-queue-stuck-cleanup`, `fantasmas-deactivate-guard`, `analyze-weekly-supplement`, `vacuum-analyze-weekly`) são divididos em chamadas independentes de `fn_cron_safe_run` — evita que a falha de 1 statement impeça os seguintes de rodar silenciosamente. O 5º (`refresh-category-ancestors`, TRUNCATE+INSERT) é mantido **junto** de propósito — statements acoplados, dividir pioraria a atomicidade.

**Teste de reversão:** `cron.alter_job` de volta ao command original — texto completo dos 5 commands originais no rodapé do arquivo.

---

## Ação 5 — Cron: remove 2 jobs desligados sem caminho de volta

**Arquivo:** `supabase/migrations/20260917070000_e38_unschedule_dead_cron_jobs.sql`
**Origem:** E38 do plano DBA. Investigação completa: `docs/E38_CRON_JOBS_DESLIGADOS_2026-09-17.md`.

**O que é:** `pipeline-classify-categories` (jobid 274) chama uma função que não existe mais no schema (`to_regprocedure` = NULL). `process-webhook-outbox` (jobid 202) processa uma fila com 0 linhas e sem produtor/consumidor real — substituída por dispatch direto via `webhook-dispatcher`. Ambos já `active=false`; a migration só formaliza via `cron.unschedule`, sem mudar comportamento hoje.

**Teste de reversão:** `cron.schedule` de volta — comandos exatos no rodapé do arquivo (nota: `pipeline-classify-categories` não voltaria a funcionar mesmo revertido, a função que ele chama continua ausente).

---

## Ação 6 — Cron: isola savepoint do `schema-drift-check`

**Arquivo:** `supabase/migrations/20260917090000_e47_fix_schema_drift_cron_split.sql`
**Origem:** E47 do plano DBA. Investigação completa: `docs/E47_SCHEMA_DRIFT_DETECTOR_2026-09-17.md`.

**O que é:** o job (jobid 245) embrulha 2 statements numa só chamada de `fn_cron_safe_run` — blocos `EXCEPTION` do PL/pgSQL funcionam como savepoint implícito, então uma falha na 2ª statement (a "bridge" que grava o resultado) desfaria também a gravação da 1ª (o check real de drift), sem que `cron.job_run_details` jamais mostrasse falha. Migration separa em 2 chamadas sequenciais de `fn_cron_safe_run` (mesma chave de advisory lock 25, reentrante) — nenhuma função é alterada, só o `command` do job.

**Teste de reversão:** `cron.alter_job` de volta ao command de 1 chamada — texto completo no rodapé do arquivo.

---

## Ação 7 — Metadado: corrige `COMMENT ON TABLE products`

**Arquivo:** `supabase/migrations/20260917110000_e45_fix_products_comment.sql`
**Origem:** E45 do plano DBA. Investigação completa: `docs/E45_PRODUCTS_GOD_TABLE_2026-09-17.md`.

**Tipo:** `COMMENT ON TABLE` — só metadado (`pg_description`), zero efeito em dado/estrutura/leitura.

**O que é:** o comentário afirma 152 colunas ("ESTADO 2026-06-23"); contagem real hoje é 184 (`information_schema.columns`, confirmado ao vivo). Comentário atualizado com a contagem correta, mapa dos 5 satélites já existentes (~67/184 colunas já espelhadas) e a recomendação de não abrir satélite novo (só completar `product_physical` para o residual físico).

**Teste de reversão:** `COMMENT ON TABLE` de volta ao texto original — texto completo no rodapé do arquivo.

---

## Resumo para decisão rápida

| # | Ação | Tipo | Risco | Consumidor afetado |
|---|---|---|---|---|
| 1 | REVOKE `mcp_kv_get` | ACL | Baixo | Nenhum conhecido |
| 2 | REVOKE 4 funções (authz gaps) | ACL | Baixo | Nenhum conhecido (service_role preservado onde usado) |
| 3 | Reescreve predicado + reduz frequência cron | Função + schedule | Médio (função reescrita, mas equivalência provada 2x) | `fn_reposicao_backfill_today` (interno) |
| 4 | Divide 5 crons multi-statement | Schedule (command) | Baixo (nenhuma função muda) | 5 jobs internos |
| 5 | Remove 2 crons mortos | Schedule | Nenhum (já inativos) | Nenhum |
| 6 | Isola savepoint schema-drift-check | Schedule (command) | Baixo | 1 job interno |
| 7 | Corrige comentário `products` | Metadado | Nenhum | Nenhum |

**Aprovação pode ser dada por item, por grupo, ou para o pacote inteiro ("aprovado").**
