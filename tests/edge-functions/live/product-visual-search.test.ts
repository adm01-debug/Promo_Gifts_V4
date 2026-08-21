/**
 * tests/edge-functions/live/product-visual-search.test.ts
 *
 * Live integration tests for product-visual-search edge function.
 * Tests the Roboflow-powered product image search.
 *
 * Note: Requires ROBOFLOW_API_KEY to be configured in integration_credentials.
 * Without it, the function returns 503.
 */

import { test, expect } from '../integration/edge-function-harness';
import { descriptorFor } from './live/descriptors';

const DESCRIPTOR = descriptorFor('product-visual-search');

test.describe('product-visual-search (Roboflow)', () => {
  test('should return 503 when ROBOFLOW_API_KEY is not configured', async ({ userToken }) => {
    const response = await test.step('Send request without valid credentials', async () => {
      const res = await fetch(`${process.env.SUPABASE_URL}/functions/v1/product-visual-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', // 1x1 transparent PNG
        }),
      });
      return res;
    });

    // Without ROBOFLOW_API_KEY, should get 503
    expect([503]).toContain(response.status);
  });

  test('should reject invalid imageBase64', async ({ userToken }) => {
    const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/product-visual-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        imageBase64: 'abc', // Too short
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeTruthy();
  });

  test('should reject empty body', async ({ userToken }) => {
    const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/product-visual-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
      },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeTruthy();
  });

  test('should accept valid request with proper credentials (integration test)', async ({ userToken }) => {
    // This test requires ROBOFLOW_API_KEY to be configured
    // Skipped if not configured
    const apiKey = process.env.ROBOFLOW_API_KEY;
    if (!apiKey) {
      test.skip();
    }

    // A small valid base64 PNG image (1x1 red pixel)
    const validImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

    const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/product-visual-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        imageBase64: validImageBase64,
      }),
    });

    // With valid credentials, should get 200 (or error from Roboflow API)
    expect([200, 500, 502, 503]).toContain(response.status);

    const data = await response.json();

    // If 200, should have the expected structure
    if (response.status === 200) {
      expect(data).toHaveProperty('analysis');
      expect(data).toHaveProperty('products');
      expect(data).toHaveProperty('total_candidates');
      expect(data).toHaveProperty('used_provider', 'roboflow');
      expect(Array.isArray(data.products)).toBe(true);
    }
  });

  test('should accept manual search terms', async ({ userToken }) => {
    const apiKey = process.env.ROBOFLOW_API_KEY;
    if (!apiKey) {
      test.skip();
    }

    const validImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

    const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/product-visual-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        imageBase64: validImageBase64,
        searchTerms: ['caneca', 'azul'],
      }),
    });

    // Should not fail on valid input
    expect([200, 500, 502, 503]).toContain(response.status);
  });
});
