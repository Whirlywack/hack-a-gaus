# Next.js and Supabase, hosted on Vercel and Supabase in Frankfurt

The app is Next.js 16.4 on Vercel with functions in Frankfurt, and Supabase (Postgres 17, Auth, row-level security) in a Frankfurt project. This is the stack the old gaus repo used, so its workspace tables and access rules port across, and both halves keep data in the EU.

## Deliberate limits

- **Styling is plain CSS.** The design system's stylesheets are carried over as they are. There is no Tailwind and no styled component kit, because the visual system is rules and tokens and forbids the look those kits bring.
- **Base UI 1.9 (unstyled) is used for two parts only:** the bottom sheet and the 6-digit code field.
- **Sign-in mail goes through Resend, not Supabase's built-in sender.** The built-in sender allows 2 e-mails an hour and only to the project's own team, so nobody outside it could sign in.
