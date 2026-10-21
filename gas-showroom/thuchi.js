/**
 * @OnlyCurrentDoc
 * This script sets up a violation tracker within an EXISTING spreadsheet.
 * It adds sheets, a custom menu, an installable trigger, and late fee calculation.
 */

//=================================================================================
// HÀM TỰ ĐỘNG CHẠY KHI MỞ FILE
//=================================================================================
function onOpen() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var email = (Session.getActiveUser().getEmail() || '').toLowerCase().trim();
    var owner = ss.getOwner();
    var ownerEmail = owner ? owner.getEmail().toLowerCase().trim() : 'showroomthuanan@gmail.com';

    // Danh sách tài khoản quản trị được phép nhìn thấy Menu
    var adminEmails = [ownerEmail, 'showroomthuanan@gmail.com', 'ptnhan190697@gmail.com'];

    // Nếu người mở sheet là TVBH / Nhân viên (không thuộc adminEmails) thì KHÔNG TẠO MENU
    if (email && adminEmails.indexOf(email) === -1) {
      return;
    }

    var ui = SpreadsheetApp.getUi();
    // Gom tất cả vào DUY NHẤT 1 MENU
    ui.createMenu('⚙️ Cài Đặt & Quản Trị')
      .addItem('📸 Tải Ảnh COC & AI Tự Động Quét', 'moHopThoaiQuetCoc')
      .addItem('🔒 Chốt Số Liệu KPI & Mở Kỳ Mới', 'chotSoLieuVaMoKyKpiMoi')
      .addSeparator()
      .addItem('🔄 Khôi Phục Công Thức Sổ RÚT COC', 'phucHoiCongThucRutCoc')
      .addSeparator()
      .addItem('1. Cài đặt các trang tính', 'setupSheets')
      .addItem('2. Kích hoạt Trigger ghi ngày', 'createOnEditTrigger')
      .addSeparator()
      .addItem('3. Số lượng hoàn cọc (Cập nhật thủ công)', 'demVaHienThiTVBHTrenSheetHoanCoc')
      .addToUi();
  } catch (e) {
    Logger.log('Lỗi onOpen: ' + e);
  }
}

//=================================================================================
// HÀM TỰ ĐỘNG KHÔI PHỤC CÔNG THỨC & DROPDOWN CHO SỔ RÚT COC
//=================================================================================
function phucHoiCongThucRutCoc() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var rc = ss.getSheetByName('RÚT COC');
  var dSheet = ss.getSheetByName('_DATA_YEUCAUXHD');
  if (!rc || !dSheet) {
    SpreadsheetApp.getActiveSpreadsheet().toast('❌ Không tìm thấy sheet RÚT COC hoặc _DATA_YEUCAUXHD!', 'LỖI', 5);
    return;
  }

  // 1. Khôi phục công thức lọc VIN chưa rút tại Cột Q của _DATA_YEUCAUXHD
  dSheet.getRange('Q1').setFormula('=IFERROR(FILTER($I$1:$I; ($I$1:$I<>"") * (COUNTIF(\'RÚT COC\'!$E$3:$E; $I$1:$I)=0)); "")');

  // 2. Tìm dòng cuối cùng đã có số VIN
  var maxR = Math.max(rc.getLastRow(), 150);
  var valsE = rc.getRange(3, 5, maxR - 2, 1).getValues();
  var lastDataRow = 3;
  for (var i = valsE.length - 1; i >= 0; i--) {
    if (String(valsE[i][0] || '').trim() !== '') {
      lastDataRow = i + 3;
      break;
    }
  }

  var startR = lastDataRow + 1;
  var numR = maxR - startR + 1;

  if (numR > 0) {
    var batchA = [], batchB = [], batchC = [], batchD = [], batchF = [], batchL = [], batchM = [], batchN = [];
    for (var r = startR; r <= maxR; r++) {
      var prev = r - 1;
      batchA.push(['=IF(E' + r + '<>""; A' + prev + '+1; "")']);
      batchB.push(['=IF(E' + r + '=""; ""; "Thuận An")']);
      batchC.push(['=IF(E' + r + '=""; ""; IF(AND(C' + r + '<>""; C' + r + '<>0; C' + r + '<>"30/12/1899"); C' + r + '; TEXT(TODAY(); "dd/mm/yyyy")))']);
      batchD.push(['=IF(E' + r + '=""; ""; IFERROR(TRIM(XLOOKUP(E' + r + '; \'_DATA_YEUCAUXHD\'!$I:$I; \'_DATA_YEUCAUXHD\'!$D:$D; "") & " " & XLOOKUP(E' + r + '; \'_DATA_YEUCAUXHD\'!$I:$I; \'_DATA_YEUCAUXHD\'!$E:$E; "")); ""))']);
      batchF.push(['=IF(E' + r + '=""; ""; IFERROR(XLOOKUP(E' + r + '; \'_DATA_YEUCAUXHD\'!$I:$I; \'_DATA_YEUCAUXHD\'!$B:$B; ""); ""))']);
      batchL.push(['=IF(E' + r + '=""; ""; IFERROR(IF(OR(XLOOKUP(E' + r + '; \'_DATA_YEUCAUXHD\'!$I:$I; \'_DATA_YEUCAUXHD\'!$L:$L; "")=""; XLOOKUP(E' + r + '; \'_DATA_YEUCAUXHD\'!$I:$I; \'_DATA_YEUCAUXHD\'!$L:$L; 0)=0); ""; TEXT(XLOOKUP(E' + r + '; \'_DATA_YEUCAUXHD\'!$I:$I; \'_DATA_YEUCAUXHD\'!$L:$L; ""); "dd/mm/yyyy")); ""))']);
      batchM.push(['=IF(O' + r + '<>""; "✅ Đã có COC"; "")']);
      batchN.push(['=IF(E' + r + '=""; ""; IFERROR(XLOOKUP(E' + r + '; \'_DATA_YEUCAUXHD\'!$I:$I; \'_DATA_YEUCAUXHD\'!$H:$H; ""); ""))']);
    }

    rc.getRange(startR, 1, numR, 1).setFormulas(batchA);
    rc.getRange(startR, 2, numR, 1).setFormulas(batchB);
    rc.getRange(startR, 3, numR, 1).setFormulas(batchC);
    rc.getRange(startR, 4, numR, 1).setFormulas(batchD);
    rc.getRange(startR, 6, numR, 1).setFormulas(batchF);
    rc.getRange(startR, 12, numR, 1).setFormulas(batchL);
    rc.getRange(startR, 13, numR, 1).setFormulas(batchM);
    rc.getRange(startR, 14, numR, 1).setFormulas(batchN);
  }

  // 3. Khôi phục Data Validation Dropdown
  // - Các dòng ĐÃ CÓ số VIN (từ dòng 3 đến lastDataRow): trỏ vào I1:I1000 để KHÔNG BAO GIỜ bị báo lỗi tam giác đỏ
  var ruleMaster = SpreadsheetApp.newDataValidation()
    .requireValueInRange(dSheet.getRange('I1:I1000'), true)
    .setAllowInvalid(false)
    .setHelpText('Số VIN phải thuộc danh sách xe đề nghị xuất hóa đơn trên _DATA_YEUCAUXHD!')
    .build();
  if (lastDataRow >= 3) {
    rc.getRange(3, 5, lastDataRow - 2, 1).setDataValidation(ruleMaster);
  }

  // - Các dòng TRỐNG chưa nhập (từ lastDataRow + 1 đến maxR): trỏ vào Q1:Q500 (CHỈ HIỂN THỊ CÁC VIN CHƯA NHẬP)
  var ruleUnentered = SpreadsheetApp.newDataValidation()
    .requireValueInRange(dSheet.getRange('Q1:Q500'), true)
    .setAllowInvalid(false)
    .setHelpText('Chỉ hiển thị các số VIN CHƯA ĐƯỢC NHẬP BÁO RÚT!')
    .build();
  if (numR > 0) {
    rc.getRange(startR, 5, numR, 1).setDataValidation(ruleUnentered);
  }

  var ruleH = SpreadsheetApp.newDataValidation().requireValueInList(['Trả góp', 'Trả thẳng'], true).build();
  rc.getRange(3, 8, maxR - 2, 1).setDataValidation(ruleH);

  // ruleM đã được gỡ bỏ theo yêu cầu: không dùng danh sách chọn cho Cột M
  // rc.getRange(3, 13, maxR - 2, 1).clearDataValidations();

  // 4. Khôi phục định dạng tiền tệ và canh lề
  rc.getRange(3, 9, maxR - 2, 3).setNumberFormat('#,##0" đ"').setHorizontalAlignment('right');
  rc.getRange(3, 1, maxR - 2, 1).setHorizontalAlignment('center');
  rc.getRange(3, 2, maxR - 2, 1).setHorizontalAlignment('center');
  rc.getRange(3, 3, maxR - 2, 1).setHorizontalAlignment('center');
  rc.getRange(3, 5, maxR - 2, 1).setHorizontalAlignment('center');
  rc.getRange(3, 6, maxR - 2, 1).setHorizontalAlignment('left').setFontSize(9).setFontWeight('normal').setFontColor('#334155');
  rc.getRange(3, 12, maxR - 2, 1).setHorizontalAlignment('center');
  rc.getRange(3, 13, maxR - 2, 1).setHorizontalAlignment('center');
  rc.getRange(3, 14, maxR - 2, 1).setHorizontalAlignment('left').setFontSize(8.5).setFontWeight('normal').setFontColor('#475569');
  rc.getRange(3, 15, maxR - 2, 1).setHorizontalAlignment('center');

  SpreadsheetApp.flush();
  SpreadsheetApp.getActiveSpreadsheet().toast('✅ Đã khôi phục hoàn chỉnh 100% công thức, validation và định dạng cho sổ RÚT COC!', 'THÀNH CÔNG', 6);
}

//=================================================================================
// HÀM CÀI ĐẶT CÁC TRANG TÍNH (Được gọi từ Menu)
//=================================================================================
function setupSheets() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  if (!spreadsheet.getSheetByName("Thiết Lập")) {
    setupThietLapSheet(spreadsheet);
  }
  
  if (!spreadsheet.getSheetByName("Sổ Theo Dõi Thu Chi")) {
    setupSoTheoDoiSheet(spreadsheet);
  } else {
     const ui = SpreadsheetApp.getUi();
     const response = ui.alert('Trang tính "Sổ Theo Dõi Thu Chi" đã tồn tại.', 'Bạn có muốn áp dụng lại các công thức và định dạng mới không? (Dữ liệu cũ sẽ được giữ lại)', ui.ButtonSet.YES_NO);
     if (response == ui.Button.YES) {
       setupSoTheoDoiSheet(spreadsheet, true);
     }
  }
  
  SpreadsheetApp.getUi().alert('Cài đặt trang tính thành công! Các sheet "Thiết Lập" và "Sổ Theo Dõi Thu Chi" đã sẵn sàng.');
}

//=================================================================================
// HÀM TẠO TRIGGER TỰ ĐỘNG (Được gọi từ Menu)
//=================================================================================
function createOnEditTrigger() {
  const spreadsheet = SpreadsheetApp.getActive();
  const functionName = 'ghiNhanThoiGian';

  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === functionName) {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  ScriptApp.newTrigger(functionName)
      .forSpreadsheet(spreadsheet)
      .onEdit()
      .create();

  SpreadsheetApp.getUi().alert('Kích hoạt thành công! Chức năng tự động ghi ngày vi phạm đã sẵn sàng.');
}

//=================================================================================
// HÀM GHI NHẬN THỜI GIAN (Được gọi bởi Trigger)
//=================================================================================
/**
 * Runs automatically when a user edits a cell, called by the installable trigger.
 * @param {Object} e The event object.
 */
function ghiNhanThoiGian(e) {
  const range = e.range;
  const sheet = e.source.getActiveSheet();
  const sheetName = "Sổ Theo Dõi Thu Chi";
  const row = range.getRow();
  const col = range.getColumn();

  if (sheet.getName() === sheetName && col === 3 && row > 2) {
    const timestampCell = sheet.getRange(row, 1);
    if (timestampCell.getValue() === "" && range.getValue() !== "") {
      // --- ĐÃ CẬP NHẬT ĐỊNH DẠNG NGÀY TẠI ĐÂY ---
      timestampCell.setValue(new Date()).setNumberFormat("dd/MM/yyyy");
    }
  }
}

//=================================================================================
// CÁC HÀM PHỤ TRỢ (Dùng để tạo cấu trúc cho sheet)
//=================================================================================

function setupThietLapSheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet("Thiết Lập");
  const violationData = [["Nội dung vi phạm", "Mức phạt (VNĐ)"],["Quên tắt máy lạnh, các thiết bị điện không sử dụng", 200000],["Không dọn dẹp sau khi giao xe", 200000],["Nhóm trực không lau xe, bàn lễ tân không gọn gàng", 200000],["Để mộc không đúng nơi quy định", 200000],["Không dọn dẹp bàn làm việc trước khi về", 200000],["Sử dụng giấy không hợp lý (in xong không lấy)", 200000],["Nhóm trực không mặc đúng đồng phục quy định", 200000],["Không tự ý mở máy lạnh phòng họp (chỉ mở tử 12h-13h)", 200000],["Sử dụng tài sản, thiết bị của công ty vào mục đích cá nhân", 200000],["Không đeo thẻ nhân viên/bảng tên trong giờ làm việc", 50000],["Không hút thuốc trong phạm vi công ty", 500000],["Trễ hạn (deadline) công việc được giao mà không thông báo lý do chính đáng", 200000],["Tự ý di chuyển, sử dụng vật dụng/thiết bị của người khác khi chưa được phép", 150000],["Để xe không đúng nơi quy định, gây cản trở lối đi chung", 100000],["Không giữ gìn vệ sinh chung tại khu vực công cộng (bếp, toilet, phòng họp...)", 100000],["Không tuân thủ các quy định về an toàn lao động, phòng cháy chữa cháy", 500000],["Không tuân thủ quy trình làm việc đã được ban hành", 150000],["Không cập nhật trạng thái công việc trên các công cụ quản lý chung của công ty", 50000],["Không tắt các thiết bị điện không cần thiết tại khu vực cá nhân và chung khi ra về", 50000],["Cời giày trong phòng làm việc", 100000]];
  const employeeData = [["Danh sách Nhân viên"],["Nguyễn Văn A"],["Trần Thị B"],["Lê Văn C"],["(Thêm nhân viên khác vào đây)"]];
  sheet.getRange(1, 1, violationData.length, 2).setValues(violationData);
  sheet.getRange(1, 4, employeeData.length, 1).setValues(employeeData);
  sheet.getRange("A1:B1").setFontWeight("bold");
  sheet.getRange("D1").setFontWeight("bold");
  sheet.getRange("B2:B" + violationData.length).setNumberFormat("#,##0");
  sheet.autoResizeColumns(1, 4);
  return sheet;
}

function setupSoTheoDoiSheet(spreadsheet, reapply = false) {
  const sheetName = "Sổ Theo Dõi Thu Chi";
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName, 0);
  } else if (reapply) {
    sheet.getRange("F:F").clearContent();
    sheet.getRange("M2:M4").clearContent();
  }

  const thuSubHeader = ["Ngày vi phạm", "Ngày đóng tiền", "Nhân viên vi phạm", "Nội dung vi phạm", "Số tiền phạt (VNĐ)", "Tổng phải nộp (gồm lãi)"];
  
  const thuHeader = ["A. MỤC THU - TIỀN PHẠT VI PHẠM"];
  const chiHeader = ["B. MỤC CHI"];
  const chiSubHeader = ["Ngày chi", "Nội dung chi", "Số tiền chi (VNĐ)"];
  const summaryHeader = ["C. TỔNG KẾT"];
  const summaryData = [["Tổng Thu", ""], ["Tổng Chi", ""], ["Tồn Quỹ", ""]];
  
  sheet.getRange("A1").setValue(thuHeader).setFontWeight("bold").setFontSize(12);
  sheet.getRange("A2:F2").setValues([thuSubHeader]).setFontWeight("bold");
  sheet.getRange("H1").setValue(chiHeader).setFontWeight("bold").setFontSize(12);
  sheet.getRange("H2:J2").setValues([chiSubHeader]).setFontWeight("bold");
  sheet.getRange("L1").setValue(summaryHeader).setFontWeight("bold").setFontSize(12);
  sheet.getRange("L2:M4").setValues(summaryData);
  sheet.getRange("L2:L4").setFontWeight("bold");

  const setupSheet = spreadsheet.getSheetByName("Thiết Lập");
  const employeeRange = setupSheet.getRange('D2:D' + setupSheet.getLastRow());
  const employeeRule = SpreadsheetApp.newDataValidation().requireValueInRange(employeeRange).setAllowInvalid(false).build();
  sheet.getRange("C3:C1000").setDataValidation(employeeRule);
  
  const violationRange = setupSheet.getRange('A2:A' + setupSheet.getLastRow());
  const violationRule = SpreadsheetApp.newDataValidation().requireValueInRange(violationRange).setAllowInvalid(false).build();
  sheet.getRange("D3:D1000").setDataValidation(violationRule);
  
  const dateRule = SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build();
  sheet.getRange("A3:B1000").setDataValidation(dateRule);
  sheet.getRange("H3:H1000").setDataValidation(dateRule);
  
  sheet.getRange("A3:B1000").setNumberFormat("dd/MM/yyyy");
  sheet.getRange("H3:H1000").setNumberFormat("dd/MM/yyyy");

  sheet.getRange("E3").setFormula('=IFERROR(VLOOKUP(D3; \'Thiết Lập\'!$A$2:$B; 2; FALSE); "")');
  
  const lateFeeFormula = '=IF(E3=""; ""; IF(B3<>""; E3; E3 + MAX(0; INT(TODAY())-A3-10) * (E3/100000 * 10000)))';
  sheet.getRange("F3").setFormula(lateFeeFormula);

  sheet.getRange("M2").setFormula('=SUMIF(B3:B; "<>"; E3:E)');
  sheet.getRange("M3").setFormula('=SUM(J3:J)');
  sheet.getRange("M4").setFormula('=M2-M3');
  
  const currencyFormat = '#,##0 "VNĐ"';
  sheet.getRange("E3:F").setNumberFormat(currencyFormat);
  sheet.getRange("J3:J").setNumberFormat(currencyFormat);
  sheet.getRange("M2:M4").setNumberFormat(currencyFormat);
  
  sheet.setColumnWidths(1, 2, 120);
  sheet.setColumnWidth(3, 180);
  sheet.setColumnWidth(4, 300);
  sheet.setColumnWidth(5, 150);
  sheet.setColumnWidth(6, 180);
  sheet.setColumnWidth(8, 120);
  sheet.setColumnWidth(9, 250);
  sheet.setColumnWidth(10, 150);

  return sheet;
}