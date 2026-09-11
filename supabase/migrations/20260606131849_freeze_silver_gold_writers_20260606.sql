-- Consolidacao: congela os writers Gold da camada silver_* (duplicata). Reversivel via rename de volta.
alter function public.fn_silver_to_gold(uuid)
  rename to fn_silver_to_gold__deprecated_20260606;
alter function public.fn_silver_batch_to_gold(text, integer)
  rename to fn_silver_batch_to_gold__deprecated_20260606;;
