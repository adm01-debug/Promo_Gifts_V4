
-- ===== Backups (reversibilidade) =====
DROP TABLE IF EXISTS public.produtos_padronizacao_bkp_20260604;
CREATE TABLE public.produtos_padronizacao_bkp_20260604 AS SELECT * FROM public.produtos_padronizacao;
DROP TABLE IF EXISTS public.produtos_padronizacao_variantes_bkp_20260604;
CREATE TABLE public.produtos_padronizacao_variantes_bkp_20260604 AS SELECT * FROM public.produtos_padronizacao_variantes;

-- ===== CHECKs de coerência — pais =====
ALTER TABLE public.produtos_padronizacao
  ADD CONSTRAINT chk_pad_ref_nao_vazia CHECK (length(trim(supplier_reference)) > 0) NOT VALID;
ALTER TABLE public.produtos_padronizacao VALIDATE CONSTRAINT chk_pad_ref_nao_vazia;
ALTER TABLE public.produtos_padronizacao
  ADD CONSTRAINT chk_pad_custo_nao_negativo CHECK (cost_price IS NULL OR cost_price >= 0) NOT VALID;
ALTER TABLE public.produtos_padronizacao VALIDATE CONSTRAINT chk_pad_custo_nao_negativo;
-- promovido => tem product_id (coerência do vínculo com o gold)
ALTER TABLE public.produtos_padronizacao
  ADD CONSTRAINT chk_pad_promoted_tem_product CHECK (promoted_at IS NULL OR product_id IS NOT NULL) NOT VALID;
ALTER TABLE public.produtos_padronizacao VALIDATE CONSTRAINT chk_pad_promoted_tem_product;

-- ===== CHECKs de coerência — variantes =====
ALTER TABLE public.produtos_padronizacao_variantes
  ADD CONSTRAINT chk_padvar_refs_nao_vazias CHECK (length(trim(variant_reference)) > 0 AND length(trim(parent_reference)) > 0) NOT VALID;
ALTER TABLE public.produtos_padronizacao_variantes VALIDATE CONSTRAINT chk_padvar_refs_nao_vazias;
ALTER TABLE public.produtos_padronizacao_variantes
  ADD CONSTRAINT chk_padvar_custo_nao_negativo CHECK (cost_price IS NULL OR cost_price >= 0) NOT VALID;
ALTER TABLE public.produtos_padronizacao_variantes VALIDATE CONSTRAINT chk_padvar_custo_nao_negativo;
-- cor canônica resolvida => precisa do nome (color_id nunca sozinho)
ALTER TABLE public.produtos_padronizacao_variantes
  ADD CONSTRAINT chk_padvar_colorid_tem_nome CHECK (color_id IS NULL OR length(trim(color_name)) > 0) NOT VALID;
ALTER TABLE public.produtos_padronizacao_variantes VALIDATE CONSTRAINT chk_padvar_colorid_tem_nome;

-- ===== Documentação (grão + papéis) =====
COMMENT ON TABLE public.produtos_padronizacao IS
  'INTERMEDIÁRIA (silver) — pais. Camada de equivalências/de-para entre o bronze (supplier_products_raw) e o gold (products). GRÃO: 1 linha = 1 produto-pai do fornecedor (chave supplier_id+supplier_reference). O pai é DERIVADO do bronze por fn_derive_parent_ref. status (enum) é o SSOT do ciclo: pending -> standardized -> (promoted_at/product_id quando vai ao gold).';
COMMENT ON COLUMN public.produtos_padronizacao.supplier_reference IS 'Referência do PAI no fornecedor (derivada na padronização). Única por supplier_id.';
COMMENT ON COLUMN public.produtos_padronizacao.raw_id IS 'Origem no bronze (supplier_products_raw). ON DELETE SET NULL — apagar o raw não apaga a equivalência.';
COMMENT ON COLUMN public.produtos_padronizacao.product_id IS 'Vínculo com o gold (products). Preenchido na promoção. SET NULL se o produto do gold for removido.';
COMMENT ON COLUMN public.produtos_padronizacao.status IS 'SSOT do ciclo de padronização (enum). Não confundir com is_active (visibilidade do produto).';
COMMENT ON COLUMN public.produtos_padronizacao.promoted_at IS 'Quando foi promovido ao gold. Coerência garantida por CHECK: se preenchido, product_id não é nulo.';

COMMENT ON TABLE public.produtos_padronizacao_variantes IS
  'INTERMEDIÁRIA (silver) — variantes. GRÃO: 1 linha = 1 variante/SKU do fornecedor (chave supplier_id+variant_reference). parent_reference referencia o pai em produtos_padronizacao; o vínculo forte é pad_id. Aqui moram as EQUIVALÊNCIAS DE COR (color_id canônico vindo de color_variations) e o custo por variante.';
COMMENT ON COLUMN public.produtos_padronizacao_variantes.variant_reference IS 'Referência da VARIANTE no fornecedor. Única por supplier_id.';
COMMENT ON COLUMN public.produtos_padronizacao_variantes.parent_reference IS 'Referência do pai (texto). Para o vínculo confiável use pad_id; parent_reference pode ter pontas soltas se o pai foi removido.';
COMMENT ON COLUMN public.produtos_padronizacao_variantes.pad_id IS 'FK forte para o pai (produtos_padronizacao). SET NULL se o pai for removido.';
COMMENT ON COLUMN public.produtos_padronizacao_variantes.color_id IS 'Cor canônica (color_variations.id) — o de-para de cor. CHECK garante que, se preenchido, color_name também está.';
COMMENT ON COLUMN public.produtos_padronizacao_variantes.variant_id IS 'Vínculo com o gold (product_variants). Preenchido na promoção. SET NULL se a variante do gold for removida.';
;
