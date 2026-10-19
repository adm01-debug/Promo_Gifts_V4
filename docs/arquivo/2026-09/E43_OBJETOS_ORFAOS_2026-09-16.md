# E43 — Objetos órfãos e referências a objetos inexistentes (auditoria read-only)

**Data:** 2026-09-16
**Classificação:** `[RO]` — nenhuma alteração aplicada, nenhum `DROP` sugerido ou preparado. Este
documento é um inventário de apoio para uma decisão de remoção **futura e separada**.
**Método:** `pg_catalog` (`pg_proc`, `pg_class`, `pg_namespace`, `pg_views`, `pg_matviews`) via
`mcp__supabase__execute_sql` (somente leitura), conforme REGRA #8 do CLAUDE.md. Nenhum
PostgREST/OpenAPI foi usado para descoberta de schema. Banco canônico: `doufsxqlfjyuvxuezpln`.

## Resumo executivo

| Métrica | Valor |
|---|---|
| Views + matviews em `public` | 197 (plano citava ~193 — número levemente desatualizado) |
| Funções em `public` (nomes distintos / linhas `pg_proc`) | 1.313 / 1.320 (bate com o plano) |
| **Lista (a)** — código chamando objeto que não existe | **3 achados confirmados, todos em produção ativa** (ver §1) |
| **Lista (b)** — views sem consumidor conhecido (após 2ª passada) | **128** de 197 (65%) |
| **Lista (b)** — funções sem consumidor conhecido (após 2ª passada) | **596** de 1.313 (45%) |

**Achado mais importante (lista a):** a edge function `bitrix-sync` (status `ACTIVE`, deployada) tem
4 caminhos de código alcançáveis (`sync_full`, `get_stored_clients`, `get_stored_deals`,
`get_sync_logs`) que consultam `public.bitrix_clients`, `public.bitrix_deals` e `public.sync_logs` —
**nenhuma das três existe** no banco canônico. Qualquer invocação dessas 4 ações produz erro em
runtime (`relation does not exist`, `42P01`). Ver §1.1.

---

## 1. Lista (a) — código referenciando objetos inexistentes

A lista NÃO está vazia. Foram investigados 8 candidatos herdados de uma varredura anterior
(`bitrix_clients`, `bitrix_deals`, `contacts`, `customers`, `e2e_cleanup_audit`,
`product_categories`, `stock_notes`, `sync_logs`) mais 1 candidato de uma auditoria de código prévia
(`check_auth_config_status`). Resultado, objeto a objeto:

### 1.1 Achados reais — ação recomendada (fora do escopo desta etapa `[RO]`)

| Objeto | Onde é chamado | Status no banco | Impacto |
|---|---|---|---|
| `bitrix_clients` | `supabase/functions/bitrix-sync/index.ts:172,192` (`.upsert()`, `.select()`) | **Não existe** (nenhuma tabela com esse nome em nenhum schema) | Ações `sync_full` e `get_stored_clients` da edge function `bitrix-sync` (ACTIVE, deployada) falham em runtime |
| `bitrix_deals` | `supabase/functions/bitrix-sync/index.ts:200` (`.select()`) | **Não existe** | Ação `get_stored_deals` falha em runtime |
| `sync_logs` | `supabase/functions/bitrix-sync/index.ts:236` (`.select()`) | **Não existe** em `public` — existe `sync_log` (singular) mas no schema `supplier_stricker`, e existem `product_sync_logs`/`external_connections_sync_log` em `public` com propósitos distintos | Ação `get_sync_logs` falha em runtime |
| `e2e_cleanup_audit` | `supabase/functions/e2e-cleanup/index.ts` (5 pontos de `.insert()`) | **Não existe** hoje, apesar de haver migração `20260426200011_...sql` com `CREATE TABLE IF NOT EXISTS public.e2e_cleanup_audit`. Existe `e2e_cleanup_rate_limit` em `public`, provável substituto | Edge function `e2e-cleanup` (ACTIVE, deployada) grava log de auditoria em tabela ausente — indica **drift de migração** (migração no repo não corresponde ao estado vivo do banco), não apenas código morto |
| `stock_notes` | `src/hooks/stock/useStockNotes.ts` (`.select/.insert/.delete`) | **Não existe** | Hook não tem nenhum importador em `src/` (confirmado via grep) — código morto/não religado. Não quebra produção hoje, mas é uma armadilha: se alguém importar o hook, quebra imediatamente |

**Nota sobre `bitrix-sync`:** o `Deno.env.get('SUPABASE_URL')` usado por `getSupabaseClient()` nessa
função aponta para o projeto onde a function está deployada (injeção automática da plataforma
Supabase) — ou seja, é o próprio `doufsxqlfjyuvxuezpln`, confirmando que o gap é real e não um
engano de "banco externo". `crm-db-bridge` (usado por `contacts`/`customers`, ver 1.2) é diferente:
usa explicitamente `EXTERNAL_CRM_URL`/`EXTERNAL_CRM_SERVICE_ROLE_KEY`.

### 1.2 Falsos positivos — investigados e descartados

| Objeto | Por que aparentava ser um gap | Por que não é |
|---|---|---|
| `contacts` | `.from('contacts')` em `src/components/quotes/CompanyContactSelector.tsx`, `expert-chat`, etc. | Passa por `selectCrm()` (`src/lib/crm-db.ts`) → edge function `crm-db-bridge`, que usa `EXTERNAL_CRM_URL` — um banco Postgres **externo** dedicado a CRM, não `doufsxqlfjyuvxuezpln`. Não é um gap do banco canônico. |
| `customers` | idem, via `useCrmCompanies.ts` | idem — mesmo mecanismo `selectCrm()`/`crm-db-bridge` externo |
| `product_categories` | `.from('product_categories')` em `supabase/functions/categories-api/index.ts:287` | O próprio código já documenta o gap: comentário inline "esta tabela nao existe no banco atual — a query falha silenciosamente, o que e o comportamento correto" — é uma estratégia de fallback legado 3-em-3, deliberadamente tolerante a falha. Não é bug. |
| `check_auth_config_status` | RPC chamada em `src/lib/auth/auth-audit.ts:15` | A própria função `runAuthAudit()` já documenta (comentário datado de 2026-06-11, re-verificado via `pg_proc`) que a RPC não existe intencionalmente; a chamada está em `try/catch` com degradação graciosa. Além disso, `runAuthAudit` **não tem nenhum chamador** em `src/` — é código morto, nunca executado em produção. Não representa risco ativo. |

**Conclusão da lista (a):** ao contrário do que o grep ingênuo sugeria (8 tabelas "sumidas"), apenas
5 são gaps reais, e destes, **3 estão em edge functions ativas e alcançáveis** (`bitrix-sync` × 3
tabelas, `e2e-cleanup` × 1 tabela) — isso não é "ideal = 0" e deve virar item de correção em uma etapa
futura (fora do escopo `[RO]` desta etapa). Os outros 2 (`contacts`/`customers` via CRM externo,
`product_categories` com fallback documentado) e o candidato `check_auth_config_status` são falsos
positivos do grep bruto, confirmados via leitura de código.

---

## 2. Lista (b) — objetos sem consumidor conhecido

### 2.1 Método (2 passadas)

1. **1ª passada:** anti-join entre todo objeto de `public` (`pg_class.relkind IN ('v','m')` para views,
   `pg_proc` para funções) e um superset de "usados conhecidos" extraído de: chamadas estáticas
   `.from()`/`.rpc()`/`.functions.invoke()`/`.storage.from()` em `src/` e `supabase/functions`,
   wrappers de abstração (`untypedFrom`, `fromTable`/`resolveTable`, `REST_NATIVE_SAFE_TABLES`,
   `REST_NATIVE_WRITE_TABLES`, `goldFrom`), gatilhos (`pg_trigger`), políticas RLS (`pg_policy`),
   jobs `cron.job`, e dependências de view (`pg_depend`) para views já conhecidas como usadas.
   Resultado bruto: **162 views/matviews** e **860 funções** sem match.
2. **2ª passada (refinamento):** o método acima tem um ponto cego conhecido e explicitamente citado
   no enunciado da tarefa — um objeto pode ser "órfão" do ponto de vista do código-fonte mas ser
   consumido **internamente** por outro objeto do banco (função chamando função, view selecionando de
   view, matview referenciando função). Para fechar essa lacuna, uma segunda query extraiu, via
   `regexp_matches`, todos os tokens/identificadores usados em `prosrc` de **todas** as funções de
   `public` e em `definition` de **todas** as views/matviews de `public`, e refez o anti-join dos 162
   + 860 candidatos contra esse conjunto de tokens.

### 2.2 Impacto do refinamento (achado metodológico relevante)

| Objeto | 1ª passada (grep de código) | 2ª passada (+ uso interno no banco) | Falsos positivos corrigidos |
|---|---|---|---|
| Views/matviews | 162 | **128** | 34 (21%) — inclui as **2 matviews** do 1º corte (`mv_ema_kpi_by_level`, `mv_product_images_audit`), ambas usadas dentro de função |
| Funções | 860 | **596** | 264 (31%) |

Isso confirma quantitativamente a ressalva do enunciado: quase 1 em cada 3 funções "órfãs" da 1ª
passada era, na verdade, chamada só internamente por outra função do banco — teria sido uma remoção
perigosa se a lista bruta tivesse sido usada diretamente.

**Achado colateral:** todas as 9 views com sufixo `_public` que apareceram na 1ª passada
(`v_personalization_techniques_public`, `v_product_properties_public`, `v_product_tags_public`,
`v_kit_component_media_public`, `v_kit_component_print_areas_public`,
`v_tabela_preco_gravacao_oficial_public`, `v_tags_public`, `v_color_nuances_public`,
`v_product_compositions_public`) foram descartadas na 2ª passada — todas são referenciadas dentro do
corpo de alguma função `public`, coerente com a convenção Gold-layer da ADR 0007 (função RPC expõe a
view `_public`). Restam apenas **3** views `_public`/`publico` genuinamente sem uso conhecido:
`somarcas_catalogo_publico`, `v_products_public_test`, `v_site_products_public`.

### 2.3 Amostra categorizada — Views (128 restantes após refinamento)

| Categoria | Qtde | Exemplos |
|---|---|---|
| `vw_*` — dashboards/status/saúde de pipeline | 78 | `vw_asia_products_stats`, `vw_xbz_scraping_status`, `vw_supplier_mapping_statistics`, `vw_rupture_live_divergence`, `vw_packaging_health` |
| `v_*` — diversos (auditoria, blurhash, catálogo) | 31 | `v_blurhash_coverage`, `v_catalog_stats`, `v_db_health_check`, `v_image_quality_stats`, `v_product_tokens` |
| `*kit*` — pipeline/saúde de kits | 7 | `v_kit_completeness_by_supplier`, `v_kit_enrichment_dashboard`, `v_kit_max_quantity`, `v_kit_pipeline_health` |
| `*health*`/`*dashboard*` (fora das duas categorias acima) | 5 | `v_cf_drift_dashboard`, `v_connection_health`, `v_crm_callback_health`, `v_video_dashboard` |
| `*audit*` | 4 | `v_audit_cobertura_tecnicas`, `v_audit_paradoxos_gravacao`, `v_products_dimensions_audit`, `v_products_name_audit` |
| `*_public`/`*_publico` (Gold-layer, sem uso confirmado) | 3 | `somarcas_catalogo_publico`, `v_products_public_test`, `v_site_products_public` |

**Padrão dominante:** ~86% (110/128) são views de observabilidade/diagnóstico (`vw_*` de status,
dashboards de saúde, auditoria) — plausivelmente criadas para debug manual via SQL Editor ou para um
painel administrativo que nunca foi implementado no frontend, não para consumo por código. Isso é uma
hipótese, não uma confirmação — ver §3 (ressalvas).

### 2.4 Amostra categorizada — Funções (596 restantes após refinamento)

| Categoria | Qtde | Exemplos |
|---|---|---|
| `fn_*` (prefixo genérico, sem sub-padrão claro) | 195 | `fn_add_packaging_compatibility`, `fn_backfill_eco_links`, `fn_categories_health_check` |
| outras (sem prefixo `fn_`/`get_`, mistura de utilitários/triggers/admin) | 152 | `audit_mcp_key_insert`, `block_ip_temp`, `calculate_quote_item_pricing`, `generate_slug` |
| `get_*` | 66 | `get_abc_curve`, `get_category_breadcrumbs`, `get_low_stock_alerts` |
| `fn_get_*` | 31 | `fn_get_all_leaf_categories`, `fn_get_reposicao_metrics` |
| `classify_<tipo_produto>` (classificadores por categoria de produto) | 20 | `classify_camiseta`, `classify_kit_executivo`, `classify_umidificador` |
| `*step_up*` (autenticação step-up) | 17 | `enable_step_up_for_user`, `has_active_step_up_challenge`, `verify_step_up_password` |
| `audit_*`/`*mcp_key*`/`*mcp_api*` | 14 | `audit_mcp_api_keys_changes`, `auto_revoke_orphan_full_keys`, `rotate_mcp_key` |
| `fn_asia_*` (pipeline de ingestão "Asia") | 13 | `fn_asia_complete_image_upload`, `fn_asia_ingest_all_pages`, `fn_asia_stock_fast_sync` |
| `fn_xbz_*` (pipeline de ingestão "XBZ") | 13 | `fn_xbz_batch_to_silver`, `fn_xbz_enrich_stock`, `fn_xbz_run_image_cycle` |
| `cleanup_*`/`purge_*` | 12 | `cleanup_expired_step_up`, `purge_old_rate_limits`, `purge_webhook_logs` |
| `trg_*`/`trigger_*`/`tg_*` (nome sugere trigger, mas não está anexada a nenhuma como `pg_trigger.tgfoid`) | 10 | `tg_magazines_on_publish`, `trg_auto_revoke_mcp_on_role_loss` |
| `fn_spot_*` (pipeline de ingestão "Spot") | 9 | `fn_spot_batch_to_silver`, `fn_spot_vimeo_daily_sync` |
| `magic_up_*` | 9 | `magic_up_create_brand_kit`, `magic_up_get_dashboard` |
| conversão de unidade (`xx_to_yy`) | 7 | `cm_to_mm`, `kg_to_g`, `ml_to_l` |
| `fn_sm_*` (pipeline de ingestão "SM"/legado) | 7 | `fn_sm_batch_to_silver`, `fn_sm_pipeline_health` |
| `expert_chat_*` | 6 | `expert_chat_create_conversation`, `expert_chat_send_message` |
| `magazine_*_atomic` | 6 | `magazine_publish_atomic`, `magazine_reorder_items_atomic` |
| `fn_cf_*` (pipeline "Cloudflare"/reconciliação) | 5 | `fn_cf_recon_collect`, `fn_cf_recon_dispatch` |
| `vault_*` | 4 | `vault_get_secret`, `vault_set_secret` |

**Padrões dominantes:** (1) ~24% (142/596) são pipelines de ingestão por fornecedor/fonte
(`fn_asia_*` + `fn_xbz_*` + `fn_spot_*` + `fn_sm_*` + `fn_cf_*` = 47, mais várias dúzias dentro do
grande grupo `fn_*` genérico que seguem o mesmo padrão de nome); (2) `classify_<produto>` (20) parece
ser um framework de classificação automática por tipo de produto, possivelmente chamado
dinamicamente por nome (via `fn_auto_classify_packing`/`register_classify_function`/
`get_classify_functions`, que aparecem como usadas) — **risco de falso positivo por invocação
dinâmica**, ver §3; (3) `trg_*`/`tg_*`/`trigger_*` (10) têm nome de gatilho mas não estão de fato
anexadas via `pg_trigger` — candidatas a serem versões antigas substituídas por uma função
com nome diferente.

---

## 3. Ressalvas metodológicas (leitura obrigatória antes de qualquer decisão de remoção)

1. **Invocação dinâmica por nome não é detectada.** Se o código monta o nome do RPC/tabela em uma
   variável (`supabase.rpc(functionName)`, `` `classify_${tipo}` ``) em vez de um literal estático, o
   grep de 1ª passada não encontra a chamada e o objeto pode aparecer como "órfão" mesmo sendo usado.
   As famílias `classify_*` e `fn_get_classify_functions`/`register_classify_function` são candidatas
   plausíveis a esse padrão e merecem checagem manual antes de qualquer remoção.
2. **A 2ª passada (uso interno) é um superset por token, não uma prova de chamada real.** O regex
   captura qualquer identificador seguido de `(` no corpo de outra função (para funções) ou qualquer
   identificador de qualquer tipo no `definition` de uma view (para tabelas/views) — não distingue
   comentário de código morto dentro do próprio `prosrc`, nem branch de `IF` nunca executado. Então a
   2ª passada é otimista (tende a *remover* itens da lista de órfãos, não a manter incorretamente) —
   é uma proteção contra falso positivo de remoção, não uma garantia de que os 128/596 restantes são
   100% mortos.
3. **Assimetria histórica corrigida nesta etapa:** a checagem "usado internamente por outro objeto do
   banco" foi originalmente implementada só para funções; foi estendida para views/matviews nesta
   mesma etapa antes da escrita deste documento (ver §2.2), eliminando a assimetria de rigor entre as
   duas listas.
4. **Gatilhos, RLS e cron são heurísticas de nome, não de execução comprovada.** "Consumidor via
   trigger/policy/cron" nesta auditoria significa que o objeto está *anexado* a um desses mecanismos
   (`pg_trigger.tgfoid`, `pg_policy` referenciando a função, `cron.job.command`) — não que o gatilho
   dispare com frequência ou que o job cron esteja ativo hoje.
5. **Overloads de função são tratados por nome (`proname`), não por assinatura completa.** Uma função
   com múltiplas sobrecargas (7 dos 1.320 registros de `pg_proc` são overloads de nomes já contados)
   é considerada "usada" se qualquer uma de suas assinaturas aparecer referenciada — uma sobrecarga
   específica pode estar morta mesmo que o nome geral esteja marcado como usado.
6. **Wrappers de abstração** (`untypedFrom`, `fromTable`/`resolveTable`, `REST_NATIVE_SAFE_TABLES`/
   `REST_NATIVE_WRITE_TABLES`, `goldFrom`) foram expandidos manualmente para o superset de "usados",
   mas uma tabela referenciada apenas por um wrapper ainda não descoberto pode aparecer como falso
   órfão.
7. **Falsos negativos possíveis na lista (a):** o inverso do problema acima — um objeto pode parecer
   "usado" (contado no superset) porque seu nome aparece em uma string/comentário/teste que nunca
   executa em produção (ex.: `check_auth_config_status`, achado como código mono mas cujo *nome* está
   correto — o gap real não é de nome, é de alcançabilidade). A lista (a) reportada aqui foi
   verificada manualmente item a item (não é output bruto do anti-join) exatamente para mitigar isso.
8. **Este documento é um inventário, não uma recomendação de remoção.** Mesmo os 128 + 596 objetos
   "sem consumidor conhecido" podem ter uso legítimo fora do que esta auditoria consegue enxergar:
   consultas manuais via SQL Editor/BI externo, scripts de operação ad-hoc, chamadas do MCP Server
   (`mcp-server`/`mcp-query`, que expõem função dinamicamente por permissão, não por nome fixo no
   código-fonte deste repo), ou uso por um cliente externo ao repositório `Promo_Gifts_V4`.

---

## 4. Próximos passos (fora do escopo desta etapa)

- **Não fazer nesta etapa:** nenhum `DROP VIEW`, `DROP MATERIALIZED VIEW` ou `DROP FUNCTION` foi
  executado, sugerido em migration, ou preparado como script. A decisão de remoção pertence a uma
  etapa futura separada, com aprovação explícita do PO (REGRA #8 do CLAUDE.md) e, no mínimo, uma
  janela de observação em produção (ex.: `pg_stat_user_functions`/log de chamadas) para os 128 + 596
  candidatos antes de qualquer remoção.
- Corrigir os 3 achados reais da lista (a) (§1.1) — `bitrix-sync` (3 tabelas ausentes) e
  `e2e-cleanup` (1 tabela ausente, possível drift de migração) — em uma etapa de correção dedicada.
- Investigar se as famílias `classify_*` são invocadas dinamicamente antes de considerá-las para
  remoção futura (ver ressalva §3, item 1).
