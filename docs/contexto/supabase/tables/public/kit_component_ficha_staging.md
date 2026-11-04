# public.kit_component_ficha_staging

> Staging do parse da ficha tecnica (PDF XBZ). O job de ingestao (n8n/edge) insere 1 linha por peca; fn_promote_kit_ficha_staging casa cada peca ao componente e grava medida REAL respeitando procedencia.

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
| usada por views | public.v_kit_ficha_pipeline_health |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `product_sku` | `character varying(50)` | não |  |  |  |
| 3 | `product_id` | `uuid` | sim |  |  |  |
| 4 | `piece_label` | `text` | não |  |  |  |
| 5 | `piece_norm` | `text` | sim |  |  |  |
| 6 | `piece_kind` | `character varying(12)` | sim |  |  |  |
| 7 | `dim_a_mm` | `integer` | sim |  |  |  |
| 8 | `dim_l_mm` | `integer` | sim |  |  |  |
| 9 | `dim_p_mm` | `integer` | sim |  |  |  |
| 10 | `weight_g` | `integer` | sim |  |  |  |
| 11 | `raw_text` | `text` | sim |  |  |  |
| 12 | `source` | `character varying(30)` | não | `'xbz_ficha_pdf'::character varying` |  |  |
| 13 | `source_url` | `text` | sim |  |  |  |
| 14 | `parsed_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `matched_component_id` | `uuid` | sim |  |  |  |
| 16 | `match_status` | `character varying(16)` | não | `'pending'::character varying` |  |  |
| 17 | `match_confidence` | `numeric(4,3)` | sim |  |  |  |
| 18 | `promoted_at` | `timestamp with time zone` | sim |  |  |  |
| 19 | `notes` | `text` | sim |  |  |  |
| 20 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_kcfs_dim_a | CHECK | `CHECK (dim_a_mm IS NULL OR dim_a_mm >= 1 AND dim_a_mm <= 20000)` |  |  | sim |
| chk_kcfs_dim_l | CHECK | `CHECK (dim_l_mm IS NULL OR dim_l_mm >= 1 AND dim_l_mm <= 20000)` |  |  | sim |
| chk_kcfs_dim_p | CHECK | `CHECK (dim_p_mm IS NULL OR dim_p_mm >= 1 AND dim_p_mm <= 20000)` |  |  | sim |
| chk_kcfs_status | CHECK | `CHECK (match_status::text = ANY (ARRAY['pending'::character varying, 'promoted'::character varying, 'no_component'::character varying, 'ambiguous'::character varying, 'skipped'::character varying]::text[]))` |  |  | sim |
| kit_component_ficha_staging_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| ix_kcfs_product | btree | product_sku | não | sim |  | `CREATE INDEX ix_kcfs_product ON public.kit_component_ficha_staging USING btree (product_sku)` |
| ix_kcfs_status | btree | match_status | não | sim |  | `CREATE INDEX ix_kcfs_status ON public.kit_component_ficha_staging USING btree (match_status)` |
| kit_component_ficha_staging_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX kit_component_ficha_staging_pkey ON public.kit_component_ficha_staging USING btree (id)` |


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
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
