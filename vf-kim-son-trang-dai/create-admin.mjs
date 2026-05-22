import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://txcivsdgjkmlrjxramos.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Y2l2c2RnamttbHJqeHJhbW9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODY1MDYwOCwiZXhwIjoyMDk0MjI2NjA4fQ.zJhHCyEvpJQF3yKoxokYpJlY4dJY96sJBpB3IdQ5WcQ'; 

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const email = 'ngocanh1995.10@gmail.com';
  const fullName = 'SALE ADMIN';
  
  console.log('Creating user...');
  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: 'Password123!',
    email_confirm: true,
    user_metadata: { full_name: fullName, role: 'admin', invited_by_admin: true }
  });

  if (createError) {
    console.error('Error creating user:', createError);
    return;
  }

  const userId = createData.user.id;
  console.log('User created with ID:', userId);

  console.log('Updating role in public.profiles to admin...');
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      full_name: fullName, 
      role: 'admin',
      department: 'Sale Admin'
    })
    .eq('id', userId);

  if (updateError) {
    console.error('Error updating profile:', updateError);
  } else {
    console.log('Profile updated successfully to admin!');
  }
}

main();
