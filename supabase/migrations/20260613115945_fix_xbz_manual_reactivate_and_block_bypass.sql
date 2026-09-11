
-- ═══════════════════════════════════════════════════════════════
-- PARTE 1: Reativar XBZ-MANUAL (produtos + variantes + VSS)
-- ═══════════════════════════════════════════════════════════════

-- 1a. Reativar VSS
UPDATE variant_supplier_sources vss
SET is_active = true, is_preferred = true, quantity = COALESCE(quantity, 0), updated_at = NOW()
FROM product_variants pv
JOIN products p ON p.id = pv.product_id
WHERE vss.variant_id = pv.id
  AND p.sku LIKE 'XBZ-MANUAL-%';

-- 1b. Reativar variantes
UPDATE product_variants pv
SET is_active = true, updated_at = NOW()
FROM products p
WHERE pv.product_id = p.id
  AND p.sku LIKE 'XBZ-MANUAL-%';

-- 1c. Reativar produtos (usando SET LOCAL para bypassar o block trigger)
-- SECURITY DEFINER + approved GUC para passar pelo trigger de bloqueio
DO $$
BEGIN
  -- Aprovar a reativação (é a operação inversa — ativar, não desativar)
  -- O trigger de bloqueio só é ativo para is_active TRUE → FALSE
  -- Reativação (FALSE → TRUE) não é bloqueada, mas active precisa acompanhar
  UPDATE products
  SET active = true, is_active = true, updated_at = NOW()
  WHERE sku LIKE 'XBZ-MANUAL-%'
    AND (active = false OR is_active = false);
END $$;

-- ═══════════════════════════════════════════════════════════════
-- PARTE 2: Corrigir fn_block_unauthorized_product_deactivation
-- para também bloquear active=false (o bypass vector)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_block_unauthorized_product_deactivation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_approved   text := COALESCE(current_setting('app.deactivation_approved', true), 'false');
  v_src        text := COALESCE(current_setting('app.write_source', true), 'ui');
  v_auth_row   _deactivation_auth%ROWTYPE;
BEGIN
  -- ── Proteção para INSERT: produto não pode nascer inativo
  IF TG_OP = 'INSERT' AND (NEW.is_active = false OR NEW.active = false) THEN
    IF v_approved <> 'true' THEN
      NEW.is_active := true;
      NEW.active    := true;
      RAISE NOTICE '[DEACTIVATION BLOCKED INSERT] Produto % criado como ativo.',
        COALESCE(NEW.supplier_reference, NEW.sku, 'sem-ref');
    END IF;
    RETURN NEW;
  END IF;

  -- ── Proteção para UPDATE: ativo → inativo via is_active OU via active
  IF TG_OP = 'UPDATE' AND (
    (OLD.is_active = true AND NEW.is_active = false) OR
    (OLD.active    = true AND NEW.active    = false)
  ) THEN
    -- Verificar via GUC
    IF v_approved = 'true' THEN
      PERFORM set_config('app.deactivation_approved', 'false', false);
      RAISE NOTICE '[DEACTIVATION ALLOWED] Produto % desativado (src=%)',
        COALESCE(NEW.supplier_reference, NEW.sku), v_src;
      RETURN NEW;
    END IF;

    -- Verificar via tabela _deactivation_auth
    SELECT * INTO v_auth_row
    FROM _deactivation_auth
    WHERE product_id = OLD.id
      AND used = false
      AND expires_at > now()
    LIMIT 1;

    IF v_auth_row.id IS NOT NULL THEN
      UPDATE _deactivation_auth SET used=true WHERE id=v_auth_row.id;
      RAISE NOTICE '[DEACTIVATION ALLOWED via AUTH TABLE] Produto % (request=%)',
        COALESCE(NEW.supplier_reference, NEW.sku), v_auth_row.request_id;
      RETURN NEW;
    END IF;

    -- BLOQUEAR — reverter AMBOS os campos
    NEW.is_active := OLD.is_active;
    NEW.active    := OLD.active;
    RAISE NOTICE '[DEACTIVATION BLOCKED] Produto % requer aprovação (campo: %)',
      COALESCE(NEW.supplier_reference, 'sem-ref'),
      CASE WHEN OLD.is_active = true AND NEW.is_active = false THEN 'is_active'
           ELSE 'active' END;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- PARTE 3: Adicionar reativação automática ao fantasmas-deactivate-guard
-- (proteção de emergência periódica)
-- ═══════════════════════════════════════════════════════════════

SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'fantasmas-deactivate-guard'),
  command := $cmd$
  -- Guard 1: fantasmas (sem supplier_reference e sku)
  UPDATE products
  SET is_active = false, updated_at = now()
  WHERE is_active = true
    AND supplier_reference IS NULL
    AND sku IS NULL
    AND supplier_id IS NOT NULL;

  -- Guard 2: produtos com 'active' em locked_fields devem ter active=false E is_active=false
  UPDATE products
  SET active = false, is_active = false, updated_at = now()
  WHERE 'active' = ANY(COALESCE(locked_fields, '{}'))
    AND (active = true OR is_active = true);

  -- Guard 3 (NOVO): reativar XBZ-MANUAL que foram incorretamente desativados por bypass do trigger
  UPDATE products SET active = true, is_active = true, updated_at = now()
  WHERE sku LIKE 'XBZ-MANUAL-%' AND (active = false OR is_active = false);
  $cmd$
);
;
