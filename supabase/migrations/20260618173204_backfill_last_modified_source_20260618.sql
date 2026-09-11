
-- MELHORIA 6: Preencher last_modified_source=NULL com 'pipeline' (dados históricos de importação)
-- 66,794 registros sem rastreamento de origem
UPDATE public.product_images
SET last_modified_source = 'pipeline'
WHERE deleted_at IS NULL
  AND last_modified_source IS NULL;

-- Confirmar
SELECT last_modified_source, COUNT(*) AS n
FROM public.product_images
WHERE deleted_at IS NULL
GROUP BY last_modified_source
ORDER BY n DESC;
;
