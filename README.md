# Mentor — Career Guidance Platform

A full-stack Next.js 14 application for career guidance, expert mentoring, and goal tracking. Built with the App Router, Supabase, Stripe, and Tailwind CSS.

---

## Tech Stack

| Layer     | Technology                                    |
|-----------|-----------------------------------------------|
| Framework | Next.js 14 (App Router)                       |
| Auth      | Supabase Auth (LinkedIn OIDC + Magic Link)    |
| Database  | Supabase (PostgreSQL + Row Level Security)    |
| Payments  | Stripe Checkout + Webhooks                    |
| Styling   | Tailwind CSS (custom design system)           |
| Language  | TypeScript                                    |
| Fonts     | Sora (display) + DM Sans (body)               |

---

## Project Structure

```
mentor/
├── src/
│   ├── app/
│   │   ├── auth/
│   │   │   ├── login/           # LinkedIn OAuth + magic link login
│   │   │   └── callback/        # OAuth handler — upserts profile on first login
│   │   ├── dashboard/           # Stats overview, recent goals & bookings
│   │   ├── profile/             # Edit role, target, salary, skills
│   │   ├── goals/               # Career goal CRUD with filters & status
│   │   ├── experts/
│   │   │   ├── page.tsx         # Expert grid with pricing
│   │   │   └── [id]/            # Expert detail + Stripe checkout
│   │   ├── bookings/            # Session history + success banner
│   │   ├── api/
│   │   │   ├── checkout/        # Creates Stripe Checkout session
│   │   │   └── webhooks/stripe/ # Confirms bookings after payment
│   │   ├── not-found.tsx
│   │   └── error.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx      # Nav with live user info
│   │   │   └── AppLayout.tsx    # Authenticated shell
│   │   └── ui/
│   │       ├── Avatar.tsx
│   │       ├── Badge.tsx
│   │       ├── EmptyState.tsx
│   │       ├── PageHeader.tsx
│   │       └── Skeleton.tsx     # Loading states for all pages
│   ├── hooks/
│   │   ├── useProfile.ts        # Fetches authed user profile
│   │   └── useSession.ts        # Supabase session + auth state change
│   ├── lib/
│   │   ├── supabase.ts          # Client-side + server-side Supabase instances
│   │   ├── stripe.ts            # Stripe SDK + formatPrice helper
│   │   └── utils.ts             # cn() Tailwind class merger
│   ├── middleware.ts             # Route protection + auth redirects
│   └── types/index.ts           # Full TypeScript types for all DB tables
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Tables, RLS, triggers, seed experts
├── .env.local                   # Placeholder environment variables
└── README.md
```

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/migrations/001_initial_schema.sql` in the SQL editor
3. Enable **LinkedIn OIDC** under Authentication → Providers
   - Add your LinkedIn App Client ID + Secret
   - Set Callback URL: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`

### 3. Set up Stripe

1. Get your keys from [dashboard.stripe.com](https://dashboard.stripe.com)
2. For local webhooks: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### 4. Configure `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Run the app

```bash
npm run dev
# → http://localhost:3000
```

---

## Database Schema

### `profiles` — extends `auth.users`
`current_role`, `target_role`, `current_salary`, `target_salary`, `skills[]`, `industry`, `years_experience`, `bio`

### `goals`
`title`, `description`, `category` (role/skill/salary/network/education/other), `priority` (high/medium/low), `status` (active/completed/paused/cancelled), `target_date`, `milestones` (JSONB)

### `experts`
`full_name`, `headline`, `bio`, `expertise_areas[]`, `industries[]`, `rating`, `review_count`, `is_verified`

### `services`
`expert_id`, `title`, `type` (session/review/course/package), `duration_mins`, `price_cents`, `stripe_price_id`

### `bookings`
`user_id`, `expert_id`, `service_id`, `status` (pending/confirmed/completed/cancelled/refunded), `stripe_checkout_session_id`, `amount_cents`, `meeting_url`

All tables use **Row Level Security**. Users access only their own data. Experts and services are publicly readable.

---

## Key Pages

| Route          | Description                                           |
|----------------|-------------------------------------------------------|
| `/`            | Marketing landing page                                |
| `/auth/login`  | LinkedIn OAuth + magic link sign in                   |
| `/dashboard`   | Stats, active goals, upcoming sessions                |
| `/profile`     | Edit career info, salary, skills                      |
| `/goals`       | Create/manage career goals with filters               |
| `/experts`     | Browse experts with ratings, tags, pricing            |
| `/experts/[id]`| Expert detail, bio, services, Stripe booking          |
| `/bookings`    | Booking history with status + meeting links           |

---

## Payments Flow

1. User clicks **Book now** on an expert's service
2. `BookingButton` calls `POST /api/checkout` with `serviceId` + `expertId`
3. Server creates a Stripe Checkout session and a `pending` booking record
4. User is redirected to Stripe's hosted checkout
5. On success, Stripe fires `checkout.session.completed` to `/api/webhooks/stripe`
6. Webhook updates the booking to `confirmed` and records `paid_at`
7. User lands on `/bookings?success=true` and sees the confirmation banner

---

## Deploying to Vercel

```bash
npx vercel
```

Add all env vars in Vercel → Settings → Environment Variables.

Then update redirect URLs in:
- **Supabase**: Authentication → URL Configuration
- **LinkedIn Developer App**: Authorized Redirect URLs
- **Stripe**: Dashboard → Webhooks → `https://yourdomain.com/api/webhooks/stripe`

---

## Extending the App

- **Scheduling** — integrate Cal.com or Calendly for real slot booking
- **Expert dashboard** — let experts manage their own profiles and services  
- **Reviews** — post-session ratings that update `experts.rating`
- **AI advisor** — use the Anthropic API to suggest goals from profile data
- **Stripe Connect** — direct payouts to experts
- **Realtime** — Supabase Realtime for live booking status updates
