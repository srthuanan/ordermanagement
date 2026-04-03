import { createClient } from '@supabase/supabase-js';

const url = 'https://jwvgxqrkjlbewvpkvucj.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU';

const supabase = createClient(url, key);

async function run() {
    const { data: rows, error } = await supabase.from('yeucauxhd')
      .select('so_don_hang, ngay_coc, ngay_yeu_cau, ngay_xuat_hoa_don')
      .not('ngay_xuat_hoa_don', 'is', null)
      .not('ngay_xuat_hoa_don', 'eq', '');
      
    if (error) {
      console.log("Error:", error);
      return;
    }
    
    console.log("Found rows:", rows?.length);
    for (const r of rows || []) {
       if (r.ngay_coc && isNaN(Date.parse(r.ngay_coc))) {
           console.log("Invalid ngay_coc:", r.ngay_coc, r.so_don_hang);
       }
       if (r.ngay_yeu_cau && isNaN(Date.parse(r.ngay_yeu_cau))) {
           console.log("Invalid ngay_yeu_cau:", r.ngay_yeu_cau, r.so_don_hang);
       }
       if (r.ngay_xuat_hoa_don && isNaN(Date.parse(r.ngay_xuat_hoa_don))) {
           console.log("Invalid ngay_xuat_hoa_don:", r.ngay_xuat_hoa_don, r.so_don_hang);
       }
    }
}

run();
