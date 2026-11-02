# Estado real do projeto — inventário gerado

Pasta de **dados gerados**, não de relatórios escritos à mão. Cada arquivo diz como foi produzido.
Mesmo formato de `inventario/estado/` do Zapp_Web_V2. O resto de `inventario/` (análise de branches)
é histórico.

| Arquivo | Como gerar | O que tem |
|---|---|---|
| `edges.json` | `node scripts/inventario/gerar-repo.mjs < /dev/null` | as 110 edge functions do repo: linhas, segredos lidos (`Deno.env.get`) e quem invoca cada uma (src, migrations, outras edges, e2e, CI) |
| `rotas.json` | idem | as 135 rotas de `src/routes/*.tsx`: path, componente, guardas, arquivo:linha |
| `tabelas-uso.json` | `node scripts/inventario/gerar-repo.mjs < lista-de-tabelas.txt` (uma tabela por linha; a lista sai de `banco-*.json` → `tabelas`) | para cada tabela de `public`, quantos `.from('tabela')` existem em `src/` e em `supabase/functions/`, e se está em `types.ts` |
| `banco-AAAA-MM-DD.json` | `execute_sql` somente leitura no banco oficial `doufsxqlfjyuvxuezpln` (MCP `SUPABASE - GESTÃO DE PRODUTOS`) + `list_edge_functions` — ver `fonte` dentro do arquivo | tabelas (linhas estimadas, RLS, policies, triggers, tamanho), views, mviews, funções SQL, 144 cron jobs com execuções/falhas das últimas 48 h, edge functions publicadas e diferença repo × produção, tabelas órfãs |

Para atualizar: rode o script (parte do repo) e refaça as consultas do `banco-*.json` com a data do dia.
Não edite os JSON à mão.

## Achados do snapshot de 2026-11-02

**Banco:** PG 17.6, 5,8 GB. 428 tabelas (398 em `public`), 209 views, 12 mviews, 1.351 funções
(573 `SECURITY DEFINER`), 18 extensões. Maior volume: `stock_daily_summary` (~2,8 M linhas, 967 MB),
`stock_snapshots` (777 MB) e `supplier_products_raw_history` (partições mensais, ~2 GB somadas).

**RLS:** em `public`, todas as tabelas têm RLS e nenhuma está com RLS ligada e zero policies.
Sem RLS: 24 tabelas fora de `public` — `supplier_stricker.*` (17, quase todas vazias), `prod_audit.*` (5),
`classification_audit.category_suggestions` e `pgmq.meta`.

**Tabelas órfãs (23):** 0 linhas, nenhuma função SQL, view ou mview cita, nenhum `.from()` em `src/` nem
em `supabase/functions/`. Lista em `banco-2026-11-02.json` → `tabelas_orfas` (ex.: `product_group_*`,
`user_ip_allowlist`, `user_allowed_ips`, `push_subscriptions`, `sales_goals`, `magic_up_comments`).

**Tabelas de backup/arquivo em `public` (14):** `_archive_*_20260626`, `_bkp_*_202606xx`,
`backup_produto_ramo_atividade_20260625`, `*_log_2026062x`, `_qa_pct_results`.

**Cron:** 144 jobs, 7 inativos (`dispatcher-log-sync`, `image-dimensions-backfill`, `monitor-connections`,
`pipeline-classify-categories`, `process-webhook-outbox`, `refresh-analytics-mv-product-intelligence`,
`refresh-analytics-mv-stock-velocity`). Nas últimas 48 h: 7.122 execuções OK e 679 falhas em 78 jobs. Em 72
desses jobs, o último erro é `job startup timeout` (pg_cron sem worker livre no instante do disparo). Nenhum
job falhou 100% das vezes.

**Edge functions:** 110 no repo = 110 publicadas, mesmos nomes (nenhuma só de um lado). 36 publicadas com
`verify_jwt = false`. 26 sem chamador no repo (src, migrations, outras edges; `_shared/` e README não contam).
Parte delas é chamada por cron (`net.http_post` em `banco-*.json` → `cron`), por exemplo `cleanup-notifications`,
`cleanup-novelties`, `send-digest` e `send-scheduled-reports`. As `test-*` e `e2e-cleanup` são de teste.
Lista em `edges.json` → `sem_chamador_no_repo`.

**Front:** 135 rotas em `src/routes/` (`admin-routes.tsx` 50, `tools-routes.tsx` 26, `public-routes.tsx` 17,
`client-routes.tsx` 12, `product-routes.tsx` 12, `AppRoutes.tsx` 10, `quote-routes.tsx` 8). Rotas `/__visual/*` e
`/debug/*` são harness de teste.
