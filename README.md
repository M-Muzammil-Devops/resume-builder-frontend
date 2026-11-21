# Resume Builder – Frontend

Web app for the Resume Builder: landing pages, resume and cover-letter editor, job tracker, user area (`/user`) and admin console (`/admin`).

## Stack

| Item | Version (from `package.json`) |
| --- | --- |
| Next.js (App Router) | 16.3.0 |
| React / React DOM | 19.2.8 |
| TypeScript | ^5 |
| Tailwind CSS | ^4 (`@tailwindcss/postcss`) |
| State | zustand ^5.0.3 |
| Drag and drop | @dnd-kit/core ^6.3.1, @dnd-kit/sortable ^10.0.0 |
| Animation / 3D | gsap ^3.15.1, lenis ^1.3.27, three ^0.187.0 |
| DOCX export | docx ^9.16.0 |
| Icons | lucide-react ^0.484.0 |
| Lint | eslint ^9, eslint-config-next 16.3.0 |

## Port and health check

- **Port:** `3000` (set in the `dev` and `start` scripts; production binds to `0.0.0.0`).
- **Health check:** the frontend has no dedicated health route. Check it through the proxy, which returns the backend health:

```bash
curl http://localhost:3000/rb-api/health
# {"ok":true}
```

  A `200` on `http://localhost:3000/` also confirms the Next server is up.

## Prerequisites

- Node.js 20 or newer (the Dockerfile uses `node:20-bookworm-slim`).
- npm.
- The backend running on port 4000 (see `resume-builder-backend`). The backend needs PostgreSQL and Redis, which the project's `docker-compose.yml` provides as Docker containers.

## Environment setup

Copy the example file and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | API base URL used by the browser code (`src/lib/api.ts`; falls back to `http://127.0.0.1:4000`). |
| `API_INTERNAL_URL` | URL the Next server uses to reach the API for `/rb-api/*` (falls back to `http://127.0.0.1:4000`). |

Never commit `.env` or `.env.local`.

## Install, run and build

```bash
npm install          # install dependencies
npm run dev          # development server on :3000
npm run build        # production build
npm run start        # production server: next start --port 3000 --hostname 0.0.0.0
npm run lint         # eslint
```

Production start used on the Windows host (after `npm run build`):

```bat
node node_modules\next\dist\bin\next start --port 3000 --hostname 0.0.0.0
```

## How the frontend talks to the backend

The browser calls `/rb-api/*` on the same origin. The route handler `src/app/rb-api/[...path]/route.ts` forwards each request to the backend at `API_INTERNAL_URL` (default `http://127.0.0.1:4000`). This keeps one public origin, so a single tunnel or domain on port 3000 is enough.

```
Browser -> :3000 /rb-api/*  ->  Next route handler  ->  backend :4000
```

Other behaviour:

- `src/proxy.ts` sets a per-request nonce Content-Security-Policy and redirects `/admin` pages without the admin session cookie to the admin sign-in.
- `next.config.ts` adds security headers (nosniff, frame deny, referrer policy, HSTS) and redirects old paths (for example `/dashboard`) to `/user/...`.

## Folder structure

```
frontend/
├── public/            static assets
├── scripts/           helper scripts
├── src/
│   ├── app/           routes: admin, user, login, register, print, r, rb-api, ...
│   ├── components/    admin, auth, editor, landing, resume
│   ├── hooks/
│   ├── lib/           API clients and utilities
│   ├── shared/
│   ├── store/         zustand stores
│   └── proxy.ts       CSP nonce and admin guard
├── next.config.ts
├── Dockerfile
└── package.json
```