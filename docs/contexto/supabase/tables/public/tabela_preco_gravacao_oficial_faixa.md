# public.tabela_preco_gravacao_oficial_faixa

> Faixas de preco por (qty + dimensional). Cada faixa tem qty_min/qty_max e opcionalmente largura/altura min/max. Trigger trg_check_preco_minimo previne preco abaixo do minimo da tabela-mae. Indice idx_faixa_v11_dim otimizado para a funcao de cotacao.

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
| usada por views | public.v_audit_paradoxos_gravacao |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `tabela_preco_gravacao_id` | `uuid` | não |  |  | FK para tabela_preco_gravacao_oficial. Cada faixa pertence a exatamente 1 tabela. JOIN otimizado em idx_faixa_v11_dim. |
| 3 | `quantidade_minima` | `integer` | não |  |  |  |
| 4 | `quantidade_maxima` | `integer` | sim |  |  | NULL = sem teto (faixa aberta). Padrao desde FIX-01 (substituiu sentinela 999999). |
| 5 | `preco_unitario` | `numeric(10,4)` | não |  |  |  |
| 6 | `prazo_dias` | `integer` | sim |  |  |  |
| 7 | `ordem` | `integer` | sim | `0` |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 10 | `largura_min` | `numeric(8,2)` | sim | `NULL::numeric` |  |  |
| 11 | `largura_max` | `numeric(8,2)` | sim | `NULL::numeric` |  |  |
| 12 | `altura_min` | `numeric(8,2)` | sim | `NULL::numeric` |  |  |
| 13 | `altura_max` | `numeric(8,2)` | sim | `NULL::numeric` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_faixa_altura_coerente | CHECK | `CHECK (altura_min IS NULL OR altura_max IS NULL OR altura_min > 0::numeric AND altura_max >= altura_min)` |  |  | sim |
| chk_faixa_largura_coerente | CHECK | `CHECK (largura_min IS NULL OR largura_max IS NULL OR largura_min > 0::numeric AND largura_max >= largura_min)` |  |  | sim |
| chk_faixa_preco_positivo | CHECK | `CHECK (preco_unitario > 0::numeric)` |  |  | sim |
| chk_faixa_qty_positiva | CHECK | `CHECK (quantidade_minima > 0 AND (quantidade_maxima IS NULL OR quantidade_maxima >= quantidade_minima))` |  |  | sim |
| tabela_preco_gravacao_faixa_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| tabela_preco_gravacao_faixa_tabela_preco_gravacao_id_fkey | FOREIGN KEY | `FOREIGN KEY (tabela_preco_gravacao_id) REFERENCES tabela_preco_gravacao_oficial(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| uk_faixa_tabela_qtd_dimensional | UNIQUE | `UNIQUE (tabela_preco_gravacao_id, quantidade_minima, largura_min, altura_min)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_faixa_dimensional | btree | tabela_preco_gravacao_id, largura_min, largura_max, altura_min, altura_max, quantidade_minima | não | sim | `(largura_min IS NOT NULL)` | `CREATE INDEX idx_faixa_dimensional ON public.tabela_preco_gravacao_oficial_faixa USING btree (tabela_preco_gravacao_id, largura_min, largura_max, altura_min, altura_max, quantidade_minima) WHERE (largura_min IS NOT NULL)` |
| idx_faixa_preco_qtd | btree | quantidade_minima | não | sim |  | `CREATE INDEX idx_faixa_preco_qtd ON public.tabela_preco_gravacao_oficial_faixa USING btree (quantidade_minima)` |
| idx_faixa_v11_dim | btree | tabela_preco_gravacao_id, quantidade_minima, quantidade_maxima, largura_min, largura_max, altura_min, altura_max | não | sim |  | `CREATE INDEX idx_faixa_v11_dim ON public.tabela_preco_gravacao_oficial_faixa USING btree (tabela_preco_gravacao_id, quantidade_minima, quantidade_maxima, largura_min, largura_max, altura_min, altura_max)` |
| idx_faixa_v11_qty_max | btree | tabela_preco_gravacao_id, quantidade_maxima | não | sim | `(quantidade_maxima IS NOT NULL)` | `CREATE INDEX idx_faixa_v11_qty_max ON public.tabela_preco_gravacao_oficial_faixa USING btree (tabela_preco_gravacao_id, quantidade_maxima) WHERE (quantidade_maxima IS NOT NULL)` |
| idx_tabela_preco_faixa_quantidade | btree | quantidade_minima, quantidade_maxima | não | sim |  | `CREATE INDEX idx_tabela_preco_faixa_quantidade ON public.tabela_preco_gravacao_oficial_faixa USING btree (quantidade_minima, quantidade_maxima)` |
| idx_tabela_preco_faixa_tabela | btree | tabela_preco_gravacao_id | não | sim |  | `CREATE INDEX idx_tabela_preco_faixa_tabela ON public.tabela_preco_gravacao_oficial_faixa USING btree (tabela_preco_gravacao_id)` |
| idx_tpgof_tabela_qty | btree | tabela_preco_gravacao_id, quantidade_minima, quantidade_maxima, preco_unitario, prazo_dias, largura_min, largura_max, altura_min, altura_max | não | sim |  | `CREATE INDEX idx_tpgof_tabela_qty ON public.tabela_preco_gravacao_oficial_faixa USING btree (tabela_preco_gravacao_id, quantidade_minima, quantidade_maxima) INCLUDE (preco_unitario, prazo_dias, largura_min, largura_max, altura_min, altura_max)` |
| tabela_preco_gravacao_faixa_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX tabela_preco_gravacao_faixa_pkey ON public.tabela_preco_gravacao_oficial_faixa USING btree (id)` |
| uk_faixa_tabela_qtd_dimensional | btree | tabela_preco_gravacao_id, quantidade_minima, largura_min, altura_min | sim | sim |  | `CREATE UNIQUE INDEX uk_faixa_tabela_qtd_dimensional ON public.tabela_preco_gravacao_oficial_faixa USING btree (tabela_preco_gravacao_id, quantidade_minima, largura_min, altura_min)` |


## Policies (RLS)

### `tabela_preco_gravacao_oficial_faixa_public_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon, authenticated |
| USING | `true` |
| WITH CHECK |  |

### `tpgof_admin_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `tpgof_admin_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `tpgof_dev_delete`

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
| trg_audit_gravacao_faixa | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.fn_audit_gravacao_changes |
| trg_check_preco_minimo | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_check_preco_minimo_faixa |


## Grants

| role | privilégios |
|---|---|
| anon | SELECT |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
