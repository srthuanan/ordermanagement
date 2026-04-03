/**
 * 05_sync.js - Đồng bộ toàn khối (Bulk Sync) từ Supabase sang Google Sheet
 * Thay thế cho cơ chế Webhook nhỏ giọt bấp bênh cũ.
 */

// Kích hoạt Menu đặc biệt khi mở Google Sheet
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 VINFO SYNC')
      .addItem('📥 Làm mới toàn bộ dữ liệu (Sync Supabase)', 'syncAllFromSupabase')
      .addSeparator()
      .addItem('🧹 Hút Bụi: Xóa sạch các Sheet rác', 'cleanUpGhostSheets')
      .addToUi();
}

var TABLES_TO_SYNC = [
  { table: 'car_inquiries', sheet: 'car_inquiries' },
  { table: 'chinhsach', sheet: 'chinhsach' },
  { table: 'donhang', sheet: 'donhang' },
  { table: 'donhang_ton', sheet: 'donhang_ton' },
  { table: 'donhanghienhuu', sheet: 'donhanghienhuu' },
  { table: 'interactions', sheet: 'interactions' },
  { table: 'khoxe', sheet: 'khoxe' },
  { table: 'reputation_adjustments', sheet: 'reputation_adjustments' },
  { table: 'test_drive_schedule', sheet: 'test_drive_schedule' },
  { table: 'thongtinxe', sheet: 'thongtinxe' },
  { table: 'user_presence', sheet: 'user_presence' },
  { table: 'user_reputation_cache', sheet: 'user_reputation_cache' },
  { table: 'users', sheet: 'users' },
  { table: 'yeucauvc', sheet: 'yeucauvc' },
  { table: 'yeucauxhd', sheet: 'yeucauxhd' },
  { table: 'archived_orders', sheet: 'archived_orders' },
  { table: 'app_settings', sheet: 'app_settings' }
];

function cleanUpGhostSheets() {
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast('Đang dò tìm và dọn dẹp sheet rác...', 'Máy Hút Bụi', 5);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    
    var keep = TABLES_TO_SYNC.map(function(t) { return t.sheet; });
    keep = keep.concat(['Mail', 'log', 'Backend', 'lichsu_donhang', 'lichsu_xe']);
    var count = 0;
    
    if (!ss.getSheetByName("donhang")) { ss.insertSheet("donhang"); }

    for (var i = 0; i < sheets.length; i++) {
       var name = sheets[i].getName();
       if (keep.indexOf(name) === -1) {
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
  
  sheet.clearContents();
  
  var rows = [];
  if (data && data.length > 0) {
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
  } else {
    rows.push(['Không có dữ liệu (' + tableName + ')']);
  }
  
  if (rows.length > 0) {
    var maxRows = sheet.getMaxRows();
    var maxCols = sheet.getMaxColumns();
    // Expand if needed
    if (rows.length > maxRows) sheet.insertRowsAfter(maxRows, rows.length - maxRows);
    if (rows[0].length > maxCols) sheet.insertColumnsAfter(maxCols, rows[0].length - maxCols);
    
    sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    if (data && data.length > 0) {
       sheet.getRange(1, 1, 1, rows[0].length).setFontWeight("bold").setBackground("#e2e8f0");
       try { sheet.setFrozenRows(1); } catch (err){}
    }
  }
}
