-- T34b: Set v_category_keywords and v_product_tokens to SECURITY INVOKER
-- These views were recreated during T34 without explicit security settings;
-- the advisor requires SECURITY INVOKER to enforce RLS of the querying user.
ALTER VIEW public.v_category_keywords SET (security_invoker = true);
ALTER VIEW public.v_product_tokens    SET (security_invoker = true);
