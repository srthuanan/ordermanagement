/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key must be provided in the environment variables.');
}

// Client thông thường (anon key) — dùng cho tất cả các thao tác của hệ thống
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        detectSessionInUrl: true
    }
});

/**
 * Client admin — Sử dụng chung client mã hóa an toàn với session người dùng.
 * Quyền hạn được kiểm soát thông qua các chính sách Row Level Security (RLS) & RPC của Supabase Database.
 */
export const supabaseAdmin = supabase;



