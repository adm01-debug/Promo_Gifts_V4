
-- Passo 10-A: Criar tabela product_attributes
-- Armazena atributos estruturados por produto no Gold (material, capacidade, BPA free, etc.)
-- Alimentada pela fn_promote_padronizacao via attribute_equivalences

CREATE TABLE IF NOT EXISTS public.product_attributes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Produto Gold ao qual o atributo pertence
  product_id        uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,

  -- Atributo (chave snake_case, valor sempre como text + tipo para conversão)
  attribute_key     text NOT NULL,       -- ex: 'material_corpo', 'capacidade', 'livre_bpa'
  attribute_value   text NOT NULL,       -- ex: 'Inox', '500', 'true'
  attribute_type    text NOT NULL DEFAULT 'text'
                      CHECK (attribute_type IN ('text','number','boolean','select','multiselect')),
  attribute_unit    text,               -- ex: 'ml', 'g', 'cm', 'horas'

  -- Fonte do atributo (rastreabilidade)
  source_supplier   text,              -- 'SPOT' | 'XBZ' | 'ASIA' | 'SOMARCAS'
  source_field      text,              -- campo original: 'Properties', 'Certificates', 'Materials'
  source_raw_value  text,              -- valor original antes da normalização

  -- Exibição
  display_order     integer DEFAULT 0,
  is_visible        boolean NOT NULL DEFAULT true,   -- aparece na ficha do produto
  is_filterable     boolean NOT NULL DEFAULT false,  -- aparece nos filtros de busca
  is_comparable     boolean NOT NULL DEFAULT true,   -- aparece na comparação de produtos

  -- Auditoria
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  -- Unicidade: mesmo produto + mesma chave = 1 valor (upsert-safe)
  UNIQUE (product_id, attribute_key)
);

-- Índices para performance de filtros de catálogo
CREATE INDEX IF NOT EXISTS idx_pa_product_id
  ON public.product_attributes (product_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_pa_filterable_key_value
  ON public.product_attributes (attribute_key, attribute_value)
  WHERE is_active = true AND is_filterable = true;

CREATE INDEX IF NOT EXISTS idx_pa_supplier
  ON public.product_attributes (source_supplier, attribute_key)
  WHERE is_active = true;

-- Índice para busca por atributos booleanos (BPA free, etc.)
CREATE INDEX IF NOT EXISTS idx_pa_boolean_attrs
  ON public.product_attributes (attribute_key)
  WHERE is_active = true AND attribute_type = 'boolean' AND attribute_value = 'true';

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.fn_set_updated_at_pa()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_pa_updated_at ON public.product_attributes;
CREATE TRIGGER trg_pa_updated_at
  BEFORE UPDATE ON public.product_attributes
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at_pa();

-- RLS
ALTER TABLE public.product_attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pa_select_public"
  ON public.product_attributes FOR SELECT
  USING (is_active = true AND is_visible = true);

CREATE POLICY "pa_select_authenticated_all"
  ON public.product_attributes FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "pa_write_service_role"
  ON public.product_attributes FOR ALL
  TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE public.product_attributes IS
  'Atributos estruturados por produto Gold — material, capacidade, BPA free, etc. '
  'Populada via fn_promote_padronizacao usando attribute_equivalences como de-para. '
  'Fonte primária para filtros de catálogo e comparação de produtos.';
;
