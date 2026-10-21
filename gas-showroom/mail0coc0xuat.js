function sendSalesPerformanceEmails() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetData = ss.getSheetByName("KPIs THÁNG 3"); // Sheet KPI
  var sheetLog = ss.getSheetByName("Log"); // Sheet chứa email TVBH

  if (!sheetData || !sheetLog) {
    Logger.log("❌ Không tìm thấy sheet KPI hoặc sheet Log!");
    return;
  }

  // Lấy dữ liệu từ sheet KPI và Log
  var data = sheetData.getDataRange().getValues();
  var logData = sheetLog.getDataRange().getValues();

  // Tạo danh sách email từ sheet Log
  var emailMap = {};
  for (var i = 1; i < logData.length; i++) { // Bỏ qua tiêu đề
    var name = logData[i][0] ? logData[i][0].toString().trim() : "";
    var email = logData[i][1] ? logData[i][1].toString().trim() : "";
    if (name && email) {
      emailMap[name] = email;
    }
  }

  // Xác định cột dữ liệu trong sheet KPI
  var nameColumn = 1; // Cột B - Tên TVBH
  var totalCocColumn = 15; // ⚠️ Kiểm tra lại nếu cột P không đúng
  var totalXHĐColumn = 16; // ⚠️ Kiểm tra lại nếu cột Q không đúng

  for (var j = 1; j < data.length; j++) { // Bỏ qua tiêu đề
    var tvbhName = data[j][nameColumn] ? data[j][nameColumn].toString().trim() : "";

    // Lấy dữ liệu từ cột P (Tổng Cọc) và cột Q (Tổng XHĐ)
    var totalCocRaw = data[j][totalCocColumn];
    var totalXHĐRaw = data[j][totalXHĐColumn];

    // Kiểm tra nếu dữ liệu có dạng số hoặc bị undefined
    var totalCoc = (totalCocRaw !== "" && totalCocRaw !== undefined) ? Number(totalCocRaw) : 0;
    var totalXHĐ = (totalXHĐRaw !== "" && totalXHĐRaw !== undefined) ? Number(totalXHĐRaw) : 0;

    // Ghi log để kiểm tra giá trị thực tế trước khi gửi email
    Logger.log("🔎 TVBH: " + tvbhName + " | Tổng Cọc (P): " + totalCoc + " | Tổng XHĐ (Q): " + totalXHĐ);

    // Nếu không có email, bỏ qua
    if (!emailMap[tvbhName]) {
      Logger.log("⚠ Không tìm thấy email cho TVBH: " + tvbhName);
      continue;
    }

    var email = emailMap[tvbhName];
    var subject = "";
    var body = "<p>Xin chào <strong>" + tvbhName + "</strong>,</p>";

    // **🔹 Trường hợp 1: Chỉ thiếu ký hợp đồng**
    if (totalCoc === 0 && totalXHĐ > 0) {
      subject = "📌 Đẩy mạnh ký hợp đồng ngay hôm nay!";
      body += "<p>Hệ thống ghi nhận rằng bạn chưa ký hợp đồng đặt cọc nào trong tháng này. Đây là cơ hội để bứt phá doanh số!</p>";
      body += "<table border='1' cellspacing='0' cellpadding='5' style='border-collapse: collapse; width: 50%; text-align: center;'>"
      body += "<tr><th>Tổng Cọc</th><th>Tổng XHĐ</th></tr>";
      body += "<tr><td style='color: red;'>" + totalCoc + "</td><td>" + totalXHĐ + "</td></tr></table>";
      body += "<p>📌 <strong>Hãy tiếp cận khách hàng ngay hôm nay</strong>, tư vấn chuyên sâu và tạo động lực để chốt hợp đồng.</p>";
      body += "<p>🔥 <strong>Chốt hợp đồng là bước quan trọng để đảm bảo doanh số!</strong> Bạn có khả năng, hãy tận dụng cơ hội ngay!</p>";
    } 
    
    // **🔹 Trường hợp 2: Chỉ thiếu xuất hóa đơn**
    else if (totalXHĐ === 0 && totalCoc > 0) {
      subject = "📌 Hoàn tất thủ tục xuất hóa đơn ngay!";
      body += "<p>Hệ thống ghi nhận rằng bạn đã có hợp đồng nhưng chưa hoàn tất xuất hóa đơn. Điều này có thể ảnh hưởng đến uy tín của bạn với khách hàng!</p>";
      body += "<table border='1' cellspacing='0' cellpadding='5' style='border-collapse: collapse; width: 50%; text-align: center;'>"
      body += "<tr><th>Tổng Cọc</th><th>Tổng XHĐ</th></tr>";
      body += "<tr><td>" + totalCoc + "</td><td style='color: red;'>" + totalXHĐ + "</td></tr></table>";
      body += "<p>💡 <strong>Hoàn tất hồ sơ nhanh chóng giúp bạn giữ vững uy tín!</strong> Hãy xử lý ngay để tạo niềm tin với khách hàng.</p>";
      body += "<p>🔥 <strong>Xuất hóa đơn đúng hạn giúp bạn xây dựng quan hệ lâu dài!</strong> Hãy đảm bảo rằng không có hợp đồng nào bị trì hoãn.</p>";
    } 
    
    // **🔹 Trường hợp 3: Chưa ký hợp đồng & chưa xuất hóa đơn**
    else if (totalCoc === 0 && totalXHĐ === 0) {
      subject = "🚀 Hãy tăng tốc! Chốt hợp đồng & hoàn tất hóa đơn!";
      body += "<p>Hệ thống ghi nhận rằng bạn chưa có hợp đồng đặt cọc và cũng chưa hoàn tất thủ tục xuất hóa đơn. Đây là thời điểm thích hợp để hành động!</p>";
      body += "<table border='1' cellspacing='0' cellpadding='5' style='border-collapse: collapse; width: 50%; text-align: center;'>"
      body += "<tr><th>Tổng Cọc</th><th>Tổng XHĐ</th></tr>";
      body += "<tr><td style='color: red;'>" + totalCoc + "</td><td style='color: red;'>" + totalXHĐ + "</td></tr></table>";
      body += "<p>💡 <strong>Bắt đầu ngay với việc ký hợp đồng!</strong> Hãy tư vấn nhiệt tình, tạo niềm tin và giúp khách hàng đưa ra quyết định dễ dàng.</p>";
      body += "<p>🔥 <strong>Hoàn tất xuất hóa đơn để khách hàng yên tâm!</strong> Hãy hành động ngay hôm nay để bứt phá doanh số!</p>";
    } 
    
    // **🔹 Trường hợp 4: Không cần gửi email (đã có đủ dữ liệu)**
    else {
      Logger.log("✅ TVBH " + tvbhName + " đã có đủ dữ liệu, không cần gửi email.");
      continue;
    }

    body += "<p>💪 Chúc bạn thành công! <br> 📈 <strong>Phòng Kinh Doanh</strong></p>";

    // Gửi email với định dạng HTML
    MailApp.sendEmail({
      to: email,
      subject: subject,
      htmlBody: body
    });

    Logger.log("📩 Đã gửi email cảnh báo đến: " + email);
  }
}
