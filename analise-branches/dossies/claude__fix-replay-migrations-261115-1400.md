# origin/claude/fix-replay-migrations-261115-1400

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** garante que o banco do sistema possa ser reconstruido do zero (recuperacao de desastre e ambientes de teste) sem parar no meio — e isso ja esta em producao desde o merge da PR #3686; nada em producao foi alterado.
- **Tip / merge-base / main:** tip `8efffeb0e5c80098048b1100a2db68762453022b` · merge-base `7e6d63dedadbd372775f3c84cd52a13e41002c7b` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit (`8efffeb0e5`, `fix(db): colunas perdidas por CREATE TABLE IF NOT EXISTS no-op no replay`).
O defeito: `supabase/migrations/20250103080000_complete_schema.sql` declara `categories`, `suppliers`,
`products` e `quotes` com `CREATE TABLE IF NOT EXISTS`, mas `20250102000000_gifts_production.sql` ja criou
as 4 tabelas antes. O comando vira no-op e as 62 colunas declaradas ali nunca nascem num banco construido do
zero — o replay parava em `20260512000000_bootstrap_missing_application_schemas.sql:717` com
`column categories.display_order does not exist`.

O conserto da branch, em 3 partes:

1. `ADD COLUMN IF NOT EXISTS` com tipo/default exatos para as 62 colunas (5 em `categories`, 8 em
   `suppliers`, 24 em `products`, 25 em `quotes`), logo depois de cada `CREATE TABLE`.
2. A `UNIQUE` de `categories.slug` (os seeds fazem `ON CONFLICT (slug)`) e a FK
   `quotes.client_id -> bitrix_clients(id)`.
3. Stub `CREATE TABLE IF NOT EXISTS` de `material_groups`, `material_types` e `product_materials` em
   `20260512000000` — as matviews `analytics` do proprio arquivo leem essas tabelas e nenhuma migration as
   cria.

Mais o registro no `supabase/MIGRATIONS_SYNC_LOG.md`. O proprio commit avisa que **nao** completa o replay
("restam 76 relacoes orfas") e que em producao tudo e no-op.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| 5 `ADD COLUMN IF NOT EXISTS` de `categories` | `supabase/migrations/20250103080000_complete_schema.sql` | `git show origin/main:...20250103080000_complete_schema.sql \| grep -c "^ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS"` → `5` na main e `5` na branch; `display_order` na linha 68 da main |
| 8 `ADD COLUMN IF NOT EXISTS` de `suppliers` | mesmo arquivo na main | mesmo comando com `suppliers` → `8` na main e `8` na branch |
| 24 `ADD COLUMN IF NOT EXISTS` de `products` | mesmo arquivo na main | mesmo comando com `products` → `24` na main e `24` na branch |
| 25 `ADD COLUMN IF NOT EXISTS` de `quotes` | mesmo arquivo na main | mesmo comando com `quotes` → `25` na main e `25` na branch |
| `UNIQUE categories_slug_key` idempotente | main, linhas 74-78 | `ALTER TABLE public.categories ADD CONSTRAINT categories_slug_key UNIQUE (slug);` dentro do `DO $$ ... IF NOT EXISTS (SELECT 1 FROM pg_constraint ...)` |
| FK `quotes.client_id -> bitrix_clients(id) ON DELETE SET NULL` | main, linha 413 do mesmo arquivo | `git show origin/main:...20250103080000_complete_schema.sql \| grep -n "bitrix_clients(id) ON DELETE SET NULL"` → linha 413 (o `ADD COLUMN` da branch) |
| stubs `material_groups`, `material_types`, `product_materials` | `supabase/migrations/20260512000000_bootstrap_missing_application_schemas.sql` linhas 60, 76, 92 da main, sob o comentario `REPLAY FIX` da linha 48 | `grep -n 'CREATE TABLE IF NOT EXISTS "public"."material_groups"'` na versao da main → linha 60 |
| secao de registro no `MIGRATIONS_SYNC_LOG.md` | main, linha 1750: `## 2026-11-15 — Replay do zero: colunas perdidas por CREATE TABLE IF NOT EXISTS no-op` | o texto da main e o da branch **ampliado**, e cita como evidencia o proprio tip desta branch: "check `Supabase Preview` da #3685, SHA `8efffeb0e5`" |
| **nada ficou de fora (prova negativa)** | — | `git diff origin/claude/fix-replay-migrations-261115-1400 origin/main -- <arquivo>` contando `^-[^-]`: **0** linhas exclusivas da branch em `20250103080000_complete_schema.sql` e **0** em `20260512000000_...sql`. A main so **soma** (25 e 242 linhas novas respectivamente) |
| quem trouxe para a main | commit de squash `26d93948f5` — `fix(db): replay do zero — colunas e tabelas perdidas por no-op de CREATE TABLE IF NOT EXISTS (#3686)`, 2026-11-15 | `git log -S"ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0" --oneline origin/main -- supabase/migrations/20250103080000_complete_schema.sql` → so `26d93948f5`; idem para `REPLAY FIX (3)` e para o stub de `material_groups` |

O que a main tem **a mais** que a branch (continuacao do mesmo trabalho na PR #3686, com achados das
revisoes `devin-ai-integration` e `chatgpt-codex-connector`): mais 3 stubs (`product_images`,
`variant_supplier_sources`, `stock_daily_summary`), as 13 constraints reais de producao, `ENABLE ROW LEVEL
SECURITY` nas 6 tabelas, as 2 colunas `GENERATED ALWAYS ... STORED` de `product_images` (`cf_id_scheme`,
`aspect_ratio`) e as `UNIQUE` de `quotes.quote_number` / `quotes.approval_token`. Ou seja: a branch e um
estagio anterior do que hoje esta na main.

As 6 linhas que existem so na branch no `MIGRATIONS_SYNC_LOG.md` sao todas **versoes vencidas** do mesmo
registro, nao conteudo perdido:
- a linha antiga de `20261031000000` dizendo "tabela nao existe em producao" (a main tem a linha corrigida,
  mais nova);
- 3 linhas de texto que descreviam o stub como sendo de 3 tabelas (a main descreve as 6);
- as 2 linhas de `sha256` intermediarias (`4dcc93d8c5...`, `fe6fe4be7b...`), substituidas na main por
  `096a7a6b18...` e `7e848bc78a...` — que **conferem** com o conteudo atual dos arquivos na main
  (`git show origin/main:<arquivo> | sha256sum` devolve exatamente esses dois valores).

## A resgatar

Nada. Nenhuma linha de conteudo proprio da branch esta ausente da main.

## Risco de fechar esta branch

Nenhum risco de perda de trabalho. Todo o conserto esta na main desde `26d93948f5` (#3686), em versao mais
completa, e o registro no `MIGRATIONS_SYNC_LOG.md` da main cita esta branch como etapa anterior. Fechar a
branch nao mexe em producao: os dois arquivos ja tem a `version` registrada no ledger e nao voltam a rodar.

Observacao que **permanece aberta e nao e desta branch**: o proprio commit avisa que o replay do zero ainda
nao completa ("restam 76 relacoes orfas que nenhuma migration cria"). Isso significa que reconstruir o banco
do zero ainda nao vai do inicio ao fim. Nao verifiquei quantas faltam hoje na main.

## Nao verificado

- Se o replay do zero passa ponta a ponta na main de hoje, e quantas das 76 relacoes orfas ainda faltam:
  exigiria subir um Postgres e rodar as migrations, o que esta fora do escopo somente-leitura desta analise.
- O estado da PR #3685 (aberta/fechada) no GitHub: nao consultei o GitHub, decidi apenas pelo conteudo do
  git local. A deducao de que #3686 e a continuacao de #3685 vem do texto da main
  (`MIGRATIONS_SYNC_LOG.md` linha ~1760: "evidencia: check `Supabase Preview` da #3685, SHA `8efffeb0e5`").
