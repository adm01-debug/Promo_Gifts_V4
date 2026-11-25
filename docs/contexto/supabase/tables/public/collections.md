# public.collections

> Coleções de produtos criadas por usuários, com opções de compartilhamento e associação a clientes. Esta tabela é distinta de public.b2b_collections.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 5 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  | Identificador UUID da coleção. |
| 2 | `user_id` | `uuid` | não |  |  | Usuário proprietário da coleção. |
| 3 | `name` | `text` | não |  |  | Nome da coleção. |
| 4 | `description` | `text` | sim |  |  | Descrição da coleção. |
| 5 | `is_featured` | `boolean` | não | `false` |  | Indica se a coleção está marcada como destaque. |
| 6 | `icon_color` | `text` | sim | `'#3b82f6'::text` |  | Cor do ícone da coleção, quando configurada. |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  | Data e hora de criação da coleção. |
| 8 | `updated_at` | `timestamp with time zone` | não | `now()` |  | Data e hora da última atualização da coleção. |
| 9 | `icon` | `text` | sim | `'📁'::text` |  | Ícone associado à coleção. |
| 10 | `client_id` | `text` | sim |  |  | Identificador textual do cliente associado à coleção, quando informado. |
| 11 | `client_name` | `text` | sim |  |  | Nome do cliente associado à coleção, quando informado. |
| 12 | `share_token` | `text` | sim |  |  | Token usado para localizar ou compartilhar a coleção. |
| 13 | `share_expires_at` | `timestamp with time zone` | sim |  |  | Data e hora de expiração do compartilhamento, quando definida. |
| 14 | `is_public` | `boolean` | não | `false` |  | Indica se a coleção está configurada como pública. |
| 15 | `is_deleted` | `boolean` | não | `false` |  | Indica se a coleção foi marcada como excluída logicamente. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| collections_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.collection_items | collection_items_collection_id_fkey | collection_id | CASCADE |
| public.collection_products | collection_products_collection_id_fkey | collection_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| collections_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX collections_pkey ON public.collections USING btree (id)` |
| idx_collections_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_collections_user_id ON public.collections USING btree (user_id)` |


## Policies (RLS)

### `collections_anon_shared_view`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon |
| USING | `((is_public = true) AND (share_token IS NOT NULL) AND ((share_expires_at IS NULL) OR (share_expires_at > now())))` |
| WITH CHECK |  |

### `collections_own_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `collections_own_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `collections_own_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_supervisor_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |

### `collections_own_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
