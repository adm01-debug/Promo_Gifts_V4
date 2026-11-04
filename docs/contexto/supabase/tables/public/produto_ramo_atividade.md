# public.produto_ramo_atividade

> Relacionamento N:N entre produtos e ramos de atividade

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
| usada por views | public.vw_super_filtro_health |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `produto_id` | `uuid` | não |  |  |  |
| 3 | `ramo_atividade_filho_id` | `uuid` | não |  |  |  |
| 4 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| produto_ramo_atividade_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| produto_ramo_atividade_produto_id_fkey | FOREIGN KEY | `FOREIGN KEY (produto_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| produto_ramo_atividade_produto_id_ramo_atividade_filho_id_key | UNIQUE | `UNIQUE (produto_id, ramo_atividade_filho_id)` |  |  | sim |
| produto_ramo_atividade_ramo_atividade_filho_id_fkey | FOREIGN KEY | `FOREIGN KEY (ramo_atividade_filho_id) REFERENCES ramo_atividade_filho(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_produto_ramo_atividade_filho | btree | ramo_atividade_filho_id | não | sim |  | `CREATE INDEX idx_produto_ramo_atividade_filho ON public.produto_ramo_atividade USING btree (ramo_atividade_filho_id)` |
| idx_produto_ramo_atividade_produto | btree | produto_id | não | sim |  | `CREATE INDEX idx_produto_ramo_atividade_produto ON public.produto_ramo_atividade USING btree (produto_id)` |
| produto_ramo_atividade_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX produto_ramo_atividade_pkey ON public.produto_ramo_atividade USING btree (id)` |
| produto_ramo_atividade_produto_id_ramo_atividade_filho_id_key | btree | produto_id, ramo_atividade_filho_id | sim | sim |  | `CREATE UNIQUE INDEX produto_ramo_atividade_produto_id_ramo_atividade_filho_id_key ON public.produto_ramo_atividade USING btree (produto_id, ramo_atividade_filho_id)` |


## Policies (RLS)

### `pra_delete_admin`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `pra_insert_admin`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `pra_insert_service_role`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | service_role |
| USING |  |
| WITH CHECK | `true` |

### `pra_update_admin`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `produto_ramo_atividade_public_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon, authenticated |
| USING | `true` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | SELECT |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
