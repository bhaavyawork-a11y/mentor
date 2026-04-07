-- ─────────────────────────────────────────────────────────────────────────────
-- 012: Expert dashboard — payouts, expert self-management RLS, new columns
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Extend experts table ───────────────────────────────────────────────────
ALTER TABLE public.experts
  ADD COLUMN IF NOT EXISTS upi_id               text,
  ADD COLUMN IF NOT EXISTS bank_account_number  text,
  ADD COLUMN IF NOT EXISTS bank_ifsc            text,
  ADD COLUMN IF NOT EXISTS bank_account_name    text,
  ADD COLUMN IF NOT EXISTS google_refresh_token text,
  ADD COLUMN IF NOT EXISTS google_connected     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_earned_cents   bigint  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_payout_cents bigint  DEFAULT 0;

-- ── 2. Allow experts to see their own full row (even inactive) ────────────────
CREATE POLICY "Experts can view own record"
  ON public.experts FOR SELECT
  USING (user_id = auth.uid());

-- ── 3. Allow any authenticated user to insert their expert profile ────────────
CREATE POLICY "Experts can create own profile"
  ON public.experts FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ── 4. Allow experts to update their own record ───────────────────────────────
CREATE POLICY "Experts can update own profile"
  ON public.experts FOR UPDATE
  USING (user_id = auth.uid());

-- ── 5. Services: experts can fully manage their own services ─────────────────
CREATE POLICY "Experts can manage own services"
  ON public.services FOR ALL
  USING (
    expert_id IN (SELECT id FROM public.experts WHERE user_id = auth.uid())
  )
  WITH CHECK (
    expert_id IN (SELECT id FROM public.experts WHERE user_id = auth.uid())
  );

-- ── 6. Bookings: experts can view and update bookings they're booked for ──────
CREATE POLICY "Experts can view own bookings"
  ON public.bookings FOR SELECT
  USING (
    expert_id IN (SELECT id FROM public.experts WHERE user_id = auth.uid())
  );

CREATE POLICY "Experts can update own bookings"
  ON public.bookings FOR UPDATE
  USING (
    expert_id IN (SELECT id FROM public.experts WHERE user_id = auth.uid())
  );

-- ── 7. Widen the service type enum ────────────────────────────────────────────
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_type_check;
ALTER TABLE public.services
  ADD CONSTRAINT services_type_check
  CHECK (type IN (
    'session', 'review', 'course', 'package',
    'mock_interview', 'coaching', 'mentorship', 'custom'
  ));

-- Change default currency to INR for new services
ALTER TABLE public.services ALTER COLUMN currency SET DEFAULT 'inr';

-- ── 8. Expert payouts table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expert_payouts (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id       uuid         NOT NULL REFERENCES public.experts(id) ON DELETE CASCADE,
  amount_cents    bigint       NOT NULL CHECK (amount_cents > 0),
  status          text         NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'processing', 'paid', 'rejected')),
  method          text         CHECK (method IN ('upi', 'bank_transfer')),
  upi_id          text,
  bank_account    text,
  bank_ifsc       text,
  bank_name       text,
  notes           text,
  requested_at    timestamptz  DEFAULT now(),
  processed_at    timestamptz,
  created_at      timestamptz  DEFAULT now()
);

ALTER TABLE public.expert_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Experts can view own payouts"
  ON public.expert_payouts FOR SELECT
  USING (
    expert_id IN (SELECT id FROM public.experts WHERE user_id = auth.uid())
  );

CREATE POLICY "Experts can create own payouts"
  ON public.expert_payouts FOR INSERT
  WITH CHECK (
    expert_id IN (SELECT id FROM public.experts WHERE user_id = auth.uid())
  );
