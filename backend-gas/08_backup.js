/**
 * 08_backup.js - Công cụ sao lưu tự động toàn bộ cơ sở dữ liệu lên Google Drive
 * 
 * Script này cắm trực tiếp trên máy chủ của Google, độc lập với PC.
 * Nó kết nối vào Supabase, lấy TOÀN BỘ bảng và lưu thành các file JSON trong thư mục Supabase_Backups.
 */

function backupDatabaseToDrive() {
  logAction("System", "Bắt đầu tiến trình sao lưu toàn bộ cơ sở dữ liệu tự động...");
  
  // 1. Tìm hoặc tạo thư mục gốc chứa bản Backup
  let rootFolders = DriveApp.getFoldersByName("Live_Supabase_Backup");
  let rootFolder;
  if (rootFolders.hasNext()) {
    rootFolder = rootFolders.next();
  } else {
    rootFolder = DriveApp.createFolder("Live_Supabase_Backup");
  }

  const dateStr = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm:ss");

  const supabaseUrl = SUPABASE_URL;
  const supabaseKey = SUPABASE_SERVICE_KEY;

  const options = {
    method: "GET",
    headers: {
      "apikey": supabaseKey,
      "Authorization": "Bearer " + supabaseKey,
      "Content-Type": "application/json",
      "Prefer": "count=none"
    },
    muteHttpExceptions: true
  };

  try {
    // 3. Tự động quét tìm tất cả các bảng khai báo trên Supabase
    let tables = [];
    const tablesResponse = UrlFetchApp.fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`, options);
    
    if (tablesResponse.getResponseCode() === 200) {
      const data = JSON.parse(tablesResponse.getContentText());
      if (data && data.definitions) {
        tables = Object.keys(data.definitions);
      }
    }
    
    // Nếu lỗi quét API tự động, sử dụng danh sách thủ công (phòng dự phòng)
    if (tables.length === 0) {
      tables = ['donhang', 'khoxe', 'thongtinxe', 'yeucauxhd', 'yeucauvc', 'users', 'archived_orders', 'interactions', 'test_drive_schedule', 'app_settings', 'chinhsach'];
    }

    let totalSaved = 0;

    // 4. Lặp qua tất cả và tải về
    for (let table of tables) {
      let offset = 0;
      const limit = 5000;
      let allData = [];
      
      while (true) {
        const fetchOptions = { ...options };
        fetchOptions.headers["Range"] = `${offset}-${offset + limit - 1}`;
        // Header này để bỏ qua lỗi nếu là view/function không hỗ trợ count
        
        let resUrl = `${supabaseUrl}/rest/v1/${table}?select=*`;
        let res = UrlFetchApp.fetch(resUrl, fetchOptions);
        
        let code = res.getResponseCode();
        if (code >= 200 && code < 300) {
          const rows = JSON.parse(res.getContentText());
          if (!rows || rows.length === 0) break;
          
          allData = allData.concat(rows);
          if (rows.length < limit) break;
          offset += limit;
        } else {
          // Bảng trống hoặc bị lỗi phân quyền
          break;
        }
      }

        // ----- THUẬT TOÁN SO SÁNH VÀ GHI ĐÈ THÔNG MINH -----
      if (allData.length > 0) {
        const jsonString = JSON.stringify(allData, null, 2);
        
        let existingFiles = rootFolder.getFilesByName(`${table}.json`);
        
        if (existingFiles.hasNext()) {
          let file = existingFiles.next();
          // Kiểm tra xem dữ liệu có mảy may thay đổi gì không
          const existingContent = file.getBlob().getDataAsString();
          
          if (existingContent !== jsonString) {
            file.setContent(jsonString); // Chỉ ghi đè khi thực sự có thay đổi
            totalSaved += allData.length;
            logAction("Backup", `Bảng [${table}] CÓ THAY ĐỔI. Đã đồng bộ.`);
          } else {
             // Bỏ qua im lặng nếu giống y hệt, tiết kiệm băng thông và bộ nhớ
          }
        } else {
          // Lần đầu tạo file
          rootFolder.createFile(`${table}.json`, jsonString, MimeType.PLAIN_TEXT);
          totalSaved += allData.length;
          logAction("Backup", `Bảng [${table}] mới hoàn toàn. Đã khởi tạo.`);
        }
      }
    }
    
    if (totalSaved > 0) {
      logAction("System", `✅ ĐỒNG BỘ THÀNH CÔNG: Cập nhật mới các bảng bị đổi (Ghi đè/Tạo ${totalSaved} dòng).`);
    }
    
  } catch (e) {
    logAction("Error", "Lỗi sao lưu tự động: " + e.toString());
  }
}
