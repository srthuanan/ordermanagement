/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key must be provided in the environment variables.');
}

// Client thông thường (anon key) — dùng cho read và các thao tác user thông thường
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        detectSessionInUrl: true
    }
});

/**
 * Client admin (service role key) — bypass RLS, dùng cho ghi dữ liệu phía admin.
 * Sử dụng auth: { persistSession: false } để tránh xung đột với client chính.
 */
export const supabaseAdmin = supabaseServiceKey && supabaseServiceKey !== 'YOUR_SERVICE_ROLE_KEY_HERE'
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { 
            autoRefreshToken: false, 
            persistSession: false,
            detectSessionInUrl: false // Tắt để tránh Multiple GoTrueClient instances warning
        }
    })
    : supabase;
