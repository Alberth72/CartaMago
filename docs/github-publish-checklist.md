# GitHub Publish Checklist

## Goal

Prepare CartaMago for the first GitHub push without leaking local secrets or committing generated folders.

## Before Creating The Repo

Run:

```powershell
npm.cmd run lint
npm.cmd run build
git status --short
```

Confirm these are not staged:

```text
.env.local
.admin-credentials.local
node_modules/
dist/
.netlify/
public/client-assets/*/raw/
*.log
```

These are expected to be committed:

```text
src/
docs/
public/client-assets/brasas-sazon/processed/
supabase/migrations/
supabase/seed.sql
.env.example
netlify.toml
package.json
package-lock.json
```

Raw client photos are kept local and ignored:

```text
public/client-assets/brasas-sazon/raw/
```

They are useful for local traceability, but they are heavier and client-specific. Commit processed assets instead.

## Create The Remote

Create an empty GitHub repository without adding a remote README, license, or `.gitignore`.

Then run:

```powershell
git remote add origin https://github.com/<owner>/<repo>.git
git add .
git commit -m "Initial CartaMago MVP"
git branch -M main
git push -u origin main
```

## After Push

Check GitHub for:

- No `.env.local`.
- No `.admin-credentials.local`.
- Docs render correctly.
- Mermaid diagrams render in `docs/diagrams.md`.
- `README.md` explains local setup and first push.

## Deployment Reminder

Netlify needs these environment variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_RESTAURANT_ID
VITE_MENU_STORAGE_BUCKET
```

The public QR should point to:

```text
https://brasas-sazon-menu.netlify.app
```
