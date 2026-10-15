# Via Lock production recovery

**Do not deploy this branch or `main` to production yet.** The current GitHub source is older than the live Vercel deployment and lacks production features. The deployed Vercel project is `fieldops-dispatch` (`prj_R1kh3VQyQWwUpmLm2hjw6T5yoMcp`) at https://vialock.vercel.app. Production deployment inspected: `dpl_CmYDigXth7i12mHwfeuNA4fD6PZc`.

## Production file inventory

Vercel deployment source root is `src/` with `index.html`, `package.json`, `package-lock.json`, `vercel.json`, `public/via-lock-logo.webp`, and `src/{App.jsx,Icon.jsx,Inventory.jsx,Organization.jsx,Schedule.jsx,WorkOrder.jsx,main.jsx,organization.css,style.css,supabase.js}`. In particular, `Organization.jsx` and the Via Lock logo exist in the deployed source but may be missing from GitHub.

## Recovery checklist

- [ ] Recover full contents and binary assets from a trusted production source or backup; Vercel file-content connector currently truncates large responses.
- [ ] Diff against GitHub without removing any production-only files or functionality.
- [ ] Verify Supabase publishable key only is included in browser code; never commit secrets.
- [ ] Test sign-in, organization creation and invites, role restrictions, scheduling, work orders, parts transactions, photos/signatures, and mobile workflows.
- [ ] Test cross-organization isolation and concurrent scheduling updates.
- [ ] Build and test a preview deployment; promote only after passing tests.
- [ ] Keep messaging out of scope per product owner's request.

## Database work already verified

The `jobs_active_technician_schedule_idx` partial index exists on `(organization_id, assigned_to, scheduled_at)` for scheduled active assignments. A previous migration corrected work-order evidence organization matching. Neither change replaces application-level scheduling conflict checks.
