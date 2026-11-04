import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jwvgxqrkjlbewvpkvucj.supabase.co',
  process.env.VITE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || ""
);

async function update() {
  const { data, error } = await supabase.auth.admin.updateUserById(
    '7c48f87e-793f-4fc9-826f-935ea9cf7fd3',
    { user_metadata: { full_name: 'NGUYỄN BÁ DŨNG', display_name: 'NGUYỄN BÁ DŨNG', name: 'NGUYỄN BÁ DŨNG' } }
  );
  if (error) console.error('Error:', error);
  else console.log('Updated user successfully:', data.user.user_metadata);
}

update();
