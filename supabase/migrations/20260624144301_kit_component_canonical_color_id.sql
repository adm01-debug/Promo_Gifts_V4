-- ============================================================
-- AMPLIAR codificação de cor às KITS/COMPONENTES (espelha variações)
-- color_id FK -> color_variations; backfill resolvido por NOME canônico
-- Aditivo, rerun-safe
-- ============================================================
ALTER TABLE public.product_kit_components
  ADD COLUMN IF NOT EXISTS color_id uuid REFERENCES public.color_variations(id);

COMMENT ON COLUMN public.product_kit_components.color_id IS
  'Cor do ITEM normalizada (FK color_variations) — MESMA codificação canônica das variações de produto. '
  'Resolvida do campo color (texto derivado do nome) via dicionário de equivalência. NULL = cor própria desconhecida. '
  'OBS: distinta da cor da VARIANTE do kit (essa vive em product_variants.color_id e alimenta o ref do componente).';

CREATE INDEX IF NOT EXISTS idx_pkc_color_id ON public.product_kit_components(color_id);

WITH mapa(txt, canonico) AS (VALUES
  ('Preto','Preto'),('Inox','Prata Inox'),('Branco','Branco'),('Azul','Azul Royal'),
  ('Verde','Verde Bandeira'),('Vermelho','Vermelho Ferrari'),('Cinza','Cinza Claro'),
  ('Prata','Prata'),('Bege','Bege Nude'),('Rosa','Rosa Bubbaloo'),('Marrom','Marrom Chocolate'),
  ('Grafite','Cinza Chumbo'),('Amarelo','Amarelo Ouro'),('Transparente','Transparente')
)
UPDATE public.product_kit_components k
SET color_id = cv.id, updated_at = now()
FROM mapa m
JOIN public.color_variations cv ON cv.name = m.canonico
WHERE k.color = m.txt AND k.color_id IS NULL;;
