# RoadRescue — open in VS Code

1. Unzip and open the folder in VS Code.
2. Install dependencies: `bun install` (or `npm install`).
3. Start the app: `bun run dev` — it opens on http://localhost:8080
4. The `.env` file is already filled in with your Lovable Cloud backend
   (database, logins, storage). Keep it private.
5. Database structure lives in `supabase/migrations/` — it is already applied
   to your cloud backend, so you do not need to run anything.

What's included:
- Emergency call (works with no internet: phone, SMS and dial-code options)
- "I don't feel safe" red alert that sends name + location to agents/police
- Live request tracking with provider movement updates
- Provider reviews and star ratings
- Cash and Instant EFT payments
- Admin dashboard incl. a safety alerts tab
