# BarberPro — Full System Architecture

> Generated 2026-07-12. Based on complete codebase analysis of all source files, migrations, edge functions, docs, and configs.

---

## 1. Overview

BarberPro is a multi-tenant SaaS barbershop management platform built for the Latin American market. It provides appointment scheduling, client management, payments, marketing, WhatsApp integration, AI insights, and multi-branch support for barbershop chains.

**Target market:** Argentina, Brazil, Mexico, Chile, Colombia, Peru, Uruguay
**Payment provider:** Mercado Pago (not Stripe)
**Languages:** Spanish (default), Portuguese (Brazil), English
**Currencies:** ARS, BRL, USD, MXN, CLP, COP, PEN, UYU

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + Lucide React icons |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions + Storage) |
| Payments | Mercado Pago (Checkout Pro + recurring subscriptions) |
| Email | Resend (graceful fallback when API key absent) |
| Charts | recharts (lazy-loaded) |
| Deployment | Vercel (static build) |
| Dates | date-fns |

### Key Metrics

- 29 pages, 9 components, 8 edge functions
- 12 database migrations, ~25+ tables
- Bundle: ~125 KB gzip initial
- Build time: ~13s
- 3 translation files, ~212 keys each, 100% parity

---

## 2. Project Structure

```
project/
├── src/
│   ├── App.tsx                  # Router + auth guard + branding
│   ├── main.tsx                 # Entry point
│   ├── index.css                # Tailwind + global styles
│   ├── components/              # 9 shared UI components
│   ├── context/                 # 3 React context providers
│   │   ├── AuthContext.tsx      # Auth state + sign in/up/out
│   │   ├── TenantContext.tsx    # Active tenant + plan + features
│   │   └── ToastContext.tsx     # Toast notifications
│   ├── lib/
│   │   ├── supabase.ts          # Supabase client singleton
│   │   ├── config.ts            # Feature flags + plan config
│   │   ├── constants.ts         # App constants, nav items, plan limits
│   │   ├── database.types.ts    # Generated TS types for DB schema
│   │   ├── features.tsx         # Feature gate components
│   │   ├── logging.ts           # Activity logging via RPC
│   │   ├── paymentService.ts    # Payment abstraction layer
│   │   ├── i18n/                # I18nProvider, useI18n, t()
│   │   └── payments/            # MP provider + interface
│   └── pages/                   # 29 page components
├── supabase/
│   ├── migrations/              # 12 SQL migrations
│   └── functions/               # 8 edge functions
├── docs/                        # 5 existing docs + this file
├── public/                      # PWA + SEO assets
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── vercel.json                  # Security headers + caching
```

---

## 3. Frontend Architecture

### 3.1 Application Shell (App.tsx)

- BrowserRouter with ~25 routes
- I18nProvider wrapping entire app (locale detection, persistence)
- AuthProvider for session management
- ToastProvider for notifications
- Auth guard: unauthenticated users hitting protected routes redirect to /auth
- Branding: useApplyBranding() injects tenant CSS variables at runtime

### 3.2 Context Providers

**AuthContext**: `user`, `profile`, `loading`, `error`; methods `signIn`, `signUp`, `signOut`, `signInWithGoogle`, `resetPassword`. Fetches `profiles` by auth.uid() on state change. **Issue**: `signUp` accepts role from client — privilege escalation risk.

**TenantContext**: `tenant`, `plan`, `subscription`, `features`, `hasAccess`. Multi-tenant via `active_tenant_id` on profile. Feature resolution: 3-tier merge (DB defaults, plan hardcoded, tenant overrides). `usePlanLimit()` checks resource counts vs plan caps.

**ToastContext**: `showToast(message, type)` with auto-dismiss. Types: success, error, info, warning.

### 3.3 Routing & Navigation

Navigation defined in Layout.tsx via navItems filtered by role:
- **Admin**: dashboard, agenda, clients, barbers, services, branches, payments, reports, marketing, loyalty, notifications, WhatsApp, AI, subscription
- **Barber**: dashboard, agenda, my-appointments, clients (read), profile
- **Client**: my-appointments, book, profile

Mobile: slide-out drawer. Desktop: collapsible sidebar.

### 3.4 Component Library

**Primitives (ui.tsx)**: Card, StatCard, Badge, Button, Input, Select, Modal, PageHeader, EmptyState, Spinner, LoadingScreen, ConfirmDialog. Button has variants/sizes/loading/icon. Modal z-50, ConfirmDialog z-[60]. **Issue**: EmptyState here conflicts with EmptyStates.tsx version (different prop shapes).

**Domain Empty States (EmptyStates.tsx)**: 8 specialized components (EmptyClients, EmptyServices, etc.) with relevant icon, message, optional CTA.

**GuidedTour**: 6-step tour with CSS-selector spotlight. Persists in user_onboarding. useTourStatus() hook. Stale closure risk in handleNext.

**PlanGuard**: Route guard for onboarding/trial/plan/limits. **Bug**: references undefined `subscription` variable — dead code branch.

**OnboardingProgress**: useOnboardingProgress(tenantId) runs 7 parallel queries. Steps: profile, service, barber, branch, client, appointment, settings.

**LocaleSelector**: Language/Currency/Country/LocaleSettings dropdowns. **Bug**: wrong translation key for language label.

**BetaBanner**: 24h localStorage suppression, queries app_settings[beta_mode].

**WhatsNewModal**: Compares app_version vs user_seen_updates. **Bug**: unwrapped JSON.parse.

### 3.5 Pages (29 total)

| Page | Purpose | Key Notes |
|---|---|---|
| Dashboard | Admin KPIs + charts | 8 parallel queries, lazy charts, no explicit tenant filter |
| AgendaPage | Calendar appointment view | 24KB, largest page |
| BookingPage | Public client booking (6 steps) | Client-side slot generation, race condition risk |
| ClientsPage | Client CRUD + loyalty | 20KB |
| BarbersPage | Barber management + schedules | |
| ServicesPage | Service catalog CRUD | |
| BranchesPage | Multi-branch management | |
| PaymentsPage | Daily cash + manual payments | Bug: saves client_id/barber_id as null |
| ReportsPage | Business reports + charts | Lazy-loads ReportsCharts |
| LandingPage | Marketing landing | Hardcoded vanity stats |
| PricingPage | Public pricing (Free/Pro/Premium) | Plan defs duplicated 3x |
| RegisterPage | 3-step signup wizard | Debug console.logs, no orphan cleanup |
| AuthPage | Login/register/forgot | Security: client-selectable admin role |
| SubscriptionPage | Billing hub | MP integration, trial users can't upgrade |
| OnboardingPage | 6-step tenant setup | Destructive delete+insert on re-save |
| WhatsAppConfigPage | WhatsApp API config | 13KB |
| WhatsAppTemplatesPage | Message templates | 15KB |
| WhatsAppHistoryPage | Message log | |
| MarketingPage | Campaigns + promotions | 15KB |
| AIAssistantPage | Chat UI + insights | Auto-inserts insights, branch_id null |
| LoyaltyPage | Loyalty program | |
| FeedbackPage | User feedback form | Captures URL/user-agent |
| HelpCenterPage | Help articles + search | 9 preloaded articles |
| MyAppointmentsPage | Client/barber personal appts | |
| ProfilePage | User profile + settings | |
| SystemHealthPage | Admin health monitor | Checks Supabase/MP/Resend |
| NotificationsPage | Notification center | |

---

## 4. Backend Architecture

### 4.1 Database Overview

Supabase PostgreSQL with 12 migrations building ~25+ tables across three phases:

1. **Core schema** (2026-06-22): barbershop domain
2. **WhatsApp** (2026-06-22): messaging integration
3. **SaaS layer** (2026-06-26 to 2026-06-28): plans, subscriptions, i18n, feature flags, beta features

### 4.2 Core Domain Tables

```
tenents (id, name, slug, onboarding_step, primary_color, logo_url)
├── branches (id, tenant_id, name, address, phone)
│   └── branch_schedules (branch_id, day_of_week, start_time, end_time)
├── barbers (id, tenant_id, name, email, phone, active)
│   ├── barber_services (barber_id, service_id)
│   └── barber_schedules (barber_id, branch_id, day_of_week, start_time, end_time)
├── services (id, tenant_id, name, duration_minutes, price, active)
├── clients (id, tenant_id, name, phone, email, notes, loyalty_points)
├── appointments (id, tenant_id, branch_id, barber_id, client_id, service_id, status, start_time, end_time)
└── payments (id, tenant_id, appointment_id, amount, method, status, branch_id, client_id, barber_id)
```

### 4.3 SaaS Tables

```
profiles (id, email, full_name, role, active_tenant_id)
├── tenant_users (tenant_id, user_id, role)
├── user_onboarding (user_id, tenant_id, steps_completed[], tour_completed, tour_skipped)
plans (id, name, tier, price_monthly, price_yearly, features{})
subscriptions (id, tenant_id, plan_id, status, billing_cycle, current_period_end, mp_subscription_id)
transactions (id, tenant_id, subscription_id, amount, status, method, mp_payment_id)
invoices (id, tenant_id, subscription_id, invoice_seq, amount, status, pdf_url)
app_settings (key, value) — global config
tenant_settings (tenant_id, key, value) — per-tenant overrides
version_updates (version, date, features[])
user_seen_updates (user_id, version)
```

### 4.4 WhatsApp Tables

```
whatsapp_config (tenant_id, phone_number_id, access_token, verify_token, template_namespace)
whatsapp_templates (id, tenant_id, name, language, category, body, status)
whatsapp_messages (id, tenant_id, client_id, phone, message, status, sent_at)
whatsapp_automations (id, tenant_id, trigger_type, template_id, active)
```

### 4.5 Engagement Tables

```
ai_insights (id, tenant_id, branch_id, type, message, severity, created_at)
activity_logs (id, user_id, tenant_id, action, entity_type, entity_id, metadata)
feedback (id, user_id, tenant_id, type, message, url, user_agent, viewport, created_at)
```

### 4.6 Row Level Security (RLS)

RLS enabled on all tables. 4 CRUD policies per table (never FOR ALL), scoped TO authenticated. Tenant-scoped tables verify membership through tenant_users join. User-scoped tables use direct auth.uid() = user_id. Public tables (plans, app_settings) use USING(true) for read.

Migration 20260628090000 fixed 25+ INSERT policies that were overly permissive.

### 4.7 Edge Functions (8 deployed)

| Function | Purpose | Auth |
|---|---|---|
| mp-checkout | Creates MP preference, returns init_point | JWT |
| mp-webhook | Receives MP IPN payment notifications | Public |
| mp-subscription | Create/cancel/charge/status for subscriptions | JWT |
| payment-cron | Retries failed payments, expires trials | Bearer CRON_SECRET |
| whatsapp-send | Sends WhatsApp message via Meta API | JWT |
| whatsapp-webhook | Receives WhatsApp delivery receipts | Public |
| whatsapp-automations | Runs automated message triggers | JWT |
| send-campaign | Sends marketing campaign | JWT |

All include mandatory CORS headers (Access-Control-Allow-Origin: *, methods, headers).

---

## 5. Payments Architecture

### 5.1 Mercado Pago Integration

BarberPro uses Mercado Pago (not Stripe) targeting Latin America. Supports one-time payments and recurring subscriptions.

**Payment service layer** (`lib/paymentService.ts` + `lib/payments/`):
- `types.ts`: PaymentProvider interface (11 methods)
- `mercadopago.ts`: MercadoPagoProvider implementation
- `index.ts`: Provider factory with COUNTRY_PROVIDER_MAP

Architecture supports future Stripe/PayPal/PIX providers via strategy pattern.

### 5.2 Payment Flows

**One-time checkout**: User selects plan -> paymentService.createCheckout() -> mp-checkout edge function creates MP preference -> redirect to MP Checkout Pro -> MP IPN to mp-webhook -> update transactions/subscriptions -> auto-generate invoice.

**Recurring subscription**: Initial creation via mp-subscription -> card tokenization -> payment-cron runs hourly (retries past_due, expires trials past 14 days, sends emails).

**5 subscription states**: trial (14 days) -> active / past_due -> canceled / expired.

### 5.3 Email Notifications (Resend)

4 email types: payment success, payment rejected, trial expired, retry success. Graceful fallback: if RESEND_API_KEY not set, emails silently skipped.

---

## 6. Internationalization (i18n)

### 6.1 Architecture

- `lib/i18n/index.tsx`: I18nProvider, useI18n(), t(key, params)
- 3 translation files: en.json, es.json (default), pt-BR.json
- Auto-detection via navigator.language + timezone mapping
- localStorage persistence
- formatCurrency() with 8 currencies, country-to-currency mapping

### 6.2 Coverage

13 top-level sections, ~212 keys per language. All three languages have 100% key parity.

### 6.3 Gaps

Beta-feature UI strings not in translation files (use hardcoded Spanish): help center, feedback, system health, guided tour, empty states, what's new modal, and most page-level content.

---

## 7. Feature Flag System

### 7.1 Three-Tier Resolution

1. DB defaults (app_settings table)
2. Plan hardcoded (lib/config.ts)
3. Tenant overrides (tenant_settings table)

### 7.2 Feature Gates

7 flags: ai_assistant, whatsapp, marketing, loyalty, reports, surveys, notifications. Implemented via <FeatureGuard> component, PlanGuard route checks, and usePlanLimit() hook.

### 7.3 Plan Tiers

| Plan | Price (ARS) | Key Limits |
|---|---|---|
| Free | 0 | Limited appointments, 1 branch, 1 barber |
| Pro | 4,990/mo | More appointments, multiple branches/barbers |
| Premium | 9,990/mo | Unlimited (-1 sentinel), all features |

**Issue**: Plan definitions triplicated across PricingPage, SubscriptionPage, RegisterPage.

---

## 8. Security Analysis

### 8.1 Critical Vulnerabilities

| Severity | Issue | Location |
|---|---|---|
| CRITICAL | Client-selectable admin role on registration | AuthPage.tsx — role select passed to signUp |
| HIGH | Booking race condition — no DB lock | BookingPage.tsx — client-side slot availability |
| HIGH | Missing tenant scoping on public queries | BookingPage.tsx — branches/services have no tenant_id filter |
| MEDIUM | Payments not linked to client/barber | PaymentsPage.tsx — client_id/barber_id hardcoded null |
| MEDIUM | Unwrapped JSON.parse | WhatsNewModal.tsx line 40 |

### 8.2 Security Strengths

- RLS on all tables with 4 CRUD policies each
- 25+ INSERT policies fixed in migration 20260628090000
- Security headers in vercel.json (nosniff, DENY framing, referrer policy)
- No hardcoded credentials in edge functions
- JWT verification on authenticated functions
- CRON_SECRET for cron endpoint

### 8.3 Recommendations

1. Enforce role server-side via trigger/RLS — only allow admin through create_tenant RPC
2. Add unique constraint on appointments(barber_id, start_time) to prevent double-booking
3. Add explicit tenant_id filters on public booking queries
4. Fix payment linking — derive client_id/barber_id from appointment
5. Wrap JSON.parse in try/catch in WhatsNewModal

---

## 9. Technical Debt Register

### 9.1 Bugs

| Bug | Location | Severity |
|---|---|---|
| subscription undefined in PlanGuard | PlanGuard.tsx:51 | Compile/runtime — dead code |
| client_id/barber_id null on payment save | PaymentsPage.tsx:86-87 | Data integrity |
| Duplicate EmptyState component | ui.tsx vs EmptyStates.tsx | Import collision |
| Wrong translation key in LocaleSettings | LocaleSelector.tsx:175 | UX — falls back to literal |
| Hardcoded pt-8 for BetaBanner space | Layout.tsx:207 | Visual — permanent gap |
| Stale closure in GuidedTour handleNext | GuidedTour.tsx | Potential tour skip |
| Trial users can't upgrade via SubscriptionPage | SubscriptionPage.tsx | UX dead-end |
| Loose === true comparison for beta mode | BetaBanner.tsx | Dead branch |

### 9.2 Code Smells

- Debug console.log/error left in RegisterPage.tsx (lines 81-135)
- Plan definitions triplicated across Pricing/Subscription/Register pages
- Destructive delete+insert in OnboardingPage re-saves (loses row IDs)
- No orphan cleanup in RegisterPage — failed tenant creation leaves auth user
- Slug generation client-side with no uniqueness check
- AI insights auto-insert with branch_id null and no dedup
- Hardcoded vanity stats on LandingPage
- <a href> instead of <Link> in PlanGuard — full page reload

### 9.3 Architecture Concerns

- Heavy reliance on RLS for tenant isolation — Dashboard/Booking omit explicit tenant_id filters
- N+1 query pattern in OnboardingProgress — 7 parallel queries on every refresh
- Client-side aggregation in Dashboard — 8 queries + in-memory stats, won't scale
- Client-side slot generation in Booking — fragile string time parsing, no DB concurrency control
- Inconsistent error handling — Dashboard has no try/catch; many pages lack error states

### 9.4 Documentation Gaps

- README outdated — missing i18n, multi-currency, payment providers, feature flags, white-label
- manifest.json — only 1 SVG icon (missing 192/512 PNG), no screenshots, lang hardcoded to "es"
- robots.txt vs sitemap.xml — /auth disallowed in robots but listed in sitemap (conflict)
- No hreflang annotations in sitemap despite trilingual support
- Beta-feature strings not internationalized

---

## 10. Deployment & DevOps

### 10.1 Build

- Vite build to static dist/ output
- TypeScript strict mode (tsconfig.app.json)
- ESLint with React hooks + TS rules
- PostCSS + Tailwind for styling
- Hashed JS/CSS bundles for cache busting

### 10.2 Vercel Configuration (vercel.json)

Security headers: X-Content-Type-Options nosniff, X-Frame-Options DENY, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy restricted. Static asset caching: 1 year immutable. SPA rewrite: all routes to index.html.

### 10.3 PWA / SEO

- manifest.json: standalone display, theme color #d4af37 (gold), categories business/productivity
- robots.txt: allows root, disallows 18 protected routes
- sitemap.xml: 5 public URLs (/, /pricing, /register, /auth, /book)
- OG/Twitter meta tags in index.html
- favicon.svg present

### 10.4 Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| VITE_SUPABASE_URL | Yes | Supabase project URL |
| VITE_SUPABASE_ANON_KEY | Yes | Supabase anon public key |
| SUPABASE_SERVICE_ROLE_KEY | Yes (edge) | Server-side Supabase access |
| MERCADO_PAGO_ACCESS_TOKEN | Yes | MP API credentials |
| MERCADO_PAGO_PUBLIC_KEY | Yes | MP checkout credentials |
| RESEND_API_KEY | Optional | Transactional email |
| FROM_EMAIL | Optional | Sender email |
| CRON_SECRET | Optional | Auth for payment-cron |

### 10.5 Pending Production Steps

- Mercado Pago production credentials
- Resend production account + domain verification
- Custom domain + DNS/SSL
- Update hardcoded URLs in sitemap/index.html
- Cron job setup for payment-cron
- E2E staging tests, WCAG AA audit, Lighthouse 90+

---

## 11. Key Data Flows

### 11.1 Registration to Tenant Creation

```
AuthPage/RegisterPage
  -> supabase.auth.signUp(email, password, {role, full_name})
  -> create_tenant RPC (slug, name, plan)
     -> INSERT tenants + tenant_users (role=admin)
  -> UPDATE profiles SET active_tenant_id
  -> Redirect to /onboarding
```
Risk: If create_tenant fails, auth user exists without tenant. No cleanup.

### 11.2 Onboarding Flow

6 steps: welcome -> barbershop info -> schedule -> services -> barbers -> branch. Each step updates tenants.onboarding_step. Steps 2-4 use destructive DELETE + INSERT on re-save. Redirect to /dashboard on completion.

### 11.3 Booking Flow (Public)

6 steps: branch -> service -> barber -> date -> time -> confirm. Client-side slot generation from barber_schedules (30-min grid). Conflict check is read-only (race condition risk). Find-or-create client by phone, then INSERT appointment.

### 11.4 Subscription Payment Flow

SubscriptionPage -> paymentService.createCheckout() -> mp-checkout edge function -> MP preference -> redirect to Checkout Pro -> MP IPN -> mp-webhook -> update subscriptions/transactions -> generate invoice -> send email (Resend) -> redirect back.

---

## 12. Migrations Inventory

| Date | Migration | Purpose |
|---|---|---|
| 2026-06-22 | barberpro_complete_schema | Core barbershop schema |
| 2026-06-22 | fix_security_issues | Security fixes |
| 2026-06-22 | whatsapp_integration | WhatsApp tables |
| 2026-06-26 | saas_tables | Plans, subscriptions, transactions |
| 2026-06-26 | saas_rls_triggers | RLS policies + triggers for SaaS |
| 2026-06-26 | create_tenant_function | Tenant creation RPC |
| 2026-06-26 | mercado_pago_schema | MP-specific tables |
| 2026-06-28 | fix_rls_insert_policies | 25+ INSERT policy fixes |
| 2026-06-28 | internationalization_schema | i18n + feature flags + white-label |
| 2026-06-28 | beta_features_schema | Beta: help, feedback, tour, updates |
| 2026-07-04 | fix_create_user_onboarding_function | Fix onboarding function |
| 2026-07-04 | fix_create_tenant_ambiguous_columns | Fix ambiguous column refs |

---

## 13. Recommendations & Roadmap

### P0 — Immediate Fixes

1. Remove client-selectable role from AuthPage — enforce admin only via create_tenant RPC
2. Fix PlanGuard.tsx undefined subscription reference
3. Fix PaymentsPage.tsx null client_id/barber_id — derive from appointment
4. Add unique constraint on appointments(barber_id, start_time, status) for double-booking prevention
5. Wrap JSON.parse in try/catch in WhatsNewModal

### P1 — Short-Term

6. Consolidate plan definitions into single shared module
7. Remove duplicate EmptyState — keep EmptyStates.tsx version, re-export from ui.tsx
8. Add explicit tenant_id filters to public booking queries
9. Add orphan cleanup on failed tenant creation
10. Remove debug console.log from RegisterPage
11. Fix Layout.tsx hardcoded pt-8
12. Add error handling to Dashboard data loading

### P2 — Medium-Term

13. Internationalize beta-feature strings
14. Move Dashboard aggregation to DB-side RPCs
15. Replace destructive delete+insert in OnboardingPage with upsert
16. Add PNG icons (192/512) to manifest.json
17. Resolve robots.txt vs sitemap.xml /auth conflict
18. Add hreflang annotations for trilingual SEO
19. Update README to reflect current scope
20. Add slug uniqueness check

### P3 — Future

21. Implement Stripe/PayPal/PIX providers via existing strategy pattern
22. Move hardcoded strings to DB-backed dynamic translations
23. Add multi-tenant subdomain support
24. Log export to CSV + dashboard
25. Push notifications and tutorial videos

---

*End of document.*
