# Public MVP Preview

## Production URL

```text
https://brasas-sazon-menu.netlify.app
```

This is the stable white-label Netlify production URL for sharing the Brasas & Sazon MVP.

## Production QR

Current production QR image:

```text
public/client-assets/brasas-sazon/processed/qr-netlify-production.png
```

White-label QR copy:

```text
public/client-assets/brasas-sazon/processed/qr-brasas-sazon-menu.png
```

Both QR images currently point to:

```text
https://brasas-sazon-menu.netlify.app/
```

## Netlify Site

```text
Site name: brasas-sazon-menu
Site ID: 9e353182-9c1f-4066-940f-010ccfc0dc79
Admin URL: https://app.netlify.com/projects/brasas-sazon-menu
```

## Temporary Tunnel Reference

Previous temporary Cloudflare URL:

```text
https://returned-casino-dream-velvet.trycloudflare.com
```

Local production preview used for the temporary tunnel:

```text
http://127.0.0.1:4174
```

Tunnel command:

```powershell
cloudflared tunnel --url http://127.0.0.1:4174
```

## Important Notes

- Use the Netlify URL and QR for sharing.
- The Cloudflare tunnel was only useful for temporary validation.
- Future changes need a new Netlify deploy.
- When the app depends on Netlify environment variables, build with production context before deploying:

```powershell
npx.cmd netlify build --context production
npx.cmd netlify deploy --prod --dir=dist --no-build
```

This prevents Vite from producing a bundle without `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY`.

## Validation

The Netlify production URL returned HTTP `200` and served the white-label Brasas & Sazon app.
