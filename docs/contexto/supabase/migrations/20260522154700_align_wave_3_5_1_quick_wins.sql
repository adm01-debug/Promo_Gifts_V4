ALTER TABLE public.frontend_telemetry ALTER COLUMN duration_ms TYPE double precision

ALTER TABLE public.ip_access_control ADD COLUMN updated_at timestamp with time zone DEFAULT now()

CREATE TRIGGER set_updated_at on ip_access_control
