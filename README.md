# Enterprise Law Firm Management System

A backend system for managing law firm operations: cases, lawyers, clients, court sessions, tasks, documents, and reporting — built with **Node.js, Express, and MongoDB**.

This implementation focuses on **production-grade backend architecture and business logic** rather than infrastructure scale. See [Scaling Beyond This Implementation](#scaling-beyond-this-implementation) for how it maps to a full microservices/enterprise deployment.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js, Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT (access + refresh tokens), bcrypt, OTP-based password reset |
| Authorization | Custom RBAC via a centralized permissions matrix |
| Validation | express-validator |
| File uploads | Multer (memory storage) → Cloudinary, with automatic local-disk fallback |
| Email | Nodemailer + EJS templates (bilingual, RTL/LTR-aware) |
| Push notifications | Firebase Cloud Messaging (FCM) |
| Security | Helmet, CORS, express-rate-limit |
| Logging | Winston (file + console) + Morgan (HTTP logs) |
| Scheduled jobs | node-cron (SLA monitoring, legal deadline & session reminders) |

## Architecture

Layered (MVC-style) monolith — chosen deliberately over physically separate microservices, since a single well-organized Node process is easier to run, debug, and showcase, while the **internal module boundaries mirror what would become separate services at scale** (see the scaling section).

```
Client (Postman / Web / Mobile)
        │
   Express App (app.js)
        │
 ┌──────┴───────────────────────────────┐
 │  Security: helmet, cors, rate-limit  │
 │  Routes → Validators → Controllers   │
 │  → Services (business logic)         │
 │  → Models (Mongoose schemas)         │
 └──────┬───────────────────────────────┘
        │
     MongoDB
```

**Project structure:**
```
src/
├── config/          # DB connection, RBAC permissions matrix
├── models/          # Mongoose schemas
├── controllers/     # Request/response handling
├── services/        # Business logic (conflict detection, workflow, reports)
├── routes/          # Express routers per resource
├── middlewares/      # auth, authorization, validation, audit logging, errors
├── validators/       # express-validator rule sets
├── jobs/            # cron jobs (SLA monitor)
├── utils/           # AppError, catchAsync, logger, sendResponse, seed
├── app.js
└── server.js
```

## Core Features

### 1. Authentication & RBAC
- JWT access + refresh tokens, stored server-side per device for revocation.
- 6 roles: `super_admin`, `branch_manager`, `senior_lawyer`, `lawyer`, `secretary`, `client`.
- **Centralized permissions matrix** (`config/permissions.js`) maps `resource × action → allowed roles`. Adding a role or resource never touches route code.
- **OTP-based password reset**: `forgot-password → verify-reset-otp → reset-password`. The OTP is a 6-digit code, bcrypt-hashed before storage (never kept in plaintext), expires after 15 minutes, and requires a successful verify step before the password can actually be changed — knowing the OTP alone isn't enough to skip straight to resetting it. `forgot-password` always returns the same generic response regardless of whether the email exists, to avoid leaking which emails are registered.

### 2. Case Management
- Explicit lifecycle: `draft → under_review → active → court_session → judgment_issued → closed`.
- Transitions are validated server-side (`services/caseService.js`) — illegal jumps are rejected with a clear error.
- Full timeline/audit trail embedded per case (status changes, notes, document events).
- Final outcome tracked per case (`outcome.result`: won/lost/settled/dismissed) with judgment summary and date — and once a judgment is issued, any appeal/cassation window is tracked separately as a **Legal Deadline** (see #11) rather than folded into the case status, since a case can stay "judgment_issued" while a multi-week appeal clock is ticking in parallel.

### 3. Session Scheduling with Conflict Detection & Reminders
- `services/sessionService.js` checks for overlapping time ranges for the same lawyer before booking.
- Reschedule flow creates a linked replacement session and re-runs the conflict check.
- Proactive reminders fire automatically 24 hours and 1 hour before a session starts (`sendUpcomingSessionReminders`, run from `jobs/deadlineReminder.js` every 30 minutes), in addition to the one-time confirmation sent when the session is first booked.

### 4. Task & Workflow Automation
- Creating a case auto-generates initial tasks and notifies the lead lawyer (`services/taskService.js`).
- Hourly cron job (`jobs/slaMonitor.js`) flags tasks that breached their due date.

### 5. Document Management (Cloudinary, with local-disk fallback)
- Versioned documents: every re-upload adds a new version rather than overwriting; old versions can be individually deleted (`DELETE /documents/:id/versions/:versionNumber`), and the underlying file (Cloudinary asset or local file) is cleaned up alongside the database record.
- Storage backend is resolved automatically: if `CLOUDINARY_*` env vars are set, files are uploaded straight from an in-memory buffer (`multer.memoryStorage()`) to Cloudinary via `cloudinary.uploader.upload_stream` — the file never touches this server's own disk. If Cloudinary isn't configured, uploads fall back to local disk exactly as before, so the module works out of the box with zero cloud setup.
- **Production note**: Cloudinary's free tier (25 credits/month — roughly 25GB storage/bandwidth or 25,000 transformations combined) suspends asset access on overage rather than billing for it, which is an acceptable trade-off for a portfolio/learning deployment but a real availability risk for a production system holding case-critical documents. See "Scaling Beyond This Implementation" for the production alternative (AWS S3 / Cloudflare R2, pay-as-you-go with no suspension behavior).

### 6. Audit Logging
- Middleware (`middlewares/auditLog.js`) records every sensitive action: who, what, when, IP, user agent, outcome.
- Read-only, append-only — visible only to `super_admin`.

### 7. Reporting Engine
- Aggregation-based reports: case status breakdown, lawyer performance, revenue by month, session outcomes, workload distribution.

### 8. Global Search (with Arabic Normalization)
- Cross-collection search over cases and documents using MongoDB text indexes.
- **Arabic-aware matching**: MongoDB has no built-in stemmer that handles mixed Arabic/Latin/numeric content well (case numbers, English case types alongside Arabic titles), so a normalization layer (`utils/arabicNormalize.js`) strips diacritics, unifies hamza variants (أ/إ/آ → ا), normalizes ة→ه and ى→ي, and removes the leading definite article "ال" — applied identically to both the indexed text and the incoming search keyword. This means "المحامي", "محامي" all resolve to the same indexed term. Each model maintains a `searchableText` field (populated in a `pre('save')` hook) that the text index is built on, keeping the original `title`/`description` untouched for display.
- Known limitation: this is token-level normalization, not true Arabic morphological stemming — plural/feminine forms of a word (e.g. "تجاري" vs "تجارية") are not unified. See "Scaling Beyond This Implementation" for the Elasticsearch + Arabic analyzer upgrade path.

### 9. Internationalization (i18n) — Arabic & English
- Every API response message (success messages, validation errors, authorization errors, workflow errors) is translated server-side.
- Language resolution order: `?lang=ar` query param → `Accept-Language` header → English default.
- Translation dictionaries live in `src/locales/en.json` and `src/locales/ar.json` (113+ keys, kept in sync).
- `req.t('key.path', { param })` is available in every controller/middleware/service via `middlewares/detectLocale.js`.
- Response includes a `Content-Language` header reflecting the resolved locale.

### 10. Push Notifications (Firebase Cloud Messaging)
- Every in-app notification (`notificationService.createNotification`) automatically also fires a push notification via **Firebase Cloud Messaging (FCM)** to every device the recipient has registered — so lawyers/clients are reached even when they aren't actively looking at the dashboard.
- This is the **only** Firebase product used (no Firestore, no Cloud Functions, no Firebase Auth), which keeps the integration permanently inside FCM's no-cost tier regardless of message volume.
- `POST /api/v1/users/me/fcm-token` registers a device token (call this after obtaining a token from the Firebase SDK in the browser/app). `DELETE /api/v1/users/me/fcm-token` removes it (e.g. on logout).
- If `FIREBASE_SERVICE_ACCOUNT_PATH` isn't set, push delivery is disabled gracefully — the rest of the API (including in-app notifications) keeps working normally; nothing throws.
- Tokens FCM reports as invalid/unregistered (uninstalled app, cleared browser data) are pruned automatically on next send attempt.

### 11. Legal Deadlines & Appeals Tracking
- A separate `LegalDeadline` model tracks the *procedural clock* of a case — appeal windows (استئناف), cassation (طعن بالنقض), objections, response deadlines, statute-of-limitations cutoffs, execution of judgments — distinct from court Sessions (hearings/meetings) and from the Case's own status.
- Each deadline carries its own `responsibleLawyer`, configurable reminder thresholds (`reminderLeadDays`, default `[7, 3, 1]` days before), and a `remindersSent` log to avoid duplicate notifications.
- `jobs/deadlineReminder.js` runs every 30 minutes and: (1) flags deadlines that passed without being marked completed as `missed` and immediately notifies the responsible lawyer; (2) sends "due soon" reminders as each threshold is crossed.
- Missing a legal deadline can mean losing a client's right permanently, so missed deadlines are treated with higher urgency (`type: 'error'` notification) than a regular overdue task.

### 12. Legal Consultations
- Clients can request advice from the firm (`Consultation` model) without it automatically becoming a full case — either addressed to a specific lawyer (`preferredLawyer`) or left in a general queue for staff to assign.
- Threaded messaging between client and lawyer on each consultation (`POST /consultations/:id/messages`), with status progressing `pending → in_progress → answered → closed`.
- Once it's clear a consultation needs actual legal representation, staff can call `POST /consultations/:id/convert-to-case`, which creates a real `Case` pre-filled from the consultation and links back to it via `convertedToCase` — so the firm never loses the original request history.

### 13. Transactional Email (Nodemailer + EJS, bilingual)
- A single reusable transporter (`services/emailService.js`) sends the welcome email (on signup) and the password-reset OTP email, both rendered from EJS templates in `src/views/`.
- Templates are written once and rendered in either language: the same `.ejs` file produces a correct right-to-left Arabic email or left-to-right English email depending on the `locale`/`dir` values passed in at render time (driven by the recipient's resolved locale — see #9), rather than maintaining separate `ar`/`en` template files that can drift out of sync.
- Email delivery failures never fail the parent request: a welcome email is fire-and-forget after signup succeeds, and a failed OTP email rolls back the OTP it just set (so a retry doesn't silently "succeed" against a code the user never received) while still returning the same generic response `forgotPassword` always gives.

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local install or a connection string from MongoDB Atlas)

### Setup
```bash
npm install
cp .env.example .env
# edit .env: set MONGO_URI, JWT_SECRET, JWT_REFRESH_SECRET, and SMTP_* (see below)

npm run seed   # populates sample admin/lawyers/clients/case/session
npm run dev    # starts with nodemon on http://localhost:5000
```

### Required for password reset & welcome emails: SMTP
The OTP-based password reset flow and the welcome email need a real SMTP account to actually deliver mail.
1. Easiest option for Gmail: enable 2-Step Verification, then generate an [App Password](https://myaccount.google.com/apppasswords) — use that as `SMTP_PASS`, **not** your normal Gmail password.
2. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` in `.env`. Any standard provider (SendGrid, Mailtrap, Amazon SES) works the same way.
3. Without valid SMTP credentials, `forgot-password` will fail to send the OTP (the request still returns its generic response, but no email arrives) and signup's welcome email will silently fail — both are logged, neither blocks the underlying signup/reset request itself.

### Optional: Cloud document storage (Cloudinary)
Document uploads work without any setup — they fall back to local disk (`./uploads`) until Cloudinary is configured. To enable cloud storage:
1. Create a free account at [Cloudinary](https://cloudinary.com).
2. Dashboard → copy **Cloud Name**, **API Key**, **API Secret**.
3. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` in `.env`.
4. Restart the server — you'll see `Cloudinary configured successfully` in the logs.
5. **Read the "Document Management" section above before using this beyond a portfolio/learning context** — the free tier suspends access on overage rather than billing for it.

### Optional: Enable push notifications (Firebase Cloud Messaging)
Push notifications work without any setup — they're simply disabled until configured. To enable them:
1. Create a free project at [Firebase Console](https://console.firebase.google.com).
2. Project Settings → Service Accounts → **Generate new private key** → save the downloaded JSON file somewhere **outside** version control (e.g. `./firebase-service-account.json` at the project root — already covered by `.gitignore`).
3. In `.env`, set `FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json`.
4. Restart the server — you'll see `Firebase Admin SDK initialized successfully` in the logs.
5. From the frontend, obtain a device token via the Firebase JS SDK and `POST` it to `/api/v1/users/me/fcm-token`.

### Sample credentials (after seeding)
| Role | Email | Password |
|---|---|---|
| Super Admin | admin@lawfirm.com | Admin@12345 |
| Senior Lawyer | ahmed.hassan@lawfirm.com | Lawyer@12345 |
| Lawyer | mona.tarek@lawfirm.com | Lawyer@12345 |
| Client | khaled.ibrahim@client.com | Client@12345 |

> Change these credentials immediately in any non-local environment.

## API Reference (selected endpoints)

All routes are prefixed with `/api/v1`. Add `?lang=ar` to any request (or send `Accept-Language: ar`) to receive Arabic response messages.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Public client signup |
| POST | `/auth/login` | Login, returns access + refresh tokens |
| POST | `/auth/refresh-token` | Exchange refresh token for new access token |
| POST | `/auth/forgot-password` | Step 1: request an OTP for password reset |
| POST | `/auth/verify-reset-otp` | Step 2: verify the 6-digit OTP |
| POST | `/auth/reset-password` | Step 3: set a new password (requires step 2 first) |
| GET | `/auth/me` | Current authenticated user |
| POST | `/users` | Create staff account (admin only) |
| POST | `/cases` | Create case (auto-generates tasks) |
| PATCH | `/cases/:id/status` | Transition case status (workflow-validated) |
| POST | `/cases/:id/notes` | Add a timeline note |
| POST | `/sessions` | Schedule a session (conflict-checked) |
| POST | `/sessions/:id/reschedule` | Reschedule with conflict re-check |
| GET | `/lawyers/:id/performance` | Lawyer KPI dashboard |
| POST | `/documents` (multipart) | Upload a document |
| POST | `/documents/:id/versions` (multipart) | Add a new version |
| DELETE | `/documents/:id/versions/:versionNumber` | Delete a specific (non-current) version |
| GET | `/search?q=keyword` | Global search across cases & documents |
| GET | `/reports/case-status` | Case status report |
| GET | `/reports/revenue` | Monthly revenue report |
| GET | `/audit-logs` | Full audit trail (super_admin only) |
| POST | `/users/me/fcm-token` | Register a device for push notifications |
| DELETE | `/users/me/fcm-token` | Unregister a device (e.g. on logout) |
| POST | `/deadlines` | Create a legal deadline (appeal, cassation, etc.) tied to a case |
| GET | `/deadlines` | List deadlines (filterable by case/status/type/lawyer) |
| PATCH | `/deadlines/:id/status` | Mark a deadline completed/cancelled |
| POST | `/consultations` | Client requests a legal consultation |
| GET | `/consultations` | List consultations (scoped by role) |
| POST | `/consultations/:id/messages` | Reply on a consultation thread |
| PATCH | `/consultations/:id/assign` | Assign a lawyer to a queued consultation |
| POST | `/consultations/:id/convert-to-case` | Escalate a consultation into a full case |

## Permissions Matrix (excerpt)

| Resource | View | Create | Edit | Delete |
|---|---|---|---|---|
| Cases | all roles | admin, manager, senior/lawyer, secretary | admin, manager, senior/lawyer | admin, manager |
| Clients | staff roles | staff roles | staff roles | admin, manager |
| Users | admin, manager | admin only | admin, manager | admin only |
| Audit Logs | admin only | — | — | — |

Full matrix lives in `src/config/permissions.js`.

---

## Scaling Beyond This Implementation

This codebase intentionally trades some infrastructure complexity for clarity and runnability. Each module here is already boundary-clean and would map directly onto these upgrades without a rewrite:

| Today (this repo) | At enterprise scale |
|---|---|
| Single Express monolith | Split into services: Auth, Cases, Sessions, Documents, Notifications — each owning its routes/services/models |
| MongoDB text index search | Elasticsearch cluster, fed by change-stream events from MongoDB |
| In-process notification calls | RabbitMQ/Kafka queue decoupling producers (cases, sessions) from consumers (email/SMS/push workers) |
| node-cron in the same process | Dedicated worker/scheduler service (e.g. BullMQ + Redis, or Kubernetes CronJobs) |
| Cloudinary (free tier) / local disk fallback | AWS S3 / Cloudflare R2 with signed URLs — pay-as-you-go, no suspension-on-overage behavior |
| No caching layer | Redis for session storage, rate-limit counters, and report caching |
| Single MongoDB instance | Replica set + read replicas; sharding by tenant at very high scale |
| Implicit single-tenant | Multi-tenant via a `tenantId` discriminator on every collection + middleware-enforced isolation, or fully separate databases per tenant |
| Manual deploy | Dockerfile per service + Kubernetes manifests + CI/CD (GitHub Actions) |

This table is also the answer to "how would this scale" in a technical interview — the architecture was designed with these seams in mind from the start (e.g., `searchService.js` and `notificationService.js` are isolated specifically so the backing technology can change without touching callers).

## Known Limitations (by design, for this implementation)

- Email/SMS/push notification channels are stubbed (logged, not actually sent) — wiring in Nodemailer/Twilio/FCM only requires implementing the channel branch in `notificationService.js`.
- OCR and digital signatures are out of scope for this implementation.
- Multi-tenancy is not implemented; the data model assumes a single firm.
