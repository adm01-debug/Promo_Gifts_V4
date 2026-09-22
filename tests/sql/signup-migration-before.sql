DO $$
BEGIN
  BEGIN
    INSERT INTO auth.users VALUES ('10000000-0000-4000-8000-000000000001','before@example.invalid','{}');
    RAISE EXCEPTION 'Expected FK failure was not reproduced';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
  IF EXISTS (SELECT FROM auth.users) OR EXISTS (SELECT FROM profiles) OR EXISTS (SELECT FROM user_roles) THEN
    RAISE EXCEPTION 'Failed signup leaked partial rows';
  END IF;
END $$;
SELECT 'PASS: original trigger fails FK; entire signup rolls back';
