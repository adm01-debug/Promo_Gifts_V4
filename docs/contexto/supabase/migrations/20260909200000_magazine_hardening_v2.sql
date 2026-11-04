-- Magazine hardening v2. Forward-only; do not apply without explicit production approval.
-- Adds a monotonic CAS token, central state guards and RPC-only mutations.

ALTER TABLE public.magazines
  ADD COLUMN IF NOT EXISTS edit_version BIGINT NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.magazines'::regclass
      AND conname = 'magazines_edit_version_nonnegative'
  ) THEN
    ALTER TABLE public.magazines
      ADD CONSTRAINT magazines_edit_version_nonnegative CHECK (edit_version >= 0);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.magazine_duplicate_requests (
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  source_magazine_id UUID NOT NULL REFERENCES public.magazines(id) ON DELETE CASCADE,
  source_edit_version BIGINT NOT NULL,
  request_title TEXT,
  requested_title TEXT NOT NULL,
  magazine_id UUID NOT NULL REFERENCES public.magazines(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (actor_id, idempotency_key),
  CONSTRAINT magazine_duplicate_requests_key_len
    CHECK (char_length(idempotency_key) BETWEEN 1 AND 120)
);

ALTER TABLE public.magazine_duplicate_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magazine_duplicate_requests
  ADD COLUMN IF NOT EXISTS request_title TEXT;
REVOKE ALL ON TABLE public.magazine_duplicate_requests FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.magazine_validate_page_order_v2(
  p_magazine_id UUID,
  p_page_order JSONB
) RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_pages JSONB;
BEGIN
  IF p_page_order IS NULL OR p_page_order = 'null'::JSONB THEN
    RETURN TRUE;
  END IF;

  IF jsonb_typeof(p_page_order) = 'array' THEN
    IF jsonb_array_length(p_page_order) > 200 OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_page_order) AS entry(value)
      WHERE jsonb_typeof(value) IS DISTINCT FROM 'number'
         OR (value #>> '{}') !~ '^[0-9]+$'
         OR (value #>> '{}')::NUMERIC > 200
    ) OR (SELECT count(*) FROM jsonb_array_elements(p_page_order)) <>
         (SELECT count(DISTINCT value) FROM jsonb_array_elements(p_page_order) entry(value)) THEN
      RETURN FALSE;
    END IF;
    RETURN TRUE;
  END IF;

  IF jsonb_typeof(p_page_order) IS DISTINCT FROM 'object'
     OR EXISTS (
       SELECT 1 FROM jsonb_object_keys(p_page_order) AS envelope(key)
       WHERE key <> ALL (ARRAY['version', 'pages'])
     )
     OR jsonb_typeof(p_page_order->'version') IS DISTINCT FROM 'number'
     OR (p_page_order->>'version')::NUMERIC IS DISTINCT FROM 2
     OR jsonb_typeof(p_page_order->'pages') IS DISTINCT FROM 'array' THEN
    RETURN FALSE;
  END IF;

  v_pages := p_page_order->'pages';
  IF jsonb_array_length(v_pages) NOT BETWEEN 2 AND 200
     OR v_pages->0->>'kind' IS DISTINCT FROM 'cover'
     OR NOT COALESCE(v_pages->-1->>'kind' = ANY (ARRAY['contact', 'back-cover']), FALSE)
     OR (SELECT count(*) FROM jsonb_array_elements(v_pages) p(value)
         WHERE value->>'kind' = 'cover') <> 1
     OR (SELECT count(*) FROM jsonb_array_elements(v_pages) p(value)
         WHERE value->>'kind' IN ('contact', 'back-cover')) <> 1
     OR (SELECT count(*) FROM jsonb_array_elements(v_pages)) <>
        (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(v_pages) p(value)) THEN
    RETURN FALSE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_pages) AS page(value)
    WHERE jsonb_typeof(value) IS DISTINCT FROM 'object'
       OR EXISTS (
         SELECT 1 FROM jsonb_object_keys(
           CASE WHEN jsonb_typeof(value) = 'object' THEN value ELSE '{}'::JSONB END
         ) AS field(key)
         WHERE key <> ALL (ARRAY['id', 'kind', 'title', 'body', 'itemIds'])
       )
       OR jsonb_typeof(value->'id') IS DISTINCT FROM 'string'
       OR char_length(BTRIM(value->>'id')) NOT BETWEEN 1 AND 120
       OR jsonb_typeof(value->'kind') IS DISTINCT FROM 'string'
       OR NOT COALESCE(value->>'kind' = ANY (
         ARRAY['cover', 'institutional', 'section', 'products', 'contact', 'back-cover']
       ), FALSE)
       OR (value ? 'title' AND (
         jsonb_typeof(value->'title') IS DISTINCT FROM 'string'
         OR char_length(value->>'title') > 120
       ))
       OR (value ? 'body' AND (
         jsonb_typeof(value->'body') IS DISTINCT FROM 'string'
         OR char_length(value->>'body') > 800
       ))
       OR (value ? 'itemIds' AND value->>'kind' IS DISTINCT FROM 'products')
       OR (value ? 'itemIds' AND jsonb_typeof(value->'itemIds') IS DISTINCT FROM 'array')
       OR (value ? 'itemIds' AND jsonb_typeof(value->'itemIds') = 'array'
           AND jsonb_array_length(value->'itemIds') > 500)
  ) THEN
    RETURN FALSE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_pages) page(value)
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(page.value->'itemIds') = 'array'
           THEN page.value->'itemIds' ELSE '[]'::JSONB END
    ) item(value)
    WHERE jsonb_typeof(item.value) IS DISTINCT FROM 'string'
       OR (item.value #>> '{}') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) THEN
    RETURN FALSE;
  END IF;

  IF (
    SELECT count(*) FROM jsonb_array_elements(v_pages) page(value)
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(page.value->'itemIds') = 'array'
           THEN page.value->'itemIds' ELSE '[]'::JSONB END
    ) item(value)
  ) > 500 OR (
    SELECT count(*) FROM jsonb_array_elements(v_pages) page(value)
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(page.value->'itemIds') = 'array'
           THEN page.value->'itemIds' ELSE '[]'::JSONB END
    ) item(value)
  ) <> (
    SELECT count(DISTINCT item.value) FROM jsonb_array_elements(v_pages) page(value)
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(page.value->'itemIds') = 'array'
           THEN page.value->'itemIds' ELSE '[]'::JSONB END
    ) item(value)
  ) THEN
    RETURN FALSE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_pages) page(value)
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(page.value->'itemIds') = 'array'
           THEN page.value->'itemIds' ELSE '[]'::JSONB END
    ) item(value)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.magazine_items mi
      WHERE mi.magazine_id = p_magazine_id
        AND mi.id = (item.value #>> '{}')::UUID
    )
  ) THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RETURN FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.magazine_validate_page_order_v2(UUID, JSONB) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.magazine_page_order_remove_items_v2(
  p_page_order JSONB,
  p_item_ids UUID[]
) RETURNS JSONB
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT CASE
    WHEN jsonb_typeof(p_page_order) IS DISTINCT FROM 'object'
      OR jsonb_typeof(p_page_order->'pages') IS DISTINCT FROM 'array'
      THEN p_page_order
    ELSE jsonb_set(
      p_page_order,
      '{pages}',
      COALESCE((
        SELECT jsonb_agg(
          CASE WHEN jsonb_typeof(page.value->'itemIds') = 'array'
            THEN jsonb_set(
              page.value,
              '{itemIds}',
              COALESCE((
                SELECT jsonb_agg(item.value ORDER BY item.ordinality)
                FROM jsonb_array_elements(page.value->'itemIds')
                  WITH ORDINALITY item(value, ordinality)
                WHERE NOT ((item.value #>> '{}')::UUID = ANY (p_item_ids))
              ), '[]'::JSONB),
              FALSE
            )
            ELSE page.value END
          ORDER BY page.ordinality
        )
        FROM jsonb_array_elements(p_page_order->'pages')
          WITH ORDINALITY page(value, ordinality)
      ), '[]'::JSONB),
      FALSE
    )
  END
$$;

REVOKE ALL ON FUNCTION public.magazine_page_order_remove_items_v2(JSONB, UUID[]) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.magazine_guard_and_version_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_temp'
AS $$
DECLARE
  v_changed BOOLEAN;
  v_content_changed BOOLEAN;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'published' THEN
      RAISE EXCEPTION 'magazine_publish_requires_rpc' USING ERRCODE = '42501';
    END IF;
    IF NEW.content_settings ? '__magazine_import_v2'
       AND current_setting('app.magazine_import_v2', TRUE) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'magazine_import_marker_forbidden' USING ERRCODE = '42501';
    END IF;
    NEW.edit_version := COALESCE(NEW.edit_version, 0);
    NEW.updated_at := clock_timestamp();
    NEW.public_token := NULL;
    IF NEW.status = 'archived' THEN
      NEW.archived_at := COALESCE(NEW.archived_at, clock_timestamp());
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.content_settings ? '__magazine_import_v2' THEN
    IF NEW.content_settings ? '__magazine_import_v2'
       AND NEW.content_settings->'__magazine_import_v2'
           IS DISTINCT FROM OLD.content_settings->'__magazine_import_v2' THEN
      RAISE EXCEPTION 'magazine_import_marker_immutable' USING ERRCODE = '42501';
    ELSIF NOT (NEW.content_settings ? '__magazine_import_v2') THEN
      NEW.content_settings := NEW.content_settings || jsonb_build_object(
        '__magazine_import_v2', OLD.content_settings->'__magazine_import_v2'
      );
    END IF;
  END IF;

  v_changed := ROW(
    NEW.owner_id, NEW.organization_id, NEW.title, NEW.subtitle, NEW.template_id,
    NEW.branding, NEW.content_settings, NEW.page_order, NEW.status,
    NEW.public_token, NEW.published_at, NEW.archived_at, NEW.deleted_at
  ) IS DISTINCT FROM ROW(
    OLD.owner_id, OLD.organization_id, OLD.title, OLD.subtitle, OLD.template_id,
    OLD.branding, OLD.content_settings, OLD.page_order, OLD.status,
    OLD.public_token, OLD.published_at, OLD.archived_at, OLD.deleted_at
  );

  v_content_changed := ROW(
    NEW.owner_id, NEW.organization_id, NEW.title, NEW.subtitle, NEW.template_id,
    NEW.branding, NEW.content_settings, NEW.page_order
  ) IS DISTINCT FROM ROW(
    OLD.owner_id, OLD.organization_id, OLD.title, OLD.subtitle, OLD.template_id,
    OLD.branding, OLD.content_settings, OLD.page_order
  );

  IF OLD.deleted_at IS NOT NULL AND v_content_changed THEN
    RAISE EXCEPTION 'magazine_deleted_read_only' USING ERRCODE = '55000';
  END IF;

  IF OLD.status = 'published' AND OLD.deleted_at IS NULL THEN
    IF v_content_changed THEN
      RAISE EXCEPTION 'magazine_published_read_only' USING ERRCODE = '55000';
    END IF;
    IF NEW.deleted_at IS NULL AND NEW.status = 'published' AND v_changed THEN
      RAISE EXCEPTION 'magazine_published_read_only' USING ERRCODE = '55000';
    END IF;
    IF NEW.deleted_at IS NULL AND NEW.status NOT IN ('published', 'draft', 'archived') THEN
      RAISE EXCEPTION 'magazine_transition_invalid' USING ERRCODE = '55000';
    END IF;
  END IF;

  IF OLD.status = 'archived' AND OLD.deleted_at IS NULL
     AND NEW.deleted_at IS NULL AND NEW.status NOT IN ('archived', 'draft') THEN
    RAISE EXCEPTION 'magazine_transition_invalid' USING ERRCODE = '55000';
  END IF;
  IF OLD.status = 'archived' AND OLD.deleted_at IS NULL AND v_content_changed THEN
    RAISE EXCEPTION 'magazine_archived_read_only' USING ERRCODE = '55000';
  END IF;
  IF OLD.status = 'archived' AND OLD.deleted_at IS NULL
     AND NEW.deleted_at IS NULL AND NEW.status = 'archived' AND v_changed THEN
    RAISE EXCEPTION 'magazine_archived_read_only' USING ERRCODE = '55000';
  END IF;

  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    NEW.status := 'archived';
    NEW.archived_at := COALESCE(NEW.archived_at, clock_timestamp());
    NEW.public_token := NULL;
  ELSIF NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN
    NEW.status := 'draft';
    NEW.archived_at := NULL;
    NEW.public_token := NULL;
    NEW.published_at := NULL;
  ELSIF NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published' THEN
    IF OLD.status IS DISTINCT FROM 'draft'
       OR BTRIM(COALESCE(NEW.title, '')) = ''
       OR NOT EXISTS (SELECT 1 FROM public.magazine_items WHERE magazine_id = NEW.id)
       OR NOT public.magazine_validate_page_order_v2(NEW.id, NEW.page_order) THEN
      RAISE EXCEPTION 'magazine_publish_requirements_not_met' USING ERRCODE = '22023';
    END IF;
    NEW.public_token := encode(extensions.gen_random_bytes(24), 'hex');
    NEW.published_at := clock_timestamp();
    NEW.archived_at := NULL;
  ELSIF OLD.status = 'published' AND NEW.status = 'draft' THEN
    NEW.public_token := NULL;
  ELSIF NEW.status = 'archived' AND OLD.status IS DISTINCT FROM 'archived' THEN
    NEW.public_token := NULL;
    NEW.archived_at := clock_timestamp();
  ELSIF OLD.status = 'archived' AND NEW.status = 'draft' THEN
    NEW.archived_at := NULL;
    NEW.public_token := NULL;
  END IF;

  IF NEW.page_order IS DISTINCT FROM OLD.page_order
     AND NOT public.magazine_validate_page_order_v2(NEW.id, NEW.page_order) THEN
    RAISE EXCEPTION 'magazine_page_order_invalid' USING ERRCODE = '22023';
  END IF;

  v_changed := v_changed
    OR NEW.updated_at IS DISTINCT FROM OLD.updated_at
    OR NEW.edit_version IS DISTINCT FROM OLD.edit_version;
  IF v_changed THEN
    IF NEW.edit_version NOT IN (OLD.edit_version, OLD.edit_version + 1) THEN
      RAISE EXCEPTION 'magazine_edit_version_invalid' USING ERRCODE = '22023';
    END IF;
    NEW.edit_version := OLD.edit_version + 1;
    NEW.updated_at := clock_timestamp();
  ELSE
    NEW.edit_version := OLD.edit_version;
    NEW.updated_at := OLD.updated_at;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.magazine_guard_and_version_v2() FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_magazines_on_publish ON public.magazines;
DROP TRIGGER IF EXISTS trg_magazines_updated_at ON public.magazines;
DROP TRIGGER IF EXISTS trg_magazines_guard_and_version_v2 ON public.magazines;
CREATE TRIGGER trg_magazines_guard_and_version_v2
BEFORE INSERT OR UPDATE ON public.magazines
FOR EACH ROW EXECUTE FUNCTION public.magazine_guard_and_version_v2();

CREATE OR REPLACE FUNCTION public.magazine_items_guard_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_magazine_id UUID := CASE WHEN TG_OP = 'INSERT' THEN NEW.magazine_id ELSE OLD.magazine_id END;
  v_status TEXT;
  v_deleted_at TIMESTAMPTZ;
BEGIN
  SELECT status::TEXT, deleted_at INTO v_status, v_deleted_at
  FROM public.magazines WHERE id = v_magazine_id FOR UPDATE;
  IF NOT FOUND THEN
    IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN RETURN OLD; END IF;
    RAISE EXCEPTION 'magazine_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_deleted_at IS NOT NULL OR v_status <> 'draft' THEN
    RAISE EXCEPTION 'magazine_not_editable' USING ERRCODE = '55000';
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.magazine_id IS DISTINCT FROM v_magazine_id
       OR jsonb_typeof(NEW.product_snapshot) IS DISTINCT FROM 'object'
       OR jsonb_typeof(NEW.overrides) IS DISTINCT FROM 'object'
       OR NEW.position < 0
       OR (NEW.page_number IS NOT NULL AND NEW.page_number NOT BETWEEN 1 AND 200) THEN
      RAISE EXCEPTION 'magazine_item_invalid' USING ERRCODE = '22023';
    END IF;
    NEW.updated_at := clock_timestamp();
  END IF;
  IF TG_OP = 'INSERT' AND (
    SELECT count(*) FROM public.magazine_items WHERE magazine_id = v_magazine_id
  ) >= 500 THEN
    RAISE EXCEPTION 'magazine_item_limit_exceeded' USING ERRCODE = '22023';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

REVOKE ALL ON FUNCTION public.magazine_items_guard_v2() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS trg_magazine_items_updated_at ON public.magazine_items;
DROP TRIGGER IF EXISTS trg_magazine_items_guard_v2 ON public.magazine_items;
CREATE TRIGGER trg_magazine_items_guard_v2
BEFORE INSERT OR UPDATE OR DELETE ON public.magazine_items
FOR EACH ROW EXECUTE FUNCTION public.magazine_items_guard_v2();

CREATE OR REPLACE FUNCTION public.magazine_lock_v2(
  p_magazine_id UUID,
  p_expected_edit_version BIGINT,
  p_allow_deleted BOOLEAN DEFAULT FALSE
) RETURNS public.magazines
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_mag public.magazines%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'magazine_auth_required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_mag FROM public.magazines WHERE id = p_magazine_id FOR UPDATE;
  IF NOT FOUND OR (v_mag.deleted_at IS NOT NULL AND NOT p_allow_deleted) THEN
    RAISE EXCEPTION 'magazine_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_mag.owner_id <> v_actor
     AND NOT COALESCE(public.has_role(v_actor, 'admin'::public.app_role), FALSE) THEN
    RAISE EXCEPTION 'magazine_forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_expected_edit_version IS NULL OR v_mag.edit_version <> p_expected_edit_version THEN
    RAISE EXCEPTION 'magazine_edit_conflict' USING ERRCODE = '40001';
  END IF;
  RETURN v_mag;
END;
$$;

REVOKE ALL ON FUNCTION public.magazine_lock_v2(UUID, BIGINT, BOOLEAN) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.magazine_create_v2(
  p_organization_id UUID,
  p_title TEXT,
  p_template_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_result public.magazines%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'magazine_auth_required' USING ERRCODE = '42501';
  END IF;
  IF char_length(BTRIM(COALESCE(p_title, ''))) NOT BETWEEN 1 AND 200
     OR p_template_id IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM public.magazine_templates_catalog
       WHERE template_id = p_template_id
     ) THEN
    RAISE EXCEPTION 'magazine_create_payload_invalid' USING ERRCODE = '22023';
  END IF;
  IF p_organization_id IS NOT NULL
     AND NOT COALESCE(public.has_role(v_actor, 'admin'::public.app_role), FALSE)
     AND NOT EXISTS (
       SELECT 1 FROM public.organization_members om
       WHERE om.organization_id = p_organization_id AND om.user_id = v_actor
     ) THEN
    RAISE EXCEPTION 'magazine_organization_forbidden' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.magazines(
    owner_id, organization_id, title, subtitle, template_id,
    page_order, status, public_token, published_at, archived_at
  ) VALUES (
    v_actor, p_organization_id, BTRIM(p_title), '', p_template_id,
    NULL, 'draft', NULL, NULL, NULL
  ) RETURNING * INTO v_result;
  RETURN jsonb_build_object(
    'magazine_id', v_result.id,
    'edit_version', v_result.edit_version,
    'updated_at', v_result.updated_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.magazine_update_metadata_v2(
  p_magazine_id UUID,
  p_expected_edit_version BIGINT,
  p_patch JSONB
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE v_mag public.magazines%ROWTYPE; v_result public.magazines%ROWTYPE;
BEGIN
  v_mag := public.magazine_lock_v2(p_magazine_id, p_expected_edit_version, FALSE);
  IF v_mag.status <> 'draft' THEN RAISE EXCEPTION 'magazine_not_editable' USING ERRCODE='55000'; END IF;
  IF jsonb_typeof(p_patch) IS DISTINCT FROM 'object' OR p_patch='{}'::JSONB OR pg_column_size(p_patch)>262144
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(p_patch) k(key) WHERE key <> ALL(ARRAY['title','subtitle','template_id','branding','content_settings','page_order'])) THEN
    RAISE EXCEPTION 'magazine_patch_invalid' USING ERRCODE='22023';
  END IF;
  IF p_patch ? 'title' AND (jsonb_typeof(p_patch->'title') IS DISTINCT FROM 'string' OR char_length(BTRIM(p_patch->>'title')) NOT BETWEEN 1 AND 200) THEN RAISE EXCEPTION 'magazine_title_invalid' USING ERRCODE='22023'; END IF;
  IF p_patch ? 'subtitle' AND p_patch->'subtitle'<>'null'::JSONB AND (jsonb_typeof(p_patch->'subtitle') IS DISTINCT FROM 'string' OR char_length(p_patch->>'subtitle')>300) THEN RAISE EXCEPTION 'magazine_subtitle_invalid' USING ERRCODE='22023'; END IF;
  IF p_patch ? 'template_id' AND (jsonb_typeof(p_patch->'template_id') IS DISTINCT FROM 'string' OR NOT EXISTS(SELECT 1 FROM public.magazine_templates_catalog WHERE template_id=p_patch->>'template_id')) THEN RAISE EXCEPTION 'magazine_template_invalid' USING ERRCODE='22023'; END IF;
  IF p_patch ? 'branding' AND jsonb_typeof(p_patch->'branding') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'magazine_branding_invalid' USING ERRCODE='22023'; END IF;
  IF p_patch ? 'content_settings' AND (
    jsonb_typeof(p_patch->'content_settings') IS DISTINCT FROM 'object'
    OR (
      p_patch->'content_settings' ? '__magazine_import_v2'
      AND (
        NOT (v_mag.content_settings ? '__magazine_import_v2')
        OR p_patch->'content_settings'->'__magazine_import_v2'
           IS DISTINCT FROM v_mag.content_settings->'__magazine_import_v2'
      )
    )
  ) THEN RAISE EXCEPTION 'magazine_content_invalid' USING ERRCODE='22023'; END IF;
  IF p_patch ? 'page_order' AND NOT public.magazine_validate_page_order_v2(p_magazine_id,NULLIF(p_patch->'page_order','null'::JSONB)) THEN RAISE EXCEPTION 'magazine_page_order_invalid' USING ERRCODE='22023'; END IF;
  UPDATE public.magazines SET
    title=CASE WHEN p_patch?'title' THEN BTRIM(p_patch->>'title') ELSE title END,
    subtitle=CASE WHEN p_patch?'subtitle' THEN COALESCE(p_patch->>'subtitle','') ELSE subtitle END,
    template_id=CASE WHEN p_patch?'template_id' THEN p_patch->>'template_id' ELSE template_id END,
    branding=CASE WHEN p_patch?'branding' THEN p_patch->'branding' ELSE branding END,
    content_settings=CASE WHEN p_patch?'content_settings' THEN
      ((p_patch->'content_settings') - '__magazine_import_v2'::TEXT) || CASE
        WHEN content_settings ? '__magazine_import_v2' THEN
          jsonb_build_object('__magazine_import_v2',content_settings->'__magazine_import_v2')
        ELSE '{}'::JSONB END
      ELSE content_settings END,
    page_order=CASE WHEN p_patch?'page_order' THEN NULLIF(p_patch->'page_order','null'::JSONB) ELSE page_order END,
    edit_version=v_mag.edit_version+1
  WHERE id=p_magazine_id RETURNING * INTO v_result;
  RETURN jsonb_build_object('edit_version',v_result.edit_version,'updated_at',v_result.updated_at);
END $$;

CREATE OR REPLACE FUNCTION public.magazine_add_items_v2(
  p_magazine_id UUID,
  p_expected_edit_version BIGINT,
  p_items JSONB
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE v_mag public.magazines%ROWTYPE; v_inserted INT; v_current INT; v_new INT; v_result public.magazines%ROWTYPE;
BEGIN
  v_mag:=public.magazine_lock_v2(p_magazine_id,p_expected_edit_version,FALSE);
  IF v_mag.status<>'draft' THEN RAISE EXCEPTION 'magazine_not_editable' USING ERRCODE='55000'; END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 500 OR pg_column_size(p_items)>2097152 THEN RAISE EXCEPTION 'magazine_items_invalid' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_items) e(value) WHERE jsonb_typeof(value) IS DISTINCT FROM 'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(CASE WHEN jsonb_typeof(value)='object' THEN value ELSE '{}'::JSONB END) k(key) WHERE key<>ALL(ARRAY['product_id','product_snapshot','variant_color_name','page_number','overrides'])) OR (value->>'product_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR jsonb_typeof(value->'product_snapshot') IS DISTINCT FROM 'object' OR (value?'overrides' AND jsonb_typeof(value->'overrides') IS DISTINCT FROM 'object') OR (value?'variant_color_name' AND value->'variant_color_name'<>'null'::JSONB AND (jsonb_typeof(value->'variant_color_name') IS DISTINCT FROM 'string' OR char_length(value->>'variant_color_name')>200)) OR (value?'page_number' AND value->'page_number'<>'null'::JSONB AND (jsonb_typeof(value->'page_number') IS DISTINCT FROM 'number' OR (value->>'page_number')::NUMERIC<>trunc((value->>'page_number')::NUMERIC) OR (value->>'page_number')::INT NOT BETWEEN 1 AND 200))) THEN RAISE EXCEPTION 'magazine_items_invalid' USING ERRCODE='22023'; END IF;
  SELECT count(*) INTO v_current FROM public.magazine_items WHERE magazine_id=p_magazine_id;
  SELECT count(*) INTO v_new FROM (SELECT DISTINCT (value->>'product_id')::UUID id FROM jsonb_array_elements(p_items)) x WHERE NOT EXISTS(SELECT 1 FROM public.magazine_items mi WHERE mi.magazine_id=p_magazine_id AND mi.product_id=x.id);
  IF v_current+v_new>500 THEN RAISE EXCEPTION 'magazine_item_limit_exceeded' USING ERRCODE='22023'; END IF;
  WITH payload AS (SELECT DISTINCT ON ((value->>'product_id')::UUID) (value->>'product_id')::UUID product_id,value->'product_snapshot' product_snapshot,NULLIF(value->>'variant_color_name','') variant_color_name,CASE WHEN value?'page_number' THEN (value->>'page_number')::INT END page_number,COALESCE(value->'overrides','{}'::JSONB) overrides,ordinality FROM jsonb_array_elements(p_items) WITH ORDINALITY e(value,ordinality) ORDER BY (value->>'product_id')::UUID,ordinality), fresh AS (SELECT *,row_number() OVER(ORDER BY ordinality)-1 off FROM payload p WHERE NOT EXISTS(SELECT 1 FROM public.magazine_items mi WHERE mi.magazine_id=p_magazine_id AND mi.product_id=p.product_id)), base AS (SELECT COALESCE(max(position),-1)+1 pos FROM public.magazine_items WHERE magazine_id=p_magazine_id)
  INSERT INTO public.magazine_items(magazine_id,product_id,product_snapshot,variant_color_name,position,page_number,overrides) SELECT p_magazine_id,product_id,product_snapshot,variant_color_name,base.pos+fresh.off,page_number,overrides FROM fresh CROSS JOIN base ON CONFLICT(magazine_id,product_id) DO NOTHING;
  GET DIAGNOSTICS v_inserted=ROW_COUNT;
  IF v_inserted=0 THEN RETURN jsonb_build_object('inserted',0,'edit_version',v_mag.edit_version,'updated_at',v_mag.updated_at); END IF;
  UPDATE public.magazines SET edit_version=v_mag.edit_version+1 WHERE id=p_magazine_id RETURNING * INTO v_result;
  RETURN jsonb_build_object('inserted',v_inserted,'edit_version',v_result.edit_version,'updated_at',v_result.updated_at);
END $$;

CREATE OR REPLACE FUNCTION public.magazine_remove_items_v2(
  p_magazine_id UUID,
  p_expected_edit_version BIGINT,
  p_item_ids UUID[]
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE v_mag public.magazines%ROWTYPE; v_removed INT; v_result public.magazines%ROWTYPE;
BEGIN
 v_mag:=public.magazine_lock_v2(p_magazine_id,p_expected_edit_version,FALSE); IF v_mag.status<>'draft' THEN RAISE EXCEPTION 'magazine_not_editable' USING ERRCODE='55000'; END IF;
 IF p_item_ids IS NULL OR cardinality(p_item_ids) NOT BETWEEN 1 AND 500 OR array_position(p_item_ids,NULL) IS NOT NULL OR (SELECT count(DISTINCT x) FROM unnest(p_item_ids)x)<>cardinality(p_item_ids) THEN RAISE EXCEPTION 'magazine_item_ids_invalid' USING ERRCODE='22023'; END IF;
 IF (SELECT count(*) FROM public.magazine_items WHERE magazine_id=p_magazine_id AND id=ANY(p_item_ids))<>cardinality(p_item_ids) THEN RAISE EXCEPTION 'magazine_item_not_found' USING ERRCODE='P0002'; END IF;
 DELETE FROM public.magazine_items WHERE magazine_id=p_magazine_id AND id=ANY(p_item_ids); GET DIAGNOSTICS v_removed=ROW_COUNT;
 UPDATE public.magazines SET page_order=public.magazine_page_order_remove_items_v2(page_order,p_item_ids),edit_version=v_mag.edit_version+1 WHERE id=p_magazine_id RETURNING * INTO v_result;
 RETURN jsonb_build_object('removed',v_removed,'edit_version',v_result.edit_version,'updated_at',v_result.updated_at);
END $$;

CREATE OR REPLACE FUNCTION public.magazine_reorder_items_v2(
  p_magazine_id UUID,
  p_expected_edit_version BIGINT,
  p_ordered_item_ids UUID[]
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE v_mag public.magazines%ROWTYPE; v_total INT; v_current UUID[]; v_result public.magazines%ROWTYPE;
BEGIN
 v_mag:=public.magazine_lock_v2(p_magazine_id,p_expected_edit_version,FALSE); IF v_mag.status<>'draft' THEN RAISE EXCEPTION 'magazine_not_editable' USING ERRCODE='55000'; END IF;
 IF p_ordered_item_ids IS NULL OR cardinality(p_ordered_item_ids)>500 OR array_position(p_ordered_item_ids,NULL) IS NOT NULL OR (SELECT count(DISTINCT x) FROM unnest(p_ordered_item_ids)x)<>cardinality(p_ordered_item_ids) THEN RAISE EXCEPTION 'magazine_item_ids_invalid' USING ERRCODE='22023'; END IF;
 SELECT count(*),array_agg(id ORDER BY position,id) INTO v_total,v_current FROM public.magazine_items WHERE magazine_id=p_magazine_id;
 IF v_total<>cardinality(p_ordered_item_ids) OR EXISTS(SELECT 1 FROM unnest(p_ordered_item_ids)x(id) WHERE NOT EXISTS(SELECT 1 FROM public.magazine_items mi WHERE mi.magazine_id=p_magazine_id AND mi.id=x.id)) THEN RAISE EXCEPTION 'magazine_reorder_requires_complete_item_set' USING ERRCODE='22023'; END IF;
 IF v_current IS NOT DISTINCT FROM p_ordered_item_ids THEN RETURN jsonb_build_object('reordered',0,'edit_version',v_mag.edit_version,'updated_at',v_mag.updated_at); END IF;
 WITH shifted AS(SELECT id,max(position) OVER()+row_number() OVER(ORDER BY position,id)+1 pos FROM public.magazine_items WHERE magazine_id=p_magazine_id) UPDATE public.magazine_items mi SET position=s.pos FROM shifted s WHERE mi.id=s.id;
 WITH desired AS(SELECT id,ordinality-1 pos FROM unnest(p_ordered_item_ids) WITH ORDINALITY x(id,ordinality)) UPDATE public.magazine_items mi SET position=d.pos FROM desired d WHERE mi.magazine_id=p_magazine_id AND mi.id=d.id;
 UPDATE public.magazines SET edit_version=v_mag.edit_version+1 WHERE id=p_magazine_id RETURNING * INTO v_result;
 RETURN jsonb_build_object('reordered',v_total,'edit_version',v_result.edit_version,'updated_at',v_result.updated_at);
END $$;

CREATE OR REPLACE FUNCTION public.magazine_update_item_v2(
  p_magazine_id UUID,
  p_expected_edit_version BIGINT,
  p_item_id UUID,
  p_patch JSONB
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE v_mag public.magazines%ROWTYPE; v_result public.magazines%ROWTYPE;
BEGIN
 v_mag:=public.magazine_lock_v2(p_magazine_id,p_expected_edit_version,FALSE); IF v_mag.status<>'draft' THEN RAISE EXCEPTION 'magazine_not_editable' USING ERRCODE='55000'; END IF;
 IF jsonb_typeof(p_patch) IS DISTINCT FROM 'object' OR p_patch='{}'::JSONB OR pg_column_size(p_patch)>131072 OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_patch)k(key) WHERE key<>ALL(ARRAY['product_snapshot','variant_color_name','position','page_number','overrides'])) THEN RAISE EXCEPTION 'magazine_item_patch_invalid' USING ERRCODE='22023'; END IF;
 IF p_patch?'product_snapshot' AND jsonb_typeof(p_patch->'product_snapshot') IS DISTINCT FROM 'object' OR p_patch?'overrides' AND jsonb_typeof(p_patch->'overrides') IS DISTINCT FROM 'object' OR p_patch?'variant_color_name' AND p_patch->'variant_color_name'<>'null'::JSONB AND (jsonb_typeof(p_patch->'variant_color_name') IS DISTINCT FROM 'string' OR char_length(p_patch->>'variant_color_name')>200) OR p_patch?'position' AND (jsonb_typeof(p_patch->'position') IS DISTINCT FROM 'number' OR (p_patch->>'position')::NUMERIC<0) OR p_patch?'page_number' AND p_patch->'page_number'<>'null'::JSONB AND (jsonb_typeof(p_patch->'page_number') IS DISTINCT FROM 'number' OR (p_patch->>'page_number')::NUMERIC<>trunc((p_patch->>'page_number')::NUMERIC) OR (p_patch->>'page_number')::INT NOT BETWEEN 1 AND 200) THEN RAISE EXCEPTION 'magazine_item_patch_invalid' USING ERRCODE='22023'; END IF;
 UPDATE public.magazine_items SET product_snapshot=CASE WHEN p_patch?'product_snapshot' THEN p_patch->'product_snapshot' ELSE product_snapshot END,variant_color_name=CASE WHEN p_patch?'variant_color_name' THEN NULLIF(p_patch->>'variant_color_name','') ELSE variant_color_name END,position=CASE WHEN p_patch?'position' THEN (p_patch->>'position')::NUMERIC ELSE position END,page_number=CASE WHEN p_patch?'page_number' THEN (p_patch->>'page_number')::INT ELSE page_number END,overrides=CASE WHEN p_patch?'overrides' THEN p_patch->'overrides' ELSE overrides END WHERE magazine_id=p_magazine_id AND id=p_item_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'magazine_item_not_found' USING ERRCODE='P0002'; END IF;
 UPDATE public.magazines SET edit_version=v_mag.edit_version+1 WHERE id=p_magazine_id RETURNING * INTO v_result;
 RETURN jsonb_build_object('item_id',p_item_id,'edit_version',v_result.edit_version,'updated_at',v_result.updated_at);
END $$;

CREATE OR REPLACE FUNCTION public.magazine_publish_v2(
  p_magazine_id UUID,
  p_expected_edit_version BIGINT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE v_mag public.magazines%ROWTYPE; v_result public.magazines%ROWTYPE;
BEGIN v_mag:=public.magazine_lock_v2(p_magazine_id,p_expected_edit_version,FALSE); IF v_mag.status='published' THEN IF v_mag.public_token IS NULL OR v_mag.public_token !~ '^[0-9a-f]{48}$' OR v_mag.published_at IS NULL THEN RAISE EXCEPTION 'magazine_publication_invariant_invalid' USING ERRCODE='55000'; END IF; RETURN jsonb_build_object('public_token',v_mag.public_token,'published_at',v_mag.published_at,'edit_version',v_mag.edit_version,'updated_at',v_mag.updated_at); END IF; IF v_mag.status<>'draft' THEN RAISE EXCEPTION 'magazine_not_publishable' USING ERRCODE='55000'; END IF; UPDATE public.magazines SET status='published',public_token=NULL,edit_version=v_mag.edit_version+1 WHERE id=p_magazine_id RETURNING * INTO v_result; RETURN jsonb_build_object('public_token',v_result.public_token,'published_at',v_result.published_at,'edit_version',v_result.edit_version,'updated_at',v_result.updated_at); END $$;

CREATE OR REPLACE FUNCTION public.magazine_unpublish_v2(p_magazine_id UUID, p_expected_edit_version BIGINT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$ DECLARE v_mag public.magazines%ROWTYPE; v_result public.magazines%ROWTYPE; BEGIN v_mag:=public.magazine_lock_v2(p_magazine_id,p_expected_edit_version,FALSE); IF v_mag.status='draft' THEN RETURN jsonb_build_object('edit_version',v_mag.edit_version,'updated_at',v_mag.updated_at); END IF; IF v_mag.status<>'published' THEN RAISE EXCEPTION 'magazine_not_unpublishable' USING ERRCODE='55000'; END IF; UPDATE public.magazines SET status='draft',edit_version=v_mag.edit_version+1 WHERE id=p_magazine_id RETURNING * INTO v_result; RETURN jsonb_build_object('edit_version',v_result.edit_version,'updated_at',v_result.updated_at); END $$;

CREATE OR REPLACE FUNCTION public.magazine_archive_v2(p_magazine_id UUID, p_expected_edit_version BIGINT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$ DECLARE v_mag public.magazines%ROWTYPE; v_result public.magazines%ROWTYPE; BEGIN v_mag:=public.magazine_lock_v2(p_magazine_id,p_expected_edit_version,FALSE); IF v_mag.status='archived' THEN RETURN jsonb_build_object('archived_at',v_mag.archived_at,'edit_version',v_mag.edit_version,'updated_at',v_mag.updated_at); END IF; IF v_mag.status NOT IN ('draft','published') THEN RAISE EXCEPTION 'magazine_not_archivable' USING ERRCODE='55000'; END IF; UPDATE public.magazines SET status='archived',edit_version=v_mag.edit_version+1 WHERE id=p_magazine_id RETURNING * INTO v_result; RETURN jsonb_build_object('archived_at',v_result.archived_at,'edit_version',v_result.edit_version,'updated_at',v_result.updated_at); END $$;

CREATE OR REPLACE FUNCTION public.magazine_reactivate_v2(p_magazine_id UUID, p_expected_edit_version BIGINT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$ DECLARE v_mag public.magazines%ROWTYPE; v_result public.magazines%ROWTYPE; BEGIN v_mag:=public.magazine_lock_v2(p_magazine_id,p_expected_edit_version,FALSE); IF v_mag.status='draft' THEN RETURN jsonb_build_object('edit_version',v_mag.edit_version,'updated_at',v_mag.updated_at); END IF; IF v_mag.status<>'archived' THEN RAISE EXCEPTION 'magazine_not_reactivatable' USING ERRCODE='55000'; END IF; UPDATE public.magazines SET status='draft',edit_version=v_mag.edit_version+1 WHERE id=p_magazine_id RETURNING * INTO v_result; RETURN jsonb_build_object('edit_version',v_result.edit_version,'updated_at',v_result.updated_at); END $$;

CREATE OR REPLACE FUNCTION public.magazine_soft_delete_v2(p_magazine_id UUID, p_expected_edit_version BIGINT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$ DECLARE v_mag public.magazines%ROWTYPE; v_result public.magazines%ROWTYPE; BEGIN v_mag:=public.magazine_lock_v2(p_magazine_id,p_expected_edit_version,TRUE); IF v_mag.deleted_at IS NOT NULL THEN RETURN jsonb_build_object('deleted_at',v_mag.deleted_at,'edit_version',v_mag.edit_version,'updated_at',v_mag.updated_at); END IF; UPDATE public.magazines SET deleted_at=clock_timestamp(),status='archived',edit_version=v_mag.edit_version+1 WHERE id=p_magazine_id RETURNING * INTO v_result; RETURN jsonb_build_object('deleted_at',v_result.deleted_at,'edit_version',v_result.edit_version,'updated_at',v_result.updated_at); END $$;

CREATE OR REPLACE FUNCTION public.magazine_restore_v2(p_magazine_id UUID, p_expected_edit_version BIGINT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$ DECLARE v_mag public.magazines%ROWTYPE; v_result public.magazines%ROWTYPE; BEGIN v_mag:=public.magazine_lock_v2(p_magazine_id,p_expected_edit_version,TRUE); IF v_mag.deleted_at IS NULL THEN RETURN jsonb_build_object('edit_version',v_mag.edit_version,'updated_at',v_mag.updated_at); END IF; UPDATE public.magazines SET deleted_at=NULL,status='draft',edit_version=v_mag.edit_version+1 WHERE id=p_magazine_id RETURNING * INTO v_result; RETURN jsonb_build_object('edit_version',v_result.edit_version,'updated_at',v_result.updated_at); END $$;

CREATE OR REPLACE FUNCTION public.magazine_duplicate_v2(
  p_source_magazine_id UUID,
  p_expected_edit_version BIGINT,
  p_idempotency_key TEXT,
  p_title TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE v_actor UUID:=auth.uid(); v_source public.magazines%ROWTYPE; v_existing public.magazine_duplicate_requests%ROWTYPE; v_item public.magazine_items%ROWTYPE; v_new_id UUID; v_new_item UUID; v_count INT:=0; v_map JSONB:='{}'; v_pages JSONB; v_order JSONB; v_request_title TEXT:=NULLIF(BTRIM(p_title),''); v_title TEXT;
BEGIN
 IF v_actor IS NULL THEN RAISE EXCEPTION 'magazine_auth_required' USING ERRCODE='42501'; END IF; IF p_idempotency_key IS NULL OR char_length(BTRIM(p_idempotency_key)) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'magazine_idempotency_key_invalid' USING ERRCODE='22023'; END IF; IF v_request_title IS NOT NULL AND char_length(v_request_title)>200 THEN RAISE EXCEPTION 'magazine_title_invalid' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_actor::TEXT||':'||p_idempotency_key,0));
 SELECT * INTO v_existing FROM public.magazine_duplicate_requests WHERE actor_id=v_actor AND idempotency_key=p_idempotency_key;
 IF FOUND THEN IF v_existing.source_magazine_id<>p_source_magazine_id OR v_existing.source_edit_version<>p_expected_edit_version OR v_existing.request_title IS DISTINCT FROM v_request_title THEN RAISE EXCEPTION 'magazine_idempotency_key_reused' USING ERRCODE='22023'; END IF; RETURN jsonb_build_object('magazine_id',v_existing.magazine_id,'items_copied',(SELECT count(*) FROM public.magazine_items WHERE magazine_id=v_existing.magazine_id),'idempotent',TRUE,'edit_version',(SELECT edit_version FROM public.magazines WHERE id=v_existing.magazine_id)); END IF;
 SELECT * INTO v_source FROM public.magazines WHERE id=p_source_magazine_id AND deleted_at IS NULL FOR SHARE; IF NOT FOUND THEN RAISE EXCEPTION 'magazine_not_found' USING ERRCODE='P0002'; END IF; IF v_source.owner_id<>v_actor AND NOT COALESCE(public.has_role(v_actor,'admin'::public.app_role),FALSE) THEN RAISE EXCEPTION 'magazine_forbidden' USING ERRCODE='42501'; END IF; IF v_source.edit_version<>p_expected_edit_version THEN RAISE EXCEPTION 'magazine_edit_conflict' USING ERRCODE='40001'; END IF;
 v_title:=LEFT(COALESCE(v_request_title,v_source.title||' (cópia)'),200);
 INSERT INTO public.magazines(owner_id,organization_id,title,subtitle,template_id,branding,content_settings,page_order,status) VALUES(v_actor,v_source.organization_id,v_title,v_source.subtitle,v_source.template_id,v_source.branding,v_source.content_settings-'__magazine_import_v2',NULL,'draft') RETURNING id INTO v_new_id;
 FOR v_item IN SELECT * FROM public.magazine_items WHERE magazine_id=p_source_magazine_id ORDER BY position,id LOOP INSERT INTO public.magazine_items(magazine_id,product_id,product_snapshot,variant_color_name,position,page_number,overrides) VALUES(v_new_id,v_item.product_id,v_item.product_snapshot,v_item.variant_color_name,v_item.position,v_item.page_number,v_item.overrides) RETURNING id INTO v_new_item; v_map:=v_map||jsonb_build_object(v_item.id::TEXT,v_new_item::TEXT); v_count:=v_count+1; END LOOP;
 v_order:=v_source.page_order; IF jsonb_typeof(v_order)='object' AND jsonb_typeof(v_order->'pages')='array' THEN SELECT COALESCE(jsonb_agg(CASE WHEN jsonb_typeof(page.value->'itemIds')='array' THEN jsonb_set(page.value,'{itemIds}',COALESCE((SELECT jsonb_agg(to_jsonb(v_map->>(item.value#>>'{}')) ORDER BY item.ordinality) FROM jsonb_array_elements(page.value->'itemIds') WITH ORDINALITY item(value,ordinality) WHERE v_map?(item.value#>>'{}')),'[]'::JSONB),FALSE) ELSE page.value END ORDER BY page.ordinality),'[]'::JSONB) INTO v_pages FROM jsonb_array_elements(v_order->'pages') WITH ORDINALITY page(value,ordinality); v_order:=jsonb_set(v_order,'{pages}',v_pages,FALSE); END IF;
 UPDATE public.magazines SET page_order=v_order WHERE id=v_new_id;
 INSERT INTO public.magazine_duplicate_requests(actor_id,idempotency_key,source_magazine_id,source_edit_version,request_title,requested_title,magazine_id) VALUES(v_actor,p_idempotency_key,p_source_magazine_id,p_expected_edit_version,v_request_title,v_title,v_new_id);
 RETURN jsonb_build_object('magazine_id',v_new_id,'items_copied',v_count,'idempotent',FALSE,'edit_version',(SELECT edit_version FROM public.magazines WHERE id=v_new_id));
END $$;

CREATE OR REPLACE FUNCTION public.magazine_import_local_v2(
  p_idempotency_key TEXT,
  p_payload JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_temp'
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_key TEXT := BTRIM(p_idempotency_key);
  v_key_hash TEXT;
  v_fingerprint TEXT;
  v_existing public.magazines%ROWTYPE;
  v_existing_count INTEGER;
  v_title TEXT;
  v_subtitle TEXT;
  v_template_id TEXT;
  v_status TEXT;
  v_branding JSONB;
  v_content JSONB;
  v_items JSONB;
  v_order JSONB;
  v_pages JSONB;
  v_item JSONB;
  v_new_id UUID;
  v_new_item_id UUID;
  v_local_item_id TEXT;
  v_item_map JSONB := '{}'::JSONB;
  v_items_imported INTEGER := 0;
  v_raw_ref_count INTEGER := 0;
  v_mapped_ref_count INTEGER := 0;
  v_version BIGINT;
  v_previous_import_setting TEXT;
  v_result public.magazines%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'magazine_auth_required' USING ERRCODE = '42501';
  END IF;
  IF p_idempotency_key IS NULL OR char_length(v_key) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'magazine_import_idempotency_key_invalid' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_payload) IS DISTINCT FROM 'object'
     OR pg_column_size(p_payload) > 2097152 THEN
    RAISE EXCEPTION 'magazine_import_payload_invalid' USING ERRCODE = '22023';
  END IF;

  v_key_hash := encode(extensions.digest(v_actor::TEXT || ':' || v_key, 'sha256'), 'hex');
  v_fingerprint := encode(extensions.digest(p_payload::TEXT, 'sha256'), 'hex');
  PERFORM pg_advisory_xact_lock(hashtextextended(v_actor::TEXT || ':' || v_key, 0));

  SELECT count(*) INTO v_existing_count
  FROM public.magazines
  WHERE owner_id = v_actor
    AND content_settings #>> '{__magazine_import_v2,key_hash}' = v_key_hash;
  IF v_existing_count > 1 THEN
    RAISE EXCEPTION 'magazine_import_idempotency_ambiguous' USING ERRCODE = '55000';
  ELSIF v_existing_count = 1 THEN
    SELECT * INTO v_existing
    FROM public.magazines
    WHERE owner_id = v_actor
      AND content_settings #>> '{__magazine_import_v2,key_hash}' = v_key_hash
    FOR UPDATE;
    IF v_existing.content_settings #>> '{__magazine_import_v2,fingerprint}'
       IS DISTINCT FROM v_fingerprint THEN
      RAISE EXCEPTION 'magazine_import_idempotency_key_reused' USING ERRCODE = '22023';
    END IF;
    RETURN jsonb_build_object(
      'magazine_id', v_existing.id,
      'edit_version', v_existing.edit_version,
      'status', v_existing.status,
      'public_token', v_existing.public_token,
      'items_imported', (SELECT count(*) FROM public.magazine_items WHERE magazine_id = v_existing.id),
      'idempotent', TRUE
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_object_keys(p_payload) field(key)
    WHERE key <> ALL (ARRAY[
      'title','subtitle','templateId','branding','content','pageOrder','status','items'
    ])
  ) THEN
    RAISE EXCEPTION 'magazine_import_payload_unknown_fields' USING ERRCODE = '22023';
  END IF;

  v_title := BTRIM(p_payload->>'title');
  v_subtitle := COALESCE(p_payload->>'subtitle', '');
  v_template_id := COALESCE(p_payload->>'templateId', 'editorial-vogue');
  v_status := COALESCE(p_payload->>'status', 'draft');
  v_branding := COALESCE(p_payload->'branding', '{}'::JSONB);
  v_content := COALESCE(p_payload->'content', '{}'::JSONB);
  v_items := COALESCE(p_payload->'items', '[]'::JSONB);
  v_order := NULLIF(p_payload->'pageOrder', 'null'::JSONB);

  IF char_length(v_title) NOT BETWEEN 1 AND 200
     OR char_length(v_subtitle) > 300
     OR jsonb_typeof(v_branding) IS DISTINCT FROM 'object'
     OR jsonb_typeof(v_content) IS DISTINCT FROM 'object'
     OR v_content ? '__magazine_import_v2'
     OR v_status <> ALL (ARRAY['draft','published','archived'])
     OR NOT EXISTS (
       SELECT 1 FROM public.magazine_templates_catalog
       WHERE template_id = v_template_id
     )
     OR jsonb_typeof(v_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(v_items) > 500 THEN
    RAISE EXCEPTION 'magazine_import_payload_invalid' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_items) entry(value)
    WHERE jsonb_typeof(value) IS DISTINCT FROM 'object'
       OR EXISTS (
         SELECT 1 FROM jsonb_object_keys(
           CASE WHEN jsonb_typeof(value) = 'object' THEN value ELSE '{}'::JSONB END
         ) field(key)
         WHERE key <> ALL (ARRAY[
           'localItemId','productId','productSnapshot','variantColorName',
           'position','pageNumber','overrides'
         ])
       )
       OR jsonb_typeof(value->'localItemId') IS DISTINCT FROM 'string'
       OR char_length(BTRIM(value->>'localItemId')) NOT BETWEEN 1 AND 200
       OR (value->>'productId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       OR jsonb_typeof(value->'productSnapshot') IS DISTINCT FROM 'object'
       OR jsonb_typeof(value->'position') IS DISTINCT FROM 'number'
       OR (value->>'position')::NUMERIC <> trunc((value->>'position')::NUMERIC)
       OR (value->>'position')::NUMERIC NOT BETWEEN 0 AND 1000000000
       OR (value ? 'variantColorName' AND value->'variantColorName' <> 'null'::JSONB AND (
         jsonb_typeof(value->'variantColorName') IS DISTINCT FROM 'string'
         OR char_length(value->>'variantColorName') > 200
       ))
       OR (value ? 'pageNumber' AND value->'pageNumber' <> 'null'::JSONB AND (
         jsonb_typeof(value->'pageNumber') IS DISTINCT FROM 'number'
         OR (value->>'pageNumber')::NUMERIC <> trunc((value->>'pageNumber')::NUMERIC)
         OR (value->>'pageNumber')::INTEGER NOT BETWEEN 1 AND 200
       ))
       OR (value ? 'overrides' AND jsonb_typeof(value->'overrides') IS DISTINCT FROM 'object')
  ) OR (
    SELECT count(*) FROM jsonb_array_elements(v_items)
  ) <> (
    SELECT count(DISTINCT BTRIM(value->>'localItemId')) FROM jsonb_array_elements(v_items)
  ) OR (
    SELECT count(*) FROM jsonb_array_elements(v_items)
  ) <> (
    SELECT count(DISTINCT (value->>'productId')::UUID) FROM jsonb_array_elements(v_items)
  ) OR (
    SELECT count(*) FROM jsonb_array_elements(v_items)
  ) <> (
    SELECT count(DISTINCT (value->>'position')::NUMERIC) FROM jsonb_array_elements(v_items)
  ) THEN
    RAISE EXCEPTION 'magazine_import_items_invalid' USING ERRCODE = '22023';
  END IF;

  v_previous_import_setting := current_setting('app.magazine_import_v2', TRUE);
  PERFORM set_config('app.magazine_import_v2', 'on', TRUE);
  INSERT INTO public.magazines(
    owner_id, organization_id, title, subtitle, template_id,
    branding, content_settings, page_order, status
  ) VALUES (
    v_actor, NULL, v_title, v_subtitle, v_template_id,
    v_branding,
    v_content || jsonb_build_object('__magazine_import_v2', jsonb_build_object(
      'key_hash', v_key_hash,
      'fingerprint', v_fingerprint
    )),
    NULL,
    'draft'
  ) RETURNING id INTO v_new_id;
  PERFORM set_config('app.magazine_import_v2', COALESCE(v_previous_import_setting, ''), TRUE);

  FOR v_item IN
    SELECT value FROM jsonb_array_elements(v_items) WITH ORDINALITY entry(value, ordinality)
    ORDER BY (value->>'position')::NUMERIC, ordinality
  LOOP
    v_local_item_id := BTRIM(v_item->>'localItemId');
    INSERT INTO public.magazine_items(
      magazine_id, product_id, product_snapshot, variant_color_name,
      position, page_number, overrides
    ) VALUES (
      v_new_id,
      (v_item->>'productId')::UUID,
      v_item->'productSnapshot',
      NULLIF(v_item->>'variantColorName', ''),
      v_items_imported,
      (v_item->>'pageNumber')::INTEGER,
      COALESCE(v_item->'overrides', '{}'::JSONB)
    ) RETURNING id INTO v_new_item_id;
    v_item_map := v_item_map || jsonb_build_object(v_local_item_id, v_new_item_id::TEXT);
    v_items_imported := v_items_imported + 1;
  END LOOP;

  IF jsonb_typeof(v_order) = 'object'
     AND jsonb_typeof(v_order->'pages') = 'array' THEN
    SELECT count(*) INTO v_raw_ref_count
    FROM jsonb_array_elements(v_order->'pages') page(value)
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(page.value->'itemIds') = 'array'
           THEN page.value->'itemIds' ELSE '[]'::JSONB END
    ) item(value);

    SELECT COALESCE(jsonb_agg(
      CASE WHEN jsonb_typeof(page.value->'itemIds') = 'array' THEN
        jsonb_set(
          page.value,
          '{itemIds}',
          COALESCE((
            SELECT jsonb_agg(to_jsonb(v_item_map->>(item.value #>> '{}')) ORDER BY item.ordinality)
            FROM jsonb_array_elements(page.value->'itemIds') WITH ORDINALITY item(value, ordinality)
            WHERE jsonb_typeof(item.value) = 'string'
              AND v_item_map ? (item.value #>> '{}')
          ), '[]'::JSONB),
          FALSE
        )
      ELSE page.value END
      ORDER BY page.ordinality
    ), '[]'::JSONB) INTO v_pages
    FROM jsonb_array_elements(v_order->'pages') WITH ORDINALITY page(value, ordinality);
    v_order := jsonb_set(v_order, '{pages}', v_pages, FALSE);

    SELECT count(*) INTO v_mapped_ref_count
    FROM jsonb_array_elements(v_order->'pages') page(value)
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(page.value->'itemIds') = 'array'
           THEN page.value->'itemIds' ELSE '[]'::JSONB END
    ) item(value);
    IF v_mapped_ref_count <> v_raw_ref_count THEN
      RAISE EXCEPTION 'magazine_import_page_order_reference_missing' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF NOT public.magazine_validate_page_order_v2(v_new_id, v_order) THEN
    RAISE EXCEPTION 'magazine_import_page_order_invalid' USING ERRCODE = '22023';
  END IF;
  IF v_order IS NOT NULL THEN
    UPDATE public.magazines SET page_order = v_order
    WHERE id = v_new_id RETURNING edit_version INTO v_version;
  ELSE
    SELECT edit_version INTO v_version FROM public.magazines WHERE id = v_new_id;
  END IF;

  IF v_status = 'archived' THEN
    PERFORM public.magazine_archive_v2(v_new_id, v_version);
  END IF;
  SELECT * INTO v_result FROM public.magazines WHERE id = v_new_id;
  RETURN jsonb_build_object(
    'magazine_id', v_result.id,
    'edit_version', v_result.edit_version,
    'status', v_result.status,
    'public_token', v_result.public_token,
    'items_imported', v_items_imported,
    'idempotent', FALSE
  );
END;
$$;

REVOKE ALL ON FUNCTION public.magazine_create_v2(UUID,TEXT,TEXT) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.magazine_update_metadata_v2(UUID,BIGINT,JSONB) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.magazine_add_items_v2(UUID,BIGINT,JSONB) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.magazine_remove_items_v2(UUID,BIGINT,UUID[]) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.magazine_reorder_items_v2(UUID,BIGINT,UUID[]) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.magazine_update_item_v2(UUID,BIGINT,UUID,JSONB) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.magazine_publish_v2(UUID,BIGINT) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.magazine_unpublish_v2(UUID,BIGINT) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.magazine_archive_v2(UUID,BIGINT) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.magazine_reactivate_v2(UUID,BIGINT) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.magazine_soft_delete_v2(UUID,BIGINT) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.magazine_restore_v2(UUID,BIGINT) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.magazine_duplicate_v2(UUID,BIGINT,TEXT,TEXT) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.magazine_import_local_v2(TEXT,JSONB) FROM PUBLIC,anon;

GRANT EXECUTE ON FUNCTION public.magazine_create_v2(UUID,TEXT,TEXT), public.magazine_update_metadata_v2(UUID,BIGINT,JSONB), public.magazine_add_items_v2(UUID,BIGINT,JSONB), public.magazine_remove_items_v2(UUID,BIGINT,UUID[]), public.magazine_reorder_items_v2(UUID,BIGINT,UUID[]), public.magazine_update_item_v2(UUID,BIGINT,UUID,JSONB), public.magazine_publish_v2(UUID,BIGINT), public.magazine_unpublish_v2(UUID,BIGINT), public.magazine_archive_v2(UUID,BIGINT), public.magazine_reactivate_v2(UUID,BIGINT), public.magazine_soft_delete_v2(UUID,BIGINT), public.magazine_restore_v2(UUID,BIGINT), public.magazine_duplicate_v2(UUID,BIGINT,TEXT,TEXT), public.magazine_import_local_v2(TEXT,JSONB) TO authenticated,service_role;

-- A remoção das permissões legadas fica em uma migration de contração separada.
-- Ordem segura: expandir o banco, publicar/validar o cliente v2 e somente então
-- promover/aplicar qa/migrations-draft/2026-09-09_magazine_rpc_only_contract.sql.
