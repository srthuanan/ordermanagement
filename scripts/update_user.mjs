import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jwvgxqrkjlbewvpkvucj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU'
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
