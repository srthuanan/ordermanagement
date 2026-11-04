function sendInvoiceEmails(e) {
  var sheet = e.source.getSheetByName("XHĐ THÁNG 4"); // Sheet chứa thông tin xuất hóa đơn
  if (!sheet) {
    Logger.log("❌ Không tìm thấy sheet!");
    return;
  }

  var range = e.range;
  var column = range.getColumn();
  var row = range.getRow();

  // Chỉ chạy nếu thay đổi nằm trong cột "Ngày Hóa Đơn" (Cột O - Cột 15)
  if (column !== 15 || row === 1) {
    return;
  }

  var data = sheet.getDataRange().getValues();
  var columns = getColumnIndexes(sheet);
  if (!columns) {
    Logger.log("❌ Không thể lấy vị trí cột, dừng thực thi.");
    return;
  }

  var customerName = data[row - 1][columns.nameIndex]?.toString().trim() || "";
  var vso = data[row - 1][columns.vsoIndex]?.toString().trim() || "";
  var carType = data[row - 1][columns.carTypeIndex]?.toString().trim() || "";
  var version = data[row - 1][columns.versionIndex]?.toString().trim() || "";
  var exterior = data[row - 1][columns.exteriorIndex]?.toString().trim() || "";
  var interior = data[row - 1][columns.interiorIndex]?.toString().trim() || "";
  var tvbh = data[row - 1][columns.tvbhIndex]?.toString().trim() || "";
  var vin = data[row - 1][columns.vinIndex]?.toString().trim() || "";
var rawInvoiceDate = data[row - 1][columns.invoiceDateIndex];
var invoiceDate = rawInvoiceDate instanceof Date 
    ? Utilities.formatDate(rawInvoiceDate, "GMT+7", "dd/MM/yyyy") 
    : rawInvoiceDate?.toString().trim() || "";

  var currentStatus = data[row - 1][columns.statusIndex]?.toString().trim() || "";

  // ❌ Nếu không có ngày hóa đơn hoặc đã gửi email thì bỏ qua
  if (!invoiceDate || currentStatus === "✅ Đã gửi email") {
    return;
  }

  // ✅ Gửi email
  sendEmail(tvbh, customerName, vso, carType, version, exterior, interior, vin, invoiceDate, sheet, row);
}

function sendEmail(tvbh, customerName, vso, carType, version, exterior, interior, vin, invoiceDate, sheet, row) {
  var logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Log");
  var logData = logSheet.getDataRange().getValues();
  var emailMap = {};

  for (var i = 1; i < logData.length; i++) {
    var name = logData[i][0]?.toString().trim();
    var email = logData[i][1]?.toString().trim();
    if (name && email) {
      emailMap[name.toUpperCase()] = email;
    }
  }

  var recipientEmail = emailMap[tvbh.toUpperCase()];
  if (!recipientEmail) {
    Logger.log("❌ Không tìm thấy email cho TVBH: " + tvbh);
    return;
  }

  var subject = `🔔THÔNG BÁO: Đơn hàng của ${customerName} đã có HÓA ĐƠN!!!`;
  var body = `<table style="width: 100%; max-width: 600px; margin: auto; font-family: 'Merriweather', serif; background: #FFFFFF; color: #333; border: 1px solid #add8e6; border-radius: 12px; box-shadow: 0px 4px 15px rgba(173, 216, 230, 1);">
<tr><td colspan="2" style="background: linear-gradient(90deg, #BBBBBB, #444444); color: #ffffff; text-align: center; font-size: 24px; font-weight: bold; padding: 20px;">
🚘 ĐƠN HÀNG ĐÃ XUẤT HÓA ĐƠN 🚘</td></tr>
<tr><td>     👤 Tên Khách Hàng</td><td>${customerName}</td></tr>
<tr><td>     🔢 Số Đơn Hàng</td><td>${vso}</td></tr>
<tr><td>     🚗 Dòng Xe</td><td>${carType}</td></tr>
<tr><td>     📌 Phiên Bản</td><td>${version}</td></tr>
<tr><td>     🎨 Ngoại Thất</td><td>${exterior}</td></tr>
<tr><td>     🧒 Nội Thất</td><td>${interior}</td></tr>
<tr><td>     💏 VIN</td><td>${vin}</td></tr>
<tr><td>     📅 Ngày Xuất Hóa Đơn</td><td>${invoiceDate}</td></tr>

<tr><td colspan="2" style="padding: 15px; text-align: center; background: #f4f4f4; color: #003399; font-size: 18px; font-weight: bold;">
📩 Vui lòng liên hệ BP Kế toán để nhận hóa đơn!!!</td></tr>
<tr><td colspan="2" style="padding: 10px; text-align: center; color: #003399; font-style: italic; font-size: 16px;">
<em>Trân trọng,</em><br>📧 <strong>Sales Department</strong></td></tr>
</table>`;

  try {
    MailApp.sendEmail({
      to: recipientEmail,
      subject: subject,
      htmlBody: body
    });

    sheet.getRange(row, 16).setValue("✅ Đã gửi email");
    Logger.log("✅ Đã gửi email cho: " + recipientEmail);
  } catch (error) {
    Logger.log("❌ Lỗi khi gửi email tới: " + recipientEmail + " - " + error.toString());
  }
}

function getColumnIndexes(sheet) {
  var headerRow = sheet.getDataRange().getValues()[0];
  var columns = {}; 
  for (var i = 0; i < headerRow.length; i++) {
    var cleanHeader = headerRow[i]?.toString().trim();
    columns[cleanHeader] = i;
  }
  return {
    nameIndex: columns["Tên KH"],
    vsoIndex: columns["VSO"],
    carTypeIndex: columns["Dòng xe"],
    versionIndex: columns["Phiên bản"],
    exteriorIndex: columns["Ngoại thất"],
    interiorIndex: columns["Nội thất"],
    tvbhIndex: columns["TVBH"],
    vinIndex: columns["Vin"],
    invoiceDateIndex: columns["Ngày Hóa Đơn"],
    statusIndex: columns["Trạng Thái gửi Mail"]
  };
}
