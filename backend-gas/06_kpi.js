/**
 * 06_kpi.js - Báo cáo KPI xuất hóa đơn theo dòng xe và TVBH
 */

function generateKpiSheet() {
  let ss;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {}
  if (!ss) {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  }

  let sheet = ss.getSheetByName("KPI");
  if (!sheet) {
    sheet = ss.insertSheet("KPI");
  }
  sheet.clear();
  sheet.clearFormats();
  sheet.getCharts().forEach(chart => sheet.removeChart(chart));

  // --- Cấu hình ---
  const DONG_XE_LIST = ['VF 2', 'VF 3', 'VF 5', 'VF 6', 'VF 7', 'VF 8', 'VF 9', 'Herio', 'Nerio', 'Limo', 'EC Van', 'Minio', 'VF Limo'];
  const BG_COLOR = "#1e293b"; // Slate 800 - Gần với màu trong ảnh
  const HEADER_COLOR = "#052061"; // Dark Blue từ ảnh
  const TEXT_COLOR = "#ffffff";
  const BORDER_COLOR = "#94a3b8";

  // --- Lấy dữ liệu từ Supabase (yeucauxhd) ---
  const url = SUPABASE_URL + "/rest/v1/yeucauxhd?select=tvbh,dong_xe,ngay_xuat_hoa_don&ngay_xuat_hoa_don=not.is.null";
  const response = UrlFetchApp.fetch(url, {
    method: "get",
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": "Bearer " + SUPABASE_SERVICE_KEY
    },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    try { ss.toast("Lỗi khi tải dữ liệu từ Supabase", "Lỗi KPI", 10); } catch (e) {}
    return;
  }

  const rawData = JSON.parse(response.getContentText());
  
  // Danh sách TVBH cố định theo thứ tự 3 Phòng Kinh Doanh (đã loại bỏ 2 nhân sự khoanh đỏ)
  const tvbhList = [
    "Tất Bách Tường",
    "Phạm Trọng Huy",
    "Nguyễn Trần Hoàng Thanh",
    "Tống Thành Đạt",
    "Huỳnh Diệp Thanh Trâm",
    "Phan Văn Cường",
    "Lê Thị Hương Trà",
    "Hà Hữu Huy",
    "Nguyễn Văn Nghĩa",
    "Nguyễn Bá Dũng",
    "Đinh Trọng Nhân",
    "Thành Ngọc Vinh",
    "Nguyễn Thiện Thảo",
    "Nguyễn Anh Tiến",
    "Võ Thế Lân",
    "Phạm Thị Thúy Nga",
    "Nguyễn Thị Yến Vy",
    "Nguyễn Hoàng Khang Huy",
    "Nguyễn Thanh Cả",
    "Trần Danh Phương",
    "Nguyễn Hoàng Phúc",
    "Phạm Khánh Duy",
    "Nguyễn Dư Thuận",
    "Đào Minh Ký",
    "Lê Thị Huyền Trang",
    "Lê Thị Thúy Nga"
  ];

  // Helper chuyển đổi chỉ số cột sang chữ cái (1 -> A, 2 -> B, 3 -> C...)
  function colIndexToLetter(colIndex) {
    let temp = '';
    let letter = '';
    while (colIndex > 0) {
      temp = (colIndex - 1) % 26;
      letter = String.fromCharCode(temp + 65) + letter;
      colIndex = Math.floor((colIndex - temp - 1) / 26);
    }
    return letter;
  }

  // --- Chuẩn bị dữ liệu để ghi ---
  const rows = [];
  const header1 = ["STT", "TVBH", "SỐ LƯỢNG XHĐ"];
  for (let i = 1; i < DONG_XE_LIST.length; i++) {
    header1.push("");
  }
  header1.push("Tổng XHĐ");

  const header2 = ["", "", ...DONG_XE_LIST, ""];
  
  rows.push(header1);
  rows.push(header2);

  const startRow = 3; // Dòng bắt đầu dữ liệu TVBH
  const firstCarColLetter = colIndexToLetter(3);
  const lastCarColLetter = colIndexToLetter(2 + DONG_XE_LIST.length);
  const totalColLetter = colIndexToLetter(3 + DONG_XE_LIST.length);

  tvbhList.forEach((name, index) => {
    const currentRow = startRow + index;
    const row = [index + 1, name];
    
    // Cột C đến O (Các dòng xe)
    for (let i = 0; i < DONG_XE_LIST.length; i++) {
        const colLetter = colIndexToLetter(3 + i); 
        // Công thức: Đếm nếu TVBH khớp và Dòng xe khớp
        // yeucauxhd!$H:$H là cột TVBH, yeucauxhd!$D:$D là cột Dòng xe
        const formula = `=COUNTIFS(yeucauxhd!$H:$H;$B${currentRow};yeucauxhd!$D:$D;${colLetter}$2)`;
        row.push(formula);
    }
    
    // Tổng dòng (Cột Tổng XHĐ)
    row.push(`=SUM(${firstCarColLetter}${currentRow}:${lastCarColLetter}${currentRow})`);
    rows.push(row);
  });

  // Dòng TỔNG cuối cùng
  const totalRowIndex = startRow + tvbhList.length;
  const totalRow = ["", "TỔNG"];
  
  // Tổng các cột xe
  for (let i = 0; i < DONG_XE_LIST.length; i++) {
      const colLetter = colIndexToLetter(3 + i);
      totalRow.push(`=SUM(${colLetter}${startRow}:${colLetter}${totalRowIndex - 1})`);
  }
  // Tổng của tổng
  totalRow.push(`=SUM(${totalColLetter}${startRow}:${totalColLetter}${totalRowIndex - 1})`);
  rows.push(totalRow);

  // --- Ghi dữ liệu và định dạng ---
  const numRows = rows.length;
  const numCols = header1.length;
  
  // Xóa dữ liệu cũ trước khi ghi công thức
  sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).clearContent();
  
  // Ghi dữ liệu (setValues tự động nhận diện công thức bắt đầu bằng dấu '=')
  sheet.getRange(1, 1, numRows, numCols).setValues(rows);

  // Merge Headers
  sheet.getRange("A1:A2").merge().setVerticalAlignment("middle").setHorizontalAlignment("center");
  sheet.getRange("B1:B2").merge().setVerticalAlignment("middle").setHorizontalAlignment("center");
  sheet.getRange(`${firstCarColLetter}1:${lastCarColLetter}1`).merge().setVerticalAlignment("middle").setHorizontalAlignment("center");
  sheet.getRange(`${totalColLetter}1:${totalColLetter}2`).merge().setVerticalAlignment("middle").setHorizontalAlignment("center");

  // Style Headers (Dòng 1 & 2)
  const headerRange = sheet.getRange(1, 1, 2, numCols);
  headerRange.setBackground(HEADER_COLOR)
             .setFontColor(TEXT_COLOR)
             .setFontWeight("bold")
             .setHorizontalAlignment("center")
             .setVerticalAlignment("middle")
             .setBorder(true, true, true, true, true, true, BORDER_COLOR, SpreadsheetApp.BorderStyle.SOLID);
  
  sheet.getRange(`${firstCarColLetter}2:${lastCarColLetter}2`).setFontSize(9); // Cho các dòng xe nhỏ lại chút

  // Style Dòng TỔNG (Dòng cuối)
  const lastRowRange = sheet.getRange(numRows, 1, 1, numCols);
  lastRowRange.setBackground(HEADER_COLOR)
              .setFontColor(TEXT_COLOR)
              .setFontWeight("bold")
              .setHorizontalAlignment("center")
              .setBorder(true, true, true, true, true, true, BORDER_COLOR, SpreadsheetApp.BorderStyle.SOLID);
  
  // Merge TỔNG cell (cột 1 & 2)
  sheet.getRange(numRows, 1, 1, 2).merge();

  // Style Data rows
  if (numRows > 3) {
    const dataRange = sheet.getRange(3, 1, numRows - 3, numCols);
    dataRange.setBorder(true, true, true, true, true, true, BORDER_COLOR, SpreadsheetApp.BorderStyle.SOLID_THIN)
             .setVerticalAlignment("middle");
    
    // Căn giữa cột STT và các cột số lượng
    sheet.getRange(3, 1, numRows - 3, 1).setHorizontalAlignment("center");
    sheet.getRange(3, 3, numRows - 3, numCols - 2).setHorizontalAlignment("center");
    
    // Zebra striping
    for (let r = 3; r < numRows; r++) {
      if (r % 2 === 0) {
        sheet.getRange(r, 1, 1, numCols).setBackground("#f8fafc");
      }
    }
  }

  // Cột TVBH in đậm
  sheet.getRange(3, 2, numRows - 3, 1).setFontWeight("bold");

  // Điều chỉnh độ rộng cột
  sheet.setColumnWidth(1, 40); // STT
  sheet.setColumnWidth(2, 200); // TVBH
  for (let c = 3; c <= 2 + DONG_XE_LIST.length; c++) {
    sheet.setColumnWidth(c, 55); // Các cột xe
  }
  sheet.setColumnWidth(3 + DONG_XE_LIST.length, 80); // Tổng

  // Phông chữ
  sheet.getRange(1, 1, numRows, numCols).setFontFamily("Roboto");

  sheet.setFrozenRows(2);
  sheet.setFrozenColumns(2);

  // Thông báo
  try {
    ss.toast("Đã cập nhật KPI Xuất Hóa Đơn!", "Thành công", 5);
  } catch (e) {}
}
