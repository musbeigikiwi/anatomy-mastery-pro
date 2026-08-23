# Security deployment guide

The repository contains a premium identity UI plus a Supabase-ready authorization foundation.

## Activation
1. Create a Supabase project and run `supabase/schema.sql` in the SQL editor.
2. Copy `config.example.js` to `config.js` and insert only the public project URL and anon key.
3. Enable email confirmation and Google OAuth in Supabase Auth.
4. Add the GitHub Pages URL to Auth redirect URLs.
5. Create the first admin manually in the SQL editor, then require MFA for all admin operations.
6. Implement IP/VPN/Tor scoring in an Edge Function. Do not call risk vendors directly from browser code.

## Non-negotiable controls
- Never commit a service-role key, OAuth secret or risk-provider key.
- Never log passwords, access tokens, refresh tokens, MFA factors or cookies.
- Enforce admin access server-side with RLS and Edge Functions.
- Hash/truncate IP and device identifiers; set a retention period.
- Re-authenticate administrators before approve, suspend, delete or role changes.
- Rate-limit sign-in, registration, recovery and verification endpoints.

GitHub Pages is public static hosting. For genuinely private study content, move protected content behind an authenticated API or server-rendered application.
