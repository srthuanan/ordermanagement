/**
 * 10_bc_ghep_xe.js - Tự động tạo và cập nhật Sheet "BC GHÉP XE-DỰ XHĐ"
 * Chuẩn hóa các cột và màu sắc theo đúng yêu cầu:
 * Cột A: MÃ SR KHÔNG SỬA (TA1, TA2, ...)
 * Cột B: Showroom (Thuận An)
 * Cột C: Loại xe (Dòng xe + Phiên bản)
 * Cột D: Ngoại thất
 * Cột E: Số khung (vin)
 * Cột F: Tên khách hàng
 * Cột G: Ngày ghép (dd/MM/yyyy)
 * Cột H: Ngày dự XHĐ (BẮT BUỘC PHẢI ĐIỀN) (Tháng hiện tại)
 * Cột I: Tình trạng
 */

function generateBcGhepXeDuXhd() {
  var ss;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {}
  if (!ss) {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  }

  var sheetName = "BC GHÉP XE-DỰ XHĐ";
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  sheet.clear();
  sheet.clearFormats();

  // 1. Lấy dữ liệu xe đã ghép từ Supabase (bảng donhang)
  var pairedOrders = [];
  try {
    var url = SUPABASE_URL + "/rest/v1/donhang?ket_qua=eq.%C4%90%C3%A3%20gh%C3%A9p&select=vin,ten_khach_hang,dong_xe,phien_ban,ngoai_that,thoi_gian_ghep,thoi_gian_can_xe&order=thoi_gian_ghep.desc";
    var response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": "Bearer " + SUPABASE_SERVICE_KEY
      },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 200) {
      pairedOrders = JSON.parse(response.getContentText());
    }
  } catch (e) {
    Logger.log("Lỗi tải từ Supabase: " + e.message);
  }

  // Fallback: nếu gọi Supabase không được, lấy từ sheet "donhang" có sẵn trong file
  if (!pairedOrders || pairedOrders.length === 0) {
    var donhangSheet = ss.getSheetByName("donhang");
    if (donhangSheet) {
      var data = donhangSheet.getDataRange().getValues();
      if (data.length > 1) {
        var h = data[0];
        var idxKetQua = h.indexOf("ket_qua");
        var idxVin = h.indexOf("vin");
        var idxKh = h.indexOf("ten_khach_hang");
        var idxDongXe = h.indexOf("dong_xe");
        var idxPhienBan = h.indexOf("phien_ban");
        var idxNgoaiThat = h.indexOf("ngoai_that");
        var idxTgGhep = h.indexOf("thoi_gian_ghep");

        for (var i = 1; i < data.length; i++) {
          var row = data[i];
          if (row[idxKetQua] === "Đã ghép") {
            pairedOrders.push({
              vin: row[idxVin] || "",
              ten_khach_hang: row[idxKh] || "",
              dong_xe: row[idxDongXe] || "",
              phien_ban: row[idxPhienBan] || "",
              ngoai_that: row[idxNgoaiThat] || "",
              thoi_gian_ghep: row[idxTgGhep] || ""
            });
          }
        }
        // Sắp xếp ngày ghép mới nhất lên đầu
        pairedOrders.sort(function(a, b) {
          return (b.thoi_gian_ghep || "").localeCompare(a.thoi_gian_ghep || "");
        });
      }
    }
  }

  // 2. Chuẩn bị Tiêu đề cột (Headers)
  var headers = [
    "MÃ SR\nKHÔNG SỬA",
    "Showroom",
    "Loại xe",
    "Ngoại thất",
    "Số khung (vin)",
    "Tên khách hàng",
    "Ngày ghép",
    "Ngày dự XHĐ\n(BẮT BUỘC PHẢI ĐIỀN)",
    "Tình trạng"
  ];

  var rows = [headers];
  var currentMonth = "Tháng " + (new Date().getMonth() + 1);

  for (var j = 0; j < pairedOrders.length; j++) {
    var p = pairedOrders[j];
    var maSr = "TA" + (j + 1);
    var showroom = "Thuận An";

    // Ghép tên dòng xe và phiên bản (VD: "VF 2 Eco", "LIMO", "VF 6 Plus Tiêu chuẩn")
    var dongXe = (p.dong_xe || "").trim();
    var phienBan = (p.phien_ban || "").trim();
    var loaiXe = dongXe;
    if (phienBan && phienBan !== dongXe) {
      if (phienBan.toLowerCase().indexOf(dongXe.toLowerCase()) === 0) {
        loaiXe = phienBan;
      } else {
        loaiXe = dongXe + " " + phienBan;
      }
    }

    // Định dạng ngày ghép dd/MM/yyyy
    var ngayGhepStr = "";
    if (p.thoi_gian_ghep) {
      var dt = new Date(p.thoi_gian_ghep);
      if (!isNaN(dt.getTime())) {
        var dd = ("0" + dt.getDate()).slice(-2);
        var mm = ("0" + (dt.getMonth() + 1)).slice(-2);
        var yyyy = dt.getFullYear();
        ngayGhepStr = dd + "/" + mm + "/" + yyyy;
      } else {
        ngayGhepStr = String(p.thoi_gian_ghep).substring(0, 10);
      }
    }

    rows.push([
      maSr,
      showroom,
      loaiXe,
      p.ngoai_that || "",
      p.vin || "",
      p.ten_khach_hang || "",
      ngayGhepStr,
      currentMonth,
      "" // Tình trạng
    ]);
  }

  // Thêm sẵn các dòng trống TA24..TA40 như trong ảnh
  var startEmpty = pairedOrders.length + 1;
  for (var k = startEmpty; k <= startEmpty + 15; k++) {
    rows.push(["TA" + k, "Thuận An", "", "", "", "", "", "", ""]);
  }

  // 3. Ghi dữ liệu vào Sheet
  var numRows = rows.length;
  var numCols = headers.length;

  var maxRows = sheet.getMaxRows();
  var maxCols = sheet.getMaxColumns();
  if (numRows > maxRows) sheet.insertRowsAfter(maxRows, numRows - maxRows);
  if (numCols > maxCols) sheet.insertColumnsAfter(maxCols, numCols - maxCols);

  var range = sheet.getRange(1, 1, numRows, numCols);
  range.setValues(rows);

  // 4. Áp dụng Định dạng màu sắc và viền y hệt trong ảnh:
  // - Cột A & Cột H: Header màu Cam (#ff9900)
  // - Cột B..G, I: Header màu Vàng (#ffff00)
  var headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange.setFontWeight("bold")
             .setFontSize(10)
             .setVerticalAlignment("middle")
             .setWrap(true);

  // Tô màu từng ô Header:
  sheet.getRange(1, 1).setBackground("#ff9900").setHorizontalAlignment("center"); // MÃ SR
  sheet.getRange(1, 2).setBackground("#ffff00").setHorizontalAlignment("center"); // Showroom
  sheet.getRange(1, 3).setBackground("#ffff00").setHorizontalAlignment("center"); // Loại xe
  sheet.getRange(1, 4).setBackground("#ffff00").setHorizontalAlignment("center"); // Ngoại thất
  sheet.getRange(1, 5).setBackground("#ffff00").setHorizontalAlignment("center"); // Số khung (vin)
  sheet.getRange(1, 6).setBackground("#ffff00").setHorizontalAlignment("center"); // Tên khách hàng
  sheet.getRange(1, 7).setBackground("#ffff00").setHorizontalAlignment("center"); // Ngày ghép
  sheet.getRange(1, 8).setBackground("#ff9900").setHorizontalAlignment("center"); // Ngày dự XHĐ
  sheet.getRange(1, 9).setBackground("#ffff00").setHorizontalAlignment("center"); // Tình trạng

  // Kẻ viền bảng (Border) đen mảnh như Excel
  range.setBorder(true, true, true, true, true, true, "#434343", SpreadsheetApp.BorderStyle.SOLID);

  // Canh lề dữ liệu thân bảng:
  if (numRows > 1) {
    sheet.getRange(2, 1, numRows - 1, 1).setHorizontalAlignment("center"); // MÃ SR (TA1, TA2...)
    sheet.getRange(2, 2, numRows - 1, 1).setHorizontalAlignment("center"); // Showroom
    sheet.getRange(2, 3, numRows - 1, 1).setHorizontalAlignment("center"); // Loại xe
    sheet.getRange(2, 4, numRows - 1, 1).setHorizontalAlignment("center"); // Ngoại thất
    sheet.getRange(2, 5, numRows - 1, 1).setHorizontalAlignment("center").setFontFamily("Courier New"); // VIN
    sheet.getRange(2, 6, numRows - 1, 1).setHorizontalAlignment("center"); // Tên KH
    sheet.getRange(2, 7, numRows - 1, 1).setHorizontalAlignment("center"); // Ngày ghép
    sheet.getRange(2, 8, numRows - 1, 1).setHorizontalAlignment("center"); // Ngày dự XHĐ
    sheet.getRange(2, 9, numRows - 1, 1).setHorizontalAlignment("center"); // Tình trạng
  }

  // Cố định dòng 1 (Freeze header)
  sheet.setFrozenRows(1);

  // Đặt độ rộng các cột cho đẹp mắt
  sheet.setColumnWidth(1, 95);   // MÃ SR
  sheet.setColumnWidth(2, 100);  // Showroom
  sheet.setColumnWidth(3, 140);  // Loại xe
  sheet.setColumnWidth(4, 180);  // Ngoại thất
  sheet.setColumnWidth(5, 170);  // Số khung
  sheet.setColumnWidth(6, 230);  // Tên KH
  sheet.setColumnWidth(7, 100);  // Ngày ghép
  sheet.setColumnWidth(8, 140);  // Ngày dự XHĐ
  sheet.setColumnWidth(9, 100);  // Tình trạng

  try {
    ss.toast("Đã cập nhật thành công sheet " + sheetName + " (" + pairedOrders.length + " xe)!", "Hoàn tất", 5);
  } catch (tErr) {}

  return true;
}
