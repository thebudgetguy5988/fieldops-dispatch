# Via Lock release status

The application source has been recovered onto `vialock-safe-recovery-20261015` and compared against the currently deployed ancestor. Organization management, scheduling, inventory, work-order photos and signatures, the logo, and analytics are present.

## October 18 launch fixes

- Correct employee invitation email validation and refresh organization membership immediately.
- Keep privileged organization implementations in the private schema, with invoker API wrappers and server-side authorization.
- Allow technicians to read their own location so repeated location upserts succeed.
- Serialize inventory operation retries before checking or changing stock.
- Serialize administrator role changes to preserve the last administrator.
- Add password recovery and appointment rescheduling/duration controls.
- Load analytics once on the complete application, including sign-in.
- Repair and run the production-file guard tests in CI.

## Verification

Run `npm test` and `npm run build`. `scripts/test-live-api.py` performs authenticated API tests using isolated, pre-provisioned administrator, technician, and second-organization accounts. Pass its private configuration path as the only argument. Never commit account configuration, passwords, tokens, or customer evidence. Tests include scheduling conflicts, role restrictions, cross-organization isolation, stock retry/concurrency, location updates, and evidence storage. The harness does not replace browser end-to-end testing or validate email delivery.

## Remaining launch setting

Supabase leaked-password protection remains disabled. The connected Supabase tools cannot change Auth configuration; the dashboard requires a fresh authenticated session. Confirm this setting is enabled before describing the security checklist as fully complete.

Messaging remains outside this release scope. Legacy `technicians` and `work_orders` tables are deliberately deny-by-default with RLS and no client policies; the app uses `profiles` and `jobs`.
