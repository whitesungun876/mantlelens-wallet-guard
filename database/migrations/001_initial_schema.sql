-- MantleLens Wallet Guard initial PostgreSQL schema.
-- migrate:up

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE wallet_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id TEXT NOT NULL UNIQUE,
  schema_version TEXT NOT NULL DEFAULT 'mantlelens.wallet_assessment.v1',
  chain_id INTEGER NOT NULL CHECK (chain_id = 5000),
  wallet_address TEXT NOT NULL,
  wallet_hash TEXT NOT NULL,
  wallet_risk_score NUMERIC(5,2) NOT NULL CHECK (wallet_risk_score >= 0 AND wallet_risk_score <= 100),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('Low', 'Moderate', 'High', 'Critical')),
  data_confidence NUMERIC(4,3) NOT NULL CHECK (data_confidence >= 0 AND data_confidence <= 1),
  data_mode TEXT NOT NULL CHECK (data_mode IN ('live', 'demo', 'replay')),
  data_completeness JSONB NOT NULL,
  sub_scores JSONB NOT NULL,
  top_risks_hash TEXT NOT NULL,
  evidence_bundle_hash TEXT NOT NULL,
  recommendation_hash TEXT NOT NULL,
  assessment_hash TEXT UNIQUE,
  assessment_uri TEXT,
  decision_type TEXT NOT NULL CHECK (
    decision_type IN (
      'SAFE',
      'WATCH',
      'REVIEW_APPROVAL',
      'FLAG_SUSPICIOUS_TRANSFER',
      'SIMULATE_PORTFOLIO_CHANGE',
      'PAUSE',
      'SIMULATE_ONLY'
    )
  ),
  action_type TEXT NOT NULL CHECK (
    action_type IN (
      'NO_ACTION',
      'REVIEW_APPROVAL',
      'REVIEW_SPENDER',
      'MARK_ADDRESS_SUSPICIOUS',
      'SIMULATE_REVOKE_APPROVAL',
      'SIMULATE_REDUCE_METH_INCREASE_MUSD',
      'REVIEW_DEFI_EXPOSURE',
      'RECORD_ASSESSMENT_ONLY'
    )
  ),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'evaluated', 'ready_to_commit', 'queued', 'pending_retry', 'recorded', 'mocked', 'failed')
  ),
  real_execution_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE assessment_subscores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id TEXT NOT NULL REFERENCES wallet_assessments(assessment_id) ON DELETE CASCADE,
  dimension TEXT NOT NULL CHECK (
    dimension IN (
      'approvalRisk',
      'suspiciousTransferRisk',
      'assetConcentrationRisk',
      'defiExposureStub',
      'rwaYieldRisk'
    )
  ),
  score NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  confidence NUMERIC(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  data_quality TEXT NOT NULL CHECK (data_quality IN ('fresh', 'stale', 'mock', 'missing', 'conflict')),
  rationale TEXT NOT NULL,
  evidence_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, dimension)
);

CREATE TABLE assessment_top_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id TEXT NOT NULL REFERENCES wallet_assessments(assessment_id) ON DELETE CASCADE,
  risk_id TEXT NOT NULL,
  risk_type TEXT NOT NULL CHECK (risk_type IN ('approval', 'transfer', 'concentration', 'defi', 'rwa_yield', 'data_quality')),
  rank INTEGER NOT NULL CHECK (rank BETWEEN 1 AND 3),
  severity TEXT NOT NULL CHECK (severity IN ('Low', 'Moderate', 'High', 'Critical')),
  claim_text TEXT NOT NULL,
  score_impact NUMERIC(5,2) NOT NULL CHECK (score_impact >= 0 AND score_impact <= 100),
  evidence_ids TEXT[] NOT NULL,
  limitations TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, risk_id),
  UNIQUE (assessment_id, rank),
  CHECK (cardinality(evidence_ids) >= 1)
);

CREATE TABLE evidence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id TEXT NOT NULL UNIQUE,
  assessment_id TEXT REFERENCES wallet_assessments(assessment_id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL CHECK (
    evidence_type IN (
      'approval',
      'transfer',
      'balance',
      'price',
      'token_security',
      'spender_label',
      'defi_position',
      'rwa_yield',
      'rule',
      'simulation',
      'onchain_record'
    )
  ),
  claim_text TEXT NOT NULL,
  source TEXT NOT NULL,
  endpoint TEXT,
  raw_data JSONB NOT NULL,
  tx_hash TEXT,
  observed_at TIMESTAMPTZ NOT NULL,
  evidence_hash TEXT NOT NULL UNIQUE,
  data_quality TEXT NOT NULL CHECK (data_quality IN ('fresh', 'stale', 'mock', 'missing', 'conflict')),
  limitation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE simulation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id TEXT NOT NULL UNIQUE,
  assessment_id TEXT NOT NULL REFERENCES wallet_assessments(assessment_id) ON DELETE CASCADE,
  simulation_type TEXT NOT NULL CHECK (simulation_type IN ('approval_revoke_impact', 'portfolio_adjustment')),
  execution_mode TEXT NOT NULL DEFAULT 'simulation_only' CHECK (execution_mode = 'simulation_only'),
  before_scores JSONB NOT NULL,
  after_scores JSONB NOT NULL,
  summary TEXT NOT NULL,
  evidence_ids TEXT[] NOT NULL DEFAULT '{}',
  simulation_hash TEXT NOT NULL,
  trace_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE benchmark_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id TEXT NOT NULL REFERENCES wallet_assessments(assessment_id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  wallet_hash TEXT NOT NULL,
  wallet_risk_score NUMERIC(5,2) NOT NULL CHECK (wallet_risk_score >= 0 AND wallet_risk_score <= 100),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('Low', 'Moderate', 'High', 'Critical')),
  data_confidence NUMERIC(4,3) NOT NULL CHECK (data_confidence >= 0 AND data_confidence <= 1),
  top_risks_hash TEXT NOT NULL,
  evidence_bundle_hash TEXT NOT NULL,
  recommendation_hash TEXT NOT NULL,
  simulation_outcome_hash TEXT,
  data_mode TEXT NOT NULL CHECK (data_mode IN ('live', 'demo', 'replay')),
  decision_type TEXT NOT NULL,
  action_type TEXT NOT NULL,
  assessment_uri TEXT,
  assessment_hash TEXT NOT NULL,
  assessment_tx TEXT,
  outcome_hash TEXT,
  outcome_tx TEXT,
  user_response TEXT CHECK (user_response IN ('viewed', 'simulated', 'ignored', 'marked_safe')),
  outcome_status TEXT CHECK (outcome_status IN ('pending', 'risk_reduced', 'unchanged')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE source_availability_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id TEXT REFERENCES wallet_assessments(assessment_id) ON DELETE CASCADE,
  wallet_hash TEXT NOT NULL,
  source_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'partial', 'unavailable')),
  limitation TEXT,
  checked_at TIMESTAMPTZ NOT NULL,
  raw_status JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id TEXT NOT NULL UNIQUE,
  assessment_id TEXT REFERENCES wallet_assessments(assessment_id) ON DELETE SET NULL,
  wallet_hash TEXT NOT NULL,
  initial_state TEXT NOT NULL,
  final_state TEXT,
  step_count INTEGER NOT NULL DEFAULT 0 CHECK (step_count >= 0 AND step_count <= 10),
  data_mode TEXT NOT NULL CHECK (data_mode IN ('live', 'demo', 'replay')),
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'pending_retry')),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id TEXT NOT NULL UNIQUE,
  run_id TEXT NOT NULL REFERENCES agent_runs(run_id) ON DELETE CASCADE,
  assessment_id TEXT REFERENCES wallet_assessments(assessment_id) ON DELETE SET NULL,
  workflow_name TEXT NOT NULL CHECK (
    workflow_name IN (
      'ScanWorkflow',
      'AssessmentWorkflow',
      'ExplanationWorkflow',
      'SimulationWorkflow',
      'CommitWorkflow',
      'ReplayWorkflow'
    )
  ),
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'skipped')),
  input_snapshot JSONB NOT NULL DEFAULT '{}',
  output_snapshot JSONB NOT NULL DEFAULT '{}',
  duration_ms INTEGER CHECK (duration_ms >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tool_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_call_id TEXT NOT NULL UNIQUE,
  run_id TEXT NOT NULL REFERENCES agent_runs(run_id) ON DELETE CASCADE,
  workflow_run_id TEXT REFERENCES workflow_runs(workflow_run_id) ON DELETE SET NULL,
  tool_name TEXT NOT NULL,
  tool_version TEXT NOT NULL DEFAULT 'v1',
  side_effect_level TEXT NOT NULL CHECK (side_effect_level IN ('read_only', 'analytical', 'state_changing')),
  required_state TEXT NOT NULL,
  arguments_hash TEXT NOT NULL,
  input JSONB NOT NULL DEFAULT '{}',
  output JSONB NOT NULL DEFAULT '{}',
  source_status TEXT CHECK (source_status IN ('available', 'partial', 'unavailable')),
  idempotency_key TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'blocked')),
  duration_ms INTEGER CHECK (duration_ms >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE policy_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_event_id TEXT NOT NULL UNIQUE,
  run_id TEXT NOT NULL REFERENCES agent_runs(run_id) ON DELETE CASCADE,
  workflow_run_id TEXT REFERENCES workflow_runs(workflow_run_id) ON DELETE SET NULL,
  tool_call_id TEXT REFERENCES tool_calls(tool_call_id) ON DELETE SET NULL,
  policy_name TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('allow', 'block', 'fallback', 'retry', 'pause')),
  reason TEXT NOT NULL,
  from_state TEXT,
  to_state TEXT,
  trace_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wallet_assessments_wallet_hash ON wallet_assessments(wallet_hash);
CREATE INDEX idx_wallet_assessments_created_at ON wallet_assessments(created_at DESC);
CREATE INDEX idx_evidence_items_assessment ON evidence_items(assessment_id);
CREATE INDEX idx_benchmark_records_wallet_hash ON benchmark_records(wallet_hash, created_at DESC);
CREATE INDEX idx_source_availability_assessment ON source_availability_snapshots(assessment_id);
CREATE INDEX idx_agent_runs_assessment ON agent_runs(assessment_id);
CREATE INDEX idx_workflow_runs_run ON workflow_runs(run_id);
CREATE INDEX idx_tool_calls_run_tool ON tool_calls(run_id, tool_name);
CREATE INDEX idx_policy_events_run ON policy_events(run_id);

-- migrate:down

DROP TABLE IF EXISTS policy_events;
DROP TABLE IF EXISTS tool_calls;
DROP TABLE IF EXISTS workflow_runs;
DROP TABLE IF EXISTS agent_runs;
DROP TABLE IF EXISTS source_availability_snapshots;
DROP TABLE IF EXISTS benchmark_records;
DROP TABLE IF EXISTS simulation_runs;
DROP TABLE IF EXISTS evidence_items;
DROP TABLE IF EXISTS assessment_top_risks;
DROP TABLE IF EXISTS assessment_subscores;
DROP TABLE IF EXISTS wallet_assessments;
