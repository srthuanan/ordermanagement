import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://jwvgxqrkjlbewvpkvucj.supabase.co',
  process.env.VITE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || ""
);

async function listUsers() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) console.error(error);
  else {
    const user = data.users.find(u => u.email === 'nguyenbadung2008@gmail.com');
    console.log(user);
    if(user) {
        const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
            user.id,
            { user_metadata: { ...user.user_metadata, full_name: 'NGUYỄN BÁ DŨNG', name: 'NGUYỄN BÁ DŨNG', display_name: 'NGUYỄN BÁ DŨNG' } }
        );
        if (updateError) console.error('Error updating:', updateError);
        else console.log('Updated user successfully:', updateData.user.user_metadata);
    }
  }
}
listUsers();
