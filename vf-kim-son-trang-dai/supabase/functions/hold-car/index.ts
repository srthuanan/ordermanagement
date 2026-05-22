import postgres from 'https://deno.land/x/postgresjs@v3.4.4/mod.js'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ status: 'ERROR', message: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { p_vin, p_username, p_full_name } = await req.json()

    if (!p_vin || !p_username || !p_full_name) {
      return new Response(JSON.stringify({ status: 'ERROR', message: 'Thiếu thông tin bắt buộc' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Xác thực JWT để lấy thông tin user/role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt)

    if (authError || !user) {
      return new Response(JSON.stringify({ status: 'ERROR', message: 'Token không hợp lệ' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Tra cứu role từ bảng users
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('email', user.email)
      .maybeSingle()

    const userRole = userRow?.role || 'sales'

    // Kết nối thẳng DB, truyền role qua session
    const connectionString = Deno.env.get('SUPABASE_DB_URL')!
    const sql = postgres(connectionString)

    const result = await sql.begin(async (tx) => {
      await tx`SELECT set_config('request.jwt.claims', ${JSON.stringify({ role: userRole, sub: user.id, email: user.email })}, true)`
      await tx`SET LOCAL role = authenticated`
      return await tx`SELECT public.rpc_hold_car(${p_vin}, ${p_username}, ${p_full_name}) as result`
    })

    await sql.end()

    const data = result[0]?.result
    return new Response(JSON.stringify(data), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    console.error('hold-car error:', err)
    return new Response(JSON.stringify({ status: 'ERROR', message: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
