# public.category_target_audiences

> Vínculos entre categorias e públicos-alvo, com prioridade e relevância configuráveis.

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
| usada por views | public.vw_category_target_audiences |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  | Identificador UUID do vínculo entre categoria e público-alvo. |
| 2 | `category_id` | `uuid` | não |  |  | Categoria associada ao público-alvo. |
| 3 | `target_audience_id` | `uuid` | não |  |  | Público-alvo associado à categoria. |
| 4 | `is_primary` | `boolean` | sim | `false` |  | Indica se este é o público-alvo principal da categoria. |
| 5 | `relevance_score` | `integer` | sim | `5` |  | Relevância do vínculo, em uma escala de 1 a 10. |
| 6 | `display_order` | `integer` | sim | `0` |  | Ordem de exibição do público-alvo para a categoria. |
| 7 | `is_active` | `boolean` | não | `true` |  | Indica se o vínculo está ativo. |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  | Data e hora de criação do vínculo. |
| 9 | `updated_at` | `timestamp with time zone` | sim | `now()` |  | Data e hora da última atualização do vínculo. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| category_target_audiences_category_id_fkey | FOREIGN KEY | `FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| category_target_audiences_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| category_target_audiences_relevance_score_check | CHECK | `CHECK (relevance_score >= 1 AND relevance_score <= 10)` |  |  | sim |
| category_target_audiences_target_audience_id_fkey | FOREIGN KEY | `FOREIGN KEY (target_audience_id) REFERENCES target_audiences(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| uq_category_target_aud | UNIQUE | `UNIQUE (category_id, target_audience_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| category_target_audiences_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX category_target_audiences_pkey ON public.category_target_audiences USING btree (id)` |
| idx_category_target_audiences_target_audience_id | btree | target_audience_id | não | sim |  | `CREATE INDEX idx_category_target_audiences_target_audience_id ON public.category_target_audiences USING btree (target_audience_id)` |
| uq_category_target_aud | btree | category_id, target_audience_id | sim | sim |  | `CREATE UNIQUE INDEX uq_category_target_aud ON public.category_target_audiences USING btree (category_id, target_audience_id)` |


## Policies (RLS)

### `auth_read_category_target_audiences`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |

### `cat_admin_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `cat_admin_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `cat_dev_delete`

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
| trg_cat_tgt_updated | BEFORE | UPDATE | ROW | enabled | public.fn_update_target_aud_timestamp |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
