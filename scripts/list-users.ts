
import { createClient } from '@supabase/supabase-js';
import { missingPrerequisite } from './lib/missing-prerequisite.mjs';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  missingPrerequisite('list-users', 'SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes', { exitCode: 1 });
}

const supabase = createClient(url, key);

async function listUsers() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error listing users:', error.message);
    process.exitCode = 1;
  } else {
    console.log(`Found ${data.users.length} users.`);
  }
}

listUsers();
