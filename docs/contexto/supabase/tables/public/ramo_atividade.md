# public.ramo_atividade

> Categorias pai de ramos de atividade/nichos de mercado

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
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `nome` | `character varying(100)` | não |  |  |  |
| 3 | `slug` | `character varying(100)` | não |  |  |  |
| 4 | `descricao` | `text` | sim |  |  |  |
| 5 | `icone` | `character varying(50)` | sim | `'building'::character varying` |  |  |
| 6 | `cor` | `character varying(7)` | sim | `'#6366f1'::character varying` |  |  |
| 7 | `ativo` | `boolean` | sim | `true` |  |  |
| 8 | `ordem` | `integer` | sim | `0` |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ramo_atividade_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| ramo_atividade_slug_key | UNIQUE | `UNIQUE (slug)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.ramo_atividade_filho | ramo_atividade_filho_ramo_atividade_id_fkey | ramo_atividade_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_ramo_atividade_ordem | btree | ordem | não | sim |  | `CREATE INDEX idx_ramo_atividade_ordem ON public.ramo_atividade USING btree (ordem)` |
| ramo_atividade_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ramo_atividade_pkey ON public.ramo_atividade USING btree (id)` |
| ramo_atividade_slug_key | btree | slug | sim | sim |  | `CREATE UNIQUE INDEX ramo_atividade_slug_key ON public.ramo_atividade USING btree (slug)` |


## Policies (RLS)

### `ra_admin_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `ra_admin_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `ra_admin_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `ramo_atividade_public_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon, authenticated |
| USING | `true` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_ramo_atividade_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | SELECT |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
