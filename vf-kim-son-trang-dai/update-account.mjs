import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabaseUrl = 'https://txcivsdgjkmlrjxramos.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Y2l2c2RnamttbHJqeHJhbW9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODY1MDYwOCwiZXhwIjoyMDk0MjI2NjA4fQ.zJhHCyEvpJQF3yKoxokYpJlY4dJY96sJBpB3IdQ5WcQ'; 

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const adminId = '446a22a6-0893-4045-b83d-a583f3b4d7ff';
  const newName = 'HỖ TRỢ WEB';

  console.log('Updating user metadata in auth.users...');
  const { data: authData, error: authError } = await supabase.auth.admin.updateUserById(
    adminId,
    { user_metadata: { full_name: newName } }
  );

  if (authError) {
    console.error('Error updating auth user:', authError);
  } else {
    console.log('Auth user updated.');
  }

  console.log('Updating profile in public.profiles...');
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ full_name: newName, department: 'Phòng IT' })
    .eq('id', adminId);

  if (profileError) {
    console.error('Error updating profile:', profileError);
  } else {
    console.log('Profile updated successfully!');
  }
}

main();
