-- G9: fn_video_queue_update era SECURITY INVOKER => como anon (processor do VPS),
-- todo UPDATE de status de erro/skip era no-op silencioso (RLS sem policy de UPDATE).
-- Alinha à família (fn_video_queue_next, fn_*_link_video, fn_video_set_dimensions...).
ALTER FUNCTION public.fn_video_queue_update(uuid, text, text, text, text, text, integer, bigint, text) SECURITY DEFINER;;
