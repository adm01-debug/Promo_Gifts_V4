# public.price_history

> Histórico de todas as alterações de preço/custo para auditoria

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
| usada por views | public.v_price_history_safe |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `variant_id` | `uuid` | não |  |  |  |
| 3 | `change_type` | `character varying(30)` | não |  |  |  |
| 4 | `old_values` | `jsonb` | sim |  |  |  |
| 5 | `new_values` | `jsonb` | sim |  |  |  |
| 6 | `change_reason` | `text` | sim |  |  |  |
| 7 | `changed_by` | `uuid` | sim |  |  |  |
| 8 | `changed_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 9 | `source` | `character varying(50)` | sim | `'manual'::character varying` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_change_type | CHECK | `CHECK (change_type::text = ANY (ARRAY['cost_update'::character varying, 'markup_update'::character varying, 'api_sync'::character varying, 'manual_adjustment'::character varying, 'price_correction'::character varying]::text[]))` |  |  | sim |
| price_history_changed_by_fkey | FOREIGN KEY | `FOREIGN KEY (changed_by) REFERENCES profiles(id)` | NO ACTION | NO ACTION | sim |
| price_history_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| price_history_variant_id_fkey | FOREIGN KEY | `FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_price_history_changed_by | btree | changed_by | não | sim |  | `CREATE INDEX idx_price_history_changed_by ON public.price_history USING btree (changed_by)` |
| idx_price_history_variant_id | btree | variant_id | não | sim | `(variant_id IS NOT NULL)` | `CREATE INDEX idx_price_history_variant_id ON public.price_history USING btree (variant_id) WHERE (variant_id IS NOT NULL)` |
| price_history_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX price_history_pkey ON public.price_history USING btree (id)` |


## Policies (RLS)

### `admin_read_price_history`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role) OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'dev'::app_role) OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'supervisor'::app_role) OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'manager'::app_role))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
