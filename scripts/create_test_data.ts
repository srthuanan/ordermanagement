import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jwvgxqrkjlbewvpkvucj.supabase.co';
const supabaseAdminKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU';

const supabase = createClient(supabaseUrl, supabaseAdminKey);

async function createTestData() {
    console.log("Starting to create test data for Backup Reservation...");

    const testVin = "TEST_BACKUP_001";
    const testConfig = {
        dong_xe: "VF 3",
        phien_ban: "Base Tiêu chuẩn 2",
        ngoai_that: "Crimson Red (CE17)",
        noi_that: "Black"
    };

    // 1. Create the Car in khoxe
    const { error: carError } = await supabase.from('khoxe').upsert({
        vin: testVin,
        ...testConfig,
        trang_thai: "Đã ghép",
        nguoi_giu_xe: "Người Giữ Cũ",
        username_giu_xe: "old_holder",
        thoi_gian_het_han_giu: "Vô thời hạn"
    });
    if (carError) console.error("Error creating car:", carError);

    // 2. Create the Current Paired Order (Order C)
    const { error: orderCError } = await supabase.from('donhang').upsert({
        so_don_hang: "DH_TEST_C",
        ten_khach_hang: "Khách Đang Có Xe",
        ten_tu_van_ban_hang: "old_holder",
        ...testConfig,
        ket_qua: "Đã ghép",
        vin: testVin,
        thoi_gian_ghep: new Date().toISOString()
    });
    if (orderCError) console.error("Error creating order C:", orderCError);

    // 3. Create Waiting Order A (Priority 1 - Early Deposit)
    const { error: orderAError } = await supabase.from('donhang').upsert({
        so_don_hang: "DH_TEST_A_PRIORITY_1",
        ten_khach_hang: "Khách Ưu Tiên 1 (Cọc Sớm)",
        ten_tu_van_ban_hang: "PHẠM THÀNH NHÂN",
        ...testConfig,
        ket_qua: "Chưa ghép",
        ngay_coc: "2026-04-01",
        thoi_gian_can_xe: "2026-05-01",
        created_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
    });
    if (orderAError) console.error("Error creating order A:", orderAError);

    // 4. Create Waiting Order B (Priority 2 - Late Deposit)
    const { error: orderBError } = await supabase.from('donhang').upsert({
        so_don_hang: "DH_TEST_B_PRIORITY_2",
        ten_khach_hang: "Khách Ưu Tiên 2 (Cọc Muộn)",
        ten_tu_van_ban_hang: "PHẠM THÀNH NHÂN",
        ...testConfig,
        ket_qua: "Chưa ghép",
        ngay_coc: "2026-04-15",
        thoi_gian_can_xe: "2026-05-01",
        created_at: new Date().toISOString()
    });
    if (orderBError) console.error("Error creating order B:", orderBError);

    console.log("Test data created successfully!");
    console.log("VIN: " + testVin);
    console.log("Order A (Early Deposit): DH_TEST_A_PRIORITY_1");
    console.log("Order B (Late Deposit): DH_TEST_B_PRIORITY_2");
    console.log("Order C (Current): DH_TEST_C");
}

createTestData();
