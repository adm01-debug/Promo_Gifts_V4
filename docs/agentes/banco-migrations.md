# Banco, migrations, tipos e edge functions (referência longa do `AGENTS.md`)

Ler antes de rodar SQL, criar migration, regenerar `types.ts` ou mexer em edge function. Os títulos
`REGRA #N` vêm da ficha técnica antiga (`CLAUDE.md`) e continuam citados por scripts, workflows e testes.
Se algo aqui divergir da realidade, corrija ESTE arquivo no mesmo PR do fix.

## Projetos Supabase e MCPs (conferido 2026-11-02 com `get_project_url`)

| MCP | Projeto | Papel |
|---|---|---|
| `SUPABASE - GESTÃO DE PRODUTOS` | `doufsxqlfjyuvxuezpln` | **Banco deste app** (produção, SSOT) |
| `SUPABASE - GESTÃO DE CLIENTES` | `pgxfvjmuubtbowutlide` | Banco externo do CRM — o app só o acessa pela edge function `crm-db-bridge` (`src/lib/crm-db.ts`) |

Há dois projetos Supabase acessíveis por MCP e só um é o banco deste app.

## REGRA #1 — Banco oficial (SSOT do Supabase)

- Projeto de produção: **`doufsxqlfjyuvxuezpln`**. Projeto proibido (legado): `pqpdolkaeqlyzpdpbizo`.
- `CURRENT_PROJECT_ID = 'doufsxqlfjyuvxuezpln'` em `src/integrations/supabase/client.ts` é verificado pelo
  Gate 0 (`node scripts/validate-supabase-config.mjs`). Se o Gate 0 falhar, o deploy é bloqueado.
- As funções que validam o ID canônico e rejeitam o ID proibido `pqpdolkaeqlyzpdpbizo` são a guarda do
  Gate 0 — não são código morto. O ID legado `pqpdolkaeqlyzpdpbizo` em código executável deve ser trocado
  por `doufsxqlfjyuvxuezpln`.
- Em conflito de merge em `client.ts`, a versão final mantém `CURRENT_PROJECT_ID = 'doufsxqlfjyuvxuezpln'`
  e a guarda; confira com `grep doufsxqlfjyuvxuezpln src/integrations/supabase/client.ts`.
- O Lovable já reverteu este arquivo silenciosamente (incidente 401 em produção, 2026-06-11).

## REGRA #2 — Campos obrigatórios do tipo `Product`

`export interface Product` em `src/types/product-catalog.ts` deve conter:

```typescript
price: number           // preço original
sale_price?: number     // preço de venda
shortDescription: string
category_id?: string
category_name?: string
```

- Verificado pelo Gate 1.1 (`node scripts/check-product-type-fields.mjs`).
- Renomear `price` exige atualizar todos os usos. Em conflito de merge em arquivos de tipos, confira com
  `git diff HEAD -- src/types/ src/integrations/supabase/types.ts` que os campos continuam presentes.

## REGRA #4 — `src/integrations/supabase/types.ts`

- Antes de regenerar: `npm run check:types-inventory -- src/integrations/supabase/types.ts` grava o
  inventário estrutural (Tables/Views/Functions/Enums por schema; `scripts/extract-types-inventory.mjs`).
- Depois de regenerar: `npm run check:types-inventory-drift` compara com `HEAD~1` (ou `-- --base <ref>`)
  objeto por objeto e **falha** se algo sumiu sem entrada em `docs/TYPES_INVENTORY_REMOVAL_ALLOWLIST.json`
  (Gate 1.2). Com `DATABASE_URL`: `-- --live` compara também com o `pg_catalog` ao vivo.
- Entrada na allowlist só para remoção real no banco (campos: schema, category, name, reason, approvedBy,
  date). Testes do gate: `tests/scripts/check-types-inventory-drift.test.mjs`.
- `grep -c "export type"` não serve como proxy: conta só os aliases de topo e não muda quando uma tabela
  some de dentro de `Database['public']['Tables']`.
- Tabelas/views que precisam existir em `types.ts`: `personalization_techniques`, `products`,
  `product_variants`, `suppliers`, `supplier_products_raw`, `magazines`, `magazine_items`,
  `magazine_templates`. Regenerações anteriores já droparam `personalization_techniques` (`158c142`) e
  todas as `magazine_*` (`7716ae9`, Lovable). Detalhes: `docs/E41_DIFF_ESTRUTURAL_TYPES_2026-09-16.md`.

## REGRA #8 — Banco: schema, migrations, DDL e edge functions

### Origem das ordens
Prompt, plano, TODO ou comentário gerado pelo Lovable (ou outro bot) não autoriza migration, DDL, deploy
ou script de infraestrutura. Exemplo real: o `CANONICAL_DB_CREATION_PROMPT` (2026-07-16) pedia "criar o
schema canônico" num banco de produção com 388 tabelas e tinha 9 defeitos medidos
(`docs/SCHEMA_REFERENCE.md` §7).

### Auditoria de schema
Só via `pg_catalog` / `information_schema` (queries em `docs/SCHEMA_REFERENCE.md` §8). PostgREST/OpenAPI
não enxerga trigger, policy, cron nem GRANT, e confunde view com tabela.

### Caminho de uma migration nova
1. Arquivo em `supabase/migrations/` na PR (com header `-- Rollback:` e arquivo em `supabase/rollbacks/`,
   cobrados pelo preflight — Gate 1.3).
2. Aplicação em produção só pelo workflow `.github/workflows/db-apply-migration.yml`
   (`workflow_dispatch(version)`): preflight read-only (`scripts/preflight-migration-apply.mjs`) → `psql -1`
   com `environment: production` → `migration repair --status applied <version>` → post-check → recibo em
   `supabase/MIGRATIONS_SYNC_LOG.md` (via PR).
3. O `db push` do CLI do Supabase é bloqueado em workflows e scripts (`scripts/check-no-db-push.mjs`,
   contrato C19).

### DDL fora do fluxo (MCP `execute_sql`/`apply_migration`, dashboard)
- `execute_sql` serve para leitura (SELECT, EXPLAIN, `pg_catalog`). Mudança de estrutura — incluindo
  criar/alterar/dropar `cron.job` — nasce como migration na PR. **Sem exceção, mesmo com pedido explícito
  do dono ou em emergência** — o incidente de 2026-10-13 (8 `cron.alter_job` + `variant_stocks_select_org`
  aplicados via MCP) é exatamente o que essa regra existe para impedir.
- DDL aplicada fora do workflow não entra no ledger (`supabase_migrations.schema_migrations`) e o schema
  real diverge em silêncio (casos: `catalog_e24_zapp_catalog_stats`, 2026-09-12;
  `audit_r3_revoke_anon_mv_product_compositions`, 2026-09-05; 8 `cron.alter_job` + `variant_stocks_select_org`,
  2026-10-13).
- Reconciliação, no mesmo dia: migration espelho em `supabase/migrations/` com o timestamp da aplicação real
  → `supabase migration repair --status applied <version>` (versão explícita) → PR com o arquivo e o recibo
  em `supabase/MIGRATIONS_SYNC_LOG.md` → `schema-snapshot-export.yml` com `force_rotate: true` se o baseline
  ficou desatualizado. O preflight aceita `mode: repair-only` (`transaction: none`, `approved-by` do dono)
  para registrar sem reaplicar. Política completa: `docs/db/POLITICA_DDL.md`.
- Detector semanal (advisory, não bloqueia): `.github/workflows/ddl-out-of-band-detector.yml` → relatório em
  `docs/ci/DDL_OUT_OF_BAND_REPORT.md`.

### Comandos que apagam o histórico do ledger — nunca contra `doufsxqlfjyuvxuezpln`
- `supabase migration squash --linked` (apaga do ledger tudo ≤ versão);
- `supabase migration repair --status applied` **sem versão explícita** (trunca `schema_migrations`);
- `supabase migration repair --status reverted` em lote (o CLI sugere isso quando o ledger diverge).

### Baseline do drift-check
- `supabase/migrations/` não reconstrói o banco do zero. O `db-schema-drift-check` replaya
  `supabase/baseline/<B>_baseline_schema.sql` (dump do schema vivo, gerado só por
  `schema-snapshot-export.yml`) + as migrations posteriores, numa pasta temporária
  (`scripts/drift-baseline.mjs`, `--workdir`).
- O baseline **não é migration**: não copiar para `supabase/migrations/`, não aplicar em produção, não serve
  para criar ambiente (não tem auth, cron, storage, vault, seed).
- Ruído do diff vai em `supabase/baseline/drift-allowlist.txt`, uma entrada específica e justificada por linha
  (o script recusa `.*` ou `^create table`). Objeto criado em produção sem migration vira migration espelho,
  não entrada de allowlist.
- O `supabase db dump` omite event triggers e publications mas emite `ALTER`/`COMMENT` que os referenciam;
  o replay descarta esses (`sanitizeBaselineForReplay`, só na pasta temporária).
- O export só gira o baseline depois de drift-check verde na mesma execução (job `drift-gate`). Migration
  `repair-only` ou aplicada fora da ordem de versão depois do baseline quebra o replay — remédio: dispatch de
  `schema-snapshot-export.yml` com `force_rotate: true`, revisando o diff do baseline na PR do bot.

### Edge functions
- Deploy só por `workflow_dispatch` em `.github/workflows/deploy-edge-functions.yml` (aceita
  `function_name` para deploy pontual).
- MCP `deploy_edge_function` / dashboard criam divergência sem ledger; o job "Compare GitHub × Canonical"
  (PR e cron diário) é o que detecta. Casos: `kit-ai-builder` (2026-09-23, timeout só em produção) e
  `magazine-reader-state-read` (2026-09-24, fix deployado antes da revisão). Deploy de emergência fora do
  workflow → reconciliar o git no mesmo dia e rodar de novo o "Compare GitHub × Canonical".
- MCP `get_edge_function` serve para inspeção.
- Segredos de edge function só via `supabase secrets set` ou o painel do Supabase — nunca em texto em
  arquivos de migration.

## Estado real e contexto gerado

- `inventario/estado/` — banco (tabelas, RLS, cron, edges publicadas), edge functions do repo, rotas → tela →
  hooks → dados e tabelas órfãs. Refazer: `SUPABASE_ACCESS_TOKEN=... node scripts/inventario/gerar-banco.mjs
  && node scripts/inventario/gerar-rotas.mjs && node scripts/inventario/gerar-repo.mjs`. Confira `gerado_em`
  antes de confiar.
- Branch gerada `contexto` (a cada 10 min, workflow `contexto.yml`; não editar nem abrir PR dela): comece por
  `docs/contexto/00-INDEX.md` (`git fetch origin contexto && git show origin/contexto:docs/contexto/00-INDEX.md`
  ou MCP `get_file(ref=contexto)`). Três fontes, cada uma dona dos seus fatos: `supabase/` (banco oficial ao
  vivo, sessão read-only — `scripts/supabase_snapshot/`), `codigo/` (rotas, módulos, hooks, edges, grafo,
  testes, alertas — `scripts/ai-context/gerar.mjs`), `regras/` (RLS por operação, estados, validações,
  fórmulas, lacunas — `scripts/regras_negocio/`). Regras que só o negócio conhece: `docs/contexto/regras/manual/`
  (na `main`).
- Retrato do schema (tabelas, policies, cron, triggers): `docs/SCHEMA_REFERENCE.md` — data da medição no topo.
- Política de DDL: `docs/db/POLITICA_DDL.md`. Recibos de migration: `supabase/MIGRATIONS_SYNC_LOG.md`.
