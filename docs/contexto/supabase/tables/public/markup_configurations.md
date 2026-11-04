# public.markup_configurations

> Configurações de markup por nível hierárquico (SKU > Produto > Categoria > Fornecedor > Geral)

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
| usada por views | public.v_my_markup_config, public.v_variant_sale_prices_public, public.vw_variant_sale_prices |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `organization_id` | `uuid` | sim |  |  |  |
| 3 | `supplier_id` | `uuid` | sim |  |  |  |
| 4 | `category_id` | `uuid` | sim |  |  |  |
| 5 | `product_id` | `uuid` | sim |  |  |  |
| 6 | `variant_id` | `uuid` | sim |  |  |  |
| 7 | `markup_percent` | `numeric(5,2)` | não |  |  |  |
| 8 | `description` | `text` | sim |  |  |  |
| 9 | `is_active` | `boolean` | sim | `true` |  |  |
| 10 | `priority` | `integer` | sim | ` CASE     WHEN (variant_id IS NOT NULL) THEN 1     WHEN (product_id IS NOT NULL) THEN 2     WHEN (category_id IS NOT NULL) THEN 3     WHEN (supplier_id IS NOT NULL) THEN 4     WHEN (organization_id IS NOT NULL) THEN 5     ELSE 6 END` | s | Prioridade calculada: 1=SKU, 2=Produto, 3=Categoria, 4=Fornecedor, 5=Organização, 6=Geral |
| 11 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 13 | `created_by` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_markup_positive | CHECK | `CHECK (markup_percent >= 0::numeric AND markup_percent <= 500::numeric)` |  |  | sim |
| chk_single_scope | CHECK | `CHECK (( CASE     WHEN variant_id IS NOT NULL THEN 1     ELSE 0 END + CASE     WHEN product_id IS NOT NULL THEN 1     ELSE 0 END + CASE     WHEN category_id IS NOT NULL THEN 1     ELSE 0 END + CASE     WHEN supplier_id IS NOT NULL THEN 1     ELSE 0 END + CASE     WHEN organization_id IS NOT NULL THEN 1     ELSE 0 END) <= 1)` |  |  | sim |
| markup_configurations_category_id_fkey | FOREIGN KEY | `FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| markup_configurations_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES profiles(id)` | NO ACTION | NO ACTION | sim |
| markup_configurations_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| markup_configurations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| markup_configurations_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| markup_configurations_supplier_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| markup_configurations_variant_id_fkey | FOREIGN KEY | `FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_markup_category | btree | category_id | não | sim | `(category_id IS NOT NULL)` | `CREATE INDEX idx_markup_category ON public.markup_configurations USING btree (category_id) WHERE (category_id IS NOT NULL)` |
| idx_markup_configurations_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_markup_configurations_created_by ON public.markup_configurations USING btree (created_by)` |
| idx_markup_configurations_organization_id | btree | organization_id | não | sim |  | `CREATE INDEX idx_markup_configurations_organization_id ON public.markup_configurations USING btree (organization_id)` |
| idx_markup_configurations_product_id | btree | product_id | não | sim |  | `CREATE INDEX idx_markup_configurations_product_id ON public.markup_configurations USING btree (product_id)` |
| idx_markup_configurations_supplier_id | btree | supplier_id | não | sim |  | `CREATE INDEX idx_markup_configurations_supplier_id ON public.markup_configurations USING btree (supplier_id)` |
| idx_markup_variant | btree | variant_id | não | sim | `(variant_id IS NOT NULL)` | `CREATE INDEX idx_markup_variant ON public.markup_configurations USING btree (variant_id) WHERE (variant_id IS NOT NULL)` |
| markup_configurations_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX markup_configurations_pkey ON public.markup_configurations USING btree (id)` |


## Policies (RLS)

### `auth_read_markup_configurations`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |

### `markup_configurations_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_org_owner_or_admin(organization_id)` |
| WITH CHECK |  |

### `markup_configurations_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_org_owner_or_admin(organization_id)` |

### `markup_configurations_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_org_owner_or_admin(organization_id)` |
| WITH CHECK | `is_org_owner_or_admin(organization_id)` |


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
