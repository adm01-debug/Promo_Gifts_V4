-- Helper: repara dupla-codificação UTF-8 lido como CP1252 (ex.: 'Ã˜'->'Ø', 'Ã—'->'×').
-- Conservador: só atua se houver marcador de mojibake ('Ã'/'Â'); em erro, devolve original.
CREATE OR REPLACE FUNCTION public.fn_fix_mojibake(p text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE v text;
BEGIN
  IF p IS NULL THEN RETURN NULL; END IF;
  IF p !~ '[ÃÂ]' THEN RETURN p; END IF;
  BEGIN
    v := convert_from(convert_to(p,'WIN1252'),'UTF8');
    RETURN v;
  EXCEPTION WHEN OTHERS THEN
    RETURN p;
  END;
END $$;

-- Posições de gravação por produto (até 8), extraídas do OptionalsComplete
CREATE TABLE IF NOT EXISTS public.product_print_positions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  position_index      smallint NOT NULL,
  component           text,
  location            text,
  composed_location   text,
  area_label          text,          -- tamanho da gravação (ex.: Ø70)
  technique_list      jsonb,         -- técnicas disponíveis nessa posição
  table_full_code     text,
  table_codes         text,
  table_codes_options jsonb,
  max_colors          jsonb,         -- máx. de cores por técnica
  handling_costs      jsonb,
  area_image          text,
  component_image     text,
  location_image      text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, position_index)
);
CREATE INDEX IF NOT EXISTS idx_ppp_product ON public.product_print_positions(product_id);;
