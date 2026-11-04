CREATE OR REPLACE FUNCTION public.fn_block_unauthorized_product_deactivation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_approved   text := COALESCE(current_setting('app.deactivation_approved', true), 'false');
  v_src        text := COALESCE(current_setting('app.write_source', true), 'ui');
  v_auth_row   product_deactivation_tokens%ROWTYPE;
BEGIN
  -- ── Proteção para INSERT: produto não pode nascer inativo
  IF TG_OP = 'INSERT' AND NEW.is_active = false THEN
    IF v_approved <> 'true' THEN
      NEW.is_active := true;
      RAISE NOTICE '[DEACTIVATION BLOCKED INSERT] Produto % criado como ativo.',
        COALESCE(NEW.supplier_reference, NEW.sku, 'sem-ref');
    END IF;
    RETURN NEW;
  END IF;

  -- ── Proteção para UPDATE: ativo → inativo via is_active
  IF TG_OP = 'UPDATE' AND (OLD.is_active = true AND NEW.is_active = false) THEN
    -- Verificar via GUC
    IF v_approved = 'true' THEN
      PERFORM set_config('app.deactivation_approved', 'false', false);
      RAISE NOTICE '[DEACTIVATION ALLOWED] Produto % desativado (src=%)',
        COALESCE(NEW.supplier_reference, NEW.sku), v_src;
      RETURN NEW;
    END IF;

    -- Verificar via tabela product_deactivation_tokens
    SELECT * INTO v_auth_row
    FROM product_deactivation_tokens
    WHERE product_id = OLD.id
      AND used = false
      AND expires_at > now()
    LIMIT 1;

    IF v_auth_row.id IS NOT NULL THEN
      UPDATE product_deactivation_tokens SET used=true WHERE id=v_auth_row.id;
      RAISE NOTICE '[DEACTIVATION ALLOWED via AUTH TABLE] Produto % (request=%)',
        COALESCE(NEW.supplier_reference, NEW.sku), v_auth_row.request_id;
      RETURN NEW;
    END IF;

    -- BLOQUEAR — reverter is_active
    NEW.is_active := OLD.is_active;
    RAISE NOTICE '[DEACTIVATION BLOCKED] Produto % requer aprovação via is_active',
      COALESCE(NEW.supplier_reference, 'sem-ref');
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$
