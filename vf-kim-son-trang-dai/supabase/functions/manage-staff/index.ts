import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.99.2';

type InvitePayload = {
  action?: 'invite' | 'resend' | 'cancel';
  email?: string;
  fullName?: string;
  role?: 'sales' | 'manager';
  department?: string;
};

type InviteResponse = {
  success: true;
  email: string;
  fullName: string;
  role: 'sales' | 'manager';
  delivery?: 'invite' | 'recovery';
  status?: 'canceled';
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

async function sendInviteOrRecovery(
  adminClient: ReturnType<typeof createClient>,
  supabaseUrl: string,
  userId: string,
  email: string,
  fullName: string,
  role: 'sales' | 'manager',
  department: string,
  action: 'invite' | 'resend'
) {
  const appUrl = Deno.env.get('SITE_URL') || 'https://ordermanagement-three.vercel.app';
  const redirectTo = `${appUrl.replace(/\/$/, '')}/set-password`;
  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name: fullName,
      invited_by_admin: true,
      role,
      department
    },
    redirectTo
  });

  if (!inviteError) {
    const { error: recordInviteError } = await adminClient.rpc('record_staff_invite', {
      p_email: email,
      p_full_name: fullName,
      p_role: role,
      p_department: department,
      p_invite_status: 'invite_sent',
      p_message: 'Đã gửi email kích hoạt tài khoản TVBH.',
      p_invited_by: userId
    });

    if (recordInviteError) {
      return { error: recordInviteError, step: 'record_invite' as const };
    }

    return { delivery: 'invite' as const };
  }

  if (action === 'invite') {
    return { error: inviteError, step: 'invite_user' as const };
  }

  const message = inviteError.message.toLowerCase();
  const alreadyRegistered = message.includes('already been registered') || message.includes('already registered');

  if (!alreadyRegistered) {
    return { error: inviteError, step: 'invite_user' as const };
  }

  const { error: recoveryError } = await adminClient.auth.resetPasswordForEmail(email, {
    redirectTo
  });

  if (recoveryError) {
    return { error: recoveryError, step: 'recovery_email' as const };
  }

  const { error: recordRecoveryError } = await adminClient.rpc('record_staff_invite', {
    p_email: email,
    p_full_name: fullName,
    p_role: role,
    p_department: department,
    p_invite_status: 'recovery_sent',
    p_message: 'Email đã tồn tại, đã gửi link đặt mật khẩu.',
    p_invited_by: userId
  });

  if (recordRecoveryError) {
    return { error: recordRecoveryError, step: 'record_recovery' as const };
  }

  return { delivery: 'recovery' as const };
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = resolveSupabaseSecretKey();

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return jsonResponse({ error: 'Thiếu cấu hình Supabase Function' }, 500);
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });

    const { data: userResult, error: userError } = await userClient.auth.getUser();
    if (userError || !userResult.user) {
      return jsonResponse({ error: 'Không xác thực được người dùng' }, 401);
    }

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', userResult.user.id)
      .maybeSingle();

    if (profileError || profile?.role !== 'admin') {
      return jsonResponse({ error: 'Chỉ admin mới được tạo nhân sự' }, 403);
    }

    const body = (await req.json()) as InvitePayload;
    if (!body.action || !['invite', 'resend', 'cancel'].includes(body.action)) {
      return jsonResponse({ error: 'Hành động không hợp lệ' }, 400);
    }

    const email = String(body.email ?? '').trim().toLowerCase();
    const fullName = String(body.fullName ?? '').trim();
    const role = body.role === 'manager' ? body.role : 'sales';
    const department = String(body.department ?? '').trim() || 'Kinh doanh';

    if (!email || !fullName) {
      return jsonResponse({ error: 'Thiếu email hoặc tên nhân sự' }, 400);
    }

    if (body.action === 'cancel') {
      const { error: recordCancelError } = await adminClient.rpc('record_staff_invite', {
        p_email: email,
        p_full_name: fullName,
        p_role: role,
        p_department: department,
        p_invite_status: 'canceled',
        p_message: 'Lời mời đã bị hủy.',
        p_invited_by: userResult.user.id
      });

      if (recordCancelError) {
        return jsonResponse({ error: recordCancelError.message, step: 'record_cancel' }, 400);
      }

      const cancelResponse: InviteResponse = {
        success: true,
        email,
        fullName,
        role,
        status: 'canceled'
      };

      return jsonResponse(cancelResponse);
    }

    const result = await sendInviteOrRecovery(adminClient, supabaseUrl, userResult.user.id, email, fullName, role, department, body.action);

    if ('error' in result) {
      return jsonResponse({ error: result.error.message, step: result.step }, 400);
    }

    const response: InviteResponse = {
      success: true,
      email,
      fullName,
      role,
      delivery: result.delivery
    };

    return jsonResponse(response);
  } catch (error) {
    console.error('manage-staff unexpected error', error);
    const message = error instanceof Error ? error.message : 'Lỗi không xác định';
    return jsonResponse({ error: message, step: 'unexpected' }, 500);
  }
});
