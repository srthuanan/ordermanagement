import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jwvgxqrkjlbewvpkvucj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPolicies() {
  const { data: policies, error } = await supabase.from('chinhsach').select('*');
  if (error) {
    console.error(error);
    return;
  }

  for (const p of policies) {
    if (p.han_su_dung && p.trang_thai === 'Ngừng hoạt động') {
      if (p.han_su_dung.toLowerCase().includes('thông báo mới')) {
        console.log(`Fixing policy: ${p.ten_chinh_sach} (${p.han_su_dung})`);
        await supabase.from('chinhsach').update({ trang_thai: 'Hoạt động' }).eq('id', p.id);
      }
    }
  }
  console.log('Done');
}

fixPolicies();
