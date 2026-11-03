CREATE TABLE IF NOT EXISTS applications (
  application_id VARCHAR(40) PRIMARY KEY,
  category VARCHAR(30) NOT NULL,
  income NUMERIC(14,2) NOT NULL,
  purpose VARCHAR(30) NOT NULL,
  cost NUMERIC(14,2) NOT NULL,
  location VARCHAR(80),
  tenure INTEGER,
  scheme_key VARCHAR(80),
  scheme_name VARCHAR(180),
  match_score INTEGER,
  status VARCHAR(80) NOT NULL DEFAULT 'Profile & scheme selected',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  document_id VARCHAR(40) PRIMARY KEY,
  application_id VARCHAR(40) NOT NULL REFERENCES applications(application_id) ON DELETE CASCADE,
  document_type VARCHAR(120) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Pending Verification',
  remarks TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_documents_application ON documents(application_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);