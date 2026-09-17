# E13 — Decisão por objeto: drafts ativos e arquivados (2026-09-16)

`[RO]` — investigação e documentação apenas. Nenhuma DDL, nenhum arquivo movido/apagado,
nenhum commit criado nesta etapa.

## 0. Correção de contagem

O texto da etapa E13 no plano afirma "10 drafts ativos e 5 arquivados". A contagem real,
confirmada por `find qa/migrations-draft -maxdepth 1 -name '*.sql'` e
`find qa/migrations-draft/_archived -name '*.sql'`, é:

- **10 ativos** em `qa/migrations-draft/*.sql`
- **4 arquivados** em `qa/migrations-draft/_archived/*.sql` (não 5)
- **Total: 14**, não 15.

Isso é relatado como discrepância factual do plano, não corrigido silenciosamente.

## 1. Metodologia

Para cada um dos 14 rascunhos:

1. Ler o `.sql` do draft por completo e extrair os objetos que ele cria/altera
   (tabelas, funções, constraints, triggers, grants).
2. Verificar cada objeto **ao vivo** via `mcp__supabase__execute_sql` contra
   `pg_catalog` (`pg_proc`, `pg_class`, `pg_constraint`, `pg_trigger`,
   `pg_get_functiondef`, `pg_get_constraintdef`, `aclexplode(relacl)`,
   `has_function_privilege`) e contra `supabase_migrations.schema_migrations`
   — **nunca PostgREST**, por REGRA #8 corolário do `CLAUDE.md`.
3. Quando o objeto existia, buscar a migration versionada correspondente por
   **conteúdo** (`grep` em `supabase/migrations/*.sql`), não só por nome/slug —
   o script existente `scripts/map-drafts-to-migrations.mjs` faz apenas
   fuzzy-match de slug de arquivo e, sem `PGHOST`, nem chega a consultar o DB
   (toda a tabela gerada em 2026-09-09 mostra ❔/🟡 mesmo para drafts já
   absorvidos — confirmado neste levantamento).
4. Classificar em exatamente uma das 4 categorias do enunciado:
   - **`absorvido por <versão>`** — objeto existe no DB E há migration
     versionada identificada que o criou.
   - **`pendente`** — objeto não existe ainda, mudança parece válida e não
     aplicada.
   - **`rejeitado`** — decisão explícita de não aplicar.
   - **`obsoleto`** — o objeto ou a necessidade que motivou o draft não existe
     mais.
   - Duas variações foram necessárias e documentadas explicitamente onde a
     realidade não coube nas 4 caixas puras: **`absorvido (fora do fluxo de
     migration)`** (objeto vivo, sem migration versionada rastreável — DDL
     out-of-band, ver `docs/E12_DETECTOR_DDL_OUT_OF_BAND_2026-09-16.md`) e
     **`absorvido parcialmente`** (a maior parte do draft foi aplicada, um
     resíduo específico não).
5. Para cada `pendente`, buscar (`grep -n "^### E" ` + keywords do objeto) se
   alguma das 50 etapas do plano já cobre aplicá-lo. Nenhuma nova etapa foi
   inventada — gaps são apenas relatados.

Nenhum rascunho foi classificado como `rejeitado` — não foi encontrada, para
nenhum dos 14, evidência de uma decisão explícita e documentada de **não**
aplicar (o mais próximo, `2026-09-09_magazine_rpc_only_contract.sql`, é um
adiamento documentado — "ainda não", não "não" — por isso ficou `pendente`).

## 2. Tabela de decisão

| # | Rascunho | Status | Evidência-chave |
| --- | --- | --- | --- |
| 1 | `2026-06-18_security_definer_acl.sql` | `obsoleto` | 4 alvos (`check_seller_cart_limit`, `handle_password_reset_request`, `check_auth_config_status`, `refresh_product_popularity`) não existem mais sob esse nome. 2 sumiram, 2 foram renomeados (`enforce_seller_cart_limit` — não é mais SECDEF; `enforce_password_reset_rate_limit` — SECDEF já com `anon_exec=false, auth_exec=false`). |
| 2 | `2026-06-19_kit_dimensions_backfill.sql` | `pendente` — **GAP** | `fn_calculate_kit_dimensions` existe; **43 kits** ainda com `length_cm`/`width_cm`/`height_cm` NULL (queda de 301→43 por mecanismo não documentado). Nenhuma etapa E01–E50 cita "kit_dimensions"/"kit dimensões". |
| 3 | `2026-06-19_reposicao_variants_summary.sql` | `absorvido (fora do fluxo de migration)` | `fn_get_reposicao_variants_summary(uuid[])` existe ao vivo; `GRANT`s idênticos ao draft (`anon_exec=false, auth_exec=true, service_exec=true`); `obj_description()` retorna o **mesmo texto literal** do `COMMENT ON FUNCTION` do draft ("...v3 2026-06-19."). `grep -rl` em `supabase/migrations/` não encontra nenhuma referência ao nome da função — nenhuma migration a criou. Forte indício de DDL out-of-band (REGRA #8 corolário). `REVIEWS.json` ainda lista este draft como "aguardando validação em staging antes de promover" — **desatualizado**, pois o objeto já está em produção. |
| 4 | `2026-06-20_revoke_secdef_from_authenticated.sql` | `absorvido parcialmente` | ~65 alvos: 5 nomes não existem mais (mesmos 4 de #1 + `fn_relink_former_deps_on_root_becomes_dep`); maioria dos restantes já mostra `service_exec=true` apenas (revogado via mecanismo não individualmente rastreado). **Resíduo (GAP):** 8 funções ainda `EXECUTE`-áveis por `anon`+`authenticated` (`audit_security_definer_acl`, `fn_deploy_readiness_check`, `fn_check_coverage_regression`, `fn_refresh_media_health`, `fn_backfill_eco_links`, `fn_backfill_feminine_links`, `fn_backfill_product_attributes_safe`, `fn_backfill_product_categories`) — todas com `prosecdef=false`, portanto fora do escopo declarado de E17 (11 SECDEF-anon) e E18 (94 SECDEF-authenticated), que são explicitamente sobre `SECURITY DEFINER`. |
| 5 | `2026-06-27_quotes_status_allow_cancelled.sql` | `absorvido por 20260618102416` | `pg_get_constraintdef` de `valid_quote_status` já inclui `'cancelled'`, texto idêntico ao de `supabase/migrations/20260618102416_quotes_add_cancelled_status.sql`, que foi aplicada **9 dias antes** da data do próprio draft (2026-06-18 vs 2026-06-27) — o draft nasceu redundante. |
| 6 | `2026-07-06_crm_callback_events.sql` | `absorvido por 20260706181356` | Tabela `crm_callback_events` existe; `supabase_migrations.schema_migrations` tem `version=20260706181356, name=crm_callback_events` — match exato de nome e data. |
| 7 | `2026-07-13_secdef_revoke_webhook_locks.sql` | `absorvido por 20260713154845` | Conteúdo de `supabase/migrations/20260713154845_secdef_revoke_webhook_locks.sql` lido por completo: 3 `REVOKE ... FROM PUBLIC, anon, authenticated` + 3 `GRANT ... TO service_role` idênticos aos do draft, para `claim_webhook_delivery`, `release_webhook_delivery_lock`, `cleanup_stale_webhook_locks`. Grants ao vivo confirmam `service_role`-only. (A tabela fuzzy-match antiga em `DRAFTS_STATUS.md` aponta para um nome de arquivo diferente/inexistente com esse padrão de timestamp — confirma que o matching por slug não é confiável; o match correto foi feito por conteúdo.) |
| 8 | `2026-07-13_secdef_revoke_webhook_locks_ROLLBACK.sql` | `obsoleto` | Contingência do item 7; a migration 20260713154845 está em produção sem rollback acionado. |
| 9 | `2026-07-23_get_edge_invoke_summary.sql` | `pendente` — **GAP** | Função `get_edge_invoke_summary(int)` não existe em `pg_proc`. Tabela-base `webhook_delivery_metrics` existe (`to_regclass` não nulo). `REVIEWS.json`: "Draft legado fora do escopo Magazine; promoção não autorizada pelo PO...". Nenhuma etapa E01–E50 cita "edge_invoke"/"Onda 20"/"telemetria". |
| 10 | `2026-09-09_magazine_rpc_only_contract.sql` | `pendente` — **GAP (deliberado)** | As 6 funções `magazine_*_atomic` continuam `auth_exec=true`; `pg_class.relacl` (via `aclexplode`) confirma `authenticated` ainda com INSERT/UPDATE/DELETE diretos em `magazines` e `magazine_items` — nenhum dos `REVOKE` do draft foi aplicado. A migration `20260909200000_magazine_hardening_v2` (mesma data) foi lida por completo: cria uma família paralela `magazine_*_v2` com um trigger (`magazine_guard_and_version_v2`) que já bloqueia `INSERT` direto com `status='published'` e impõe imutabilidade pós-publicação — mas **não revoga** grants de tabela nem `EXECUTE` das funções `*_atomic` antigas. É um mecanismo complementar, não uma aplicação do draft. `REVIEWS.json` documenta adiamento deliberado ("até frontend v2 READY e smoke autenticado"). Nenhuma etapa E01–E50 cita "rpc_only"/"magazine_rpc". |
| 11 | `_archived/2026-07-12_magazines.sql` | `obsoleto` | Colunas vivas de `magazines`: `branding` (jsonb), `edit_version` (bigint), `view_count`, `archived_at`, `deleted_at` — nenhuma coincide com `client_brand_colors` do draft. Confirma e reforça a razão já registrada em `_archived/README.md`. |
| 12 | `_archived/2026-07-12_magazine_items_unique_product.sql` | `absorvido (fora do fluxo de migration)` | `pg_constraint` confirma `UNIQUE(magazine_id, product_id)` ao vivo, porém com nome `magazine_items_unique_product` (o draft propunha `magazine_items_magazine_product_key`). Busca de conteúdo em `supabase/migrations/*.sql` não encontra o `ALTER TABLE`/`CREATE` que a originou — mesmo padrão de DDL out-of-band do item 3. |
| 13 | `_archived/2026-07-12_magazine_reader_state.sql` | `obsoleto` | Tabela `magazine_reader_state` existe com `magazine_token_hash` (hash SHA-256), não `magazine_token` (texto puro) do draft. A tabela já era referenciada em `supabase/migrations/20260716000037_restore_fk_indexes_after_036.sql` e `20260716140313_perf_auth_rls_initplan_remaining.sql` (índice/RLS), ou seja, já existia antes de 2026-07-16 — mas nenhuma migration de `CREATE TABLE public.magazine_reader_state` foi localizada (out-of-band, anterior a essa data). |
| 14 | `_archived/2026-07-15_magazine_public_token_trigger.sql` | `obsoleto` | Nenhum trigger `trg_magazine_public_token`/`fn_magazine_public_token` existe. O único trigger em `magazines` é `trg_magazines_guard_and_version_v2`, criado pela migration `20260909200000_magazine_hardening_v2`, cuja função `magazine_guard_and_version_v2` gera `public_token` como parte de um guard muito mais amplo (versão, imutabilidade, transições de status). **Achado secundário:** `_archived/README.md` afirma que um trigger `generate_magazine_public_token` "já existe ao vivo" — essa afirmação está desatualizada/incorreta; nenhum trigger com esse nome existe. Recomenda-se corrigir `_archived/README.md` numa revisão futura (fora do escopo `[RO]` desta etapa). |

**Distribuição (14 drafts):**

| Categoria | Qtde |
| --- | --- |
| `absorvido por <versão>` | 3 (#5, #6, #7) |
| `absorvido (fora do fluxo de migration)` | 2 (#3, #12) |
| `absorvido parcialmente` | 1 (#4) |
| `pendente` | 3 (#2, #9, #10) |
| `obsoleto` | 5 (#1, #8, #11, #13, #14) |
| `rejeitado` | 0 |

## 3. Gaps encontrados (checklist "nenhum `pendente` sem etapa que o consuma")

Todos os 3 drafts `pendente` foram checados contra as 50 etapas (`grep -n "^### E"`
sobre o plano inteiro, buscando os nomes de objeto/tema de cada draft) e **nenhum
tem etapa cobrindo a aplicação**:

1. **`2026-06-19_kit_dimensions_backfill.sql`** — 43 kits com dimensões NULL.
   Nenhuma etapa cita "kit_dimensions" nem "kit dimensões". Gap genuíno.
2. **`2026-07-23_get_edge_invoke_summary.sql`** — RPC de telemetria não criada.
   Nenhuma etapa cita "edge_invoke", "Onda 20" ou "telemetria". Gap genuíno
   (mas com adiamento documentado em `REVIEWS.json`, não esquecimento).
3. **`2026-09-09_magazine_rpc_only_contract.sql`** — contrato RPC-only do
   Magazine não aplicado. Nenhuma etapa cita "rpc_only" ou "magazine_rpc".
   Gap genuíno, porém **deliberado** — `REVIEWS.json` documenta que aplicar
   antes do frontend v2 READY quebraria clientes legados.

Nenhuma nova etapa de plano foi criada para cobrir esses 3 gaps — a decisão de
abrir (ou não) uma etapa nova, e o timing, cabe ao PO.

Um quarto ponto de atenção, mais estreito, não é um draft `pendente` mas é um
resíduo digno de nota: as **8 funções não-SECDEF** remanescentes do item #4
(`2026-06-20_revoke_secdef_from_authenticated.sql`) ficam fora do escopo
declarado de E17/E18 (ambas explicitamente sobre `SECURITY DEFINER`).

## 4. Achados adicionais (fora do escopo estrito da classificação)

- **DDL out-of-band confirmado (2 casos):** `fn_get_reposicao_variants_summary`
  (#3) e a constraint `magazine_items_unique_product` (#12) existem em produção
  sem nenhuma migration versionada correspondente em `supabase/migrations/`.
  Isso é exatamente o padrão que o detector da etapa E12
  (`.github/workflows/ddl-out-of-band-detector.yml`) foi desenhado para pegar
  — mas esses dois objetos são anteriores ao detector e não têm o "recibo"
  (`docs/db/POLITICA_DDL.md`: ticket + migration versionada no mesmo PR +
  `migration repair --status applied` no mesmo dia). Recomenda-se reconciliar
  via migration-recibo em etapa futura.
- **`REVIEWS.json` desatualizado:** a entrada de
  `2026-06-19_reposicao_variants_summary.sql` diz "RPC aditiva pronta;
  aguardando validação em staging antes de promover" — mas o objeto já está
  em produção. A entrada deveria ser removida (o draft está `absorvido`, não
  mais "não promovido"), o que também destravaria o gate
  `drafts:status:check`. Não removida nesta etapa (`[RO]`, fora do escopo
  explícito desta sessão).
- **`_archived/README.md` desatualizado:** afirma que um trigger
  `generate_magazine_public_token` existe ao vivo; não existe mais sob esse
  nome (substituído por `magazine_guard_and_version_v2`). Ver item #14 acima.
- **Tabela fuzzy-match de `DRAFTS_STATUS.md`** (gerada por
  `scripts/map-drafts-to-migrations.mjs`) não é confiável para decisão: todas
  as linhas mostram ❔/🟡 mesmo para drafts já `absorvido`, porque (a) depende
  de `PGHOST`/`psql` locais indisponíveis nesta sessão, e (b) mesmo quando
  sugere candidatos, faz fuzzy-match por **nome de arquivo**, não por objeto —
  ex.: para #7 sugere `20260713_001_secdef_revoke_webhook_locks.sql`, um nome
  de timestamp diferente do arquivo real (`20260713154845_...`). A seção
  "Decisão por objeto" adicionada a `qa/migrations-draft/DRAFTS_STATUS.md`
  nesta etapa complementa (não substitui) essa tabela.

## 5. Arquivos tocados nesta etapa

- `qa/migrations-draft/DRAFTS_STATUS.md` — seção "Decisão por objeto (E13 —
  2026-09-16)" adicionada ao final; tabela candidata original preservada.
- `docs/E13_DRAFTS_MIGRATIONS_2026-09-16.md` — este arquivo.
- `docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` — bloco de
  evidência inserido após `### E13`, checklist marcado.

Nenhum arquivo em `qa/migrations-draft/` foi movido, renomeado ou apagado.
Nenhuma escrita foi feita no Supabase.
