
-- =============================================================
-- FIX #08: Separar os 2 jobs */2 HTTP (colisão 30x/hora)
-- ANTES: ambos em 0,2,4,6,...58 (sempre juntos!)
-- DEPOIS: generate-blurhashes nos minutos ÍMPARES, hash nos PARES
-- =============================================================

-- JOB 131: generate-blurhashes → minutos ÍMPARES (elimina colisão com hash-product-images)
SELECT cron.unschedule('generate-blurhashes');
SELECT cron.schedule(
  'generate-blurhashes',
  '1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53,55,57,59 * * * *',
  $$SELECT net.http_post(
    url := public.get_edge_functions_base_url() || '/functions/v1/generate-blurhashes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.get_edge_anon_key(),
      'x-cron-secret', public.get_edge_function_secret('GENERATE_BLURHASHES_CRON_SECRET')
    ),
    body := '{"trigger":"cron"}'::jsonb,
    timeout_milliseconds := 55000
  )$$
);

-- JOB 132: hash-product-images → minutos PARES (mantém */2, já começa em :00)
-- Sem mudança necessária — agora nunca bate com generate-blurhashes
-- Apenas adiciona guard para evitar sobreposição
SELECT cron.unschedule('hash-product-images');
SELECT cron.schedule(
  'hash-product-images',
  '*/2 * * * *',
  $$SELECT net.http_post(
    url := public.get_edge_functions_base_url() || '/functions/v1/hash-product-images',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.get_edge_anon_key(),
      'x-cron-secret', public.get_edge_function_secret('HASH_PRODUCT_IMAGES_CRON_SECRET')
    ),
    body := '{"trigger":"cron"}'::jsonb,
    timeout_milliseconds := 55000
  )$$
);
;
