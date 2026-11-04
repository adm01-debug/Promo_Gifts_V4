CREATE OR REPLACE FUNCTION public.fn_promote_customization_to_gold(p_supplier_id uuid DEFAULT 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0'::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ins   int := 0; v_skip int := 0; v_prod int := 0;
  v_rec   RECORD; v_scr   RECORD;
  v_pos   int; v_i int;
  v_pid   uuid;
  v_area  text; v_loc text; v_comp text;
  v_hand  numeric; v_tcopt text; v_tcopts text;
  v_raw   text; v_ac2 numeric;
  v_mq    numeric; v_pr numeric;
  v_minqt numeric[]; v_prcs numeric[];
BEGIN
  FOR v_rec IN
    SELECT DISTINCT ON ((spr.raw_data->>'ProdReference'))
      (spr.raw_data->>'ProdReference') AS prod_ref, spr.raw_data
    FROM supplier_products_raw spr
    WHERE spr.supplier_id = p_supplier_id
      AND (spr.raw_data->>'Area1') IS NOT NULL
      AND (spr.raw_data->>'CustomizationTypes') IS NOT NULL
    ORDER BY (spr.raw_data->>'ProdReference'), spr.updated_at DESC
  LOOP
    SELECT id INTO v_pid FROM products WHERE sku = v_rec.prod_ref LIMIT 1;
    IF v_pid IS NULL THEN v_skip:=v_skip+1; CONTINUE; END IF;
    v_prod := v_prod+1;

    FOR v_pos IN 1..8 LOOP
      v_area  := v_rec.raw_data->>(  'Area'||v_pos::text);
      EXIT WHEN v_area IS NULL OR v_area='';
      v_loc   := COALESCE(v_rec.raw_data->>(  'Location'||v_pos::text),'');
      v_comp  := COALESCE(v_rec.raw_data->>(  'Component'||v_pos::text),'');
      v_raw   := SPLIT_PART(COALESCE(v_rec.raw_data->>(  'HandlingCosts'||v_pos::text),'0'),' ',1);
      BEGIN v_hand := REPLACE(v_raw,',','.')::numeric;
        EXCEPTION WHEN others THEN v_hand := 0; END;
      v_tcopts := v_rec.raw_data->>(  'TableCodesOptions'||v_pos::text);
      CONTINUE WHEN v_tcopts IS NULL OR v_tcopts='';

      FOREACH v_tcopt IN ARRAY string_to_array(v_tcopts,', ')
      LOOP
        v_tcopt := trim(v_tcopt);
        CONTINUE WHEN v_tcopt='';
        SELECT * INTO v_scr FROM supplier_customization_raw
        WHERE supplier_id=p_supplier_id AND table_code_option=v_tcopt LIMIT 1;
        IF NOT FOUND THEN v_skip:=v_skip+1; CONTINUE; END IF;

        BEGIN v_ac2:=REPLACE(COALESCE(v_scr.raw_data->>'TableMaxAreaCM2','0'),',','.')::numeric;
          EXCEPTION WHEN others THEN v_ac2:=0; END;

        v_minqt:=ARRAY[]::numeric[]; v_prcs:=ARRAY[]::numeric[];
        FOR v_i IN 1..15 LOOP
          v_raw := v_scr.raw_data->>(  'MinQt'||v_i::text);
          EXIT WHEN v_raw IS NULL;
          BEGIN
            v_mq:=REPLACE(v_raw,',','.')::numeric;
            v_pr:=REPLACE(COALESCE(v_scr.raw_data->>(  'Price'||v_i::text),'0'),',','.')::numeric;
            v_minqt:=v_minqt||v_mq; v_prcs:=v_prcs||v_pr;
          EXCEPTION WHEN others THEN EXIT;
          END;
        END LOOP;

        INSERT INTO product_customization_prices(
          id,product_id,service_code,table_code,component,location,
          handling_cost,table_max_area_cm2,max_stitches,min_qty,price,currency,created_at,updated_at
        ) VALUES(
          gen_random_uuid(),v_pid,v_tcopt,
          COALESCE(v_scr.table_code, split_part(v_tcopt,'-',1)||'-'||split_part(v_tcopt,'-',2)),
          v_comp,v_loc,v_hand,v_ac2,
          COALESCE((v_scr.raw_data->>'MaxStitches')::integer,0),
          v_minqt,v_prcs,'BRL',NOW(),NOW()
        )
        ON CONFLICT(product_id,service_code,table_code,component,location)
        DO UPDATE SET
          handling_cost=EXCLUDED.handling_cost,
          table_max_area_cm2=EXCLUDED.table_max_area_cm2,
          min_qty=EXCLUDED.min_qty,price=EXCLUDED.price,updated_at=NOW();
        v_ins:=v_ins+1;
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'products_processed',v_prod,
    'records_inserted_or_updated',v_ins,
    'skipped',v_skip
  );
END;
$function$
