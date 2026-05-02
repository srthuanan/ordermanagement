/**
 * 07_reverse_sync.js - Đồng bộ ngược từ Google Sheet về Supabase
 */

/**
 * Hàm tự động chạy khi có sự thay đổi trên Sheet
 */
function onEditReverseSync(e) {
  const range = e.range;
  const sheet = range.getSheet();
  const sheetName = sheet.getName();
  const startRow = range.getRow();
  const numRows = range.getNumRows();
  const startCol = range.getColumn();
  const numCols = range.getNumColumns();
  
  // 1. Chỉ xử lý sheet thongtinxe hoặc khoxe
  const ALLOWED_SHEETS = ["thongtinxe", "khoxe"]; 
  if (ALLOWED_SHEETS.indexOf(sheetName) === -1) return;
  
  // Lấy toàn bộ tiêu đề (headers) của sheet
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Tìm cột ID hoặc VIN để định danh
  let idColIndex = headers.indexOf("id") + 1;
  if (idColIndex <= 0) idColIndex = headers.indexOf("vin") + 1;
  
  if (idColIndex <= 0) return;

  // 2. Lấy dữ liệu toàn bộ dòng trong vùng sửa đổi (để đồng bộ hàng loạt)
  const fullRowRange = sheet.getRange(startRow, 1, numRows, sheet.getLastColumn());
  const rowDataArray = fullRowRange.getValues();
  const recordsToSync = [];
  const targetRowIndices = [];

  // 3. Duyệt từng dòng trong vùng vừa sửa/dán để chuẩn bị dữ liệu
  for (let r = 0; r < numRows; r++) {
    const currentRow = startRow + r;
    if (currentRow <= 1) continue; // Bỏ qua dòng tiêu đề

    // Lấy ID/VIN của dòng hiện tại (dùng index đã tìm hoặc tìm lại nếu cần)
    const rowValues = rowDataArray[r];
    const recordId = rowValues[idColIndex - 1];
    
    if (!recordId) continue;

    // Gom dữ liệu của dòng này
    const updateData = {};
    let hasData = false;

    // Ánh xạ headers vào dữ liệu
    headers.forEach((h, idx) => {
      if (!h || h === "stt" || h === "Số thứ tự") return;
      
      const val = rowValues[idx];
      // Không đồng bộ các trường tự động hoặc link file (vì link file thường là hyperlink)
      if (h === "created_at" || h === "updated_at") return;
      
      // Chuyển đổi Date sang ISO
      let finalVal = val;
      if (val instanceof Date) finalVal = val.toISOString();
      
      // Map header sang key database (cơ bản: dùng luôn header vì đã chuẩn hóa ở syncAll)
      // Lưu ý: Trong Supabase, các cột thường là snake_case
      const dbKey = (h.indexOf(" ") !== -1) ? normalizeString(h).replace(/\s+/g, "_") : h;
      updateData[dbKey] = finalVal;
      hasData = true;
    });

    if (hasData) {
      recordsToSync.push(updateData);
      targetRowIndices.push(currentRow);
    }
  }

  // 4. Thực hiện UPSERT hàng loạt (Batching)
  if (recordsToSync.length > 0) {
    const identField = headers[idColIndex - 1];
    const CHUNK_SIZE = 50;
    let totalSuccess = 0;

    // Đổi màu vùng đang xử lý sang màu cam nhạt
    fullRowRange.setBackground("#fff7ed");

    for (let i = 0; i < recordsToSync.length; i += CHUNK_SIZE) {
      const chunk = recordsToSync.slice(i, i + CHUNK_SIZE);
      const res = upsertSupabase(sheetName, chunk, identField);
      
      if (res.success) {
        totalSuccess += chunk.length;
      } else {
        // Đánh dấu đỏ các dòng bị lỗi trong chunk này
        const chunkStartRow = targetRowIndices[i];
        sheet.getRange(chunkStartRow, 1, chunk.length, sheet.getLastColumn()).setBackground("#fee2e2");
      }
    }

    // Nếu tất cả thành công, xóa màu nền
    if (totalSuccess === recordsToSync.length) {
      fullRowRange.setBackground(null);
    }

    // Thông báo nếu là sửa đổi hàng loạt
    if (recordsToSync.length > 5) {
      SpreadsheetApp.getActiveSpreadsheet().toast(`Đã đồng bộ ${totalSuccess}/${recordsToSync.length} dòng về Supabase.`, "🚀 Batch Sync");
    }
  }
}

/**
 * Hàm cưỡng bức đẩy dữ liệu từ Sheet hiện tại lên Supabase
 */
function syncCurrentSheetToSupabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const sheetName = sheet.getName();
  
  // Kiểm tra xem sheet này có nằm trong danh sách đồng bộ không
  const tbl = TABLES_TO_SYNC.find(t => t.sheet === sheetName);
  if (!tbl) {
    ss.toast("Sheet này không hỗ trợ đồng bộ về Supabase.", "Cảnh báo");
    return;
  }

  const table = tbl.table;
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    ss.toast("Sheet không có dữ liệu để đồng bộ.", "Thông báo");
    return;
  }

  const headers = data[0];
  const records = [];

  // Lấy dữ liệu mẫu từ Supabase để ánh xạ cột thông minh
  const sampleData = fetchSupabase(table, "limit=1");
  const dbFields = sampleData.length > 0 ? Object.keys(sampleData[0]) : [];
  ss.toast(`Đang phân tích cấu trúc bảng ${table}...`, "Phân tích");

  // 1. Ánh xạ cột cực nhanh và mạnh mẽ
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const obj = {};
    let hasValue = false;
    
    headers.forEach((h, colIdx) => {
      if (!h) return;
      const normalizedH = normalizeString(String(h));
      
      // ƯU TIÊN 1: Nếu tiêu đề sheet có dấu gạch dưới (snake_case), dùng luôn vì đúng chuẩn DB
      let dbKey = (h.indexOf("_") !== -1 || h === "id" || h === "vin") ? h : null;
      
      // ƯU TIÊN 2: Nếu không thấy gạch dưới, mới đi khớp với cột Database thực tế
      if (!dbKey && dbFields.length > 0) {
        dbKey = dbFields.find(f => normalizeString(f) === normalizedH);
      }
      
      // ƯU TIÊN 3: Fallback cuối cùng nếu vẫn không thấy - Giữ nguyên tiêu đề gốc
      if (!dbKey) dbKey = h; 

      let val = row[colIdx];
      if (typeof val === 'string' && val.startsWith('=HYPERLINK')) return;
      
      if (val !== "" && val !== null && val !== undefined) {
        if (val instanceof Date) val = val.toISOString();
        obj[dbKey] = val;
        hasValue = true;
      }
    });

    if (hasValue) records.push(obj);
  }

  if (records.length === 0) {
    ss.toast("Không tìm thấy dữ liệu hợp lệ trên Sheet này.", "Lỗi");
    return;
  }

  // 2. Xác định KHÓA CHÍNH (Ident Field) để thực hiện UPSERT
  const firstRec = records[0];
  const keys = Object.keys(firstRec);
  const identField = keys.find(k => normalizeString(k) === "so don hang" || normalizeString(k) === "so_don_hang") 
                    || keys.find(k => normalizeString(k) === "id")
                    || keys.find(k => normalizeString(k) === "vin")
                    || keys[0];

  ss.toast(`Đang đẩy ${records.length} bản ghi theo mốc: ${identField}...`, "Đang xử lý");

  // 3. Thực hiện UPSERT (Merge) - Đây là phương pháp nạp dữ liệu bền bỉ nhất
  const CHUNK_SIZE = 50;
  let successCount = 0;
  let errorMsg = null;

  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    const result = upsertSupabase(table, chunk, identField); 
    
    if (result.success) {
      successCount += chunk.length;
    } else {
      errorMsg = result.message;
      break; 
    }
  }

  if (errorMsg) {
    const ui = SpreadsheetApp.getUi();
    const cleanError = errorMsg.length > 500 ? errorMsg.substring(0, 500) + "..." : errorMsg;
    ui.alert("Lỗi đồng bộ", `Supabase báo lỗi:\n\n${cleanError}`, ui.ButtonSet.OK);
  } else {
    const supabaseCheckUrl = `${SUPABASE_URL}/rest/v1/${table}?select=*&order=created_at.desc&limit=5`;
    const msg = `🌻 HOÀN TẤT ĐỒNG BỘ 🌻\n\n- Tổng số bản ghi xử lý: ${successCount}\n- Phương thức: UPSERT (Tự động Cập nhật hoặc Thêm mới)\n\nDữ liệu ĐÃ nằm trên Supabase. Bạn hãy Refresh giao diện Supabase sau 5 giây để thấy kết quả.`;
    SpreadsheetApp.getUi().alert("Thành công", msg, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}
