
-- ══════════════════════════════════════════════════════════════════
-- Melhoria 5: v_products_ai_coverage — view de cobertura de enriquecimento AI
-- Monitoramento do progresso da AI enrichment por fornecedor e tipo
-- ══════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.v_products_ai_coverage AS
SELECT
  s.name AS supplier_name,
  COUNT(p.id) AS total_products,
  COUNT(p.id) FILTER (WHERE p.ai_description IS NOT NULL AND length(p.ai_description) > 20) AS com_ai_desc,
  COUNT(p.id) FILTER (WHERE p.ai_title IS NOT NULL AND length(p.ai_title) > 5) AS com_ai_title,
  COUNT(p.id) FILTER (WHERE p.ai_summary IS NOT NULL) AS com_ai_summary,
  COUNT(p.id) FILTER (WHERE p.ai_generated_at IS NOT NULL) AS com_ai_gerado,
  ROUND(100.0 * COUNT(p.id) FILTER (WHERE p.ai_description IS NOT NULL AND length(p.ai_description) > 20) /
    NULLIF(COUNT(p.id), 0), 1) AS pct_ai_desc,
  MAX(p.ai_generated_at) AS last_ai_generated,
  -- Queue status para este fornecedor
  COUNT(q.id) FILTER (WHERE q.status = 'pending') AS queue_pending,
  COUNT(q.id) FILTER (WHERE q.status = 'processing') AS queue_processing,
  COUNT(q.id) FILTER (WHERE q.status = 'done') AS queue_done,
  COUNT(q.id) FILTER (WHERE q.status = 'error') AS queue_error
FROM products p
LEFT JOIN suppliers s ON s.id = p.supplier_id
LEFT JOIN ai_enrichment_queue q ON q.product_id = p.id
WHERE p.is_active = true
GROUP BY s.name
ORDER BY total_products DESC;

COMMENT ON VIEW public.v_products_ai_coverage IS
'Cobertura de enriquecimento AI por fornecedor. Inclui status da fila. Criado 2026-06-23.';

GRANT SELECT ON public.v_products_ai_coverage TO authenticated;
;
