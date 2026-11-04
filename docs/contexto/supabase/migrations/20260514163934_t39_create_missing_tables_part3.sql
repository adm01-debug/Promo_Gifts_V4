-- 1. admin_settings
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key        TEXT        NOT NULL UNIQUE,
  value      JSONB       NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='admin_settings' AND policyname='Admins can view admin_settings') THEN
    CREATE POLICY "Admins can view admin_settings"
      ON public.admin_settings FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='admin_settings' AND policyname='Admins can insert admin_settings') THEN
    CREATE POLICY "Admins can insert admin_settings"
      ON public.admin_settings FOR INSERT TO authenticated
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='admin_settings' AND policyname='Admins can update admin_settings') THEN
    CREATE POLICY "Admins can update admin_settings"
      ON public.admin_settings FOR UPDATE TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_admin_settings_updated_at') THEN
    CREATE TRIGGER update_admin_settings_updated_at
      BEFORE UPDATE ON public.admin_settings
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 2. category_icons
CREATE TABLE IF NOT EXISTS public.category_icons (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_name TEXT        NOT NULL,
  icon          TEXT        NOT NULL,
  description   TEXT,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.category_icons ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='category_icons' AND policyname='Anyone can read category icons') THEN
    CREATE POLICY "Anyone can read category icons"
      ON public.category_icons FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='category_icons' AND policyname='Admins can insert category icons') THEN
    CREATE POLICY "Admins can insert category icons"
      ON public.category_icons FOR INSERT TO authenticated
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='category_icons' AND policyname='Admins can update category icons') THEN
    CREATE POLICY "Admins can update category icons"
      ON public.category_icons FOR UPDATE TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='category_icons' AND policyname='Admins can delete category icons') THEN
    CREATE POLICY "Admins can delete category icons"
      ON public.category_icons FOR DELETE TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
