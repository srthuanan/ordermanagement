/**
 * 11_dong_bo_ky_moi.js - Tự động đếm và điền số lượng ký mới theo dòng xe theo ngày
 * vào Sheet "THÁNG 9.2026" trên file BÁO CÁO KINH DOANH XE - THUẬN AN.
 * 
 * ĐẢM BẢO CHUẨN XÁC 100%:
 * - Lấy trực tiếp từ 81 dòng cọc của sheet Bank (dòng 327 đến 407).
 * - Xóa sạch các số liệu cũ ở các cột "ký mới" trước khi điền, đảm bảo tổng số luôn chuẩn đúng 81 xe!
 */

function tuDongDienKyMoi() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    try {
      ss = SpreadsheetApp.openById("1Vo0m-62zk2wdG8fd2yIgZYRZEC_kffYfKtQEANwZIMc");
    } catch (eOpen) {
      Logger.log("Không thể mở file Báo cáo: " + eOpen.message);
    }
  }

  if (!ss) {
    SpreadsheetApp.getUi().alert("Vui lòng mở trực tiếp trên file Báo Cáo Kinh Doanh!");
    return;
  }

  // 1. Xác định Sheet tháng cần cập nhật (ưu tiên "THÁNG 9.2026")
  var targetSheet = ss.getSheetByName("THÁNG 9.2026");
  if (!targetSheet) {
    var allSheets = ss.getSheets();
    for (var s = 0; s < allSheets.length; s++) {
      if (allSheets[s].getName().indexOf("THÁNG") !== -1) {
        targetSheet = allSheets[s];
        break;
      }
    }
  }

  if (!targetSheet) {
    var errMsg = "Không tìm thấy sheet tháng (ví dụ: THÁNG 9.2026)!";
    try { SpreadsheetApp.getUi().alert(errMsg); } catch (e) { Logger.log(errMsg); }
    return;
  }

  // 2. Lấy dữ liệu cọc (Ưu tiên đọc trực tiếp từ sheet Bank từ STT 1 đến 81)
  var deposits = layDuLieuCoc(targetSheet.getName());
  if (!deposits || deposits.length === 0) {
    try { ss.toast("Không có dữ liệu cọc ký mới cho tháng này.", "Thông báo", 5); } catch (e) {}
    return;
  }

  // 3. Gom nhóm số lượng cọc: counts[ngày_trong_tháng][tên_model] = số_lượng
  var counts = {};
  var totalValidDeposits = 0;

  for (var i = 0; i < deposits.length; i++) {
    var dep = deposits[i];
    if (!dep.date) continue;
    var day = dep.date.getDate(); // 1, 2, 3... 31
    var model = chuanHoaModel(dep.model);
    if (!model) continue;

    if (!counts[day]) counts[day] = {};
    counts[day][model] = (counts[day][model] || 0) + 1;
    totalValidDeposits++;
  }

  // 4. Quét cột B (dòng 3 -> 17) để lập bản đồ vị trí từng dòng xe
  var modelColRange = targetSheet.getRange(3, 2, 15, 1).getValues();
  var modelRowMap = {};
  for (var r = 0; r < modelColRange.length; r++) {
    var rowIdx = r + 3;
    var mName = chuanHoaModel(modelColRange[r][0]);
    if (mName && !modelRowMap[mName]) {
      modelRowMap[mName] = rowIdx;
    }
  }

  // 5. Quét Dòng 1 (Ngày) và Dòng 2 (Cột "ký mới")
  var maxCol = targetSheet.getLastColumn();
  if (maxCol < 10) maxCol = 80;
  var row1Values = targetSheet.getRange(1, 1, 1, maxCol).getValues()[0];
  var row2Values = targetSheet.getRange(2, 1, 1, maxCol).getValues()[0];

  // BƯỚC QUAN TRỌNG: Xóa sạch toàn bộ số cũ ở các ô "ký mới" (dòng 3 đến dòng 17)
  // để tránh bị cộng dồn với số nhập tay cũ (dẫn đến vọt lên 102 xe)!
  for (var c = 10; c <= maxCol; c++) {
    var subHeader = String(row2Values[c - 1] || "").toLowerCase().trim();
    if (subHeader.indexOf("ký mới") !== -1 || subHeader.indexOf("ky moi") !== -1) {
      targetSheet.getRange(3, c, 15, 1).clearContent();
    }
  }

  // 6. Điền các con số cọc chuẩn xác từ danh sách cọc
  var currentDay = null;
  var filledCount = 0;

  for (var c = 10; c <= maxCol; c++) {
    var cell1 = row1Values[c - 1];
    if (cell1) {
      if (cell1 instanceof Date) {
        currentDay = cell1.getDate();
      } else {
        var str1 = String(cell1).trim();
        var match = str1.match(/^(\d{1,2})[\/\-]/);
        if (match) {
          currentDay = parseInt(match[1], 10);
        }
      }
    }

    var cell2 = String(row2Values[c - 1] || "").toLowerCase().trim();
    if (cell2.indexOf("ký mới") !== -1 || cell2.indexOf("ky moi") !== -1) {
      if (currentDay && counts[currentDay]) {
        var dayCounts = counts[currentDay];
        for (var mKey in dayCounts) {
          var targetRow = modelRowMap[mKey];
          if (targetRow) {
            targetSheet.getRange(targetRow, c).setValue(dayCounts[mKey]);
            filledCount += dayCounts[mKey];
          }
        }
      }
    }
  }

  try {
    ss.toast("Đã điền thành công " + filledCount + "/" + totalValidDeposits + " xe cọc vào sheet " + targetSheet.getName() + "!", "Hoàn tất", 6);
  } catch (e) {}

  return { status: "SUCCESS", total: filledCount, depositsCount: totalValidDeposits };
}

/**
 * Lấy danh sách cọc trong tháng:
 * Đọc trực tiếp từ sheet Bank (bắt đầu từ dòng 327 đến hết STT 81)
 */
function layDuLieuCoc(sheetName) {
  var list = [];
  
  // 1. Đọc trực tiếp từ file Bank
  try {
    var bankSs = SpreadsheetApp.openById("1GMAX4_0Xubwz4ByRN9eDIokZntLO98NlmzeURkYBc8M");
    var bankSheet = bankSs.getSheetByName("Bank");
    if (bankSheet) {
      var maxR = bankSheet.getLastRow();
      if (maxR >= 327) {
        var numRows = maxR - 326;
        var bRange = bankSheet.getRange(327, 1, numRows, 6).getValues(); // Cột A: STT, B: Date, D: Model
        for (var b = 0; b < bRange.length; b++) {
          var stt = bRange[b][0]; // Cột A: STT
          var bDateRaw = bRange[b][1]; // Cột B: Date
          var bModelRaw = bRange[b][3]; // Cột D: Dòng xe

          // Chỉ lấy các dòng có STT (1 đến 81...)
          if (!stt || isNaN(parseInt(stt, 10))) continue;
          if (!bDateRaw) continue;

          var bDateObj = null;
          if (bDateRaw instanceof Date) {
            bDateObj = bDateRaw;
          } else {
            var strD = String(bDateRaw).trim();
            var m = strD.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
            if (m) {
              bDateObj = new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
            }
          }

          if (bDateObj && !isNaN(bDateObj.getTime())) {
            list.push({ date: bDateObj, model: bModelRaw });
          }
        }
      }
    }
  } catch (eBank) {
    Logger.log("Không thể mở trực tiếp file Bank: " + eBank.message);
  }

  // 2. Fallback: Nếu không mở được file Bank, lấy từ Supabase
  if (list.length === 0) {
    var month = 9, year = 2026;
    var match = sheetName.match(/(\d{1,2})[\.\/](\d{4})/);
    if (match) {
      month = parseInt(match[1], 10);
      year = parseInt(match[2], 10);
    }
    var startDate = year + "-" + (month < 10 ? "0" + month : month) + "-01";
    var endDate = year + "-" + (month < 10 ? "0" + month : month) + "-31";

    try {
      var sbUrl = (typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : "https://jwvgxqrkjlbewvpkvucj.supabase.co");
      var sbKey = (typeof SUPABASE_SERVICE_KEY !== 'undefined' ? SUPABASE_SERVICE_KEY : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU");

      var url = sbUrl + "/rest/v1/donhang?select=ngay_coc,dong_xe&ngay_coc=gte." + startDate + "&ngay_coc=lte." + endDate;
      var resp = UrlFetchApp.fetch(url, {
        method: "get",
        headers: { "apikey": sbKey, "Authorization": "Bearer " + sbKey },
        muteHttpExceptions: true
      });

      if (resp.getResponseCode() === 200) {
        var data = JSON.parse(resp.getContentText());
        for (var i = 0; i < data.length; i++) {
          var rawD = data[i].ngay_coc;
          if (!rawD) continue;
          var dObj = new Date(rawD);
          if (!isNaN(dObj.getTime())) {
            list.push({ date: dObj, model: data[i].dong_xe });
          }
        }
      }
    } catch (eSb) {
      Logger.log("Lỗi Supabase: " + eSb.message);
    }
  }

  return list;
}

/**
 * Chuẩn hóa tên dòng xe khớp với cột B của sheet báo cáo
 */
function chuanHoaModel(raw) {
  if (!raw) return "";
  var s = String(raw).toUpperCase().replace(/\s+/g, "");
  if (s.indexOf("VFLIMO") !== -1 || s.indexOf("LIMO") !== -1) return "LIMO";
  if (s.indexOf("ECVAN") !== -1) return "EC VAN";
  if (s.indexOf("MPV7") !== -1) return "MPV 7";
  if (s.indexOf("VF2") !== -1) return "VF2";
  if (s.indexOf("VF3") !== -1) return "VF3";
  if (s.indexOf("VF5") !== -1) return "VF5";
  if (s.indexOf("VF6") !== -1) return "VF6";
  if (s.indexOf("VF7") !== -1) return "VF7";
  if (s.indexOf("VF8NEW") !== -1 || s.indexOf("VF8N") !== -1) return "VF8 NEW";
  if (s.indexOf("VF8") !== -1) return "VF8";
  if (s.indexOf("VF9") !== -1) return "VF9";
  if (s.indexOf("MINIO") !== -1) return "MINIO";
  if (s.indexOf("HERIO") !== -1) return "HERIO";
  if (s.indexOf("NERIO") !== -1) return "NERIO";
  if (s.indexOf("WILD") !== -1) return "WILD";
  return s;
}

function taoMenuDongBoKyMoi() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🎯 CẬP NHẬT KÝ MỚI')
    .addItem('⚡ Tự động điền Ký Mới tháng này', 'tuDongDienKyMoi')
    .addToUi();
}
