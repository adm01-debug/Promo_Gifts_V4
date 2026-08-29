#!/usr/bin/env node
/**
 * scripts/verify-roboflow-setup.js
 *
 * Verifies the Roboflow integration setup:
 * 1. Database connectivity
 * 2. Credentials in integration_credentials
 * 3. Edge function deployment status
 *
 * Usage:
 *   node scripts/verify-roboflow-setup.js
 *
 * Required environment variables:
 *   SUPABASE_URL - e.g., https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key for admin access
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  if (!SUPABASE_URL) console.error('   - SUPABASE_URL');
  if (!SUPABASE_SERVICE_KEY) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nUsage:');
  console.error('  SUPABASE_URL=https://xxx.supabase.co \\');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=xxx \\');
  console.error('  node scripts/verify-roboflow-setup.js');
  process.exit(1);
}

async function querySupabase(sql, params = []) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({
      query: sql,
      params: params
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Database error: ${response.status} - ${text}`);
  }

  return await response.json();
}

async function testDatabaseConnection() {
  console.log('\n📡 Testing database connection...');

  try {
    const result = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id&limit=1`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });

    if (result.ok) {
      console.log('✅ Database connection successful');
      return true;
    } else {
      console.error(`❌ Database connection failed: ${result.status}`);
      return false;
    }
  } catch (err) {
    console.error(`❌ Database connection error: ${err.message}`);
    return false;
  }
}

async function checkRoboflowCredentials() {
  console.log('\n🔐 Checking Roboflow credentials...');

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/integration_credentials?secret_name=eq.ROBOFLOW_API_KEY&select=secret_name,description,updated_at`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'resolution=merge-headers'
        },
      }
    );

    if (!response.ok) {
      // Table might not exist or no rows
      console.log('⚠️  Could not query integration_credentials table');
      console.log('   The table may need to be created. Run the migration:');
      console.log('   supabase/migrations/20260826000000_roboflow_credentials.sql');
      return false;
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const cred = data[0];
      console.log(`✅ ROBOFLOW_API_KEY credential exists`);
      console.log(`   Description: ${cred.description || 'none'}`);
      console.log(`   Updated: ${cred.updated_at || 'never'}`);
      return true;
    } else {
      console.log('⚠️  ROBOFLOW_API_KEY credential not found');
      console.log('   Run the migration or add via SQL:');
      console.log('   INSERT INTO integration_credentials (secret_name, secret_value, description)');
      console.log("   VALUES ('ROBOFLOW_API_KEY', 'your-api-key-here', 'Roboflow API key');");
      return false;
    }
  } catch (err) {
    console.error(`❌ Error checking credentials: ${err.message}`);
    return false;
  }
}

async function checkProductImagesTable() {
  console.log('\n📦 Checking product_images table...');

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/product_images?select=id,content_hash&limit=5`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    if (!response.ok) {
      console.error(`❌ product_images table check failed: ${response.status}`);
      return false;
    }

    const data = await response.json();
    const hasHashes = data.some(row => row.content_hash);

    if (hasHashes) {
      console.log('✅ product_images table exists with content_hash column');
      return true;
    } else {
      console.log('⚠️  product_images table exists but no content_hash values found');
      console.log('   Run hash-product-images cron job to compute hashes');
      return false;
    }
  } catch (err) {
    console.error(`❌ Error checking table: ${err.message}`);
    return false;
  }
}

async function checkEdgeFunction() {
  console.log('\n🚀 Checking edge function deployment...');

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/product-visual-search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer fake-token', // Will get 401 but we just check if function exists
        },
        body: JSON.stringify({ imageBase64: 'test' }),
      }
    );

    // We expect 401 (auth) or 400 (validation) or 503 (no API key), but NOT 404
    if (response.status === 404) {
      console.log('⚠️  product-visual-search function not deployed');
      console.log('   Deploy with: supabase functions deploy product-visual-search');
      return false;
    } else if ([400, 401, 503].includes(response.status)) {
      console.log('✅ product-visual-search function is deployed');
      const data = await response.json();
      if (response.status === 503) {
        console.log('   Status: ' + (data.error || 'Roboflow not configured'));
      }
      return true;
    } else {
      console.log(`⚠️  Unexpected status: ${response.status}`);
      return false;
    }
  } catch (err) {
    if (err.message.includes('fetch')) {
      console.log('⚠️  Could not reach edge function');
      console.log('   This may be a network issue or the function is not deployed');
    } else {
      console.error(`❌ Error checking function: ${err.message}`);
    }
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🔍 Roboflow Integration Verification');
  console.log('='.repeat(60));
  console.log(`\nProject: ${SUPABASE_URL}`);

  const results = {
    database: await testDatabaseConnection(),
    credentials: await checkRoboflowCredentials(),
    table: await checkProductImagesTable(),
    edgeFunction: await checkEdgeFunction(),
  };

  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary');
  console.log('='.repeat(60));

  const allPassed = Object.values(results).every(r => r);

  if (allPassed) {
    console.log('\n✅ All checks passed! Roboflow integration is ready.');
    console.log('\nNext steps:');
    console.log('1. Set your Roboflow API key in the database');
    console.log('2. Test the function with:');
    console.log('   curl -X POST "..." -H "Authorization: Bearer $TOKEN" \\');
    console.log('     -d \'{"imageBase64": "..."}\'');
  } else {
    console.log('\n⚠️  Some checks failed. Review the output above.');
    console.log('\nRequired setup steps:');
    if (!results.database) {
      console.log('1. ❌ Fix database connectivity');
    }
    if (!results.credentials) {
      console.log('2. ❌ Add ROBOFLOW_API_KEY to integration_credentials');
    }
    if (!results.table) {
      console.log('3. ❌ Ensure product_images has content_hash values');
    }
    if (!results.edgeFunction) {
      console.log('4. ❌ Deploy product-visual-search edge function');
    }
  }

  console.log('\n📖 See docs/ROBOFLOW_SETUP.md for detailed instructions.');

  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
