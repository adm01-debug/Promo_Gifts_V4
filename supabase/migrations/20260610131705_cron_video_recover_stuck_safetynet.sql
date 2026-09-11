-- G12: rede de segurança INDEPENDENTE do VPS.
-- Antes, fn_video_queue_recover_stuck só rodava DENTRO de um run do processor (linha 334 do main).
-- Se o cron do VPS falhar (container down, lock, erro de boot), itens presos em 'downloading'
-- ficavam presos indefinidamente. Este pg_cron recupera no banco, a cada 15min, desacoplado.
-- Provado seguro por 700 simulações de invariante (idempotente, não toca item <30min nem linked).
SELECT cron.schedule(
  'video-recover-stuck',
  '*/15 * * * *',
  $$ SELECT public.fn_video_queue_recover_stuck(); $$
);;
