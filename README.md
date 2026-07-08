# Project Master — Across Assist

Centralized web-based Project & Task Tracking System, built from the Project Master BRD (v1.0).
Stack: **Express + Prisma + PostgreSQL (Neon)** backend, **React + Vite + Tailwind v4** frontend.
Theme: Across Assist brand colors (blue `#2F5DD6` / orange `#FA7D0B`).

## What's implemented (mapped to BRD section 6)

- **6.1 Project Master** — CRUD, LOB restriction for BA, status lifecycle, soft delete for BA / hard delete for Admin
- **6.2 Task Tracker** — creation, configurable categories, ownership-based editing, search & filters
- **6.3 Developer Assignment** — mandatory developer/date/EED fields before "Assigned" (BR-08)
- **6.4 Expected End Date Revision** — approval-aware prompt, soft warning, full non-destructive revision history
- **6.5 Deadline & SLA Tracking** — On Track / Due Today / Overdue / Completed On Time / Completed Late + missed-by-days
- **6.6 Bug Management** — independent status/priority lifecycle, LOB-scoped visibility
- **6.7 Excel Upload & Migration** — 4-step guided import, auto project creation, duplicate detection (skip/overwrite/import)
- **6.8 Dashboards, Search & Notifications** — home dashboard, project dashboard, in-app notifications
- **6.9 Audit Trail & Reporting** — full field-level audit log, 10 standard reports, CSV export
- **Section 7** — Role-based permissions (Admin / Business Analyst), LOB data segregation enforced server-side

Out of scope per BRD section 3.2 (Phase 1): developer login, email/Outlook integration, Gantt/calendar views, PDF export, Jira/Azure DevOps integration, mobile app.

## Project structure

```
project-master/
  backend/     Express API, Prisma schema (PostgreSQL), JWT auth
  frontend/    React + Vite + Tailwind v4 SPA
```

## 1. Database setup (Neon)

1. Create a project at https://neon.tech and copy two connection strings from the dashboard:
   - **Pooled connection** → `DATABASE_URL`
   - **Direct connection** → `DIRECT_URL` (used by Prisma Migrate; Neon calls this the "unpooled" string)
2. In `backend/`, copy the example env file and fill in both URLs plus a JWT secret:

```bash
cd backend
cp .env.example .env
# edit .env with your Neon DATABASE_URL / DIRECT_URL and a JWT_SECRET
```

## 2. Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init   # creates all tables on Neon
npm run seed                          # creates LOBs, categories, developers, admin + BA demo users
npm run dev                           # http://localhost:4000
```

Seeded logins:
- Admin: `admin@acrossassist.com` / `Admin@123`
- BA (Travel LOB): `ba.travel@acrossassist.com` / `Ba@12345`

## 3. Frontend

```bash
cd frontend
npm install
npm run dev     # http://localhost:5173, proxies /api -> http://localhost:4000
```

To point the frontend at a deployed API instead of the dev proxy, set `VITE_API_URL` (e.g. in `frontend/.env`) to the full API base URL, e.g. `https://your-api.example.com/api`.

## Excel import format

Matches the real LOB tracker sheets (e.g. `Auto`, `Gadget`, `Travel`) — **LOB is not a column**; the uploader selects the target LOB in the wizard before uploading, and every row in the file is imported under that LOB.

Required columns: `Project Name/Module`, `Category`, `Status`.
Also read if present: `Email Subject`, `Description`, `Priority`, `Requirement Rec. From`, `Business Req. Rec. Date`, `Developer Req. Received Date`, `Delivery Date`, `Start Date (Developer)`, `Expected End Date`, `Assigned Team/Developer`, `Revised date`, `Reason For Delay`, `Remarks`.

If a workbook has multiple sheets (notes, unrelated tabs), the importer scans sheets and uses the first one containing the three required columns — other sheets are ignored.

`Assigned Team/Developer` is stored as free text (`Task.assignedTeam`) since the legacy tracker often lists multiple names — it is not forced into the single-developer master used by the in-app assignment workflow (BR-08). Existing `Project Name` values append tasks to that project; new names auto-create a project (BR-17). Duplicate detection matches on Project Name + Email Subject + Developer Req. Received Date, scoped to the selected LOB (BR-18).

After pulling schema changes, re-run `npx prisma migrate dev` in `backend/` to add the new Task columns (`priority`, `description`, `requirementReceivedFrom`, `businessReqReceivedDate`, `developerReqReceivedDate`, `deliveryDate`, `revisedDate`, `reasonForDelay`, `assignedTeam`).

## Notes on Prisma models

Two models use non-standard client property casing because Prisma lowercases only the first letter of the model name:
- `LOB` model → `prisma.lOB`
- `EEDRevision` model → `prisma.eEDRevision`

These are already used correctly throughout `backend/src/routes/*`.

## Deploying

- **Backend**: any Node host (Render, Railway, Fly.io). Run `npx prisma migrate deploy` on release, then `npm start`.
- **Frontend**: `npm run build` in `frontend/` produces `dist/` — deploy to Vercel/Netlify/static hosting, set `VITE_API_URL` to your deployed API.