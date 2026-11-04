ALTER DATABASE postgres SET idle_session_timeout = '600000';
ALTER DATABASE postgres SET idle_in_transaction_session_timeout = '60000';
ALTER ROLE "postgres" SET "log_min_duration_statement" TO '2000';
