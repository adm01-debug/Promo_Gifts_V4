# public.attribute_definitions

> Definições de atributos de produtos: nome, tipo de dado, unidade, valores possíveis, validação e comportamento de exibição ou filtragem.

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
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  | Identificador UUID da definição de atributo. |
| 2 | `organization_id` | `uuid` | não |  |  | Organização à qual pertence a definição de atributo. |
| 3 | `group_id` | `uuid` | sim |  |  | Grupo ao qual pertence a definição, quando houver. |
| 4 | `name` | `character varying(100)` | não |  |  | Nome interno do atributo. |
| 5 | `slug` | `character varying(100)` | não |  |  | Slug estável do atributo para identificação em código ou integrações. |
| 6 | `display_name` | `character varying(150)` | não |  |  | Rótulo do atributo apresentado na interface. |
| 7 | `description` | `text` | sim |  |  | Descrição do significado ou uso do atributo. |
| 8 | `data_type` | `character varying(20)` | sim | `'text'::character varying` |  | Tipo do valor do atributo: text, number, boolean, select ou multiselect. |
| 9 | `unit` | `character varying(30)` | sim |  |  | Unidade de medida associada ao atributo, quando aplicável. |
| 10 | `default_value` | `text` | sim |  |  | Valor padrão do atributo, quando configurado. |
| 11 | `possible_values` | `jsonb` | sim |  |  | Valores permitidos para atributos do tipo select ou multiselect, armazenados em JSONB. |
| 12 | `validation_rules` | `jsonb` | sim |  |  | Regras adicionais de validação do valor, armazenadas em JSONB. |
| 13 | `is_required` | `boolean` | sim | `false` |  | Indica se o atributo é obrigatório. |
| 14 | `is_filterable` | `boolean` | sim | `true` |  | Indica se o atributo pode ser usado para filtrar produtos. |
| 15 | `is_comparable` | `boolean` | sim | `true` |  | Indica se o atributo pode ser usado na comparação de produtos. |
| 16 | `is_visible` | `boolean` | sim | `true` |  | Indica se o atributo deve ser exibido na interface. |
| 17 | `is_searchable` | `boolean` | sim | `false` |  | Indica se o atributo pode ser considerado na busca. |
| 18 | `display_order` | `integer` | sim | `0` |  | Ordem de exibição do atributo. |
| 19 | `is_active` | `boolean` | sim | `true` |  | Indica se a definição do atributo está ativa. |
| 20 | `created_at` | `timestamp with time zone` | sim | `now()` |  | Data e hora de criação da definição do atributo. |
| 21 | `updated_at` | `timestamp with time zone` | sim | `now()` |  | Data e hora da última atualização da definição do atributo. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| attribute_definitions_data_type_check | CHECK | `CHECK (data_type::text = ANY (ARRAY['text'::character varying, 'number'::character varying, 'boolean'::character varying, 'select'::character varying, 'multiselect'::character varying]::text[]))` |  |  | sim |
| attribute_definitions_group_id_fkey | FOREIGN KEY | `FOREIGN KEY (group_id) REFERENCES attribute_groups(id)` | NO ACTION | NO ACTION | sim |
| attribute_definitions_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| attribute_definitions_organization_id_slug_key | UNIQUE | `UNIQUE (organization_id, slug)` |  |  | sim |
| attribute_definitions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| attribute_definitions_organization_id_slug_key | btree | organization_id, slug | sim | sim |  | `CREATE UNIQUE INDEX attribute_definitions_organization_id_slug_key ON public.attribute_definitions USING btree (organization_id, slug)` |
| attribute_definitions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX attribute_definitions_pkey ON public.attribute_definitions USING btree (id)` |
| idx_attribute_definitions_group_id | btree | group_id | não | sim |  | `CREATE INDEX idx_attribute_definitions_group_id ON public.attribute_definitions USING btree (group_id)` |


## Policies (RLS)

### `attribute_definitions_delete_policy`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(organization_id IN ( SELECT attribute_definitions.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |
| WITH CHECK |  |

### `attribute_definitions_insert_policy`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(organization_id IN ( SELECT attribute_definitions.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |

### `attribute_definitions_select_policy`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(organization_id IN ( SELECT attribute_definitions.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |
| WITH CHECK |  |

### `attribute_definitions_update_policy`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(organization_id IN ( SELECT attribute_definitions.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |
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
