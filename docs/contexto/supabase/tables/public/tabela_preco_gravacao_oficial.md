# public.tabela_preco_gravacao_oficial

> Tabela mestre de precos de gravacao/personalizacao. Cada linha = uma "tabela de precos" para uma combinacao tecnica+categoria+formato. Marcas/precos relacionados em tabela_preco_gravacao_oficial_faixa. Modelo evoluido v2 (pos correcoes 2026-04). Use fn_simular_combo_gravacao_v11 para cotar.

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
| usada por views | public.v_audit_cobertura_tecnicas, public.v_audit_paradoxos_gravacao, public.v_gravacao_cobertura, public.v_super_filtro_options, public.v_tabela_preco_gravacao_oficial_public |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 4 | `codigo_tabela` | `character varying(50)` | não |  |  |  |
| 5 | `nome` | `character varying(150)` | sim |  |  |  |
| 6 | `descricao` | `text` | sim |  |  |  |
| 9 | `cobra_por_cor` | `boolean` | sim | `false` |  | TRUE quando cada cor adicional cobra extra. Combinar com multiplicador_cor no JSONB. Substituiu campos legados desconto_segunda_cor/desconto_terceira_cor (DEPRECATED desde FIX-03). |
| 12 | `max_cores` | `integer` | sim | `4` |  |  |
| 16 | `desconto_segunda_cor` | `numeric(5,2)` | sim |  |  | DEPRECATED 2026-04-25 (FIX-03 aplicado). Usar opcoes_modificadores->multiplicador_cor->>2. Drop previsto: 2026-07-25 após confirmação de zero usos. |
| 17 | `desconto_terceira_cor` | `numeric(5,2)` | sim |  |  | DEPRECATED 2026-04-25 (FIX-03 aplicado). Usar opcoes_modificadores->multiplicador_cor->>3. Drop previsto: 2026-07-25 após confirmação de zero usos. |
| 19 | `custo_setup` | `numeric(10,2)` | sim | `0` |  |  |
| 20 | `custo_setup_por_cor` | `boolean` | sim | `false` |  | TRUE = setup eh multiplicado pelo numero de cores (1 cliche/tela por cor). FALSE = setup unico independente do numero de cores. Ver recomendacao_tecnica no JSONB para casos com decisao comercial pendente. |
| 22 | `custo_manuseio` | `numeric(10,2)` | sim | `0` |  |  |
| 29 | `ativo` | `boolean` | sim | `true` |  |  |
| 30 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 31 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 35 | `custo_aplicacao` | `numeric(10,2)` | sim | `NULL::numeric` |  |  |
| 36 | `custo_termo_transferencia` | `numeric(10,2)` | sim | `NULL::numeric` |  |  |
| 37 | `custo_queima_forno` | `numeric(10,2)` | sim | `NULL::numeric` |  |  |
| 38 | `codigo_curto` | `character varying(10)` | sim |  |  |  |
| 39 | `grupo_tecnica` | `character varying(30)` | sim |  |  |  |
| 46 | `usa_faixa_dimensional` | `boolean` | sim | `false` |  |  |
| 47 | `opcoes_modificadores` | `jsonb` | sim |  |  | JSONB com modificadores. Chaves canônicas pós UNIF-01 (25/04/2026): regra_anti_paradoxo (sempre MAX_ENTRE_FAIXAS), multiplicador_cor (chaves "1","2",...), materiais_aplicaveis (array), versao_modelo, historico_fixes (array), documentacao (formula_*, exemplos), recomendacao_tecnica, unif_setup (carimbo da operação). O piso comercial agora é o próprio campo custo_setup. |
| 48 | `tom_options` | `jsonb` | sim |  |  | Opções de tom de gravação (ex: Laser Claro/Escuro). NULL = sem seletor. |
| 49 | `markup_percent` | `numeric(5,2)` | sim | `115.0` |  | Percentual de markup sobre custo. Ex: 115 = custo × 2.15. Migrado de organization_markup_customization em 22/02/2026 |
| 50 | `preco_minimo_unitario` | `numeric` | sim | `1.0` |  | Piso do preco_unitario das faixas associadas. Garantido pelo trigger trg_check_preco_minimo (criado em GOV-02). Mantido em sync com MIN(faixas.preco_unitario). |
| 51 | `preco_maximo_unitario` | `numeric` | sim |  |  | Teto de preço por unidade (reservado para uso futuro). Migrado de organization_markup_customization em 22/02/2026 |
| 52 | `cobra_por_area` | `boolean` | não | `false` |  |  |
| 53 | `area_maxima_cm2` | `numeric(10,2)` | sim | `NULL::numeric` |  |  |
| 54 | `area_maxima_texto` | `text` | sim |  |  |  |
| 55 | `cobra_por_pontos` | `boolean` | não | `false` |  |  |
| 56 | `max_pontos` | `integer` | sim |  |  |  |
| 57 | `faturamento_minimo` | `numeric(10,2)` | sim | `NULL::numeric` |  |  |
| 58 | `custo_manuseio_por_peca` | `boolean` | não | `false` |  |  |
| 59 | `quantidade_corte` | `integer` | sim |  |  |  |
| 60 | `cobra_aplicacao` | `boolean` | não | `false` |  |  |
| 61 | `cobra_queima_forno` | `boolean` | não | `false` |  |  |
| 62 | `cobra_termo_transferencia` | `boolean` | não | `false` |  |  |
| 63 | `desconto_quarta_cor_mais` | `numeric(5,2)` | sim | `NULL::numeric` |  |  |
| 64 | `validade_inicio` | `date` | sim |  |  |  |
| 65 | `validade_fim` | `date` | sim |  |  |  |
| 66 | `tipo_setup` | `character varying(50)` | sim | `NULL::character varying` |  |  |
| 67 | `codigo` | `character varying(50)` | sim | `codigo_tabela` | s |  |
| 68 | `nome_grupo` | `character varying(100)` | sim | `grupo_tecnica` | s |  |
| 69 | `tecnica_variante_id` | `uuid` | sim |  |  |  |
| 70 | `ordem_exibicao` | `integer` | não | `99` |  | ANTI-REGRESSION (fix 2026-06-26): display order for the technique-list UI. Frontend reads this table via bridge alias tecnica_gravacao (dbInvoke BRIDGE_ALIASES) and ORDERs BY ordem_exibicao; column previously existed only on tecnicas_gravacao, causing PostgREST 400 (42703). NOT NULL DEFAULT 99 (intentionally STRICTER than tecnicas_gravacao.ordem_exibicao which is nullable - prevents ordering surprises). Values backfilled to honor the CURATED order: parent technique tecnicas_gravacao.ordem_exibicao (joined via grupo_tecnica=tecnicas_gravacao.codigo), then codigo_tabela within group. DO NOT DROP. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_tabela_preco_valores_validos | CHECK | `CHECK (custo_setup >= 0::numeric AND COALESCE(custo_aplicacao, 0::numeric) >= 0::numeric AND COALESCE(markup_percent, 0::numeric) >= 0::numeric AND COALESCE(preco_minimo_unitario, 0::numeric) >= 0::numeric AND COALESCE(max_cores, 1) > 0)` |  |  | sim |
| fk_oficial_grupo_tecnica | FOREIGN KEY | `FOREIGN KEY (grupo_tecnica) REFERENCES tecnicas_gravacao(codigo)` | NO ACTION | NO ACTION | sim |
| tabela_preco_gravacao_oficial_codigo_unique | UNIQUE | `UNIQUE (codigo_tabela)` |  |  | sim |
| tabela_preco_gravacao_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| uq_codigo_curto | UNIQUE | `UNIQUE (codigo_curto)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.kit_component_print_areas | kit_component_print_areas_tabela_preco_id_fkey | tabela_preco_id | NO ACTION |
| public.print_area_techniques | print_area_techniques_tabela_preco_id_fkey | tabela_preco_id | NO ACTION |
| public.tabela_preco_gravacao_oficial_faixa | tabela_preco_gravacao_faixa_tabela_preco_gravacao_id_fkey | tabela_preco_gravacao_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_tabela_preco_ativo | btree | ativo | não | sim |  | `CREATE INDEX idx_tabela_preco_ativo ON public.tabela_preco_gravacao_oficial USING btree (ativo)` |
| idx_tabela_preco_gravacao_grupo_tecnica | btree | grupo_tecnica | não | sim | `(grupo_tecnica IS NOT NULL)` | `CREATE INDEX idx_tabela_preco_gravacao_grupo_tecnica ON public.tabela_preco_gravacao_oficial USING btree (grupo_tecnica) WHERE (grupo_tecnica IS NOT NULL)` |
| idx_tpgo_ativo_grupo | btree | ativo, grupo_tecnica | não | sim | `(ativo = true)` | `CREATE INDEX idx_tpgo_ativo_grupo ON public.tabela_preco_gravacao_oficial USING btree (ativo, grupo_tecnica) WHERE (ativo = true)` |
| tabela_preco_gravacao_oficial_codigo_unique | btree | codigo_tabela | sim | sim |  | `CREATE UNIQUE INDEX tabela_preco_gravacao_oficial_codigo_unique ON public.tabela_preco_gravacao_oficial USING btree (codigo_tabela)` |
| tabela_preco_gravacao_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX tabela_preco_gravacao_pkey ON public.tabela_preco_gravacao_oficial USING btree (id)` |
| uq_codigo_curto | btree | codigo_curto | sim | sim |  | `CREATE UNIQUE INDEX uq_codigo_curto ON public.tabela_preco_gravacao_oficial USING btree (codigo_curto)` |


## Policies (RLS)

### `tabela_preco_gravacao_oficial_public_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon, authenticated |
| USING | `(ativo = true)` |
| WITH CHECK |  |

### `tpgo_admin_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `tpgo_admin_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `tpgo_dev_delete`

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
| trg_audit_gravacao | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.fn_audit_gravacao_changes |
| trg_tabela_preco_gravacao_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
