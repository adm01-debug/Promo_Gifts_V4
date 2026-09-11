
-- ═══════════════════════════════════════════════════════════════════
-- TABELAS DE RELACIONAMENTO — PRODUTO ↔ SPECS DE CADERNO
-- ═══════════════════════════════════════════════════════════════════

-- 11. PRODUCT_NOTEBOOK_SPECS (1:1 produto → especificações)
CREATE TABLE IF NOT EXISTS public.product_notebook_specs (
  id                 uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id         uuid    NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  paper_format_id    uuid    REFERENCES public.paper_formats(id),
  paper_ruling_id    uuid    REFERENCES public.paper_rulings(id),
  paper_weight_id    uuid    REFERENCES public.paper_weights(id),
  paper_color_id     uuid    REFERENCES public.paper_colors(id),
  binding_type_id    uuid    REFERENCES public.binding_types(id),
  binding_color_id   uuid    REFERENCES public.binding_colors(id),
  cover_type_id      uuid    REFERENCES public.cover_types(id),
  cover_material_id  uuid    REFERENCES public.cover_materials(id),
  cover_finish_id    uuid    REFERENCES public.cover_finishes(id),
  sheet_count        int     CHECK (sheet_count IS NULL OR sheet_count > 0),
  source_supplier    text,   -- qual fornecedor originou este registro
  extraction_notes   text,   -- notas do parser (para auditoria)
  confidence_score   numeric(3,2) CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
  manually_reviewed  boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id)          -- 1 spec por produto
);
COMMENT ON TABLE public.product_notebook_specs IS 
  'Especificações técnicas de produtos de material gráfico (cadernos, blocos, agendas). 1 linha por produto. FK → products (Gold).';
COMMENT ON COLUMN public.product_notebook_specs.confidence_score IS 
  '0.0 a 1.0 — confiança do parser automático. 1.0 = revisão manual.';

CREATE INDEX IF NOT EXISTS idx_pns_product_id    ON public.product_notebook_specs(product_id);
CREATE INDEX IF NOT EXISTS idx_pns_paper_format  ON public.product_notebook_specs(paper_format_id);
CREATE INDEX IF NOT EXISTS idx_pns_cover_mat     ON public.product_notebook_specs(cover_material_id);
CREATE INDEX IF NOT EXISTS idx_pns_source        ON public.product_notebook_specs(source_supplier);

CREATE TRIGGER trg_pns_updated_at BEFORE UPDATE ON public.product_notebook_specs
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_updated_at();

-- 12. PRODUCT_NOTEBOOK_FEATURES (N:N produto ↔ feature)
CREATE TABLE IF NOT EXISTS public.product_notebook_features (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid    NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  feature_id  uuid    NOT NULL REFERENCES public.notebook_features(id) ON DELETE CASCADE,
  source_text text,           -- trecho da descrição que originou a feature (auditoria)
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, feature_id)
);
COMMENT ON TABLE public.product_notebook_features IS 
  'Features e acessórios dos cadernos (N:N). Cada linha = 1 feature confirmada para 1 produto.';

CREATE INDEX IF NOT EXISTS idx_pnf_product_id  ON public.product_notebook_features(product_id);
CREATE INDEX IF NOT EXISTS idx_pnf_feature_id  ON public.product_notebook_features(feature_id);

CREATE TRIGGER trg_pnf_updated_at BEFORE UPDATE ON public.product_notebook_features
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_updated_at();
;
