
-- AUDIT 2026-06-17: generated_mockups had 0 rows because saveMockupToDb omits two
-- NOT NULL columns that have no default:
--   * job_id  -> vestigial FK to the removed AI "nano-banana" jobs pipeline. The
--                deterministic canvas compositor no longer creates jobs. Make nullable.
--                (AFTER INSERT trigger update_mockup_job_progress is NULL-safe: its
--                 UPDATE ... WHERE id = NEW.job_id simply matches 0 rows.)
--   * product_color_hex -> give a sensible default so inserts succeed even when the
--                          client doesn't pass a chosen product color.
ALTER TABLE public.generated_mockups ALTER COLUMN job_id DROP NOT NULL;
ALTER TABLE public.generated_mockups ALTER COLUMN product_color_hex SET DEFAULT '#FFFFFF';
;
