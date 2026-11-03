# NidhiRoute AI — Full-Stack Upgrade

## What was added
- Modern responsive UI and 8-stage journey.
- Explainable weighted scheme matching with match scores.
- Scheme comparison and "why this matches" reasons.
- EMI simulator: EMI, principal, total interest and total repayment.
- Current-location option for routing (browser permission required).
- Partner routing with OpenStreetMap/Leaflet and directions.
- Document submission after scheme selection.
- PDF/JPG/PNG upload.
- Camera capture using browser `getUserMedia()` for document images.
- Backend application creation and application IDs.
- Backend document storage and verification statuses.
- Verifier endpoints for Pending Verification → Verified/Rejected.
- PostgreSQL schema for applications and documents.
- In-memory fallback when PostgreSQL is not configured, useful for demos.
- Application tracking UI.

## Run
### 1. Backend
```bash
cd backend
npm install
npm start
```
API: http://localhost:5000

### 2. PostgreSQL (recommended)
Create database `nidhiroute`, then run:
```bash
psql -U postgres -d nidhiroute -f database/schema.sql
```
Set `DATABASE_URL` in `backend/.env` or environment variables.

### 3. Frontend
Open `frontend/index.html` in a browser. For camera access, browsers normally require a secure context (`https://`) or localhost.

If the backend is deployed somewhere else, set:
```js
localStorage.setItem('NIDHI_API','https://your-domain.example/api')
```
before loading the page.

## Document verification flow
Applicant:
1. Analyze profile.
2. Select scheme.
3. Required documents appear.
4. Choose PDF/image upload OR Camera.
5. File is sent to `POST /api/documents`.
6. Status becomes `Pending Verification`.

Verifier:
1. Review pending documents from `GET /api/admin/pending-documents`.
2. Verify or reject using:
`PATCH /api/documents/:id/status`
with JSON such as:
```json
{"status":"Verified","remarks":"Document readable and details match application."}
```

## Production security requirements
This prototype intentionally keeps the verifier API simple for hackathon demonstration. Before production:
- Add applicant/verifier authentication and role-based authorization.
- Store files in private object storage instead of a public uploads folder.
- Encrypt sensitive data at rest and in transit.
- Add malware scanning and file-type/content validation.
- Add audit logs for every verification action.
- Add retention/deletion policy and consent/privacy notices.
- Never claim automated document verification unless an actual OCR/identity/document verification service is integrated.
- Replace demo scheme/partner data with verified official data sources.

## Backend architecture
Browser → Express REST API → PostgreSQL
                         ↘ private document storage
Application creation → application record
Document upload → document record + file
Verifier review → status/remarks/verified timestamp

## Local document submission storage
When the backend is running locally, successfully AI-screened documents submitted from `frontend/document-verification.html` are stored on the same PC in:

`NidhiRoute_AI_FullStack/Application/<Applicant Name>/`

Example:

`NidhiRoute_AI_FullStack/Application/Murugan/`

The folder name is sanitized for Windows filesystem compatibility. The browser cannot arbitrarily write folders to the PC; the local Node.js backend performs this save operation.


## Portal / Login / Dashboard
- `frontend/index.html` is the new portal-style landing page with the 3-line menu.
- `frontend/login.html` provides sign-up and login. Passwords are stored as a salted scrypt hash, not plaintext.
- `frontend/dashboard.html` provides authenticated dashboard, working scheme search/filter, and Apply for Schemes.
- `frontend/find-schemes.html` is the original NidhiRoute scheme-matching workflow, preserved as the next step after login.
- Local account storage is created by the Node backend under `Application/<Applicant Name>/login info/account.json`.
- For production, use HTTPS, a proper database/session store, secure secret management, authentication controls and private object storage.
