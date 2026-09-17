# E45 — `products` (184 colunas): comentário, satélites e `product_physical`

**[REQUER-PO]** (só o item 1, correção do `COMMENT ON TABLE` — os demais itens
são achados/documentação, não DDL). Aplicação do item 1 via E15
(`.github/workflows/db-apply-migration.yml`), nunca `supabase db push`.

Migration: `supabase/migrations/20260917110000_e45_fix_products_comment.sql`
Plano: `docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` (E45)

## Método

Consulta via `pg_catalog`/`information_schema` (MCP `execute_sql`, leitura),
nunca PostgREST — REGRA #8. Contagem de colunas confirmada com
`information_schema.columns`; comentário atual lido com `obj_description`;
satélites identificados via `pg_trigger`/`pg_proc` (funções `fn_sync_product_*`
disparadas em `products`, não o inverso).

## Achado #1 — comentário desatualizado (confirmado)

`COMMENT ON TABLE products` afirma **152 colunas** ("ESTADO 2026-06-23").
Contagem real hoje: **184**. Diferença de 32 colunas desde a última
atualização do comentário — o comentário não foi mantido em sincronia com
o schema (P4 do plano, aberto). Corrigido pela migration desta etapa (só
atualiza o `COMMENT`, nenhuma coluna é alterada).

## Achado #2 — os "5 satélites 1:1 por trigger" existem e estão bem documentados

Identificados via trigger em `products` que sincroniza para uma tabela satélite:

| Satélite | Trigger em `products` | Domínio (do próprio `COMMENT ON TABLE` do satélite) | Colunas de domínio espelhadas em `products` (excl. `id`/`created_at`/`updated_at`) |
|---|---|---|---|
| `product_seo` | `trg_sync_product_seo` → `fn_sync_product_seo_on_change` | meta/OG/schema/robots/canonical, `seo_score`, `seo_issues` | 15 |
| `product_ai_content` | `trg_sync_product_ai_content` → `fn_sync_product_ai_on_change` | `ai_title`, `ai_description`, `ai_summary`, `ai_version`, `ai_model`, `ai_generated_at`, `key_benefits`, `use_cases` | 11 |
| `product_fiscal` | `trg_sync_product_fiscal` → `fn_sync_product_fiscal_on_change` | `ncm_id`, `ncm_code`, `ipi_rate`, `tax_reference_state`, `ean`, `gtin`, `warranty_months` | 11 |
| `product_supply` | `trg_sync_product_supply` → `fn_sync_product_supply_on_change` | `supply_mode`, `lead_time_days`, `is_imported`, `origin_country`, `last_sync_at`, `sync_status`, `supplier_updated_at` | 10 (7 de domínio) |
| `product_physical` | `trg_sync_product_physical` → `fn_trg_sync_physical_on_product_update` | dimensões/embalagem | 20 (17 de domínio) |

Todos os 5 têm `COMMENT ON TABLE` próprios, com tag `[fix_version:...]` e
descrição do propósito — arquitetura já intencional e documentada, não
acidental. Total de colunas de `products` já espelhadas em algum satélite:
**~67 de 184 (36%)**.

## Achado #3 — `product_physical` já está documentado como write-only (checklist item 3: já cumprido)

O plano pede (item 3) *"documentar `product_physical` como buffer
write-only no catálogo (`COMMENT ON TABLE`) para ninguém 'limpar'"*.
Comentário atual (já existe, `[ARQ 2026-06-26]`):

> *"Satélite physical (buffer WRITE-ONLY; não lido por view/função/FK). SoT
> = products; v_products_public lê dimensões de products. Mantido por
> trigger trg_sync_product_physical (...). NÃO DROPAR enquanto
> fn_promote_padronizacao/fn_site_promote_to_gold/fn_asia_site_promote_to_gold
> gravarem aqui (risco de HALT do cron de promoção sob regeneração do bot
> Lovable)."*

**Nenhuma ação necessária neste item** — já cumpre exatamente o que o plano
pede, incluindo o motivo de não remover. Marcado como concluído no
checklist abaixo.

## Achado #4 — inventário coluna → consumidor: concluído em 2026-09-17

Bloqueio da revisão anterior (Bash/subagente indisponíveis por
instabilidade do classificador de segurança) não reproduziu nesta sessão —
grep completo executado.

**Método:** `rg -w --fixed-strings <coluna>` para cada uma das 184 colunas
em `src/` e `supabase/functions/`, excluindo o stub gerado
(`src/integrations/supabase/types.ts`). Para as colunas com zero ocorrência
em código de app, checagem complementar ao vivo (`pg_catalog`, leitura) por
referência textual (`\m...\M`, word-boundary) em `pg_views.definition`
(views de `public`), `pg_get_functiondef` (todas as funções de `public`) e
`pg_get_triggerdef` (triggers não-internos) — cobre os 3 lugares pedidos
pelo item do plano (`src/`, views, funções).

**17 colunas sem hit em `src/`/`supabase/functions/`:**
`certificate_files`, `weight_gr`, `related_references`,
`engraving_description`, `sub_brand`, `sub_brand_id`, `supplier_categories`,
`catalog_schema`, `packing_type_canonical`, `surface_finish`,
`price_last_verified_at`, `dimensions_source`, `modo_de_uso`, `is_closeout`,
`xbz_stock_reliability_id`, `xbz_stock_reliability_text`, `padronizacao_id`.

Dessas 17, **11 têm referência em view, função ou trigger** de `public`
(consumo existe, só não é direto do app — ex.: `dimensions_source` e
`surface_finish` são lidas por `v_products_public`; `supplier_categories` e
`related_references` aparecem em função e trigger; `padronizacao_id` e
`price_last_verified_at` em view e função): `certificate_files`,
`dimensions_source`, `engraving_description`, `modo_de_uso`,
`packing_type_canonical`, `padronizacao_id`, `price_last_verified_at`,
`related_references`, `sub_brand_id`, `supplier_categories`,
`surface_finish`.

**6 colunas sem nenhuma referência encontrada** (nem `src/`, nem
`supabase/functions/`, nem view/função/trigger de `public`) — candidatas
genuínas a "sem leitor", dentro do domínio Core/Counters/Cache/Flags (sem a
explicação estrutural do satélite):

| Coluna | Domínio | Observação |
|---|---|---|
| `catalog_schema` | Core | tipo `jsonb`; sem hit em nenhuma das 4 fontes checadas |
| `is_closeout` | Flags | par de flags (`is_seasonal`, `is_online_exclusive`, etc. têm hit; esta não) |
| `sub_brand` | Core | `sub_brand_id` (FK companheira) tem hit em função; `sub_brand` (texto) não |
| `weight_gr` | Físico residual | parte do Achado #5 (grupo "físico residual" ainda não satelitado — coerente com zero leitor, candidata natural a entrar na extensão futura de `product_physical`) |
| `xbz_stock_reliability_id` | Core/integração XBZ | par completo (`_id`/`_text`) sem nenhum hit — possível feature staged, não conectada |
| `xbz_stock_reliability_text` | Core/integração XBZ | idem |

**Este achado é só levantamento** — não indica ação (DROP, etc.) por si só;
"sem leitor" medido por grep estático não prova "sem leitor há 90 dias" no
sentido temporal do item do plano (seria preciso `pg_stat` de acesso a
coluna, que Postgres não expõe nativamente) nem descarta consumo por
ferramenta externa (dashboard BI, export). Registrado para decisão futura
do PO, não para ação nesta etapa.

## Achado #5 — proposta de decomposição (sem DDL, conforme pedido)

Domínios restantes em `products` além dos 5 já satelitados:

- **Core** (identidade/preço/status): `id`, `sku`, `name`, `slug`,
  `category_id`, `supplier_id`, `price`-equivalentes (`cost_price`,
  `sale_price`, `suggested_price`), `is_active`, `is_deleted`, timestamps.
  Lido em **todo** SELECT de produto — não é candidato a satelitar (viraria
  join obrigatório no caminho mais quente do sistema).
- **Counters/Cache** (`view_count`, `order_count`, `favorite_count`,
  `stock_quantity`, `images`, `primary_image_url`, `color_swatches`,
  `colors`, `materials`, `tags`, `videos`): já são denormalizações
  intencionais de tabelas filhas reais (`product_views`, `product_images`,
  `product_variants`, `product_materials`, `product_tags`,
  `product_videos`) mantidas por trigger para evitar join na leitura.
  Satelitar essas colunas de volta **reintroduziria** o join que a
  denormalização existe para evitar — não recomendado.
- **Flags** (`is_bestseller`, `is_new`, `is_featured`, `is_on_sale`,
  `is_seasonal`, `is_kit`, `is_textil`, `is_thermal`,
  `is_online_exclusive`, `is_closeout`, `is_stockout`, `locked_fields`, e
  os `*_expires_at` companheiros): booleans de exibição, lidos junto do
  Core em quase toda query de catálogo. Mesma lógica do Core — não
  recomendado satelitar.
- **Físico/dimensões residual**: `product_physical` cobre só 17 das ~37
  colunas físicas/dimensão/embalagem/frete existentes em `products` (ex.:
  `shipping_*`, `freight_class`, `default_carrier`,
  `requires_special_shipping`, `cubic_weight`, `weight_gr`, `capacities`,
  `surface_finish`, `dimensions_display`, `dimensions_source`, `box_*_mm` —
  duplicatas em mm dos `box_*_cm` já satelitados, `box_image`,
  `box_inner_quantity`, `has_capacity`, `pvc_free`). Esta é a única lacuna
  de decomposição genuína e de baixo risco: **completar a migração do
  satélite `product_physical`** já existente (não criar um satélite novo)
  para as ~20 colunas físicas restantes, seguindo o padrão já em produção
  (COALESCE products→physical no trigger, satélite write-only). Estimativa:
  `Esforço: M` (estender 1 trigger + 1 `ALTER TABLE ADD COLUMN` × ~20 +
  migração de leitores, se algum existir — depende do Achado #4).

**Recomendação:** não abrir nenhum satélite novo agora. Único item com ROI
claro é completar `product_physical` (residual de ~20 colunas físicas) —
proposto como etapa futura própria, não executado aqui.

## Checklist de conclusão (do plano)

- [x] Comentário = 184 (migration preparada, aguardando aprovação)
- [x] Inventário coluna → consumidores publicado — ver Achado #4 (grep completo das 184 colunas em `src/`, `supabase/functions/`, views e funções de `public`; 6 candidatas genuínas a "sem leitor")
- [x] `product_physical` comentado no catálogo — **já estava feito antes desta etapa**, confirmado
- [x] Proposta de decomposição com estimativa, sem DDL — ver Achado #5 (recomendação: nenhum satélite novo; completar `product_physical` como única lacuna com ROI)

## Resumo para aprovação

| Ação | Objeto | Efeito | Risco |
|---|---|---|---|
| `COMMENT ON TABLE products IS '...'` | `public.products` | Só metadado (pg_catalog); zero efeito em dado/estrutura/leitura | Nenhum |

**[REQUER-PO]** — aguardando aprovação para o item 1 (comentário). Os
demais achados desta etapa não exigem aprovação (documentação/análise, sem
DDL) e já estão refletidos neste documento.
