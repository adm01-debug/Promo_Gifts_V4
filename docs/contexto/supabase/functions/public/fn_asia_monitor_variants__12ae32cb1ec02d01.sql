CREATE OR REPLACE FUNCTION public.fn_asia_monitor_variants()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_supplier_id       uuid := 'd2734e23-d633-4819-bb15-e51aa44e2118';
  v_baseline_inativas int  := 26;   -- estado intencional após limpeza 2026-06-08
  v_limite_alerta     int  := 40;   -- 54% acima do baseline = investigar
  v_inativas          int;
  v_ativas            int;
  v_stock_neg         int;
  v_sem_sku           int;
  v_dup_sku           int;
  v_alert             boolean := false;
  v_msgs              text[]  := '{}';
BEGIN
  SELECT COUNT(*) INTO v_inativas FROM product_variants pv JOIN products p ON p.id=pv.product_id WHERE p.supplier_id=v_supplier_id AND pv.is_active=false;
  SELECT COUNT(*) INTO v_ativas   FROM product_variants pv JOIN products p ON p.id=pv.product_id WHERE p.supplier_id=v_supplier_id AND pv.is_active=true;
  SELECT COUNT(*) INTO v_stock_neg FROM product_variants pv JOIN products p ON p.id=pv.product_id WHERE p.supplier_id=v_supplier_id AND pv.stock_quantity < 0;
  SELECT COUNT(*) INTO v_sem_sku   FROM product_variants pv JOIN products p ON p.id=pv.product_id WHERE p.supplier_id=v_supplier_id AND (pv.sku IS NULL OR pv.sku='');
  SELECT COUNT(*) INTO v_dup_sku   FROM (SELECT pv.sku FROM product_variants pv JOIN products p ON p.id=pv.product_id WHERE p.supplier_id=v_supplier_id AND pv.is_active=true GROUP BY pv.sku HAVING COUNT(*)>1) d;

  IF v_inativas > v_limite_alerta     THEN v_alert:=true; v_msgs:=array_append(v_msgs,'ALERTA: inativas='||v_inativas||' > limite='||v_limite_alerta); END IF;
  IF v_stock_neg > 0                  THEN v_alert:=true; v_msgs:=array_append(v_msgs,'ALERTA: stock_negativo='||v_stock_neg); END IF;
  IF v_sem_sku > 0                    THEN v_alert:=true; v_msgs:=array_append(v_msgs,'ALERTA: sem_sku='||v_sem_sku); END IF;
  IF v_dup_sku > 0                    THEN v_alert:=true; v_msgs:=array_append(v_msgs,'ALERTA: sku_duplicados='||v_dup_sku); END IF;

  RETURN jsonb_build_object(
    'ok', NOT v_alert, 'checado_em', now(),
    'variants_ativas', v_ativas, 'variants_inativas', v_inativas,
    'baseline_intencional', v_baseline_inativas, 'limite_alerta', v_limite_alerta,
    'stock_negativo', v_stock_neg, 'sem_sku', v_sem_sku, 'sku_duplicados', v_dup_sku,
    'alertas', to_jsonb(v_msgs)
  );
END;
$function$
