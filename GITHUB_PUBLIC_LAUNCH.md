# Via Lock public signup through GitHub

Via Lock uses Supabase GitHub OAuth for public signup. The interface checks the public Auth settings endpoint before offering GitHub login. New users sign up with GitHub; existing email/password login and recovery remain available.

## Provider configuration

- Application: Via Lock, GitHub app ID 3943172
- Public client ID: Ov23liHxPBqOE64pNxsA
- Homepage and canonical return: https://vialock.vercel.app/
- Exact provider callback: https://tdcqglxcmilnvyytlfqk.supabase.co/auth/v1/callback
- Scope: user:email (read-only email addresses; no repository access)
- Device flow and wildcard provider callbacks: disabled
- Users without email: disallowed

The owner approved registration and credential transfer, completed GitHub Mobile identity verification, and the provider was enabled on October 18, 2026. The client secret is stored only in Supabase provider configuration and is absent from the repository and frontend.

## Verification

- Seven local smoke/guard tests and the production build passed.
- The prepared preview rendered Continue with GitHub after provider activation.
- Real browser OAuth authorization completed and returned to the signed-in service board.
- Database verification confirmed the existing owner retained verified email, administrator role, and organization membership; both email and GitHub identities are linked.
- The existing authenticated API suite passed 56 isolated checks for organization, invitation, scheduling, inventory, location, evidence, and authorization behavior before this auth addition.

A second independent GitHub account was not available, so first-time external GitHub registration has not been exercised end to end. Public signups are enabled, but this limit should be retained in release notes.

Email confirmation and database authorization remain enabled. Editable user metadata does not assign membership. Public email/password signup delivery still requires custom SMTP; the signup interface therefore directs new users to GitHub. Supabase Free does not include the paid leaked-password protection setting, which remains disabled. No paid subscription was purchased.
