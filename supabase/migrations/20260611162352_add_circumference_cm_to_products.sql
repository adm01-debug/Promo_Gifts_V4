ALTER TABLE public.products ADD COLUMN IF NOT EXISTS circumference_cm numeric NULL;

COMMENT ON COLUMN public.products.circumference_cm IS 'Circunferência do produto em centímetros. Promovido de produtos_site_padronizacao.circumference_cm.';;
