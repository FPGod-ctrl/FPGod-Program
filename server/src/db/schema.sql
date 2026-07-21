-- FPGod database schema
-- Idempotent: safe to run repeatedly (CREATE ... IF NOT EXISTS).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()

-- Auto-update updated_at on row change.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- Client groups (couples, families) — a client may belong to one group.
-- =====================================================================
CREATE TABLE IF NOT EXISTS client_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  group_type  TEXT NOT NULL DEFAULT 'family'
                CHECK (group_type IN ('couple', 'family', 'household', 'other')),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- Clients
-- =====================================================================
CREATE TABLE IF NOT EXISTS clients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID REFERENCES client_groups(id) ON DELETE SET NULL,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  address       TEXT,
  date_of_birth DATE,
  occupation    TEXT,
  risk_profile  TEXT CHECK (risk_profile IN
                  ('conservative', 'moderate', 'balanced', 'growth', 'aggressive')),
  annual_income NUMERIC(14,2),
  net_worth     NUMERIC(14,2),
  -- Optional partner / spouse, so one client file can represent a couple.
  partner_first_name    TEXT,
  partner_last_name     TEXT,
  partner_email         TEXT,
  partner_phone         TEXT,
  partner_date_of_birth DATE,
  partner_occupation    TEXT,
  partner_annual_income NUMERIC(14,2),
  partner_risk_profile  TEXT,
  notes         TEXT,
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('prospect', 'active', 'inactive', 'archived')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clients_group ON clients(group_id);
CREATE INDEX IF NOT EXISTS idx_clients_name  ON clients(last_name, first_name);
-- Add columns on existing databases (CREATE TABLE above won't alter them).
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS partner_first_name    TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS partner_last_name     TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS partner_email         TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS partner_phone         TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS partner_date_of_birth DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS partner_occupation    TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS partner_annual_income NUMERIC(14,2);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS partner_risk_profile  TEXT;

-- =====================================================================
-- Documents (uploaded PDFs / Word docs). Belong to a client or a group.
-- =====================================================================
CREATE TABLE IF NOT EXISTS documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE,
  group_id        UUID REFERENCES client_groups(id) ON DELETE CASCADE,
  original_name   TEXT NOT NULL,
  storage_key     TEXT NOT NULL,        -- path/key returned by the storage driver
  doc_type        TEXT NOT NULL DEFAULT 'other'
                    CHECK (doc_type IN
                      ('client_profile', 'statement', 'tax', 'identification',
                       'insurance', 'estate', 'plan', 'other')),
  mime_type       TEXT,
  size_bytes      BIGINT,
  extracted_text  TEXT,                 -- populated after text extraction
  scan_status     TEXT NOT NULL DEFAULT 'pending'
                    CHECK (scan_status IN ('pending', 'processing', 'done', 'failed')),
  scan_result     JSONB,                -- structured fields extracted by AI
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_group  ON documents(group_id);

-- Keep the doc_type whitelist current on existing databases (CREATE TABLE
-- IF NOT EXISTS above won't alter an already-created table).
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_doc_type_check;
ALTER TABLE documents ADD CONSTRAINT documents_doc_type_check
  CHECK (doc_type IN
    ('client_profile', 'statement', 'tax', 'identification',
     'insurance', 'estate', 'plan', 'other'));

-- =====================================================================
-- Current investments (existing holdings)
-- =====================================================================
CREATE TABLE IF NOT EXISTS current_investments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE,
  group_id        UUID REFERENCES client_groups(id) ON DELETE CASCADE,
  fund_name       TEXT NOT NULL,
  ticker          TEXT,
  account_type    TEXT,                 -- e.g. ISA, SIPP, GIA, 401k, IRA
  balance         NUMERIC(14,2) NOT NULL DEFAULT 0,
  allocation_pct  NUMERIC(6,3),         -- 0..100
  asset_class     TEXT,                 -- equity, bond, cash, property, alt...
  risk_profile    TEXT CHECK (risk_profile IN
                    ('conservative', 'moderate', 'balanced', 'growth', 'aggressive')),
  fee_pct         NUMERIC(6,3),         -- ongoing charge, % per year
  provider        TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_current_inv_client ON current_investments(client_id);
CREATE INDEX IF NOT EXISTS idx_current_inv_group  ON current_investments(group_id);

-- =====================================================================
-- Recommended investments (advisor's managed-fund suggestions)
-- =====================================================================
CREATE TABLE IF NOT EXISTS recommended_investments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE,
  group_id        UUID REFERENCES client_groups(id) ON DELETE CASCADE,
  plan_id         UUID,                 -- optional link to a financial plan
  fund_name       TEXT NOT NULL,
  ticker          TEXT,
  account_type    TEXT,
  target_amount   NUMERIC(14,2),
  allocation_pct  NUMERIC(6,3),
  asset_class     TEXT,
  risk_profile    TEXT CHECK (risk_profile IN
                    ('conservative', 'moderate', 'balanced', 'growth', 'aggressive')),
  fee_pct         NUMERIC(6,3),
  provider        TEXT,
  rationale       TEXT,                 -- why this fund is recommended
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recommended_inv_client ON recommended_investments(client_id);
CREATE INDEX IF NOT EXISTS idx_recommended_inv_plan   ON recommended_investments(plan_id);

-- =====================================================================
-- Financial plans
-- =====================================================================
CREATE TABLE IF NOT EXISTS financial_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID REFERENCES clients(id) ON DELETE CASCADE,
  group_id      UUID REFERENCES client_groups(id) ON DELETE CASCADE,
  title         TEXT NOT NULL DEFAULT 'Financial Plan',
  status        TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'in_review', 'final', 'delivered')),
  content       TEXT,                   -- markdown body of the plan
  summary       TEXT,
  metadata      JSONB DEFAULT '{}'::jsonb,
  completeness  INTEGER DEFAULT 0 CHECK (completeness BETWEEN 0 AND 100),
  generated_by_ai BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plans_client ON financial_plans(client_id);
CREATE INDEX IF NOT EXISTS idx_plans_group  ON financial_plans(group_id);

-- recommended_investments.plan_id references financial_plans (added after both exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_recommended_plan'
  ) THEN
    ALTER TABLE recommended_investments
      ADD CONSTRAINT fk_recommended_plan
      FOREIGN KEY (plan_id) REFERENCES financial_plans(id) ON DELETE SET NULL;
  END IF;
END$$;

-- =====================================================================
-- Meeting transcripts
-- =====================================================================
CREATE TABLE IF NOT EXISTS meeting_transcripts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID REFERENCES clients(id) ON DELETE CASCADE,
  group_id      UUID REFERENCES client_groups(id) ON DELETE CASCADE,
  title         TEXT NOT NULL DEFAULT 'Meeting',
  meeting_date  DATE,
  content       TEXT NOT NULL,          -- raw transcript text
  summary       TEXT,                   -- AI-generated summary (optional)
  action_items  JSONB DEFAULT '[]'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_transcripts_client ON meeting_transcripts(client_id);

-- =====================================================================
-- Follow-up emails
-- =====================================================================
CREATE TABLE IF NOT EXISTS followup_emails (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID REFERENCES clients(id) ON DELETE CASCADE,
  group_id      UUID REFERENCES client_groups(id) ON DELETE CASCADE,
  transcript_id UUID REFERENCES meeting_transcripts(id) ON DELETE SET NULL,
  subject       TEXT,
  body          TEXT,
  status        TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'approved', 'sent')),
  generated_by_ai BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_emails_client     ON followup_emails(client_id);
CREATE INDEX IF NOT EXISTS idx_emails_transcript ON followup_emails(transcript_id);

-- =====================================================================
-- Training data — historical plans & emails the AI learns strategies from
-- =====================================================================
CREATE TABLE IF NOT EXISTS training_data (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        TEXT NOT NULL DEFAULT 'plan'
                CHECK (kind IN ('plan', 'email')),
  title       TEXT,
  content     TEXT NOT NULL,
  tags        TEXT[] DEFAULT '{}',
  metadata    JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_training_kind ON training_data(kind);

-- =====================================================================
-- Chat messages — refinement conversations attached to a plan or email
-- =====================================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type   TEXT NOT NULL CHECK (target_type IN ('plan', 'email')),
  target_id     UUID NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_target ON chat_messages(target_type, target_id);

-- =====================================================================
-- Assets — itemized assets (cash, property, etc.). Investment holdings are
-- tracked separately in current_investments and folded in by the UI.
-- =====================================================================
CREATE TABLE IF NOT EXISTS assets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID REFERENCES clients(id) ON DELETE CASCADE,
  group_id    UUID REFERENCES client_groups(id) ON DELETE CASCADE,
  category    TEXT NOT NULL DEFAULT 'other'
                CHECK (category IN
                  ('cash', 'property', 'vehicle', 'business', 'investment',
                   'superannuation', 'collectible', 'other')),
  name        TEXT NOT NULL,
  value       NUMERIC(14,2) NOT NULL DEFAULT 0,
  owner       TEXT,                    -- client / partner / joint
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_assets_client ON assets(client_id);

-- =====================================================================
-- Liabilities / debts
-- =====================================================================
CREATE TABLE IF NOT EXISTS liabilities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE,
  group_id        UUID REFERENCES client_groups(id) ON DELETE CASCADE,
  liability_type  TEXT NOT NULL DEFAULT 'other'
                    CHECK (liability_type IN
                      ('mortgage', 'personal_loan', 'auto_loan', 'credit_card',
                       'student_loan', 'tax', 'business_loan', 'other')),
  name            TEXT NOT NULL,
  balance         NUMERIC(14,2) NOT NULL DEFAULT 0,
  interest_rate   NUMERIC(6,3),            -- annual %, optional
  monthly_payment NUMERIC(14,2),
  lender          TEXT,
  owner           TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_liabilities_client ON liabilities(client_id);

-- =====================================================================
-- Income sources
-- =====================================================================
CREATE TABLE IF NOT EXISTS income_sources (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID REFERENCES clients(id) ON DELETE CASCADE,
  group_id    UUID REFERENCES client_groups(id) ON DELETE CASCADE,
  income_type TEXT NOT NULL DEFAULT 'other'
                CHECK (income_type IN
                  ('salary', 'rental', 'pension', 'dividends', 'business',
                   'government', 'trust', 'other')),
  name        TEXT NOT NULL,
  amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
  frequency   TEXT NOT NULL DEFAULT 'annual'
                CHECK (frequency IN ('weekly', 'fortnightly', 'monthly', 'quarterly', 'annual')),
  owner       TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_income_client ON income_sources(client_id);

-- =====================================================================
-- Expenses
-- =====================================================================
CREATE TABLE IF NOT EXISTS expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID REFERENCES clients(id) ON DELETE CASCADE,
  group_id    UUID REFERENCES client_groups(id) ON DELETE CASCADE,
  category    TEXT NOT NULL DEFAULT 'other'
                CHECK (category IN
                  ('housing', 'utilities', 'living', 'transport', 'insurance',
                   'education', 'discretionary', 'other')),
  name        TEXT NOT NULL,
  amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
  frequency   TEXT NOT NULL DEFAULT 'monthly'
                CHECK (frequency IN ('weekly', 'fortnightly', 'monthly', 'quarterly', 'annual')),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expenses_client ON expenses(client_id);

-- =====================================================================
-- Insurance policies
-- =====================================================================
CREATE TABLE IF NOT EXISTS insurance_policies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID REFERENCES clients(id) ON DELETE CASCADE,
  group_id      UUID REFERENCES client_groups(id) ON DELETE CASCADE,
  policy_type   TEXT NOT NULL DEFAULT 'other'
                  CHECK (policy_type IN
                    ('life', 'tpd', 'income_protection', 'trauma', 'health',
                     'home', 'auto', 'other')),
  provider      TEXT,
  cover_amount  NUMERIC(14,2),
  premium       NUMERIC(14,2),
  frequency     TEXT DEFAULT 'annual'
                  CHECK (frequency IN ('weekly', 'fortnightly', 'monthly', 'quarterly', 'annual')),
  policy_number TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_insurance_client ON insurance_policies(client_id);

-- =====================================================================
-- Financial goals
-- =====================================================================
CREATE TABLE IF NOT EXISTS financial_goals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      UUID REFERENCES clients(id) ON DELETE CASCADE,
  group_id       UUID REFERENCES client_groups(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  target_amount  NUMERIC(14,2),
  current_amount NUMERIC(14,2) DEFAULT 0,
  target_date    DATE,
  priority       TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_goals_client ON financial_goals(client_id);

-- =====================================================================
-- Estate planning — one row per client (wills, POA, testamentary trust).
-- =====================================================================
CREATE TABLE IF NOT EXISTS estate_plans (
  client_id              UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  has_will               BOOLEAN NOT NULL DEFAULT false,
  will_date              DATE,
  will_location          TEXT,
  executor               TEXT,
  has_poa                BOOLEAN NOT NULL DEFAULT false,
  poa_type               TEXT CHECK (poa_type IN ('financial', 'medical', 'both', 'enduring')),
  poa_attorney           TEXT,
  has_testamentary_trust BOOLEAN NOT NULL DEFAULT false,
  trust_details          TEXT,             -- family ongoing income arrangements
  beneficiaries          TEXT,
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- updated_at triggers
-- =====================================================================
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'client_groups','clients','documents','current_investments',
    'recommended_investments','financial_plans','meeting_transcripts',
    'followup_emails','training_data','assets','liabilities',
    'income_sources','expenses','insurance_policies','financial_goals',
    'estate_plans'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'trg_' || t || '_updated_at'
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON %1$s
           FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t);
    END IF;
  END LOOP;
END$$;
