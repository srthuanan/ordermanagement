import { createClient } from '@supabase/supabase-js';

const url = 'https://jwvgxqrkjlbewvpkvucj.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU';

const supabaseAdmin = createClient(url, key);

async function run() {
    const defaultData = {
        ten_khach_hang: 'Khách hàng (Cần Cập Nhật)',
        dong_xe: 'MỚI',
        phien_ban: '-',
        ngoai_that: '-',
        noi_that: '-',
        tvbh: 'Hệ thống phục hồi',
        ket_qua: 'Đã xuất hóa đơn',
        chinh_sach: '',
        trang_thai_vc: 'Chưa sắp Tài'
    };

    const orders = [
        { so_don_hang: 'N31913-VSO-26-03-0003', ngay_xuat_hoa_don: '2026-03-09T00:00:00+00:00', created_at: '2026-03-09T00:00:00+00:00' },
        { so_don_hang: 'N31913-VSO-26-02-0052', ngay_xuat_hoa_don: '2026-03-09T00:00:00+00:00', created_at: '2026-03-09T00:00:00+00:00' }
    ];

    for (const o of orders) {
        const payload = { ...defaultData, ...o };
        const { error } = await supabaseAdmin.from('archived_orders').insert(payload);
        if (error) console.error("Error inserting", o.so_don_hang, error);
        else console.log("Restored", o.so_don_hang);
    }
}
run();
