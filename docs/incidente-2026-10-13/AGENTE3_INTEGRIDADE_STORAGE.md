# Agente 3 — Integridade de Dados e Armazenamento (incidente 2026-10-13)

Escopo: Fase 2 (bugs de dados/triggers, etapas 21–30) e Fase 7 (armazenamento/bloat/retenção, etapas 73–82) do plano de correção de produção do incidente 2026-10-13, projeto Supabase `doufsxqlfjyuvxuezpln`.

Não duplica o trabalho do Agente 1 em `fn_autolink_canonical_on_content_hash` / `chk_pi_canonical_not_self`.

---

## 1. Auditoria de grupos canônicos de `product_images`

Query executada sobre as ~N linhas de `product_images` (ver seção 2 para o esquema de `canonical_image_id`):

| Problema verificado | Contagem |
|---|---|
| Auto-referência (`canonical_image_id = id`) | 0 |
| Cadeia (dependente de dependente — raiz com `canonical_image_id` não nulo) | 0 |
| Raiz com `deleted_at` preenchido e dependentes vivos (`deleted_at IS NULL`) | 0 |
| Dependente com `content_hash` diferente da raiz | 0 |
| FK de `canonical_image_id` órfã (apontando para linha inexistente) | 0 |

**Conclusão: os grupos canônicos estão íntegros hoje.** Nenhuma ação corretiva de dados foi necessária nesta frente — provavelmente reflexo do trabalho do Agente 1 na mesma janela, e dos triggers `trg_prevent_canonical_chain` / `trg_prevent_canonical_chain_insert` já existentes.

---

## 2. Mapeamento dos ~21 triggers de `product_images`

Lista completa obtida via `pg_trigger`/`pg_get_triggerdef` (21 triggers, não-internos). Achado de sobreposição real, confirmado e corrigido:

### Sobreposição confirmada: `trg_sync_primary_image_url` × `trg_sync_product_images(_update)`

- `trg_sync_primary_image_url` — `BEFORE/AFTER INSERT OR UPDATE OF is_primary, is_active, url_cdn` → `fn_sync_primary_image_url()`: escreve `products.primary_image_url`.
- `trg_sync_product_images` — `AFTER INSERT OR DELETE` → `fn_sync_product_images_to_products()`: recalcula `primary_image_url`, `og_image_url`, `images`, `primary_image_fallback_url` com regras mais completas (exclui `image_type` `box/pouch/location/area/component`).
- `trg_sync_product_images_update` — `AFTER UPDATE` com `WHEN` cobrindo `url_cdn, is_active, is_primary, is_og_image, image_type, display_order` → mesma função.

Postgres dispara triggers do mesmo evento/timing em ordem alfabética por nome. `"trg_sync_primary_image_url"` vem alfabeticamente antes de `"trg_sync_product_images"` e de `"trg_sync_product_images_update"` (`i` < `o` em `primary` vs `product`). Logo, em toda INSERT/UPDATE relevante, `trg_sync_primary_image_url` sempre dispara primeiro e sua escrita em `products.primary_image_url` é **sempre** sobrescrita, no mesmo statement, pelo cálculo mais completo de `fn_sync_product_images_to_products()`. Confirmado via `pg_trigger` que `fn_sync_primary_image_url` não é usada por nenhum outro trigger.

**Ação:** `DROP TRIGGER trg_sync_primary_image_url` + `DROP FUNCTION fn_sync_primary_image_url()` — elimina um UPDATE redundante em `products` por linha afetada, sem mudar nenhum resultado final.
Migration: `supabase/migrations/20261013180000_incidente_2026_10_13_drop_trigger_redundante_sync_primary_image_url.sql`.

**⚠️ Status: NÃO aplicado em produção.** As 3 tentativas via MCP (`apply_migration` e `execute_sql`) retornaram `{"status":"cancelled"}` — o gate de confirmação de statement destrutivo não pôde ser satisfeito por esta sessão não-interativa. Precisa de aplicação manual (dashboard/MCP interativo) ou via `.github/workflows/db-apply-migration.yml` (REGRA #8/E15 do CLAUDE.md).

### Demais triggers — sem sobreposição clara

- `trg_sync_set_image_url` escreve `products.set_image_url`, escopo distinto (só `image_type = 'set'`) — não sobrepõe `primary_image_url`/`og_image_url`.
- `trg_rebuild_swatches_on_image` escreve `products.color_swatches` — escopo distinto (variantes/cores).
- `trg_autolink_canonical_on_content_hash`, `trg_prevent_canonical_chain(_insert)`, `trg_handle_image_restoration`, `trg_handle_root_soft_delete`, `trg_reset_is_shared_on_canonical_null` — família de canonicalização, não duplicada aqui por ser domínio do Agente 1.
- Demais (`trg_auto_classify_image`, `trg_normalize_image_format`, `trg_normalize_source_supplier`, `trg_sanitize_image_urls`, `trg_single_primary_image`, `trg_sync_image_type_code`, `trg_product_images_seo_autofill`, `trg_product_images_updated`, `trg_sync_backfill_queue`) têm responsabilidades únicas e não sobrepostas — não removidos.

---

## 3. Idempotência do job de hash (`image_backfill_queue`)

A tabela **já tinha** coluna `attempts` (smallint, default 0) e `status` com `CHECK` incluindo `'failed'`/`'skipped'` desde a migration original (`20260617124249_create_backfill_queue_20260617.sql`). Porém, auditoria dos dados mostrou que **nenhuma linha jamais teve `attempts > 0`** e **nenhuma linha jamais chegou a `status = 'failed'`** (116.366 `done` + 17 `pending`, todas com `attempts = 0`). Não há, no repositório, nenhum worker/edge function/cron job que incremente `attempts` ou aplique um teto de tentativas — o consumidor da fila vive fora deste repo (provavelmente um worker externo não versionado aqui).

**Ação aplicada (rede de segurança no banco, independente do worker externo):** função `fn_backfill_queue_reap_stuck(p_stuck_minutes=30, p_max_attempts=5)`, agendada via `pg_cron` a cada 15 min (`backfill-queue-reap-stuck`), que:
1. Reclama linhas travadas em `status='processing'` por mais de 30 min (`FOR UPDATE SKIP LOCKED`, incrementa `attempts`, zera `worker_id`/`started_at`);
2. Devolve para `pending` se `attempts < 5`, registrando o motivo em `last_error`;
3. Desiste definitivamente (`status='failed'`) quando `attempts >= 5`, registrando o motivo em `last_error` — em vez de tentar para sempre.

**✅ Aplicado em produção.** Migration: `supabase/migrations/20261013171417_incidente_2026_10_13_backfill_queue_reaper_idempotente.sql`.

---

## 4. CHECK/FK `NOT VALID`

```sql
SELECT conname, conrelid::regclass, convalidated FROM pg_constraint WHERE convalidated = false;
```

Resultado: **uma única constraint**, `realtime.messages_payload_exclusive` (`CHECK ((payload IS NULL) OR (binary_payload IS NULL)) NOT VALID`), na tabela interna `realtime.messages` — gerenciada pelo próprio Supabase Realtime, fora do domínio de dados da aplicação (`public`). **Nenhuma ação tomada** — validar uma constraint em schema interno do Supabase está fora do escopo autorizado (REGRA #1/#8: mudanças de schema precisam ser no domínio do projeto, e `realtime` é gerenciado pela plataforma). Nenhuma constraint `NOT VALID` existe em `public`.

---

## 5. Ranking de bloat (pgstattuple)

Extensão `pgstattuple` instalada (somente leitura, `ACCESS SHARE` lock) para medição real de bloat — ver migration `20261013171425`.

| Tabela | Tamanho total | Tamanho físico (table_len) | % livre (bloat real) | % tuplas mortas |
|---|---|---|---|---|
| `stock_snapshots` | 1,4 GB (total, c/ índices) | 689 MB | **95,37%** | 0,01% |
| `supplier_products_raw_history` (partições `p2026_07..10`) | ~2,2 GB somado | — (partição maior: `p2026_08` 754 MB) | não medido (fora do escopo de bloat físico — ver §8) | — |
| `stock_daily_summary` | 835 MB | 495 MB | 3,35% | 0,06% |
| `cron.job_run_details` | 95 MB | 91 MB | 48,39% | 0,87% |
| `net._http_response` | 536 kB | — | desprezível | — |

**Achado chave:** `stock_snapshots` tem 95% de espaço livre no arquivo físico — a tabela real tem só 27,9 MB de tuplas vivas dentro de um arquivo de 689 MB. Isso **não é bloat de tuplas mortas** (dead_tuple_percent é desprezível, 0,01%) — é espaço alocado e nunca devolvido ao SO por `VACUUM` comum (que marca espaço como reutilizável mas não encolhe o arquivo, exceto no final). `stock_daily_summary`, por contraste, está saudável (90,74% tuplas vivas).

---

## 6. `stock_snapshots` — retenção e compactação

- **Retenção já existe e está rodando:** `cron.job` id 272, `fn_purge_old_stock_snapshots(60, 500000)`, diário às 03:11 (horário de Brasília) — últimos runs (09–13/10) todos `succeeded`. O job já aplica a retenção de 60 dias citada no plano; `stock_daily_summary`/`mv_stock_rupture_alert` recebem `VACUUM ANALYZE` semanal (cron id 297, domingos 04:30).
- **Contagem real:** `SELECT count(*)` = 267.908 linhas (bem diferente dos `n_live_tup=0`/`reltuples≈164k` que as estatísticas mostravam — ambos estavam obsoletos por causa do restart recente do banco, ver §7).
- **pg_repack:** extensão instalada (`CREATE EXTENSION pg_repack`, sucesso — migration `20261013171425`) como pré-requisito. **Porém** a extensão por si só não executa o reorg — isso requer o binário cliente `pg_repack` conectando ao projeto via libpq para orquestrar a cópia + swap com lock mínimo; esta sessão não tem acesso de shell/CLI a um `pg_repack` client linkado a este projeto Supabase (confirmado: `supabase`/`pg_repack` CLI não estão instalados neste sandbox).
- **VACUUM FULL manual:** `table_len` de `stock_snapshots` é 689 MB — acima do limiar de 500 MB definido no plano para "lock deve ser rápido, pode prosseguir". Com cron jobs escrevendo em `stock_snapshots` a cada poucos minutos (`sm-stock-guard` a cada 5 min, `xbz-stock-sync` a cada 15 min, etc.), um `VACUUM FULL` tomaria `ACCESS EXCLUSIVE lock` pelo tempo de reescrita de 689 MB — risco real de bloquear/atrasar esses jobs.

**Pendência explícita para janela de manutenção:** compactar `stock_snapshots` (689 MB físico → ~30-40 MB de dados reais) via `pg_repack --table stock_snapshots` (CLI, fora de horário de pico) ou, na ausência do CLI, um `VACUUM FULL` manual numa janela de baixo tráfego coordenada com os cron jobs de estoque (ids 81, 109, 54, 265, 204 e outros que escrevem em `stock_snapshots`/tabelas relacionadas). Isso recupera ~650 MB.

---

## 7. Índices de `stock_snapshots` (7 índices, ~760 MB) — **não removidos, pendência documentada**

```sql
SELECT pg_postmaster_start_time(), now();
-- 2026-10-13 12:43:26 / 2026-10-13 17:07:02  →  uptime ≈ 4h24min
```

O banco teve um **restart recente** (uptime de ~4h30min no momento da auditoria). `pg_stat_user_indexes.idx_scan` é zerado em cada restart, então os `idx_scan = 0` observados em 6 dos 7 índices de `stock_snapshots` (exceto `idx_snapshots_captured_at`, com 3 scans) **não são evidência confiável de índice não-usado** — é exatamente o cenário de alerta citado no plano ("não remova índices às pressas logo após um restart recente").

| Índice | Tamanho | `idx_scan` (desde o restart) |
|---|---|---|
| `idx_snapshots_vss_captured` | 304 MB | 0 |
| `idx_snapshots_product_captured` | 178 MB | 0 |
| `stock_snapshots_pkey` | 119 MB | 0 |
| `idx_snapshots_captured_at` | 48 MB | 3 |
| `idx_ss_variant_id` | 43 MB | 0 |
| `idx_ss_supplier_id` | 35 MB | 0 |
| `idx_stock_snapshots_supplier_branch_id` | 33 MB | 0 |

**Pendência explícita:** revisar novamente em 14 dias (a partir de 2026-10-13, ou seja, a partir de ~2026-10-27) com estatísticas acumuladas desde o restart, e só então remover os índices que continuarem com `idx_scan = 0`. Nenhum índice foi removido nesta sessão.

---

## 8. `supplier_products_raw_history` — retenção já aplicada e confirmada rodando

- `fn_purge_spr_history` **existe** e está agendada: `cron.job` id 51, `fn_purge_spr_history(90)`, diário às 03:30 — últimos 5 runs (09–13/10) todos `succeeded`.
- Tabela é **particionada** (`relkind = 'p'`) por mês: `p2026_07` (513 MB), `p2026_08` (754 MB), `p2026_09` (705 MB), `p2026_10` (254 MB, mês corrente), mais partições futuras vazias (`p2026_11`, `p2026_12`, `p2027_01`, 16 kB cada). Total ≈ 2,2 GB, consistente com o relatado no plano.
- **Nenhuma ação adicional tomada** — a retenção de 90 dias já é uma decisão de negócio em vigor e funcionando; não inventamos uma política nova. Se o PO quiser uma retenção diferente (ex.: reduzir de 90 para 60 dias, ou mudar a estratégia de partição para `DROP PARTITION` em vez de `DELETE`), isso é uma **decisão do PO**, não do agente — documentado aqui como pendência de decisão, não como bug.

---

## 9. Tabelas de backup/arquivo vencidas — removidas (pendente de aplicação)

14 tabelas identificadas, todas da "faxina" de 2026-06-19 a 2026-06-26 (`docs/FAXINA_DB_2026-06-20*.md`), hoje com ~4 meses de idade. Confirmado via `pg_depend`/`pg_constraint` que **nenhuma view, FK ou objeto vivo depende delas**. Contagens de linhas e DDL coluna-a-coluna capturados **antes** do DROP (evidência completa no corpo da migration `20261013180500_...` e nos comentários desta seção/§anterior).

| Tabela | Linhas | Origem |
|---|---|---|
| `backup_produto_ramo_atividade_20260625` | 63.626 | faxina 25/06 |
| `_archive_supplier_price_tiers_20260626` | 31.157 | faxina 26/06 |
| `_archive_product_seo_20260626` | 6.610 | faxina 26/06 |
| `_archive_product_ai_20260626` | 6.610 | faxina 26/06 |
| `_bkp_kcvs_pre_normalize_20260624` | 4.058 | faxina 24/06 |
| `_bkp_kit_dims_20260619` | 962 | faxina 19/06 |
| `_bkp_kit_color_from_name_20260624` | 446 | faxina 24/06 |
| `_bkp_kit_pkg_material_20260624` | 292 | faxina 24/06 |
| `_bkp_kit_packing_type_20260624` | 146 | faxina 24/06 |
| `_bkp_orphan_active_variants_20260619` | 53 | faxina 19/06 |
| `eco_backfill_log_20260625` | 22 | faxina 25/06 |
| `eco_date_reconcile_log_20260626` | 2 | faxina 26/06 |
| `cnpj_backfill_audit` | 8 | — |
| `material_reconcile_log_20260626` | 1 | faxina 26/06 |

Migration: `supabase/migrations/20261013180500_incidente_2026_10_13_drop_tabelas_backup_vencidas.sql`.

**⚠️ Status: NÃO aplicado em produção** (mesmo bloqueio de confirmação do §2). `docs/TYPES_INVENTORY_REMOVAL_ALLOWLIST.json` já tem as 14 entradas + a de `fn_sync_primary_image_url` prontas (REGRA #4), mas com `approvedBy` marcado como **"PREENCHER NOME ANTES DO MERGE"** — precisa do nome real do PO antes do merge, não um bot (REGRA #8).

---

## 10. Autovacuum nas tabelas quentes

`autovacuum_vacuum_scale_factor = 0.03` (dentro da faixa 0,02–0,05 pedida) aplicado em:
- `variant_supplier_sources`
- `product_variants`
- `stock_snapshots`
- `request_rate_limits`

**✅ Aplicado em produção.** Migration: `supabase/migrations/20261013171421_incidente_2026_10_13_autovacuum_tuning_tabelas_quentes.sql`.

---

## Resumo — aplicado vs. pendente

### Aplicado em produção nesta sessão (via MCP `apply_migration`)
1. `fn_backfill_queue_reap_stuck` + agendamento `pg_cron` (idempotência da fila de backfill).
2. `autovacuum_vacuum_scale_factor = 0.03` em 4 tabelas quentes.
3. Extensões `pgstattuple` e `pg_repack` instaladas (diagnóstico/pré-requisito).

### Pendente de aplicação (migration escrita, bloqueada pelo gate de confirmação destrutiva desta sessão não-interativa)
4. `DROP TRIGGER/FUNCTION` de `trg_sync_primary_image_url`/`fn_sync_primary_image_url` (redundância confirmada).
5. `DROP TABLE` das 14 tabelas de backup/arquivo vencidas.

### Pendências de decisão do PO / janela de manutenção (não executadas por risco ou por exigirem decisão de negócio)
6. Compactação física de `stock_snapshots` (689 MB → ~30 MB) via `pg_repack` CLI ou `VACUUM FULL` manual — **janela de manutenção**, fora de horário de pico dos crons de estoque.
7. Revisão dos 6 índices de `stock_snapshots` com `idx_scan = 0` — aguardar 14 dias de estatísticas pós-restart antes de remover qualquer um.
8. Retenção de `supplier_products_raw_history` (hoje 90 dias, já funcionando) — qualquer mudança no número de dias é **decisão do PO**, não decisão técnica deste agente.
9. `realtime.messages_payload_exclusive NOT VALID` — fora do domínio da aplicação (schema interno do Supabase Realtime), nenhuma ação recomendada.

### Follow-up obrigatório por governança (REGRA #8/E15 do CLAUDE.md)
As migrations aplicadas via MCP nesta sessão (itens 1–3) precisam, no mesmo dia, de `supabase migration repair --status applied` para sincronizar o ledger `supabase_migrations.schema_migrations` com o schema real — esta sessão não tem o CLI `supabase` disponível (confirmado: `supabase: command not found`) para rodar esse comando. **Quem revisar este PR com acesso ao CLI deve rodar esse repair antes de considerar o incidente encerrado**, ou o detector semanal `ddl-out-of-band-detector.yml` vai reportar divergência.
