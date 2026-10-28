# A.9 — Integridade Extra: _id sem FK e Tipos Suspeitos
_Auditoria read-only · 2026-10-27_

---

## I1 — Colunas *_id sem FK (amostra — primeiras 80)

Resultado limitado a 80 para evitar overflow. O número real é muito maior.

Achados relevantes (excluindo tabelas `_archive_*`, `_backup_*`, `_bkp_*`):

| Tabela | Coluna | Tipo | Risco |
|---|---|---|---|
| admin_audit_log | user_id | uuid | FK ausente para auth.users |
| ai_enrichment_queue | organization_id | uuid | FK ausente |
| ai_insights_cache | user_id | uuid | FK ausente para auth.users |
| ai_routing_decisions | usage_log_id | uuid | FK ausente |
| ai_usage_events | user_id | uuid | FK ausente para auth.users |
| analytics_events | user_id | uuid | FK ausente para auth.users |
| art_file_attachments | mockup_id, quote_id, user_id | uuid | FK ausente |
| asia_upload_mapping | queue_id | uuid | FK ausente |
| attribute_equivalences | organization_id | uuid | FK ausente |
| audit_log | entity_id | uuid | FK ausente (polimórfico esperado) |
| collection_item_reactions | collection_id, item_id | uuid | FK ausente |
| collection_items_trash | collection_id, user_id | uuid | FK ausente |
| collections | user_id | uuid | FK ausente para auth.users |
| ... | ... | ... | (mais 50+ na lista) |

**Nota:** A ausência de FK formal para `auth.users` é estrutural no Supabase (tabelas de auth são gerenciadas pelo GoTrue). Porém FKs entre tabelas `public.*` devem existir para integridade referencial.

---

## I2 — Tipos Suspeitos em Colunas de Preço/Data

### Tipo ARRAY para preço — ALTO
```
product_customization_prices.price → ARRAY
```
Um campo de preço como array é incomum e potencialmente problemático: ordenação, comparação, índices e joins são não-triviais. Verificar se é intencional (ex: faixas de preço por quantidade).

### Preços como TEXT em views — BAIXO
```
vw_spot_price_alerts.price1_raw → text
vw_spot_price_alerts.price_alert → text
```
Views de alertas de preço com campo de preço como texto. Aceitável em views de monitoramento/alerta onde o dado vem de fonte externa (SPOT) como texto. Não há risco direto, mas formataçõe/comparações numéricas devem usar CAST explícito.

### Colunas *_at como timestamptz — OK
Todas as colunas `*_at` e `*_date` verificadas usam `timestamp with time zone` — correto.

### Outros suspeitos (contextuais, não problemáticos)
- `commemorative_dates.variable_date_rule` como `text` — regra de cálculo de data, texto é adequado
- `ai_providers.api_format`, `auth_format` — descritores de formato, texto OK
