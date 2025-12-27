-- =========================================================
-- PixieDVC – Row Level Security & View Security
-- Safe to run multiple times
-- =========================================================

/* ---------------------------------------------------------
   PROFILES – 1:1 with auth.users
   - Users can see & edit only their own profile
--------------------------------------------------------- */

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles – user can select own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles – user can update own" ON public.profiles;

CREATE POLICY "Profiles – user can select own"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Profiles – user can update own"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);


/* ---------------------------------------------------------
   USER CARTS
   - User can only see/modify their own carts
--------------------------------------------------------- */

ALTER TABLE public.user_carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User owns cart – select" ON public.user_carts;
DROP POLICY IF EXISTS "User owns cart – insert" ON public.user_carts;
DROP POLICY IF EXISTS "User owns cart – update" ON public.user_carts;
DROP POLICY IF EXISTS "User owns cart – delete" ON public.user_carts;

CREATE POLICY "User owns cart – select"
ON public.user_carts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "User owns cart – insert"
ON public.user_carts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User owns cart – update"
ON public.user_carts
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User owns cart – delete"
ON public.user_carts
FOR DELETE
USING (auth.uid() = user_id);


/* ---------------------------------------------------------
   BOOKING REQUESTS
   - Renter can only see/modify their own booking requests
--------------------------------------------------------- */

ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Booking – user select own" ON public.booking_requests;
DROP POLICY IF EXISTS "Booking – user insert own" ON public.booking_requests;
DROP POLICY IF EXISTS "Booking – user update own" ON public.booking_requests;
DROP POLICY IF EXISTS "Booking – user delete own" ON public.booking_requests;

CREATE POLICY "Booking – user select own"
ON public.booking_requests
FOR SELECT
USING (auth.uid() = renter_id);

CREATE POLICY "Booking – user insert own"
ON public.booking_requests
FOR INSERT
WITH CHECK (auth.uid() = renter_id);

CREATE POLICY "Booking – user update own"
ON public.booking_requests
FOR UPDATE
USING (auth.uid() = renter_id)
WITH CHECK (auth.uid() = renter_id);

CREATE POLICY "Booking – user delete own"
ON public.booking_requests
FOR DELETE
USING (auth.uid() = renter_id);


/* ---------------------------------------------------------
   BOOKING REQUEST GUESTS
   - Only renter who owns the parent booking_request
     (or admin, if you later extend) can access rows
--------------------------------------------------------- */

ALTER TABLE public.booking_request_guests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Guests – select own" ON public.booking_request_guests;
DROP POLICY IF EXISTS "Guests – insert own" ON public.booking_request_guests;
DROP POLICY IF EXISTS "Guests – update own" ON public.booking_request_guests;
DROP POLICY IF EXISTS "Guests – delete own" ON public.booking_request_guests;

CREATE POLICY "Guests – select own"
ON public.booking_request_guests
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.booking_requests br
    WHERE br.id = booking_id
      AND br.renter_id = auth.uid()
  )
);

CREATE POLICY "Guests – insert own"
ON public.booking_request_guests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.booking_requests br
    WHERE br.id = booking_id
      AND br.renter_id = auth.uid()
  )
);

CREATE POLICY "Guests – update own"
ON public.booking_request_guests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.booking_requests br
    WHERE br.id = booking_id
      AND br.renter_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.booking_requests br
    WHERE br.id = booking_id
      AND br.renter_id = auth.uid()
  )
);

CREATE POLICY "Guests – delete own"
ON public.booking_request_guests
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.booking_requests br
    WHERE br.id = booking_id
      AND br.renter_id = auth.uid()
  )
);


/* ---------------------------------------------------------
   GUEST PREFERENCES
   - Per-user guest settings
--------------------------------------------------------- */

ALTER TABLE public.guest_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Guest prefs – select own" ON public.guest_preferences;
DROP POLICY IF EXISTS "Guest prefs – insert own" ON public.guest_preferences;
DROP POLICY IF EXISTS "Guest prefs – update own" ON public.guest_preferences;
DROP POLICY IF EXISTS "Guest prefs – delete own" ON public.guest_preferences;

CREATE POLICY "Guest prefs – select own"
ON public.guest_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Guest prefs – insert own"
ON public.guest_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Guest prefs – update own"
ON public.guest_preferences
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Guest prefs – delete own"
ON public.guest_preferences
FOR DELETE
USING (auth.uid() = user_id);


/* ---------------------------------------------------------
   RENTER REQUESTS
   - Renter sees own rows, admin sees all
   - Used by owner_inbox view
--------------------------------------------------------- */

ALTER TABLE public.renter_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Renter requests – select" ON public.renter_requests;
DROP POLICY IF EXISTS "Renter requests – insert" ON public.renter_requests;
DROP POLICY IF EXISTS "Renter requests – update" ON public.renter_requests;
DROP POLICY IF EXISTS "Renter requests – delete" ON public.renter_requests;

CREATE POLICY "Renter requests – select"
ON public.renter_requests
FOR SELECT
USING (
  renter_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

CREATE POLICY "Renter requests – insert"
ON public.renter_requests
FOR INSERT
WITH CHECK (
  renter_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

CREATE POLICY "Renter requests – update"
ON public.renter_requests
FOR UPDATE
USING (
  renter_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
)
WITH CHECK (
  renter_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

CREATE POLICY "Renter requests – delete"
ON public.renter_requests
FOR DELETE
USING (
  renter_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);


/* ---------------------------------------------------------
   OWNER COMMENTS
   - Admin-only
--------------------------------------------------------- */

ALTER TABLE public.owner_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner comments – select admin" ON public.owner_comments;
DROP POLICY IF EXISTS "Owner comments – insert admin" ON public.owner_comments;
DROP POLICY IF EXISTS "Owner comments – update admin" ON public.owner_comments;
DROP POLICY IF EXISTS "Owner comments – delete admin" ON public.owner_comments;

CREATE POLICY "Owner comments – select admin"
ON public.owner_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

CREATE POLICY "Owner comments – insert admin"
ON public.owner_comments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

CREATE POLICY "Owner comments – update admin"
ON public.owner_comments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

CREATE POLICY "Owner comments – delete admin"
ON public.owner_comments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);


/* ---------------------------------------------------------
   OWNER VERIFICATION EVENTS
   - Admin-only verification log
--------------------------------------------------------- */

ALTER TABLE public.owner_verification_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner verification – select admin" ON public.owner_verification_events;
DROP POLICY IF EXISTS "Owner verification – insert admin" ON public.owner_verification_events;
DROP POLICY IF EXISTS "Owner verification – update admin" ON public.owner_verification_events;
DROP POLICY IF EXISTS "Owner verification – delete admin" ON public.owner_verification_events;

CREATE POLICY "Owner verification – select admin"
ON public.owner_verification_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

CREATE POLICY "Owner verification – insert admin"
ON public.owner_verification_events
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

CREATE POLICY "Owner verification – update admin"
ON public.owner_verification_events
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

CREATE POLICY "Owner verification – delete admin"
ON public.owner_verification_events
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);


/* ---------------------------------------------------------
   OWNERS
   - Owner can see/update own record
   - Admins full control
--------------------------------------------------------- */

ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners – owner/admin select" ON public.owners;
DROP POLICY IF EXISTS "Owners – owner/admin update" ON public.owners;
DROP POLICY IF EXISTS "Owners – admin insert" ON public.owners;
DROP POLICY IF EXISTS "Owners – admin delete" ON public.owners;

CREATE POLICY "Owners – owner/admin select"
ON public.owners
FOR SELECT
USING (
  owners.id = auth.uid()
  OR owners.user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

CREATE POLICY "Owners – owner/admin update"
ON public.owners
FOR UPDATE
USING (
  owners.id = auth.uid()
  OR owners.user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
)
WITH CHECK (
  owners.id = auth.uid()
  OR owners.user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

CREATE POLICY "Owners – admin insert"
ON public.owners
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

CREATE POLICY "Owners – admin delete"
ON public.owners
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);


/* ---------------------------------------------------------
   CONTRACTS
   - Renter: see their contracts
   - Owner: see contracts on their inventory
   - Admin: full control
--------------------------------------------------------- */

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Contracts – renter/owner/admin select" ON public.contracts;
DROP POLICY IF EXISTS "Contracts – admin insert" ON public.contracts;
DROP POLICY IF EXISTS "Contracts – admin update" ON public.contracts;
DROP POLICY IF EXISTS "Contracts – admin delete" ON public.contracts;

CREATE POLICY "Contracts – renter/owner/admin select"
ON public.contracts
FOR SELECT
USING (
  -- Renter
  renter_id = auth.uid()
  OR
  -- Owner (via owners.user_id)
  EXISTS (
    SELECT 1 FROM public.owners o
    WHERE o.id = owner_id
      AND o.user_id = auth.uid()
  )
  OR
  -- Admin
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

CREATE POLICY "Contracts – admin insert"
ON public.contracts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

CREATE POLICY "Contracts – admin update"
ON public.contracts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

CREATE POLICY "Contracts – admin delete"
ON public.contracts
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);


/* ---------------------------------------------------------
   RESERVATIONS
   - Owner: see reservations for their contracts
   - Admin: full control
--------------------------------------------------------- */

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reservations – owner/admin select" ON public.reservations;
DROP POLICY IF EXISTS "Reservations – owner/admin insert" ON public.reservations;
DROP POLICY IF EXISTS "Reservations – owner/admin update" ON public.reservations;
DROP POLICY IF EXISTS "Reservations – owner/admin delete" ON public.reservations;

CREATE POLICY "Reservations – owner/admin select"
ON public.reservations
FOR SELECT
USING (
  -- Owner via contracts.owner_id -> owners.user_id
  EXISTS (
    SELECT 1 FROM public.contracts c
    JOIN public.owners o ON o.id = c.owner_id
    WHERE c.id = contract_id
      AND o.user_id = auth.uid()
  )
  OR
  -- Admin
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

CREATE POLICY "Reservations – owner/admin insert"
ON public.reservations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.contracts c
    JOIN public.owners o ON o.id = c.owner_id
    WHERE c.id = contract_id
      AND o.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

CREATE POLICY "Reservations – owner/admin update"
ON public.reservations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.contracts c
    JOIN public.owners o ON o.id = c.owner_id
    WHERE c.id = contract_id
      AND o.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.contracts c
    JOIN public.owners o ON o.id = c.owner_id
    WHERE c.id = contract_id
      AND o.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

CREATE POLICY "Reservations – owner/admin delete"
ON public.reservations
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.contracts c
    JOIN public.owners o ON o.id = c.owner_id
    WHERE c.id = contract_id
      AND o.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);


/* ---------------------------------------------------------
   PAYOUTS
   - Owners can read their own payouts
   - Admins can read/write all
--------------------------------------------------------- */

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Payouts – owner/admin select" ON public.payouts;
DROP POLICY IF EXISTS "Payouts – admin insert" ON public.payouts;
DROP POLICY IF EXISTS "Payouts – admin update" ON public.payouts;
DROP POLICY IF EXISTS "Payouts – admin delete" ON public.payouts;

CREATE POLICY "Payouts – owner/admin select"
ON public.payouts
FOR SELECT
USING (
  -- Owner (via owners.user_id)
  EXISTS (
    SELECT 1 FROM public.owners o
    WHERE o.id = owner_id
      AND o.user_id = auth.uid()
  )
  OR
  -- Admin
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

CREATE POLICY "Payouts – admin insert"
ON public.payouts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

CREATE POLICY "Payouts – admin update"
ON public.payouts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

CREATE POLICY "Payouts – admin delete"
ON public.payouts
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);


/* ---------------------------------------------------------
   PUBLIC METADATA – resorts & friends
   - RLS ON, but public read-only
--------------------------------------------------------- */

ALTER TABLE public.resorts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resort_photos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resort_room_layouts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resort_neighbors      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resort_facts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resort_essentials     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions               ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read resorts"               ON public.resorts;
DROP POLICY IF EXISTS "Public read resort_photos"         ON public.resort_photos;
DROP POLICY IF EXISTS "Public read resort_room_layouts"   ON public.resort_room_layouts;
DROP POLICY IF EXISTS "Public read resort_neighbors"      ON public.resort_neighbors;
DROP POLICY IF EXISTS "Public read resort_facts"          ON public.resort_facts;
DROP POLICY IF EXISTS "Public read resort_essentials"     ON public.resort_essentials;
DROP POLICY IF EXISTS "Public read regions"               ON public.regions;

CREATE POLICY "Public read resorts"
ON public.resorts
FOR SELECT
USING (true);

CREATE POLICY "Public read resort_photos"
ON public.resort_photos
FOR SELECT
USING (true);

CREATE POLICY "Public read resort_room_layouts"
ON public.resort_room_layouts
FOR SELECT
USING (true);

CREATE POLICY "Public read resort_neighbors"
ON public.resort_neighbors
FOR SELECT
USING (true);

CREATE POLICY "Public read resort_facts"
ON public.resort_facts
FOR SELECT
USING (true);

CREATE POLICY "Public read resort_essentials"
ON public.resort_essentials
FOR SELECT
USING (true);

CREATE POLICY "Public read regions"
ON public.regions
FOR SELECT
USING (true);


/* ---------------------------------------------------------
   INTERNAL BACKEND-ONLY TABLES
   - RLS enabled, but no policies: service_role only
--------------------------------------------------------- */

ALTER TABLE public.audit_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_matches ENABLE ROW LEVEL SECURITY;

-- (no policies created on purpose)


/* ---------------------------------------------------------
   VIEWS – run with security_invoker (respect RLS)
--------------------------------------------------------- */

ALTER VIEW public.resort_full
SET (security_invoker = true);

ALTER VIEW public.admin_summary
SET (security_invoker = true);

ALTER VIEW public.owner_inbox
SET (security_invoker = true);

-- =========================================================
-- End of RLS package
-- =========================================================
