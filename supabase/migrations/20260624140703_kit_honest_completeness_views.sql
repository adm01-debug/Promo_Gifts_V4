-- ============================================================
-- MELHORIA 7: sinal de completude HONESTO (aditivo, não-destrutivo)
-- Não altera enrichment_status (blast radius); adiciona verdade ao lado
-- ============================================================

-- View por componente: flags multi-dimensão + completude verídica
CREATE OR REPLACE VIEW public.v_kit_component_completeness AS
SELECT s.*,
  CASE WHEN s.completude_pct = 100 THEN 'complete'
       WHEN s.completude_pct >= 50  THEN 'partial'
       ELSE 'minimal' END AS true_status
FROM (
  SELECT
    f.component_id, f.kit_product_id, f.component_name, f.component_type_code, f.is_packaging,
    f.has_type, f.has_weight, f.has_dims, f.has_color, f.has_image,
    f.has_pkg_dims, f.has_pkg_material,
    (f.has_pkg_dims AND f.has_pkg_material) AS has_pkg_info,
    CASE WHEN f.is_packaging
         THEN (f.has_type::int + f.has_pkg_dims::int + f.has_pkg_material::int)
         ELSE (f.has_type::int + f.has_weight::int + f.has_dims::int + f.has_color::int + f.has_image::int)
    END AS dims_satisfeitas,
    CASE WHEN f.is_packaging THEN 3 ELSE 5 END AS dims_aplicaveis,
    CASE WHEN f.is_packaging
         THEN round(100.0*(f.has_type::int + f.has_pkg_dims::int + f.has_pkg_material::int)/3.0)::int
         ELSE round(100.0*(f.has_type::int + f.has_weight::int + f.has_dims::int + f.has_color::int + f.has_image::int)/5.0)::int
    END AS completude_pct,
    f.enrichment_status
  FROM (
    SELECT
      pkc.id AS component_id, pkc.kit_product_id, pkc.component_name,
      pkc.component_type_code, pkc.is_packaging,
      (pkc.component_type_code IS NOT NULL) AS has_type,
      (pkc.weight_g IS NOT NULL) AS has_weight,
      (CASE WHEN pkc.shape_type='cylindrical' THEN pkc.diameter_mm IS NOT NULL
            ELSE (pkc.length_mm IS NOT NULL AND pkc.width_mm IS NOT NULL) END) AS has_dims,
      (pkc.color IS NOT NULL) AS has_color,
      (pkc.primary_image_url IS NOT NULL) AS has_image,
      (COALESCE(pkc.pkg_ext_length_mm,pkc.pkg_ext_width_mm,pkc.pkg_ext_height_mm) IS NOT NULL) AS has_pkg_dims,
      (pkc.pkg_material IS NOT NULL) AS has_pkg_material,
      pkc.enrichment_status
    FROM public.product_kit_components pkc
  ) f
) s;

COMMENT ON VIEW public.v_kit_component_completeness IS
  'Completude VERÍDICA por componente (M7/2026-06-24). Itens pontuam em 5 dimensões (tipo, peso, medidas, cor, imagem); embalagens em 3 (tipo, dims externas, material). completude_pct/true_status refletem TODOS os requisitos do negócio — ao contrário de enrichment_status, que só mede dimensão física.';

-- Rollup verídico por fornecedor (espelha o dashboard antigo, porém honesto)
CREATE OR REPLACE VIEW public.v_kit_completeness_by_supplier AS
SELECT
  sup.name AS supplier_name,
  sup.code AS supplier_code,
  count(*) AS total_components,
  count(*) FILTER (WHERE c.true_status='complete') AS truly_complete,
  round(100.0*count(*) FILTER (WHERE c.true_status='complete')/count(*),1) AS pct_truly_complete,
  round(avg(c.completude_pct),1) AS avg_completude_pct,
  round(100.0*count(*) FILTER (WHERE c.has_color)/count(*),1)  AS pct_com_cor,
  round(100.0*count(*) FILTER (WHERE c.has_image)/count(*),1)  AS pct_com_imagem,
  round(100.0*count(*) FILTER (WHERE c.has_dims)/count(*),1)   AS pct_com_dims,
  round(100.0*count(*) FILTER (WHERE c.has_weight)/count(*),1) AS pct_com_peso,
  round(100.0*count(*) FILTER (WHERE c.is_packaging AND c.has_pkg_info)
        /NULLIF(count(*) FILTER (WHERE c.is_packaging),0),1)   AS pct_emb_completa
FROM public.v_kit_component_completeness c
JOIN public.products  p   ON p.id = c.kit_product_id
JOIN public.suppliers sup ON sup.id = p.supplier_id
GROUP BY sup.name, sup.code
ORDER BY pct_truly_complete DESC;

COMMENT ON VIEW public.v_kit_completeness_by_supplier IS
  'Rollup de completude VERÍDICA por fornecedor (M7/2026-06-24). Use em vez de v_kit_enrichment_dashboard quando precisar da verdade incluindo cor/imagem.';

-- Corrige o COMMENT enganoso da coluna que sustentava a "mentira do 100%"
COMMENT ON COLUMN public.product_kit_components.enrichment_status IS
  'ATENÇÃO: mede APENAS completude de dimensão física (peso/medidas), NÃO inclui cor nem imagem. '
  'Para completude verídica multi-dimensional, use v_kit_component_completeness (true_status / completude_pct).';

-- PostgREST: recarrega cache de schema para expor as novas views
NOTIFY pgrst, 'reload schema';;
