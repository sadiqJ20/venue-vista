-- Disable email confirmation requirement
UPDATE auth.config SET enabled = false WHERE setting = 'enable_confirmations';

-- Update auth settings to allow immediate login after signup
ALTER TABLE auth.users ALTER COLUMN email_confirmed_at SET DEFAULT now();
ALTER TABLE auth.users ALTER COLUMN confirmed_at SET DEFAULT now();