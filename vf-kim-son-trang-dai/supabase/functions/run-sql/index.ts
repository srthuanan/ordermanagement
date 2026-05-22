import postgres from 'https://deno.land/x/postgresjs@v3.4.4/mod.js'

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { sqlString } = await req.json();
    
    if (!sqlString) {
      return new Response(JSON.stringify({ error: "Missing sqlString" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }

    const connectionString = Deno.env.get('SUPABASE_DB_URL')!
    if (!connectionString) {
        return new Response(JSON.stringify({ error: "Missing SUPABASE_DB_URL" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
    }

    const sql = postgres(connectionString)

    // Execute the raw SQL string
    const result = await sql.unsafe(sqlString);

    await sql.end()

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    console.error(err)
    return new Response(String(err?.message ?? err), { status: 500, headers: corsHeaders })
  }
})
