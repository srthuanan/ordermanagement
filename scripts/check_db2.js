import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jwvgxqrkjlbewvpkvucj.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    let allUsers = new Set();
    const { data: y1 } = await supabase.from('yeucauvc').select('*').gte('created_at', '2026-05-01T00:00:00');
    if (y1) y1.forEach(d => { if (d.ten_tvbh) allUsers.add(d.ten_tvbh); if (d.created_by) allUsers.add(d.created_by); });
    
    const { data: y2 } = await supabase.from('yeucauxhd').select('*').gte('created_at', '2026-05-01T00:00:00');
    if (y2) y2.forEach(d => { if (d.ten_tvbh) allUsers.add(d.ten_tvbh); if (d.created_by) allUsers.add(d.created_by); });

    const { data: i } = await supabase.from('interactions').select('*').gte('created_at', '2026-05-01T00:00:00');
    if (i) i.forEach(d => { if (d.consultant_name) allUsers.add(d.consultant_name); if (d.user_id) allUsers.add(d.user_id); });

    const { data: u } = await supabase.from('users').select('*');
    if (u) u.forEach(d => { if (d.full_name) allUsers.add(d.full_name); if (d.username) allUsers.add(d.username); });

    console.log("Found names:", [...allUsers]);
}
check();
