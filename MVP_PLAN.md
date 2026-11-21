# Resume Builder — Full MVP Plan

> Same plan lives in `frontend/MVP_PLAN.md` and `backend/MVP_PLAN.md`.  
> Apps talk over HTTP: Frontend → `NEXT_PUBLIC_API_URL` → Backend.

---

## 1. Product goal

Build an ATS-friendly resume builder (Enhancv / resume.io style) for:

- DevOps, Cloud, SRE, Platform (priority)
- Other departments via 100+ templates
- LinkedIn / Indeed / Glassdoor style ATS keyword matching
- Jobs search, Job Tracker, Auto Apply (safe demo)
- Auto cover letter when resume is completed

---

## 2. Architecture

```
Browser (Next.js frontend :3000)
        │  REST + JWT
        ▼
Fastify API (backend :4000)
        │
        ├── PostgreSQL (Prisma)
        ├── Gemini AI (optional; mock fallback)
        └── Puppeteer PDF export
```

| Piece | Tech |
|--------|------|
| Frontend | Next.js 16 (App Router), Tailwind, Zustand, dnd-kit |
| Backend | Node.js, Fastify, Prisma, JWT, Gemini |
| DB | PostgreSQL 16 |
| Containers | `frontend/Dockerfile`, `backend/Dockerfile`, root `docker-compose.yml` |

**Folders**

```
frontend/     # UI only — own package.json, node_modules, Dockerfile
backend/      # API only — own package.json, node_modules, Dockerfile, prisma
```

Shared types/templates are **copied** into each app:

- `frontend/src/shared/`
- `backend/src/shared/`

---

## 3. MVP feature checklist (everything)

### A. Auth & documents
- [x] Register / Login (JWT)
- [x] Demo user (`demo@resume.local` / `demo1234`)
- [x] Dashboard — list resumes + cover letters
- [x] Create / open / autosave resume
- [x] Guest local editor (`/editor/local-demo`)

### B. Resume editor (WYSIWYG)
- [x] DevOps **High Performer** two-column sample
- [x] Inline edit (contentEditable)
- [x] Click section → **+ Add item** / **+ Add section**
- [x] Add section modal (Languages, Strengths, Certifications, Awards, …)
- [x] Header, Summary, Experience, Skills, Projects, Achievements, Certs, Education

### C. Top toolbar
- [x] **Improve Text** — language, tailored toggle, spellcheck / wording / recommendations
- [x] **ATS Check & Tailor** — paste JD → score + missing keywords + suggestions
- [x] **Rearrange** — drag & drop section boxes (header locked)
- [x] **Templates** — 100+ presets; click → same data, new layout/colors/fonts
- [x] **Design & Font** — margins, spacing, colors, font list, size, line height, columns, backgrounds, branding, signature UI

### D. AI (Gemini)
- [x] `POST /ai/improve`
- [x] `POST /ai/ats-check`
- [x] `POST /ai/cover-letter`
- [x] `POST /ai/tailor`
- [x] Mock fallback if `GEMINI_API_KEY` missing

### E. Jobs suite
- [x] Jobs search + detail + Tailor / Auto Apply / Apply
- [x] Job Tracker Kanban (Recommended → Shortlist → Auto Apply → Applied → Interview)
- [x] Auto Apply config + credits (demo queue, no real LinkedIn/Indeed bots)

### F. Export & complete
- [x] Mark complete → auto cover letter
- [x] PDF / HTML export endpoint
- [x] Document size A4 / US Letter (design)

### G. Infra
- [x] Independent frontend & backend installs
- [x] Dockerfiles for both
- [x] docker-compose: postgres + backend + frontend
- [x] Seed: templates, jobs, demo user, sample DevOps resume

---

## 4. Frontend map (`frontend/`)

| Path | Role |
|------|------|
| `src/app/page.tsx` | Landing |
| `src/app/login`, `register` | Auth |
| `src/app/dashboard` | Documents |
| `src/app/editor/[id]` | Builder |
| `src/app/jobs`, `tracker`, `auto-apply` | Jobs suite |
| `src/components/editor/*` | Improve, ATS, Rearrange, Templates, Design, AddSection |
| `src/components/resume/*` | Canvas + editable text |
| `src/store/editorStore.ts` | Live resume state |
| `src/lib/api.ts` | API client + JWT |
| `src/shared/*` | Types, sample resume, templates list |
| `.env.local` | `NEXT_PUBLIC_API_URL=http://localhost:4000` |
| `Dockerfile` | Production image |

**Routes**

- `/` `/login` `/register` `/dashboard`
- `/editor/[id]` `/editor/local-demo`
- `/jobs` `/jobs/tracker` `/jobs/auto-apply`

---

## 5. Backend map (`backend/`)

| Path | Role |
|------|------|
| `src/index.ts` | Fastify app, CORS, JWT |
| `src/routes/auth.ts` | register, login, me, demo |
| `src/routes/resumes.ts` | CRUD + complete → cover letter |
| `src/routes/ai.ts` | improve, ats, cover-letter, tailor |
| `src/routes/templates.ts` | list templates |
| `src/routes/jobs.ts` | jobs, tracker, auto-apply |
| `src/routes/export.ts` | HTML / PDF |
| `src/ai/gemini.ts` | Gemini + mock |
| `src/shared/*` | Same domain types as frontend |
| `prisma/schema.prisma` | User, Resume, CoverLetter, Template, Job, … |
| `prisma/seed.ts` | 100+ templates, jobs, demo user |
| `.env` | DB, JWT, Gemini |
| `Dockerfile` | Production image |

**API surface**

```
GET  /health
POST /auth/register | /auth/login | /auth/demo
GET  /auth/me
GET|POST|PUT|DELETE /resumes[/:id]
POST /resumes/:id/complete
GET  /templates
POST /ai/improve | /ai/ats-check | /ai/cover-letter | /ai/tailor
GET  /jobs | /jobs/:id
GET|POST|PATCH /tracker[/:id]
GET|PUT /auto-apply
POST /auto-apply/run
GET  /cover-letters
POST /export
```

---

## 6. Data model (Prisma)

- **User** — email, passwordHash, name, title  
- **Resume** — title, templateId, layoutKey, content JSON, design JSON, isComplete  
- **CoverLetter** — linked to resume  
- **Template** — department, layoutKey, accent, font, premium flag  
- **Job** — title, company, location, description, filters  
- **JobApplication** — stage (tracker)  
- **AutoApplyConfig** / **AutoApplyCredit** — preferences + daily credits  

Resume `content` + `design` as JSON → template switch never loses data.

---

## 7. Communication contract

1. Frontend stores JWT in `localStorage` (`rb_token`).
2. Every protected call: `Authorization: Bearer <token>`.
3. Base URL: `process.env.NEXT_PUBLIC_API_URL`.
4. CORS: backend `CORS_ORIGIN=http://localhost:3000`.
5. Docker: compose publishes `:3000` and `:4000`; browser still calls `localhost:4000`.

---

## 8. Runbook

### Docker (all)
```bash
cp backend/.env.example backend/.env
docker compose up --build -d
```

### Local
```bash
docker compose up -d postgres

cd backend
cp .env.example .env
npm install
npm run prisma:migrate
npm run prisma:seed
npm run dev          # :4000

cd frontend
cp .env.example .env.local
npm install
npm run dev          # :3000
```

### Gemini key
```env
# backend/.env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.0-flash
```
Create at: https://aistudio.google.com/ → Get API key.

---

## 9. Out of scope (MVP)

- Real browser auto-submit to LinkedIn / Indeed / Glassdoor (ToS)
- Stripe / real payments (Upgrade UI only)
- 100 unique pixel-perfect layout engines (100+ selectable presets + ~12 layout keys)
- Mobile native apps

---

## 10. Success criteria

- Edit DevOps resume; switch template without data loss  
- Design / Font / Rearrange work live  
- Improve Text + ATS return Gemini or mock  
- Jobs / Tracker / Auto Apply work with seed data  
- Complete resume → cover letter saved  
- `docker compose up --build -d` runs the stack  

---

## 11. Demo credentials

| Field | Value |
|--------|--------|
| Email | `demo@resume.local` |
| Password | `demo1234` |
| Sample | Devops-Resume (High Performer) |

---

*MVP Plan — keep this file identical in frontend/ and backend/.*
