
-- Dropar a constraint (que leva o índice junto)
-- O ux_ index permanece para o ON CONFLICT da função
ALTER TABLE public.ai_insights_cache 
  DROP CONSTRAINT uq_ai_insights_cache_user_fn_key;
;
