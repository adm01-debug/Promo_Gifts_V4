# Auditoria — pgmq e Secrets do Vault

> Auditado em 2026-10-27 · Projeto `doufsxqlfjyuvxuezpln`

---

## pgmq

| Item | Valor |
|---|---|
| Versão | 1.5.1 |
| Filas criadas | 0 |
| Crons que usam pgmq | 0 |
| Funções em `public` que referenciam pgmq | 0 |
| Referências no código do repo | apenas snapshots/baseline (estrutura da extensão) |

**Conclusão:** pgmq instalado mas completamente sem uso. Nenhum code path chega nele.
**Ação:** nenhuma urgente. Manter instalado (sem custo) ou remover se houver política de "zero extensões ociosas".

---

## Vault — Inventário de Secrets

16 secrets presentes, todos com valor definido (verificado via `vault.decrypted_secrets`):

| Secret | Data de criação | Status |
|---|---|---|
| `asia_api_key` | 2026-06-09 | ✅ SET |
| `asia_secret_key` | 2026-06-09 | ✅ SET |
| `BACKFILL_DIM_CRON_SECRET` | 2026-06-17 | ✅ SET |
| `CF_ACCOUNT_ID` | 2026-06-07 | ✅ SET |
| `CF_API_TOKEN` | 2026-06-07 | ✅ SET |
| `CHAMPIONS_RECEIVE_QUOTE_SYNC_URL` | 2026-07-10 | ✅ SET |
| `CONNECTIONS_AUTO_TEST_SECRET` | 2026-05-14 | ✅ SET |
| `CRM_CALLBACK_API_KEY` | 2026-07-09 | ✅ SET |
| `CRON_SECRET` | 2026-05-15 | ✅ SET |
| `EDGE_FUNCTIONS_BASE_URL` | 2026-05-30 | ✅ SET |
| `GENERATE_BLURHASHES_CRON_SECRET` | 2026-06-17 | ✅ SET |
| `HASH_PRODUCT_IMAGES_CRON_SECRET` | 2026-06-17 | ✅ SET |
| `jina_api_key` | 2026-06-07 | ✅ SET |
| `sm_session_cookie` | 2026-06-07 | ✅ SET |
| `SPOT_ACCESS_KEY` | 2026-06-06 | ✅ SET |
| `WEBHOOK_DISPATCHER_SECRET` | 2026-05-14 | ✅ SET |

---

## `get_edge_function_secret` — Allowlist × Vault × Crons

Função `public.get_edge_function_secret` tem allowlist hardcoded de 9 nomes:

| Secret no allowlist | No vault? | Referenciado por cron? | Status |
|---|---|---|---|
| `WEBHOOK_DISPATCHER_SECRET` | ✅ sim | não (webhook-dispatcher usa bearer header) | OK |
| `WEBHOOK_DISPATCHER_URL` | ❌ não | não | ⚠️ Allowlist stale — sem impacto ativo |
| `WEBHOOK_SECRET` | ❌ não | não | ⚠️ Allowlist stale — sem impacto ativo |
| `CONNECTIONS_AUTO_TEST_SECRET` | ✅ sim | `connections-auto-test` (migration `20261027120000` em andamento) | ✅ Sendo corrigido |
| `CRON_SECRET` | ✅ sim | ~14 crons | ✅ OK |
| `HASH_PRODUCT_IMAGES_CRON_SECRET` | ✅ sim | `hash-product-images` | ✅ OK |
| `GENERATE_BLURHASHES_CRON_SECRET` | ✅ sim | `generate-blurhashes` (migration `20261027180000`) | ✅ OK |
| `BACKFILL_DIM_CRON_SECRET` | ✅ sim | `backfill-image-dimensions` | ✅ OK |
| `ASIA_INGESTION_CRON_SECRET` | ❌ não | não (nenhum cron ativo referencia) | ⚠️ Allowlist stale — sem impacto ativo |

---

## Bug encontrado: `xbz-image-uploader` cron silenciosamente quebrado

| Item | Detalhe |
|---|---|
| Cron | `xbz-image-uploader` — `active=true`, schedule `3,13,23,33,43,53 * * * *` (6x/hora) |
| Secret referenciado | `XBZ_IMAGE_UPLOADER_CRON_SECRET` |
| No allowlist? | ❌ não |
| No vault? | ❌ não |
| Edge function existe? | ❌ não (ausente no repo e nas 109 funções deployadas) |
| Comportamento real | `get_edge_function_secret` lança EXCEPTION → `fn_cron_safe_run` captura → cron mostra `status: succeeded` mas função nunca foi chamada |
| Fix | Migration `20261027220000_deactivate_xbz_image_uploader_cron.sql` — desativa o cron |

**Para reativar:** criar `supabase/functions/xbz-image-uploader/index.ts` com `authorizeCron`, adicionar `XBZ_IMAGE_UPLOADER_CRON_SECRET` ao vault e ao allowlist de `get_edge_function_secret`, deployar via `deploy-edge-functions.yml`.

---

## Stale entries no allowlist (baixo risco)

`WEBHOOK_DISPATCHER_URL`, `WEBHOOK_SECRET`, `ASIA_INGESTION_CRON_SECRET` estão no allowlist de `get_edge_function_secret` mas:
- Não existem no vault
- Nenhum cron ativo os referencia
- Sem impacto operacional atual

Recomendação: remover do allowlist em migration futura para manter o allowlist enxuto.
