```
npm install
npm run dev
```

`npm run dev` uses the local Node backend. Keep `DEV_MODE=true` in `.env` for that mode, and use `pnpm --filter api dev:worker` or `pnpm --filter api deploy` for the Cloudflare Worker path.

```
open http://localhost:3000
```
