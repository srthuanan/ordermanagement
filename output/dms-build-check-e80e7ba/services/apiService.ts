import { supabase, supabaseAdmin } from './supabaseClient';

// Re-export tất cả các domain API modules để đảm bảo 100% tương thích với tất cả component hiện tại
export * from './api';
export { supabase, supabaseAdmin };

/**
 * Generates a username from full name following the pattern:
 * (First Name) + (Initials of remaining names)
 * Example: "Phạm Thành Nhân" -> "nhanpt"
 */
export const generateUsernameFromFullName = (fullName: string): string => {
    if (!fullName) return '';
    const normalized = fullName.trim().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d");
    
    const parts = normalized.split(/\s+/);
    if (parts.length === 0) return '';
    
    const firstName = parts[parts.length - 1];
    const initials = parts.slice(0, parts.length - 1).map(p => p[0]).join('');
    
    return firstName + initials;
};

/**
 * Generates a random 10-character alphanumeric password
 */
export const generateRandomPassword = (): string => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let retVal = "";
    for (let i = 0; i < 10; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return retVal;
};

/**
 * Basic SHA-256 hash using SubtleCrypto (Async)
 */
export const hashPassword = async (password: string): Promise<string> => {
    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};
