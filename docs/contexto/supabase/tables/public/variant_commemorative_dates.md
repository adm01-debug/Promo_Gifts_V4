# public.variant_commemorative_dates

> Associação de variantes (cores) ou produtos completos às datas comemorativas

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
| usada por views | public.v_commemorative_dates_calendar, public.v_variants_with_commemorative_dates |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `product_id` | `uuid` | sim |  |  | Se preenchido sem variant_id, vincula TODAS as variantes do produto |
| 3 | `variant_id` | `uuid` | sim |  |  | Se preenchido, vincula apenas esta variante (cor específica) à data |
| 4 | `commemorative_date_id` | `uuid` | não |  |  |  |
| 5 | `display_order` | `integer` | sim | `0` |  |  |
| 6 | `is_featured` | `boolean` | sim | `false` |  |  |
| 7 | `custom_description` | `text` | sim |  |  |  |
| 8 | `created_by` | `uuid` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_product_or_variant | CHECK | `CHECK (product_id IS NOT NULL OR variant_id IS NOT NULL)` |  |  | sim |
| variant_commemorative_dates_commemorative_date_id_fkey | FOREIGN KEY | `FOREIGN KEY (commemorative_date_id) REFERENCES commemorative_dates(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| variant_commemorative_dates_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| variant_commemorative_dates_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| variant_commemorative_dates_product_id_variant_id_commemora_key | UNIQUE | `UNIQUE (product_id, variant_id, commemorative_date_id)` |  |  | sim |
| variant_commemorative_dates_variant_id_fkey | FOREIGN KEY | `FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_variant_commemorative_dates_commemorative_date_id | btree | commemorative_date_id | não | sim |  | `CREATE INDEX idx_variant_commemorative_dates_commemorative_date_id ON public.variant_commemorative_dates USING btree (commemorative_date_id)` |
| idx_variant_commemorative_dates_variant_id | btree | variant_id | não | sim |  | `CREATE INDEX idx_variant_commemorative_dates_variant_id ON public.variant_commemorative_dates USING btree (variant_id)` |
| variant_commemorative_dates_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX variant_commemorative_dates_pkey ON public.variant_commemorative_dates USING btree (id)` |
| variant_commemorative_dates_product_id_variant_id_commemora_key | btree | product_id, variant_id, commemorative_date_id | sim | sim |  | `CREATE UNIQUE INDEX variant_commemorative_dates_product_id_variant_id_commemora_key ON public.variant_commemorative_dates USING btree (product_id, variant_id, commemorative_date_id)` |


## Policies (RLS)

### `Anyone can view variant commemorative dates`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `true` |
| WITH CHECK |  |

### `vcd_admin_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `vcd_admin_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `vcd_admin_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
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
