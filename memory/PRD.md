# PRD — abearchitectstudio Portfolio + Private Editor

## Original problem statement
The user has a finished architecture portfolio (reference: spatial-studio-v2 preview) and needs a private Editor to manage projects (add/edit/delete/upload images/reorder/publish/unpublish) without touching code. Public site design must remain unchanged; all content must be dynamic from the backend. No Supabase; simple persistent DB + local file storage.

## User decisions
- Editor protected by a single shared passcode (JWT exchange)
- Images stored on local persistent file storage (/app/backend/uploads, served at /api/uploads/*)
- Keep the exact existing site structure (two worlds: Design Anomaly, Design Furniture)
- Publish/unpublish + manual ordering + featured flag

## Architecture
- Backend: FastAPI + MongoDB (motor). String UUID ids, `_id` excluded. Routes under /api.
  - Public: GET /api/projects (published only, ?world=&category=), GET /api/projects/{slug}
  - Auth: POST /api/auth/login {passcode} → JWT; GET /api/auth/verify
  - Admin (Bearer JWT): GET /api/admin/projects, GET /api/admin/projects/by-slug/{slug}, POST/PUT/DELETE /api/admin/projects/{id}, POST /api/admin/projects/reorder {ids}, POST /api/admin/uploads (multipart)
  - Seed: 6 original projects seeded on startup when collection is empty (content + image URLs preserved from the reference site)
- Frontend: React + Tailwind + framer-motion + lenis. Public pages: /, /anomaly, /furniture, /project/:slug, /about (faithful reproduction of reference design). Private /editor (passcode login, dashboard, project form). Draft preview via /project/:slug?preview=1 with editor token.

## User personas
- Visitor: browses portfolio, never sees admin controls
- Studio owner: manages all projects via /editor with passcode

## Implemented (2026-09-06)
- Faithful public portfolio (home, both world pages with category filters, project detail, about) fully driven by backend data
- Private editor at /editor: add/edit/delete, multi-image upload, cover selection, image reorder/captions, text sections, publish/unpublish, featured flag, reorder via up/down, draft preview
- Passcode auth (JWT), local persistent uploads
- Editor passcode: atelier2026 (see /app/memory/test_credentials.md)

## Implemented (2026-09-06, session 2)
- New third world "Work" (path /work) with 3 fixed categories: Supervisor, Building Design, Competition Design — always shown as filter chips even with 0 projects. Fully manageable from Editor exactly like Anomaly/Furniture (world dropdown + category datalist suggestions)
- About page is now a CMS: intro line, bio paragraphs (add/remove), facts rows (add/remove), email/instagram — served via GET /api/about (public), edited via PUT /api/admin/about, editable in Editor → Settings
- Drag-and-drop reordering (dnd-kit) replacing old up/down arrow buttons: project rows in Editor dashboard (per world group, drag handle -> calls POST /api/admin/projects/reorder) and images inside ProjectForm (client-side array reorder, persisted on Save)
- Editor Settings screen: change passcode (bcrypt hash stored in Mongo `settings` collection id="auth", seeded from EDITOR_PASSCODE on first boot only; POST /api/admin/change-passcode verifies current + updates hash). Passcode changed to `abearch4231`
- Automatic image compression on upload: Pillow resizes any image >2400px on its longest side and re-encodes jpg/webp at quality=82 / png with optimize (server-side in POST /api/admin/uploads, gif/avif passed through untouched)
- Public site header logo replaced: top-left now renders the Abraham wordmark image instead of "abearchitectstudio" text (editor/admin headers unchanged, out of scope)

## Verified (session 2)
- Backend: 17/17 pytest cases (auth, passcode change, About CMS, Projects CRUD incl. "work" world, reorder, uploads+compression) — 100% pass
- Frontend: logo image, 4 nav links, /work hero+categories, /about dynamic content, editor login with new passcode, 3 world groups with drag handles, Settings view (passcode + about cards) — 100% pass via testing_agent (see /app/test_reports/iteration_1.json)

## Backlog
- P1: Drag-and-drop reordering in editor
- P1: Editable About page text (currently static, as on reference)
- P2: Image compression/resizing on upload
- P2: Delete uploaded files from disk when removed from a project
- P2: Change passcode from editor UI

## Implemented (2026-09-06, session 3)
- Project detail opening now uses ProjectGallery (embla-carousel): all project images in editor-set order, prev/next arrows (desktop), swipe (mobile), counter "01/NN", natural proportions (no crop). Rest of the project page layout is unchanged
- Visual polish: site background white (#FFFFFF, was cream), body/nav/metadata/labels now use Poppins (temporary Gotham stand-in — real Gotham font files not yet supplied by user, swap later in index.css --font-body), titles (.display, Archivo) untouched
- Home page full-screen intro splash (Abraham logo on white plate over optional bg image) on every load, ~2.4s or dismiss on click; bg image is editable from Editor → Settings → "Home opening screen background" (GET /api/home-intro public, PUT /api/admin/home-intro auth)
- Footer wordmark replaced with Abraham logo image
- Per-image display ratio (Original/Square/Landscape/Portrait/Wide) + optional crop toggle added to ProjectForm image rows (ImageItem.ratio/crop) — affects only inline section/extra images on project page, not the opening gallery
- Passcode-recovery-via-email: CANCELLED by user (no Resend API key provided) — not implemented

## Verified (session 3)
- Backend: 21/21 pytest (17 regression + home-intro x3 + ratio/crop x1) — 100%
- Frontend: gallery nav/counter/swipe, home-intro splash, white bg, Poppins/Archivo font split, footer logo, Settings home-intro card, per-image ratio/crop — 100% via testing_agent (see /app/test_reports/iteration_2.json)
- Fixed post-test: mobile project-title overflow (added break-words), ProjectGallery embla listener cleanup on unmount

## Backlog
- P2: Swap Poppins → real Gotham once user uploads font files
- P2: Delete uploaded files from disk when removed from a project
- P2: Passcode recovery via email (needs user's Resend API key if revisited)

## Bug fix + polish (2026-09-06, session 4)
- FIXED: first project image's ratio/crop setting wasn't applied in ProjectGallery (opening slider ignored ratio for all slides; only the later inline "sections/extra images" duplicate — which excludes image 0 — respected it). Now every gallery slide applies its own ratio+crop.
- Replaced logo everywhere (header, footer, home intro) with newest logo file ("LOGO TERBARU-01")
- Home intro splash redesigned: white background (was dark), logo enlarged (w-72vw/max-w-4xl on desktop), removed the old white plate wrapper
- Added clickable thumbnail strip below the project gallery (gallery-thumb-<i>) to jump directly to any image
- Verified via testing_agent (iteration_3.json): 100% pass on bug fix + all visual changes; two cosmetic-only notes (desktop logo cap, harmless embla-carousel scrollWidth quirk on mobile) addressed/reviewed

## Homepage cover + full-screen gallery + mobile fixes (2026-09-06, session 5)
- Replaced the temporary auto-dismissing Home splash with a PERSISTENT full-viewport HomeCover section (renamed HomeIntro.jsx → HomeCover.jsx) at the top of Home: logo + subtle background design image, "Scroll ↓" hint, existing homepage content unchanged below it
- GET /api/home-intro now falls back to the first published project's cover image when no admin bg has been set, so the cover always shows a real design (editable anytime via Editor → Settings → "Home opening screen background")
- Project gallery's first image (slide 0) now renders full-screen: edge-to-edge full width, ~70vh mobile/~92vh desktop, object-cover — subsequent slides keep the smaller letterboxed treatment; explicit per-image ratio/crop from Editor still takes priority but is no longer width-capped for slide 0
- Mobile fixes: ProjectDetail's giant index number + title now stack vertically (was cramped side-by-side); About page title no longer clips (smaller mobile font + break-words, wraps cleanly)
- Verified via testing_agent (iteration_4.json): 8/8 checks pass. Minor unrelated data quirk noted (literal "None" shown when a project's location field is empty) — not fixed, out of scope

## Gallery uniform sizing + mobile nav (2026-09-06, session 6)
- Fixed: gallery slides after the first were smaller when navigating — removed isFirst special-casing in ProjectGallery, ALL slides now use the same full-screen (or explicit ratio) treatment
- Fixed: Home hero "SPACE FORM EXPERIMENT." was clipped on real mobile phones — reduced mobile font-size text-[13vw]→text-[9vw]
- Fixed: World.jsx hero title (e.g. "Design Furniture") was also clipped on mobile — same fix (text-[13vw]→text-[9vw] + break-words), plus Continue-link title and top section padding bumped
- Added mobile-only quick-nav bar (SiteHeader.jsx, data-testid=mobile-quick-nav) fixed below the header with 4 short pills (Anomaly/Furniture/Work/About) for direct navigation without opening the hamburger menu; all pages' mobile top-padding bumped pt-28→pt-40 to clear the two stacked fixed bars
- Verified via testing_agent (iteration_5.json, iteration_6.json): 100% pass both rounds (1 minor testid bug found+fixed by testing agent itself in iteration_6: quick-nav testids now derive from route slug not label)
