# public.tecnicas_gravacao

> Tabela mestre de técnicas de gravação/personalização. PK = codigo string (ex: SERIGRAFIA, LASER).

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
| usada por views | public.v_audit_cobertura_tecnicas |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `codigo` | `character varying(30)` | não |  |  |  |
| 2 | `nome` | `character varying(100)` | não |  |  |  |
| 3 | `slug` | `character varying(100)` | não |  |  |  |
| 6 | `ativo` | `boolean` | sim | `true` |  |  |
| 7 | `ordem_exibicao` | `integer` | sim | `99` |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 10 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| tecnicas_gravacao_pkey | PRIMARY KEY | `PRIMARY KEY (codigo)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.personalization_technique_mappings | personalization_technique_mappings_tecnica_gravacao_codigo_fkey | tecnica_gravacao_codigo | RESTRICT |
| public.tabela_preco_gravacao_oficial | fk_oficial_grupo_tecnica | grupo_tecnica | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| tecnicas_gravacao_pkey | btree | codigo | sim | sim |  | `CREATE UNIQUE INDEX tecnicas_gravacao_pkey ON public.tecnicas_gravacao USING btree (codigo)` |
| uq_tecnicas_gravacao_id | btree | id | sim | sim |  | `CREATE UNIQUE INDEX uq_tecnicas_gravacao_id ON public.tecnicas_gravacao USING btree (id)` |


## Policies (RLS)

### `tecnicas_gravacao_public_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon, authenticated |
| USING | `true` |
| WITH CHECK |  |

### `tg_admin_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `tg_admin_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `tg_dev_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | SELECT |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
