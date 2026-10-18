# Google signup activation

The app supports Continue with Google on both sign-in and signup screens, alongside GitHub. It reads Supabase public Auth settings and displays Google only when that provider is enabled. OAuth returns to the current application origin; production uses https://vialock.vercel.app/. Existing email login and database authorization are unchanged.

## Activation status (October 18, 2026)

App implementation is ready for deployment. Google authentication is not activated: Google Cloud Console returned Site Unavailable in this browser, including one reload. No suitable connected OAuth administration plugin was found. A Google OAuth web client must be registered before the Supabase provider can be enabled.

## Exact provider setup

1. In the owner's Google Cloud project, configure Google Auth Platform with application name Via Lock, a monitored support/contact email, External audience, and Production publishing status so signup is not restricted to test users. Follow any Google consent or verification requirements.
2. Request only openid, userinfo.email and userinfo.profile. No Gmail, Drive, contacts, or offline access is needed.
3. Create an OAuth client of type Web application. Set Authorized JavaScript origin to https://vialock.vercel.app and the exact Authorized redirect URI to https://tdcqglxcmilnvyytlfqk.supabase.co/auth/v1/callback.
4. Enter the client ID and client secret directly in Supabase project tdcqglxcmilnvyytlfqk > Authentication > Sign In / Providers > Google. Enable Google and save. Keep nonce checking enabled and users without email disallowed. Do not put the secret in chat, source, frontend variables, or public files.
5. Refresh the app; Continue with Google appears automatically. Test the complete login round trip, verified email, new-organization onboarding, invitation acceptance, and same-email account linking.

## Verification

Seven local smoke/guard tests and the production build passed. Actual Google OAuth login and first-time Google registration remain unverified until the client exists and the provider is enabled. GitHub signup remains available.

Official instructions: https://supabase.com/docs/guides/auth/social-login/auth-google
