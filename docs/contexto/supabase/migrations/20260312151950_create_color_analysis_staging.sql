-- Tabela de staging para análise de cores por imagem
CREATE TABLE color_analysis_staging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES product_variants(id),
  product_sku text,
  variant_sku text,
  image_url text NOT NULL,
  
  -- Cor nativa do fornecedor
  supplier_color_name text,  -- Ex: "AZUL"
  
  -- Resultado da análise de imagem
  detected_hex text,         -- Ex: "#2B375B"  
  detected_rgb_r int,
  detected_rgb_g int,
  detected_rgb_b int,
  blue_pixel_count int,      -- Qtd pixels da cor dominante
  total_pixel_count int,     -- Total pixels analisados
  
  -- Match com catálogo
  current_variation_id uuid REFERENCES color_variations(id),
  current_variation_name text,
  suggested_variation_id uuid REFERENCES color_variations(id),
  suggested_variation_name text,
  suggested_hex text,
  match_distance numeric,    -- Distância euclidiana RGB
  
  -- Controle
  needs_review boolean DEFAULT false,  -- Se sugestão difere do atual
  reviewed boolean DEFAULT false,
  approved boolean,
  processed_at timestamptz DEFAULT NOW(),
  
  -- Organização
  organization_id uuid DEFAULT '5db5aee1-064b-4ef4-9193-345dcd8274ea'
);

CREATE INDEX idx_cas_variant ON color_analysis_staging(variant_id);
CREATE INDEX idx_cas_needs_review ON color_analysis_staging(needs_review) WHERE needs_review = true;
CREATE INDEX idx_cas_supplier_color ON color_analysis_staging(supplier_color_name);

COMMENT ON TABLE color_analysis_staging IS 'Resultado da análise automatizada de cores por imagem dos produtos XBZ. Workflow N8N analisa pixels das fotos do Cloudflare e sugere a color_variation mais próxima.';
