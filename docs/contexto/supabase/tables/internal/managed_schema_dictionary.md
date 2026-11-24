# internal.managed_schema_dictionary

> Dicionário independente dos schemas e tabelas gerenciados pelo Supabase e extensões instaladas. Documenta finalidade e relações observáveis sem alterar os comentários nem a estrutura dos objetos gerenciados.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 0 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `schema_name` | `text` | não |  |  | Nome do schema documentado. |
| 2 | `object_type` | `text` | não |  |  | Tipo do objeto catalogado: schema ou table. |
| 3 | `object_name` | `text` | não |  |  | Nome do schema ou da tabela dentro do schema. |
| 4 | `service_name` | `text` | não |  |  | Serviço Supabase ou extensão responsável pelo namespace. |
| 5 | `description` | `text` | não |  |  | Descrição semântica baseada nos metadados observados; não substitui documentação oficial nem autoriza escrita direta em objetos gerenciados. |
| 6 | `partition_of` | `text` | sim |  |  | Relação textual com a tabela particionada pai, quando aplicável. |
| 7 | `reviewed_at` | `timestamp with time zone` | não | `now()` |  | Momento em que a descrição foi incluída/revisada no dicionário. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| managed_schema_dictionary_object_type_check | CHECK | `CHECK (object_type = ANY (ARRAY['schema'::text, 'table'::text]))` |  |  | sim |
| managed_schema_dictionary_pkey | PRIMARY KEY | `PRIMARY KEY (schema_name, object_type, object_name)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| managed_schema_dictionary_pkey | btree | schema_name, object_type, object_name | sim | sim |  | `CREATE UNIQUE INDEX managed_schema_dictionary_pkey ON internal.managed_schema_dictionary USING btree (schema_name, object_type, object_name)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

_nenhum_


## Grants

_nenhum_
