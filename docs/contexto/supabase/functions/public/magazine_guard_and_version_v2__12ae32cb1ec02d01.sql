CREATE OR REPLACE FUNCTION public.magazine_guard_and_version_v2()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
$function$
