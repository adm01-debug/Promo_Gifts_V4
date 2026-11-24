# public.attribute_groups

> Grupos usados para organizar definições de atributos de produtos dentro de uma organização.

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
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  | Identificador UUID do grupo de atributos. |
| 2 | `organization_id` | `uuid` | não |  |  | Organização à qual pertence o grupo de atributos. |
| 3 | `name` | `character varying(100)` | não |  |  | Nome de exibição do grupo de atributos. |
| 4 | `slug` | `character varying(100)` | não |  |  | Slug do grupo de atributos para identificação estável. |
| 5 | `description` | `text` | sim |  |  | Descrição do grupo de atributos. |
| 6 | `icon` | `character varying(50)` | sim |  |  | Identificador do ícone usado para representar o grupo na interface. |
| 7 | `display_order` | `integer` | sim | `0` |  | Ordem de exibição do grupo. |
| 8 | `is_active` | `boolean` | sim | `true` |  | Indica se o grupo está ativo. |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  | Data e hora de criação do grupo. |
| 10 | `updated_at` | `timestamp with time zone` | sim | `now()` |  | Data e hora da última atualização do grupo. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| attribute_groups_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| attribute_groups_organization_id_slug_key | UNIQUE | `UNIQUE (organization_id, slug)` |  |  | sim |
| attribute_groups_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.attribute_definitions | attribute_definitions_group_id_fkey | group_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| attribute_groups_organization_id_slug_key | btree | organization_id, slug | sim | sim |  | `CREATE UNIQUE INDEX attribute_groups_organization_id_slug_key ON public.attribute_groups USING btree (organization_id, slug)` |
| attribute_groups_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX attribute_groups_pkey ON public.attribute_groups USING btree (id)` |


## Policies (RLS)

### `attribute_groups_delete_policy`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(organization_id IN ( SELECT attribute_groups.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |
| WITH CHECK |  |

### `attribute_groups_insert_policy`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(organization_id IN ( SELECT attribute_groups.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |

### `attribute_groups_select_policy`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(organization_id IN ( SELECT attribute_groups.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |
| WITH CHECK |  |

### `attribute_groups_update_policy`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(organization_id IN ( SELECT attribute_groups.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| handle_updated_at | BEFORE | UPDATE | ROW | enabled | extensions.moddatetime |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
