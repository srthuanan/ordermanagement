function formatTHANG03() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var targetSheetName = "THANG03"; // Tên sheet chính xác
  var sheet = spreadsheet.getSheetByName(targetSheetName);

  if (!sheet) {
    var availableSheets = spreadsheet.getSheets().map(s => s.getName());
    SpreadsheetApp.getUi().alert("⚠️ Sheet '" + targetSheetName + "' không tồn tại!\n\n📋 Các sheet có sẵn:\n" + availableSheets.join("\n"));
    return;
  }

  // Xác định phạm vi dữ liệu
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  var dataRange = sheet.getRange(1, 1, lastRow, lastCol);
  var headerRange = sheet.getRange(1, 1, 1, lastCol);

  // 🎨 **Định dạng tiêu đề - Sang trọng, chuyên nghiệp**
  headerRange.setFontWeight("bold")
             .setHorizontalAlignment("center")
             .setBackground("#0D47A1") // Xanh dương đậm
             .setFontColor("#FFFFFF")  // Chữ trắng nổi bật
             .setFontSize(14);

  // 🏆 **Định dạng toàn bộ bảng dữ liệu**
  dataRange.setFontSize(12)
           .setHorizontalAlignment("center")
           .setBorder(true, true, true, true, true, true, "black");

  // 🎭 **Tô màu xen kẽ hàng - Nhìn chuyên nghiệp hơn**
  var bodyRange = sheet.getRange(2, 1, lastRow - 1, lastCol);
  var bgColors = [];
  for (var i = 0; i < bodyRange.getNumRows(); i++) {
    bgColors.push(new Array(lastCol).fill(i % 2 === 0 ? "#F1F1F1" : "#FFFFFF")); // Xám nhạt - Trắng
  }
  bodyRange.setBackgrounds(bgColors);

  // 📅 **Định dạng ngày tháng (Cột C)**
  sheet.getRange("C2:C" + lastRow).setNumberFormat("dd/MM/yyyy");

  // 🔢 **Định dạng số (Cột K - Số máy)**
  sheet.getRange("K2:K" + lastRow).setNumberFormat("0");

  // 📌 **Cố định dòng tiêu đề**
  sheet.setFrozenRows(1);

  // 🔍 **Thêm bộ lọc tự động**
  if (!sheet.getFilter()) {
    sheet.getRange(1, 1, 1, lastCol).createFilter();
  }

  // ✅ **Thông báo hoàn tất**
  SpreadsheetApp.getUi().alert("🎨 Giao diện cao cấp đã được áp dụng cho '" + targetSheetName + "'!");
}
