ALTER TABLE public.contracts
  ADD COLUMN snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN sent_at TIMESTAMPTZ NULL,
  ADD COLUMN last_sent_to_owner TEXT NULL,
  ADD COLUMN last_sent_to_guest TEXT NULL;
