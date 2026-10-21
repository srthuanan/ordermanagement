function onEdit(e) {
  if (!e || !e.range) return;

  var currentSheet = e.range.getSheet();
  var sheetName = currentSheet ? currentSheet.getName() : "";

  if (sheetName === "BÁO CÁO KPI") {
    handleKpiOnEdit(e);
    return;
  }

  // ✅ Tự động xử lý cho sheet RÚT COC
  if (sheetName === "RÚT COC" || sheetName === "RÚT CỌC") {
    var r = e.range.getRow();
    var c = e.range.getColumn();

    // 🏢 NGHIỆP VỤ KẾ TOÁN: XỬ LÝ CỘT M (TRẠNG THÁI RÚT) & CỘT O (NGÀY COC VỀ)
    if (r >= 3 && c === 15) { // Cột O = Ngày COC về
      var valO = e.range.getValue();
      var cellM = currentSheet.getRange(r, 13);
      if (valO) {
        cellM.setValue("✅ Đã có COC");
      } else {
        if (cellM.getValue() === "✅ Đã có COC") {
          cellM.setValue("Đã báo rút");
        }
      }
      return;
    }

    if (r >= 3 && c === 13) { // Cột M = Kế toán ghi nhận thời gian / trạng thái
      var valM = String(e.range.getValue() || '').trim();
      var cellO = currentSheet.getRange(r, 15);
      if (cellO.getValue()) {
        e.range.setValue("✅ Đã có COC");
      } else if (valM) {
        var now = new Date();
        var hours = now.getHours();
        var buoi = (hours < 12) ? "Sáng" : "Chiều";
        var dateShort = Utilities.formatDate(now, Session.getScriptTimeZone(), "dd/MM/yy");
        var dateTimeFull = Utilities.formatDate(now, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
        
        // Nếu người dùng gõ thời gian tùy chỉnh (ví dụ "Sáng 19/10/26")
        var timeLabel = (valM !== "Đã báo rút" && valM !== "✅ Đã có COC" && valM !== "⏳ Đang chờ COC") 
          ? valM 
          : (buoi + " " + dateShort);
          
        var noteText = "⏰ Thời gian báo rút: " + timeLabel + "\n🕒 Ghi nhận lúc: " + dateTimeFull;
        e.range.setValue("Đã báo rút");
        e.range.setNote(noteText);
        // 🔒 KHÓA DỮ LIỆU DÒNG NÀY LẠI: KHÔNG CHO TVBH SỬA NỮA (Bọc try-catch an toàn)
        try {
          khoaDongRutCoc(currentSheet, r, true);
        } catch (errLock) {
          Logger.log("Không thể khóa dòng: " + errLock);
        }
      } else {
        e.range.clearNote();
      }
      return;
    }

    // 🛡️ TỰ ĐỘNG PHỤC HỒI CÔNG THỨC NẾU BỊ AI ĐÓ XÓA NHẦM TRÊN CÁC DÒNG
    // Lưu ý: CỘT M (c === 13) KHÔNG TỰ ĐỘNG GÁN CÔNG THỨC để Kế toán tự nhập thời gian báo rút
    if (r >= 48 && !currentSheet.getRange(r, 5).getValue() && !e.range.getFormula() && !e.range.getValue()) {
      var prev = r - 1;
      if (c === 1) e.range.setFormula('=IF(E' + r + '<>""; A' + prev + '+1; "")');
      else if (c === 2) e.range.setFormula('=IF(E' + r + '=""; ""; "Thuận An")');
      else if (c === 3) e.range.setFormula('=IF(E' + r + '=""; ""; IF(AND(C' + r + '<>""; C' + r + '<>0; C' + r + '<>"30/12/1899"); C' + r + '; TEXT(TODAY(); "dd/mm/yyyy")))');
      else if (c === 4) e.range.setFormula('=IF(E' + r + '=""; ""; IFERROR(TRIM(XLOOKUP(E' + r + '; \'_DATA_YEUCAUXHD\'!$I:$I; \'_DATA_YEUCAUXHD\'!$D:$D; "") & " " & XLOOKUP(E' + r + '; \'_DATA_YEUCAUXHD\'!$I:$I; \'_DATA_YEUCAUXHD\'!$E:$E; "")); ""))');
      else if (c === 6) e.range.setFormula('=IF(E' + r + '=""; ""; IFERROR(XLOOKUP(E' + r + '; \'_DATA_YEUCAUXHD\'!$I:$I; \'_DATA_YEUCAUXHD\'!$B:$B; ""); ""))');
      else if (c === 12) e.range.setFormula('=IF(E' + r + '=""; ""; IFERROR(IF(OR(XLOOKUP(E' + r + '; \'_DATA_YEUCAUXHD\'!$I:$I; \'_DATA_YEUCAUXHD\'!$L:$L; "")=""; XLOOKUP(E' + r + '; \'_DATA_YEUCAUXHD\'!$I:$I; \'_DATA_YEUCAUXHD\'!$L:$L; 0)=0); ""; TEXT(XLOOKUP(E' + r + '; \'_DATA_YEUCAUXHD\'!$I:$I; \'_DATA_YEUCAUXHD\'!$L:$L; ""); "dd/mm/yyyy")); ""))');
      else if (c === 14) e.range.setFormula('=IF(E' + r + '=""; ""; IFERROR(XLOOKUP(E' + r + '; \'_DATA_YEUCAUXHD\'!$I:$I; \'_DATA_YEUCAUXHD\'!$H:$H; ""); ""))');
      return;
    }

    if (r >= 3 && c === 5) { // Cột E = Số khung (VIN)
      var vinVal = String(e.range.getValue() || '').trim().toUpperCase();
      var ssParent = currentSheet.getParent();
      var dSheet = ssParent ? ssParent.getSheetByName('_DATA_YEUCAUXHD') : null;

      if (vinVal) {
        // 🛑 KIỂM TRA CHỐNG TRÙNG SỐ VIN ĐÃ NHẬP
        var lastR = currentSheet.getLastRow();
        if (lastR >= 3) {
          var allVins = currentSheet.getRange(3, 5, lastR - 2, 1).getValues();
          var duplicateRow = -1;
          for (var i = 0; i < allVins.length; i++) {
            var checkRow = i + 3;
            var checkVin = String(allVins[i][0] || '').trim().toUpperCase();
            if (checkRow !== r && checkVin === vinVal) {
              duplicateRow = checkRow;
              break;
            }
          }
          if (duplicateRow !== -1) {
            // Phát hiện trùng VIN -> XÓA NGAY LẬP TỨC và CẢNH BÁO
            e.range.clearContent();
            if (dSheet) {
              var ruleQ = SpreadsheetApp.newDataValidation()
                .requireValueInRange(dSheet.getRange('Q1:Q500'), true)
                .setAllowInvalid(false)
                .setHelpText('Chỉ hiển thị các số VIN CHƯA ĐƯỢC NHẬP BÁO RÚT!')
                .build();
              e.range.setDataValidation(ruleQ);
            }
            currentSheet.getRange(r, 2).setValue("");
            currentSheet.getRange(r, 3).setValue("");
            currentSheet.getRange(r, 13).setValue("");
            SpreadsheetApp.getActiveSpreadsheet().toast(
              "❌ Số VIN " + vinVal + " ĐÃ ĐƯỢC NHẬP BÁO RÚT ở Dòng " + duplicateRow + "! Hệ thống đã tự động từ chối và ngăn chặn nhập trùng.",
              "🚫 CẢNH BÁO TRÙNG SỐ VIN",
              10
            );
            return;
          }
        }

        if (e.range.getValue() !== vinVal) {
          e.range.setValue(vinVal);
        }

        // ✅ Chuyển validation của dòng vừa nhập sang danh sách gốc (I1:I1000) để KHÔNG BAO GIỜ bị báo lỗi tam giác đỏ
        if (dSheet) {
          var ruleMaster = SpreadsheetApp.newDataValidation()
            .requireValueInRange(dSheet.getRange('I1:I1000'), true)
            .setAllowInvalid(false)
            .build();
          e.range.setDataValidation(ruleMaster);

          // Đồng thời đảm bảo dòng kế tiếp (r + 1) trỏ vào Q1:Q500 (chỉ hiện VIN chưa rút)
          var ruleNext = SpreadsheetApp.newDataValidation()
            .requireValueInRange(dSheet.getRange('Q1:Q500'), true)
            .setAllowInvalid(false)
            .setHelpText('Chỉ hiển thị các số VIN CHƯA ĐƯỢC NHẬP BÁO RÚT!')
            .build();
          currentSheet.getRange(r + 1, 5).setDataValidation(ruleNext);
        }

        var cellC = currentSheet.getRange(r, 3);
        if (!cellC.getValue()) {
          var todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
          cellC.setValue(todayStr);
        }
        var cellB = currentSheet.getRange(r, 2);
        if (!cellB.getValue()) {
          cellB.setValue("Thuận An");
        }
        // Cột M để trống cho Kế toán tự ghi nhận theo đúng quy trình nghiệp vụ
      } else {
        // Khi xóa rỗng ô VIN -> trả validation về danh sách VIN chưa rút (Q1:Q500)
        if (dSheet) {
          var ruleQReset = SpreadsheetApp.newDataValidation()
            .requireValueInRange(dSheet.getRange('Q1:Q500'), true)
            .setAllowInvalid(false)
            .setHelpText('Chỉ hiển thị các số VIN CHƯA ĐƯỢC NHẬP BÁO RÚT!')
            .build();
          e.range.setDataValidation(ruleQReset);
        }
        currentSheet.getRange(r, 2).setValue("");
        currentSheet.getRange(r, 3).setValue("");
        currentSheet.getRange(r, 13).setValue("");
      }
    }
    return;
  }

  // Sheet BÁO CÁO KPI chạy 100% bằng công thức native, không cần can thiệp script onEdit

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = "NHU CẦU GHÉP XE"; // Tên sheet chính
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    Logger.log(`❌ Lỗi: Sheet "${sheetName}" không tồn tại!`);
    return;
  }

  var range = e.range;
  var row = range.getRow();
  var col = range.getColumn();
  var timestamp = new Date();

  // ✅ Ghi nhận ngày nhập liệu vào cột B khi nhập vào cột C
  if (col === 3 && row > 1) {
    updateDateCell(sheet, row, 2, timestamp);
  }

  // ✅ Xóa cột B nếu cột C trống
  if (col === 3 && row > 1) {
    var columnCValue = sheet.getRange(row, 3).getValue();
    if (!columnCValue) {
      sheet.getRange(row, 2).setValue("");
    }
  }

  // ✅ Khi nhập VIN vào cột J, cập nhật ngay cột K và gửi email nếu chưa gửi
  if (col === 10 && row > 1) {
    var vinMoi = sheet.getRange(row, 10).getValue();
    if (vinMoi) {
      handleSpecialEdits(sheet, row);
      kiemTraVaGuiEmail(sheet, row);
    } else {
      sheet.getRange(row, 11).setValue(""); // Xóa ngày ghép nếu VIN bị xóa
    }
  }

  // ✅ Xóa cột K nếu cột J trống
  if (col === 10 && row > 1) {
    var columnJValue = sheet.getRange(row, 10).getValue();
    if (!columnJValue) {
      sheet.getRange(row, 11).setValue("");
    }
  }
}

// 📌 Ghi nhận ngày nhập vào cột B khi cột C có dữ liệu
function updateDateCell(sheet, row, columnB, timestamp) {
  var dateCell = sheet.getRange(row, columnB);
  if (!dateCell.getValue()) {
    dateCell.setValue(timestamp);
  }
}

// 📌 Ghi nhận ngày ghép vào cột K khi nhập VIN vào cột J
function handleSpecialEdits(sheet, row) {
  var dateCell = sheet.getRange(row, 11); // Cột K - Ngày Ghép
  if (!dateCell.getValue()) {
    dateCell.setValue(new Date());
  }
}

// 📌 Kiểm tra cột Q trước khi gửi email
function kiemTraVaGuiEmail(sheet, row) {
  var statusCell = sheet.getRange(row, 17); // Cột trạng thái gửi email
  var emailStatus = statusCell.getValue();
  
  if (emailStatus && emailStatus.includes("✅")) {
    Logger.log(`⏳ Email đã gửi trước đó, bỏ qua hàng ${row}`);
    return;
  }

  var ngayGhep = sheet.getRange(row, 11).getValue();
  if (ngayGhep instanceof Date && !isNaN(ngayGhep.getTime())) {
    thongBaoGhepVIN(sheet, row);
  } else {
    Logger.log(`⚠ Không tìm thấy ngày ghép tại hàng ${row}, không gửi email.`);
  }
}

// 📌 Gửi email khi ghép VIN mới
function thongBaoGhepVIN(sheet, row) {
  var statusCell = sheet.getRange(row, 17); // Cột ghi trạng thái gửi email

  var vinMoi = sheet.getRange(row, 10).getValue().toString().trim();
  if (!vinMoi) {
    Logger.log(`⚠ Không có VIN mới tại hàng ${row}, bỏ qua.`);
    return;
  }

  var tenTVBH = sheet.getRange(row, 3).getValue().toString().trim();
  if (!tenTVBH) {
    Logger.log("⚠ Không tìm thấy tên TVBH.");
    statusCell.setValue("❌ Không có tên TVBH!");
    return;
  }

  var sheetLog = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Log");
  if (!sheetLog) {
    Logger.log("❌ Không tìm thấy sheet Log!");
    statusCell.setValue("❌ Lỗi: Không có Log!");
    return;
  }

  var logData = sheetLog.getDataRange().getValues();
  var emailTVBH = "";
  for (var i = 1; i < logData.length; i++) {
    if (logData[i][0]?.toString().trim() === tenTVBH) {
      emailTVBH = logData[i][1]?.toString().trim();
      break;
    }
  }

  if (!emailTVBH || !emailTVBH.includes("@")) {
    Logger.log(`⚠ Không tìm thấy email hợp lệ cho TVBH: ${tenTVBH}`);
    statusCell.setValue("❌ Không tìm thấy email hợp lệ!");
    return;
  }

  var ngayGhep = sheet.getRange(row, 11).getValue();
  if (ngayGhep instanceof Date) {
    ngayGhep = Utilities.formatDate(ngayGhep, Session.getScriptTimeZone(), "dd/MM/yyyy");
  } else {
    ngayGhep = "Chưa cập nhật";
  }

  // 📌 Nội dung email với giao diện HTML giữ nguyên
  var subject = "🔔 ĐƠN HÀNG ĐÃ ĐƯỢC GHÉP XE!";
  var body = `<table style="width: 100%; max-width: 500px; margin: auto; font-family: 'Merriweather', serif; background: #FFFFFF; color: #333; border: 1px solid #add8e6; border-radius: 12px; box-shadow: 0px 4px 15px rgba(173, 216, 230, 1);">
  <tr>
    <td colspan="2" style="background: linear-gradient(90deg, #444444, #BBBBBB); color: #ffffff; text-align: center; font-size: 24px; font-weight: bold; padding: 20px; border-top-left-radius: 12px; border-top-right-radius: 12px;">
      🚘 SHOWROOM THUẬN AN 🚘
    </td>
  </tr>
  <tr>
    <td colspan="2" style="padding: 20px; text-align: center; font-size: 18px; font-style: italic; border-bottom: 1px solid #add8e6;">
      Xin chào <b>${tenTVBH}</b>, <br>
      Đơn hàng của anh/chị đã được ghép VIN:
    </td>
  </tr>
  <tr>
    <td style="padding: 15px; font-weight: bold; color: #003399;">🚗 Dòng Xe</td>
    <td style="padding: 15px; color: #000000;">${sheet.getRange(row, 4).getValue()}</td>
  </tr>
  <tr>
    <td style="padding: 15px; font-weight: bold; color: #003399;">📌 Phiên Bản</td>
    <td style="padding: 15px; color: #000000;">${sheet.getRange(row, 5).getValue()}</td>
  </tr>
  <tr>
    <td style="padding: 15px; font-weight: bold; color: #003399;">🎨 Ngoại Thất</td>
    <td style="padding: 15px; color: #000000;">${sheet.getRange(row, 6).getValue()}</td>
  </tr>
  <tr>
    <td style="padding: 15px; font-weight: bold; color: #003399;">🛋 Nội Thất</td>
    <td style="padding: 15px; color: #000000;">${sheet.getRange(row, 7).getValue()}</td>
  </tr>
  <tr>
    <td style="padding: 15px; font-weight: bold; color: #003399;">🔢 Số Đơn Hàng</td>
    <td style="padding: 15px; color: #000000;">${sheet.getRange(row, 8).getValue()}</td>
  </tr>
  <tr>
    <td style="padding: 15px; font-weight: bold; color: #003399;">👤 Tên Khách Hàng</td>
    <td style="padding: 15px; color: #000000;">${sheet.getRange(row, 9).getValue()}</td>
  </tr>
  <tr>
    <td style="padding: 15px; font-weight: bold; color: #003399;">📅 Ngày Ghép</td>
    <td style="padding: 15px; color: #000000;">${ngayGhep}</td>
  </tr>
  <tr>
    <td colspan="2" style="padding: 20px; text-align: center; background: linear-gradient(90deg, #BBBBBB, #444444); color: white; font-size: 22px; font-weight: bold; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; box-shadow: 0px 0px 15px rgba(255, 215, 0, 0.7);">
      🔖 VIN: ${vinMoi}
    </td>
  </tr>
  <tr>
    <td colspan="2" style="padding: 15px; text-align: center; font-size: 18px; font-weight: bold; color: #4682b4; border-top: 1px solid #add8e6;">
      📋 Vui lòng xác nhận thông tin lại với ADMIN!
    </td>
  </tr>
</table>`;

  try {
    MailApp.sendEmail({
      to: emailTVBH,
      subject: subject,
      htmlBody: body
    });
    Logger.log(`✅ Email gửi thành công tới ${emailTVBH}`);
    statusCell.setValue("✅ Đã gửi email!");
  } catch (error) {
    Logger.log(`❌ Lỗi gửi email: ${error.message}`);
    statusCell.setValue(`❌ Lỗi gửi email: ${error.message}`);
  }
}



// 🔒 HÀM TỰ ĐỘNG KHÓA DÒNG KHI KẾ TOÁN NHẬP CỘT M (KHÔNG CHO TVBH SỬA NỮA)
function khoaDongRutCoc(sheet, r, isLock) {
  try {
    var adminEmails = ['showroomthuanan@gmail.com', 'ptnhan190697@gmail.com', 'hoanghanh2089@gmail.com'];
    var targetA1 = 'A' + r + ':N' + r;
    var range = sheet.getRange(r, 1, 1, 14);
    var protections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
    var prot = null;
    for (var i = 0; i < protections.length; i++) {
      if (protections[i].getRange().getA1Notation() === targetA1) {
        prot = protections[i];
        break;
      }
    }
    if (isLock) {
      if (!prot) {
        prot = range.protect().setDescription('Đã khóa bởi Kế toán - Dòng ' + r);
      } else {
        prot.setDescription('Đã khóa bởi Kế toán - Dòng ' + r);
      }
      prot.removeEditors(prot.getEditors());
      prot.addEditors(adminEmails);
      if (prot.canDomainEdit()) prot.setDomainEdit(false);
    }
  } catch (err) {
    Logger.log("Lỗi khóa dòng " + r + ": " + err);
  }
}
