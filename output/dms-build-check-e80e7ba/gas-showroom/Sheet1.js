function formatSheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1"); // Đổi tên nếu cần
  if (!sheet) {
    Logger.log("Không tìm thấy Sheet!");
    return;
  }
  
  var range = sheet.getDataRange(); // Lấy toàn bộ dữ liệu
  var headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn()); // Lấy hàng tiêu đề
  
  // Định dạng tiêu đề
  headerRange.setFontWeight("bold")
             .setBackground("#1F4E78") // Xanh đậm
             .setFontColor("white")
             .setHorizontalAlignment("center");

  // Định dạng đường viền
  range.setBorder(true, true, true, true, true, true, "black", SpreadsheetApp.BorderStyle.SOLID);

  // Căn chỉnh dữ liệu
  range.setVerticalAlignment("middle"); // Căn giữa theo chiều dọc
  sheet.getRange("A:A").setHorizontalAlignment("center"); // Cột STT căn giữa
  sheet.getRange("H:H").setHorizontalAlignment("center"); // Hình thức thanh toán căn giữa
  sheet.getRange("J:J").setHorizontalAlignment("center"); // Loại xe căn giữa
  sheet.getRange("K:K").setHorizontalAlignment("center"); // Số lượng căn giữa

  // Định dạng số tiền (cột Giá trị xe & Tiền thưởng)
  var priceColumns = ["L", "M"]; // Cột giá trị và thưởng
  priceColumns.forEach(col => {
    sheet.getRange(col + "2:" + col + sheet.getLastRow())
         .setNumberFormat("#,##0.00₫");
  });

  // Tự động điều chỉnh độ rộng cột
  sheet.autoResizeColumns(1, sheet.getLastColumn());
  
  Logger.log("Đã định dạng bảng thành công!");
}
