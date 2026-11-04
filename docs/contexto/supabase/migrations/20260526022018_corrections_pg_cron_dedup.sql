DO $$
DECLARE v_count int; v_min_id bigint;
BEGIN
  SELECT COUNT(*), MIN(jobid) INTO v_count, v_min_id FROM cron.job WHERE command LIKE '%process_spot_products%';
  IF v_count > 1 THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE command LIKE '%process_spot_products%' AND jobid != v_min_id;
    RAISE NOTICE 'Removida(s) % duplicata(s) de process_spot_products', v_count - 1;
  ELSE
    RAISE NOTICE 'Nenhuma duplicata encontrada para process_spot_products';
  END IF;
END $$;
