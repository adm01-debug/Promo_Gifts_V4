CREATE INDEX IF NOT EXISTS idx_cf_recon_cfimg_last_seen ON cf_recon.cf_image(last_seen_at); CREATE INDEX IF NOT EXISTS idx_cf_recon_cfimg_uploaded ON cf_recon.cf_image(uploaded_at);
