# public._archive_product_ai_20260626

> Backup de product_ai (casca morta removida em 2026-06-26, MELHORIA 1+2 medallion). Retencao ate ~2026-09-26.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `product_id` | `uuid` | não |  |  |  |
| 2 | `ai_summary` | `text` | sim |  |  |  |
| 3 | `key_benefits` | `text[]` | sim |  |  |  |
| 4 | `use_cases` | `text[]` | sim |  |  |  |
| 5 | `target_audience` | `text[]` | sim |  |  |  |
| 6 | `ai_title` | `text` | sim |  |  |  |
| 7 | `ai_description` | `text` | sim |  |  |  |
| 8 | `ai_version` | `integer` | sim |  |  |  |
| 9 | `ai_generated_at` | `timestamp with time zone` | sim |  |  |  |
| 10 | `ai_model` | `character varying(50)` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| archive_product_ai_pkey | PRIMARY KEY | `PRIMARY KEY (product_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| archive_product_ai_pkey | btree | product_id | sim | sim |  | `CREATE UNIQUE INDEX archive_product_ai_pkey ON public._archive_product_ai_20260626 USING btree (product_id)` |


## Policies (RLS)

### `admin_only`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
