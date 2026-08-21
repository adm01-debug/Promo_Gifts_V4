-- Migration: Add Roboflow integration credentials
-- Date: 2026-08-26
-- Purpose: Support Roboflow API for product image search

-- Insert Roboflow API key credential
INSERT INTO integration_credentials (secret_name, secret_value, description, created_at, updated_at)
VALUES (
  'ROBOFLOW_API_KEY',
  '', -- Value will be set via admin panel
  'Roboflow API key for product image detection and similarity search',
  NOW(),
  NOW()
)
ON CONFLICT (secret_name) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = NOW();

-- Optional: Insert Roboflow model configuration
INSERT INTO integration_credentials (secret_name, secret_value, description, created_at, updated_at)
VALUES (
  'ROBOFLOW_MODEL_ID',
  'product-classifier/1', -- Default model, change to your trained model
  'Roboflow model ID for product detection (format: model-name/version)',
  NOW(),
  NOW()
)
ON CONFLICT (secret_name) DO UPDATE SET
  description = EXCLUDED.description,
  secret_value = COALESCE(NULLIF(EXCLUDED.secret_value, ''), integration_credentials.secret_value),
  updated_at = NOW();

-- Insert workspace credential (optional, for hosted models)
INSERT INTO integration_credentials (secret_name, secret_value, description, created_at, updated_at)
VALUES (
  'ROBOFLOW_WORKSPACE',
  '', -- Value will be set via admin panel if using hosted models
  'Roboflow workspace name (only needed for hosted model inference)',
  NOW(),
  NOW()
)
ON CONFLICT (secret_name) DO NOTHING;
