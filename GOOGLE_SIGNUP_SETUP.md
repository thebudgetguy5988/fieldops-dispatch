# Google signup activation

The app supports Continue with Google on both sign-in and signup screens, alongside GitHub. It reads Supabase public Auth settings and displays Google only when that provider is enabled. OAuth returns to the current application origin; production uses https://vialock.vercel.app/. Existing email login and database authorization are unchanged.

## Activation status (October 18, 2026)

Application support is deployed at commit 062d5be. The owner registered the Google OAuth web client, and its client ID and secret were saved in the Supabase Google provider configuration. Google is enabled, confirmed by the public Auth settings endpoint. The live app displays Continue with Google alongside GitHub. The secret is not stored in the repository or frontend.

Google Cloud Console remained unavailable in the agent browser; the owner completed client registration separately. The Google audience publishing state has not been independently inspected.

## Exact provider setup

1. In the owner's Google Cloud project, configure Google Auth Platform with application name Via Lock, a monitored support/contact email, External audience, and Production publishing status so signup is not restricted to test users. Follow any Google consent or verification requirements.
2. Request only openid, userinfo.email and userinfo.profile. No Gmail, Drive, contacts, or offline access is needed.
3. Create an OAuth client of type Web application. Set Authorized JavaScript origin to https://vialock.vercel.app and the exact Authorized redirect URI to https://tdcqglxcmilnvyytlfqk.supabase.co/auth/v1/callback.
4. Enter the client ID and client secret directly in Supabase project tdcqglxcmilnvyytlfqk > Authentication > Sign In / Providers > Google. Enable Google and save. Keep nonce checking enabled and users without email disallowed. Do not put the secret in chat, source, frontend variables, or public files.
5. Refresh the app; Continue with Google appears automatically. Test the complete login round trip, verified email, new-organization onboarding, invitation acceptance, and same-email account linking.

## Verification

Seven local smoke/guard tests, SDK OAuth redirect checks, the production build and CI passed. The live Google button successfully reaches Google account selection with the registered client ID and expected callback. The owner selected the existing Google account through secure browser authentication. Google then required passkey verification; the complete token exchange, return to Via Lock, account linking and first-time Google registration remain pending that identity check. GitHub signup remains enabled.

Public client ID: 563071721965-3tjf728ubub948oqa1qtcct310sb4cm1.apps.googleusercontent.com

Official instructions: https://supabase.com/docs/guides/auth/social-login/auth-google
