# Supabase Admin Setup

## Goal

Enable the restaurant owner to edit the public QR menu from `/admin`.

The public menu keeps working with the local MVP seed when Supabase is not configured. Once Supabase variables are present, the public menu reads live branch, category, product, and image data.

## Current Repo Setup

The repository has real Supabase setup files:

```text
supabase/config.toml
supabase/migrations/202607220001_admin_menu_schema.sql
supabase/seed.sql
scripts/create-supabase-admin.mjs
```

What they do:

- Create branch, category, product, and menu photo tables.
- Create the public `menu-assets` storage bucket.
- Allow public read access for the QR menu.
- Allow only authenticated users to create/update/delete menu data and upload images.
- Seed the Brasas & Sazon MVP menu data.

## Environment Variables

Create these variables locally and in Netlify:

```text
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=ey...
VITE_BRANCH_ID=brasas-sazon
VITE_MENU_STORAGE_BUCKET=menu-assets
```

## CLI Setup Flow

After Supabase access is available:

```powershell
$env:SUPABASE_ACCESS_TOKEN="paste-token-here"
npx.cmd supabase orgs list
npx.cmd supabase projects create cartamago-brasas-sazon --org-id "<org-id>" --db-password "<strong-db-password>" --region sa-east-1 --size nano
npx.cmd supabase link --project-ref "<project-ref>" --password "<strong-db-password>"
npx.cmd supabase db push --linked --include-seed --password "<strong-db-password>"
npx.cmd supabase projects api-keys --project-ref "<project-ref>" --output json
```

Use the API keys output to set Netlify variables:

```powershell
npx.cmd netlify env:set VITE_SUPABASE_URL "https://<project-ref>.supabase.co" --context production
npx.cmd netlify env:set VITE_SUPABASE_ANON_KEY "<anon-key>" --context production --secret
npx.cmd netlify env:set VITE_BRANCH_ID "brasas-sazon" --context production
npx.cmd netlify env:set VITE_MENU_STORAGE_BUCKET "menu-assets" --context production
npm.cmd run build
npx.cmd netlify deploy --prod --dir=dist
```

## Manual Dashboard Alternative

If CLI project creation is blocked, create the project in Supabase Dashboard, then run these files in SQL Editor:

```text
supabase/migrations/202607220001_admin_menu_schema.sql
supabase/seed.sql
```

The migration also creates the `menu-assets` bucket and upload policies.

## Auth

Create an owner user manually in Supabase:

```text
Authentication -> Users -> Add user
```

Use that email/password on:

```text
/admin
```

Or create it from the terminal after retrieving the service role key:

```powershell
$env:SUPABASE_URL="https://<project-ref>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
$env:ADMIN_EMAIL="owner@example.com"
$env:ADMIN_PASSWORD="<temporary-strong-password>"
npm.cmd run supabase:create-admin
```

Do not put the service role key or admin password in source files.

## Security For MVP

This first admin assumes a single trusted owner. The migration includes public read and authenticated write policies so the QR can read menu data while the owner must log in to edit.

Minimum next security slice before multi-restaurant sales:

- Use `branch_members` for owner access.
- Restrict authenticated writes by owner/branch membership.
- Add audit fields for who changed a product.
- Add image moderation and size optimization before upload.
