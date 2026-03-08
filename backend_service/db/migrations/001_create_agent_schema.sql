-- Migration: 001_create_agent_schema
-- Description: Creates database schema for fine-tuned AI agent feature
-- Tables: agent_profiles, training_jobs, model_artifacts, performance_metrics

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. agent_profiles table
CREATE TABLE agent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  task_type VARCHAR(50) NOT NULL CHECK (task_type IN (
    'Script_Analysis', 'Emotional_Alignment', 'Content_Generation',
    'Performance_Analysis', 'Growth_Tactics', 'Thumbnail_Creation'
  )),
  persona JSONB NOT NULL DEFAULT '{}',
  training_config JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'Draft' CHECK (status IN (
    'Draft', 'Training', 'Ready', 'Failed', 'Retraining'
  )),
  version INTEGER NOT NULL DEFAULT 1,
  trained_model_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE INDEX idx_agent_profiles_user ON agent_profiles(user_id);
CREATE INDEX idx_agent_profiles_status ON agent_profiles(status);
CREATE INDEX idx_agent_profiles_task_type ON agent_profiles(task_type);

-- 2. training_jobs table
CREATE TABLE training_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'Queued' CHECK (status IN (
    'Queued', 'Running', 'Completed', 'Failed', 'Cancelled'
  )),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  estimated_completion_time TIMESTAMPTZ,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  error_message TEXT,
  model_artifact_path VARCHAR(500),
  data_sources JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_training_jobs_agent ON training_jobs(agent_id);
CREATE INDEX idx_training_jobs_status ON training_jobs(status);

-- 3. model_artifacts table
CREATE TABLE model_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  model_path VARCHAR(500) NOT NULL,
  training_job_id UUID,
  performance_metrics JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id, version)
);

CREATE INDEX idx_model_artifacts_agent ON model_artifacts(agent_id);
CREATE INDEX idx_model_artifacts_active ON model_artifacts(agent_id, is_active);

-- 4. performance_metrics table
CREATE TABLE performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  request_id UUID NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  response_time_ms INTEGER NOT NULL,
  accuracy_score DECIMAL(5,4),
  task_type VARCHAR(50) NOT NULL,
  user_feedback JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_performance_metrics_agent ON performance_metrics(agent_id);
CREATE INDEX idx_performance_metrics_timestamp ON performance_metrics(timestamp);
CREATE INDEX idx_performance_metrics_agent_timestamp ON performance_metrics(agent_id, timestamp);

-- Add foreign key constraint for trained_model_id after model_artifacts is created
ALTER TABLE agent_profiles ADD CONSTRAINT agent_profiles_trained_model_id_fkey 
  FOREIGN KEY (trained_model_id) REFERENCES model_artifacts(id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_agent_profiles_updated_at
  BEFORE UPDATE ON agent_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_jobs_updated_at
  BEFORE UPDATE ON training_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
