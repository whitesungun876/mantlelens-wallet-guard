# P1 Day 8 React Vite Structure

## Status

P1 Day 8 is implemented.

## Structure

The formal frontend now lives in `frontend/app`.

| Path | Purpose |
|---|---|
| `frontend/app/package.json` | React/Vite scripts and dependencies |
| `frontend/app/vite.config.ts` | Vite config |
| `frontend/app/src/api.ts` | HTTP API client |
| `frontend/app/src/types.ts` | Shared response types |
| `frontend/app/src/App.tsx` | Workspace application |
| `frontend/app/src/styles.css` | App styling |
| `scripts/run_app.sh` | Builds and serves the formal app on `127.0.0.1:5173` |

## Acceptance

Build passed:

```text
npm run build
vite v8.0.16 building client environment for production
✓ built
```

App startup passed:

```text
MantleLens React app is running at http://127.0.0.1:5173
```
