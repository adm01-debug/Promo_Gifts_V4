ALTER TABLE public.color_equivalences SET (
  autovacuum_vacuum_threshold = 50,
  autovacuum_analyze_threshold = 50,
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.05
);
