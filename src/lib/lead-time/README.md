# Prazo de produção (`src/lib/lead-time`)

Funções puras. Sem React, sem Supabase, sem relógio: "hoje" e os feriados entram por parâmetro.
Datas são texto `AAAA-MM-DD` (dia civil de America/Sao_Paulo), sem depender do fuso da máquina.
Erro de entrada e dado faltante são **devolvidos** (`{ ok: false, issue }`), nunca lançados; isso inclui `null`/`undefined` onde o tipo pede lista ou objeto e regra fora de `max|sum`. A personalização devolve `issues` (todas as pendências do item; `issue` é a primeira).
Prazos são sempre em **dias úteis** (sáb, dom e feriados não contam).

| Arquivo                      | O que faz                                                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `businessDays.ts`            | `addBusinessDays(início, dias, feriados)` e `businessDaysBetween(início, fim, feriados)`                                                    |
| `supplierLeadTime.ts`        | `resolveSupplierLeadTime(produto, fornecedor)`: padrão do fornecedor, exceção do produto ou faltando                                        |
| `personalizationLeadTime.ts` | `resolvePersonalizationLeadTime(item, personalizações, lookup, regra)`: prazo cadastrado, senão faixa da tabela; combina por `max` ou `sum` |
| `productionLeadTime.ts`      | `computeProductionLeadTime(orçamento, config, feriados, hoje)`: fornecedor + personalização + folga por item, pedido = maior, `readyDate`   |
| `types.ts`                   | tipos de entrada e saída                                                                                                                    |

## De onde vem cada campo (tipos de entrada)

| Campo                                                                     | Coluna                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ProductLeadTimeInput.leadTimeDays`                                       | `products.lead_time_days`                                                                                                                                                                                              |
| `SupplierLeadTimeInput.defaultLeadTimeDays`                               | `supplier_settings.default_lead_time_days`                                                                                                                                                                             |
| `QuoteLeadTimeItem.quantity`, `.product.productId`                        | `quote_items.quantity`, `quote_items.product_id` (nullable: 4 de 13 linhas em produção; item sem produto o chamador não envia e mostra como pendência nomeada)                                                         |
| `QuoteLeadTimeInput.approvedOn`                                           | `quotes.approved_at` é timestamptz: quem chama converte para o dia civil em America/Sao_Paulo (cortar 10 caracteres em UTC erra o dia após 21h de Brasília)                                                            |
| `PersonalizationInput.locationCode` / `.quantity`                         | `quote_item_personalizations.location_code` / `.personalized_quantity` (null = quantidade do item)                                                                                                                     |
| `PersonalizationInput.techniqueId`                                        | `quote_item_personalizations.technique_id` = `print_area_techniques.id` (2 de 2 linhas em produção, mesmo produto e local). O hook lê essa linha e passa o `tabela_preco_id` dela (`tabela_preco_gravacao_oficial.id`) |
| `PrintAreaTechniqueInput`                                                 | `print_area_techniques.product_id`, `.location_code`, `.tabela_preco_id`, `.production_days` (coluna ainda não existe; null = usa a tabela). Quem chama filtra `is_active = true` (o tipo não tem `is_active`)         |
| `PriceBandInput`                                                          | `tabela_preco_gravacao_oficial_faixa.tabela_preco_gravacao_id`, `.quantidade_minima`, `.quantidade_maxima` (null = sem teto), `.prazo_dias`                                                                            |
| `ProductionLeadSettings.internalBufferDays` / `.multiPersonalizationRule` | `freight_settings.internal_buffer_days` / `.multi_personalization_rule`                                                                                                                                                |

## Regras

- Fornecedor: produto sem prazo ou igual ao padrão = `supplier_default`; diferente = `product_exception`; nenhum = `supplier_lead_time` faltando.
- Personalização: `print_area_techniques.production_days` (`registered`); senão a faixa da tabela de preço com `quantidade_minima <= qtd <= quantidade_maxima` (`price_table`); sem faixa = `personalization_lead_time` faltando; a lista de pendências traz todas as personalizações do item. Faixas repetidas com prazos diferentes valem o maior.
- Vários itens de personalização: `max` (em paralelo) ou `sum` (em sequência).
- Item = fornecedor + personalização + folga interna. Pedido = maior item (`isCritical`; empate marca todos). Pronto em `addBusinessDays(aprovação ou hoje, total, feriados)`; total 0 com início em dia não útil avança ao próximo dia útil (`addBusinessDays` com 0 devolve o mesmo dia).
- Teto técnico de 3650 dias úteis em `addBusinessDays`/`businessDaysBetween`: acima disso, `invalid_input`.
- Qualquer faltante: `status: 'dados_insuficientes'`, sem `readyDate`, com `missing[]`.
