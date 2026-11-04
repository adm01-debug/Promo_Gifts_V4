# public.magazine_templates_catalog

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
| 1 | `template_id` | `text` | não |  |  |  |
| 2 | `family` | `text` | não |  |  |  |
| 3 | `products_per_page` | `integer` | não |  |  |  |
| 4 | `is_active` | `boolean` | não | `true` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| magazine_templates_catalog_family_check | CHECK | `CHECK (family = ANY (ARRAY['editorial'::text, 'catalog'::text, 'corporate'::text]))` |  |  | sim |
| magazine_templates_catalog_pkey | PRIMARY KEY | `PRIMARY KEY (template_id)` |  |  | sim |
| magazine_templates_catalog_products_per_page_check | CHECK | `CHECK (products_per_page > 0)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.magazine_templates | magazine_templates_template_id_fkey | template_id | NO ACTION |
| public.magazines | magazines_template_id_fk | template_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| magazine_templates_catalog_pkey | btree | template_id | sim | sim |  | `CREATE UNIQUE INDEX magazine_templates_catalog_pkey ON public.magazine_templates_catalog USING btree (template_id)` |


## Policies (RLS)

### `templates_catalog_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(is_active = true)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | REFERENCES, SELECT, TRIGGER |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
