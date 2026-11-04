# public.print_area_techniques

> FONTE UNICA de verdade para áreas de gravação por produto. Dados da técnica (nome, código, max_cores, custo_setup) vêm via JOIN com tabela_preco_gravacao_oficial usando tabela_preco_id. Campos como technique_name e setup_cost NÃO são armazenados aqui - são resolvidos via FK.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 6 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.v_audit_paradoxos_gravacao, public.v_gravacao_cobertura, public.v_print_area_techniques_public, public.v_super_filtro_options |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 3 | `tabela_preco_id` | `uuid` | não |  |  | FK para tabela_preco_gravacao_oficial. Define preço e config da técnica. |
| 4 | `max_width` | `numeric(6,2)` | não |  |  | Largura máxima da área de gravação (cm) para esta técnica neste produto |
| 5 | `max_height` | `numeric(6,2)` | não |  |  | Altura máxima da área de gravação (cm) para esta técnica neste produto |
| 6 | `is_curved` | `boolean` | não | `false` |  |  |
| 7 | `shape` | `text` | não | `'rectangle'::text` |  |  |
| 8 | `technique_order` | `integer` | não | `1` |  | Ordem de exibição da técnica dentro do produto (1-10) |
| 9 | `is_active` | `boolean` | não | `true` |  |  |
| 14 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 15 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 18 | `product_id` | `uuid` | não |  |  | FK para products. Identifica o produto. |
| 19 | `location_code` | `text` | não |  |  | Código do local de gravação: LADO-A, LADO-B, CIRCULAR |
| 20 | `location_name` | `text` | sim |  |  | Nome amigável do local: Lado A, Lado B, Circular |
| 21 | `location_order` | `integer` | sim |  |  | Ordem de exibição do local: 1=LADO-A, 2=LADO-B, 3=CIRCULAR |
| 22 | `notes` | `text` | sim |  |  | Observações sobre esta área de gravação |
| 23 | `unit_cost` | `numeric(10,4)` | sim |  |  | Custo unitário de gravação sobrescrito para este produto (se diferir da tabela de preço padrão) |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| fk_pat_product_id | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id)` | NO ACTION | NO ACTION | sim |
| print_area_techniques_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| print_area_techniques_tabela_preco_id_fkey | FOREIGN KEY | `FOREIGN KEY (tabela_preco_id) REFERENCES tabela_preco_gravacao_oficial(id)` | NO ACTION | NO ACTION | sim |
| uq_pat_product_location_tecnica | UNIQUE | `UNIQUE (product_id, location_code, tabela_preco_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pat_location_code | btree | location_code | não | sim |  | `CREATE INDEX idx_pat_location_code ON public.print_area_techniques USING btree (location_code)` |
| idx_pat_product_active | btree | product_id, is_active | não | sim |  | `CREATE INDEX idx_pat_product_active ON public.print_area_techniques USING btree (product_id, is_active)` |
| idx_pat_product_location_active | btree | product_id, location_code, is_active | não | sim | `(is_active = true)` | `CREATE INDEX idx_pat_product_location_active ON public.print_area_techniques USING btree (product_id, location_code, is_active) WHERE (is_active = true)` |
| idx_pat_tabela | btree | tabela_preco_id | não | sim |  | `CREATE INDEX idx_pat_tabela ON public.print_area_techniques USING btree (tabela_preco_id)` |
| print_area_techniques_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX print_area_techniques_pkey ON public.print_area_techniques USING btree (id)` |
| uq_pat_product_location_tecnica | btree | product_id, location_code, tabela_preco_id | sim | sim |  | `CREATE UNIQUE INDEX uq_pat_product_location_tecnica ON public.print_area_techniques USING btree (product_id, location_code, tabela_preco_id)` |


## Policies (RLS)

### `pat_all_service`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK | `true` |

### `pat_select_anon`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon |
| USING | `(is_active = true)` |
| WITH CHECK |  |

### `pat_select_auth`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |

### `print_area_techniques_oa_del`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = print_area_techniques.product_id) AND is_org_owner_or_admin(p.organization_id))))` |
| WITH CHECK |  |

### `print_area_techniques_oa_ins`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = print_area_techniques.product_id) AND is_org_owner_or_admin(p.organization_id))))` |

### `print_area_techniques_oa_upd`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = print_area_techniques.product_id) AND is_org_owner_or_admin(p.organization_id))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = print_area_techniques.product_id) AND is_org_owner_or_admin(p.organization_id))))` |


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
