# MarketPilot Product Roadmap

_Last updated: June 2025_

---

## What We Agreed

### Strategy: Africa First → Global Second

We discussed whether MarketPilot should launch globally from day one or focus on Africa/Nigeria first.

**Decision: Africa/Nigeria First (Version 1.0), then Global (Version 2.0)**

Reasons:
- The system is already tuned for the African market (WAT timezone, NGN currency, Nigerian trending news, WhatsApp/Telegram focus)
- Product-market fit must be proven before expanding globally
- Real users = real feedback = better product
- Revenue from Version 1.0 funds the global upgrade
- Version 2.0 global work is an upgrade, not a rebuild — estimated 2-3 weeks when ready

---

## Version 1.0 — Africa/Nigeria Launch (Current)

**Goal**: Get 50–100 paying African clients. Fix real bugs. Build case studies.

### What's Already Built (Phases 1–11)

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Auth, Campaigns, Brand DNA | ✅ Done |
| 2 | Content Studio (AI post generation) | ✅ Done |
| 3 | Scheduler + Auto-posting | ✅ Done |
| 4 | Boosts (SMM Panel) | ✅ Done |
| 5 | AI Opportunity Inbox (News Hijack + Competitor) | ✅ Done |
| 6 | Auto-Reply Inbox (Telegram, Facebook, Instagram) | ✅ Done |
| 7 | Blog Auto-generation | ✅ Done |
| 8 | Content Repurposing from Conversations | ✅ Done |
| 9 | Story Auto-Scheduler (Instagram + Facebook) | ✅ Done |
| 10 | PDF Monthly Report (generate + email + download) | ✅ Done |
| 11 | Lead Scoring (Hot/Warm/Cold + AI intent tags) | ✅ Done |

### What Still Needs Work Before Launch
- Landing page (briefing coming — full redesign/corrections)
- Self-serve onboarding flow (signup → plan → payment → dashboard)
- Paystack payment integration for African clients
- Fix any remaining bugs found during testing

---

## Version 2.0 — Global Launch (Future)

**Trigger**: When Version 1.0 hits 100 paying clients OR 6 months after Africa launch.

### What Needs to Be Built for Global

#### Must Have
| Item | Description |
|------|-------------|
| Timezone per client | Client sets timezone on signup. Scheduler, cron, reports all use it. Remove WAT hardcoding. |
| Country per campaign | Drives trending news geo, content language default, date formats |
| Currency per client | NGN, USD, GBP, EUR, INR etc. Affects catalog prices, boost budget, reports |
| Stripe integration | Replaces/supplements Paystack. Handles 135+ currencies. Required for USA/Europe/India |
| GDPR compliance | Cookie consent banner, privacy policy page, data deletion in settings. Required for EU/UK clients |
| Self-serve signup | Signup → plan selection → Stripe checkout → dashboard. No admin needed |

#### Should Have (within first month of global launch)
| Item | Description |
|------|-------------|
| WhatsApp Business API | Meta's official API. Huge in Africa, India, Latin America, Middle East |
| Multi-language dashboard UI | App UI translatable for French, Spanish, Arabic markets |
| Google Business Profile posting | Very relevant for USA and European local businesses |
| Referral/affiliate program | Users earn commission on signups. Referral links already built — connect to billing |
| Local currency pricing | Show USD for Americans, GBP for UK, EUR for Europe. Stripe handles automatically |

#### Nice to Have (Scale Phase)
| Item | Description |
|------|-------------|
| White-label | Agencies resell MarketPilot under their own brand |
| API access | Enterprise clients integrate directly |
| Zapier/Make integration | Connect to other tools |
| Team members per account | Multiple logins per campaign |

---

## What Already Works Globally (No Changes Needed)

- Content generation (Groq/Llama) — works in any language/market
- Social media posting — Facebook, Instagram, LinkedIn, Twitter, Telegram, TikTok are all global
- Lead capture, CRM, Auto-reply — platform agnostic
- Analytics, Scheduler, Boosts — no geographic restrictions
- Pexels images — global stock library

---

## What Is Nigeria/Africa-Specific in Version 1.0

| Item | Location in Code | Version 2.0 Fix |
|------|-----------------|-----------------|
| WAT timezone hardcoded | `services/scheduler.py` | Add timezone field to campaign settings |
| Google Trends `geo=NG` | `routers/scheduler.py` `/jobs/trends` | Use campaign country field |
| NGN currency default | `app/catalog`, reports | Add currency field to client settings |
| Paystack only | Not yet built | Add Stripe alongside Paystack |

---

## Tech Stack (Current)

| Layer | Technology | Host |
|-------|-----------|------|
| Frontend | Next.js 14 | Vercel |
| Backend | Python FastAPI | Render |
| Database | Neon Postgres | Neon |
| AI | Groq Llama 3.3 | Groq API |
| Email | Resend | Resend |
| Images | Pexels (primary) + Pollinations (fallback) | External APIs |
| SMM Boosts | JustAnotherPanel | Pay per use |

---

## Next Immediate Actions

1. **Landing page redesign** — briefing coming from founder
2. **Paystack integration** — so African clients can pay and self-onboard
3. **Self-serve signup flow** — connect register page to payment
4. **Testing with real clients** — find 10 beta users in Nigeria/Africa

---

_This document should be updated after every major decision or phase completion._
