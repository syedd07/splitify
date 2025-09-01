// Lightweight daily heartbeat to prevent Supabase free project from pausing.
// Requirements (set as GitHub Secrets / env):
//   SUPABASE_URL          e.g. https://xyzcompanyabcd.supabase.co
//   SUPABASE_ANON_KEY     anonymous key (or service role key if you prefer)
//   HEARTBEAT_TABLE       (optional) a small table name, defaults to 'profiles'
// This script performs a tiny SELECT and logs minimal info.

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const table = process.env.HEARTBEAT_TABLE || 'profiles';

if (!url || !anonKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.');
  process.exit(0); // exit gracefully so workflow does not fail daily
}

// Build request
const endpoint = `${url.replace(/\/$/, '')}/rest/v1/${table}?select=id&limit=1`;

async function heartbeat() {
  try {
    const res = await fetch(endpoint, {
      headers: {
        apikey: anonKey,
        Accept: 'application/json'
      }
    });
    console.log('Heartbeat status:', res.status, res.statusText);
    if (!res.ok) {
      const text = await res.text();
      console.log('Response body:', text);
    }
  } catch (e) {
    console.error('Heartbeat error:', e.message);
  }
}

heartbeat();
