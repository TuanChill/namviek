# NamViek Web App

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/<your-org>/<your-repo>/tree/main/apps/web)

This is the frontend application for NamViek, built with React + TypeScript + Vite.

## Development

From repo root:

```bash
pnpm --filter web dev
```

Default dev URL:

- http://localhost:2001

## Build

From repo root:

```bash
pnpm --filter web build
```

Build output:

- `apps/web/dist`

## Deploy to Cloudflare Pages

Manual deploy with Wrangler:

```bash
npx wrangler pages deploy apps/web/dist --project-name=<your-pages-project>
```

For automated deployment, use:

- `.github/workflows/deploy-web-cloudflare.yml`

For complete setup details (token, account ID, GitHub secrets), see:

- `docs/cloudflare-frontend-deploy.md`
