/**
 * SCRIPT TẠO DỮ LIỆU TEST - CHỨC NĂNG TRAO ĐỔI XE GIỮA 2 TVBH
 * ============================================================
 * Script này tạo dữ liệu test trong bảng `interactions` (category: SWAP_REQUEST)
 * Dữ liệu test CÓ THỂ XÓA HOÀN TOÀN bằng cách chạy script cleanup ở cuối file
 * 
 * Không tạo dữ liệu mới trên bảng donhang, khoxe hay yeucauxhd
 * => Không ảnh hưởng dữ liệu gốc!
 * 
 * CÁCH SỬ DỤNG:
 * Mở Console của trình duyệt (F12) rồi chạy các lệnh dưới đây.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// ==== LABEL ĐỂ NHẬN BIẾT DỮ LIỆU TEST ====
const TEST_TAG = 'TEST_SWAP_DATA';

// ==== DỮ LIỆU TEST MẪU ====
const TEST_SWAP_REQUESTS = [
    {
        // Kịch bản 1: Đang chờ TVBH 2 đồng ý (pending_tvbh2)
        category: 'SWAP_REQUEST',
        type: 'PENDING_TVBH2',
        message: '[TEST] TVBH Nguyễn Văn A đề nghị trao đổi xe VIN VF8-TEST-001 với TVBH Trần Thị B',
        actor_id: 'test-user-tvbh-a',
        actor_name: 'Nguyễn Văn A (TEST)',
        recipient: 'Trần Thị B (TEST)',
        target_id: 'TEST-DH-A-001',
        target_view: 'TEST-DH-B-002',
        metadata: {
            orderA: 'TEST-DH-A-001',
            vinA: 'VF8-TEST-VIN-001',
            tvbhA: 'Nguyễn Văn A (TEST)',
            orderB: 'TEST-DH-B-002',
            vinB: 'VF8-TEST-VIN-002',
            tvbhB: 'Trần Thị B (TEST)',
            config: {
                dong_xe: 'VF 8',
                phien_ban: 'Plus',
                ngoai_that: 'Xanh Navy',
                noi_that: 'Đen (Black)'
            },
            reason: '[DỮ LIỆU TEST] Khách anh A cần nhận xe tại Hà Nội, đổi xe với em B ở bãi Hưng Yên cho gần hơn.',
            status: 'pending_tvbh2',
            test_tag: TEST_TAG,
            created_at: new Date().toISOString()
        }
    },
    {
        // Kịch bản 2: TVBH 2 đã đồng ý, chờ Admin phê duyệt (waiting_admin)
        category: 'SWAP_REQUEST',
        type: 'WAITING_ADMIN',
        message: '[TEST] TVBH Lê Văn C đề nghị trao đổi xe VIN VF9-TEST-003 với TVBH Phạm Thị D',
        actor_id: 'test-user-tvbh-c',
        actor_name: 'Lê Văn C (TEST)',
        recipient: 'Phạm Thị D (TEST)',
        target_id: 'TEST-DH-C-003',
        target_view: 'TEST-DH-D-004',
        metadata: {
            orderA: 'TEST-DH-C-003',
            vinA: 'VF9-TEST-VIN-003',
            tvbhA: 'Lê Văn C (TEST)',
            orderB: 'TEST-DH-D-004',
            vinB: 'VF9-TEST-VIN-004',
            tvbhB: 'Phạm Thị D (TEST)',
            config: {
                dong_xe: 'VF 9',
                phien_ban: 'Plus Secp',
                ngoai_that: 'Trắng (C1TH)',
                noi_that: 'Đen (CI11)'
            },
            reason: '[DỮ LIỆU TEST] Khách chị D cần VIN 003 ở bãi gần cảng, đổi cho anh C nhận 004 ở bãi nội thành.',
            status: 'waiting_admin',
            tvbh2_accepted_at: new Date(Date.now() - 3600000).toISOString(),
            test_tag: TEST_TAG,
            created_at: new Date(Date.now() - 7200000).toISOString()
        }
    },
    {
        // Kịch bản 3: Đã Admin phê duyệt thành công (approved)
        category: 'SWAP_REQUEST',
        type: 'APPROVED',
        message: '[TEST] VIN đã được hoán đổi thành công giữa TEST-DH-E-005 và TEST-DH-F-006',
        actor_id: 'test-user-tvbh-e',
        actor_name: 'Hoàng Thị E (TEST)',
        recipient: 'Vũ Văn F (TEST)',
        target_id: 'TEST-DH-E-005',
        target_view: 'TEST-DH-F-006',
        metadata: {
            orderA: 'TEST-DH-E-005',
            vinA: 'VF7-TEST-VIN-005',
            tvbhA: 'Hoàng Thị E (TEST)',
            orderB: 'TEST-DH-F-006',
            vinB: 'VF7-TEST-VIN-006',
            tvbhB: 'Vũ Văn F (TEST)',
            config: {
                dong_xe: 'VF 7',
                phien_ban: 'Eco',
                ngoai_that: 'Đỏ Rose',
                noi_that: 'Nâu (CI12)'
            },
            reason: '[DỮ LIỆU TEST] Đổi xe để khách E lấy xe có MSP gần hơn.',
            status: 'approved',
            tvbh2_accepted_at: new Date(Date.now() - 86400000).toISOString(),
            approved_at: new Date(Date.now() - 43200000).toISOString(),
            test_tag: TEST_TAG,
            created_at: new Date(Date.now() - 90000000).toISOString()
        }
    }
];

// ==== HÀM TẠO DỮ LIỆU TEST ====
async function createTestSwapRequests() {
    console.log('\n🚀 [TEST] Đang tạo dữ liệu test cho chức năng Trao Đổi Xe...\n');

    const { data, error } = await supabase
        .from('interactions')
        .insert(TEST_SWAP_REQUESTS)
        .select();

    if (error) {
        console.error('❌ Lỗi khi tạo dữ liệu test:', error.message);
        return null;
    }

    console.log(`✅ Đã tạo ${data.length} yêu cầu đổi xe TEST thành công!\n`);
    data.forEach((item, i) => {
        console.log(`  ${i + 1}. ID: ${item.id} | Trạng thái: ${item.metadata?.status} | Kịch bản: ${item.type}`);
    });
    console.log('\n📌 Lưu ID các record test để xóa sau:');
    const testIds = data.map(d => d.id);
    console.log(JSON.stringify(testIds, null, 2));

    return testIds;
}

// ==== HÀM DỌN DẸP DỮ LIỆU TEST ====
async function cleanupTestSwapData() {
    console.log('\n🧹 [CLEANUP] Đang xóa toàn bộ dữ liệu test Trao Đổi Xe...\n');

    const { data, error } = await supabase
        .from('interactions')
        .delete()
        .eq('category', 'SWAP_REQUEST')
        .like('message', '[TEST]%')
        .select();

    if (error) {
        console.error('❌ Lỗi khi xóa dữ liệu test:', error.message);
        return;
    }

    console.log(`✅ Đã xóa ${data?.length || 0} record test thành công!`);
    console.log('✨ Database đã sạch hoàn toàn, không còn dữ liệu test nào!');
}

// ==== DỌN DẸP DỮ LIỆU TEST ====
cleanupTestSwapData();
