# E16 — As 8 views `v_*_public` SECURITY DEFINER como superfície anônima (2026-09-16)

`[GIT]`. Sem DDL, sem escrita no Supabase. Documentação + gate de CI.

Etapa do `PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` (linha 442-449).
Achado espelhado em `docs/SCHEMA_REFERENCE.md` §2 (tabela) e §3 P6.

**Nota de continuidade:** a maior parte deste trabalho já existia na working
tree quando esta sessão começou (`.security/public-views-columns.json`
atualizado, `scripts/check-public-views-drift.mjs` novo, renomeação de
`check-public-views-columns.mjs`, `package.json` com o script `check:public-views-drift`,
`tests/security/public-views-columns.test.ts` já apontando para o script novo)
— uma sessão anterior chegou perto de terminar e parou por erro de
infraestrutura. Esta sessão fez auditoria de correção, não reimplementação:
reconferiu as 8 views e as 265 colunas ao vivo contra o contrato (bateram
exatamente), rodou o gate contra dados reais e contra fixtures de drift
simulado (passou/falhou como esperado), rodou a suíte de testes existente,
adicionou o teste que faltava em `tests/scripts/` (item 6 do pedido — só
existia o equivalente em `tests/security/`, via subprocess; faltava a versão
que testa as funções puras do script, no padrão de `check-types-inventory-drift.test.mjs`),
e atualizou `docs/SCHEMA_REFERENCE.md` (P6 ainda dizia "falta o gate de
drift").

---

## 1. As 8 views, confirmadas ao vivo `[RO]`

Consulta ampla por `v\_%\_public` (não só as 8 já conhecidas, para não dar
"achado confirmado" por suposição):

```sql
SELECT c.relname, c.relkind,
       COALESCE((SELECT option_value FROM pg_options_to_table(c.reloptions)
                 WHERE option_name='security_invoker'), 'false') AS security_invoker,
       has_table_privilege('anon', c.oid, 'SELECT') AS anon_can_select
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='v' AND c.relname LIKE 'v\_%\_public'
ORDER BY c.relname;
```

Resultado: **14** views casam o padrão de nome `v_*_public`, mas só **8**
rodam como owner (`security_invoker=false`) — as outras 6
(`v_color_nuances_public`, `v_kit_component_print_areas_public`,
`v_personalization_techniques_public`, `v_print_area_techniques_public`,
`v_site_products_public`, `v_tags_public`) já são `security_invoker=true`
(`v_site_products_public` também tem `security_barrier=true`) e ficam fora
do escopo desta etapa — respeitam RLS/GRANTs de quem consulta, não do dono.

As 8 confirmadas, todas `relkind='v'`, `security_invoker=false`,
`anon_can_select=true`:

| View | Colunas | Tabela(s)/view(s) subjacente(s) (`pg_depend`) |
|---|---|---|
| `v_kit_component_media_public` | 8 | `product_kit_components`, `products` |
| `v_product_compositions_public` | 5 | `mv_product_compositions` (mat. view, schema `analytics`), `products` |
| `v_product_properties_public` | 5 | `product_properties`, `products` |
| `v_product_tags_public` | 3 | `product_tags`, `products`, `tags` |
| `v_products_public` | 182 | `products`, `mv_product_leaf_category` (mat. view, schema `internal`) |
| `v_suppliers_public` | 11 | `suppliers` |
| `v_tabela_preco_gravacao_oficial_public` | 37 | `tabela_preco_gravacao_oficial` |
| `v_variant_sale_prices_public` | 14 | `product_variants`, `products`, `variant_supplier_sources`, `suppliers`, `markup_configurations` |

**265 colunas somadas** — batem exatamente, coluna a coluna, contra
`.security/public-views-columns.json` (verificado programaticamente, não por
inspeção visual; ver §4).

**Corroboração independente:** o linter de segurança nativo do Supabase
(`get_advisors(type=security)`) reporta o lint `security_definer_view`
(nível `ERROR`) com `count: 8` e lista exatamente estas 8 views — mesma
contagem, mesmos nomes, fonte de dados diferente (linter interno do Postgres
via `pgsql-http`/`database-linter`, não a query manual acima).

---

## 2. Definição de cada view (`pg_get_viewdef`) `[RO]`

### `v_kit_component_media_public`
```sql
SELECT pkc.id AS kit_component_id, pkc.kit_product_id, pkc.component_product_id,
       pkc.component_code, pkc.component_name, pkc.primary_image_url, pkc.images,
       pkc.display_order
FROM product_kit_components pkc
JOIN products p ON p.id = pkc.kit_product_id AND p.is_active = true AND p.is_deleted IS NOT TRUE
WHERE pkc.primary_image_url IS NOT NULL OR pkc.images IS NOT NULL;
```
Só mídia de componentes de kit de produtos ativos/não-deletados. Sem colunas
de preço/custo.

### `v_product_compositions_public`
```sql
SELECT mpc.product_id, mpc.product_name, mpc.total_materials, mpc.total_percentage,
       mpc.materials_detail
FROM mv_product_compositions mpc
JOIN products p ON p.id = mpc.product_id AND p.is_active = true AND p.is_deleted IS NOT TRUE;
```
Composição de materiais (ex.: "70% algodão, 30% poliéster"), de uma
materialized view (`analytics.mv_product_compositions`), filtrada por
produto ativo. Sem preço/custo.

### `v_product_properties_public`
```sql
SELECT pp.id, pp.product_id, pp.property_code, pp.property_value, pp.source
FROM product_properties pp
JOIN products p ON p.id = pp.product_id AND p.is_active = true AND p.is_deleted IS NOT TRUE;
```
Propriedades chave/valor genéricas do produto (ex.: atributos técnicos).
Sem preço/custo.

### `v_product_tags_public`
```sql
SELECT pt.id, pt.product_id, pt.tag_id
FROM product_tags pt
JOIN products p ON p.id = pt.product_id AND p.is_active = true AND p.is_deleted IS NOT TRUE
JOIN tags t ON t.id = pt.tag_id AND t.is_active = true;
```
Associação produto↔tag, ambos ativos. Só IDs.

### `v_products_public`
182 colunas — a maior das 8, espelha quase todas as colunas de `products`
(exceto as mascaradas). Filtra `is_deleted IS NOT TRUE AND is_active = true`.
Enriquecida com `LEFT JOIN internal.mv_product_leaf_category` para
`leaf_category_*`. **18 colunas mascaradas para `NULL` na própria definição**
(não removidas do schema, mas o valor nunca trafega para `anon`):
`cost_price`, `suggested_price`, `organization_id`, `created_by`, `updated_by`,
`manufacturer_sku`, `is_online_exclusive`, `catalog_page`, `last_sync_at`,
`last_sync_supplier_id`, `sync_status`, `has_inner_cradle`, `cradle_material`,
`requires_minimum_order`, `bitrix_images_synced_at`, `auto_category`,
`classification_confidence`, `external_id` — confirmado literalmente no
`viewdef` (`NULL::numeric AS cost_price`, `NULL::uuid AS organization_id`, …),
não é suposição a partir do nome da coluna. Ver §3 para as 3 colunas
sensíveis que **não** estão mascaradas.

### `v_suppliers_public`
```sql
SELECT id, name, code, trading_name, logo_url, website, active,
       is_product_supplier, is_engraving_supplier, state_uf, low_stock_threshold
FROM suppliers;
```
Só metadados de exibição do fornecedor. `cnpj`, `email`, `phone`,
`api_credentials`, `api_base_url`, `api_key`, `api_token`, `password`,
`default_markup_percent` (todos presentes na tabela `suppliers` base) **não
aparecem** — nem mascarados, simplesmente ausentes do `SELECT`.

### `v_tabela_preco_gravacao_oficial_public`
```sql
SELECT id, codigo_tabela, codigo, codigo_curto, nome, nome_grupo, descricao,
       grupo_tecnica, cobra_por_cor, max_cores, desconto_segunda_cor,
       desconto_terceira_cor, desconto_quarta_cor_mais, preco_minimo_unitario,
       preco_maximo_unitario, cobra_por_area, area_maxima_cm2, area_maxima_texto,
       cobra_por_pontos, max_pontos, usa_faixa_dimensional, opcoes_modificadores,
       tom_options, cobra_aplicacao, cobra_queima_forno, cobra_termo_transferencia,
       custo_setup_por_cor, custo_manuseio_por_peca, quantidade_corte, tipo_setup,
       validade_inicio, validade_fim, ordem_exibicao, tecnica_variante_id, ativo,
       created_at, updated_at
FROM tabela_preco_gravacao_oficial
WHERE ativo = true;
```
Tabela oficial de preço de gravação/personalização, só registros ativos.
`custo_setup`, `markup_percent`, `custo_aplicacao`, `custo_termo_transferencia`,
`custo_queima_forno`, `faturamento_minimo` (valores monetários reais de custo
interno) **não aparecem**. `custo_setup_por_cor` e `custo_manuseio_por_peca`
aparecem, mas são `boolean` (flag "cobra taxa?"), não `numeric` — ver §3.

### `v_variant_sale_prices_public`
```sql
SELECT pv.id AS variant_id, pv.product_id, pv.sku, pv.color_name,
       vss.min_qty_1,
       round(vss.cost_price_1 * (1 + COALESCE(mc_var.markup_percent, mc_prod.markup_percent,
             mc_cat.markup_percent, s.default_markup_percent, 115.0) / 100), 2) AS sale_price_1,
       -- ... min_qty_2..5 / sale_price_2..5, mesmo padrão
FROM product_variants pv
JOIN products p ON p.id = pv.product_id AND p.is_active = true AND p.is_deleted IS NOT TRUE
JOIN variant_supplier_sources vss ON vss.variant_id = pv.id AND vss.is_preferred = true
LEFT JOIN suppliers s ON s.id = vss.supplier_id
LEFT JOIN markup_configurations mc_var ON mc_var.variant_id = pv.id AND mc_var.is_active = true
LEFT JOIN markup_configurations mc_prod ON mc_prod.product_id = pv.product_id
     AND mc_prod.variant_id IS NULL AND mc_prod.category_id IS NULL AND mc_prod.is_active = true
LEFT JOIN markup_configurations mc_cat ON mc_cat.category_id = (SELECT category_id FROM products WHERE id = pv.product_id)
     AND mc_cat.product_id IS NULL AND mc_cat.variant_id IS NULL AND mc_cat.is_active = true
WHERE pv.is_active = true;
```
**Único mecanismo de precificação anônima do catálogo**: usa `cost_price_N`
(de `variant_supplier_sources`, fonte preferida) e `markup_percent` (cascata
variante → produto → categoria → fornecedor → default 115%) **só como
entrada de cálculo dentro da view** — `cost_price_N` e `markup_percent` não
são colunas de saída, só `sale_price_N` (já arredondado, já com markup
aplicado) sai. Confirma o design do `forbidden` list do contrato
(`cost_price`, `markup`, `markup_percent`, `supplier_cost`, `unit_cost`).

---

## 3. Varredura de colunas sensíveis `[RO]` — achado central desta etapa

Padrões buscados nas 265 colunas das 8 views (case-insensitive):
`cost`, `custo` (PT — a tabela de gravação é 100% em português), `supplier_price`,
`^ncm`, `^bitrix_`, `email`, `phone|telefone`, `\bcpf\b|\bcnpj\b`,
`endereco|address|\bcep\b`.

**Nenhuma view expõe PII** (email, telefone, CPF/CNPJ, endereço) — busca
zero resultados nas 265 colunas reais.

**Nenhuma view expõe `cost`/`custo` como valor monetário real** sem máscara:
- `v_products_public.cost_price` → mascarada `NULL` na view.
- `v_products_public.suggested_price` → mascarada `NULL` na view.
- `v_tabela_preco_gravacao_oficial_public.custo_setup_por_cor` e
  `.custo_manuseio_por_peca` → tipo `boolean` (flag "cobra taxa?"), não o
  valor de custo em si (esse é `custo_setup`, que está no `forbidden` e
  ausente da view). Confirmado pelo `format_type()` ao vivo:
  `custo_setup_por_cor boolean`, `custo_manuseio_por_peca boolean`.
- `v_variant_sale_prices_public` computa a partir de `cost_price_N`, mas só
  expõe `sale_price_N` (já processado) — `cost_price_N` não sai como coluna.

**3 colunas passam sem máscara e batem no padrão `ncm`/`bitrix` — achado P1,
`REQUER-PO`, NÃO corrigido nesta etapa** (regra do plano: aqui é
investigação `[RO]`; correção de schema é etapa `[REQUER-PO]` separada,
REGRA #1/#8 do `CLAUDE.md`):

| Coluna | View | Tipo | O que é | Por que ficou como achado, não correção |
|---|---|---|---|---|
| `ncm_code` | `v_products_public` | `character varying(10)` | Classificação fiscal NCM/Mercosul do produto | Código de tarifa aduaneira — frequentemente público em nota fiscal/e-commerce BR, mas nunca houve decisão registrada de que pode sair sem máscara neste endpoint anônimo |
| `ncm_id` | `v_products_public` | `uuid` | FK para a tabela interna de classificação NCM | Mesma decisão de `ncm_code`; FK interna, não um valor fiscal em si, mas ainda é um identificador de tabela interna exposto |
| `bitrix_product_id` | `v_products_public` | `integer` | ID interno de correlação com o CRM Bitrix | Diferente de `bitrix_images_synced_at` (já mascarado `NULL` na mesma view) — revela superfície de integração interna; risco de enumeração/correlação com o CRM, não de vazamento de preço/PII direto |

Nenhuma das 3 é custo, preço negociado ou dado pessoal — por isso não é um
incidente equivalente ao P1 de 07-16 (grants de escrita) nem um vazamento de
margem. É, ainda assim, dado que nunca teve uma decisão explícita de
exposição registrada; por isso fica com status `REQUER-PO` na allowlist
(`.security/public-views-columns.json`, campo `sensitive_acknowledged`) em
vez de ser silenciosamente aceito.

`v_suppliers_public` — verificação dirigida por ser a view com maior
potencial de PII/credencial (fornecedor = pessoa jurídica com contato):
`cnpj`, `email`, `phone`, `api_credentials`, `api_base_url`, `api_key`,
`api_token`, `password`, `default_markup_percent` — **nenhuma presente** na
view (confirmado no `viewdef`, não só no contrato).

---

## 4. Comparação contrato × banco ao vivo `[RO]`

Comparação programática (não visual) das 265 colunas das 8 views, coluna a
coluna, contra `.security/public-views-columns.json`:

```
v_kit_component_media_public              OK  8 cols match
v_product_compositions_public              OK  5 cols match
v_product_properties_public                OK  5 cols match
v_product_tags_public                      OK  3 cols match
v_products_public                          OK  182 cols match
v_suppliers_public                         OK  11 cols match
v_tabela_preco_gravacao_oficial_public     OK  37 cols match
v_variant_sale_prices_public                OK  14 cols match
totalLive 265  totalContract 265
```

**0 divergências** — nem coluna presente na view e ausente do contrato, nem
o inverso. O arquivo já estava correto quando esta sessão começou (obra da
sessão anterior); esta sessão reconfirmou linha a linha, não assumiu.

`sensitive_acknowledged` (novo campo no contrato, adicionado na sessão
anterior, mantido): 5 entradas — as 3 `REQUER-PO` do §3 mais 2 `ACEITO`
(`custo_setup_por_cor`, `custo_manuseio_por_peca` — boolean, não valor
monetário).

---

## 5. Gate de CI (`scripts/check-public-views-drift.mjs`) `[RO — só leitura no Supabase]`

Substitui `scripts/check-public-views-columns.mjs` (mesmo contrato JSON,
mesma lógica de diff, renomeado nesta etapa/sessão anterior para o nome
pedido pelo plano). Duas checagens independentes, cada uma pode falhar
sozinha:
1. **Drift de colunas** — coluna nova ou removida vs. o contrato, e qualquer
   coluna da lista `forbidden` de uma view que apareça ao vivo.
2. **Padrão sensível** — qualquer coluna (do contrato ou ao vivo) que bata em
   `cost`/`custo`/`supplier_price`/`ncm`/`bitrix_*`/PII e não esteja em
   `masked_null` nem `sensitive_acknowledged` falha o gate (fail-closed: uma
   coluna sensível nova, fora do conjunto já reconhecido no §3, quebra o CI).

Script exportado (`export function`/`export const`) para ser testado sem
subprocess: `loadContract`, `validateContractStructure`,
`findUnacknowledgedSensitiveColumns`, `diffLive`, `PUBLIC_VIEWS`,
`SENSITIVE_PATTERNS`. Fetch live via `querySupabaseReadOnly` (mesmo helper de
`check-secdef-anon-drift.mjs`: Management API ou pg-meta local;
graceful-degradation para `static-pass`/`inconclusive` sem credencial, nunca
"passed" forjado).

### Evidência rodada nesta sessão

**Contra dados reais do banco** (fixture `--live` construído a partir da
consulta ao vivo do §1, não de credenciais fixas no CI):
```
$ node scripts/check-public-views-drift.mjs --live <fixture-com-265-colunas-reais>
ℹ️  5 achado(s) sensível(is) já reconhecido(s) (REQUER-PO, não corrigidos nesta etapa):
   - v_products_public.ncm_code [REQUER-PO] (ncm)
   - v_products_public.ncm_id [REQUER-PO] (ncm)
   - v_products_public.bitrix_product_id [REQUER-PO] (bitrix)
   - v_tabela_preco_gravacao_oficial_public.custo_setup_por_cor [ACEITO] (custo)
   - v_tabela_preco_gravacao_oficial_public.custo_manuseio_por_peca [ACEITO] (custo)
[public-views-drift] passed: 8 views OK (live); 5 achado(s) sensível(is) já reconhecido(s)
$ echo $?
0
```

**Drift simulado** (adicionando `cnpj` às colunas ao vivo de
`v_suppliers_public`, fixture local, sem tocar o banco):
```
✗ public-views-drift: 3 problema(s)
  - v_suppliers_public: colunas NOVAS no banco (revisar exposição ao anon): cnpj
  - v_suppliers_public: coluna PROIBIDA exposta no banco: cnpj
  - v_suppliers_public: coluna 'cnpj' (ao vivo) bate no padrão sensível 'pii-document' sem allowlist/máscara
[public-views-drift] failed: 3 problema(s) no contrato das 8 views públicas
$ echo $?
1
```
Confirma fail-closed: uma coluna sensível nova quebra o CI mesmo sem estar
na lista `forbidden` (a checagem de padrão sensível é independente da lista
`forbidden` por view).

### Testes

- `tests/security/public-views-columns.test.ts` (pré-existente, PR #1830,
  atualizado na sessão anterior para apontar ao script renomeado) — 7 testes,
  estilo subprocess (`spawnSync`), cobre "8 views no contrato", "sem
  credenciais/markup em `v_suppliers_public`", "sem custos internos em
  `v_tabela_preco_gravacao_oficial_public`", "colunas mascaradas
  documentadas", "passa hoje", "falha com coluna nova/proibida", "passa em
  modo live quando bate". **7/7 passam.**
- `tests/scripts/check-public-views-drift.test.mjs` (**novo nesta sessão**,
  faltava — item 6 do pedido pedia especificamente o padrão de
  `tests/scripts/check-types-inventory-drift.test.mjs`, que testa as funções
  puras por import direto, sem subprocess) — 13 testes: contrato real cobre
  as 8 views, validação estrutural do contrato real dá 0 erros,
  `ncm_code`/`ncm_id`/`bitrix_product_id` documentadas como `REQUER-PO`,
  `findUnacknowledgedSensitiveColumns` (masked_null ignorado,
  sensitive_acknowledged ignorado, coluna nova sensível reportada, padrões
  centrais presentes), `diffLive` (passa quando bate, falha com coluna nova,
  falha com coluna sensível nova incluindo o rótulo do padrão, falha com
  coluna `forbidden`, falha quando uma view do contrato sai do ar, falha
  quando aparece uma 9ª view SECDEF sem entrada no contrato). **13/13
  passam.**

```
$ npx vitest run tests/scripts/check-public-views-drift.test.mjs tests/security/public-views-columns.test.ts
 Test Files  2 passed (2)
      Tests  20 passed (20)
```

```
$ npx eslint scripts/check-public-views-drift.mjs tests/scripts/check-public-views-drift.test.mjs tests/security/public-views-columns.test.ts
(sem saída — 0 problemas)
```

`package.json`: `"check:public-views-drift": "node scripts/check-public-views-drift.mjs"`
(script já presente, adicionado na sessão anterior; sem alteração nesta).

---

## 6. Resumo para o checklist da E16

| Item do checklist | Status |
|---|---|
| 8/8 com definição, colunas e justificativa registradas | ✅ §1–§2 |
| Gate falha em teste com coluna extra e passa hoje | ✅ §5 — testado com dados reais (passa) e fixture de drift (falha), mais 20 testes automatizados |
| Nenhuma coluna de custo/fornecedor/PII exposta (lista explícita verificada) | ⚠️ **0 PII, 0 custo monetário real** — mas 3 colunas (`ncm_code`, `ncm_id`, `bitrix_product_id`) expõem dado sem máscara e sem decisão prévia registrada; agora documentadas como achado `REQUER-PO`, não corrigidas nesta etapa (fora do escopo `[GIT]`/`[RO]` desta etapa) |

**Achado que precisa de decisão do PO** (não bloqueante para fechar a E16,
que é sobre formalizar contrato + gate, não sobre corrigir exposição):
mascarar `ncm_code`/`ncm_id`/`bitrix_product_id` em `v_products_public` (como
já é feito para `bitrix_images_synced_at` e as outras 15 colunas
`masked_null`), ou decidir explicitamente que são aceitáveis e mudar o
status de `REQUER-PO` para `ACEITO` no contrato com uma nota assinada.
Qualquer uma das duas ações é uma migration (`CREATE OR REPLACE VIEW`) via o
caminho de E15 — fora do escopo `[GIT]` desta etapa.
