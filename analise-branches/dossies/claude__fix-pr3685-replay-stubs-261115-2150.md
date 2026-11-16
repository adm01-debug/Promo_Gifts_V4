# origin/claude/fix-pr3685-replay-stubs-261115-2150

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** garante que o banco do sistema possa ser reconstruido do zero (copia de teste, troca de servidor, recuperacao de desastre) sem parar no meio e sem nascer com orcamentos de numero repetido ou dados visiveis para a empresa errada.
- **Tip / merge-base / main:** tip `e95a2e30dba88b5611e7bfdc96eecb07aba560dd` · merge-base `24038f15deed8574a4578abae55da45c49aadaef` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Tres commits, todos sobre o *replay* das migrations (reconstruir o banco do zero a partir dos arquivos
em `supabase/migrations/`), sem nenhuma escrita em producao:

1. `1cb510414a` — `20250103080000_complete_schema.sql` declara `categories`, `suppliers`, `products` e
   `quotes` com `CREATE TABLE IF NOT EXISTS`, mas `20250102000000_gifts_production.sql` ja criou as 4
   antes: o comando e no-op e as 62 colunas declaradas ali nunca nascem num banco novo. Conserto:
   `ADD COLUMN IF NOT EXISTS` com tipo/default exatos, mais a `UNIQUE` de `categories.slug` e a FK
   `quotes_client_id_fkey`. Mais stubs `IF NOT EXISTS` de `material_groups`, `material_types` e
   `product_materials` em `20260512000000`.
2. `cc5f4c4206` — stubs das 3 tabelas restantes que as matviews `analytics` do proprio
   `20260512000000` leem e que nenhuma migration cria: `product_images`,
   `variant_supplier_sources`, `stock_daily_summary`.
3. `e95a2e30db` — achados da revisao da PR: 13 constraints reais de producao (PK/UNIQUE) nas 6 tabelas
   stub, `ENABLE ROW LEVEL SECURITY` nas 6, as duas colunas `GENERATED ALWAYS ... STORED` de
   `product_images` (`cf_id_scheme`, `aspect_ratio`) e as `UNIQUE` de `quotes.quote_number` e
   `quotes.approval_token`.

Arquivos tocados pela branch (vs merge-base), 3 no total:
`supabase/MIGRATIONS_SYNC_LOG.md`, `supabase/migrations/20250103080000_complete_schema.sql`,
`supabase/migrations/20260512000000_bootstrap_missing_application_schemas.sql`.

**Os dois arquivos de migration sao hoje byte-identicos a main** — mesmo blob git:

```
20250103080000_complete_schema.sql                     branch e main = 656c59787556f0e15c0b4a61c3e368d2047ab2c3
20260512000000_bootstrap_missing_application_schemas.sql branch e main = 914fc0f9bfb34575a10048f379d8d6be4a8cfa70
```

O trabalho entrou na main pelo squash-merge da PR #3686:
`git log --oneline -3 origin/main -- supabase/migrations/20250103080000_complete_schema.sql` →
`26d93948f5 fix(db): replay do zero — colunas e tabelas perdidas por no-op de CREATE TABLE IF NOT EXISTS (#3686)`.

O unico arquivo que "difere da main" e o `MIGRATIONS_SYNC_LOG.md`, e difere **apenas por adicao**: a main
tem, depois da secao desta branch, uma secao nova de outro assunto (`mockup-assistant`, PR #3666). O diff
branch → main nesse arquivo tem **zero linhas removidas**
(`git diff <tip> origin/main -- supabase/MIGRATIONS_SYNC_LOG.md | grep -c '^-[^-]'` → `0`), ou seja, o texto
escrito por esta branch esta integro na main.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| 62 colunas perdidas por no-op, via `ADD COLUMN IF NOT EXISTS` | `supabase/migrations/20250103080000_complete_schema.sql` | linha 68: `ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;` — era exatamente a coluna que parava o replay |
| `UNIQUE` de `categories.slug` (seeds fazem `ON CONFLICT (slug)`) | `20250103080000_complete_schema.sql:76-78` | `ALTER TABLE public.categories ADD CONSTRAINT categories_slug_key UNIQUE (slug);` dentro de bloco guardado por `conname = 'categories_slug_key'` |
| FK `quotes_client_id_fkey` | `20250103080000_complete_schema.sql` | aparece no grep do arquivo na main (`git grep -n quotes_client_id_fkey <main>:...`) |
| `UNIQUE quotes_quote_number_key` (evita orcamento com numero repetido) | `20250103080000_complete_schema.sql:440-442` | `ALTER TABLE public.quotes ADD CONSTRAINT quotes_quote_number_key UNIQUE (quote_number);` |
| `UNIQUE quotes_approval_token_key` | `20250103080000_complete_schema.sql:448-450` | `ALTER TABLE public.quotes ADD CONSTRAINT quotes_approval_token_key UNIQUE (approval_token);` |
| 6 tabelas stub lidas pelas matviews | `20260512000000_bootstrap_missing_application_schemas.sql` | `CREATE TABLE IF NOT EXISTS "public".` nas linhas 60 (`material_groups`), 76 (`material_types`), 92 (`product_materials`), 122 (`product_images`), 193 (`variant_supplier_sources`), 264 (`stock_daily_summary`) |
| as 13 constraints reais de producao nas 6 stubs | `20260512000000_...sql:308-340` | bloco `DO $$` com as 13 linhas `VALUES`, de `('material_groups','material_groups_pkey','PRIMARY KEY ("id")')` a `('stock_daily_summary','uq_stock_daily_vss_date','UNIQUE ("variant_supplier_source_id","summary_date")')`; inclui as 3 chaves alvo de FK posterior: `material_types_pkey`, `product_images_pkey`, `variant_stocks_pkey` |
| `ENABLE ROW LEVEL SECURITY` nas 6 (isolamento por empresa) | `20260512000000_...sql:343-352` | comentario `-- ENABLE ROW LEVEL SECURITY e idempotente: no-op quando já está ligado.` e `EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);` |
| `product_images.cf_id_scheme` como `GENERATED ALWAYS ... STORED` | `20260512000000_...sql:155,161` | `-- GENERATED ALWAYS STORED na producao: migrations posteriores` / `"cf_id_scheme" "text" GENERATED ALWAYS AS (` |
| `product_images.aspect_ratio` como `GENERATED ALWAYS ... STORED` | `20260512000000_...sql:182-183` | `"aspect_ratio" numeric GENERATED ALWAYS AS (` |
| secao do `MIGRATIONS_SYNC_LOG.md` (recibos sha256 das 2 versoes) | `supabase/MIGRATIONS_SYNC_LOG.md`, linhas ~1750-1801 | diff branch → main nesse arquivo tem 0 remocoes; a main so acrescenta uma secao posterior sobre `mockup-assistant` |

Nenhum item ficou de fora.

## A resgatar

Vazio. Nada a resgatar.

## Risco de fechar esta branch

Nenhum. Todo o conteudo proprio da branch esta na main: os dois arquivos de migration sao byte-identicos
(mesmo blob git) e o texto do log de sincronizacao esta integro. Fechar/apagar a branch nao perde nada.

Observacao de valor para o dono, que **nao** e risco desta branch e sim um trabalho que a propria branch
declarou inacabado: o commit `1cb510414a` registra que o replay do zero **ainda nao passa** — "restam 76
relacoes orfas que nenhuma migration cria". E o log registra uma divergencia conhecida: 11 das 62 colunas
declaradas nao existem em producao hoje (`products.base_price`, `products.dimensions`,
`products.minimum_stock`, `products.personalization_areas`, `products.personalization_options`,
`products.sizes`, `products.stock_unit`, `products.weight`, `quotes.delivery_terms`,
`quotes.discount_percentage`, `suppliers.is_active`). Isso e assunto de uma tarefa nova, nao desta branch.

## Nao verificado

- Nao foi reexecutado o replay completo em PostgreSQL local; a afirmacao "o replay passa de [15] para
  dentro de [579]" vem da mensagem do commit `1cb510414a`, nao de medicao minha. Isso nao afeta o
  veredito, que se sustenta na identidade byte a byte dos arquivos com a main.
- Nao foi reconsultado o banco de producao (`doufsxqlfjyuvxuezpln`) para reconferir as 13 constraints, o
  RLS das 6 tabelas e as 11 colunas divergentes; os numeros vem do commit e do log.
- Arquivos sem leitura por truncamento: 0 (o pacote nao estava truncado; os 3 arquivos da branch foram
  inspecionados).
