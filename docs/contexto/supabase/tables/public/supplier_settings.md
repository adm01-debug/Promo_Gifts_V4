# public.supplier_settings

> Configurações padrão por fornecedor para auto-preenchimento de campos em products

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
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `supplier_id` | `uuid` | não |  |  |  |
| 3 | `default_supply_mode` | `character varying` | sim | `'pronta_entrega_liso'::character varying` |  |  |
| 4 | `default_is_imported` | `boolean` | sim | `true` |  |  |
| 5 | `use_origin_country` | `boolean` | sim | `false` |  |  |
| 6 | `default_lead_time_days` | `integer` | sim | `5` |  |  |
| 7 | `auto_sync_enabled` | `boolean` | sim | `true` |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 10 | `default_packing_classification` | `character varying` | sim |  |  | Classificação padrão de embalagem quando não consegue detectar automaticamente |
| 11 | `parent_key_source` | `text` | sim |  |  |  |
| 12 | `variant_name_template` | `text` | sim |  |  |  |
| 13 | `sku_prefix` | `text` | sim |  |  |  |
| 14 | `hash_excluded_fields` | `text[]` | não | `'{}'::text[]` |  | Chaves de raw_data ignoradas no cálculo de content_hash (estado volátil de estoque). Chaves iniciadas em "_" são sempre ignoradas. Mudança nesses campos NÃO deve redisparar padronização de produto. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| supplier_settings_default_packing_classification_check | CHECK | `CHECK (default_packing_classification::text = ANY (ARRAY['commercial'::character varying, 'protective'::character varying, 'none'::character varying]::text[]))` |  |  | sim |
| supplier_settings_default_supply_mode_check | CHECK | `CHECK (default_supply_mode::text = ANY (ARRAY['pronta_entrega_liso'::character varying, 'fabricado_liso'::character varying, 'fabricado_personalizado'::character varying]::text[]))` |  |  | sim |
| supplier_settings_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| supplier_settings_supplier_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| supplier_settings_supplier_id_key | UNIQUE | `UNIQUE (supplier_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| supplier_settings_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX supplier_settings_pkey ON public.supplier_settings USING btree (id)` |
| supplier_settings_supplier_id_key | btree | supplier_id | sim | sim |  | `CREATE UNIQUE INDEX supplier_settings_supplier_id_key ON public.supplier_settings USING btree (supplier_id)` |


## Policies (RLS)

### `auth_read_supplier_settings`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_supplier_settings_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_supplier_settings_timestamp |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
