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

## Verified release: October 18, 2026

Code commit `c9e543a` passed seven local guard/smoke tests, the production build, GitHub CI, and 56 authenticated live API checks. Additional live checks confirmed that simultaneous conflicting bookings permit exactly one appointment and user-editable metadata cannot confer administrator membership.

Production deployment `dpl_Gwcg5pcmTpWqw9deNajvSwtKWSy9` was READY at https://vialock.vercel.app/. The live sign-in, signup, and recovery forms were inspected in the browser. Main and the recovery branch contain the same application code.

All disposable test accounts, organizations, inventory, appointments, evidence images, and sessions were removed after testing. Account fixtures were provisioned for testing; public email confirmation delivery and authenticated browser end-to-end flows were not verified.

The Supabase dashboard now enforces a minimum password length of 12, verified by a live API rejection of an under-length password. The Site URL and allowed authentication callbacks now include https://vialock.vercel.app/. Email confirmation remains enabled.

## Public GitHub launch: October 18, 2026

Public signup now uses the approved Via Lock GitHub OAuth application. The provider is enabled and a real browser login linked the owner to the existing verified administrator account and organization. The interface directs new users to GitHub and preserves existing email sign-in. See GITHUB_PUBLIC_LAUNCH.md for configuration and verification limits. First-time signup with a second external GitHub account has not been exercised.

## Email authentication and optional plan follow-up

1. **Configure transactional email for general email authentication.** Custom SMTP is disabled. Supabase's default SMTP only delivers to project-team email addresses, so outside customers cannot complete email confirmation or password recovery. A configured email provider and verified sending identity are required.
2. **Enable leaked-password protection on a supported plan.** The organization is on Supabase Free. The dashboard identifies this feature as Pro and above, and an attempted enable did not persist. No paid plan change was made.

The final security advisor scan reported this one password-protection warning and two informational legacy deny-by-default tables, with no privileged-function warnings.

Messaging remains outside this release scope. Legacy `technicians` and `work_orders` tables are deliberately deny-by-default with RLS and no client policies; the app uses `profiles` and `jobs`.
