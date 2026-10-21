function tongHopNhuCauGhepXe() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("NHU CẦU GHÉP XE");

  if (!sheet) return;

  var data = sheet.getDataRange().getValues();
  var summary = {};
  var tongSoLuongDongXe = {}; // Tổng số lượng từng dòng xe

  for (var i = 1; i < data.length; i++) { 
    var dongXe = data[i][3];      // Cột D: Dòng xe
    var phienBan = data[i][4];    // Cột E: Phiên bản
    var ngoaiThat = data[i][5];   // Cột F: Ngoại thất
    var noiThat = data[i][6];     // Cột G: Nội thất
    var cotJ = data[i][9];        // Cột J (cột thứ 10)

    if (dongXe && !cotJ) { // Chỉ xử lý khi có dòng xe và cột J trống
      var key = dongXe + " | " + phienBan + " | " + ngoaiThat + " | " + noiThat;
      
      if (summary[key]) {
        summary[key] += 1;
      } else {
        summary[key] = 1;
      }

      // Tính tổng số lượng của từng dòng xe
      if (tongSoLuongDongXe[dongXe]) {
        tongSoLuongDongXe[dongXe] += 1;
      } else {
        tongSoLuongDongXe[dongXe] = 1;
      }
    }
  }

  // Xóa dữ liệu cũ trong cột S trước khi cập nhật
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 19, lastRow - 1, 5).clearContent();
  }

  // Ghi tiêu đề tổng hợp chi tiết
  var startRow = 2;
  var output = [
    ["Dòng xe", "Phiên bản", "Ngoại thất", "Nội thất", "Số lượng"]
  ];

  // Ghi dữ liệu tổng hợp chi tiết
  for (var key in summary) {
    var parts = key.split(" | ");
    output.push([parts[0], parts[1], parts[2], parts[3], summary[key]]);
  }

  // Xuất dữ liệu chi tiết ra cột S
  if (output.length > 1) {
    sheet.getRange(startRow, 19, output.length, output[0].length).setValues(output);
  }

  // Xóa phần tổng số lượng dòng xe cũ để cập nhật lại
  var clearFromRow = startRow + output.length + 1;
  sheet.getRange(clearFromRow, 19, lastRow - clearFromRow + 1, 2).clearContent();

  // Ghi "Tổng số lượng theo dòng xe" xuống dưới bảng chi tiết
  var totalStartRow = startRow + output.length + 2; // Cách 2 dòng
  if (Object.keys(tongSoLuongDongXe).length > 0) {
    sheet.getRange(totalStartRow, 19).setValue("").setFontWeight("bold");
  }

  // Xóa dữ liệu dư thừa hoặc hàng trống trong bảng tổng số lượng
  var totalRowsToClear = sheet.getLastRow() - (totalStartRow + totalOutput.length);
  if (totalRowsToClear > 0) {
    sheet.getRange(totalStartRow + totalOutput.length, 19, totalRowsToClear, 2).clearContent();
  }

  // Xuất dữ liệu tổng số lượng từng dòng xe
  if (totalOutput.length > 1) {
    sheet.getRange(totalStartRow + 1, 19, totalOutput.length, totalOutput[0].length).setValues(totalOutput);
  }
}

// Tạo trigger tự động cập nhật khi có chỉnh sửa
function createTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  var functionName = "tongHopNhuCauGhepXe";

  // Xóa các trigger cũ trước khi tạo mới
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() == functionName) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Tạo trigger mới chạy khi sheet thay đổi
  ScriptApp.newTrigger(functionName)
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
}
