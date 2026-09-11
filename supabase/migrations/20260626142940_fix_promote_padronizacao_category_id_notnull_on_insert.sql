-- BUG FIX (descoberto em teste exaustivo, mascarado pelo bug do 'active') —
-- fn_promote_padronizacao insere o produto ANTES de resolver a categoria, mas
-- products.category_id é NOT NULL sem default => INSERT de produto NOVO falha com
-- 'null value in column category_id'. A categoria real só é resolvida adiante
-- (v_cat_id via mapping/fn_promote_category_fallback) e aplicada na linha 129
-- (UPDATE ... category_id = COALESCE(v_cat_id, v_existing_cat, p.category_id)).
-- Fix: INSERT com placeholder da categoria 'Outros' (c0000000-...), que é SEMPRE
-- sobrescrito pela linha 129 com a categoria real (provado end-to-end: produto
-- E@09284 promoveu com categoria 'Squeeze | Garrafas | Metal', não 'Outros').
-- fix_version=2026-06-26_promote_category_id_default
-- ANTI-REGRESSÃO (Lovable bot): products.category_id é NOT NULL — o INSERT DEVE
-- fornecer category_id (placeholder 'Outros'); NÃO remover.
DO $f$
DECLARE v_def text; v_new text; v_c1 int; v_c2 int;
BEGIN
  v_def := pg_get_functiondef('public.fn_promote_padronizacao(uuid)'::regprocedure);
  IF v_def LIKE '%product_type, category_id)%' THEN
    RETURN; -- já corrigido (idempotente)
  END IF;
  v_c1 := (length(v_def) - length(replace(v_def,'name, is_active, product_type)','')))/length('name, is_active, product_type)');
  v_c2 := (length(v_def) - length(replace(v_def,'true, ''product'')','')))/length('true, ''product'')');
  IF v_c1 <> 1 OR v_c2 <> 1 THEN
    RAISE EXCEPTION 'Ancoras inesperadas (c1=%, c2=%) — abortando para nao corromper a funcao', v_c1, v_c2;
  END IF;
  v_new := replace(v_def,'name, is_active, product_type)','name, is_active, product_type, category_id)');
  v_new := replace(v_new,'true, ''product'')','true, ''product'', ''c0000000-0000-0000-0000-000000000000'')');
  EXECUTE v_new;
END $f$;;
