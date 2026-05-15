import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.99.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function resolveSupabaseSecretKey() {
  const legacyKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacyKey) return legacyKey;

  const secretKeysRaw = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (!secretKeysRaw) return '';

  try {
    const parsed = JSON.parse(secretKeysRaw) as Record<string, string>;
    return parsed.default || Object.values(parsed)[0] || '';
  } catch {
    return '';
  }
}

function normalizeVin(value: string) {
  return value.trim().toUpperCase();
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const expectedToken = Deno.env.get('VEHICLE_GPS_SYNC_TOKEN') || 'KIMSON_VEHICLE_GPS_SYNC_20260514';
    const providedToken = req.headers.get('x-sync-token') || '';

    if (!expectedToken || providedToken !== expectedToken) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = resolveSupabaseSecretKey();

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return jsonResponse({ error: 'Thiếu cấu hình Supabase Function' }, 500);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });

    const { data, error } = await adminClient
      .from('khoxe')
      .select('vin,dong_xe,phien_ban,ngoai_that,noi_that,trang_thai,nguoi_giu_xe,username_giu_xe,vi_tri,latitude,longitude,ngay_nhap')
      .order('ngay_nhap', { ascending: true });

    if (error) {
      return jsonResponse({ error: error.message, step: 'load_khoxe' }, 400);
    }
    const vehicles = data || [];

    return jsonResponse({
      success: true,
      vins: vehicles
        .map((row) => String(row.vin || '').trim().toUpperCase())
        .filter((vin) => vin.length > 0),
      vehicles
    });
  } catch (error) {
    console.error('vehicle-gps-targets unexpected error', error);
    const message = error instanceof Error ? error.message : 'Lỗi không xác định';
    return jsonResponse({ error: message, step: 'unexpected' }, 500);
  }
});
