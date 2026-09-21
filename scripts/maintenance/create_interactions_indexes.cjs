const fs = require('fs');
const https = require('https');

const envContent = fs.readFileSync('.env', 'utf8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/);
const url = (urlMatch ? urlMatch[1].trim() : '').replace('https://', '');
const key = keyMatch ? keyMatch[1].trim() : '';

// Check if there is a service key or db password in .env.local or .env.production
let serviceKey = '';
try {
  const localEnv = fs.readFileSync('.env.local', 'utf8');
  const sm = localEnv.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
  if (sm) serviceKey = sm[1].trim();
} catch (_) {}

console.log('Host:', url);
console.log('Has service key:', !!serviceKey);

// Try to apply via Supabase Management API
// Note: requires SUPABASE_ACCESS_TOKEN, not available here
// Fallback: print instructions
console.log('\n=== INSTRUCTIONS ===');
console.log('Vì không có service role key, hãy chạy SQL sau trong Supabase Dashboard:');
console.log('URL: https://supabase.com/dashboard/project/jwvgxqrkjlbewvpkvucj/sql/new\n');

const sql = `-- Index performance cho bảng interactions
CREATE INDEX IF NOT EXISTS idx_interactions_target_id ON public.interactions (target_id) WHERE target_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_interactions_category_target_id ON public.interactions (category, target_id) WHERE target_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_interactions_created_at_desc ON public.interactions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_metadata_order_number ON public.interactions ((metadata->>'orderNumber')) WHERE metadata->>'orderNumber' IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_interactions_notif_recipient ON public.interactions (category, recipient, is_read) WHERE category = 'NOTIFICATION';`;

console.log(sql);
