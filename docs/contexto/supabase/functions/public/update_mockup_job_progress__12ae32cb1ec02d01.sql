CREATE OR REPLACE FUNCTION public.update_mockup_job_progress()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  UPDATE public.mockup_generation_jobs
  SET 
    completed_mockups        = completed_mockups + 1,
    status                   = CASE WHEN (completed_mockups + 1) >= total_mockups THEN 'completed' ELSE 'processing' END,
    processing_completed_at  = CASE WHEN (completed_mockups + 1) >= total_mockups THEN now() ELSE processing_completed_at END
  WHERE id = NEW.job_id;
  RETURN NEW;
END $function$
