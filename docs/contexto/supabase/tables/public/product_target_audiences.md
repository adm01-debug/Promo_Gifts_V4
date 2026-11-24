# public.product_target_audiences

> Vínculos entre produtos e públicos-alvo. A origem registra se o vínculo foi herdado da categoria ou adicionado manualmente.

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
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  | Identificador UUID do vínculo entre produto e público-alvo. |
| 2 | `product_id` | `uuid` | não |  |  | Produto associado ao público-alvo. |
| 3 | `target_audience_id` | `uuid` | não |  |  | Público-alvo associado ao produto. |
| 4 | `source` | `character varying(20)` | sim | `'category'::character varying` |  | Origem do vínculo: category (herdado da categoria) ou manual. |
| 5 | `category_id` | `uuid` | sim |  |  | Categoria associada à origem do vínculo, quando informada. |
| 6 | `is_featured` | `boolean` | sim | `false` |  | Indica se o produto deve ser destacado para este público-alvo. |
| 7 | `relevance_score` | `integer` | sim | `5` |  | Relevância do vínculo, em uma escala de 1 a 10. |
| 8 | `is_active` | `boolean` | não | `true` |  | Indica se o vínculo está ativo. |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  | Data e hora de criação do vínculo. |
| 10 | `updated_at` | `timestamp with time zone` | sim | `now()` |  | Data e hora da última atualização do vínculo. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_target_audiences_category_id_fkey | FOREIGN KEY | `FOREIGN KEY (category_id) REFERENCES categories(id)` | NO ACTION | NO ACTION | sim |
| product_target_audiences_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_target_audiences_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_target_audiences_relevance_score_check | CHECK | `CHECK (relevance_score >= 1 AND relevance_score <= 10)` |  |  | sim |
| product_target_audiences_source_check | CHECK | `CHECK (source::text = ANY (ARRAY['category'::character varying, 'manual'::character varying]::text[]))` |  |  | sim |
| product_target_audiences_target_audience_id_fkey | FOREIGN KEY | `FOREIGN KEY (target_audience_id) REFERENCES target_audiences(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| uq_product_target_aud | UNIQUE | `UNIQUE (product_id, target_audience_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_product_target_audiences_category_id | btree | category_id | não | sim |  | `CREATE INDEX idx_product_target_audiences_category_id ON public.product_target_audiences USING btree (category_id)` |
| idx_product_target_audiences_target_audience_id | btree | target_audience_id | não | sim |  | `CREATE INDEX idx_product_target_audiences_target_audience_id ON public.product_target_audiences USING btree (target_audience_id)` |
| product_target_audiences_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_target_audiences_pkey ON public.product_target_audiences USING btree (id)` |
| uq_product_target_aud | btree | product_id, target_audience_id | sim | sim |  | `CREATE UNIQUE INDEX uq_product_target_aud ON public.product_target_audiences USING btree (product_id, target_audience_id)` |


## Policies (RLS)

### `auth_read_product_target_audiences`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |

### `pta_oa_del`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_target_audiences.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))))` |
| WITH CHECK |  |

### `pta_oa_ins`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_target_audiences.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))))` |

### `pta_oa_upd`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_target_audiences.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_target_audiences.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |
| trg_prod_tgt_updated | BEFORE | UPDATE | ROW | enabled | public.fn_update_target_aud_timestamp |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
