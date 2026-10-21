
function capNhatSoThuTu() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("NHU CẦU GHÉP XE");
  
  if (!sheet) {
    Logger.log("❌ Không tìm thấy sheet NHU CẦU GHÉP XE!");
    return;
  }

  var dataRange = sheet.getDataRange();
  var data = dataRange.getValues();

  var colSTT = 0; // Cột A (Số thứ tự)
  var colCheck = 2; // Cột C - Dùng để kiểm tra hàng có dữ liệu

  var stt = 1; 
  for (var i = 1; i < data.length; i++) {
    if (data[i][colCheck] !== "" && data[i][colCheck] !== undefined) {
      sheet.getRange(i + 1, colSTT + 1).setValue(stt);
      stt++;
    } else {
      sheet.getRange(i + 1, colSTT + 1).setValue("");
    }
  }

  Logger.log("✅ Cập nhật STT tự động sau khi chỉnh sửa!");
}
