
-- Bridge table linking personalization_techniques (mockup registry) → tecnicas_gravacao (pricing master)
-- Fixes Bug #5: two separate technique registries with no FK connection

CREATE TABLE IF NOT EXISTS public.personalization_technique_mappings (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personalization_tech_id  uuid        NOT NULL REFERENCES public.personalization_techniques(id) ON DELETE CASCADE,
  tecnica_gravacao_codigo  text        NOT NULL REFERENCES public.tecnicas_gravacao(codigo) ON DELETE RESTRICT,
  is_primary               boolean     NOT NULL DEFAULT true,
  notes                    text,
  created_at               timestamptz NOT NULL DEFAULT NOW(),
  updated_at               timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (personalization_tech_id, tecnica_gravacao_codigo)
);

COMMENT ON TABLE public.personalization_technique_mappings IS
  'Ponte entre personalization_techniques (geração de mockup) e tecnicas_gravacao (precificação). '
  'Permite que uma técnica de UI mapeie para 1+ grupos de preço. '
  'Criado 2026-06-23 — fix Bug #5 arquitetura gravação.';

-- Index for joins in both directions
CREATE INDEX IF NOT EXISTS idx_ptm_tech_id   ON public.personalization_technique_mappings(personalization_tech_id);
CREATE INDEX IF NOT EXISTS idx_ptm_tg_codigo ON public.personalization_technique_mappings(tecnica_gravacao_codigo);

-- Trigger: keep updated_at current
CREATE OR REPLACE FUNCTION fn_update_ptm_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_ptm_updated_at
  BEFORE UPDATE ON public.personalization_technique_mappings
  FOR EACH ROW EXECUTE FUNCTION fn_update_ptm_timestamp();

-- Insert 11 confirmed mappings
INSERT INTO public.personalization_technique_mappings
  (personalization_tech_id, tecnica_gravacao_codigo, is_primary, notes)
VALUES
  -- DTF Digital → Transfer Digital (primary DTF pricing)
  ('6cafcae7-169d-4924-8d4a-57e7b76d63ae', 'TRANSFER_DIGITAL', true,
   'DTF (Digital Transfer Film) usa precificação por área em dm²'),
  -- Laser Fibra → LASER (metal/acrílico)
  ('476f9fe5-9541-4fbe-9c43-1a44d6c2c09d', 'LASER', true,
   'Laser de fibra para metais e plásticos rígidos'),
  -- Silk Screen → SERIGRAFIA
  ('de797fa2-a0e3-4b79-9804-44e89a5c2274', 'SERIGRAFIA', true,
   'Serigrafia (silk screen) — cobra_por_cor=true, max_cores'),
  -- Transfer (tradicional) → HEAT_TRANSFER
  ('85689b4c-4180-45b5-8fcb-5c64bfa17ded', 'HEAT_TRANSFER', true,
   'Transfer tradicional/flexografia — diferente de DTF'),
  -- UV → UV_DIGITAL
  ('cf04ca80-865d-431a-adec-eb0ae8482000', 'UV_DIGITAL', true,
   'Impressão digital UV plana ou cilíndrica'),
  -- Bordado → BORDADO
  ('f76b6d51-97df-4d46-894a-f03c02680a40', 'BORDADO', true,
   'Bordado computadorizado — precificação por ponto'),
  -- Tampografia → TAMPOGRAFIA
  ('1a3dd5a2-11c2-4eec-8c4a-68aa8af21f72', 'TAMPOGRAFIA', true,
   'Tampografia por cor e tiragem'),
  -- Sublimação → SUBLIMACAO
  ('f4f56d2d-eb4a-4f99-995f-2229e406a2df', 'SUBLIMACAO', true,
   'Sublimação têxtil ou em substratos rígidos'),
  -- Laser CO2 → LASER_CO2
  ('9793bc00-2dbc-4fd1-a821-08c66b38f012', 'LASER_CO2', true,
   'Laser CO2 para couro, madeira, tecido e vidro'),
  -- Hot Stamping → HOT_STAMPING
  ('60319243-9eb7-4832-835f-2299c9980dcc', 'HOT_STAMPING', true,
   'Hot stamping com ou sem fita — reativado 2026-06-23'),
  -- Adesivo → ADESIVO
  ('d35e11f3-b7df-40d4-85de-25e0eb11355f', 'ADESIVO', true,
   'Adesivo vinil recortado ou impresso');
;
