# CartaMago

CartaMago is a lightweight QR menu and WhatsApp ordering app for restaurants and local food sellers.

First demo vertical:

```text
Asadero de pollos
```

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- WhatsApp `wa.me` order handoff
- Netlify static hosting

## Local Commands

Use Windows PowerShell from `D:\Github\CartaMago`:

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run build
```

## Demo Flow

1. Customer opens the QR menu.
2. Customer browses categories and adds items.
3. Customer chooses pickup, delivery, or table.
4. Customer sends the prefilled WhatsApp order.
5. Restaurant confirms availability and time in WhatsApp.

## Configure The Demo

Edit restaurant and menu data in:

```text
src/data/demoMenu.ts
```

Before showing a real client, replace:

```text
whatsappNumber: '573001112233'
```

with the restaurant's real WhatsApp number in international format.

## Netlify

The project includes `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"
```

After deploy, generate a QR that points to the production URL.
