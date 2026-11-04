-- Tabela de auditoria: preserva rastreabilidade antes de limpar stagings
CREATE TABLE public.image_import_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cloudflare_image_id VARCHAR(200),
  product_id UUID,
  source_type VARCHAR(20) NOT NULL,  -- 'import_zip', 'xbz', 'somarcas', 'scraper'
  source_zip VARCHAR(255),
  source_url TEXT,
  parsed_sku VARCHAR(20),
  parsed_color_code VARCHAR(20),
  supplier_ref_id VARCHAR(100),      -- woo_image_id, d_number, image_id_site
  sha256_hash TEXT,
  import_status VARCHAR(30),
  error_message TEXT,
  original_created_at TIMESTAMPTZ,
  imported_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_image_import_log_cloudflare ON public.image_import_log(cloudflare_image_id);
CREATE INDEX idx_image_import_log_sku ON public.image_import_log(parsed_sku);
CREATE INDEX idx_image_import_log_source ON public.image_import_log(source_type);

COMMENT ON TABLE public.image_import_log IS 
  'Log de auditoria de importação de imagens. Preserva rastreabilidade (de onde veio cada imagem) após limpeza das tabelas de staging.';
