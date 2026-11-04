CREATE OR REPLACE FUNCTION public.li_upsert_enriched_contact(p_linkedin_url text, p_first_name text, p_last_name text, p_company text, p_domain text, p_email text DEFAULT NULL::text, p_email_confidence smallint DEFAULT NULL::smallint, p_email_source text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_phone_confidence smallint DEFAULT NULL::smallint, p_phone_source text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO enriched_contacts (
        linkedin_url, first_name, last_name, current_company, company_domain,
        work_email, work_email_confidence, work_email_source,
        phone_mobile, phone_mobile_confidence, phone_mobile_source,
        enrichment_status, enrichment_attempts, last_enriched_at
    ) VALUES (
        p_linkedin_url, p_first_name, p_last_name, p_company, p_domain,
        p_email, p_email_confidence, p_email_source,
        p_phone, p_phone_confidence, p_phone_source,
        CASE WHEN p_email IS NOT NULL OR p_phone IS NOT NULL THEN 'complete' ELSE 'partial' END,
        1, NOW()
    )
    ON CONFLICT (linkedin_url) DO UPDATE SET
        work_email = COALESCE(EXCLUDED.work_email, enriched_contacts.work_email),
        work_email_confidence = GREATEST(EXCLUDED.work_email_confidence, enriched_contacts.work_email_confidence),
        work_email_source = COALESCE(EXCLUDED.work_email_source, enriched_contacts.work_email_source),
        phone_mobile = COALESCE(EXCLUDED.phone_mobile, enriched_contacts.phone_mobile),
        phone_mobile_confidence = GREATEST(EXCLUDED.phone_mobile_confidence, enriched_contacts.phone_mobile_confidence),
        phone_mobile_source = COALESCE(EXCLUDED.phone_mobile_source, enriched_contacts.phone_mobile_source),
        enrichment_status = CASE
            WHEN COALESCE(EXCLUDED.work_email, enriched_contacts.work_email) IS NOT NULL
                 OR COALESCE(EXCLUDED.phone_mobile, enriched_contacts.phone_mobile) IS NOT NULL
            THEN 'complete' ELSE 'partial' END,
        enrichment_attempts = enriched_contacts.enrichment_attempts + 1,
        last_enriched_at = NOW()
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$function$
