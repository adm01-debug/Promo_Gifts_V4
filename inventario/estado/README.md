# Estado real do projeto — inventário gerado

Pasta de **dados gerados**, não de relatórios escritos à mão. Cada arquivo diz como foi produzido.
Mesmo formato de `inventario/estado/` do Zapp_Web_V2. O resto de `inventario/` (análise de branches)
é histórico.

| Arquivo | Gerado por | O que tem |
|---|---|---|
| `banco.json` | `scripts/inventario/gerar-banco.mjs` (somente leitura: Management API `/database/query/read-only` + `/functions`, token `SUPABASE_ACCESS_TOKEN`) | tabelas (linhas estimadas, RLS, policies, triggers, tamanho), views, mviews, funções SQL, cron jobs com execuções/falhas das últimas 48 h, edge functions publicadas e diferença repo × produção, candidatas a órfãs |
| `edges.json` | `scripts/inventario/gerar-repo.mjs` | as edge functions do repo: linhas, segredos lidos (`Deno.env.get`) e quem invoca cada uma (src, migrations, outras edges, e2e, CI; `_shared/` e README não contam) |
| `rotas.json` | `scripts/inventario/gerar-repo.mjs` | as rotas de `src/routes/*.tsx`: path, componente, guardas, arquivo:linha |
| `tabelas-uso.json` | `scripts/inventario/gerar-repo.mjs` (lê a lista de tabelas de `banco.json`) | para cada tabela de `public`, quantos `.from('tabela')` há em `src/` e em `supabase/functions/`, se está em `types.ts`, e a lista final `tabelas_orfas` |

**Atualizar tudo** (a ordem importa: o segundo usa o `banco.json`):

```bash
SUPABASE_ACCESS_TOKEN=... node scripts/inventario/gerar-banco.mjs
node scripts/inventario/gerar-repo.mjs
```

Sem o token, `gerar-banco.mjs` sai com erro e não grava nada. Se a saída do banco tiver algo com cara de
credencial (`Bearer <token>`, JWT, `sb_secret_`), ele também para sem gravar. Não edite os JSON à mão.
Cada arquivo traz `gerado_em`; confira a data antes de confiar.

## Achados da geração de 2026-11-02

**Banco:** PG 17.6, 5,8 GB. 428 tabelas (398 em `public`), 209 views, 12 mviews, 1.351 funções
(573 `SECURITY DEFINER`), 18 extensões. Maior volume: `stock_daily_summary` (~2,8 M linhas, 967 MB),
`stock_snapshots` (777 MB) e `supplier_products_raw_history` (partições mensais, ~2 GB somadas).

**RLS:** em `public`, todas as tabelas têm RLS e nenhuma está com RLS ligada e zero policies.
Sem RLS: 24 tabelas fora de `public` — `supplier_stricker.*` (17, quase todas vazias), `prod_audit.*` (5),
`classification_audit.category_suggestions` e `pgmq.meta`.

**Tabelas órfãs (23):** 0 linhas, nenhuma função SQL, view ou mview cita, nenhum `.from()` em `src/` nem
em `supabase/functions/`. Lista em `tabelas-uso.json` → `tabelas_orfas` (ex.: `product_group_*`,
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
Parte delas é chamada por cron (`net.http_post` em `banco.json` → `cron`), por exemplo `cleanup-notifications`,
`cleanup-novelties`, `send-digest` e `send-scheduled-reports`. As `test-*` e `e2e-cleanup` são de teste.
Lista em `edges.json` → `sem_chamador_no_repo`.

**Front:** 135 rotas em `src/routes/` (`admin-routes.tsx` 50, `tools-routes.tsx` 26, `public-routes.tsx` 17,
`client-routes.tsx` 12, `product-routes.tsx` 12, `AppRoutes.tsx` 10, `quote-routes.tsx` 8). Rotas `/__visual/*` e
`/debug/*` são harness de teste.
