import fs from 'fs/promises';
import path from 'path';

const projectRef = process.env.SUPABASE_PROJECT_REF;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const files = process.argv.slice(2);

if (!projectRef) {
  console.error('Missing SUPABASE_PROJECT_REF');
  process.exit(1);
}

if (!accessToken) {
  console.error('Missing SUPABASE_ACCESS_TOKEN');
  process.exit(1);
}

if (files.length === 0) {
  console.error('Usage: node scripts/execute_remote_sql.mjs <sql-file> [more-files]');
  process.exit(1);
}

for (const file of files) {
  const absolutePath = path.resolve(file);
  const query = await fs.readFile(absolutePath, 'utf8');

  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Failed: ${file}`);
    console.error(body);
    process.exit(1);
  }

  console.log(`Applied: ${file}`);
}
