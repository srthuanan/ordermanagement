import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SUPABASE_URL = 'https://jwvgxqrkjlbewvpkvucj.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_0lT3OnREc0Qg1R9s672KBg_aDeBTdJX';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
