# public.target_audiences

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
| usada por views | public.vw_category_target_audiences |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `organization_id` | `uuid` | sim |  |  |  |
| 3 | `name` | `character varying(100)` | não |  |  |  |
| 4 | `slug` | `character varying(100)` | não |  |  |  |
| 5 | `description` | `text` | sim |  |  |  |
| 6 | `category` | `character varying(50)` | sim |  |  |  |
| 7 | `icon_name` | `character varying(50)` | sim |  |  |  |
| 8 | `color_hex` | `character varying(7)` | sim |  |  |  |
| 9 | `display_order` | `integer` | sim | `0` |  |  |
| 10 | `is_active` | `boolean` | não | `true` |  |  |
| 11 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| target_audiences_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| target_audiences_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| uq_target_audience_slug | UNIQUE | `UNIQUE (slug)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.category_target_audiences | category_target_audiences_target_audience_id_fkey | target_audience_id | CASCADE |
| public.product_target_audiences | product_target_audiences_target_audience_id_fkey | target_audience_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_target_audiences_organization_id | btree | organization_id | não | sim |  | `CREATE INDEX idx_target_audiences_organization_id ON public.target_audiences USING btree (organization_id)` |
| target_audiences_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX target_audiences_pkey ON public.target_audiences USING btree (id)` |
| uq_target_audience_slug | btree | slug | sim | sim |  | `CREATE UNIQUE INDEX uq_target_audience_slug ON public.target_audiences USING btree (slug)` |


## Policies (RLS)

### `auth_read_target_audiences`

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
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |
| trg_target_aud_updated | BEFORE | UPDATE | ROW | enabled | public.fn_update_target_aud_timestamp |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
