/**
 * 05_sync.js - Đồng bộ toàn khối (Bulk Sync) từ Supabase sang Google Sheet
 * Thay thế cho cơ chế Webhook nhỏ giọt bấp bênh cũ.
 */

// Kích hoạt Menu đặc biệt khi mở Google Sheet
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 VINFO SYNC 2.0')
      .addItem('📊 Báo cáo KPI (Xuất HĐ)', 'generateKpiSheet')
      .addSeparator()
      .addItem('📥 Làm mới toàn bộ dữ liệu (Sync Supabase)', 'syncAllFromSupabase')
      .addSeparator()
      .addItem('📤 Đẩy dữ liệu lên Supabase (Upload Current Sheet)', 'syncCurrentSheetToSupabase')
      .addSeparator()
      .addItem('🧹 Hút Bụi: Xóa sạch các Sheet rác', 'cleanUpGhostSheets')
      .addSeparator()
      .addItem('🚑 KHÔI PHỤC FILE PDF (Từ Thùng Rác)', 'restoreTrashedPdfs')
      .addToUi();
}

var TABLES_TO_SYNC = [
  { table: 'donhang', sheet: 'donhang' },
  { table: 'khoxe', sheet: 'khoxe' },
  { table: 'yeucauxhd', sheet: 'yeucauxhd' }
];

/**
 * Cấu hình hiển thị đặc biệt cho các sheet quan trọng
 * Dùng để map cột, đặt tiêu đề tiếng Việt và định dạng đẹp mắt
 */
var CUSTOM_CONFIGS = {
  'yeucauxhd': {
    columns: [
      { key: 'stt', label: 'Số thứ tự' },
      { key: 'ten_khach_hang', label: 'Tên khách hàng' },
      { key: 'so_don_hang', label: 'Số đơn hàng' },
      { key: 'dong_xe', label: 'Dòng xe' },
      { key: 'phien_ban', label: 'Phiên bản' },
      { key: 'ngoai_that', label: 'Ngoại thất' },
      { key: 'noi_that', label: 'Nội thất' },
      { key: 'tvbh', label: 'TVBH' },
      { key: 'vin', label: 'Số VIN' },
      { key: 'so_may', label: 'Số máy' },
      { key: 'ngay_yeu_cau', label: 'Ngày yêu cầu', type: 'datetime' },
      { key: 'ngay_xuat_hoa_don', label: 'Ngày xuất hóa đơn', type: 'date' },
      { key: 'hoa_hong_ung', label: 'Hoa hồng ứng', type: 'number' },
      { key: 'vpoint', label: 'V-Point', type: 'number' },
      { key: 'chinh_sach', label: 'Chính sách' },
      { key: 'ngay_coc', label: 'Ngày cọc', type: 'date' },
      { key: 'url_hop_dong', label: 'Hợp đồng', type: 'link' },
      { key: 'url_de_nghi_xhd', label: 'Đề nghị XHĐ', type: 'link' },
      { key: 'url_hoa_don_da_xuat', label: 'Hóa đơn đã xuất', type: 'link' }
    ],
    headerColor: '#0f172a', // Slate 900
    headerTextColor: '#ffffff',
    rowColor1: '#ffffff',
    rowColor2: '#f1f5f9' // Slate 100
  }
};


function cleanUpGhostSheets() {
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast('Đang dò tìm và dọn dẹp sheet rác...', 'Máy Hút Bụi', 5);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    
    var keep = TABLES_TO_SYNC.map(function(t) { return t.sheet; });
    // Chỉ giữ lại sheet Backend và KPI
    keep = keep.concat(['Backend', 'KPI']);
    
    // Danh sách các sheet rác và các sheet cũ không còn sử dụng cần xóa sạch
    var blackList = [
      'Mail', 'log', 'lichsu_donhang', 'lichsu_xe', 
      'DaGhep', 'ChuaGhep', 'HuyGhep', 'Xuathoadon', 
      'removed_cars_log', 'NhatKyChinhSua', 'DangKyCho', 
      'Sheet1', 'TRANG CHỦ', 'DangKy'
    ];

    var count = 0;
    
    // Đảm bảo không xóa nhầm donhang nếu nó là sheet chính
    if (!ss.getSheetByName("donhang")) { ss.insertSheet("donhang"); }

    for (var i = 0; i < sheets.length; i++) {
       var name = sheets[i].getName();
       var shouldDelete = (keep.indexOf(name) === -1) || (blackList.indexOf(name) !== -1);
       
       if (shouldDelete && name !== "donhang" && sheets.length - count > 1) {
           ss.deleteSheet(sheets[i]);
           count++;
       }
    }
    SpreadsheetApp.getActiveSpreadsheet().toast('Đã dọn dẹp thành công ' + count + ' sheet rác!', 'Hoàn tất', 10);
  } catch (e) {
    Logger.log(e);
    SpreadsheetApp.getActiveSpreadsheet().toast('Lỗi: ' + e.message, 'Lỗi', 10);
  }
}

function syncAllFromSupabase() {
  var timestamp = new Date().toLocaleString('vi-VN');
  try {
    var ss;
    try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch(e) { ss = null; }
    if (!ss) ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    try { ss.toast('Đang nạp dữ liệu từ Supabase...', 'Đồng bộ', 30); } catch(ex){}
    
    var successCount = 0;
    var failedTables = [];
    
    for (var i = 0; i < TABLES_TO_SYNC.length; i++) {
      var tbl = TABLES_TO_SYNC[i];
      try {
        var url = SUPABASE_URL + "/rest/v1/" + tbl.table + "?select=*";
        var response = UrlFetchApp.fetch(url, {
          method: "get",
          headers: {
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": "Bearer " + SUPABASE_SERVICE_KEY
          },
          muteHttpExceptions: true
        });
        
        var code = response.getResponseCode();
        if (code !== 200) {
          Logger.log("Bỏ qua bảng " + tbl.table + " (HTTP " + code + "): " + response.getContentText().substring(0, 200));
          failedTables.push(tbl.table + "(HTTP" + code + ")");
          continue;
        }
        
        var data = JSON.parse(response.getContentText());
        if (!Array.isArray(data)) {
          Logger.log("Bỏ qua bảng " + tbl.table + " - không phải mảng");
          failedTables.push(tbl.table + "(not array)");
          continue;
        }
        
        writeSheet(ss, tbl.table, tbl.sheet, data);
        successCount++;
      } catch (tableErr) {
        Logger.log("Lỗi bảng " + tbl.table + ": " + tableErr.message);
        failedTables.push(tbl.table);
      }
    }
    
    SpreadsheetApp.flush();
    var msg = 'Đồng bộ ' + successCount + '/' + TABLES_TO_SYNC.length + ' bảng lúc ' + timestamp;
    if (failedTables.length > 0) msg += ' | Bỏ qua: ' + failedTables.join(', ');
    Logger.log(msg);
    try { ss.toast(msg, 'Hoàn tất', 10); } catch(ex){}
    return true;
  } catch (e) {
    Logger.log("Lỗi đồng bộ tổng: " + e.message + " | Stack: " + e.stack);
    return false;
  }
}

function writeSheet(ss, tableName, sheetName, data) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  
  sheet.clear(); // Xóa sạch dữ liệu và định dạng cũ
  
  var rows = [];
  var config = CUSTOM_CONFIGS[sheetName];
  
  if (data && data.length > 0) {
    // Trường hợp có cấu hình cột tùy chỉnh
    if (config) {
      var headers = config.columns.map(function(c) { return c.label; });
      rows.push(headers);
      
      data.forEach(function(item, index) {
        var rowData = [];
        config.columns.forEach(function(col) {
          if (col.key === 'stt') {
            rowData.push(index + 1);
            return;
          }
          
          var val = item[col.key];
          if (val === null || val === undefined) { val = ""; }
          
          // Xử lý định dạng dữ liệu thô trước khi ghi xuống
          if (col.type === 'datetime' || col.type === 'date') {
            if (val) {
              var d = new Date(val);
              if (!isNaN(d.getTime())) val = d;
            }
          } else if (col.type === 'number') {
            val = val ? parseFloat(val) : 0;
          } else if (col.type === 'link' && val && val.toString().startsWith('http')) {
            var downloadUrl = toDownloadUrl(val);
            val = '=HYPERLINK("' + downloadUrl + '";"Tải File")';
          }
          
          rowData.push(val);
        });
        rows.push(rowData);
      });
    } else {
      // Trường hợp mặc định: Lấy tất cả các field từ database
      var headers = Object.keys(data[0]);
      rows.push(headers);
      
      data.forEach(function(row) {
        var rowData = [];
        headers.forEach(function(h) {
            var val = row[h];
            if (val === null || val === undefined) { val = ""; } 
            else if (typeof val === 'object') { val = JSON.stringify(val); }
            rowData.push(val);
        });
        rows.push(rowData);
      });
    }
  } else {
    rows.push(['Không có dữ liệu hiện có trong bảng ' + tableName]);
  }
  
  if (rows.length > 0) {
    var numRows = rows.length;
    var numCols = rows[0].length;
    
    // Đảm bảo sheet đủ kích thước
    var maxRows = sheet.getMaxRows();
    var maxCols = sheet.getMaxColumns();
    if (numRows > maxRows) sheet.insertRowsAfter(maxRows, numRows - maxRows);
    if (numCols > maxCols) sheet.insertColumnsAfter(maxCols, numCols - maxCols);
    
    // Ghi dữ liệu
    sheet.getRange(1, 1, numRows, numCols).setValues(rows);
    
    // Áp dụng định dạng cao cấp
    if (data && data.length > 0) {
       // 1. Định dạng Tiêu đề (Header)
       var headerRange = sheet.getRange(1, 1, 1, numCols);
       if (config) {
         headerRange.setBackground(config.headerColor)
                    .setFontColor(config.headerTextColor)
                    .setFontWeight("bold")
                    .setHorizontalAlignment("center")
                    .setVerticalAlignment("middle")
                    .setFontSize(11);
       } else {
         headerRange.setFontWeight("bold").setBackground("#e2e8f0").setHorizontalAlignment("center");
       }
       
       // 2. Cố định dòng đầu
       try { sheet.setFrozenRows(1); } catch (err){}
       
       // 3. Định dạng dữ liệu theo cột (nếu có config)
       if (config) {
          config.columns.forEach(function(col, i) {
            var colIndex = i + 1;
            var colRange = sheet.getRange(2, colIndex, numRows - 1, 1);
            
            if (col.type === 'datetime') {
              colRange.setNumberFormat("dd/mm/yyyy hh:mm:ss");
            } else if (col.type === 'date') {
              colRange.setNumberFormat("dd/mm/yyyy");
            } else if (col.type === 'number') {
              colRange.setNumberFormat("#,##0");
            } else if (col.type === 'link') {
              colRange.setFontColor("#1d4ed8").setFontLine("underline");
            }
          });
          
          // Định dạng xen kẽ màu dòng (Zebra striping)
          for (var r = 2; r <= numRows; r++) {
            var color = (r % 2 === 0) ? (config.rowColor1 || "#ffffff") : (config.rowColor2 || "#f8fafc");
            sheet.getRange(r, 1, 1, numCols).setBackground(color);
          }
       }
       
       // 4. Đường viền và Font chữ chung
       var fullRange = sheet.getRange(1, 1, numRows, numCols);
       fullRange.setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);
       fullRange.setFontFamily("Roboto");
       fullRange.setVerticalAlignment("middle");
       
       // 5. Tự động chỉnh độ rộng cột
       sheet.autoResizeColumns(1, numCols);
       for (var c = 1; c <= numCols; c++) {
         var w = sheet.getColumnWidth(c);
         if (w > 400) sheet.setColumnWidth(c, 400); // Giới hạn max width
         else sheet.setColumnWidth(c, w + 15); // Thêm chút padding
       }
    }
  }
}

/**
 * Đồng bộ duy nhất một bảng cụ thể (Dùng cho Webhook tự động từ Supabase)
 */
function syncSpecificTableToSheet(tableName) {
  var tbl = TABLES_TO_SYNC.find(function(t) { return t.table === tableName; });
  if (!tbl) return false;
  
  var ss;
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch(e) { ss = null; }
  if (!ss) ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  try {
    var url = SUPABASE_URL + "/rest/v1/" + tbl.table + "?select=*";
    var response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": "Bearer " + SUPABASE_SERVICE_KEY
      },
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() === 200) {
      var data = JSON.parse(response.getContentText());
      if (Array.isArray(data)) {
        writeSheet(ss, tbl.table, tbl.sheet, data);
        return true;
      }
    }
  } catch (e) {
    Logger.log("Lỗi SyncSpecific cho " + tableName + ": " + e.message);
  }
  return false;
}

/**
 * Cập nhật GIẢM THIỂU: Chỉ cập nhật duy nhất 1 dòng thay đổi
 */
function syncOneRecordToSheet(tableName, record, action) {
  var tbl = TABLES_TO_SYNC.find(function(t) { return t.table === tableName; });
  if (!tbl) return false;
  
  var ss;
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch(e) { ss = null; }
  if (!ss) ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  var sheet = ss.getSheetByName(tbl.sheet);
  if (!sheet) return syncSpecificTableToSheet(tableName); // Nếu chưa có sheet thì sync toàn bộ
  
  var config = CUSTOM_CONFIGS[tbl.sheet];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 1) return syncSpecificTableToSheet(tableName);

  // 1. Xác định cột chứa Key và loại Key (Số đơn hàng, vin hoặc id)
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var keyColIndex = -1;
  var matchedKeyField = ""; // Lưu lại field nào đã khớp
  
  // Mapping giữa tiêu đề sheet và field trong record
  var keyMapping = {
    "id": "id", "ID": "id",
    "so_don_hang": "so_don_hang", "Số đơn hàng": "so_don_hang",
    "vin": "vin", "Số VIN": "vin"
  };
  
  var normalizedHeaders = headers.map(function(h) { return normalizeString(h); });
  
  // Tìm kiếm key theo thứ tự ưu tiên: so_don_hang > vin > id (hoặc ngược lại tùy cấu trúc sheet)
  // Thực tế: Tìm cái nào có TRÊN SHEET trước
  for (var k in keyMapping) {
    var idx = normalizedHeaders.indexOf(normalizeString(k));
    if (idx !== -1) {
      keyColIndex = idx + 1;
      matchedKeyField = keyMapping[k];
      break;
    }
  }
  
  if (keyColIndex === -1) {
    logAction("Sync Warning", "Không thấy cột khóa chính (id/vin/donhang) cho bảng " + tableName);
    return syncSpecificTableToSheet(tableName);
  }

  // 2. Lấy giá trị chính xác từ record để so sánh
  var keyValue = record[matchedKeyField];
  var targetRow = -1;
  
  if (lastRow > 1 && keyValue) {
    var keyData = sheet.getRange(2, keyColIndex, lastRow - 1, 1).getValues();
    var searchVal = String(keyValue).trim().toLowerCase();
    
    for (var r = 0; r < keyData.length; r++) {
      var cellVal = String(keyData[r][0]).trim().toLowerCase();
      if (cellVal === searchVal) {
        targetRow = r + 2;
        break;
      }
    }
  }

  // 4. XỬ LÝ THEO HÀNH ĐỘNG (Lưu ý: record có thể là null khi Xóa)
  if (action === "DELETE") {
    // Nếu có lệnh DELETE, tìm dòng và xóa
    if (targetRow !== -1) {
      sheet.deleteRow(targetRow);
      logAction("Auto-Sync", `Đã xóa dòng cho đơn ${keyValue} trên sheet ${tbl.sheet}`);
      return true;
    }
    return false;
  }

  // 5. Chuẩn bị dữ liệu dòng mới (Chỉ INSERT/UPDATE)
  var newRow = [];
  if (config) {
    config.columns.forEach(function(col) {
      if (col.key === 'stt') {
        newRow.push(targetRow !== -1 ? sheet.getRange(targetRow, 1).getValue() : lastRow);
        return;
      }
      var val = record[col.key];
      if (val === null || val === undefined) val = "";
      if (col.type === 'datetime' || col.type === 'date') {
        if (val) { var d = new Date(val); if (!isNaN(d.getTime())) val = d; }
      } else if (col.type === 'number') {
        val = val ? parseFloat(val) : 0;
      } else if (col.type === 'link' && val && val.toString().startsWith('http')) {
        val = '=HYPERLINK("' + toDownloadUrl(val) + '";"Tải File")';
      }
      newRow.push(val);
    });
  } else {
    headers.forEach(function(h) {
      var val = record[h];
      if (val === null || val === undefined) val = "";
      newRow.push(val);
    });
  }

  // 6. Ghi đè hoặc Thêm mới
  if (targetRow !== -1) {
    sheet.getRange(targetRow, 1, 1, newRow.length).setValues([newRow]);
  } else {
    sheet.appendRow(newRow);
    targetRow = sheet.getLastRow();
  }

  // 7. Áp dụng định dạng nhanh cho dòng đó
  var rowRange = sheet.getRange(targetRow, 1, 1, newRow.length);
  rowRange.setFontFamily("Roboto").setFontSize(10).setVerticalAlignment("middle");
  
  // Zebra striping
  if (config && config.rowColor1 && config.rowColor2) {
    var color = (targetRow % 2 === 0) ? config.rowColor2 : config.rowColor1;
    rowRange.setBackground(color);
  }
  
  return true;
}
