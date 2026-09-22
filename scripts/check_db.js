import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jwvgxqrkjlbewvpkvucj.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: donhang, error } = await supabase.from('donhang').select('ten_tvbh').gte('created_at', '2026-05-01T00:00:00');
    console.log("donhang error:", error);
    console.log("donhang count:", donhang?.length);
    if (donhang && donhang.length > 0) {
        console.log("Names:", [...new Set(donhang.map(d => d.ten_tvbh))]);
    }
}
check();
