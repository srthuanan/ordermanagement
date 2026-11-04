function doPost(e) {
  var request = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Cổng nhận lệnh từ AI
  if (request.action === "EXECUTE_SCRIPT") {
    var result = eval(request.code); // Cho phép AI chạy code điều khiển trực tiếp
    return ContentService.createTextOutput(JSON.stringify({ status: "SUCCESS", data: result }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ status: "PING_OK" }))
                       .setMimeType(ContentService.MimeType.JSON);
}
