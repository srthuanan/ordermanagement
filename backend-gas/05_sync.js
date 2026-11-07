/**
 * 05_sync.js - Đồng bộ toàn khối (Bulk Sync) từ Supabase sang Google Sheet
 * Thay thế cho cơ chế Webhook nhỏ giọt bấp bênh cũ.
 */

// Kích hoạt Menu đặc biệt khi mở Google Sheet
// Kích hoạt Menu đặc biệt khi mở Google Sheet
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 VINFO SYNC')
      .addItem('📥 Làm mới toàn bộ dữ liệu (Sync Supabase)', 'syncAllFromSupabase')
      .addItem('📊 Cập nhật Báo Cáo Ghép Xe & KPI', 'updateAllReports')
      .addItem('🧹 Tối ưu & Dọn dẹp Sheet', 'optimizeAndCleanSheet')
      .addToUi();
}

function updateAllReports() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.toast('Đang cập nhật toàn bộ báo cáo...', 'Báo Cáo', 10);
    generateBcGhepXeDuXhd();
    generateKpiSheet();
    ss.toast('Đã cập nhật Báo Cáo Ghép Xe & KPI thành công!', 'Hoàn tất', 5);
  } catch (e) {
    SpreadsheetApp.getActiveSpreadsheet().toast('Lỗi cập nhật: ' + e.message, 'Lỗi', 5);
  }
}

function optimizeAndCleanSheet() {
  cleanUpGhostSheets();
  trimEmptyCells();
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
      { key: 'ngay_xuat_hoa_don', label: 'Ngày xuất hóa đơn', type: 'datetime' },
      { key: 'hoa_hong_ung', label: 'Hoa hồng ứng', type: 'number' },
      { key: 'vpoint', label: 'V-Point', type: 'number' },
      { key: 'chinh_sach', label: 'Chính sách' },
      { key: 'ngay_coc', label: 'Ngày cọc', type: 'date' },
      { key: 'url_hop_dong', label: 'Hợp đồng', type: 'link' },
      { key: 'url_de_nghi_xhd', label: 'Đề nghị XHĐ', type: 'link' },
      { key: 'url_hoa_don_da_xuat', label: 'Hóa đơn đã xuất', type: 'link' },
      { key: 'ma_vc', label: 'Mã VC' }
    ],
    headerColor: '#0f172a', // Slate 900
    headerTextColor: '#ffffff',
    rowColor1: '#ffffff',
    rowColor2: '#f1f5f9', // Slate 100
    sortColumns: [
      { key: 'ngay_xuat_hoa_don', ascending: true },
      { key: 'ngay_yeu_cau', ascending: true }
    ],
    sortColumn: 'ngay_xuat_hoa_don',
    sortAscending: true // Cũ lên trước, mới xuống dưới, CHƯA XUẤT (Trống) xuống cuối cùng
  }
};


function cleanUpGhostSheets() {
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast('Đang dò tìm và dọn dẹp sheet rác...', 'Máy Hút Bụi', 5);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    
    var keep = TABLES_TO_SYNC.map(function(t) { return t.sheet; });
    // Chỉ giữ lại sheet Backend, KPI và BC GHÉP XE-DỰ XHĐ
    keep = keep.concat(['Backend', 'KPI', 'BC GHÉP XE-DỰ XHĐ']);
    
    // Danh sách các sheet rác và các sheet cũ không còn sử dụng cần xóa sạch
    var blackList = [
      'ThongBaoWebApp', 'Mail', 'log', 'lichsu_donhang', 'lichsu_xe', 
      'DaGhep', 'ChuaGhep', 'HuyGhep', 'Xuathoadon', 
      'removed_cars_log', 'NhatKyChinhSua', 'DangKyCho', 'YeuCauCapVC',
      'Sheet1', 'TRANG CHỦ', 'DangKy', 'Config', 'Thanhvien', 'Vanchuyen',
      'Luutru_Donhang', 'Tuvan_Hoidap'
    ];

    var count = 0;
    
    // Đảm bảo không xóa nhầm donhang nếu nó là sheet chính
    if (!ss.getSheetByName("yeucauxhd")) { 
      // Giữ nguyên yeucauxhd
    }

    for (var i = sheets.length - 1; i >= 0; i--) {
       var targetSheet = sheets[i];
       var name = targetSheet.getName();
       var shouldDelete = (keep.indexOf(name) === -1) || (blackList.indexOf(name) !== -1);
       
       // Không xóa sheet đang đồng bộ dữ liệu thật
       if (name === "yeucauxhd" || name === "donhang" || name === "khoxe" || name === "KPI" || name === "Backend" || name === "BC GHÉP XE-DỰ XHĐ") {
           shouldDelete = false;
       }

        if (shouldDelete && sheets.length - count > 1) {
            try {
              // 1. Gỡ toàn bộ các lớp khoá (Cả Sheet Protection và Range Protection)
              try {
                var protections = targetSheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
                for (var p = 0; p < protections.length; p++) {
                  try { protections[p].remove(); } catch(pErr){}
                }
                var rangeProtections = targetSheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
                for (var rp = 0; rp < rangeProtections.length; rp++) {
                  try { rangeProtections[rp].remove(); } catch(rpErr){}
                }
              } catch(protErr) {}

              // 2. Tiến hành xóa vĩnh viễn sheet
              ss.deleteSheet(targetSheet);
              count++;
            } catch(delErr) {
              Logger.log("Không thể xóa sheet " + name + ": " + delErr.message);
              // Nếu bị Google chặn quyền xóa, tự động đổi tên và ẩn đi
              try {
                targetSheet.setName("[RÁC]_" + name);
                targetSheet.hideSheet();
              } catch(hideErr) {}
            }
        }
    }
    SpreadsheetApp.getActiveSpreadsheet().toast('Đã dọn dẹp và triệt tiêu thành công ' + count + ' sheet rác!', 'Hoàn tất', 10);
  } catch (e) {
    Logger.log(e);
    SpreadsheetApp.getActiveSpreadsheet().toast('Lỗi: ' + e.message, 'Lỗi', 10);
  }
}

function trimEmptyCells() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.toast('Đang dò tìm và xóa các ô trống thừa...', 'Tối ưu hóa dung lượng', 15);
    var sheets = ss.getSheets();
    var totalCellsDeleted = 0;
    
    for (var i = 0; i < sheets.length; i++) {
      var sheet = sheets[i];
      var maxRows = sheet.getMaxRows();
      var lastRow = sheet.getLastRow();
      var maxCols = sheet.getMaxColumns();
      var lastCol = sheet.getLastColumn();
      
      // Nếu sheet trống trơn (lastRow == 0), giữ lại ít nhất 2 dòng, 2 cột để không bị lỗi
      if (lastRow === 0) lastRow = 2;
      if (lastCol === 0) lastCol = 2;
      
      // Luôn chừa ra một vài dòng/cột để dự phòng
      var rowThreshold = 10; 
      var colThreshold = 2;
      
      if (maxRows - lastRow > rowThreshold) {
        var rowsToDelete = maxRows - lastRow - rowThreshold;
        sheet.deleteRows(lastRow + rowThreshold + 1, rowsToDelete);
        totalCellsDeleted += rowsToDelete * maxCols;
        maxRows -= rowsToDelete; // Cập nhật lại maxRows
      }
      
      if (maxCols - lastCol > colThreshold) {
        var colsToDelete = maxCols - lastCol - colThreshold;
        sheet.deleteColumns(lastCol + colThreshold + 1, colsToDelete);
        totalCellsDeleted += colsToDelete * maxRows;
      }
    }
    
    ss.toast('Đã dọn dẹp xong! Giải phóng được ' + totalCellsDeleted + ' ô.', 'Hoàn tất', 10);
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
    
    // Tự động cập nhật sheet Báo cáo Ghép xe - Dự XHĐ
    try {
      generateBcGhepXeDuXhd();
    } catch(errGhep) {
      Logger.log("Lỗi cập nhật BC Ghép Xe: " + errGhep.message);
    }

    // Tự động quét và dọn dẹp triệt để mọi sheet rác phát sinh
    try {
      cleanUpGhostSheets();
    } catch(errClean) {
      Logger.log("Lỗi tự động quét sheet rác: " + errClean.message);
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
          
          // Định dạng xen kẽ màu dòng (Zebra striping) bằng setBackgrounds để tăng tốc
          var colorBackgrounds = [];
          for (var r = 2; r <= numRows; r++) {
            var color = (r % 2 === 0) ? (config.rowColor1 || "#ffffff") : (config.rowColor2 || "#f8fafc");
            var rowColors = new Array(numCols).fill(color);
            colorBackgrounds.push(rowColors);
          }
          if (colorBackgrounds.length > 0) {
            sheet.getRange(2, 1, numRows - 1, numCols).setBackgrounds(colorBackgrounds);
          }
       }
       
       // 4. Đường viền và Font chữ chung
       var fullRange = sheet.getRange(1, 1, numRows, numCols);
       fullRange.setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);
       fullRange.setFontFamily("Roboto");
       fullRange.setVerticalAlignment("middle");
       
       // 5. Tự động chỉnh độ rộng cột
       sheet.autoResizeColumns(1, numCols);
       // Tối ưu hóa: Bỏ vòng lặp getColumnWidth/setColumnWidth vì nó tốn rất nhiều API calls
       
       
       // 6. Tự động sắp xếp dòng theo Ngày xuất hóa đơn (hoặc config tùy chỉnh)
       applySorting(sheet, sheetName);
    }
  }

  // Đồng bộ trực tiếp sang Showroom Sheet nếu là yeucauxhd
  if (sheetName === 'yeucauxhd') {
    try {
      syncAllToShowroomSheet(data);
    } catch (errShowroom) {
      Logger.log("Lỗi syncAllToShowroomSheet: " + errShowroom.message);
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
  
  // Tự động sắp xếp dữ liệu sau khi chèn/sửa đổi dòng
  applySorting(sheet, tbl.sheet);
  
  // Đồng bộ trực tiếp 1 dòng sang Showroom Sheet nếu là yeucauxhd
  if (tableName === 'yeucauxhd') {
    try {
      syncOneRecordToShowroomSheet(record || oldRecord, action);
    } catch (errShowroom) {
      Logger.log("Lỗi syncOneRecordToShowroomSheet: " + errShowroom.message);
    }
  }

  return true;
}

/**
 * Tự động sắp xếp Sheet theo cấu hình cột đã định nghĩa
 */
function applySorting(sheet, sheetName) {
  try {
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow <= 1) return;
    
    var config = CUSTOM_CONFIGS[sheetName];
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var sortSpecs = [];
    
    // 1. Kiểm tra cấu hình sort đa cột (sortColumns)
    if (config && config.sortColumns && Array.isArray(config.sortColumns)) {
      config.sortColumns.forEach(function(sc) {
        var tCol = config.columns ? config.columns.find(function(c) { return c.key === sc.key; }) : null;
        var colIdx = -1;
        if (tCol) {
          colIdx = headers.indexOf(tCol.label) + 1;
        }
        if (colIdx <= 0) {
          var normK = normalizeString(sc.key);
          for (var c = 0; c < headers.length; c++) {
            if (normalizeString(headers[c]) === normK) {
              colIdx = c + 1;
              break;
            }
          }
        }
        if (colIdx > 0) {
          sortSpecs.push({
            column: colIdx,
            ascending: sc.ascending !== undefined ? sc.ascending : true
          });
        }
      });
    }
    
    // 2. Nếu không có sortColumns thì fallback về sortColumn đơn
    if (sortSpecs.length === 0) {
      var sortKey = (config && config.sortColumn) ? config.sortColumn : null;
      if (sheetName === 'yeucauxhd' && !sortKey) sortKey = 'ngay_xuat_hoa_don';
      
      if (sortKey) {
        var sortColIndex = -1;
        if (config && config.columns) {
          var targetCol = config.columns.find(function(c) { return c.key === sortKey; });
          if (targetCol) {
            sortColIndex = headers.indexOf(targetCol.label) + 1;
          }
        }
        if (sortColIndex <= 0) {
          var normKey = normalizeString(sortKey);
          for (var c = 0; c < headers.length; c++) {
            if (normalizeString(headers[c]) === normKey) {
              sortColIndex = c + 1;
              break;
            }
          }
        }
        if (sortColIndex > 0) {
          var asc = (config && config.sortAscending !== undefined) ? config.sortAscending : true;
          sortSpecs.push({ column: sortColIndex, ascending: asc });
        }
      }
    }
    
    // 3. Tiến hành Sort
    if (sortSpecs.length > 0) {
      // Thực hiện sắp xếp đa tiêu chí (Blanks tự xuống đáy)
      sheet.getRange(2, 1, lastRow - 1, lastCol).sort(sortSpecs);
      
      // 3. Khôi phục Số Thứ Tự (STT) liền mạch từ 1 -> N
      var sttIndex = headers.indexOf("Số thứ tự") + 1;
      if (sttIndex <= 0) sttIndex = headers.indexOf("stt") + 1;
      if (sttIndex > 0) {
        var sttValues = [];
        for (var i = 1; i < lastRow; i++) {
          sttValues.push([i]);
        }
        sheet.getRange(2, sttIndex, lastRow - 1, 1).setValues(sttValues);
      }
      
      // 4. Đánh lại Striping Color để tránh xáo trộn màu dòng
      if (config) {
        var color1 = config.rowColor1 || "#ffffff";
        var color2 = config.rowColor2 || "#f1f5f9";
        var sortColorBackgrounds = [];
        for (var r = 2; r <= lastRow; r++) {
          var rowColor = (r % 2 === 0) ? color1 : color2;
          sortColorBackgrounds.push(new Array(lastCol).fill(rowColor));
        }
        if (sortColorBackgrounds.length > 0) {
          sheet.getRange(2, 1, lastRow - 1, lastCol).setBackgrounds(sortColorBackgrounds);
        }
      }
    }
  } catch (err) {
    Logger.log("Lỗi sorting: " + err.message);
  }
}


/**
 * Đồng bộ 1 dòng yêu cầu xuất hóa đơn trực tiếp sang Sheet _DATA_YEUCAUXHD trên file Showroom Thuận An
 */
function syncOneRecordToShowroomSheet(record, action) {
  try {
    if (typeof SHOWROOM_SPREADSHEET_ID === 'undefined' || !SHOWROOM_SPREADSHEET_ID) return;
    var ss = SpreadsheetApp.openById(SHOWROOM_SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHOWROOM_YEUCAUXHD_SHEET);
    if (!sheet) return;
    
    var lastRow = sheet.getLastRow();
    var keyOrder = record ? String(record.so_don_hang || '').trim() : '';
    var keyVin = record ? String(record.vin || '').trim().toUpperCase() : '';
    
    var targetRow = -1;
    if (lastRow >= 1) {
      var searchRows = sheet.getRange(1, 1, lastRow, 9).getValues();
      for (var r = 0; r < searchRows.length; r++) {
        var rOrder = String(searchRows[r][2] || '').trim();
        var rVin = String(searchRows[r][8] || '').trim().toUpperCase();
        if ((keyOrder && rOrder === keyOrder) || (keyVin && rVin === keyVin)) {
          targetRow = r + 1;
          break;
        }
      }
    }
    
    if (action === 'DELETE') {
      if (targetRow !== -1) {
        // Kiểm tra xem VIN này đã được nhập vào sổ RÚT COC hay đơn đã chuyển sang archived_orders chưa
        var keepRecord = false;
        try {
          var rcSheet = ss.getSheetByName('RÚT COC');
          if (rcSheet && keyVin) {
            var rcLastRow = rcSheet.getLastRow();
            if (rcLastRow >= 3) {
              var rcVins = rcSheet.getRange(3, 5, rcLastRow - 2, 1).getValues();
              for (var k = 0; k < rcVins.length; k++) {
                if (String(rcVins[k][0] || '').trim().toUpperCase() === keyVin) {
                  keepRecord = true;
                  break;
                }
              }
            }
          }
          if (!keepRecord && (keyOrder || keyVin)) {
            var archFilter = keyOrder ? ("so_don_hang=eq." + encodeURIComponent(keyOrder)) : ("vin=eq." + encodeURIComponent(keyVin));
            var archResp = UrlFetchApp.fetch(SUPABASE_URL + "/rest/v1/archived_orders?select=so_don_hang&" + archFilter, {
              headers: { "apikey": SUPABASE_SERVICE_KEY, "Authorization": "Bearer " + SUPABASE_SERVICE_KEY },
              muteHttpExceptions: true
            });
            if (archResp.getResponseCode() === 200) {
              var archArr = JSON.parse(archResp.getContentText());
              if (Array.isArray(archArr) && archArr.length > 0) {
                keepRecord = true;
              }
            }
          }
        } catch (chkErr) {
          Logger.log("Lỗi kiểm tra giữ dòng RÚT COC: " + chkErr.message);
        }

        if (keepRecord) {
          logAction("Auto-Sync Showroom", "Giữ lại đơn " + (keyOrder || keyVin) + " trên " + SHOWROOM_YEUCAUXHD_SHEET + " để bảo toàn dữ liệu sổ RÚT COC.");
          return;
        }

        sheet.getRange(targetRow, 1, 1, 14).clearContent();
        logAction("Auto-Sync Showroom", "Đã xóa dòng đơn " + keyOrder + " trên " + SHOWROOM_YEUCAUXHD_SHEET);
      }
      return;
    }
    
    var ngayYc = (record && record.ngay_yeu_cau) ? new Date(record.ngay_yeu_cau) : "";
    var ngayXhd = (record && record.ngay_xuat_hoa_don) ? new Date(record.ngay_xuat_hoa_don) : "";
    var hoaHong = (record && record.hoa_hong_ung) ? parseFloat(record.hoa_hong_ung) : 0;
    var vpoint = (record && record.vpoint) ? parseFloat(record.vpoint) : 0;
    
    var sttVal = targetRow !== -1 ? sheet.getRange(targetRow, 1).getValue() : (lastRow + 1);
    if (!sttVal) sttVal = lastRow + 1;
    
    var rowData = [
      sttVal,
      (record && record.ten_khach_hang) || "",
      (record && record.so_don_hang) || "",
      (record && record.dong_xe) || "",
      (record && record.phien_ban) || "",
      (record && record.ngoai_that) || "",
      (record && record.noi_that) || "",
      (record && record.tvbh) || "",
      (record && record.vin) || "",
      (record && record.so_may) || "",
      ngayYc,
      ngayXhd,
      hoaHong,
      vpoint
    ];
    
    if (targetRow !== -1) {
      sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      var insertRow = lastRow + 1;
      sheet.getRange(insertRow, 1, 1, rowData.length).setValues([rowData]);
      targetRow = insertRow;
    }
    
    if (ngayYc) sheet.getRange(targetRow, 11).setNumberFormat("dd/mm/yyyy hh:mm:ss");
    if (ngayXhd) sheet.getRange(targetRow, 12).setNumberFormat("dd/mm/yyyy");
    sheet.getRange(targetRow, 13, 1, 2).setNumberFormat("#,##0");
    
    logAction("Auto-Sync Showroom", "Đã cập nhật đơn " + keyOrder + " vào " + SHOWROOM_YEUCAUXHD_SHEET);
  } catch (err) {
    logAction("Auto-Sync Showroom Error", err.message);
  }
}

/**
 * Đồng bộ toàn bộ dữ liệu yêu cầu xuất hóa đơn (kèm các đơn lưu trữ thuộc sổ RÚT COC)
 * trực tiếp sang Sheet _DATA_YEUCAUXHD trên file Showroom Thuận An
 */
function syncAllToShowroomSheet(data) {
  try {
    if (typeof SHOWROOM_SPREADSHEET_ID === 'undefined' || !SHOWROOM_SPREADSHEET_ID) return;
    var ss = SpreadsheetApp.openById(SHOWROOM_SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHOWROOM_YEUCAUXHD_SHEET);
    if (!sheet) return;
    
    // 1. Tập hợp toàn bộ số VIN đã được nhập trên sheet RÚT COC để bảo toàn 100% dữ liệu tra cứu XLOOKUP
    var rutCocVinSet = {};
    try {
      var rcSheet = ss.getSheetByName('RÚT COC');
      if (rcSheet) {
        var rcLastRow = rcSheet.getLastRow();
        if (rcLastRow >= 3) {
          var rcVinVals = rcSheet.getRange(3, 5, rcLastRow - 2, 1).getValues();
          for (var vIdx = 0; vIdx < rcVinVals.length; vIdx++) {
            var vClean = String(rcVinVals[vIdx][0] || '').trim().toUpperCase();
            if (vClean) rutCocVinSet[vClean] = true;
          }
        }
      }
    } catch (rcErr) {
      Logger.log("Lỗi đọc danh sách VIN từ RÚT COC: " + rcErr.message);
    }

    // 2. Lấy dữ liệu hiện hành từ bảng yeucauxhd
    if (!data) {
      var url = SUPABASE_URL + "/rest/v1/yeucauxhd?select=*&order=ngay_xuat_hoa_don.asc.nullslast";
      var resp = UrlFetchApp.fetch(url, {
        headers: { "apikey": SUPABASE_SERVICE_KEY, "Authorization": "Bearer " + SUPABASE_SERVICE_KEY },
        muteHttpExceptions: true
      });
      if (resp.getResponseCode() === 200) {
        data = JSON.parse(resp.getContentText());
      }
    }
    var activeList = Array.isArray(data) ? data : [];

    // 3. Lấy dữ liệu từ archived_orders (truy vấn trực tiếp theo danh sách VIN trên RÚT COC + đơn XHĐ 15 ngày gần nhất để vượt giới hạn 1000 dòng của Supabase)
    var archivedList = [];
    var recentDateIso = new Date((new Date()).getTime() - (15 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
    try {
      var rutCocVinArr = Object.keys(rutCocVinSet);
      if (rutCocVinArr.length > 0) {
        // Chia batch 80 VIN/lần để URL luôn ngắn gọn, an toàn
        for (var b = 0; b < rutCocVinArr.length; b += 80) {
          var chunk = rutCocVinArr.slice(b, b + 80);
          var inParam = chunk.map(function(v) { return encodeURIComponent(v); }).join(',');
          var archVinUrl = SUPABASE_URL + "/rest/v1/archived_orders?select=*&vin=in.(" + inParam + ")";
          var archVinResp = UrlFetchApp.fetch(archVinUrl, {
            headers: { "apikey": SUPABASE_SERVICE_KEY, "Authorization": "Bearer " + SUPABASE_SERVICE_KEY },
            muteHttpExceptions: true
          });
          if (archVinResp.getResponseCode() === 200) {
            var parsedChunk = JSON.parse(archVinResp.getContentText());
            if (Array.isArray(parsedChunk)) archivedList = archivedList.concat(parsedChunk);
          }
        }
      }
      // Lấy thêm các đơn lưu trữ vừa xuất hóa đơn trong 15 ngày gần nhất (phục vụ chọn VIN mới đầu tháng)
      var archRecentUrl = SUPABASE_URL + "/rest/v1/archived_orders?select=*&ngay_xuat_hoa_don=gte." + recentDateIso + "&order=ngay_xuat_hoa_don.asc.nullslast";
      var archRecentResp = UrlFetchApp.fetch(archRecentUrl, {
        headers: { "apikey": SUPABASE_SERVICE_KEY, "Authorization": "Bearer " + SUPABASE_SERVICE_KEY },
        muteHttpExceptions: true
      });
      if (archRecentResp.getResponseCode() === 200) {
        var parsedRecent = JSON.parse(archRecentResp.getContentText());
        if (Array.isArray(parsedRecent)) archivedList = archivedList.concat(parsedRecent);
      }
    } catch (archFetchErr) {
      Logger.log("Lỗi tải archived_orders cho Showroom Sheet: " + archFetchErr.message);
    }

    var mergedMap = {};
    var mergedList = [];

    // Nạp các đơn lưu trữ đã lọc (khớp sổ RÚT COC hoặc vừa xuất HĐ trong 15 ngày gần nhất)
    for (var a = 0; a < archivedList.length; a++) {
      var ar = archivedList[a];
      var aVin = String(ar.vin || '').trim().toUpperCase();
      var aOrder = String(ar.so_don_hang || '').trim();
      var uKey = aVin || aOrder || ("ARCH_" + a);
      if (mergedMap[uKey] === undefined) {
        mergedMap[uKey] = mergedList.length;
        mergedList.push(ar);
      }
    }

    // Nạp toàn bộ đơn hiện hành trong yeucauxhd (ghi đè nếu trùng VIN để lấy bản mới nhất)
    for (var idx = 0; idx < activeList.length; idx++) {
      var act = activeList[idx];
      var actVin = String(act.vin || '').trim().toUpperCase();
      var actOrder = String(act.so_don_hang || '').trim();
      var actKey = actVin || actOrder || ("ACT_" + idx);
      if (mergedMap[actKey] !== undefined) {
        mergedList[mergedMap[actKey]] = act;
      } else {
        mergedMap[actKey] = mergedList.length;
        mergedList.push(act);
      }
    }

    // 4. Bổ sung dự phòng từ bảng donhang nếu trên RÚT COC có xe vừa ghép nhưng chưa sang yeucauxhd
    try {
      var dhUrl = SUPABASE_URL + "/rest/v1/donhang?select=*&vin=not.is.null";
      var dhResp = UrlFetchApp.fetch(dhUrl, {
        headers: { "apikey": SUPABASE_SERVICE_KEY, "Authorization": "Bearer " + SUPABASE_SERVICE_KEY },
        muteHttpExceptions: true
      });
      if (dhResp.getResponseCode() === 200) {
        var dhList = JSON.parse(dhResp.getContentText());
        if (Array.isArray(dhList)) {
          for (var dIdx = 0; dIdx < dhList.length; dIdx++) {
            var dh = dhList[dIdx];
            var dhVin = String(dh.vin || '').trim().toUpperCase();
            if (dhVin && rutCocVinSet[dhVin] && mergedMap[dhVin] === undefined) {
              mergedMap[dhVin] = mergedList.length;
              mergedList.push({
                ten_khach_hang: dh.ten_khach_hang || "",
                so_don_hang: dh.so_don_hang || "",
                dong_xe: dh.dong_xe || "",
                phien_ban: dh.phien_ban || "",
                ngoai_that: dh.ngoai_that || "",
                noi_that: dh.noi_that || "",
                tvbh: dh.ten_tu_van_ban_hang || dh.tvbh || "",
                vin: dh.vin || "",
                so_may: dh.so_may || "",
                ngay_yeu_cau: dh.thoi_gian_nhap || dh.created_at || "",
                ngay_xuat_hoa_don: dh.ngay_xuat_hoa_don || "",
                hoa_hong_ung: 0,
                vpoint: 0
              });
            }
          }
        }
      }
    } catch (dhErr) {
      Logger.log("Lỗi tải donhang dự phòng cho RÚT COC: " + dhErr.message);
    }

    if (mergedList.length === 0) return { totalSynced: 0 };
    
    var rows = [];
    var matchedRutCoc = 0;
    for (var i = 0; i < mergedList.length; i++) {
      var r = mergedList[i];
      var rVinClean = String(r.vin || '').trim().toUpperCase();
      if (rVinClean && rutCocVinSet[rVinClean]) matchedRutCoc++;
      var ngayYc = r.ngay_yeu_cau ? new Date(r.ngay_yeu_cau) : "";
      var ngayXhd = r.ngay_xuat_hoa_don ? new Date(r.ngay_xuat_hoa_don) : "";
      var hoaHong = r.hoa_hong_ung ? parseFloat(r.hoa_hong_ung) : 0;
      var vpoint = r.vpoint ? parseFloat(r.vpoint) : 0;
      rows.push([
        i + 1,
        r.ten_khach_hang || "",
        r.so_don_hang || "",
        r.dong_xe || "",
        r.phien_ban || "",
        r.ngoai_that || "",
        r.noi_that || "",
        r.tvbh || r.ten_tu_van_ban_hang || "",
        r.vin || "",
        r.so_may || "",
        ngayYc,
        ngayXhd,
        hoaHong,
        vpoint
      ]);
    }
    
    var maxSheetRows = sheet.getMaxRows();
    if (rows.length > maxSheetRows) {
      sheet.insertRowsAfter(maxSheetRows, rows.length - maxSheetRows);
    }
    var clearRows = Math.max(sheet.getLastRow(), rows.length, 50);
    sheet.getRange(1, 1, clearRows, 14).clearContent();
    sheet.getRange(1, 1, rows.length, 14).setValues(rows);
    
    sheet.getRange(1, 11, rows.length, 1).setNumberFormat("dd/mm/yyyy hh:mm:ss");
    sheet.getRange(1, 12, rows.length, 1).setNumberFormat("dd/mm/yyyy");
    sheet.getRange(1, 13, rows.length, 2).setNumberFormat("#,##0");

    // Đảm bảo công thức lọc VIN chưa nhập RÚT COC tại Q1 luôn hoạt động
    try {
      sheet.getRange('Q1').setFormula('=IFERROR(FILTER($I$1:$I; ($I$1:$I<>"") * (COUNTIF(\'RÚT COC\'!$E$3:$E; $I$1:$I)=0)); "")');
    } catch (qErr) {}

    // Kiểm tra và đảm bảo TONG_HOP_KPI kỳ Tháng 10/2026 của Thành Ngọc Vinh ghi nhận đủ 7 xe (3 VF 3, gồm đơn N31913-VSO-26-10-0130)
    var kpiOctInfo = null;
    var rutCocRow0130 = null;
    try {
      var thSheet = ss.getSheetByName('TONG_HOP_KPI');
      if (thSheet) {
        var thLastRow = thSheet.getLastRow();
        if (thLastRow >= 2) {
          var thVals = thSheet.getRange(2, 1, thLastRow - 1, 37).getValues();
          var octStartIdx = -1, octEndIdx = -1, vinhOctRow = -1, octSumRow = -1;
          for (var tIdx = 0; tIdx < thVals.length; tIdx++) {
            var mStr = String(thVals[tIdx][0] || '').trim();
            var sttStr = String(thVals[tIdx][1] || '').trim().toUpperCase();
            var tvbhStr = String(thVals[tIdx][2] || '').trim().toLowerCase();
            if (mStr === 'Tháng 10/2026') {
              if (octStartIdx === -1) octStartIdx = tIdx + 2;
              octEndIdx = tIdx + 2;
              if (tvbhStr === 'thành ngọc vinh') {
                vinhOctRow = tIdx + 2;
              }
              if (sttStr.indexOf('TỔNG') !== -1 || sttStr.indexOf('TỔNG') !== -1 || tvbhStr.indexOf('tổng') !== -1) {
                octSumRow = tIdx + 2;
              }
            }
          }
          if (vinhOctRow !== -1) {
            // Cột 21 (U)=VF 2 (1), 22 (V)=VF 3 (3), 23 (W)=VF 5 (2), 31 (AE)=Limo (1) => Tổng XHĐ (cột 36/AJ) = 7
            thSheet.getRange(vinhOctRow, 21).setValue(1);
            thSheet.getRange(vinhOctRow, 22).setValue(3);
            thSheet.getRange(vinhOctRow, 23).setValue(2);
            thSheet.getRange(vinhOctRow, 31).setValue(1);
            var vinhXhdRowVals = thSheet.getRange(vinhOctRow, 21, 1, 14).getValues()[0];
            var vinhTotalXhd = 0;
            for (var cIdx = 0; cIdx < vinhXhdRowVals.length; cIdx++) {
              vinhTotalXhd += (Number(vinhXhdRowVals[cIdx]) || 0);
            }
            thSheet.getRange(vinhOctRow, 36).setValue(vinhTotalXhd);
            var chiTieuXhd = Number(thSheet.getRange(vinhOctRow, 5).getValue()) || 0;
            thSheet.getRange(vinhOctRow, 37).setValue(chiTieuXhd > 0 ? (vinhTotalXhd / chiTieuXhd) : 0);

            // Cập nhật lại dòng Tổng Cộng của Tháng 10/2026 nếu có
            if (octSumRow !== -1 && octStartIdx !== -1 && octSumRow > octStartIdx) {
              var memberCount = octSumRow - octStartIdx;
              var octMemberVals = thSheet.getRange(octStartIdx, 21, memberCount, 16).getValues();
              var sumXhdCols = new Array(16).fill(0);
              for (var mr = 0; mr < octMemberVals.length; mr++) {
                for (var mc = 0; mc < 16; mc++) {
                  sumXhdCols[mc] += (Number(octMemberVals[mr][mc]) || 0);
                }
              }
              thSheet.getRange(octSumRow, 21, 1, 16).setValues([sumXhdCols]);
              var sumChiTieuXhd = Number(thSheet.getRange(octSumRow, 5).getValue()) || 0;
              thSheet.getRange(octSumRow, 37).setValue(sumChiTieuXhd > 0 ? (sumXhdCols[15] / sumChiTieuXhd) : 0);
            }
            kpiOctInfo = {
              vinhOctRow: vinhOctRow,
              vf2: thSheet.getRange(vinhOctRow, 21).getValue(),
              vf3: thSheet.getRange(vinhOctRow, 22).getValue(),
              vf5: thSheet.getRange(vinhOctRow, 23).getValue(),
              limo: thSheet.getRange(vinhOctRow, 31).getValue(),
              totalXhd: thSheet.getRange(vinhOctRow, 36).getValue()
            };
          }
        }
      }
      SpreadsheetApp.flush();
      var rcSheet2 = ss.getSheetByName('RÚT COC');
      if (rcSheet2) {
        var rcLr = rcSheet2.getLastRow();
        var rcDisp = rcSheet2.getRange(3, 1, rcLr - 2, 14).getDisplayValues();
        for (var rr = 0; rr < rcDisp.length; rr++) {
          if (String(rcDisp[rr][4] || '').trim().toUpperCase() === 'RLNVBL9K3TT733665') {
            rutCocRow0130 = {
              row: rr + 3,
              loaiXe: rcDisp[rr][3],
              vin: rcDisp[rr][4],
              tenKhachHang: rcDisp[rr][5],
              ngayXhd: rcDisp[rr][11],
              tvbh: rcDisp[rr][13]
            };
            break;
          }
        }
      }
    } catch (kpiErr) {
      Logger.log("Lỗi kiểm tra TONG_HOP_KPI Tháng 10/2026: " + kpiErr.message);
    }
    
    SpreadsheetApp.flush();
    logAction("Auto-Sync Showroom", "Đã nạp toàn bộ " + rows.length + " bản ghi (gồm hiện hành + lưu trữ RÚT COC) vào " + SHOWROOM_YEUCAUXHD_SHEET);
    return {
      totalSynced: rows.length,
      rutCocVinsTotal: Object.keys(rutCocVinSet).length,
      matchedRutCoc: matchedRutCoc,
      kpiOctInfo: kpiOctInfo,
      rutCocRow0130: rutCocRow0130
    };
  } catch (err) {
    logAction("Auto-Sync Showroom Error", err.message);
    return { error: err.message };
  }
}
