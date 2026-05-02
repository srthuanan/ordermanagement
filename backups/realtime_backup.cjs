const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Khởi tạo Supabase Client
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Thư mục lưu Live Backup
const backupDir = './backups/live_backup';
fs.mkdirSync(backupDir, { recursive: true });

// Trạng thái Debounce (Tránh việc update liên tục 100 lần 1 giây)
const pendingBackups = new Set();
let isRunningInit = false;

// Hàm tải toàn bộ dữ liệu 1 bảng
async function backupTable(table) {
    try {
        let allData = [];
        let from = 0;
        let limit = 5000;
        while (true) {
            const res = await supabase.from(table).select('*').range(from, from + limit - 1);
            if (res.error) break;
            if (!res.data || res.data.length === 0) break;
            allData = allData.concat(res.data);
            if (res.data.length < limit) break;
            from += limit;
        }
        
        if (allData.length > 0) {
            fs.writeFileSync(`${backupDir}/${table}.json`, JSON.stringify(allData, null, 2));
            console.log(`[${new Date().toLocaleTimeString()}] ✅ Đã cập nhật live file ${table}.json (${allData.length} dòng)`);
        }
    } catch (e) {
        console.error(`Lỗi tải bảng ${table}:`, e);
    }
}

// Bắt đầu cắm cọc theo dõi thay đổi
async function startRealtimeListener() {
    console.log(`\n⏳ Đang kết nối mạng theo dõi thay đổi cục bộ...`);
    console.log(`📂 Chế độ tự động backup đang ghi vào thư mục: ${backupDir}\n`);

    // Tự động quét tìm TOÀN BỘ 18+ bảng/view đang có trên cơ sở dữ liệu
    let tables = [];
    try {
        const response = await fetch(process.env.VITE_SUPABASE_URL + '/rest/v1/?apikey=' + process.env.SUPABASE_SERVICE_KEY);
        const data = await response.json();
        if (data && data.definitions) {
            tables = Object.keys(data.definitions);
            console.log(`[Khởi chạy] Đã quét thấy ${tables.length} bảng dữ liệu trên hệ thống để theo dõi toàn diện.`);
        }
    } catch (e) {
        console.log("Không thể fetch tự động, dùng list dự phòng...");
        tables = ['donhang', 'khoxe', 'yeucauxhd', 'yeucauvc', 'test_drive_schedule', 'users', 'app_settings', 'archived_orders', 'interactions', 'thongtinxe'];
    }

    // Backup lần đầu khi mới bật script
    isRunningInit = true;
    for (const tbl of tables) {
        await backupTable(tbl);
    }
    isRunningInit = false;
    console.log(`\n✅ Trạng thái: SẴN SÀNG LẮNG NGHE LỖI/THAY ĐỔI...\n--- Mở trình duyệt web của bạn và thao tác thử để thấy điều kỳ diệu ---`);

    // Lắng nghe realtime từ Supabase
    const channel = supabase.channel('local-db-changes');
    
    channel.on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        const table = payload.table;
        if (!tables.includes(table) || isRunningInit) return;

        console.log(`\n⚡ Phát hiện thay đổi [${payload.eventType}] trên bảng '${table}'! Đang chuẩn bị đồng bộ file...`);
        
        // Hẹn giờ 3 giây sau mới fetch (gom nhóm các sửa đổi nếu xảy ra siêu nhanh)
        if (!pendingBackups.has(table)) {
            pendingBackups.add(table);
            setTimeout(async () => {
                await backupTable(table);
                pendingBackups.delete(table);
            }, 3000);
        }
    }).subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            console.log(`📡 Đã kết nối kênh thời gian thực thành công.`);
        }
    });
}

startRealtimeListener();
