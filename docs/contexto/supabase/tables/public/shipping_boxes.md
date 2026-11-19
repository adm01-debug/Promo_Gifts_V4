# public.shipping_boxes

> Caixas de transporte padrão da empresa. O motor de frete (src/lib/freight) empacota as peças nestas caixas; a caixa master do fornecedor é ignorada para frete.

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
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  | Identificador da caixa. |
| 2 | `code` | `text` | não |  |  | Código curto como a expedição chama a caixa (P, M, G, GG). Único entre as caixas não excluídas. |
| 3 | `name` | `text` | não |  |  | Nome da caixa para exibição no admin. |
| 4 | `outer_height_cm` | `numeric(8,2)` | não |  |  | Altura EXTERNA em cm. É a medida que o admin digita e a que a transportadora cuba. |
| 5 | `outer_width_cm` | `numeric(8,2)` | não |  |  | Largura EXTERNA em cm. |
| 6 | `outer_length_cm` | `numeric(8,2)` | não |  |  | Comprimento EXTERNO em cm. |
| 7 | `wall_thickness_mm` | `integer` | não | `3` |  | Espessura de UMA parede de papelão, em mm. Padrão 3. A medida interna desconta duas por eixo. |
| 8 | `inner_height_cm` | `numeric(8,2)` | sim | `(outer_height_cm - (((wall_thickness_mm * 2))::numeric / 10.0))` | s | Altura INTERNA em cm, gerada: externa − 2 × espessura. Somente leitura — é a medida que recebe carga. |
| 9 | `inner_width_cm` | `numeric(8,2)` | sim | `(outer_width_cm - (((wall_thickness_mm * 2))::numeric / 10.0))` | s | Largura INTERNA em cm, gerada: externa − 2 × espessura. Somente leitura. |
| 10 | `inner_length_cm` | `numeric(8,2)` | sim | `(outer_length_cm - (((wall_thickness_mm * 2))::numeric / 10.0))` | s | Comprimento INTERNO em cm, gerado: externo − 2 × espessura. Somente leitura. |
| 11 | `empty_weight_g` | `integer` | não | `0` |  | Peso da caixa vazia em gramas. Conta contra max_weight_g. Zero por decisão do dono nas quatro caixas atuais. |
| 12 | `max_weight_g` | `integer` | não |  |  | Peso máximo TOTAL do volume em gramas (caixa + carga). A carga útil é max_weight_g − empty_weight_g. |
| 13 | `fill_factor` | `numeric(3,2)` | não | `0.90` |  | Fração do volume interno considerada aproveitável (0,50 a 1,00). Padrão 0,90: nenhum empacotamento real preenche 100%. |
| 14 | `is_active` | `boolean` | não | `true` |  | Caixa disponível para o cálculo. Falso tira a caixa do plano sem apagar o histórico. |
| 15 | `sort_order` | `integer` | não | `0` |  | Ordem de exibição no admin. Não afeta o cálculo, que ordena por volume interno. |
| 16 | `created_at` | `timestamp with time zone` | não | `now()` |  | Criação do registro. |
| 17 | `updated_at` | `timestamp with time zone` | não | `now()` |  | Última alteração, mantida pelo trigger set_shipping_boxes_updated_at. |
| 18 | `deleted_at` | `timestamp with time zone` | sim |  |  | Exclusão lógica. Nulo = caixa viva. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| shipping_boxes_check | CHECK | `CHECK (max_weight_g > empty_weight_g)` |  |  | sim |
| shipping_boxes_empty_weight_g_check | CHECK | `CHECK (empty_weight_g >= 0)` |  |  | sim |
| shipping_boxes_fill_factor_check | CHECK | `CHECK (fill_factor >= 0.50 AND fill_factor <= 1.00)` |  |  | sim |
| shipping_boxes_inner_height_positive | CHECK | `CHECK (inner_height_cm > 0::numeric)` |  |  | sim |
| shipping_boxes_inner_length_positive | CHECK | `CHECK (inner_length_cm > 0::numeric)` |  |  | sim |
| shipping_boxes_inner_width_positive | CHECK | `CHECK (inner_width_cm > 0::numeric)` |  |  | sim |
| shipping_boxes_outer_height_cm_check | CHECK | `CHECK (outer_height_cm > 0::numeric)` |  |  | sim |
| shipping_boxes_outer_length_cm_check | CHECK | `CHECK (outer_length_cm > 0::numeric)` |  |  | sim |
| shipping_boxes_outer_width_cm_check | CHECK | `CHECK (outer_width_cm > 0::numeric)` |  |  | sim |
| shipping_boxes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| shipping_boxes_wall_thickness_mm_check | CHECK | `CHECK (wall_thickness_mm >= 1 AND wall_thickness_mm <= 20)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| shipping_boxes_active_sort_idx | btree | sort_order, code | não | sim | `((deleted_at IS NULL) AND (is_active = true))` | `CREATE INDEX shipping_boxes_active_sort_idx ON public.shipping_boxes USING btree (sort_order, code) WHERE ((deleted_at IS NULL) AND (is_active = true))` |
| shipping_boxes_code_unique_active | btree | code | sim | sim | `(deleted_at IS NULL)` | `CREATE UNIQUE INDEX shipping_boxes_code_unique_active ON public.shipping_boxes USING btree (code) WHERE (deleted_at IS NULL)` |
| shipping_boxes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX shipping_boxes_pkey ON public.shipping_boxes USING btree (id)` |


## Policies (RLS)

### `shipping_boxes_delete_admin`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin()` |
| WITH CHECK |  |

### `shipping_boxes_insert_admin`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_admin()` |

### `shipping_boxes_select_authenticated`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((deleted_at IS NULL) OR is_admin())` |
| WITH CHECK |  |

### `shipping_boxes_update_admin`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin()` |
| WITH CHECK | `is_admin()` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_shipping_boxes_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | REFERENCES, TRIGGER |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
