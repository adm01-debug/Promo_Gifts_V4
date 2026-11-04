# public.product_qa_image_alerts

> Tabela de qualidade: rastreia produtos ativos que foram ativados ou encontrados sem imagem.
Regra de negócio violada: "nenhum produto ativo pode existir sem ao menos uma imagem".

━━━ CICLO DE VIDA DE UM ALERTA ━━━
ABERTO    → is_resolved=false, resolved_at=NULL
RESOLVIDO → is_resolved=true,  resolved_at=timestamp, resolution_notes=motivo

━━━ FONTES DE CRIAÇÃO (2 caminhos) ━━━
1. Trigger em tempo real  — products: BEFORE UPDATE
   Função: fn_qa_alert_on_activate_without_image()
   Gatilho: qualquer UPDATE que mude is_active de false/NULL → true
   Efeito: além do alerta, seta products.sync_status = 'activated_no_image' (18 chars, MAX varchar(20))
   
2. Varredura periódica — pg_cron 'qa-imageless-products' (a cada 30 minutos)
   Função: fn_qa_scan_imageless_products()
   Detecta produtos que escaparam do trigger (ex.: criados diretamente em pipeline mode)
   Também auto-resolve alertas de produtos que já sanaram a situação

━━━ AUTO-RESOLUÇÃO (fn_qa_scan_imageless_products) ━━━
Um alerta aberto é marcado is_resolved=true automaticamente quando:
  • O produto recebeu uma imagem  (row ativa em product_images, primary_image_url, ou images JSONB)
  • O produto foi desativado      (is_active=false)
  • O produto foi deletado        (is_deleted=true)
Para forçar uma varredura manual: SELECT * FROM fn_qa_scan_imageless_products();

━━━ RELACIONAMENTOS ━━━
• products (FK product_id, ON DELETE CASCADE) — produto monitorado
• supplier_id, sku_promo, product_name        — denormalizados no momento do alerta
  (para leitura rápida sem JOIN, mesmo se o produto for deletado depois)

━━━ QUEM ALIMENTA / CONSOME ━━━
Escreve:  trigger fn_qa_alert_on_activate_without_image() | fn_qa_scan_imageless_products()
Lê:       dashboards de qualidade | rotinas de re-ativação pós-imagem | n8n workflows de alerta
NÃO deve ser editado manualmente — gerenciado exclusivamente pelas funções acima.

━━━ ÍNDICES ━━━
• idx_pqia_product_id   — busca por produto
• idx_pqia_is_resolved  — WHERE is_resolved=false (alertas abertos)
• idx_pqia_detected_at  — ordenação por data de detecção


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
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  | PK UUID gerada automaticamente (gen_random_uuid). Nunca reutilizar. |
| 2 | `product_id` | `uuid` | não |  |  | FK → products.id  \|  ON DELETE CASCADE. O produto que gerou o alerta. Se o produto for deletado, o alerta é removido em cascata. |
| 3 | `supplier_id` | `uuid` | sim |  |  | UUID do fornecedor no momento do alerta (denormalizado — cópia de products.supplier_id). Mantido mesmo após possível deleção do produto. Útil para filtrar alertas por fornecedor. Valores comuns: d6718a29 (XBZ) \| bcfc0d02 (SPOT) \| d2734e23 (Asia) \| 841cd690 (Só Marcas) |
| 4 | `sku_promo` | `text` | sim |  |  | SKU do produto no momento do alerta (denormalizado — cópia de products.sku_promo ou sku). Preenchido para facilitar leitura humana direta sem JOIN. |
| 5 | `product_name` | `text` | sim |  |  | Nome do produto no momento do alerta, truncado em 200 caracteres (denormalizado). Preenchido para leitura direta no dashboard sem precisar de JOIN com products. |
| 6 | `alert_type` | `text` | não | `'active_without_image'::text` |  | Tipo de violação detectada (NOT NULL, DEFAULT 'active_without_image'). Valor atual único: 'active_without_image' → produto ativo sem nenhuma imagem em lugar algum. Campo reservado para futuros tipos de alerta de QA (ex.: 'primary_url_desync', 'missing_alt_text'). |
| 7 | `detected_at` | `timestamp with time zone` | não | `now()` |  | Timestamp de quando a violação foi detectada (NOT NULL, DEFAULT now()). Pode diferir de created_at se a row for inserida com atraso. Para alertas criados pelo trigger: coincide com o momento do UPDATE em products. Para alertas criados pelo pg_cron: pode ter até 30 min de atraso. |
| 8 | `resolved_at` | `timestamp with time zone` | sim |  |  | Timestamp de quando o alerta foi marcado como resolvido (NULL = ainda aberto). Preenchido automaticamente por fn_qa_scan_imageless_products() quando a condição sanada. Pode também ser preenchido manualmente por uma resolução administrativa. |
| 9 | `is_resolved` | `boolean` | não | `false` |  | Estado do alerta (NOT NULL, DEFAULT false). false → ABERTO: violação ainda existe ou não foi verificada. true  → RESOLVIDO: produto recebeu imagem, foi desativado ou foi deletado. ⚠️ Nunca deletar rows resolvidas — manter histórico para auditoria e métricas de SLA. |
| 10 | `resolution_notes` | `text` | sim |  |  | Texto explicativo de como o alerta foi resolvido. Preenchido por:   • fn_qa_scan_imageless_products(): 'imagem detectada na varredura automática' \|     'produto desativado' \| 'produto deletado'   • Resolução manual: descrever a ação tomada pelo dev/operador. NULL = alerta ainda aberto ou resolvido sem nota. |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  | Timestamp de criação da row no banco (NOT NULL, DEFAULT now()). Imutável após inserção. Veja também detected_at, que registra quando a violação foi identificada pelo sistema. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_qa_image_alerts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_qa_image_alerts_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pqia_is_resolved | btree | is_resolved | não | sim | `(is_resolved = false)` | `CREATE INDEX idx_pqia_is_resolved ON public.product_qa_image_alerts USING btree (is_resolved) WHERE (is_resolved = false)` |
| idx_pqia_product_id | btree | product_id | não | sim |  | `CREATE INDEX idx_pqia_product_id ON public.product_qa_image_alerts USING btree (product_id)` |
| product_qa_image_alerts_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_qa_image_alerts_pkey ON public.product_qa_image_alerts USING btree (id)` |


## Policies (RLS)

### `qa_alerts_admin_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `qa_alerts_admin_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `qa_alerts_admin_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `qa_alerts_read_authenticated`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
