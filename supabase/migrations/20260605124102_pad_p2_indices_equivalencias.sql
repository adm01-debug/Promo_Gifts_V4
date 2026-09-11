
-- Índice para o de-para de cor (consultas por cor canônica resolvida)
CREATE INDEX IF NOT EXISTS idx_padvar_color_id ON public.produtos_padronizacao_variantes (color_id) WHERE color_id IS NULL;
-- Acelera "variantes sem cor canônica resolvida" (fila de trabalho de equivalência de cor)
CREATE INDEX IF NOT EXISTS idx_padvar_sem_colorid ON public.produtos_padronizacao_variantes (supplier_id) WHERE color_id IS NULL;
-- Vínculo com o gold (auditoria do que já foi promovido)
CREATE INDEX IF NOT EXISTS idx_pad_promovidos ON public.produtos_padronizacao (supplier_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_padvar_promovidos ON public.produtos_padronizacao_variantes (supplier_id) WHERE variant_id IS NOT NULL;
;
