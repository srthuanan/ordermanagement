import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jwvgxqrkjlbewvpkvucj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU';
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
