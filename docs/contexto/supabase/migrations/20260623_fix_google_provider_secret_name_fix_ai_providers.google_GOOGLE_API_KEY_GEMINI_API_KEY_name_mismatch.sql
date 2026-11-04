UPDATE ai_providers SET secret_name = 'GEMINI_API_KEY', updated_at = now() WHERE slug = 'google' AND secret_name = 'GOOGLE_API_KEY'
