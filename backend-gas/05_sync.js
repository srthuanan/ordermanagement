/**
 * 05_sync.js - Đồng bộ toàn khối (Bulk Sync) từ Supabase sang Google Sheet
 * Thay thế cho cơ chế Webhook nhỏ giọt bấp bênh cũ.
 */

// Kích hoạt Menu đặc biệt khi mở Google Sheet
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 VINFO SYNC')
      .addItem('Làm mới toàn bộ dữ liệu (Sync Supabase)', 'syncAllFromSupabase')
      .addToUi();
}

function syncAllFromSupabase() {
  var timestamp = new Date().toLocaleString('vi-VN');
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast('Đang tải dữ liệu từ Supabase...', 'Đồng bộ', 3);
    
    // 1. Sync Kho Xe
    syncTable('khoxe', 'Khoxe', ["ID", "VIN", "Dòng xe", "Phiên bản", "Ngoại thất", "Nội thất", "Trạng thái", "Người giữ xe"]);
    
    // 2. Sync Đơn Hàng
    syncTable('donhang', 'Donhang', ["Số đơn hàng", "Khách hàng", "VIN", "Dòng xe", "Phiên bản", "Trạng thái VC", "TVBH", "Kết quả", "Ghi chú"]);
    
    // 3. Sync Yêu cầu XHĐ
    syncTable('yeucauxhd', 'Xuathoadon', ["Số đơn hàng", "Khách hàng", "VIN", "Dòng xe", "Phiên bản", "Ngày yêu cầu", "Ngày XHĐ", "TVBH", "Kết quả"]);
    
    SpreadsheetApp.getActiveSpreadsheet().toast('Đồng bộ thành công lúc ' + timestamp, 'Hoàn tất', 5);
    return true;
  } catch (e) {
    Logger.log("Lỗi đồng bộ: " + e.message);
    SpreadsheetApp.getActiveSpreadsheet().toast('Lỗi: ' + e.message, 'Thất bại!', 10);
    return false;
  }
}

function syncTable(tableName, sheetName, headers) {
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
  
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  // Nếu chưa có thì tự động tạo Sheet mới với tên đó
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);
  }
  
  // Xóa toàn bộ dữ liệu cũ
  sheet.clearContents();
  
  var rows = [headers];
  
  if (data && data.length > 0) {
    data.forEach(function(row) {
      if (tableName === 'khoxe') {
        rows.push([row.id || '', row.vin, row.dong_xe, row.phien_ban, row.ngoai_that, row.noi_that, row.trang_thai, row.nguoi_giu_xe || '']);
      } 
      else if (tableName === 'donhang') {
        rows.push([row.so_don_hang, row.ten_khach_hang, row.vin || '', row.dong_xe, row.phien_ban, row.trang_thai_vc || '', row.ten_tu_van_ban_hang, row.ket_qua, row.ghi_chu_admin || '']);
      }
      else if (tableName === 'yeucauxhd') {
        var ngay_yc = row.ngay_yeu_cau ? new Date(row.ngay_yeu_cau).toLocaleDateString('vi-VN') : '';
        var ngay_xhd = row.ngay_xuat_hoa_don ? new Date(row.ngay_xuat_hoa_don).toLocaleDateString('vi-VN') : '';
        rows.push([row.so_don_hang, row.ten_khach_hang, row.vin || '', row.dong_xe, row.phien_ban, ngay_yc, ngay_xhd, row.tvbh, row.ket_qua]);
      }
    });
  }
  
  // Dán một cục dữ liệu siêu nhanh xuống file
  if (rows.length > 0) {
    sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    
    // Trang trí Header cho đẹp
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e2e8f0");
  }
}
