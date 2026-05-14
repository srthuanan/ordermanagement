import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.99.2';

type SyncVehicleLocationPayload = {
  vin?: string;
  vi_tri?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

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

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const expectedToken = Deno.env.get('VEHICLE_GPS_SYNC_TOKEN') || '';
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

    const body = (await req.json()) as SyncVehicleLocationPayload;
    const vin = String(body.vin ?? '').trim().toUpperCase();
    const vi_tri = String(body.vi_tri ?? '').trim() || null;
    const latitude = toNumber(body.latitude);
    const longitude = toNumber(body.longitude);

    if (!vin || vin.length < 11) {
      return jsonResponse({ error: 'VIN không hợp lệ' }, 400);
    }

    if (latitude === null || longitude === null) {
      return jsonResponse({ error: 'Thiếu tọa độ GPS hợp lệ' }, 400);
    }

    const syncedAt = new Date().toISOString();

    const { error: khoxeError } = await adminClient
      .from('khoxe')
      .update({
        vi_tri,
        latitude,
        longitude,
        updated_at: syncedAt
      })
      .eq('vin', vin);

    if (khoxeError) {
      return jsonResponse({ error: khoxeError.message, step: 'update_khoxe' }, 400);
    }

    const { error: locationError } = await adminClient
      .from('vehicle_locations')
      .upsert(
        [
          {
            vin,
            vi_tri,
            latitude,
            longitude,
            updated_at: syncedAt
          }
        ],
        { onConflict: 'vin' }
      );

    if (locationError) {
      return jsonResponse({ error: locationError.message, step: 'upsert_vehicle_locations' }, 400);
    }

    return jsonResponse({
      success: true,
      vin,
      vi_tri,
      latitude,
      longitude,
      updated_at: syncedAt
    });
  } catch (error) {
    console.error('sync-vehicle-location unexpected error', error);
    const message = error instanceof Error ? error.message : 'Lỗi không xác định';
    return jsonResponse({ error: message, step: 'unexpected' }, 500);
  }
});
