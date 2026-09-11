
-- ================================================================
-- MELHORIA-04: Desativar técnicas de produtos inativos
-- 879 linhas em print_area_techniques apontam para products.is_active=false
-- Essas linhas aparecem em contagens, poluem queries e confundem auditoria.
-- Solução: set is_active=false + created_at snapshot para rastreabilidade.
-- ================================================================

-- Primeiro: registrar quantas linhas serão afetadas
DO $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM print_area_techniques pat
  JOIN products p ON p.id = pat.product_id
  WHERE p.is_active = false AND pat.is_active = true;
  RAISE NOTICE 'Desativando % linhas de produtos inativos', v_count;
END $$;

-- Executar desativação
UPDATE public.print_area_techniques pat
SET
  is_active   = false,
  updated_at  = now()
FROM products p
WHERE p.id = pat.product_id
  AND p.is_active = false
  AND pat.is_active = true;

-- Confirmar
SELECT
  'after_fix: is_active=true de produtos ativos'   AS check_label,
  COUNT(*) AS qtd
FROM print_area_techniques pat
JOIN products p ON p.id = pat.product_id
WHERE p.is_active = true AND pat.is_active = true
UNION ALL
SELECT
  'after_fix: is_active=true de produtos INATIVOS (deve ser 0)',
  COUNT(*)
FROM print_area_techniques pat
JOIN products p ON p.id = pat.product_id
WHERE p.is_active = false AND pat.is_active = true;
;
