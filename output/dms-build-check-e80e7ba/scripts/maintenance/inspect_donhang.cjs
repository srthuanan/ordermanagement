const { createClient } = require('@supabase/supabase-client');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    const { data, error } = await supabase.rpc('execute_sql', {
        sql_query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'donhang';"
    });
    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}

inspect();
