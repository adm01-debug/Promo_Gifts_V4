# public.product_packagings

> Relação entre produtos e embalagens disponíveis

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
| usada por views | public.vw_product_packaging_options |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `product_id` | `uuid` | não |  |  |  |
| 3 | `packaging_id` | `uuid` | não |  |  |  |
| 4 | `relationship_type` | `character varying(20)` | não | `'optional'::character varying` |  | included=já vem, optional=compra a parte, required=obrigatória, default=padrão |
| 5 | `additional_price` | `numeric(10,2)` | sim |  |  |  |
| 6 | `currency` | `character varying(3)` | sim | `'BRL'::character varying` |  |  |
| 7 | `min_quantity` | `integer` | sim | `1` |  |  |
| 8 | `notes` | `text` | sim |  |  |  |
| 9 | `active` | `boolean` | sim | `true` |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_packagings_packaging_id_fkey | FOREIGN KEY | `FOREIGN KEY (packaging_id) REFERENCES packagings(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_packagings_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_packagings_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_packagings_unique | UNIQUE | `UNIQUE (product_id, packaging_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_product_packagings_packaging_id | btree | packaging_id | não | sim |  | `CREATE INDEX idx_product_packagings_packaging_id ON public.product_packagings USING btree (packaging_id)` |
| idx_product_packagings_product | btree | product_id | não | sim |  | `CREATE INDEX idx_product_packagings_product ON public.product_packagings USING btree (product_id)` |
| product_packagings_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_packagings_pkey ON public.product_packagings USING btree (id)` |
| product_packagings_unique | btree | product_id, packaging_id | sim | sim |  | `CREATE UNIQUE INDEX product_packagings_unique ON public.product_packagings USING btree (product_id, packaging_id)` |


## Policies (RLS)

### `auth_read_product_packagings`

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


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
