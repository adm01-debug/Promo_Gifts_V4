# Roboflow Integration Setup Guide

## Overview

This document describes how to configure the Roboflow integration for product image search in the Promo Gifts v4 application.

## Prerequisites

1. **Roboflow Account**: Sign up at https://roboflow.com
2. **Trained Model** (recommended): Upload product images and train a custom model, OR use the hosted foundation model
3. **API Key**: Get your Roboflow API key from the dashboard

## Setup Steps

### 1. Get Roboflow API Key

1. Go to https://app.roboflow.com/settings/api
2. Copy your API key (format: `xxxx-xxxx-xxxx-xxxx`)

### 2. Configure Credentials in Supabase

#### Option A: Via Database (Recommended for Production)

```sql
-- Run the migration
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \
  -f supabase/migrations/20260826000000_roboflow_credentials.sql

-- Set the actual API key
UPDATE integration_credentials 
SET secret_value = 'YOUR-ROBOFLOW-API-KEY'
WHERE secret_name = 'ROBOFLOW_API_KEY';
```

#### Option B: Via Supabase Dashboard

1. Go to **SQL Editor** in Supabase Dashboard
2. Run:
```sql
INSERT INTO integration_credentials (secret_name, secret_value, description, created_at, updated_at)
VALUES (
  'ROBOFLOW_API_KEY',
  'YOUR-ACTUAL-API-KEY-HERE',
  'Roboflow API key for product image detection',
  NOW(),
  NOW()
)
ON CONFLICT (secret_name) DO UPDATE SET
  secret_value = EXCLUDED.secret_value,
  updated_at = NOW();
```

### 3. (Optional) Configure Model ID

If you have a custom trained model:

```sql
UPDATE integration_credentials 
SET secret_value = 'your-model-name/1'
WHERE secret_name = 'ROBOFLOW_MODEL_ID';
```

### 4. Deploy the Edge Function

```bash
# Using Supabase CLI
supabase functions deploy product-visual-search

# Or via GitHub Actions (automatic on push to main)
# Just push the changes and the workflow will deploy
```

### 5. Test the Integration

```bash
# Get your test user's JWT token from the dashboard
# Then test with curl:

curl -X POST "https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/product-visual-search" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageBase64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
  }'
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ROBOFLOW_API_KEY` | Your Roboflow API key | Yes |
| `ROBOFLOW_MODEL_ID` | Model identifier (e.g., `product-classifier/1`) | No (uses default) |
| `ROBOFLOW_WORKSPACE` | Workspace name (for hosted models) | No |

## API Usage

### Endpoint

```
POST /functions/v1/product-visual-search
```

### Request Body

```json
{
  "imageBase64": "base64-encoded-image-data",
  "searchTerms": ["optional", "search", "terms"],
  "categoryFilter": "optional-category-name"
}
```

### Response

```json
{
  "analysis": {
    "detected_class": "mug",
    "confidence": 0.95,
    "bounding_box": { "x": 100, "y": 50, "width": 200, "height": 200 },
    "search_terms": ["mug", "cup"]
  },
  "products": [
    {
      "id": "uuid",
      "name": "Caneca Térmica Personalizada",
      "sku": "CAN-001",
      "category_name": "Canecas",
      "price": 25.90,
      "images": ["https://cdn.example.com/image.jpg"],
      "relevance": 0.95,
      "content_hash": "sha256-hash",
      "match_type": "exact_hash",
      "match_reason": "Imagem idêntica encontrada no catálogo"
    }
  ],
  "total_candidates": 10,
  "used_provider": "roboflow"
}
```

## Troubleshooting

### 503 - ROBOFLOW_NOT_CONFIGURED

**Cause**: `ROBOFLOW_API_KEY` is not configured.

**Solution**: 
1. Check that the credential exists in `integration_credentials` table
2. Verify the value is not empty
3. If using Edge Function secrets, ensure the secret is set correctly

### 500 - Roboflow API Error

**Cause**: Roboflow API returned an error.

**Solution**:
1. Check the API key is valid
2. Verify the model ID exists
3. Check Roboflow dashboard for account status

### Low Match Quality

**Cause**: Foundation model doesn't recognize your products.

**Solution**:
1. Train a custom model with your product images
2. Use the `searchTerms` parameter to guide the search
3. Consider improving product descriptions in the database

## Cost Estimation

Roboflow pricing varies by usage:
- Free tier: 3,000 inferences/month
- Paid plans: Starting at $10/month for more inferences

Monitor usage at: https://app.roboflow.com/settings/billing

## Security Notes

1. **API Key**: Never commit API keys to git
2. **Image URLs**: The function validates image URLs before fetching (SSRF protection)
3. **Rate Limiting**: Built-in rate limiting (20 requests/minute/user)
4. **Bot Protection**: Built-in protection against automated abuse
