
-- Mover 5 tabelas para schema archive
-- FK constraints SAINDO das tabelas seguem automaticamente (por OID)
-- FK constraints CHEGANDO do public foram verificadas: ZERO (PRÉ-FLIGHT 6)
-- Conflicts de nome no archive verificados: ZERO (PRÉ-FLIGHT 7)

-- 1. Snapshot de auditoria CF (junho 2026 — único, não renovado)
ALTER TABLE public._cf_images_audit SET SCHEMA archive;

-- 2. Queue SPOT EU diff (0 rows, pipeline nunca executado)
ALTER TABLE public.spot_eu_image_diff_queue SET SCHEMA archive;

-- 3. Queue genérica de sync de mídia (0 rows, sem uso)
ALTER TABLE public.media_sync_queue SET SCHEMA archive;

-- 4. Mapeamentos de sufixo (funções dependentes dropadas na 1.3, 0 chamadas)
-- Nota: tem FK para supplier_image_suffix_patterns — mover depois
ALTER TABLE public.supplier_image_suffix_patterns SET SCHEMA archive;

-- 5. Padrões de sufixo (FK de suffix_mappings — movido juntos, sem conflito por OID)
ALTER TABLE public.supplier_image_suffix_mappings SET SCHEMA archive;

-- VALIDAÇÃO FINAL ETAPA 1.4
DO $$
DECLARE
  v_public_count int;
  v_archive_count int;
BEGIN
  -- Confirmar que NÃO estão mais no public
  SELECT COUNT(*) INTO v_public_count FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename IN (
    '_cf_images_audit','spot_eu_image_diff_queue','media_sync_queue',
    'supplier_image_suffix_mappings','supplier_image_suffix_patterns'
  );
  
  -- Confirmar que estão no archive
  SELECT COUNT(*) INTO v_archive_count FROM pg_tables
  WHERE schemaname = 'archive'
  AND tablename IN (
    '_cf_images_audit','spot_eu_image_diff_queue','media_sync_queue',
    'supplier_image_suffix_mappings','supplier_image_suffix_patterns'
  );
  
  IF v_public_count > 0 THEN
    RAISE EXCEPTION 'FALHA: % tabelas ainda no public após ALTER SCHEMA', v_public_count;
  END IF;
  IF v_archive_count != 5 THEN
    RAISE EXCEPTION 'FALHA: apenas % de 5 tabelas chegaram ao archive', v_archive_count;
  END IF;
  RAISE NOTICE 'SUCESSO: 5 tabelas movidas para archive. Public: %, Archive: %', v_public_count, v_archive_count;
END;
$$;
;
