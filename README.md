# FieldOps Dispatch — starter MVP

A small, original field-service dispatch web app inspired by common FSM workflows: dispatcher job creation/assignment, technician job board, job status updates, and permission-based foreground GPS location sharing.

## Lowest-cost path

- **Code editor/runtime:** install Node.js LTS and use VS Code (both free).
- **Database/auth/realtime:** Supabase Free for a prototype. Free-tier quotas and project-pausing rules can change; check current pricing before relying on it for business operations.
- **Web hosting:** deploy the built web app to a free static-hosting tier (for example Vercel, Netlify, or Cloudflare Pages). HTTPS is required for browser geolocation outside localhost.
- **Map:** Leaflet + OpenStreetMap tiles are used in this starter. Follow the tile provider's usage policy; for heavy/commercial usage, choose an appropriate provider.
- **Mobile:** this MVP is responsive web, not a native App Store app. A web page is suitable for proving the workflow. Reliable background GPS requires a native build and OS permissions.

## Run locally

1. Install Node.js LTS from https://nodejs.org/.
2. Create a Supabase project at https://supabase.com/.
3. In Supabase, open **SQL Editor**, paste `supabase/schema.sql`, and run it.
4. In Supabase **Authentication > Users**, create a user for yourself and each technician. For each user, copy the Auth user UUID.
5. Add a profile row for each account in the SQL editor. Example (replace values):

   ```sql
   insert into public.profiles (id, full_name, email, role)
   values
     ('AUTH-UUID-FOR-YOU', 'Dispatcher Admin', 'you@example.com', 'admin'),
     ('AUTH-UUID-FOR-TECH', 'Technician One', 'tech@example.com', 'technician');
   ```

   For the first admin only, if the admin policy blocks you from managing profiles, insert profile rows through the SQL Editor as the database owner. Never give technicians the service-role key.
6. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Supabase project settings/API keys; use the publishable/anon client key, never the service-role secret).
7. In a terminal inside this folder, run:

   ```bash
   npm install
   npm run dev
   ```

8. Open the localhost URL Vite prints. Sign in using one of the Auth accounts.

## Deploy as a free web app

1. Push this folder to a private GitHub repository.
2. Import the repository into a free static web hosting service that supports Vite.
3. Set build command to `npm run build` and output directory to `dist`.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as deployment environment variables.
5. Deploy. Use the HTTPS URL on phones. Add that URL to Supabase Auth's allowed redirect/site URL settings if needed.

## Important limitations / production checklist

- GPS sharing starts only when a technician taps **Start sharing location**, the board stays open, and the browser grants location permission. It stops when the user stops sharing or the page closes. Browser GPS may be throttled in the background. Do not describe this as continuous background tracking.
- For background GPS, build a native app (e.g. React Native + Expo Location) and explicitly request the correct iOS/Android permissions. Test on physical phones; OSes may suspend or stop tracking. Make location collection visible and documented in your company policy.
- The app's UI uses status controls for all roles; RLS restricts technicians to assigned jobs, but the current policy allows a technician to update any fields on their assigned job through the client. Before production, add a database trigger or RPC so technicians can change **only** status/allowed notes, not reschedule or reassign work.
- Review and test every Row Level Security policy, add audit history, password reset, notifications, data retention, backups, error monitoring, and user deactivation before real company use.
- Enable/verify Realtime table publication if the SQL script reports that the table is already in the publication.
- Never use a Supabase service-role key in frontend code.
- This starter is not affiliated with or endorsed by ServiceMax. It does not reproduce ServiceMax code, assets, or branding.
