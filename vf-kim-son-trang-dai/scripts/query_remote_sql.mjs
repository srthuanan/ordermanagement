const projectRef = process.env.SUPABASE_PROJECT_REF;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const query = process.argv.slice(2).join(' ').trim();

if (!projectRef) {
  console.error('Missing SUPABASE_PROJECT_REF');
  process.exit(1);
}

if (!accessToken) {
  console.error('Missing SUPABASE_ACCESS_TOKEN');
  process.exit(1);
}

if (!query) {
  console.error('Usage: node scripts/query_remote_sql.mjs <sql>');
  process.exit(1);
}

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ query })
});

if (!response.ok) {
  console.error(await response.text());
  process.exit(1);
}

console.log(await response.text());
