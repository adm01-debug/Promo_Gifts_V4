# As 127 migrations órfãs e o portão retroativo — 2026-11-19

Este arquivo responde à pendência **"drift de schema: migrations não reconstroem o
banco"**. A resposta não é a que se esperava: o trabalho dos outros agentes não foi
esquecido. Ele está preso.

## Como isto apareceu

Não por busca direta. A trilha foi: duas PRs vermelhas (#3791, #3832) → o único
check reprovado nas duas **não era culpa delas** → "Supabase Preview" → drift de
schema → comparação do ledger de produção com os arquivos do repo.

## O número

| | |
|---|---|
| versões em `supabase/migrations/` | 3.095 |
| versões em `supabase_migrations.schema_migrations` (produção) | 2.979 |
| **arquivo no repo, sem recibo no ledger** | **127** |
| → nunca aplicadas (objetos não existem no banco) | **101** |
| → aplicadas por outro caminho, só falta o recibo | 19 |
| → inertes / indeterminadas | 7 |

Medido dia a dia, com `comm` sobre listas geradas por consulta, sem transcrever
versão a mão. 47 das 101 passaram por um cético adversarial; **nenhuma foi
refutada**.

## A causa: portões criados depois do trabalho

O único caminho autorizado de aplicação é `db-apply-migration.yml`, e ele roda
`scripts/preflight-migration-apply.mjs` **antes** de tocar o banco. Esse script
nasceu em **2026-09-17**; a regra E066 só entrou em **2026-10-19**.

Resultado, medido arquivo por arquivo contra as 101:

| regra | o que exige | órfãs barradas |
|---|---|---|
| **E063** (duas exigências) | cabeçalho `-- Rollback:` nas 40 primeiras linhas do arquivo | **70** |
| | **e** rollback como arquivo em `supabase/rollbacks/` | **78** |
| **E066** | `pg_temp` explícito no `SET search_path` de `SECURITY DEFINER` | 26 — das quais **22 escritas antes da regra existir** |
| **E062** | `CREATE INDEX` com `CONCURRENTLY` | 20 |
| **E067** | `CREATE EXTENSION ... WITH SCHEMA extensions` | 0 |
| | **com pelo menos um impedimento** | **85** |
| | **passariam hoje, sem ajuste** | **16** |

Migration escrita em maio ou junho de 2026 não teria como trazer rollback em
arquivo nem `pg_temp`: o contrato não existia. O portão passou a **rejeitá-las
retroativamente**, e cada tentativa de aplicar morre no preflight — que é
read-only, então nada fica pela metade e nada avisa ninguém.

A ironia que fecha o diagnóstico: `20260604000001_fix_security_definer_search_path.sql`
e `20261111222500_fix_touch_seller_cart_secdef.sql` existem **para corrigir
`search_path` de `SECURITY DEFINER`** — e são barradas pela regra de `search_path`
de `SECURITY DEFINER`, por usarem `'public'` em vez de incluir `pg_temp`.

## O que isso custou, concretamente

Duas correções de segurança escritas por outro agente, mergeadas, e paradas fora
do banco:

**1. `20261108235500_restrict_art_files_public_read_to_quotes.sql` — vazamento real,
agora fechado.** A policy `art_files_public_read` estava viva em produção com role
`public`: **todo** o bucket `art-files` — mockups, logos e layouts enviados por
clientes — era legível por qualquer anônimo com a URL. Raio de impacto verificado
de forma independente antes de aplicar: os únicos pontos que geram URL pública são
o PDF da proposta em `quotes/<id>/` (`QuoteActionHandlers.ts:152` e
`QuoteBitrixSync.ts:142`), preservados pela policy nova; e `ArtFileUpload.tsx:119`
grava arte de cliente em `${userId}/...`, que era exatamente o que estava aberto.
Aplicada pelo `db-apply-migration.yml` (run 44461175232) e **confirmada no banco**:
`art_files_public_read` não existe mais; no lugar estão `art_files_quotes_public_read`
(público, só `quotes/%`) e `art_files_auth_read` (authenticated, bucket inteiro).

**2. `20261115013000_fix_get_quote_token_public_respeita_expiracao.sql` — latente.**
`get_quote_token_public` é `SECURITY DEFINER`, executável por `anon`, e filtra só
por `token = _token`: link de orçamento expirado segue devolvendo `client_name` e
`signer_name`. A função irmã `submit_quote_response`, do mesmo fluxo, já filtra
expiração — com link vencido não se pode responder, mas ainda se pode ler.
Esta é a que o preflight reprovou (run 44461492894, regra E066): **nasceu
barrada**. Superada por `20261119051500`. Risco medido: `quote_approval_tokens`
tem **0 linhas**, então nada vaza hoje; começaria no primeiro token emitido.

## As 16 que passam no preflight hoje

> **Correção de 2026-11-19, depois de aplicar de verdade.** A primeira versão deste
> arquivo dizia **18**, porque eu medi a E063 só pela existência do arquivo de
> rollback. A regra tem **duas** exigências, e a segunda é um cabeçalho
> `-- Rollback:` nas 40 primeiras linhas da própria migration
> (`scripts/preflight-migration-apply.mjs:304-305`). O número certo é **16**.
> Descobri isso ao despachar `20261027195959`: o preflight reprovou com
> *"arquivo não tem cabeçalho de rollback lógico"* (run 44473368574), **sem tocar
> o banco**. Saem da lista `20261027195959` e `20261027234500`.

Três já foram aplicadas nesta sessão: `20261108235500`, `20260916202000` e
`20261115034500`. O resto é resgate direto, sem reescrever nada:

| versão | arquivo | o que faz |
|---|---|---|
| `20260916202000` | `e23_force_rls_secret_tables.sql` | `FORCE ROW LEVEL SECURITY` em `integration_credentials`, `external_connections`, `secret_rotation_log` e outras |
| `20260917070000` | `e38_unschedule_dead_cron_jobs.sql` | remove 2 jobs de cron mortos |
| `20260917090000` | `e47_fix_schema_drift_cron_split.sql` | divide o command do job `schema-drift-check` |
| `20260917100000` | `e37_split_genuine_multistatement_cron.sql` | divide o command de 5 jobs multi-statement |
| `20261022195616` | `fix_update_company_fields_security_definer_search_path.sql` | `search_path` de `update_company_fields` |
| `20261022203935` | `update_company_fields_security_fix.sql` | idem, correção de segurança da mesma função |
| `20261027220000` | `deactivate_xbz_image_uploader_cron.sql` | desativa o job `xbz-image-uploader` |
| `20261108223000` | `add_stock_daily_summary_date_index.sql` | índice em `stock_daily_summary (summary_date)` |
| `20261108230000` | `remove_broken_cron_image_dimensions_backfill.sql` | remove job de cron quebrado |
| `20261108230100` | `cron002_fix_residual_collisions.sql` | desconflita horário de 4 jobs |
| `20261114120000` | `cron004_reduz_frequencia_jobs_ociosos.sql` | reduz frequência de 7 jobs ociosos |
| `20261114160000` | `perf_idx_sds_restock_counts.sql` | índice de reposição |
| `20261115034500` | `rpc_sales_assistant_candidates.sql` | RPC do assistente de vendas, com `REVOKE ... FROM PUBLIC, anon` |
| `20261115130000` | `idx_sds_summary_date_supplier_include.sql` | índice composto de estoque |
| `20261115130100` | `fn_market_intelligence_macro.sql` | função de inteligência de mercado, com `REVOKE ... FROM PUBLIC, anon` |

## O drift na direção oposta

5 linhas do ledger não têm arquivo no repo. Nenhuma é trabalho perdido, mas duas
importam:

- `001` a `005`: **sem nome e sem SQL**. Bookkeeping vazio — é o que faz o
  "Supabase Preview" reprovar com `Remote migration versions not found in local
  migrations directory` **na própria `main`**, para sempre.
- `20260623_create_process_notifications_queue_rpcs`: criou
  `process_notifications_queue` e `confirm_notifications_dispatched` direto no
  banco. As versões dessas funções nos arquivos do repo (`20260604000006`,
  `20260604000008`) usam colunas `dispatched_at` e `dispatch_claim_expires_at`
  que **não existem em produção**. Repo e banco discordam no mesmo objeto.
- `20260623_bugalert1`, `20260623_fix_google_provider_secret_name`,
  `2026062311292414001`, `20260712`: DDL e UPDATE aplicados sem arquivo. Nos
  `statements` gravados há reticências e comentários em PT-BR — são **resumos**,
  não o SQL íntegro, então não servem para reconstruir o banco.

## E o `p.slug`

O outro motivo do "Supabase Preview" vermelho: o replay do zero morre em
`supabase/migrations/20260512000000_bootstrap_missing_application_schemas.sql:1099`,
onde `analytics.mv_product_cards` faz `SELECT "p"."slug"` de `public.products` — e
nenhuma migration da história cria essa coluna. Em produção ela existe.

Cuidado registrado para quem for corrigir: **acrescentar só `slug` não resolve**. A
mesma view também lê `short_description` e `sale_price`, que tampouco existem no
replay. Foi um cético que derrubou essa correção antes de ela virar trabalho.

## O que fica para decisão do dono (Git 7)

1. **As 83 barradas**: escrever os 78 rollbacks faltantes — trabalho real, e
   algumas são de maio/junho — ou marcá-las explicitamente como
   legado-não-aplicável. É decisão de custo.
2. **As 10 linhas-lixo do ledger** (`001`–`005` e as 5 malformadas): limpá-las é
   dado em produção e vai pelo `db-apply-migration.yml`.
3. **O tamanho do `MIGRATIONS_SYNC_LOG.md`**: 360 KB num arquivo que todo PR de
   migration precisa editar. Por `git push` funciona; pelo MCP do GitHub é
   inviável (a Contents API substitui o arquivo inteiro). Quebrar por ano manteria
   o contrato de recibo, mas é mudança de contrato.

## Nota de método

Três coisas que custaram tempo aqui:

1. **`git push` funciona neste ambiente.** Ele parece travar porque o hook
   `pre-push` do husky roda lint, typecheck e testes antes de enviar. Dê tempo,
   não mate o processo — e não redirecione a saída por `| tail`, que bufferiza e
   esconde o progresso.
2. **Teste de presença mal-formulado mente.** Procurar `expires_at` em
   `pg_get_functiondef` deu "presente" porque a coluna já aparecia no
   `jsonb_build_object`. O teste certo era a condição no `WHERE`.
3. **Contar versão do ledger não é contar DDL.** Versão ausente do ledger pode ter
   sido aplicada por outro caminho (19 casos aqui). A pergunta que decide é se os
   **objetos** existem no banco.
