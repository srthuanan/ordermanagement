function checkVinAndUpdate() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var nhuCauSheet = ss.getSheetByName("NHU CẦU GHÉP XE");
  var xhdSheet = ss.getSheetByName("XHĐ THÁNG 4");

  if (!nhuCauSheet || !xhdSheet) {
    Logger.log("Không tìm thấy một trong hai sheet.");
    return;
  }

  var vinNhuCau = nhuCauSheet.getRange("J2:J").getValues().flat(); // Lấy danh sách VIN từ sheet NHU CẦU GHÉP XE
  var vinXHD = xhdSheet.getRange("J2:J").getValues().flat(); // Lấy danh sách VIN từ sheet XHĐ THÁNG 3
  var xuatHDRange = nhuCauSheet.getRange("M2:M"); // Cột Xuất HĐ cần đánh dấu

  var updates = [];

  for (var i = 0; i < vinNhuCau.length; i++) {
    if (vinNhuCau[i] && vinXHD.includes(vinNhuCau[i])) {
      updates.push([true]); // Đánh dấu nếu VIN có trong XHĐ THÁNG 3
    } else {
      updates.push([""]); // Để trống nếu không có trong danh sách
    }
  }

  xuatHDRange.setValues(updates);
}
