function hideZerosWithFormatting() {
  var sheetName = "KPIs THÁNG 4";
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return;
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  var range = sheet.getRange(2, 1, lastRow - 1, lastCol);
  var rule = SpreadsheetApp.newConditionalFormatRule().whenNumberEqualTo(0).setFontColor("#FFFFFF").setRanges([range]).build();
  var rules = sheet.getConditionalFormatRules();
  rules.push(rule);
  sheet.setConditionalFormatRules(rules);
}

function colIndexToLetter(colIndex) {
  var temp = '', letter = '';
  while (colIndex > 0) {
    temp = (colIndex - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    colIndex = Math.floor((colIndex - temp - 1) / 26);
  }
  return letter;
}

function applyCompactColumnWidths(sheet) {
  sheet.setColumnWidth(1, 28);
  sheet.setColumnWidth(2, 140);
  sheet.setColumnWidth(3, 38);
  sheet.setColumnWidth(4, 38);
  for (var c = 5; c <= 33; c++) sheet.setColumnWidth(c, 33);
  sheet.setColumnWidth(34, 46);
  sheet.setColumnWidth(35, 46);
  sheet.setColumnWidth(36, 50);
}

function handleKpiOnEdit(e) {
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(1000)) return;

  try {
    if (!e || !e.range) return;
    var sheet = e.range.getSheet();
    if (sheet.getName() !== "BÁO CÁO KPI") return;

    var ss = sheet.getParent();
    var row = e.range.getRow();
    var col = e.range.getColumn();
    var cell = e.range.getA1Notation();

    if (row === 1 && (col === 1 || col === 2 || cell.indexOf("A1") !== -1 || cell.indexOf("B1") !== -1)) {
      // Khi đổi Tháng ở A1:
      var curTvbh = String(sheet.getRange("C1").getValue()).trim();
      if (curTvbh && curTvbh.indexOf("Tất cả") === -1) {
        // Nếu trước đó đang xem lịch sử 1 TVBH thì trả về Tất cả TVBH và khôi phục giao diện công thức 3 phòng
        try { sheet.getRange("C1").setValue("Tất cả TVBH"); } catch (eSet) {}
        renderKpiReportForMonth(null, ss);
      }
      // Nếu C1 đang là "Tất cả TVBH", công thức Google Sheets tự động nhảy số tức thì 0.01s!

    } else if (row === 1 && (col === 3 || col === 4 || cell.indexOf("C1") !== -1 || cell.indexOf("D1") !== -1)) {
      // Khi đổi TVBH ở C1:
      var tvbh = String(sheet.getRange("C1").getValue()).trim();
      if (!tvbh || tvbh.indexOf("Tất cả") !== -1) {
        renderKpiReportForMonth(null, ss);
      } else {
        renderKpiReportForTvbh(tvbh, ss);
      }
    }
  } catch (err) {
    Logger.log("handleKpiOnEdit error: " + err);
  } finally {
    try { lock.releaseLock(); } catch(eL) {}
  }
}

/**
 * GIAO DIỆN 3 PHÒNG THEO THÁNG: DÙNG 100% CÔNG THỨC GOOGLE SHEETS NATIVE (0.01S TỨC THÌ)
 */
function renderKpiReportForMonth(targetMonth, ss) {
  if (!ss) {
    try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch(e) {}
  }
  if (!ss) {
    ss = SpreadsheetApp.openById("1GMAX4_0Xubwz4ByRN9eDIokZntLO98NlmzeURkYBc8M");
  }

  var kpiSheet = ss.getSheetByName("BÁO CÁO KPI");
  var thSheet = ss.getSheetByName("TONG_HOP_KPI");
  if (!kpiSheet || !thSheet) return { success: false, message: "Sheet not found" };

  var lc = 36;
  var numFormatWithDash = '#,##0;-#,##0;""';
  var percentFormatWithDash = '0.0%;-0.0%;"-"';

  kpiSheet.getRange('A1:B1').setNumberFormat('@');
  kpiSheet.getRange('C1:D1').setNumberFormat('@');
  try { kpiSheet.getRange('C1').setValue('Tất cả TVBH'); } catch (eC1) {}

  // Danh sách 26 TVBH chuẩn của Showroom
  var p1 = [
    'Tất Bách Tường', 'Phạm Trọng Huy', 'Nguyễn Trần Hoàng Thanh', 'Tống Thành Đạt',
    'Huỳnh Diệp Thanh Trâm', 'Phan Văn Cường', 'Lê Thị Hương Trà', 'Hà Hữu Huy',
    'Nguyễn Văn Nghĩa', 'Nguyễn Bá Dũng'
  ];
  var p2 = [
    'Đinh Trọng Nhân', 'Thành Ngọc Vinh', 'Nguyễn Thiện Thảo', 'Nguyễn Anh Tiến',
    'Võ Thế Lân', 'Phạm Thị Thúy Nga', 'Nguyễn Thị Yến Vy', 'Nguyễn Hoàng Khang Huy',
    'Nguyễn Thanh Cả', 'Trần Danh Phương'
  ];
  var p3 = [
    'Nguyễn Hoàng Phúc', 'Phạm Khánh Duy', 'Nguyễn Dư Thuận', 'Đào Minh Ký',
    'Lê Thị Huyền Trang', 'Lê Thị Thúy Nga'
  ];

  var p1StartRow = 5, p1EndRow = 14, p1SubRow = 15;
  var p2StartRow = 17, p2EndRow = 26, p2SubRow = 27;
  var p3StartRow = 29, p3EndRow = 34, p3SubRow = 35;
  var grandTotalRow = 36;
  var totalRows = 33;

  var curMaxRows = kpiSheet.getMaxRows();
  if (curMaxRows < grandTotalRow) {
    kpiSheet.insertRowsAfter(curMaxRows, grandTotalRow - curMaxRows);
  } else if (curMaxRows > grandTotalRow) {
    kpiSheet.deleteRows(grandTotalRow + 1, curMaxRows - grandTotalRow);
  }

  kpiSheet.getRange(4, 1, totalRows, lc).clearContent();

  var vals = [], bgs = [], colors = [], weights = [], aligns = [];
  for (var r = 0; r < totalRows; r++) {
    var rowV = [], rowB = [], rowC = [], rowW = [], rowA = [];
    for (var c = 0; c < lc; c++) {
      rowV.push(''); rowB.push('#FFFFFF'); rowC.push('#0F172A'); rowW.push('normal'); rowA.push(c === 1 ? 'left' : 'center');
    }
    vals.push(rowV); bgs.push(rowB); colors.push(rowC); weights.push(rowW); aligns.push(rowA);
  }

  function setDeptHeader(rowIndex, num, name) {
    var idx = rowIndex - 4;
    vals[idx][0] = '🏢';
    vals[idx][1] = num + '. ' + name;
    for (var c = 0; c < lc; c++) {
      bgs[idx][c] = '#F1F5F9'; colors[idx][c] = '#1E293B'; weights[idx][c] = 'bold';
    }
  }
  setDeptHeader(4, '1', 'PHÒNG KINH DOANH 1  ·  TPKD: TẤT BÁCH TƯỜNG');
  setDeptHeader(16, '2', 'PHÒNG KINH DOANH 2  ·  TPKD: ĐINH TRỌNG NHÂN');
  setDeptHeader(28, '3', 'PHÒNG KINH DOANH 3  ·  TPKD: NGUYỄN HOÀNG PHÚC');

  var globalStt = 1;
  function fillTvbh(startRow, list) {
    for (var i = 0; i < list.length; i++) {
      var idx = (startRow + i) - 4;
      vals[idx][0] = globalStt++;
      vals[idx][1] = list[i];
      var rowBg = (i % 2 === 0) ? '#FFFFFF' : '#F8FAFC';
      for (var c = 0; c < lc; c++) bgs[idx][c] = rowBg;
    }
  }
  fillTvbh(p1StartRow, p1);
  fillTvbh(p2StartRow, p2);
  fillTvbh(p3StartRow, p3);

  function setSub(rowIndex, title) {
    var idx = rowIndex - 4;
    vals[idx][0] = '👉';
    vals[idx][1] = title;
    for (var c = 0; c < lc; c++) {
      bgs[idx][c] = '#E2E8F0'; colors[idx][c] = '#0F172A'; weights[idx][c] = 'bold';
    }
  }
  setSub(p1SubRow, 'TỔNG PHÒNG 1');
  setSub(p2SubRow, 'TỔNG PHÒNG 2');
  setSub(p3SubRow, 'TỔNG PHÒNG 3');

  var gIdx = grandTotalRow - 4;
  vals[gIdx][0] = '🏆';
  vals[gIdx][1] = 'TỔNG CỘNG SHOWROOM';
  for (var c = 0; c < lc; c++) {
    bgs[gIdx][c] = '#0F172A'; colors[gIdx][c] = '#F8FAFC'; weights[gIdx][c] = 'bold';
  }

  var targetRange = kpiSheet.getRange(4, 1, totalRows, lc);
  targetRange.setValues(vals);
  targetRange.setBackgrounds(bgs);
  targetRange.setFontColors(colors);
  targetRange.setFontWeights(weights);
  targetRange.setHorizontalAlignments(aligns);
  targetRange.setFontSize(8.5);

  // ĐẶT CÔNG THỨC NATIVE CHO TỪNG DÒNG TVBH
  var tvbhRowList = [];
  for (var r = p1StartRow; r <= p1EndRow; r++) tvbhRowList.push(r);
  for (var r = p2StartRow; r <= p2EndRow; r++) tvbhRowList.push(r);
  for (var r = p3StartRow; r <= p3EndRow; r++) tvbhRowList.push(r);

  for (var i = 0; i < tvbhRowList.length; i++) {
    var rowNum = tvbhRowList[i];
    var formula = '=IFERROR(FILTER(TONG_HOP_KPI!$D$2:$AJ$500; TRIM(TONG_HOP_KPI!$A$2:$A$500) = TRIM(TO_TEXT($A$1)); TONG_HOP_KPI!$C$2:$C$500 = $B' + rowNum + '); SEQUENCE(1; 33; 0; 0))';
    kpiSheet.getRange(rowNum, 3).setFormula(formula);
    kpiSheet.getRange(rowNum, 36).setFormula('=IFERROR(AI' + rowNum + '/D' + rowNum + '; 0)');
  }

  // CÔNG THỨC CÁC DÒNG TỔNG
  var fP1 = [], fP2 = [], fP3 = [], fG = [];
  for (var c = 3; c <= lc; c++) {
    var letCol = colIndexToLetter(c);
    if (c <= 35) {
      fP1.push('=SUM(' + letCol + p1StartRow + ':' + letCol + p1EndRow + ')');
      fP2.push('=SUM(' + letCol + p2StartRow + ':' + letCol + p2EndRow + ')');
      fP3.push('=SUM(' + letCol + p3StartRow + ':' + letCol + p3EndRow + ')');
      fG.push('=' + letCol + p1SubRow + '+' + letCol + p2SubRow + '+' + letCol + p3SubRow);
    } else {
      fP1.push('=IFERROR(AI' + p1SubRow + '/D' + p1SubRow + '; 0)');
      fP2.push('=IFERROR(AI' + p2SubRow + '/D' + p2SubRow + '; 0)');
      fP3.push('=IFERROR(AI' + p3SubRow + '/D' + p3SubRow + '; 0)');
      fG.push('=IFERROR(AI' + grandTotalRow + '/D' + grandTotalRow + '; 0)');
    }
  }
  kpiSheet.getRange(p1SubRow, 3, 1, lc - 2).setFormulas([fP1]);
  kpiSheet.getRange(p2SubRow, 3, 1, lc - 2).setFormulas([fP2]);
  kpiSheet.getRange(p3SubRow, 3, 1, lc - 2).setFormulas([fP3]);
  kpiSheet.getRange(grandTotalRow, 3, 1, lc - 2).setFormulas([fG]);

  kpiSheet.getRange(4, 3, totalRows, 33).setNumberFormat(numFormatWithDash);
  kpiSheet.getRange(4, 36, totalRows, 1).setNumberFormat(percentFormatWithDash);

  // Kẻ đường nhẹ phân chia phòng kinh doanh (ngang)
  kpiSheet.getRange(4, 1, totalRows, lc).setBorder(true, false, true, false, false, true, '#E2E8F0', SpreadsheetApp.BorderStyle.SOLID);
  kpiSheet.getRange(4, 1, 1, lc).setBorder(true, false, true, false, false, false, '#94A3B8', SpreadsheetApp.BorderStyle.SOLID);
  kpiSheet.getRange(p1SubRow, 1, 1, lc).setBorder(true, false, true, false, false, false, '#94A3B8', SpreadsheetApp.BorderStyle.SOLID);
  kpiSheet.getRange(p2StartRow - 1, 1, 1, lc).setBorder(true, false, true, false, false, false, '#94A3B8', SpreadsheetApp.BorderStyle.SOLID);
  kpiSheet.getRange(p2SubRow, 1, 1, lc).setBorder(true, false, true, false, false, false, '#94A3B8', SpreadsheetApp.BorderStyle.SOLID);
  kpiSheet.getRange(p3StartRow - 1, 1, 1, lc).setBorder(true, false, true, false, false, false, '#94A3B8', SpreadsheetApp.BorderStyle.SOLID);
  kpiSheet.getRange(p3SubRow, 1, 1, lc).setBorder(true, false, true, false, false, false, '#94A3B8', SpreadsheetApp.BorderStyle.SOLID);
  kpiSheet.getRange(grandTotalRow, 1, 1, lc).setBorder(true, false, true, false, false, false, '#0F172A', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  // Kẻ cột phân cách giữa các nhóm dữ liệu (dọc: B|C, D|E, S|T, AG|AH)
  var dividerCols = [2, 4, 19, 33];
  for (var d = 0; d < dividerCols.length; d++) {
    var dc = dividerCols[d];
    kpiSheet.getRange(4, dc, totalRows, 1).setBorder(null, null, null, true, null, null, '#475569', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    kpiSheet.getRange(4, dc + 1, totalRows, 1).setBorder(null, true, null, null, null, null, '#475569', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  }

  sheetSetRowHeightsForMonth(kpiSheet, p1StartRow, p1EndRow, p2StartRow, p2EndRow, p3StartRow, p3EndRow, p1SubRow, p2SubRow, p3SubRow, grandTotalRow);
  applyCompactColumnWidths(kpiSheet);

  return { success: true, mode: 'FORMULA_MONTH' };
}

function sheetSetRowHeightsForMonth(sheet, p1S, p1E, p2S, p2E, p3S, p3E, sub1, sub2, sub3, grand) {
  sheet.setRowHeight(4, 20);
  for (var r = p1S; r <= p1E; r++) sheet.setRowHeight(r, 22);
  sheet.setRowHeight(sub1, 19);

  sheet.setRowHeight(sub1 + 1, 20);
  for (var r = p2S; r <= p2E; r++) sheet.setRowHeight(r, 22);
  sheet.setRowHeight(sub2, 19);

  sheet.setRowHeight(sub2 + 1, 20);
  for (var r = p3S; r <= p3E; r++) sheet.setRowHeight(r, 22);
  sheet.setRowHeight(sub3, 19);

  sheet.setRowHeight(grand, 22);
}

/**
 * GIAO DIỆN XEM THEO 1 TVBH CỤ THỂ: HIỂN THỊ TẤT CẢ CÁC THÁNG LỊCH SỬ CỦA TVBH ĐÓ
 */
function renderKpiReportForTvbh(targetTvbh, ss) {
  if (!ss) {
    try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch(e) {}
  }
  if (!ss) {
    ss = SpreadsheetApp.openById("1GMAX4_0Xubwz4ByRN9eDIokZntLO98NlmzeURkYBc8M");
  }

  var kpiSheet = ss.getSheetByName("BÁO CÁO KPI");
  var thSheet = ss.getSheetByName("TONG_HOP_KPI");
  if (!kpiSheet || !thSheet) return { success: false, message: "Sheet not found" };

  if (!targetTvbh || targetTvbh.indexOf("Tất cả") !== -1) {
    return renderKpiReportForMonth(null, ss);
  }

  var lc = 36;
  var numFormatWithDash = '#,##0;-#,##0;""';
  var percentFormatWithDash = '0.0%;-0.0%;"-"';

  var lastRowTh = thSheet.getLastRow();
  if (lastRowTh < 2) return { success: false, message: "TONG_HOP_KPI empty" };

  var thData = thSheet.getRange(2, 1, lastRowTh - 1, 37).getValues();
  var matchedRows = [];
  var cleanTarget = targetTvbh.trim().toLowerCase();

  for (var i = 0; i < thData.length; i++) {
    var m = String(thData[i][0]).trim();
    var stt = thData[i][1];
    var tvbhName = String(thData[i][2]).trim();

    if (!m || !tvbhName) continue;
    if (String(stt).toUpperCase().indexOf("TỔNG") !== -1 || String(stt).toUpperCase().indexOf("TỔNG") !== -1) continue;

    if (tvbhName.toLowerCase() === cleanTarget) {
      var row = [matchedRows.length + 1, m].concat(thData[i].slice(3, 37));
      matchedRows.push(row);
    }
  }

  if (matchedRows.length === 0) {
    return { success: false, message: "Không tìm thấy dữ liệu cho " + targetTvbh };
  }

  var curRow = 4;
  var bannerRow = curRow; curRow++;
  var startDataRow = curRow; curRow += matchedRows.length;
  var endDataRow = curRow - 1;
  var grandTotalRow = curRow;
  var totalRows = grandTotalRow - 3;

  var vals = [], bgs = [], colors = [], weights = [], aligns = [];
  function createBlankRow() {
    var rV = [], rB = [], rC = [], rW = [], rA = [];
    for (var c = 0; c < lc; c++) {
      rV.push(''); rB.push('#FFFFFF'); rC.push('#0F172A'); rW.push('normal'); rA.push(c === 1 ? 'left' : 'center');
    }
    return { v: rV, b: rB, c: rC, w: rW, a: rA };
  }

  var rB = createBlankRow();
  rB.v[0] = '👤'; rB.v[1] = 'KẾT QUẢ KPI QUA TẤT CẢ CÁC KỲ  ·  TVBH: ' + targetTvbh.toUpperCase();
  for (var c = 0; c < lc; c++) { rB.b[c] = '#1E293B'; rB.c[c] = '#F8FAFC'; rB.w[c] = 'bold'; }
  vals.push(rB.v); bgs.push(rB.b); colors.push(rB.c); weights.push(rB.w); aligns.push(rB.a);

  for (var idx = 0; idx < matchedRows.length; idx++) {
    var rData = createBlankRow();
    var rowBg = (idx % 2 === 0) ? '#FFFFFF' : '#F8FAFC';
    for (var c = 0; c < lc; c++) {
      var rawV = matchedRows[idx][c];
      if (c >= 2 && c <= 34) {
        var numV = Number(rawV);
        rData.v[c] = isNaN(numV) ? rawV : numV;
      } else if (c === 35) {
        var pRowNum = startDataRow + idx;
        rData.v[c] = '=IFERROR(AI' + pRowNum + '/D' + pRowNum + '; 0)';
      } else {
        rData.v[c] = rawV;
      }
      rData.b[c] = rowBg;
    }
    vals.push(rData.v); bgs.push(rData.b); colors.push(rData.c); weights.push(rData.w); aligns.push(rData.a);
  }

  var rG = createBlankRow();
  rG.v[0] = '🏆'; rG.v[1] = 'TỔNG CỘNG (' + matchedRows.length + ' KỲ BÁO CÁO)';
  for (var c = 0; c < lc; c++) {
    rG.b[c] = '#0F172A'; rG.c[c] = '#F8FAFC'; rG.w[c] = 'bold';
    if (c >= 2 && c <= 34) {
      var letCol = colIndexToLetter(c + 1);
      rG.v[c] = '=SUM(' + letCol + startDataRow + ':' + letCol + endDataRow + ')';
    } else if (c === 35) {
      rG.v[c] = '=IFERROR(AI' + grandTotalRow + '/D' + grandTotalRow + '; 0)';
    }
  }
  vals.push(rG.v); bgs.push(rG.b); colors.push(rG.c); weights.push(rG.w); aligns.push(rG.a);

  var curMaxRows = kpiSheet.getMaxRows();
  if (curMaxRows < grandTotalRow) {
    kpiSheet.insertRowsAfter(curMaxRows, grandTotalRow - curMaxRows);
  } else if (curMaxRows > grandTotalRow) {
    kpiSheet.getRange(grandTotalRow + 1, 1, curMaxRows - grandTotalRow, lc).clearContent().setBackground(null);
  }

  var targetRange = kpiSheet.getRange(4, 1, totalRows, lc);
  targetRange.setValues(vals);
  targetRange.setBackgrounds(bgs);
  targetRange.setFontColors(colors);
  targetRange.setFontWeights(weights);
  targetRange.setHorizontalAlignments(aligns);
  targetRange.setFontSize(8.5);

  kpiSheet.getRange(4, 3, totalRows, 33).setNumberFormat(numFormatWithDash);
  kpiSheet.getRange(4, 36, totalRows, 1).setNumberFormat(percentFormatWithDash);

  kpiSheet.setRowHeight(bannerRow, 22);
  for (var r = startDataRow; r <= endDataRow; r++) kpiSheet.setRowHeight(r, 18);
  kpiSheet.setRowHeight(grandTotalRow, 22);

  applyCompactColumnWidths(kpiSheet);

  return { success: true, mode: 'TVBH', tvbh: targetTvbh, periods: matchedRows.length };
}



// onOpen đã được hợp nhất trong thuchi.js

/**
 * CHỨC NĂNG TỰ ĐỘNG CHỐT SỐ LIỆU CUỐI THÁNG & MỞ KỲ MỚI 1-CLICK
 */
function chotSoLieuVaMoKyKpiMoi() {
  var ui;
  try { ui = SpreadsheetApp.getUi(); } catch(e) {}

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) ss = SpreadsheetApp.openById("1GMAX4_0Xubwz4ByRN9eDIokZntLO98NlmzeURkYBc8M");

  // Kiểm tra quyền hạn chủ sở hữu
  var email = (Session.getActiveUser().getEmail() || '').toLowerCase().trim();
  var owner = ss.getOwner();
  var ownerEmail = owner ? owner.getEmail().toLowerCase().trim() : 'showroomthuanan@gmail.com';
  var adminEmails = [ownerEmail, 'showroomthuanan@gmail.com', 'ptnhan190697@gmail.com'];
  if (email && adminEmails.indexOf(email) === -1) {
    if (ui) ui.alert("BẠN KHÔNG CÓ QUYỀN!", "Chức năng này chỉ dành riêng cho Chủ sở hữu bảng tính.", ui.ButtonSet.OK);
    return;
  }

  var thSheet = ss.getSheetByName("TONG_HOP_KPI");
  var kpiSheet = ss.getSheetByName("BÁO CÁO KPI");
  if (!thSheet) {
    if (ui) ui.alert("Không tìm thấy sheet TONG_HOP_KPI!");
    return;
  }

  // 1. Xác định kỳ hiện tại đang chạy ở dòng 2 của TONG_HOP_KPI
  var curMonthRaw = String(thSheet.getRange("A2").getValue()).trim();
  if (!curMonthRaw || curMonthRaw.indexOf("Hiện tại") === -1) {
    if (ui) ui.alert("Không tìm thấy kỳ hiện tại (cần có chữ 'Hiện tại' tại dòng 2 của TONG_HOP_KPI)!");
    return;
  }

  var match = curMonthRaw.match(/Tháng\s+(\d+)\/(\d+)/i);
  if (!match) {
    if (ui) ui.alert("Định dạng tên tháng không hợp lệ: " + curMonthRaw);
    return;
  }

  var curM = parseInt(match[1], 10);
  var curY = parseInt(match[2], 10);

  var nextM = curM + 1;
  var nextY = curY;
  if (nextM > 12) {
    nextM = 1;
    nextY = curY + 1;
  }

  var strCurClosed = "Tháng " + (curM < 10 ? "0" + curM : curM) + "/" + curY;
  var strNextCurrent = "Tháng " + (nextM < 10 ? "0" + nextM : nextM) + "/" + nextY + " (Hiện tại)";

  // Hộp thoại xác nhận an toàn trước khi chốt
  if (ui) {
    var confirm = ui.alert(
      "XÁC NHẬN CHỐT SỐ LIỆU KPI",
      "Bạn có chắc chắn muốn:\n\n" +
      "1. ĐÓNG BĂNG toàn bộ kết quả của: " + strCurClosed + " vào lịch sử?\n" +
      "2. MỞ KỲ MỚI: " + strNextCurrent + " để theo dõi realtime?\n\n" +
      "Hệ thống sẽ tự động sao chép công thức và cập nhật bộ lọc trong 1 giây.",
      ui.ButtonSet.YES_NO
    );
    if (confirm !== ui.Button.YES) return;
  }

  // 2. Tìm khối dòng thuộc kỳ hiện tại
  var lr = thSheet.getLastRow();
  var numRows = 0;
  var allData = thSheet.getRange(2, 1, Math.min(50, lr - 1), 1).getValues();
  for (var i = 0; i < allData.length; i++) {
    if (String(allData[i][0]).trim() === curMonthRaw) {
      numRows++;
    }
  }

  if (numRows === 0) numRows = 27; // Mặc định 26 TVBH + 1 dòng Tổng

  // 3. ĐÓNG BĂNG DỮ LIỆU THÁNG HIỆN TẠI (Lưu thành giá trị tĩnh vĩnh viễn)
  var lc = thSheet.getLastColumn();
  var freezeRange = thSheet.getRange(2, 4, numRows, lc - 3);
  var frozenValues = freezeRange.getValues();
  freezeRange.setValues(frozenValues);

  var closedNames = [];
  for (var r = 0; r < numRows; r++) closedNames.push([strCurClosed]);
  thSheet.getRange(2, 1, numRows, 1).setValues(closedNames);

  // 4. CHÈN KHỐI DÒNG MỚI LÊN ĐẦU CHO KỲ TIẾP THEO
  thSheet.insertRowsBefore(2, numRows);

  var newMonthCol = [];
  var sttAndNames = [];
  for (var r = 0; r < numRows; r++) {
    newMonthCol.push([strNextCurrent]);
    var oldRowIdx = 2 + numRows + r;
    sttAndNames.push([
      thSheet.getRange(oldRowIdx, 2).getValue(),
      thSheet.getRange(oldRowIdx, 3).getValue()
    ]);
  }
  thSheet.getRange(2, 1, numRows, 1).setValues(newMonthCol);
  thSheet.getRange(2, 2, numRows, 2).setValues(sttAndNames);

  // Gắn lại công thức sống cho kỳ mới
  for (var r = 0; r < numRows - 1; r++) {
    var curRowNum = 2 + r;
    thSheet.getRange(curRowNum, 4).setFormula("=IFERROR(VLOOKUP(C" + curRowNum + "; 'CÀI ĐẶT KPI & NHÂN SỰ'!$B$4:$E$100; 3; FALSE); \"\")");
    thSheet.getRange(curRowNum, 5).setFormula("=IFERROR(VLOOKUP(C" + curRowNum + "; 'CÀI ĐẶT KPI & NHÂN SỰ'!$B$4:$E$100; 4; FALSE); \"\")");

    var carNames = ['VF 2', 'VF 3', 'VF 5', 'VF 6', 'VF 7', 'VF 8', 'VF 8 New', 'VF 9', 'Limo', 'Minio', 'Herio', 'Nerio', 'EC Van', 'MPV 7', 'Wild'];
    var fCoc = [];
    for (var c = 0; c < carNames.length; c++) {
      fCoc.push('=COUNTIFS(Bank!$D:$D; "' + carNames[c] + '"; Bank!$F:$F; $C' + curRowNum + ')');
    }
    thSheet.getRange(curRowNum, 6, 1, carNames.length).setFormulas([fCoc]);

    thSheet.getRange(curRowNum, 35).setFormula("=SUM(F" + curRowNum + ":T" + curRowNum + ")");
    thSheet.getRange(curRowNum, 36).setFormula("=SUM(U" + curRowNum + ":AH" + curRowNum + ")");
    thSheet.getRange(curRowNum, 37).setFormula("=IFERROR(AJ" + curRowNum + "/E" + curRowNum + "; 0)");
  }

  // Dòng Tổng của kỳ mới
  var sumRow = 1 + numRows;
  for (var c = 4; c <= lc; c++) {
    var colL = colIndexToLetter(c);
    if (c <= 36) {
      thSheet.getRange(sumRow, c).setFormula("=SUM(" + colL + "2:" + colL + (sumRow - 1) + ")");
    } else if (c === 37) {
      thSheet.getRange(sumRow, c).setFormula("=IFERROR(AJ" + sumRow + "/E" + sumRow + "; 0)");
    }
  }

  try {
    thSheet.getRange(2, 21).setFormula('=IMPORTRANGE("https://docs.google.com/spreadsheets/d/1CzYUfDAcwt4D64UIZIUC77lZ2lOYQ257xlmVXy2nZG0/edit"; "KPI!C3:P28")');
  } catch(eImp) {}

  // 5. CẬP NHẬT DROPDOWN VÀ BẢN GHI TRÊN SHEET BÁO CÁO KPI
  if (kpiSheet) {
    var monthsList = [strNextCurrent, strCurClosed];
    var restData = thSheet.getRange(2 + numRows, 1, Math.min(200, thSheet.getLastRow() - numRows), 1).getValues();
    var setM = {};
    setM[strNextCurrent] = true; setM[strCurClosed] = true;
    for (var i = 0; i < restData.length; i++) {
      var m = String(restData[i][0]).trim();
      if (m && !setM[m]) { setM[m] = true; monthsList.push(m); }
    }
    var ruleMonth = SpreadsheetApp.newDataValidation().requireValueInList(monthsList, true).build();
    kpiSheet.getRange("A1").setDataValidation(ruleMonth);
    kpiSheet.getRange("A1").setValue(strNextCurrent);
    kpiSheet.getRange("C1").setValue("Tất cả TVBH");
  }

  if (ui) {
    ui.alert(
      "CHỐT SỐ LIỆU THÀNH CÔNG!",
      "✅ Đã đóng băng số liệu kỳ: " + strCurClosed + "\n" +
      "✅ Đã mở kỳ mới: " + strNextCurrent + "\n" +
      "Bảng BÁO CÁO KPI đã tự động chuyển sang kỳ mới!",
      ui.ButtonSet.OK
    );
  }
}
