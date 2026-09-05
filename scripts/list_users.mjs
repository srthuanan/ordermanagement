import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://jwvgxqrkjlbewvpkvucj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU'
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
