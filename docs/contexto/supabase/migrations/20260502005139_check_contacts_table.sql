SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contacts' ORDER BY ordinal_position LIMIT 20;
