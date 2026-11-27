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
## Landing templates: adding or changing one

The landing gallery and the editor's template picker show a thumbnail per template. Each
thumbnail is a screenshot of the **real** `ResumeCanvas` render of that template's starter resume,
so what a user picks is exactly what they get in the editor, preview, PDF and share link.

Where things live:

- `src/lib/landingTemplates.ts`: the card (`id`, name, `image: /templates/<id>.webp`, `layoutKey`,
  `templateId: tmpl-landing-<id>`).
- `src/shared/templateStarter.ts` ? `LANDING_PRESETS[<id>]`: the design. Use the reusable options
  rather than one-off CSS: `sectionHeadingStyle` (`underline`, `icon-line`, `numbered`, `banner`,
  `centered-rule`, `ruled-center`), `entryLayout` (`side-meta`, `stacked`, `date-left`),
  `listColumns` (1–4 column bullet grid for skills/languages/certificates/interests),
  `contactLayout` (`row`, `grid`), `titlePlacement`, `photoPosition`, `headerSettings`,
  `skillsLayout`, `hideSkillGroups`, `hideLanguageBars`, `hideLanguageLevel`,
  `hideCertificationDetails`, `hideLogos`, `hideExperienceDescription`, `sectionTitles`.
  The columns (`leftColumnIds` / `rightColumnIds`) are also the starter's section list: sections
  not in a column are left out of a new resume.
- `src/shared/templateContent.ts` ? `TEMPLATE_SAMPLES[<id>]`: the starter text. Keep it to the
  page count in `EXPECTED_PAGES` (`src/lib/templateFingerprint.ts`, default 1 page).
- Mirror both shared files into `resume-builder-backend/src/shared/`.

Steps:

1. Add the card, the preset and the sample (same `id` everywhere).
2. Start the frontend (`npm run build && npm run start`, or `npm run dev`).
3. `npm run templates:thumbs` (or `npm run templates:thumbs -- <id>`). It opens
   `/template-preview/<id>`, writes `public/templates/<id>.webp|png` and updates
   `public/templates/manifest.json` (fingerprint + printed page count). It also writes the small
   carousel copies `public/templates/thumbs/<id>-560.webp` and `<id>-280.webp`.
4. Rebuild / redeploy the frontend (Next serves `public/` from the build).
5. `npm test` in the backend runs `src/lib/templateThumbs.test.ts`. It fails when a landing
   template has no real-render thumbnail, when its preset or starter text changed after the
   thumbnail was made, or when the starter prints on more pages than expected.

If you change how the canvas draws templates (CSS or markup), bump `RENDER_VERSION` in
`src/lib/templateFingerprint.ts` and rerun step 3.


## Tools: Audio Noise Remover

| Route | What |
|---|---|
| `/tools/audio-noise-remover` | Tool page, "Remove noise" mode |
| `/tools/ai-voice-cleaner` | **Retired.** Permanent redirect (308) to `/tools/audio-noise-remover` (`next.config.ts`) |

- **Header menu:** `src/components/nav/ToolsMenu.tsx`. Add new tools to `src/components/nav/tools.ts`; the landing nav, the tool pages and the mobile menus all read from it. The app sidebar has a **Tools** link too.
- **Page:** `src/components/tools/audio/` (`AudioToolPage`, `AudioCleaner`, `Waveform`, one CSS module). API client: `src/lib/audioApi.ts`.
- **Modes:** a 2-way selector — **Remove noise** and **All voices** (`conversation`: meetings and rooms with several or far-away talkers; gentle 8–12 dB, nothing gated). Under the strength slider a hint shows the cap, e.g. "noise down up to 15 dB" (`maxReductionDb()` in `src/lib/audioLimits.ts`, same table as the backend README).
- **One file at a time:** if an upload gets **409** (the user's earlier file is still processing, e.g. started in another tab), the panel says "Your earlier file is still processing", follows that job's progress, and offers **Cancel it & upload new file** (DELETE, then the picked file uploads) or **Cancel earlier file**. On page load the tool also asks `GET /audio/jobs/active`, so a job started elsewhere is shown and can be canceled.
- **Flow:** upload with progress → queued → steps → Before/After players with an A/B toggle → download. Logged-out users are sent to `/login?next=/tools/...`.
- **Drop zone:** a click anywhere in the upload box (icon, text, empty space) opens the file picker; "browse files" is plain text inside it, so there is one handler and no double open. The inner part is a `role="button"` with a tab stop: **Enter/Space** opens the picker and the whole zone gets a focus ring (`.drop:has(.pick:focus-visible)`). Drag and drop still works. Elements marked `data-no-pick` (the remove ✕ button, the login links, the hidden input) never open it (`shouldOpenPicker()` in `src/lib/playbackSpeed.ts`).
- **Playback speed:** the result player and the Example card have a compact **Speed** pill: 0.75×, 1×, 1.25×, 1.5×, 2× (default 1×). One speed covers Before and After, so it carries over A/B switches and changes live while playing. `applySpeed()` sets `playbackRate`, `defaultPlaybackRate` (kept after a new `src`) and `preservesPitch` with the `webkitPreservesPitch` / `mozPreservesPitch` fallbacks, so voices keep their pitch. Keyboard: Tab to the current speed, ←/→ (↑/↓, Home/End) to change. Component: `SpeedControl.tsx`, CSS module only (no inline styles). Tests: `src/lib/playbackSpeed.test.ts`.
- **Example (Before/After):** the empty result panel plays a 10 s demo (`public/tools/demo/before|after.webm`, MP3 fallback, ~60–75 KB each, `preload="none"`). One clip plays at a time and switching keeps the position. It hides once a job starts. Peaks: `demoPeaks.ts`.
- **Hero:** centered 1180 px container aligned with the header (two columns, 20 px gap). The badges sit beside the character on wide screens and in a row under him below 1100 px, so they never cover him.
- **Limits:** up to 100 MB · 20 min (`src/lib/audioLimits.ts`; the page reads the real values from `/audio/capabilities`). Long files show chunk progress from `chunks.done/total`: the step text reads "Denoising · Part 3 of 19" and the hint "Part 3 of 19 · ~40s left" (`progressHint()`).
- **Hourly limit:** 10 finished files per hour per user (admin / owner accounts are not limited; canceled or failed files don't count). When it's reached, the panel shows the API's wait time, e.g. "Try again in ~12 min".
- **Layout:** the two tool columns never overlap. Long file names end with "…", mode buttons wrap to two lines, and the sticky header turns solid when you scroll. Checked at 100% and 110% zoom from 375 to 1920 px.
- **Performance:** the waveform is drawn on a canvas from server-computed peaks (no audio decoding in the browser). The strength slider is sent as a whole number 0-100 (the API rejects anything else with 400). Previews stream straight from short-lived **signed links** (`previews` in the job, 5 min) with `preload="metadata"`: no blob download, nothing re-fetched on each play (the browser uses Range requests and the private cache). Pause and Cancel stay clickable while a track loads. When a link is about to expire or fails, the player gets a fresh one and resumes at the same position. Previews are mono MP3, 48 kbps, never bigger than the source. The character art is one 65 KB WebP.
- **CSP:** `media-src 'self' blob:` added for the players. The page uses no inline styles.
- **Uploads:** `next.config.ts` sets `experimental.proxyClientMaxBodySize = "110mb"`. The `/rb-api` proxy allows **60 minutes** for `POST /audio/*` (env `AUDIO_UPLOAD_TIMEOUT_MS`, minimum 60 s). Node's own 5-minute `requestTimeout` would cut a slow 100 MB upload, so production starts with `node --require ./server-timeouts.cjs node_modules/next/dist/bin/next start ...`; the preload sets `requestTimeout` to the upload timeout + 60 s (tested in `src/lib/serverTimeouts.test.ts`).
- **Note:** Cloudflare quick tunnels cap request bodies at about 100 MB, so a file right at 100 MB may be refused at the edge (413) before it reaches the app.

Backend details (engine, endpoints, limits, setup): `resume-builder-backend/README.md` → *Audio tool*.

> The **AI Voice Cleaner** is fully retired: its page, menu and sitemap entries, and the **Voice clean** mode button (voice EQ + −16 LUFS loudness) inside Remove Background Noise. The API treats an old `mode=voice` upload as plain noise removal.

## Tools hub & PDF tools (Coming soon)

| Route | What |
|---|---|
| `/tools` | Tools hub: the live audio tool, then every PDF group as a card grid with **Coming soon** badges |
| `/tools/pdf/<slug>` | Coming-soon page per PDF tool: icon, badge, **Notify me** button (UI only, nothing is stored or sent), related tools |

- **Data:** one list in `src/components/nav/tools.ts` → `PDF_EDITOR` + `PDF_TOOL_GROUPS` (25 slugs). Pages are static (`generateStaticParams`, `dynamicParams = false`), so an unknown slug is a 404.

  | Group | Tools |
  |---|---|
  | PDF Editor | `pdf-editor` |
  | Optimize PDF | `compress` · `repair` · `ocr` |
  | Convert to PDF | `jpg-to-pdf` · `word-to-pdf` · `powerpoint-to-pdf` · `excel-to-pdf` · `html-to-pdf` |
  | Convert from PDF | `pdf-to-jpg` · `pdf-to-word` · `pdf-to-powerpoint` · `pdf-to-excel` · `pdf-to-pdfa` |
  | Edit PDF | `rotate` · `page-numbers` · `watermark` · `crop` · `edit` · `forms` |
  | PDF Security | `unlock` · `protect` · `sign` · `redact` · `compare` |

- **Header menu:** the **Tools** dropdown has an *Audio* section and a *PDF tools · Coming soon* section (PDF Editor + one link per group to `/tools#<group>`), plus **Browse all tools**. Mobile menus get a **PDF Tools · Soon** entry from `TOOL_LINKS`.
- **Icons:** `src/components/nav/PdfIcon.tsx` (lucide). To launch a tool, build its page under `src/app/tools/pdf/` and drop the badge for that slug.

## Site pages: Privacy, Terms, Contact

| Route | What |
|---|---|
| `/privacy` | Privacy Policy: data collected, cookies (essential, preferences, analytics, marketing), audio deleted after 1 h, retention, account deletion, contact |
| `/terms` | Terms of Service: accounts, your content, acceptable use, tools/AI, plans, deletion, liability |
| `/contact` | Contact form (name, email, message) → `POST /rb-api/contact` → email to `ADMIN_EMAIL` |

- **Template:** Privacy and Terms carry a visible *"Template — pending owner review"* note. Review the text before launch.
- **Shared frame:** `src/components/site/SiteShell.tsx` (glass header with the Tools menu, centred 1180 px column, legal footer) + `pages.module.css`. Legal layout: `LegalPage.tsx` (sticky table of contents). CSS modules only, no inline styles (CSP).
- **Contact form:** `ContactForm.tsx`. Client checks first (name ≥ 2, valid email, message ≥ 10, max 5000), then shows the API's field errors. A hidden **honeypot** field (`website`) is sent with every request; the API drops bot submissions silently. **429** after 5 messages per hour per IP shows a friendly wait message.
- **Footer:** Privacy · Terms · Contact on the landing page, the audio tool and every page above.

## Cursor and text selection

- The sign-in / create-account slider panel used to set `cursor: pointer` and `user-select: none` on the whole half of the card, so the hand showed everywhere and text could not be selected. Now the panel has a normal cursor and selectable text; only its **Sign in / Sign up** button is a pointer and switches sides (touch swipe still works; a mouse drag selects text).
- The admin sign-in panel's `.ov.ovStatic` override never matched (CSS modules hash `.ov` per file). It is now `.ovStatic.ovStatic`.

## Removed: local editor & demo login

- The sign-in page no longer offers **Continue with demo account** or **Local editor**, and the sidebar's **Editor demo** link is gone. `src/lib/localDemo.ts` and every `local-demo` branch in the editor were deleted.
- Old links `/user/editor/local-demo` and `/editor/local-demo` redirect to `/user/dashboard`. The backend `POST /auth/demo` stays 404 unless explicitly enabled.

## Layout containers

All main pages use one centered content width aligned with the header: landing and tool pages 1180 px, user dashboard `max-w-[1180px] mx-auto`, admin pages `.admin-main > *` capped at 1180 px. Checked at 1920, 1536, 1440, 1280, 1160, 1024 and 375 px (no horizontal overflow, no overlaps). The editor layout is unchanged.

## Login redirects

Template picked before sign-in + free plan already full: `POST /resumes` answers **402**, and the dashboard shows "Free plan limit reached: “<template>” wasn't added to your resumes. Upgrade to Pro, or delete a resume to make room…" instead of opening silently (`continueAfterAuth.ts` → `takeAuthNotice()`). Other failures say the template couldn't open.

## Editor on phones

At ≤ 720 px the editor keeps the real A4 / Letter paper width inside `.editor-canvas-scale` and shrinks it with the zoom (45% at 375 px). A `width: 100%` there used to feed back through the resize observer until the page was a ~59 px sliver (BUG-1328).

`/login?next=...` is parsed by `parseLoginNext()` in `src/lib/loginNext.ts`. `next=template&tpl=<id>` opens the editor with that template; any other `next` must be a safe relative path (starts with one `/`, no `//`, no backslash, no scheme), otherwise the user goes to the dashboard. Every sign-in path uses it.

## Sign-in: Google, Facebook and magic code

`/login` and `/register` show **Continue with Google / Facebook / Email** under the form (`SsoButtons.tsx`; Email opens the magic-code panel). Buttons are only shown for providers that `GET /rb-api/auth/providers` reports as configured, so with no keys in the backend `.env` they stay hidden.

- **Google / Facebook**: the button is a plain link to `/rb-api/auth/oauth/<provider>/start?intent=login|signup`. The backend does the whole OAuth flow (PKCE, state + nonce) and comes back to `/auth/callback#code=<one-time code>`. `AuthCallback.tsx` swaps that code for a session (`POST /auth/oauth/exchange`) and finishes like a password login (`src/lib/finishSignIn.ts`, which also keeps `?next=` / a picked template). Errors land on `/login?oauth_error=<code>` with a friendly message.
- **Magic code** (`MagicCodePanel.tsx`): "We will send you a magic code to sign in ✨". It sends a 6-digit code, valid 10 minutes, then shows one code box that auto-submits at 6 digits, with resend (30 s cooldown) and "Use a different email". On register the same panel creates the account. "Forgot password? Sign in with a magic code" on the login form opens it.

## User menu and logout

Signed in, every site header (landing, tools, dashboard top bar) shows `UserMenu`: avatar/initials, name, email, Dashboard, Settings, Log out. `/login` and `/register` show a "You're signed in as …" card instead of the forms. Log out calls `POST /auth/logout` (revokes the refresh token server-side), clears local tokens and goes to `/login`. User data comes from `useCurrentUser()` (`src/hooks/useCurrentUser.ts`, 30 s cache, refreshes an expired token once).

## Day / Night theme

The sun/moon button (`components/theme/ThemeToggle.tsx`) sits on the right of every header. The choice is saved in `localStorage.rb_theme`; first visits follow `prefers-color-scheme`. `public/theme-init.js` is loaded in `<head>` with the CSP nonce (an external file, no inline script) and sets `<html data-theme>` before first paint, so there is no flash. With no attribute the site is dark, as before.

Light styles are CSS variables plus `:global(html[data-theme="light"]) …` blocks at the end of each module (landing, tools, auth, nav) and `src/app/theme.css` (dashboard shell). The resume editor and the resume templates are not themed. Switching animates colours for 450 ms (`rb-theme-anim`), and is instant with reduced motion.

## Fonts

Raleway and Montserrat are loaded once with `next/font/local` in `src/app/layout.tsx` (CSS variables `--font-raleway` and `--font-montserrat`, files in `public/fonts/`). There are no `@font-face` rules for them in `globals.css`. CSS uses `var(--font-raleway)` / `var(--font-montserrat)`; resume content that stores a family name goes through `fontStack(name)` in `src/lib/fontStack.ts`, which maps those two names to the next/font variable.

## Landing page performance

| What | How |
|---|---|
| Scroll reveal | `[data-reveal]` fades in (opacity only, 0.28 s). Starts 200 px before the viewport, and anything already on screen (load, anchor, jump, scroll end) shows at once. |
| Parallax | `useAuroraMotion.ts` measures shapes once (and on resize), then each frame only writes transforms for visible shapes. |
| One scroll listener | `onScrollFrame()` / `onScrollStart()` in `useAuroraMotion.ts`: one passive `scroll` + `wheel` listener for the page, subscribers run once per animation frame with `scrollY` only (no layout reads). Reveal, parallax and the nav all ride it. |
| Floats pause | Off-screen floats are paused (`data-off`); on-screen floats pause during any scroll, including the mouse wheel (`data-pause` on just those few nodes, not a class on the page root, so a scroll start restyles a handful of elements, not the whole page). |
| Anchor jumps | Clicking an in-page link or a hash change shows the target section and everything in view at once, with no fade (BUG-1318). |
| Hero smear (1024) | The streaky rectangle behind the hero character was inside the baked shadow image: the bake script read a 3-channel buffer as 1-channel, which drew horizontal stripes. `scripts/bake-shadows.cjs` now shifts the mask in JS, blurs a true 1-channel image and feathers the shadow at the image edges. The hero stage is also `transform-style: flat`, so the tilted sheet is never depth-sorted against the character. |
| Layers | No `will-change`, no blur filters, and no `backdrop-filter` except the PREVIEW modal scrim on desktop. |
| Template cards | 280w / 560w WebP via `srcset` (`cardImage()` in `aurora/data.ts`). The PREVIEW modal keeps the full image. |
| Shadows | No `filter: drop-shadow`. Character shadows are baked into `*-shadow.webp` images (`node scripts/bake-shadows.cjs`); boxes use `box-shadow`. |
| Header | Shows **Dashboard** when signed in, **Log in / Get started** otherwise. A same-size placeholder is shown until the session is read, so the wrong state never flashes. |
| Hero badges | Move with the figure (same parallax); below 1240 px they stack in a row under the figure. |

Checked by `src/components/landing/aurora/landingPerf.test.ts` (part of the backend `npm test`).

## Cookie consent and analytics

- `src/components/consent/CookieConsent.tsx` (mounted in `app/layout.tsx`) shows the banner
  (Accept all / Reject non-essential / Customize) and the preferences modal. The landing footer has a
  **Cookie settings** link (`CookieSettingsLink`), and any code can call `openCookieSettings()`.
- Categories: Essential (always on), Preferences, Analytics & performance (GA4), Marketing (placeholder,
  no trackers yet).
- The choice is stored in the first-party cookie `rb_consent` = `<version>.<p><a><m>.<anonId>.<unixSeconds>`
  (6 months, SameSite=Lax). Bump `CONSENT_VERSION` in `src/lib/consent.ts` (and the backend copy) to ask
  everyone again. Each choice is also sent to `POST /rb-api/consent` for the audit log.
- Code that stores a preference (theme, language, editor settings) should check
  `hasConsent("preferences")` from `src/lib/consent.ts` first.
- **GA4:** set `NEXT_PUBLIC_GA_ID=G-XXXXXXX` at build time. Without it nothing is loaded and the CSP has no
  Google hosts. With it, the CSP allows googletagmanager / google-analytics, and `gtag.js` is injected
  only after analytics consent (withdrawing consent disables GA and deletes the `_ga*` cookies).
- The banner never renders on `/print/*` and `/template-preview/*` (PDF and thumbnail renders).

## Admin: Users & Activity, PDF & Templates

- `/admin/activity`: every login with IP, city / region / country, device, browser, OS and time;
  search, date range, country and device filters, CSV export, per-user login history.
- `/admin/pdf`: the 12 built-in templates (enable/disable, reorder, rename, category, description,
  featured, preview, usage counts), users' resumes (view / download PDF, delete), PDF export settings
  and the admin audit log. Landing gallery changes come from `GET /template-settings`
  (`src/lib/templateSettings.ts`).

## Admin Dashboard v2

`components/admin/AdminConsole.tsx` is the shell: grouped sidebar (General, Content, Business, System), icon rail at 900–1279px, top bar + drawer below 900px, Day/Night toggle, and a range switcher (Today / 7D / 30D / 90D). Panels live in `components/admin/v2/`:

- `OverviewPanel` — KPI tiles, line chart (daily sign-ups & traffic), bar chart (peak / quiet hours in PKT + busiest days), donuts (devices, Free vs Pro), geography world map, top pages, system health, latest leads.
- `UsersPanel` (search, plan/status filters, detail drawer, suspend / activate, soft or permanent delete with a confirm dialog — permanent needs typing `DELETE`), `BillingPanel`, `TeamPanel` (invite, roles, permission matrix), `HealthPanel`, `ListPanels` (Leads, Website Pages, Cookie Consents, Audit Log), `UploadsPanel`.
- `AudioPanel` (`/admin/audio`, Content): KPI strip, status + search filters, jobs table (cards on phones), empty state. Uses the range switcher.
- `SettingsPanel` (`/admin/settings`, System): brand, support email, Free limits, sign-ups and maintenance toggles, read-only integration badges, Save / Reset with a toast.
- `Dialog.tsx`: `ConfirmDialog` and `Toast`, shared by the panels. `components/system/SiteBanner.tsx` shows the maintenance banner on the public site.
- Charts are plain React SVG (CSP-safe, no chart library). The world map paths (`v2/worldMap.ts`, Natural Earth 110m, ISO alpha-2 codes) load lazily on the Overview.
- Every tab has its own URL (`/admin`, `/admin/users`, `/admin/leads`, `/admin/billing`, `/admin/team`, `/admin/health`, …). Tabs the signed-in team member has no permission for are hidden.
- Layout uses container queries so it stays balanced from 1920px to 375px at 100% and 110% zoom with no horizontal scroll.
