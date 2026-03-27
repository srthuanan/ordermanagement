import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function run() {
    const orderNumber = 'TEST-AI-' + Math.floor(Math.random() * 1000);
    
    // 1. Tạo 1 đơn hàng tạm
    const donhangRow = {
        so_don_hang: orderNumber,
        ten_khach_hang: '🕵️ KHÁCH HÀNG TEST (LỖI AI)',
        dong_xe: 'VF 9',
        phien_ban: 'Plus',
        ngoai_that: 'Đen',
        noi_that: 'Nâu',
        ten_tu_van_ban_hang: 'Hệ thống tự động',
        ket_qua: 'Chờ phê duyệt', // Trạng thái này sẽ bốc đơn sang Yêu cầu XHĐ
        vin: 'VF9AIWARNING12345',
        thoi_gian_nhap: new Date().toISOString()
    };

    const { error: err1 } = await supabaseAdmin.from('donhang').insert([donhangRow]);
    if (err1) {
        console.error("Lỗi insert donhang:", err1);
        return;
    }

    // 2. Ném sang Yêu Cầu XHĐ kèm theo cái Ghi Chú AI
    const row = { 
        so_don_hang: orderNumber, 
        ten_khach_hang: '🕵️ KHÁCH HÀNG TEST (LỖI AI)', 
        tvbh: 'Hệ thống tự động', 
        dong_xe: 'VF 9', 
        phien_ban: 'Plus', 
        ngay_yeu_cau: new Date().toISOString(), 
        chinh_sach: 'Thẻ VinClub hạng Gold, Nạp 5 triệu pin, ⚠️ [GHI CHÚ AI]: [HopDong_MB.pdf] Thiếu chữ ký của bên mua | [DN_XHD.pdf] Lệch số tiền xe', 
        hoa_hong_ung: '10000000', 
        vpoint: '0', 
        url_hop_dong: 'https://example.com/', 
        url_de_nghi_xhd: 'https://example.com/', 
        vin: 'VF9AIWARNING12345'
    };
    
    const { error: e2 } = await supabaseAdmin.from('yeucauxhd').insert([row]);
    if (e2) {
        console.error("Lỗi insert yeucauxhd:", e2);
    } else {
        console.log("Thành công! Đã bơm đơn hàng mẫu vào Database.");
    }
}

run();
