-- Criar tabela e pipeline (versão corrigida com cf_custom_id único)

CREATE TABLE IF NOT EXISTS public.asia_legacy_upload_queue (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id        UUID NOT NULL REFERENCES products(id),
  source_url        TEXT NOT NULL,
  cf_custom_id      TEXT NOT NULL,
  supplier_code     TEXT NOT NULL DEFAULT 'asia',
  supplier_ref      TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','uploading','done','error','skip_404')),
  request_id        BIGINT,
  cf_image_id       TEXT,
  error_msg         TEXT,
  attempt_count     INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (product_id),
  UNIQUE (cf_custom_id)
);

CREATE INDEX IF NOT EXISTS idx_alq_status ON asia_legacy_upload_queue(status);
CREATE INDEX IF NOT EXISTS idx_alq_product ON asia_legacy_upload_queue(product_id);

-- Enfileirar — cf_custom_id = {supplier}-{product_id_8chars}-legacy-01 (garantidamente único)
INSERT INTO asia_legacy_upload_queue (product_id, source_url, cf_custom_id, supplier_code, supplier_ref)
SELECT
  p.id,
  p.primary_image_url,
  CONCAT(
    CASE WHEN p.primary_image_url ILIKE '%asiaimport%' THEN 'asia' ELSE 'xbz' END,
    '-',
    REPLACE(LEFT(p.id::text, 8), '-', ''),  -- primeiros 8 chars do UUID (único)
    '-legacy'
  ) AS cf_custom_id,
  CASE WHEN p.primary_image_url ILIKE '%asiaimport%' THEN 'asia' ELSE 'xbz' END,
  p.supplier_reference
FROM products p
WHERE p.is_active = true
  AND p.primary_image_url IS NOT NULL
  AND p.primary_image_url NOT LIKE 'https://imagedelivery.net%'
ON CONFLICT (product_id) DO NOTHING;

-- Verificar contagem
SELECT COUNT(*), COUNT(*) FILTER (WHERE status='pending') AS pending
FROM asia_legacy_upload_queue;;
