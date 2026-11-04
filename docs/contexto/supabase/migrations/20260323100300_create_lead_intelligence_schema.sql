-- ============================================================
-- PROMOBRINDES LEAD INTELLIGENCE
-- Schema for enrichment system
-- ============================================================

-- Tabela Principal: Contatos Enriquecidos
CREATE TABLE IF NOT EXISTS enriched_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    linkedin_url TEXT UNIQUE,
    linkedin_profile_id TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    headline TEXT,
    current_title TEXT,
    current_company TEXT,
    company_domain TEXT,
    location TEXT,
    profile_picture_url TEXT,
    work_email TEXT,
    work_email_confidence SMALLINT CHECK (work_email_confidence BETWEEN 0 AND 100),
    work_email_verified_at TIMESTAMPTZ,
    work_email_source TEXT,
    personal_email TEXT,
    personal_email_confidence SMALLINT CHECK (personal_email_confidence BETWEEN 0 AND 100),
    personal_email_source TEXT,
    phone_mobile TEXT,
    phone_mobile_confidence SMALLINT CHECK (phone_mobile_confidence BETWEEN 0 AND 100),
    phone_mobile_source TEXT,
    phone_work TEXT,
    phone_work_confidence SMALLINT CHECK (phone_work_confidence BETWEEN 0 AND 100),
    phone_work_source TEXT,
    whatsapp_number TEXT,
    company_size TEXT,
    company_industry TEXT,
    company_linkedin_url TEXT,
    company_website TEXT,
    enrichment_status TEXT DEFAULT 'pending'
        CHECK (enrichment_status IN ('pending', 'enriching', 'complete', 'partial', 'failed')),
    enrichment_attempts INTEGER DEFAULT 0,
    last_enriched_at TIMESTAMPTZ,
    bitrix24_contact_id INTEGER,
    bitrix24_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_ec_linkedin ON enriched_contacts(linkedin_url);
CREATE INDEX IF NOT EXISTS idx_ec_company ON enriched_contacts(company_domain);
CREATE INDEX IF NOT EXISTS idx_ec_email ON enriched_contacts(work_email);
CREATE INDEX IF NOT EXISTS idx_ec_status ON enriched_contacts(enrichment_status);
CREATE INDEX IF NOT EXISTS idx_ec_name ON enriched_contacts(first_name, last_name);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION li_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ec_updated_at
    BEFORE UPDATE ON enriched_contacts
    FOR EACH ROW
    EXECUTE FUNCTION li_update_updated_at();

-- Tabela: Padrões de Email por Empresa
CREATE TABLE IF NOT EXISTS company_email_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_domain TEXT NOT NULL,
    company_name TEXT,
    pattern_format TEXT NOT NULL,
    pattern_confidence SMALLINT CHECK (pattern_confidence BETWEEN 0 AND 100),
    mx_server TEXT,
    email_provider TEXT,
    is_catch_all BOOLEAN DEFAULT FALSE,
    verified_count INTEGER DEFAULT 0,
    last_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_domain, pattern_format)
);

CREATE TRIGGER trg_cep_updated_at
    BEFORE UPDATE ON company_email_patterns
    FOR EACH ROW
    EXECUTE FUNCTION li_update_updated_at();

-- Tabela: Log de Enrichment
CREATE TABLE IF NOT EXISTS enrichment_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES enriched_contacts(id) ON DELETE SET NULL,
    enrichment_level INTEGER,
    provider_name TEXT,
    success BOOLEAN,
    data_found JSONB,
    error_message TEXT,
    credits_used DECIMAL(10,4) DEFAULT 0,
    cost_usd DECIMAL(10,4) DEFAULT 0,
    response_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_el_contact ON enrichment_log(contact_id);
CREATE INDEX IF NOT EXISTS idx_el_provider ON enrichment_log(provider_name);
CREATE INDEX IF NOT EXISTS idx_el_created ON enrichment_log(created_at);

-- Tabela: Controle de Uso de APIs
CREATE TABLE IF NOT EXISTS api_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    period_month TEXT NOT NULL,
    credits_used INTEGER DEFAULT 0,
    credits_limit INTEGER,
    cost_usd DECIMAL(10,2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, period_month)
);

-- Índice composto para re-enrichment
CREATE INDEX IF NOT EXISTS idx_ec_needs_enrichment
    ON enriched_contacts(enrichment_status, last_enriched_at)
    WHERE work_email IS NULL AND phone_mobile IS NULL;

-- Views
CREATE OR REPLACE VIEW v_enrichment_stats AS
SELECT
    COUNT(*) AS total_contacts,
    COUNT(work_email) AS total_emails_found,
    COUNT(phone_mobile) AS total_phones_found,
    COUNT(CASE WHEN enrichment_status = 'complete' THEN 1 END) AS complete_enrichments,
    COUNT(CASE WHEN enrichment_status = 'partial' THEN 1 END) AS partial_enrichments,
    ROUND(COUNT(work_email)::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS email_find_rate,
    ROUND(COUNT(phone_mobile)::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS phone_find_rate,
    AVG(work_email_confidence) AS avg_email_confidence,
    AVG(phone_mobile_confidence) AS avg_phone_confidence
FROM enriched_contacts;

CREATE OR REPLACE VIEW v_monthly_costs AS
SELECT
    provider_name,
    TO_CHAR(created_at, 'YYYY-MM') AS month,
    COUNT(*) AS total_calls,
    COUNT(CASE WHEN success THEN 1 END) AS successful_calls,
    SUM(cost_usd) AS total_cost,
    ROUND(AVG(response_time_ms)::numeric, 0) AS avg_response_ms
FROM enrichment_log
GROUP BY provider_name, TO_CHAR(created_at, 'YYYY-MM')
ORDER BY month DESC, total_cost DESC;

CREATE OR REPLACE VIEW v_top_patterns AS
SELECT
    pattern_format,
    COUNT(*) AS usage_count,
    AVG(pattern_confidence) AS avg_confidence,
    ARRAY_AGG(DISTINCT company_domain ORDER BY company_domain) AS example_domains
FROM company_email_patterns
GROUP BY pattern_format
ORDER BY usage_count DESC;

CREATE OR REPLACE VIEW v_needs_enrichment AS
SELECT id, first_name, last_name, current_company, company_domain, enrichment_status, last_enriched_at
FROM enriched_contacts
WHERE
    (work_email IS NULL AND phone_mobile IS NULL)
    OR enrichment_status IN ('pending', 'failed')
    OR last_enriched_at < NOW() - INTERVAL '60 days'
ORDER BY created_at DESC;

-- RLS — deny all for anon/authenticated, service_role bypasses automatically
ALTER TABLE enriched_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrichment_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_email_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "li_deny_anon" ON enriched_contacts
    FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "li_deny_anon" ON enrichment_log
    FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "li_deny_anon" ON company_email_patterns
    FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "li_deny_anon" ON api_usage
    FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- Functions
CREATE OR REPLACE FUNCTION li_increment_api_usage(p_provider TEXT, p_cost DECIMAL)
RETURNS VOID AS $$
BEGIN
    INSERT INTO api_usage (provider, period_month, credits_used, cost_usd)
    VALUES (p_provider, TO_CHAR(NOW(), 'YYYY-MM'), 1, p_cost)
    ON CONFLICT (provider, period_month)
    DO UPDATE SET
        credits_used = api_usage.credits_used + 1,
        cost_usd = api_usage.cost_usd + p_cost,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION li_upsert_enriched_contact(
    p_linkedin_url TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_company TEXT,
    p_domain TEXT,
    p_email TEXT DEFAULT NULL,
    p_email_confidence SMALLINT DEFAULT NULL,
    p_email_source TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_phone_confidence SMALLINT DEFAULT NULL,
    p_phone_source TEXT DEFAULT NULL
)
RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql;
