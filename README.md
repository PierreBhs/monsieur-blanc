# Mr. White

A simple offline-first web version of Mr. White. One host adds the players, starts a round, and passes the device so each player can privately reveal their role.

## Run locally

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
```

## Deploy on Cloudflare Pages

- Build command: `npm run build`
- Output directory: `dist`
- Framework preset: Vite

Full Git and Cloudflare setup instructions are in `DEPLOYMENT.md`.

The first version is static and does not need a Worker or database. Future online rooms or Discord/WhatsApp delivery can reuse the pure game logic in `src/game`.
