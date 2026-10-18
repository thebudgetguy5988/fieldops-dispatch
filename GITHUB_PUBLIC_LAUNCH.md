# Via Lock public signup through GitHub

This prepared change adds a GitHub sign-in option to the existing Supabase application. It uses the public Auth settings endpoint to display the option only after the GitHub provider is enabled. New-account signup then uses GitHub; existing email/password sign-in and recovery remain available.

## Provider configuration prepared

- Application name: Via Lock
- Homepage: https://vialock.vercel.app/
- Exact callback: https://tdcqglxcmilnvyytlfqk.supabase.co/auth/v1/callback
- Requested scope: user:email
- Device flow: disabled
- Wildcard callbacks: disabled

The GitHub app registration form is filled but has NOT been submitted. Automatic approval review rejected registration because creating a new public authentication integration requires specific user approval. No OAuth client secret has been generated or exposed.

## Remaining activation

1. Obtain the required approval to register the GitHub app and connect its application credentials to Supabase.
2. Register the OAuth app, configure its client ID and secret in Supabase GitHub provider settings, and enable that provider. Keep the secret out of the repository and frontend.
3. Verify the existing callback allowlist and perform a real browser OAuth sign-in.
4. Verify email confirmation, organization creation, employee invitation acceptance, and existing-account linking after OAuth.
5. Publish the tested commit to main.

Email confirmation and existing database authorization remain enabled. No account is auto-confirmed or granted a role from editable user metadata. GitHub login does not configure general transactional email or enable Supabase's paid leaked-password setting.
