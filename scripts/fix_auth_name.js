import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('C:/Users/USER/Documents/ordermanagement/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function fixAuthUser() {
  const userId = '58461c8c-32ff-40c5-bfef-ad1c691c0fbd';
  console.log(`Fixing auth metadata for ID ${userId}...`);

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    { user_metadata: { full_name: 'LÊ THỊ HƯƠNG TRÀ' } }
  );

  if (error) {
    console.error("Error updating user:", error);
  } else {
    console.log("Updated user metadata successfully. New data:", data.user.user_metadata);
  }
}

fixAuthUser();
