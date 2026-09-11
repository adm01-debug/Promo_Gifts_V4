
-- Batch 4: SEO + AI + Novidades + Bitrix
COMMENT ON COLUMN public.products.meta_title IS 'Title SEO gerado por trigger trg_products_seo_autofill a partir de name. Max 60 chars.';
COMMENT ON COLUMN public.products.meta_description IS 'Meta description SEO. Gerada por trigger a partir de name+description. Max 160 chars.';
COMMENT ON COLUMN public.products.meta_keywords IS 'Keywords SEO (array text). Extraídas por extract_keywords() a partir de name+description+category.';
COMMENT ON COLUMN public.products.canonical_url IS 'URL canônica SEO (/produto/{slug}). Gerada por trigger.';
COMMENT ON COLUMN public.products.og_title IS 'Open Graph title. Default = meta_title. Social sharing.';
COMMENT ON COLUMN public.products.og_description IS 'Open Graph description. Default = meta_description.';
COMMENT ON COLUMN public.products.og_image_url IS 'Open Graph image. Default = primary_image_url.';
COMMENT ON COLUMN public.products.seo_score IS 'Score SEO 0-100 calculado por fn_refresh_product_satellites. Auditoria.';
COMMENT ON COLUMN public.products.seo_last_audit_at IS 'Timestamp do último audit SEO.';
COMMENT ON COLUMN public.products.schema_json IS 'JSON-LD structured data para SEO (Product schema.org).';
COMMENT ON COLUMN public.products.novelty_detected_at IS 'Quando o produto foi detectado como novidade. Alimenta badge "Novo".';
COMMENT ON COLUMN public.products.novelty_expires_at IS 'Quando expira o badge de novidade.';
COMMENT ON COLUMN public.products.bitrix_product_id IS 'ID do produto no sistema Bitrix24 (ERP/CRM). 80% preenchido. Integração bidirecional.';
COMMENT ON COLUMN public.products.bitrix_images_synced_at IS 'Timestamp do último sync de imagens com Bitrix24.';
COMMENT ON COLUMN public.products.is_featured_expires_at IS 'Quando expira o status de destaque (is_featured). NULL = permanente.';
COMMENT ON COLUMN public.products.is_bestseller_expires_at IS 'Quando expira o status bestseller. NULL = permanente.';
COMMENT ON COLUMN public.products.is_new_expires_at IS 'Quando expira o status de novo. NULL = permanente.';
COMMENT ON COLUMN public.products.price_updated_at IS 'Timestamp da última atualização de preço (sale_price ou cost_price).';
COMMENT ON COLUMN public.products.price_verified_at IS 'Timestamp da última verificação manual de preço.';
COMMENT ON COLUMN public.products.price_freshness_threshold_days IS 'FLAG-MORTA: constante 60. Threshold de frescor de preço em dias. CHECK range 1-365. 2026-06-23.';
COMMENT ON COLUMN public.products.supplier_type IS 'Tipo do fornecedor deste produto. Derivado de suppliers.type.';
COMMENT ON COLUMN public.products.supplier_subtype IS 'Subtipo do fornecedor. Derivado de suppliers.subtype.';
COMMENT ON COLUMN public.products.auto_material IS 'Material detectado automaticamente pelo pipeline de IA. Texto livre.';
COMMENT ON COLUMN public.products.capacity_ml IS 'Capacidade em ml (para copos, garrafas, canecas). Extraído do name por trigger.';
COMMENT ON COLUMN public.products.circumference_cm IS 'Circunferência em cm (calculada de diameter_cm × π para objetos cilíndricos).';
COMMENT ON COLUMN public.products.cubic_weight IS 'Peso cúbico (volume em cm³ / fator de cubagem do frete). Usado no cálculo de frete.';
;
