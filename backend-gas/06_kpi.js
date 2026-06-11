/**
 * 06_kpi.js - Báo cáo KPI xuất hóa đơn theo dòng xe và TVBH
 */

function generateKpiSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("KPI");
  if (!sheet) {
    sheet = ss.insertSheet("KPI");
  }
  sheet.clear();
  sheet.clearFormats();
  sheet.getCharts().forEach(chart => sheet.removeChart(chart));

  // --- Cấu hình ---
  const DONG_XE_LIST = ['VF 3', 'VF 5', 'VF 6', 'VF 7', 'VF 8', 'VF 9', 'Herio', 'Nerio', 'Limo', 'EC Van', 'Minio', 'VF Limo'];
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
    ss.toast("Lỗi khi tải dữ liệu từ Supabase", "Lỗi KPI", 10);
    return;
  }

  const rawData = JSON.parse(response.getContentText());
  
  // Danh sách TVBH cố định theo thứ tự ảnh
  const tvbhList = [
    "Tất Bách Tường", "Nguyễn Trần Hoàng Thanh", "Phạm Trọng Huy", "Tống Thành Đạt",
    "Huỳnh Diệp Thanh Trâm", "Phan Văn Cường", "Lê Thị Hương Trà", "Hà Hữu Huy",
    "Nguyễn Dư Thuận", "Nguyễn Văn Nghĩa", "Đinh Trọng Nhân", "Đào Minh Ký",
    "Nguyễn Thanh Cả", "Nguyễn Thiện Thảo", "Thành Ngọc Vinh", "Trần Danh Phương",
    "Nguyễn Hoàng Phúc", "Nguyễn Anh Tiến", "Phạm Thị Thúy Nga", "Võ Thế Lân",
    "Nguyễn Thị Yến Vy", "Nguyễn Hoàng Khang Huy", "Phạm Khánh Duy"
  ];

  // --- Chuẩn bị dữ liệu để ghi ---
  const rows = [];
  const header1 = ["STT", "TVBH", "SỐ LƯỢNG XHĐ", "", "", "", "", "", "", "", "", "", "", "", "Tổng XHĐ"];
  const header2 = ["", "", "VF 3", "VF 5", "VF 6", "VF 7", "VF 8", "VF 9", "Herio", "Nerio", "Limo", "EC Van", "Minio", "VF Limo", ""];
  
  rows.push(header1);
  rows.push(header2);

  const startRow = 3; // Dòng bắt đầu dữ liệu TVBH
  tvbhList.forEach((name, index) => {
    const currentRow = startRow + index;
    const row = [index + 1, name];
    
    // Cột C đến N (Các dòng xe)
    for (let i = 0; i < DONG_XE_LIST.length; i++) {
        // Cột tương ứng trong Excel (C, D, E...)
        const colLetter = String.fromCharCode(67 + i); 
        // Công thức: Đếm nếu TVBH khớp và Dòng xe khớp (bỏ qua điều kiện ngày xuất hóa đơn)
        // yeucauxhd!$H:$H là cột TVBH, yeucauxhd!$D:$D là cột Dòng xe
        const formula = `=COUNTIFS(yeucauxhd!$H:$H;$B${currentRow};yeucauxhd!$D:$D;${colLetter}$2)`;
        row.push(formula);
    }
    
    // Tổng dòng (Cột O)
    row.push(`=SUM(C${currentRow}:N${currentRow})`);
    rows.push(row);
  });

  // Dòng TỔNG cuối cùng
  const totalRowIndex = startRow + tvbhList.length;
  const totalRow = ["", "TỔNG"];
  
  // Tổng các cột xe
  for (let i = 0; i < DONG_XE_LIST.length; i++) {
      const colLetter = String.fromCharCode(67 + i);
      totalRow.push(`=SUM(${colLetter}${startRow}:${colLetter}${totalRowIndex - 1})`);
  }
  // Tổng của tổng
  totalRow.push(`=SUM(O${startRow}:O${totalRowIndex - 1})`);
  rows.push(totalRow);

  // --- Ghi dữ liệu và định dạng ---
  const numRows = rows.length;
  const numCols = header1.length;
  
  // Xóa dữ liệu cũ trước khi ghi công thức
  sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).clearContent();
  
  // Ghi dữ liệu (setValues tự động nhận diện công thức bắt đầu bằng dấu '=')
  sheet.getRange(1, 1, numRows, numCols).setValues(rows);

  // --- Định dạng (Giữ nguyên phần định dạng cũ) ---
  // ... (Phần code định dạng bên dưới vẫn giữ nguyên)

  // Merge Headers
  sheet.getRange("A1:A2").merge().setVerticalAlignment("middle").setHorizontalAlignment("center");
  sheet.getRange("B1:B2").merge().setVerticalAlignment("middle").setHorizontalAlignment("center");
  sheet.getRange("C1:N1").merge().setVerticalAlignment("middle").setHorizontalAlignment("center");
  sheet.getRange("O1:O2").merge().setVerticalAlignment("middle").setHorizontalAlignment("center");

  // Style Headers (Dòng 1 & 2)
  const headerRange = sheet.getRange(1, 1, 2, numCols);
  headerRange.setBackground(HEADER_COLOR)
             .setFontColor(TEXT_COLOR)
             .setFontWeight("bold")
             .setHorizontalAlignment("center")
             .setVerticalAlignment("middle")
             .setBorder(true, true, true, true, true, true, BORDER_COLOR, SpreadsheetApp.BorderStyle.SOLID);
  
  sheet.getRange("C2:N2").setFontSize(9); // Cho các dòng xe nhỏ lại chút

  // Style Dòng TỔNG (Dòng cuối)
  const lastRowRange = sheet.getRange(numRows, 1, 1, numCols);
  lastRowRange.setBackground(HEADER_COLOR)
              .setFontColor(TEXT_COLOR)
              .setFontWeight("bold")
              .setHorizontalAlignment("center")
              .setBorder(true, true, true, true, true, true, BORDER_COLOR, SpreadsheetApp.BorderStyle.SOLID);
  
  // Merge TỔNG cell
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
  for (let c = 3; c <= 14; c++) {
    sheet.setColumnWidth(c, 55); // Các cột xe
  }
  sheet.setColumnWidth(15, 80); // Tổng

  // Phông chữ
  sheet.getRange(1, 1, numRows, numCols).setFontFamily("Roboto");

  sheet.setFrozenRows(2);
  sheet.setFrozenColumns(2);

  // Thông báo
  ss.toast("Đã cập nhật KPI Xuất Hóa Đơn!", "Thành công", 5);
}
