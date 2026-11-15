# DB ↔ Frontend Coverage Report

_Gerado em 2026-11-08T03:21:44.215Z por `scripts/audit-db-frontend-coverage.mjs`._

> **Como ler:** para cada coluna, classificamos como `READ`, `WRITE`, `READ+WRITE`, `ORPHAN` ou `SYSTEM`. `ORPHAN` = não encontramos referência no código (`src/`, `supabase/functions/`, `api/`). Pode ser falso-positivo se for usada apenas por triggers/RPCs.

## Sumário executivo

| Banco | Tabelas analisadas | Tabelas excluídas | Colunas | Órfãs | Cobertura média |
|---|---:|---:|---:|---:|---:|
| BD Interno (app) | 0 | 0 | 0 | 0 | 0% |
| BD Externo (produtos SSOT) | 5 | 0 | 104 | 38 | 49% |
| BD CRM (Bitrix mirror) | 5 | 0 | 137 | 86 | 30% |

## Top 20 tabelas com mais colunas órfãs

| Banco | Tabela | Módulo | Órfãs | Total | Cob. | Rows |
|---|---|---|---:|---:|---:|---:|
| BD CRM (Bitrix mirror) | `companies` | CRM | 38 | 58 | 30% | — |
| BD CRM (Bitrix mirror) | `contacts` | CRM | 23 | 37 | 30% | — |
| BD CRM (Bitrix mirror) | `company_addresses` | CRM | 15 | 21 | 17% | — |
| BD Externo (produtos SSOT) | `stock_movements` | Estoque | 12 | 16 | 20% | — |
| BD Externo (produtos SSOT) | `products` | Catálogo / Produtos | 11 | 58 | 80% | — |
| BD Externo (produtos SSOT) | `tecnicas_gravacao` | Outros | 7 | 13 | 42% | — |
| BD CRM (Bitrix mirror) | `contact_phones` | Outros | 7 | 12 | 22% | — |
| BD Externo (produtos SSOT) | `product_colors_view` | Catálogo / Produtos | 6 | 9 | 33% | — |
| BD CRM (Bitrix mirror) | `contact_emails` | Outros | 3 | 9 | 50% | — |
| BD Externo (produtos SSOT) | `print_areas` | Outros | 2 | 8 | 71% | — |

## BD Interno (app)

## BD Externo (produtos SSOT)

### Catálogo / Produtos

<details><summary><code>product_colors_view</code> — 33% cobertura, 6/9 órfãs, rows: — 🚫 _(tabela não referenciada no código)_</summary>

| Coluna | Tipo | Status |
|---|---|---|
| `name` | unknown | READ |
| `hex` | unknown | ORPHAN |
| `group` | unknown | ORPHAN |
| `groupSlug` | unknown | ORPHAN |
| `variationSlug` | unknown | ORPHAN |
| `code` | unknown | READ |
| `image` | unknown | ORPHAN |
| `images` | unknown | READ |
| `stock` | unknown | ORPHAN |

</details>

<details><summary><code>products</code> — 80% cobertura, 11/58 órfãs, rows: —</summary>

| Coluna | Tipo | Status |
|---|---|---|
| `id` | unknown | SYSTEM |
| `sku` | unknown | READ |
| `name` | unknown | READ |
| `description` | unknown | READ+WRITE |
| `short_description` | unknown | READ |
| `category_name` | unknown | READ |
| `brand` | unknown | READ |
| `sale_price` | unknown | READ |
| `base_price` | unknown | READ |
| `cost_price` | unknown | ORPHAN |
| `stock_quantity` | unknown | READ |
| `is_bestseller` | unknown | READ |
| `is_new` | unknown | READ |
| `is_kit` | unknown | READ |
| `supplier_code` | unknown | READ |
| `supplier_name` | unknown | READ |
| `image_url` | unknown | READ |
| `videos` | unknown | READ |
| `shortDescription` | unknown | ORPHAN |
| `price` | unknown | READ |
| `comparePrice` | unknown | ORPHAN |
| `category_id` | unknown | READ |
| `set_image_url` | unknown | READ |
| `og_image_url` | unknown | READ |
| `primary_image_url` | unknown | READ |
| `primary_image_blurhash` | unknown | ORPHAN |
| `primary_image_fallback_url` | unknown | ORPHAN |
| `images` | unknown | READ |
| `stock` | unknown | READ |
| `created_at` | unknown | SYSTEM |
| `updated_at` | unknown | SYSTEM |
| `colors` | unknown | READ |
| `materials` | unknown | READ |
| `supplier_reference` | unknown | ORPHAN |
| `is_active` | unknown | READ+WRITE |
| `minQuantity` | unknown | READ |
| `dimensions` | unknown | READ |
| `height_cm` | unknown | READ |
| `width_cm` | unknown | READ |
| `length_cm` | unknown | ORPHAN |
| `diameter_cm` | unknown | ORPHAN |
| `circumference_cm` | unknown | ORPHAN |
| `weight_g` | unknown | READ |
| `capacity_ml` | unknown | ORPHAN |
| `stock_status` | unknown | READ |
| `subcategory` | unknown | ORPHAN |
| `supplier_id` | unknown | READ |
| `category` | unknown | READ+WRITE |
| `supplier` | unknown | READ |
| `variations` | unknown | READ |
| `tags` | unknown | READ |
| `featured` | unknown | READ |
| `new_arrival` | unknown | READ |
| `on_sale` | unknown | READ |
| `kit_items` | unknown | READ |
| `min_quantity` | unknown | READ |
| `external_id` | unknown | READ |
| `metadata` | unknown | READ+WRITE |

</details>

### Estoque

<details><summary><code>stock_movements</code> — 20% cobertura, 12/16 órfãs, rows: — 🚫 _(tabela não referenciada no código)_</summary>

| Coluna | Tipo | Status |
|---|---|---|
| `id` | unknown | SYSTEM |
| `productId` | unknown | ORPHAN |
| `variantId` | unknown | ORPHAN |
| `colorName` | unknown | ORPHAN |
| `type` | unknown | READ |
| `quantity` | unknown | READ |
| `previousStock` | unknown | ORPHAN |
| `newStock` | unknown | ORPHAN |
| `reason` | unknown | READ |
| `reference` | unknown | ORPHAN |
| `referenceType` | unknown | ORPHAN |
| `unitCost` | unknown | ORPHAN |
| `totalCost` | unknown | ORPHAN |
| `createdAt` | unknown | ORPHAN |
| `createdBy` | unknown | ORPHAN |
| `createdByName` | unknown | ORPHAN |

</details>

### Outros

<details><summary><code>print_areas</code> — 71% cobertura, 2/8 órfãs, rows: — 🚫 _(tabela não referenciada no código)_</summary>

| Coluna | Tipo | Status |
|---|---|---|
| `id` | unknown | SYSTEM |
| `component_name` | unknown | READ |
| `location_name` | unknown | READ |
| `width_cm` | unknown | READ |
| `height_cm` | unknown | READ |
| `unit` | unknown | ORPHAN |
| `is_primary` | unknown | READ |
| `allowed_technique_ids` | unknown | ORPHAN |

</details>

<details><summary><code>tecnicas_gravacao</code> — 42% cobertura, 7/13 órfãs, rows: —</summary>

| Coluna | Tipo | Status |
|---|---|---|
| `id` | unknown | SYSTEM |
| `name` | unknown | READ |
| `technique_name` | unknown | READ |
| `code` | unknown | READ |
| `technique_code` | unknown | ORPHAN |
| `setup_cost` | unknown | READ |
| `setup_price` | unknown | ORPHAN |
| `unit_cost` | unknown | READ |
| `handling_price` | unknown | ORPHAN |
| `max_colors` | unknown | ORPHAN |
| `min_area_cm2` | unknown | ORPHAN |
| `max_area_cm2` | unknown | ORPHAN |
| `sla_days` | unknown | ORPHAN |

</details>

## BD CRM (Bitrix mirror)

### CRM

<details><summary><code>companies</code> — 30% cobertura, 38/58 órfãs, rows: —</summary>

| Coluna | Tipo | Status |
|---|---|---|
| `id` | unknown | SYSTEM |
| `razao_social` | unknown | READ |
| `nome_fantasia` | unknown | READ |
| `title` | unknown | READ |
| `cnpj` | unknown | READ |
| `ramo_atividade` | unknown | READ |
| `status` | unknown | READ |
| `source` | unknown | READ |
| `is_customer` | unknown | READ |
| `is_supplier` | unknown | READ |
| `is_carrier` | unknown | ORPHAN |
| `is_matriz` | unknown | ORPHAN |
| `logradouro` | unknown | ORPHAN |
| `numero` | unknown | ORPHAN |
| `complemento` | unknown | ORPHAN |
| `bairro` | unknown | ORPHAN |
| `cidade` | unknown | READ |
| `estado` | unknown | READ |
| `cep` | unknown | ORPHAN |
| `pais` | unknown | ORPHAN |
| `endereco` | unknown | ORPHAN |
| `endereco_faturamento` | unknown | ORPHAN |
| `inscricao_estadual` | unknown | READ |
| `inscricao_municipal` | unknown | ORPHAN |
| `cnae_principal` | unknown | ORPHAN |
| `cnae_descricao` | unknown | ORPHAN |
| `website` | unknown | READ |
| `instagram` | unknown | READ |
| `facebook` | unknown | ORPHAN |
| `linkedin` | unknown | ORPHAN |
| `logo_url` | unknown | READ |
| `grupo_economico` | unknown | ORPHAN |
| `grupo_economico_id` | unknown | ORPHAN |
| `matriz_id` | unknown | ORPHAN |
| `central_id` | unknown | ORPHAN |
| `singular_id` | unknown | ORPHAN |
| `tipo_cooperativa` | unknown | ORPHAN |
| `employee_count` | unknown | ORPHAN |
| `annual_revenue` | unknown | ORPHAN |
| `financial_health` | unknown | ORPHAN |
| `bitrix_company_id` | unknown | ORPHAN |
| `bitrix_created_at` | unknown | ORPHAN |
| `bitrix_updated_at` | unknown | ORPHAN |
| `_deprecated_email` | unknown | ORPHAN |
| `_deprecated_phone` | unknown | ORPHAN |
| `_deprecated_phone_secondary` | unknown | ORPHAN |
| `tags_array` | unknown | ORPHAN |
| `challenges` | unknown | ORPHAN |
| `competitors` | unknown | ORPHAN |
| `search_vector` | unknown | ORPHAN |
| `deleted_at` | unknown | SYSTEM |
| `deleted_by` | unknown | ORPHAN |
| `user_id` | unknown | READ |
| `assigned_by_id` | unknown | ORPHAN |
| `created_by_id` | unknown | ORPHAN |
| `merge_notes` | unknown | ORPHAN |
| `created_at` | unknown | SYSTEM |
| `updated_at` | unknown | SYSTEM |

</details>

<details><summary><code>company_addresses</code> — 17% cobertura, 15/21 órfãs, rows: — 🚫 _(tabela não referenciada no código)_</summary>

| Coluna | Tipo | Status |
|---|---|---|
| `id` | unknown | SYSTEM |
| `company_id` | unknown | ORPHAN |
| `tipo` | unknown | ORPHAN |
| `is_primary` | unknown | READ |
| `logradouro` | unknown | ORPHAN |
| `numero` | unknown | ORPHAN |
| `complemento` | unknown | ORPHAN |
| `bairro` | unknown | ORPHAN |
| `cidade` | unknown | READ |
| `estado` | unknown | READ |
| `cep` | unknown | ORPHAN |
| `pais` | unknown | ORPHAN |
| `google_maps_url` | unknown | ORPHAN |
| `google_place_id` | unknown | ORPHAN |
| `latitude` | unknown | ORPHAN |
| `longitude` | unknown | ORPHAN |
| `horario_funcionamento` | unknown | ORPHAN |
| `instrucoes_entrega` | unknown | ORPHAN |
| `ponto_referencia` | unknown | ORPHAN |
| `created_at` | unknown | SYSTEM |
| `updated_at` | unknown | SYSTEM |

</details>

<details><summary><code>contacts</code> — 30% cobertura, 23/37 órfãs, rows: —</summary>

| Coluna | Tipo | Status |
|---|---|---|
| `id` | unknown | SYSTEM |
| `company_id` | unknown | ORPHAN |
| `first_name` | unknown | READ |
| `last_name` | unknown | READ |
| `full_name` | unknown | READ |
| `nome_tratamento` | unknown | ORPHAN |
| `apelido` | unknown | ORPHAN |
| `cargo` | unknown | READ |
| `departamento` | unknown | READ |
| `role` | unknown | READ |
| `cpf` | unknown | ORPHAN |
| `sexo` | unknown | ORPHAN |
| `birthday` | unknown | ORPHAN |
| `data_nascimento` | unknown | ORPHAN |
| `linkedin` | unknown | ORPHAN |
| `instagram` | unknown | READ |
| `notes` | unknown | READ |
| `source` | unknown | READ |
| `sentiment` | unknown | ORPHAN |
| `relationship_score` | unknown | ORPHAN |
| `relationship_stage` | unknown | ORPHAN |
| `behavior` | unknown | ORPHAN |
| `hobbies` | unknown | ORPHAN |
| `interests_array` | unknown | ORPHAN |
| `tags_array` | unknown | ORPHAN |
| `bitrix_contact_id` | unknown | ORPHAN |
| `deleted_at` | unknown | SYSTEM |
| `deleted_by` | unknown | ORPHAN |
| `user_id` | unknown | READ |
| `assigned_by_id` | unknown | ORPHAN |
| `created_at` | unknown | SYSTEM |
| `updated_at` | unknown | SYSTEM |
| `_deprecated_email` | unknown | ORPHAN |
| `_deprecated_phone` | unknown | ORPHAN |
| `_deprecated_whatsapp` | unknown | ORPHAN |
| `emails` | unknown | ORPHAN |
| `phones` | unknown | ORPHAN |

</details>

### Outros

<details><summary><code>contact_emails</code> — 50% cobertura, 3/9 órfãs, rows: — 🚫 _(tabela não referenciada no código)_</summary>

| Coluna | Tipo | Status |
|---|---|---|
| `id` | unknown | SYSTEM |
| `contact_id` | unknown | READ |
| `email` | unknown | READ |
| `email_normalizado` | unknown | ORPHAN |
| `email_type` | unknown | ORPHAN |
| `is_primary` | unknown | READ |
| `is_verified` | unknown | ORPHAN |
| `created_at` | unknown | SYSTEM |
| `updated_at` | unknown | SYSTEM |

</details>

<details><summary><code>contact_phones</code> — 22% cobertura, 7/12 órfãs, rows: — 🚫 _(tabela não referenciada no código)_</summary>

| Coluna | Tipo | Status |
|---|---|---|
| `id` | unknown | SYSTEM |
| `contact_id` | unknown | READ |
| `numero` | unknown | ORPHAN |
| `numero_normalizado` | unknown | ORPHAN |
| `numero_e164` | unknown | ORPHAN |
| `phone_type` | unknown | ORPHAN |
| `is_primary` | unknown | READ |
| `is_whatsapp` | unknown | ORPHAN |
| `is_verified` | unknown | ORPHAN |
| `observacao` | unknown | ORPHAN |
| `created_at` | unknown | SYSTEM |
| `updated_at` | unknown | SYSTEM |

</details>

## Avisos / falsos-positivos esperados

- **Colunas usadas só por triggers ou RPCs** aparecem como `ORPHAN`. Confira `pg_proc`/`information_schema.routines` antes de remover.
- **Edge functions internas (cron, webhooks)** podem escrever sem exposição no front — `WRITE` sem `READ` é normal nesses casos.
- **External DB e CRM** foram inferidos a partir dos tipos TS do repo (`src/types/*.ts`); colunas existentes no BD remoto mas ausentes do tipo NÃO aparecem aqui. Para cobertura 100%, adicione operação `introspect` aos bridges.
- **`rows`** reflete o ambiente onde o script rodou. Em sandbox tipicamente é 0; em produção use `npm run audit:db-frontend` no contexto correto.
