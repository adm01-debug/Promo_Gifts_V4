# public.commemorative_date_exclusions

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.v_commemorative_dates_with_colors |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `commemorative_date_id` | `uuid` | não |  |  |  |
| 3 | `product_id` | `uuid` | sim |  |  |  |
| 4 | `variant_id` | `uuid` | sim |  |  |  |
| 5 | `reason` | `text` | sim |  |  |  |
| 6 | `excluded_by` | `uuid` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_exclusion_target | CHECK | `CHECK (product_id IS NOT NULL OR variant_id IS NOT NULL)` |  |  | sim |
| commemorative_date_exclusions_commemorative_date_id_fkey | FOREIGN KEY | `FOREIGN KEY (commemorative_date_id) REFERENCES commemorative_dates(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| commemorative_date_exclusions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| commemorative_date_exclusions_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| commemorative_date_exclusions_variant_id_fkey | FOREIGN KEY | `FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| commemorative_date_exclusions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX commemorative_date_exclusions_pkey ON public.commemorative_date_exclusions USING btree (id)` |
| idx_commemorative_date_exclusions_commemorative_date_id | btree | commemorative_date_id | não | sim |  | `CREATE INDEX idx_commemorative_date_exclusions_commemorative_date_id ON public.commemorative_date_exclusions USING btree (commemorative_date_id)` |
| idx_commemorative_date_exclusions_product_id | btree | product_id | não | sim |  | `CREATE INDEX idx_commemorative_date_exclusions_product_id ON public.commemorative_date_exclusions USING btree (product_id)` |
| idx_commemorative_date_exclusions_variant_id | btree | variant_id | não | sim |  | `CREATE INDEX idx_commemorative_date_exclusions_variant_id ON public.commemorative_date_exclusions USING btree (variant_id)` |


## Policies (RLS)

### `cde_admin_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `cde_admin_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `cde_admin_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `cde_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `true` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
