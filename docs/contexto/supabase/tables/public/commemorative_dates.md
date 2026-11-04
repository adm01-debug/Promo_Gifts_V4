# public.commemorative_dates

> Cadastro de datas comemorativas para associar produtos

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
| usada por views | public.v_commemorative_dates_calendar, public.v_commemorative_dates_with_colors, public.v_super_filtro_options, public.v_variants_with_commemorative_dates, public.vw_category_commemorative_dates, public.vw_product_commemorative_dates, public.vw_products_by_date |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `name` | `text` | não |  |  |  |
| 3 | `slug` | `text` | não |  |  |  |
| 4 | `description` | `text` | sim |  |  |  |
| 5 | `date_day` | `integer` | sim |  |  |  |
| 6 | `date_month` | `integer` | sim |  |  |  |
| 7 | `is_fixed_date` | `boolean` | sim | `true` |  | TRUE para datas fixas (ex: 08/03), FALSE para variáveis (ex: Páscoa) |
| 8 | `variable_date_rule` | `text` | sim |  |  | Descrição da regra para datas variáveis |
| 9 | `category` | `text` | sim | `'geral'::text` |  |  |
| 10 | `target_audience` | `text` | sim |  |  |  |
| 11 | `icon_name` | `text` | sim |  |  |  |
| 12 | `color_hex` | `text` | sim | `'#8b5cf6'::text` |  |  |
| 13 | `image_url` | `text` | sim |  |  |  |
| 14 | `banner_url` | `text` | sim |  |  |  |
| 15 | `is_active` | `boolean` | sim | `true` |  |  |
| 16 | `is_featured` | `boolean` | sim | `false` |  |  |
| 17 | `display_order` | `integer` | sim | `0` |  |  |
| 18 | `campaign_start_days` | `integer` | sim | `30` |  | Dias antes da data para iniciar campanhas/destaques |
| 19 | `campaign_end_days` | `integer` | sim | `0` |  |  |
| 20 | `organization_id` | `uuid` | sim |  |  |  |
| 21 | `created_by` | `uuid` | sim |  |  |  |
| 22 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 23 | `updated_by` | `uuid` | sim |  |  |  |
| 24 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| commemorative_dates_date_day_check | CHECK | `CHECK (date_day >= 1 AND date_day <= 31)` |  |  | sim |
| commemorative_dates_date_month_check | CHECK | `CHECK (date_month >= 1 AND date_month <= 12)` |  |  | sim |
| commemorative_dates_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| commemorative_dates_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| commemorative_dates_slug_key | UNIQUE | `UNIQUE (slug)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.category_commemorative_dates | category_commemorative_dates_commemorative_date_id_fkey | commemorative_date_id | CASCADE |
| public.commemorative_date_colors | commemorative_date_colors_commemorative_date_id_fkey | commemorative_date_id | CASCADE |
| public.commemorative_date_exclusions | commemorative_date_exclusions_commemorative_date_id_fkey | commemorative_date_id | CASCADE |
| public.product_commemorative_dates | product_commemorative_dates_commemorative_date_id_fkey | commemorative_date_id | CASCADE |
| public.variant_commemorative_dates | variant_commemorative_dates_commemorative_date_id_fkey | commemorative_date_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| commemorative_dates_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX commemorative_dates_pkey ON public.commemorative_dates USING btree (id)` |
| commemorative_dates_slug_key | btree | slug | sim | sim |  | `CREATE UNIQUE INDEX commemorative_dates_slug_key ON public.commemorative_dates USING btree (slug)` |
| idx_commemorative_dates_organization_id | btree | organization_id | não | sim |  | `CREATE INDEX idx_commemorative_dates_organization_id ON public.commemorative_dates USING btree (organization_id)` |


## Policies (RLS)

### `Anyone can view active commemorative dates`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(is_active = true)` |
| WITH CHECK |  |

### `commemorative_dates_admin_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `commemorative_dates_admin_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `commemorative_dates_admin_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
