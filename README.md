# NidhiRoute AI

> **Smart scheme discovery, eligibility screening and application guidance for SC entrepreneurs and students.**

NidhiRoute AI is an academic/hackathon prototype that helps applicants explore funding schemes, understand a configured eligibility screen, estimate loan repayments, locate demo channel partners and prepare supporting documents.

## Contents

- `frontend/index.html` — Home / landing page
- `frontend/login.html` — Sign in and account creation
- `frontend/dashboard.html` — Applicant dashboard and searchable scheme catalogue
- `frontend/find-schemes.html` — General profile-based scheme matching, comparison, EMI and partner routing
- `frontend/apply-scheme.html` — Dedicated application form for one selected scheme
- `frontend/document-verification.html` — Document upload/camera capture and OCR-based screening
- `backend/server.js` — Express API for accounts, applications and document submission
- `database/schema.sql` — PostgreSQL tables and index definitions
- `Application/` — Local applicant document/account storage root (created/used by the backend)

## Main applicant journey

1. Open `frontend/index.html` (or the root `nidhiroute-ai-original.html` entry file).
2. Choose **Apply for Schemes** and sign in or create an account.
3. Use the dashboard to search/filter the scheme catalogue.
4. Select a scheme:
   - **Apply for Schemes** on a scheme card opens a dedicated application page for that scheme.
   - The scheme purpose is preselected; applicants do not select another scheme on that page.
5. Enter applicant name, annual family income, project/course cost, location and preferred timeline.
6. Run the configured eligibility screening.
7. Review the selected scheme and available demo channel partners. Use map markers and individual Google Maps direction links.
8. Continue to document verification, upload each required file or capture it using the camera, and submit after the checks pass.

The general matching page is also available for applicants who want to compare recommendations before selecting a scheme.

## Configured eligibility rules in this prototype

These are **prototype rules configured for this project**, not a statement of official government eligibility policy:

- Annual Family Income (AFI) must be **below ₹5,00,000 for every scheme**.
  - ₹4,99,999 passes the income threshold.
  - ₹5,00,000 and above fail the configured income threshold.
- Loan requests are capped at **₹5,00,000**, subject to a lower maximum configured for the selected scheme.
- For an **education loan** only, if AFI is **below ₹1,00,000**, the applicant must additionally submit a **Land Property Document**.
- At AFI of ₹1,00,000 or above, that additional land document is not triggered by this rule.
- Other required documents remain based on the selected purpose (education/business).

Always check the latest official scheme notification and lending institution requirements before using these rules outside a demonstration.

## Document checklist

**Education applications**
- SC Certificate
- Identity / Aadhaar Proof
- Income Certificate
- Admission / Course Proof
- Bank Account Proof
- Land Property Document — additionally required only for education-loan applications with AFI below ₹1,00,000

**Business applications**
- SC Certificate
- Identity / Aadhaar Proof
- Income Certificate
- Project Report
- Bank Account Proof

Accepted upload formats configured in the backend: PDF, JPG, PNG and WebP. The document page also provides camera capture where the browser supports camera access.

## Technology stack

| Layer | Technologies |
|---|---|
| Frontend | HTML5, CSS3, JavaScript |
| Maps | Leaflet.js, OpenStreetMap |
| Directions | Google Maps directions URLs |
| OCR / document parsing | Tesseract.js, PDF.js, jsQR |
| Backend | Node.js, Express.js, Multer |
| Database | PostgreSQL (`pg` driver); in-memory fallback for demo |
| Authentication | Local account records, salted scrypt password hashes, signed demo session token |
| Storage | Local `Application/<Applicant Name>/` directory when backend runs locally |

## Run locally

### Requirements

- Node.js (LTS recommended) and npm
- PostgreSQL only if you want persistent relational database storage
- A modern browser

### 1. Start the backend

Open a terminal in the project folder:

```bash
cd backend
npm install
npm start
```

The API starts at:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/api/health
```

### 2. Optional PostgreSQL setup

Create a database named `nidhiroute`, then run the schema:

```bash
psql -U postgres -d nidhiroute -f database/schema.sql
```

Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL`. Example:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/nidhiroute
SESSION_SECRET=replace-with-a-long-random-secret
```

Keep `.env` private. Do not commit credentials or secrets to GitHub.

If `DATABASE_URL` is not configured, the backend uses in-memory application/document records for demonstration; these records are not durable across server restarts. Account files and uploaded documents are handled separately by the local backend.

### 3. Open the frontend

For a basic UI preview, open:

```text
frontend/index.html
```

For the complete local workflow, keep the backend running and serve the frontend from `http://localhost` or another local web server. Camera access generally requires HTTPS or localhost. Some browser security features and module/CDN imports may not work reliably from a `file://` URL.

If your backend is hosted elsewhere, set the API base before loading the frontend:

```javascript
localStorage.setItem("NIDHI_API", "https://YOUR_API_HOST/api");
```

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Backend health and database status |
| POST | `/api/auth/signup` | Create an applicant account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Read current session user |
| POST | `/api/applications` | Create an application record |
| GET | `/api/applications/:id` | Retrieve application |
| POST | `/api/documents` | Upload a screened document |
| GET | `/api/applications/:id/documents` | List application documents |
| POST | `/api/applications/:id/submit` | Submit the document set |
| GET | `/api/admin/pending-documents` | List pending documents |
| PATCH | `/api/documents/:id/status` | Update a document status |

The verifier endpoints are demonstration endpoints. They are not protected by a production-grade role/permission system in this prototype.

## Local file storage

When the backend is running locally, applicant accounts and submitted documents are stored under the project’s `Application/` directory, organized by a sanitized applicant name. The browser alone cannot create arbitrary folders on a user’s computer; the local Node.js backend performs the file operations.

Do not store real Aadhaar, bank, income or property documents in a public repository. The `Application/` folder should remain empty in GitHub except for its `.gitkeep` placeholder.

## Important limitations and responsible use

- NidhiRoute AI is an **academic/hackathon prototype**, not an official government portal, lender, bank or scheme administrator.
- Scheme names, amounts, rates, partner locations, partner load/status and some eligibility data are prototype/demo data and must be independently verified against current official notifications.
- The ₹5,00,000 AFI threshold, ₹5,00,000 loan cap and conditional Land Property Document rule are project-configured demonstration rules, not universal government rules.
- OCR and checksum checks are screening aids only. They do not prove that a document is genuine, belongs to the applicant, or is accepted by UIDAI, a bank or a government authority.
- Aadhaar checksum validation is not UIDAI authentication or e-KYC. Do not represent it as such.
- Do not upload real sensitive documents to an untrusted or public deployment.
- Before production: add HTTPS, secure secrets, robust authentication, role-based authorization, private encrypted object storage, malware scanning, audit trails, rate limiting, consent/privacy notices, retention/deletion controls, server-side validation and official data integrations.

## Suggested GitHub upload

1. Create a new GitHub repository.
2. Add the project folders and files, including this `README.md`.
3. Keep `Application/` empty except for `.gitkeep`.
4. Do **not** upload `.env`, real applicant data, uploaded documents, passwords, API keys or database dumps.
5. Add a `.gitignore` similar to:

```gitignore
node_modules/
backend/.env
backend/uploads/*
!backend/uploads/.gitkeep
Application/*
!Application/.gitkeep
*.log
.DS_Store
Thumbs.db
```

6. In GitHub, use **Add file → Upload files**, or push with Git:

```bash
git init
git add .
git commit -m "Initial NidhiRoute AI project"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

## Project status

**Prototype ready for local demonstration and academic evaluation.** Production deployment requires the security, privacy, data-verification and operational work listed above.
