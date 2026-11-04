# public.product_novelties

> Controla o ciclo de vida do selo "NOVO" nos produtos. Camada Gold — referencia products.id. Pipeline popula via fn_sync_product_novelties(); curadoria manual via is_highlighted. Máx. 1 registro ATIVO por produto (partial unique index). Histórico preservado.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.vw_novelty_health, public.vw_product_novelties_active |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `product_id` | `uuid` | não |  |  |  |
| 3 | `supplier_id` | `uuid` | sim |  |  |  |
| 4 | `supplier_code` | `text` | sim |  |  |  |
| 5 | `supplier_product_code` | `text` | sim |  |  |  |
| 6 | `source` | `text` | não |  |  | Origem da detecção. pipeline_auto/spot_*/xbz_*/asia_*/sm_* = automático. manual/import = humano. |
| 7 | `detected_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `expires_at` | `timestamp with time zone` | sim |  |  | NULL = não expira automaticamente. fn_expire_novelties() atualiza is_active=false quando vencido. |
| 9 | `is_active` | `boolean` | não | `true` |  |  |
| 10 | `is_highlighted` | `boolean` | não | `false` |  | TRUE = produto aparece em destaque na home. APENAS curadoria manual — nunca automático pelo pipeline. |
| 11 | `notes` | `text` | sim |  |  |  |
| 12 | `created_by` | `uuid` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_pn_expires_after_detected | CHECK | `CHECK (expires_at IS NULL OR expires_at > detected_at)` |  |  | sim |
| chk_pn_source | CHECK | `CHECK (source = ANY (ARRAY['manual'::text, 'import'::text, 'pipeline_auto'::text, 'pipeline_backfill'::text, 'migration_from_supplier'::text, 'spot_new_product'::text, 'spot_catalogo_novidades'::text, 'xbz_recently_promoted'::text, 'asia_recently_promoted'::text, 'sm_recently_promoted'::text, 'sm_recently_promoted'::text, '88brindes_recently_promoted'::text]))` |  |  | sim |
| fk_pn_created_by | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| fk_pn_product | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| fk_pn_supplier | FOREIGN KEY | `FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| pk_product_novelties | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pn_expires | btree | expires_at | não | sim | `((is_active = true) AND (expires_at IS NOT NULL))` | `CREATE INDEX idx_pn_expires ON public.product_novelties USING btree (expires_at) WHERE ((is_active = true) AND (expires_at IS NOT NULL))` |
| idx_pn_highlighted | btree | is_highlighted, detected_at | não | sim | `((is_active = true) AND (is_highlighted = true))` | `CREATE INDEX idx_pn_highlighted ON public.product_novelties USING btree (is_highlighted, detected_at DESC) WHERE ((is_active = true) AND (is_highlighted = true))` |
| idx_pn_source | btree | source, is_active | não | sim |  | `CREATE INDEX idx_pn_source ON public.product_novelties USING btree (source, is_active)` |
| idx_pn_supplier | btree | supplier_id | não | sim | `(is_active = true)` | `CREATE INDEX idx_pn_supplier ON public.product_novelties USING btree (supplier_id) WHERE (is_active = true)` |
| idx_product_novelties_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_product_novelties_created_by ON public.product_novelties USING btree (created_by)` |
| idx_product_novelties_expires_sweep | btree | supplier_id, is_active | não | sim | `(is_active = true)` | `CREATE INDEX idx_product_novelties_expires_sweep ON public.product_novelties USING btree (supplier_id, is_active) WHERE (is_active = true)` |
| pk_product_novelties | btree | id | sim | sim |  | `CREATE UNIQUE INDEX pk_product_novelties ON public.product_novelties USING btree (id)` |
| uq_pn_product_one_active | btree | product_id | sim | sim | `(is_active = true)` | `CREATE UNIQUE INDEX uq_pn_product_one_active ON public.product_novelties USING btree (product_id) WHERE (is_active = true)` |
| uq_product_novelties_product_no_supplier | btree | product_id | sim | sim | `(supplier_id IS NULL)` | `CREATE UNIQUE INDEX uq_product_novelties_product_no_supplier ON public.product_novelties USING btree (product_id) WHERE (supplier_id IS NULL)` |
| uq_product_novelties_product_supplier | btree | product_id, supplier_id | sim | sim | `(supplier_id IS NOT NULL)` | `CREATE UNIQUE INDEX uq_product_novelties_product_supplier ON public.product_novelties USING btree (product_id, supplier_id) WHERE (supplier_id IS NOT NULL)` |


## Policies (RLS)

### `pn_anon_select_active`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon |
| USING | `(is_active = true)` |
| WITH CHECK |  |

### `pn_authenticated_select_active`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(is_active = true)` |
| WITH CHECK |  |

### `pn_service_role_all`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK | `true` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_pn_sync_products | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.fn_pn_sync_products_is_new |
| trg_pn_updated_at | BEFORE | UPDATE | ROW | enabled | public.fn_pn_set_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | SELECT |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
