
-- Passo 9: Criar tabela attribute_equivalences
-- Bridge entre atributos de fornecedores e atributos padronizados do Promo Brindes
-- Mesma lógica do supplier_category_mappings mas para VALORES de atributos

CREATE TABLE IF NOT EXISTS public.attribute_equivalences (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Fornecedor de origem
  supplier_id           uuid NOT NULL REFERENCES public.suppliers(id),
  source                text NOT NULL,       -- 'SPOT' | 'XBZ' | 'ASIA' | 'SOMARCAS'

  -- Atributo no fornecedor (texto livre — chave e valor originais)
  supplier_attr_key     text NOT NULL,       -- ex: 'Properties', 'Certificates', 'Material'
  supplier_attr_value   text NOT NULL,       -- ex: 'BPA free', 'Food Safety', 'Aço Inoxidável'

  -- Atributo padronizado no Promo Brindes
  promo_attr_key        text NOT NULL,       -- ex: 'livre_bpa', 'material_corpo', 'certificacao'
  promo_attr_value      text NOT NULL,       -- ex: 'true', 'Inox', 'BPA Free'
  promo_attr_type       text NOT NULL DEFAULT 'text',  -- 'text' | 'boolean' | 'number' | 'select'
  promo_attr_unit       text,               -- ex: 'ml', 'g', 'cm'

  -- Qualidade do mapeamento
  confidence            numeric(4,2) NOT NULL DEFAULT 1.00 CHECK (confidence BETWEEN 0 AND 1),
  match_quality         text NOT NULL DEFAULT 'manual'
                          CHECK (match_quality IN ('exact','partial','manual','ai_suggested')),
  verified              boolean NOT NULL DEFAULT false,
  verified_by           uuid REFERENCES auth.users(id),
  verified_at           timestamptz,

  -- Metadados
  notes                 text,
  is_active             boolean NOT NULL DEFAULT true,
  organization_id       uuid,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  -- Unicidade: mesmo fornecedor + mesma chave + mesmo valor origem = 1 mapeamento
  UNIQUE (supplier_id, supplier_attr_key, supplier_attr_value, promo_attr_key)
);

-- Índices para performance no pipeline de promoção Silver→Gold
CREATE INDEX IF NOT EXISTS idx_aeq_supplier_key_value
  ON public.attribute_equivalences (supplier_id, supplier_attr_key, supplier_attr_value)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_aeq_promo_key
  ON public.attribute_equivalences (promo_attr_key)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_aeq_pending_review
  ON public.attribute_equivalences (confidence, verified)
  WHERE is_active = true AND confidence < 0.80;

-- Trigger de updated_at
CREATE OR REPLACE FUNCTION public.fn_set_updated_at_aeq()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_aeq_updated_at ON public.attribute_equivalences;
CREATE TRIGGER trg_aeq_updated_at
  BEFORE UPDATE ON public.attribute_equivalences
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at_aeq();

-- RLS: somente roles autorizados leem/escrevem
ALTER TABLE public.attribute_equivalences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aeq_select_authenticated"
  ON public.attribute_equivalences FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "aeq_write_service_role"
  ON public.attribute_equivalences FOR ALL
  TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE public.attribute_equivalences IS
  'De-para entre valores de atributos de fornecedores e atributos padronizados do catálogo Promo Brindes. '
  'Alimenta fn_promote_padronizacao ao promover Silver→Gold para normalizar Properties/Certificates/Materials.';
;
