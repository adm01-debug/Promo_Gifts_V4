-- Landing zone: 1 linha por (produto, peca) extraida do PDF da ficha tecnica.
CREATE TABLE IF NOT EXISTS public.kit_component_ficha_staging (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_sku          varchar(50)  NOT NULL,
  product_id           uuid,
  piece_label          text         NOT NULL,
  piece_norm           text,
  piece_kind           varchar(12),                 -- item | packaging | outer_box
  dim_a_mm             int,                          -- Altura
  dim_l_mm             int,                          -- Largura
  dim_p_mm             int,                          -- Profundidade (so embalagem A x L x P)
  weight_g             int,                          -- peso por peca (normalmente NULL na ficha)
  raw_text             text,
  source               varchar(30)  NOT NULL DEFAULT 'xbz_ficha_pdf',
  source_url           text,
  parsed_at            timestamptz  NOT NULL DEFAULT now(),
  matched_component_id uuid,
  match_status         varchar(16)  NOT NULL DEFAULT 'pending',  -- pending|promoted|no_component|ambiguous|skipped
  match_confidence     numeric(4,3),
  promoted_at          timestamptz,
  notes                text,
  created_at           timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT chk_kcfs_dim_a CHECK (dim_a_mm IS NULL OR dim_a_mm BETWEEN 1 AND 20000),
  CONSTRAINT chk_kcfs_dim_l CHECK (dim_l_mm IS NULL OR dim_l_mm BETWEEN 1 AND 20000),
  CONSTRAINT chk_kcfs_dim_p CHECK (dim_p_mm IS NULL OR dim_p_mm BETWEEN 1 AND 20000),
  CONSTRAINT chk_kcfs_status CHECK (match_status IN ('pending','promoted','no_component','ambiguous','skipped'))
);
CREATE INDEX IF NOT EXISTS ix_kcfs_product ON public.kit_component_ficha_staging(product_sku);
CREATE INDEX IF NOT EXISTS ix_kcfs_status  ON public.kit_component_ficha_staging(match_status);
COMMENT ON TABLE public.kit_component_ficha_staging IS
  'Staging do parse da ficha tecnica (PDF XBZ). O job de ingestao (n8n/edge) insere 1 linha por peca; fn_promote_kit_ficha_staging casa cada peca ao componente e grava medida REAL respeitando procedencia.';

-- Helper de normalizacao de rotulo (remove "(A x L)", acentos, baixa caixa)
CREATE OR REPLACE FUNCTION public.fn_norm_piece_label(p text)
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT btrim(regexp_replace(
           lower(extensions.unaccent(coalesce(regexp_replace(p, '\(.*?\)', '', 'g'), ''))),
           '\s+', ' ', 'g'))
$$;;
