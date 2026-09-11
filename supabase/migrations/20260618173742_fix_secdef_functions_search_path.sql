
-- ================================================================
-- MELHORIA 2: search_path fixo em funções SECURITY DEFINER
-- ================================================================
-- Funções SECURITY DEFINER sem SET search_path são vulneráveis a
-- schema injection: um atacante com permissão de criar schemas poderia
-- criar objetos com o mesmo nome em outro schema para interceptar calls.
-- Fix: SET search_path = public garante que apenas o schema canonical
-- seja usado. pg_catalog é adicionado implicitamente pelo PostgreSQL.
-- ================================================================

-- 1/5: fn_revoke_view_write_grants_on_create (event trigger — criado nesta sessão)
CREATE OR REPLACE FUNCTION public.fn_revoke_view_write_grants_on_create()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  obj record;
  view_name text;
BEGIN
  FOR obj IN
    SELECT object_type, schema_name, object_identity
    FROM pg_event_trigger_ddl_commands()
    WHERE object_type = 'view'
      AND schema_name = 'public'
  LOOP
    view_name := obj.object_identity;
    BEGIN
      EXECUTE format(
        'REVOKE INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON %s FROM anon, authenticated',
        view_name
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'fn_revoke_view_write_grants_on_create: could not revoke on %: %',
        view_name, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- 2/5: fn_quotes_validate_discount (trigger de validação de desconto)
CREATE OR REPLACE FUNCTION public.fn_quotes_validate_discount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _max_allowed numeric;
  _real_discount_pct numeric;
  _has_valid_approval boolean;
  _current_hash text;
  _seller_id uuid;
  _msg text;
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  _seller_id := COALESCE(NEW.seller_id, NEW.created_by);

  IF _seller_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.is_coord_or_above(_seller_id) THEN
    RETURN NEW;
  END IF;

  _real_discount_pct := COALESCE(NEW.real_discount_percent, 0);

  IF _real_discount_pct <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT max_discount_percent INTO _max_allowed
  FROM public.seller_discount_limits
  WHERE user_id = _seller_id;

  IF _max_allowed IS NULL THEN
    RAISE EXCEPTION 'Vendedor sem limite de desconto cadastrado. Solicite ao admin que configure seu limite antes de salvar orcamentos.'
      USING ERRCODE = '23514';
  END IF;

  IF _real_discount_pct <= _max_allowed THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    _msg := 'Desconto de ' || ROUND(_real_discount_pct, 2)::text ||
            ' por cento acima do seu limite de ' || ROUND(_max_allowed, 2)::text ||
            ' por cento. Salve o orcamento com desconto dentro do limite primeiro, depois solicite aprovacao ao coordenador.';
    RAISE EXCEPTION '%', _msg USING ERRCODE = '23514';
  END IF;

  _current_hash := public.compute_quote_snapshot_hash(NEW.id);

  SELECT EXISTS (
    SELECT 1 FROM public.discount_approval_requests
    WHERE quote_id = NEW.id
      AND status = 'approved'
      AND (valid_until IS NULL OR valid_until > now())
      AND requested_discount_percent >= _real_discount_pct
      AND quote_snapshot_hash = _current_hash
  ) INTO _has_valid_approval;

  IF _has_valid_approval THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.discount_approval_requests
    WHERE quote_id = NEW.id AND status = 'approved'
      AND (
        (valid_until IS NOT NULL AND valid_until <= now())
        OR quote_snapshot_hash <> _current_hash
      )
  ) THEN
    RAISE EXCEPTION 'Aprovacao anterior nao vale mais (orcamento foi alterado ou aprovacao expirou). Solicite nova aprovacao ao coordenador.'
      USING ERRCODE = '23514';
  END IF;

  _msg := 'Desconto de ' || ROUND(_real_discount_pct, 2)::text ||
          ' por cento acima do seu limite de ' || ROUND(_max_allowed, 2)::text ||
          ' por cento. Solicite aprovacao ao coordenador antes de salvar.';
  RAISE EXCEPTION '%', _msg USING ERRCODE = '23514';
END;
$function$;

-- 3/5: fn_remove_product_on_sale
CREATE OR REPLACE FUNCTION public.fn_remove_product_on_sale(p_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE v_sku text;
BEGIN
  SELECT sku INTO v_sku FROM products WHERE id=p_product_id;
  UPDATE products
  SET is_on_sale=FALSE, is_on_sale_expires_at=NULL, updated_at=NOW()
  WHERE id=p_product_id;
  RETURN jsonb_build_object('status','on_sale_removido','sku',v_sku);
END;
$function$;

-- 4/5: fn_set_product_on_sale
CREATE OR REPLACE FUNCTION public.fn_set_product_on_sale(
  p_product_id uuid,
  p_expires_at timestamp with time zone,
  p_discount_pct numeric DEFAULT NULL::numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_sku    text;
  v_name   text;
BEGIN
  IF p_expires_at IS NULL THEN
    RAISE EXCEPTION 'p_expires_at é obrigatório para promoções (constraint chk_on_sale_requires_expires)';
  END IF;
  IF p_expires_at <= NOW() THEN
    RAISE EXCEPTION 'p_expires_at deve ser uma data futura (recebido: %)', p_expires_at;
  END IF;
  IF p_discount_pct IS NOT NULL AND (p_discount_pct <= 0 OR p_discount_pct >= 100) THEN
    RAISE EXCEPTION 'p_discount_pct deve estar entre 0 e 100 (recebido: %)', p_discount_pct;
  END IF;

  SELECT sku, name INTO v_sku, v_name FROM products WHERE id=p_product_id;
  IF v_sku IS NULL THEN
    RAISE EXCEPTION 'Produto % não encontrado', p_product_id;
  END IF;

  UPDATE products
  SET
    is_on_sale            = TRUE,
    is_on_sale_expires_at = p_expires_at,
    updated_at            = NOW()
  WHERE id = p_product_id;

  RETURN jsonb_build_object(
    'status',           'on_sale_ativado',
    'product_id',       p_product_id,
    'sku',              v_sku,
    'name',             v_name,
    'expires_at',       p_expires_at,
    'discount_pct',     p_discount_pct,
    'dias_restantes',   EXTRACT(DAY FROM p_expires_at - NOW())::integer
  );
END;
$function$;

-- 5/5: fn_sync_derived_product_flags
CREATE OR REPLACE FUNCTION public.fn_sync_derived_product_flags()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_on_sale_cleared  integer := 0;
  v_on_sale_expired  integer := 0;
  v_new_expired      integer := 0;
  v_featured_exp     integer := 0;
  v_bestseller_exp   integer := 0;
BEGIN
  UPDATE products
  SET is_on_sale = false, updated_at = now()
  WHERE is_on_sale  = true
    AND is_on_sale_expires_at IS NULL;
  GET DIAGNOSTICS v_on_sale_cleared = ROW_COUNT;

  UPDATE products
  SET is_on_sale = false, updated_at = now()
  WHERE is_on_sale = true
    AND is_on_sale_expires_at IS NOT NULL
    AND is_on_sale_expires_at < now();
  GET DIAGNOSTICS v_on_sale_expired = ROW_COUNT;

  UPDATE products
  SET is_new = false, updated_at = now()
  WHERE is_new = true
    AND is_new_expires_at IS NOT NULL
    AND is_new_expires_at < now();
  GET DIAGNOSTICS v_new_expired = ROW_COUNT;

  UPDATE products
  SET is_featured = false, updated_at = now()
  WHERE is_featured = true
    AND is_featured_expires_at IS NOT NULL
    AND is_featured_expires_at < now();
  GET DIAGNOSTICS v_featured_exp = ROW_COUNT;

  UPDATE products
  SET is_bestseller = false, updated_at = now()
  WHERE is_bestseller = true
    AND is_bestseller_expires_at IS NOT NULL
    AND is_bestseller_expires_at < now();
  GET DIAGNOSTICS v_bestseller_exp = ROW_COUNT;

  RETURN jsonb_build_object(
    'version',               'v3_2026-06-14_remove_stockout_onsale',
    'is_on_sale_cleared',    v_on_sale_cleared,
    'is_on_sale_expired',    v_on_sale_expired,
    'is_new_expired',        v_new_expired,
    'is_featured_expired',   v_featured_exp,
    'is_bestseller_expired', v_bestseller_exp
  );
END;
$function$;
;
