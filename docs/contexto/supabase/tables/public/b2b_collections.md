# public.b2b_collections

> Coleções B2B de produtos, com visibilidade, destaque e ordenação próprios. Esta tabela é distinta de public.collections.

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


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  | Identificador UUID da coleção B2B. |
| 2 | `name` | `text` | não |  |  | Nome de exibição da coleção B2B. |
| 3 | `slug` | `text` | não |  |  | Slug único da coleção B2B. |
| 4 | `description` | `text` | sim |  |  | Descrição da coleção B2B. |
| 5 | `image_url` | `text` | sim |  |  | URL da imagem associada à coleção B2B. |
| 6 | `is_public` | `boolean` | sim | `false` |  | Indica se a coleção B2B está marcada como pública. |
| 7 | `is_featured` | `boolean` | sim | `false` |  | Indica se a coleção B2B está marcada como destaque. |
| 8 | `display_order` | `integer` | sim | `0` |  | Ordem de exibição da coleção B2B. |
| 9 | `created_by` | `uuid` | sim |  |  | Usuário que criou a coleção B2B, quando registrado. |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  | Data e hora de criação da coleção B2B. |
| 11 | `updated_at` | `timestamp with time zone` | sim | `now()` |  | Data e hora da última atualização da coleção B2B. |
| 12 | `organization_id` | `uuid` | sim |  |  | Organização à qual pertence a coleção B2B. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| b2b_collections_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| collections_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| collections_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| collections_slug_key | UNIQUE | `UNIQUE (slug)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.b2b_collection_products | b2b_collection_products_b2b_collection_id_fkey | b2b_collection_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| b2b_collections_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX b2b_collections_pkey ON public.b2b_collections USING btree (id)` |
| collections_slug_key | btree | slug | sim | sim |  | `CREATE UNIQUE INDEX collections_slug_key ON public.b2b_collections USING btree (slug)` |
| idx_b2b_collections_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_b2b_collections_created_by ON public.b2b_collections USING btree (created_by)` |
| idx_b2b_collections_organization_id | btree | organization_id | não | sim |  | `CREATE INDEX idx_b2b_collections_organization_id ON public.b2b_collections USING btree (organization_id)` |


## Policies (RLS)

### `b2b_collections_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_org_owner_or_admin(organization_id)` |
| WITH CHECK |  |

### `b2b_collections_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_org_owner_or_admin(organization_id)` |

### `b2b_collections_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `user_is_org_member(organization_id)` |
| WITH CHECK |  |

### `b2b_collections_update`

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
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
