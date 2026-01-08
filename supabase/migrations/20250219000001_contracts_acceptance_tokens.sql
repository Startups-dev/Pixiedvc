ALTER TABLE public.contracts
  ADD COLUMN owner_accept_token TEXT,
  ADD COLUMN guest_accept_token TEXT,
  ADD COLUMN owner_accepted_at TIMESTAMPTZ,
  ADD COLUMN guest_accepted_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS contracts_owner_accept_token_key
  ON public.contracts (owner_accept_token)
  WHERE owner_accept_token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS contracts_guest_accept_token_key
  ON public.contracts (guest_accept_token)
  WHERE guest_accept_token IS NOT NULL;
