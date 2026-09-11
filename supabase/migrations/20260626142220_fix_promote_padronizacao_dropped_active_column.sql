-- BUG FIX (descoberto em teste exaustivo) — fn_promote_padronizacao inseria a
-- coluna products.active (PERMANENTEMENTE DROPADA), quebrando a promoção de
-- PRODUTOS NOVOS com 'column "active" of relation "products" does not exist'
-- (6 variantes XBZ E@ travadas em pending). Patch dinâmico: remove a coluna
-- 'active' do INSERT INTO products e seu valor correspondente, preservando o
-- restante da função verbatim (search_path/security/corpo).
-- fix_version=2026-06-26_promote_drop_active_col
-- ANTI-REGRESSÃO (Lovable bot): products NÃO tem coluna 'active' (apenas is_active).
DO $f$
DECLARE v_def text; v_new text;
BEGIN
  v_def := pg_get_functiondef('public.fn_promote_padronizacao(uuid)'::regprocedure);
  v_new := replace(v_def, 'name, active, is_active, product_type)', 'name, is_active, product_type)');
  v_new := replace(v_new, 'true, true, ''product'')', 'true, ''product'')');
  IF v_new <> v_def THEN
    EXECUTE v_new;
  END IF;
END $f$;;
