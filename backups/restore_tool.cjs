const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const tableName = process.argv[2]; // Bảng cần khôi phục truyền vào qua command

if (!tableName) {
  console.log("❌ Hãy chỉ định tên bảng cần khôi phục! Ví dụ: node restore_tool.cjs donhang");
  process.exit(1);
}

// Ưu tiên tìm trong live_backup trước, nếu không có thì báo lỗi
const livePath = `./backups/live_backup/${tableName}.json`;

if (!fs.existsSync(livePath)) {
  console.log(`❌ Không tìm thấy file dữ liệu cũ tại: ${livePath}. Bạn hãy tải file backup từ Google Drive về chép đè vào đường dẫn này trước khi chạy lệnh!`);
  process.exit(1);
}

(async () => {
    try {
        console.log(`⏳ Bắt đầu phân tích và khôi phục bảng: ${tableName}...`);
        const rawData = fs.readFileSync(livePath, 'utf8');
        const rows = JSON.parse(rawData);

        if (!Array.isArray(rows) || rows.length === 0) {
          console.log(`⚠️ File không có dữ liệu để khôi phục.`);
          return;
        }

        console.log(`Đã nạp ${rows.length} bản ghi cũ từ file. Đang bơm ngược lên Supabase (Ghi đè bằng Upsert)...`);

        // Upsert theo từng cụm 500 dòng để tránh tắc nghẽn server
        let chunkLimit = 500;
        let successCount = 0;

        for (let i = 0; i < rows.length; i += chunkLimit) {
            const chunk = rows.slice(i, i + chunkLimit);
            const { error } = await supabase.from(tableName).upsert(chunk);
            if (error) {
                console.error(`❌ Lỗi khi khôi phục cụm ${i} - ${i + chunk.length}:`, error.message);
            } else {
                successCount += chunk.length;
                console.log(`  -> Đã khôi phục thành công ${successCount}/${rows.length} dòng...`);
            }
        }
        
        console.log(`✅ HOÀN TẤT! Đã phục hồi ${successCount} dòng về nguyên vẹn trên mây cho bảng: ${tableName}. Bạn có thể F5 trang web để kiểm tra.`);

    } catch (err) {
        console.error("Lỗi khi khôi phục:", err);
    }
})();
