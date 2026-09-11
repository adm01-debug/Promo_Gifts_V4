-- Protege os nomes curados no Gold: adiciona 'name' ao locked_fields
-- de todos os produtos SPOT que ainda não o têm travado.
-- locked_fields é text[], operação é idempotente (array_append só adiciona se ausente via array_cat+distinct).
UPDATE public.products
SET locked_fields = array(
    select distinct unnest(coalesce(locked_fields, ARRAY[]::text[]) || ARRAY['name'])
    order by 1
)
WHERE supplier_id = 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0'
  AND NOT ('name' = ANY(coalesce(locked_fields, ARRAY[]::text[])));

-- Confirma resultado
DO $$
DECLARE v_locked int; v_total int;
BEGIN
  SELECT count(*) INTO v_locked FROM public.products
    WHERE supplier_id='bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0' AND 'name'=ANY(coalesce(locked_fields,ARRAY[]::text[]));
  SELECT count(*) INTO v_total FROM public.products
    WHERE supplier_id='bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0';
  RAISE NOTICE 'name em locked_fields: %/% produtos SPOT', v_locked, v_total;
END $$;;
