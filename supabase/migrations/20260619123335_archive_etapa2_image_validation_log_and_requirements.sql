
-- Mover image_validation_log e supplier_image_requirements para archive
-- FK de image_validation_log.image_id → product_images: sai da tabela (segue com ela)
-- supplier_image_requirements: FK verificada = nenhuma chegando do public

ALTER TABLE public.image_validation_log SET SCHEMA archive;
ALTER TABLE public.supplier_image_requirements SET SCHEMA archive;

-- VALIDAÇÃO
DO $$
DECLARE
  v_public_count int;
  v_archive_count int;
BEGIN
  SELECT COUNT(*) INTO v_public_count FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename IN ('image_validation_log','supplier_image_requirements');
  
  SELECT COUNT(*) INTO v_archive_count FROM pg_tables
  WHERE schemaname = 'archive'
  AND tablename IN ('image_validation_log','supplier_image_requirements');
  
  IF v_public_count > 0 THEN
    RAISE EXCEPTION 'FALHA: % tabelas ainda no public', v_public_count;
  END IF;
  IF v_archive_count != 2 THEN
    RAISE EXCEPTION 'FALHA: apenas % de 2 tabelas no archive', v_archive_count;
  END IF;
  RAISE NOTICE 'SUCESSO: image_validation_log (75k rows, 24MB) e supplier_image_requirements (5 rows, 80KB) → archive';
END;
$$;
;
