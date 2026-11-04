INSERT INTO system_kill_switches (switch_name, enabled, reason)
VALUES
  ('edge_crm_db_bridge',       true, 'Kill switch para crm-db-bridge'),
  ('edge_webhook_dispatcher',  true, 'Kill switch para webhook-dispatcher'),
  ('edge_ai_recommendations',  true, 'Kill switch para ai-recommendations'),
  ('edge_expert_chat',         true, 'Kill switch para expert-chat'),
  ('edge_bi_copilot',          true, 'Kill switch para bi-copilot')
ON CONFLICT (switch_name) DO NOTHING;
