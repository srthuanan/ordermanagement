/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jwvgxqrkjlbewvpkvucj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_0lT3OnREc0Qg1R9s672KBg_aDeBTdJX';

// Client thông thường (anon key) — dùng cho tất cả các thao tác của hệ thống
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
        lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => fn()
    }
});

/**
 * Client admin — Sử dụng chung client mã hóa an toàn với session người dùng.
 * Quyền hạn được kiểm soát thông qua các chính sách Row Level Security (RLS) & RPC của Supabase Database.
 */
export const supabaseAdmin = supabase;



