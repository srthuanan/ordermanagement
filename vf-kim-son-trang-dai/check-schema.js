import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
);

async function check() {
  const query = `
    select column_name, data_type 
    from information_schema.columns 
    where table_name = 'yeucauxhd';
  `;
  
  const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': env.VITE_SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });
  
  if (res.ok) {
    const data = await res.json();
    console.log(data);
  } else {
    // Let's just try to insert the exact payload the app sends and see the error
    const invoiceRow = {
      so_don_hang: 'G40111-VSO-26-05-0080',
      ten_khach_hang: 'Nguyễn Hoàng Minh',
      vin: 'VF9XXXXXXXXXXXXX',
      tvbh: null,
      dong_xe: 'VF 9',
      phien_ban: 'Eco',
      ngoai_that: 'Đen',
      noi_that: 'Đen',
      ngay_coc: null,
      so_may: null,
      requested_by: null,
      requested_by_name: 'Minh',
      requested_by_username: 'minh',
      url_hop_dong: 'https://...',
      url_de_nghi_xhd: 'https://...',
      link_hop_dong: 'https://...',
      link_de_nghi_xhd: 'https://...',
      link_hoa_don_da_xuat: null,
      chinh_sach: 'Chính sách ưu đãi [Eco 2 cầu (bản Việt Nam)] - 50Tr',
      so_tien_khach_da_dong: 5000000,
      dia_chi: '432a/40/25 Dương Bá Trạc',
      so_hop_dong: null,
      ngay_ky_hop_dong: '2026-05-16',
      hinh_thuc_tt: 'Vay ngân hàng',
      nguon_khach: null,
      ma_vso: 'G40111-VSO-26-05-0080',
      mua_bao_hiem: null,
      dang_ky_xe: null,
      xe_xang_vin: null,
      xe_xang_hang: null,
      xe_xang_model: null,
      ma_amis: 'AMIS-12345',
      gia_cong_bo: null,
      ghi_chu: 'Nhập thêm lưu ý nếu có...',
      coc: true,
      status: 'pending',
      note: 'Chờ phê duyệt xuất hóa đơn'
    };

    const res2 = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/yeucauxhd`, {
      method: 'POST',
      headers: {
        'apikey': env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(invoiceRow)
    });
    console.log('Insert Status:', res2.status);
    console.log('Insert Error:', await res2.text());
  }
}

check();
