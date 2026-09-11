
-- ============================================================
-- ETAPA 1: Criar tabela product_specifications
-- Necessária para: calculate_seo_score, Schema.org, SEO técnico
-- ============================================================

CREATE TABLE IF NOT EXISTS public.product_specifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    spec_key    TEXT NOT NULL,           -- ex: 'Material', 'Capacidade', 'Dimensões'
    spec_value  TEXT NOT NULL,           -- ex: 'Aço inox 304', '500ml', '10x5x5 cm'
    spec_unit   TEXT,                    -- ex: 'ml', 'cm', 'g'
    spec_group  TEXT DEFAULT 'geral',    -- ex: 'técnica', 'embalagem', 'personalização'
    display_order INTEGER DEFAULT 0,
    is_active   BOOLEAN DEFAULT true,
    organization_id UUID DEFAULT '5db5aee1-064b-4ef4-9193-345dcd8274ea'::uuid,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_specifications_product_id
    ON public.product_specifications (product_id);

CREATE INDEX IF NOT EXISTS idx_product_specifications_group
    ON public.product_specifications (spec_group)
    WHERE is_active = true;

COMMENT ON TABLE public.product_specifications IS
    'Especificações técnicas estruturadas por produto — alimenta Schema.org e SEO técnico';
COMMENT ON COLUMN public.product_specifications.spec_key IS
    'Nome do atributo (ex: Material, Capacidade)';
COMMENT ON COLUMN public.product_specifications.spec_value IS
    'Valor do atributo (ex: Aço inox 304)';
COMMENT ON COLUMN public.product_specifications.spec_group IS
    'Grupo lógico: geral, tecnica, embalagem, personalizacao, sustentabilidade';
;
