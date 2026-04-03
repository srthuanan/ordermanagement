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
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    try { SpreadsheetApp.getActiveSpreadsheet().toast('Đang nạp 100% dữ liệu từ Supabase...', 'Đồng bộ', 3); } catch(ex){}
    
    for (var i = 0; i < TABLES_TO_SYNC.length; i++) {
       syncTable(ss, TABLES_TO_SYNC[i].table, TABLES_TO_SYNC[i].sheet);
    }
    
    try { SpreadsheetApp.getActiveSpreadsheet().toast('Đồng bộ thành công lúc ' + timestamp, 'Hoàn tất', 5); } catch(ex){}
    return true;
  } catch (e) {
    Logger.log("Lỗi đồng bộ: " + e.message);
    try { SpreadsheetApp.getActiveSpreadsheet().toast('Lỗi: ' + e.message, 'Thất bại!', 10); } catch(ex){}
    return false;
  }
}

function syncTable(ss, tableName, sheetName) {
  var url = SUPABASE_URL + "/rest/v1/" + tableName + "?select=*&order=created_at.desc";
  var options = {
    "method": "get",
    "headers": {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": "Bearer " + SUPABASE_SERVICE_KEY
    }
  };
  
  var response = UrlFetchApp.fetch(url, options);
  var data = JSON.parse(response.getContentText());
  
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
          if (val === null || val === undefined) {
             val = "";
          } else if (typeof val === 'object') {
             val = JSON.stringify(val);
          } else if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
             // Optional: Format ISO date string
             // val = new Date(val).toLocaleString('vi-VN');
          }
          rowData.push(val);
      });
      rows.push(rowData);
    });
  } else {
    rows.push(['Không có dữ liệu (' + tableName + ')']);
  }
  
  if (rows.length > 0) {
    sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    if (data && data.length > 0) {
       sheet.getRange(1, 1, 1, rows[0].length).setFontWeight("bold").setBackground("#e2e8f0");
       // Add frozen row for headers
       try { sheet.setFrozenRows(1); } catch (err){}
    }
  }
}
