function setupAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // const ui = SpreadsheetApp.getUi(); // REMOVE: Cannot call getUi in some contexts
  let createdCount = 0;
  let existingCount = 0;

  // Danh sách tất cả các sheet cần thiết từ các hàm khác nhau
  const requiredSheets = [
    // Từ setupSheets()
    {
      name: USER_SHEET_NAME,
      headers: ['Username', 'PasswordHash', 'FullName', 'Role', 'Email', 'OTP', 'OTPExpiry']
    },
    {
      name: TEAM_SHEET_NAME,
      headers: ['Leader', 'Members']
    },
    // Từ setupTestDriveSheet()
    {
      name: TEST_DRIVE_SHEET_NAME,
      headers: [
        'soPhieu', 'ngayThuXe', 'loaiXe', 'thoiGianKhoiHanh', 'thoiGianTroVe', 'loTrinh',
        'tenKhachHang', 'dienThoai', 'email', 'diaChi', 'tuLai', 'dacDiem',
        'gplxSo', 'hieuLucGPLX', 'ngayCamKet', 'tenTuVan',
        'odoBefore', 'imagesBefore', 'odoAfter', 'imagesAfter'
      ]
    },
    { // <-- THÊM KHỐI MỚI NÀY
      name: CHINH_SACH_SHEET_NAME,
      headers: SHEET_HEADERS["Chinhsach"]
    },
    {
      name: CHAT_SHEET_NAME,
      headers: SHEET_HEADERS["ChatHistory"]
    }
  ];

  // Thêm tất cả các sheet từ SHEET_HEADERS (logic của setupInitialSheet)
  for (const sheetName in SHEET_HEADERS) {
    if (Object.hasOwnProperty.call(SHEET_HEADERS, sheetName)) {
      // Kiểm tra để không thêm trùng lặp nếu đã có trong requiredSheets
      if (!requiredSheets.some(s => s.name === sheetName)) {
        requiredSheets.push({
          name: sheetName,
          headers: SHEET_HEADERS[sheetName]
        });
      }
    }
  }


  // Vòng lặp để tạo hoặc xác nhận tất cả các sheet
  requiredSheets.forEach(sheetInfo => {
    if (!sheetInfo.name || !Array.isArray(sheetInfo.headers)) return; // Bỏ qua nếu cấu hình không hợp lệ

    const existingSheet = ss.getSheetByName(sheetInfo.name);
    if (!existingSheet) {
      // Sử dụng lại hàm getOrCreateSheet để tạo và định dạng sheet mới
      getOrCreateSheet(ss, sheetInfo.name, sheetInfo.headers);
      Logger.log(`Đã tạo trang tính: ${sheetInfo.name}`);
      createdCount++;
    } else {
      // SHEET ĐÃ TỒN TẠI -> KIỂM TRA VÀ CẬP NHẬT HEADER NẾU THIẾU
      updateSheetHeaders(existingSheet, sheetInfo.headers);
      Logger.log(`Trang tính "${sheetInfo.name}" đã tồn tại và được kiểm tra cập nhật.`);
      existingCount++;
    }
  });

  // Hiển thị thông báo tổng kết bằng Logger thay vì UI Alert để tránh lỗi context
  Logger.log('Hoàn Tất Thiết Lập Toàn Bộ!');
  Logger.log(`Đã tạo ${createdCount} trang tính mới.`);
  Logger.log(`${existingCount} trang tính đã tồn tại từ trước.`);
  Logger.log("Bây giờ bạn có thể chạy hàm 'setupInitialAdminUser' để tạo tài khoản quản trị ban đầu.");
}

/**
 * Hàm hỗ trợ: Cập nhật header cho sheet đã tồn tại.
 * Chỉ thêm các cột mới chưa có, KHÔNG xóa cột cũ để bảo toàn dữ liệu.
 */
function updateSheetHeaders(sheet, expectedHeaders) {
  if (!sheet || !expectedHeaders || expectedHeaders.length === 0) return;

  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    // Sheet trống, set luôn header
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    return;
  }

  const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());

  // Tìm các header còn thiếu
  const missingHeaders = expectedHeaders.filter(h => !currentHeaders.includes(h));

  if (missingHeaders.length > 0) {
    // Thêm các cột thiếu vào sau cột cuối cùng
    const startCol = lastCol + 1;
    sheet.getRange(1, startCol, 1, missingHeaders.length).setValues([missingHeaders]);

    // Copy định dạng header từ cột đầu tiên (nếu có) cho đẹp
    try {
      const headerStyleRange = sheet.getRange(1, 1);
      const newHeaderRange = sheet.getRange(1, startCol, 1, missingHeaders.length);
      headerStyleRange.copyTo(newHeaderRange, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
      Logger.log(`Đã thêm ${missingHeaders.length} cột mới vào sheet "${sheet.getName()}": ${missingHeaders.join(', ')}`);
    } catch (e) {
      Logger.log("Lỗi copy định dạng header: " + e.message);
    }
  }
}
function findOrderInSheet(sheet, orderNumber, columnIndices) {
  const data = sheet.getDataRange().getValues();
  const normalizedOrderNumber = orderNumber.trim().toLowerCase();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const orderColIndex = columnIndices.order;

    if (row[orderColIndex]) {
      const sheetOrderNumber = String(row[orderColIndex]).trim().toLowerCase();
      if (sheetOrderNumber === normalizedOrderNumber) {
        return {
          sheet: sheet,
          orderRowIndex: i + 1,
          customerName: (columnIndices.customerName !== -1) ? row[columnIndices.customerName] : "",
          tvbh: (columnIndices.tvbh !== -1) ? row[columnIndices.tvbh] : "Không xác định",
          vin: (columnIndices.vin !== -1) ? row[columnIndices.vin] : ""
        };
      }
    }
  }
  return null;
}
function getDaGhepData() {
  return fetchAndCacheData('DaGhep_data', 21600, () => {
    // ---- LOGIC ĐÃ ĐƯỢC TỐI ƯU ----
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const daGhepSheet = ss.getSheetByName(DA_GHEP_SHEET_NAME);

    // Chỉ lấy dữ liệu từ sheet "DaGhep" đang hoạt động, không đọc các sheet lưu trữ nữa.
    let activeDaGhepData = getAllSheetData(daGhepSheet);

    return createJsonResponse({ status: "SUCCESS", data: activeDaGhepData });
  });
}
function getYeuCauVcData() {
  // Cache dữ liệu trong 5 phút để giảm tải
  return fetchAndCacheData('YeuCauVC_data', 300, () => {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const yeuCauVcSheet = ss.getSheetByName(YEU_CAU_VC_SHEET_NAME);
    // Dùng hàm này để lấy được URL của file từ công thức HYPERLINK
    const data = getAllSheetDataWithHyperlink(yeuCauVcSheet);
    return createJsonResponse({ status: "SUCCESS", data: data });
  });
}
function getChinhSachData() {
  // Cache dữ liệu trong 1 giờ (3600 giây) để tăng tốc độ
  return fetchAndCacheData('ChinhSach_data', 3600, () => {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const chinhSachSheet = ss.getSheetByName(CHINH_SACH_SHEET_NAME);
    if (!chinhSachSheet || chinhSachSheet.getLastRow() < 2) {
      return createJsonResponse({ status: "SUCCESS", data: [] });
    }

    const data = chinhSachSheet.getDataRange().getValues();
    const headers = data[0];
    const tenCol = headers.indexOf("Tên Chính Sách");
    const trangThaiCol = headers.indexOf("Trạng thái");

    if (tenCol === -1 || trangThaiCol === -1) {
      return createJsonResponse({ status: "ERROR", message: "Sheet Chinhsach cấu hình sai." });
    }

    const activePolicies = data.slice(1)
      .filter(row => String(row[trangThaiCol]).trim().toLowerCase() === "hoatdong")
      .map(row => row[tenCol]);

    return createJsonResponse({ status: "SUCCESS", data: activePolicies });
  });
}
function getChuaGhepData() {
  return fetchAndCacheData('ChuaGhep_data', 21600, () => {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const chuaGhepSheet = ss.getSheetByName(CHUA_GHEP_SHEET_NAME);
    const data = getAllSheetData(chuaGhepSheet);
    return createJsonResponse({ status: "SUCCESS", data: data });
  });
}

function getKhoXeData() {
  return fetchAndCacheData('KhoXe_data', 21600, () => {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const stockSheet = ss.getSheetByName(STOCK_SHEET_NAME);
    const khoXeData = getAllSheetData(stockSheet);
    // Bỏ phần xử lý vinToDmsMap vì nó không cần thiết khi gửi về client
    return createJsonResponse({ status: "SUCCESS", khoxe: khoXeData });
  });
}

function getXuathoadonData() {
  return fetchAndCacheData('Xuathoadon_data', 21600, () => {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const xuathoadonSheet = ss.getSheetByName(XUAT_HOA_DON_SHEET_NAME);
      const data = getAllSheetData(xuathoadonSheet);
      return createJsonResponse({ status: "SUCCESS", data: data });
    } catch (e) {
      Logger.log(`Lỗi khi đọc trực tiếp sheet Xuathoadon: ${e.message}`);
      sendErrorAlert('getXuathoadonData_noCache', e);
      return createJsonResponse({ status: "ERROR", message: `Lỗi máy chủ khi lấy dữ liệu hóa đơn: ${e.message}` });
    }
  });
}

function getHuyGhepData() {
  return fetchAndCacheData('HuyGhep_data', 21600, () => {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const cancelledSheet = ss.getSheetByName(CANCELLED_SHEET_NAME);
    const data = getAllSheetData(cancelledSheet);
    return createJsonResponse({ status: "SUCCESS", data: data });
  });
}

function getDangKyChoData() {
  return fetchAndCacheData('DangKyCho_data', 21600, () => {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const dangKyChoSheet = ss.getSheetByName(DANG_KY_CHO_SHEET_NAME);
    const data = getAllSheetData(dangKyChoSheet);
    return createJsonResponse({ status: "SUCCESS", data: data });
  });
}
// ĐẶT HÀM NÀY GẦN CÁC HÀM "get...Data" KHÁC (ví dụ: sau hàm getDangKyChoData)

function getAllSheetDataWithHyperlink(sheet) {
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const formulas = dataRange.getFormulas();
  const headers = values[0].map(header => header.trim());
  const data = [];

  for (let i = 1; i < values.length; i++) {
    const rowObject = {};
    for (let j = 0; j < headers.length; j++) {
      const headerName = headers[j];
      const formula = formulas[i][j];
      // Ưu tiên trích xuất URL từ công thức HYPERLINK
      if (formula && formula.toUpperCase().startsWith("=HYPERLINK")) {
        const urlMatch = formula.match(/=HYPERLINK\("([^"]+)"/i);
        rowObject[headerName] = urlMatch ? urlMatch[1] : values[i][j];
      } else {
        rowObject[headerName] = values[i][j];
      }
    }
    data.push(rowObject);
  }
  return data;
}
function getThongtinxeData() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const thongtinxeSheet = ss.getSheetByName(THONG_TIN_XE_SHEET_NAME);

    if (!thongtinxeSheet) {
      Logger.log("Lỗi: Không tìm thấy sheet Thongtinxe.");
      return null;
    }

    const data = thongtinxeSheet.getDataRange().getValues();
    return data;
  } catch (e) {
    Logger.log(`Lỗi nghiêm trọng khi đọc sheet Thongtinxe: ${e.message}`);
    sendErrorAlert('getThongtinxeData', e);
    return null; // Trả về null khi có lỗi
  }
}

function getAllSheetData(sheet) {
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const formulas = dataRange.getFormulas();
  const headers = values[0].map(header => header.trim());
  const data = [];

  // ▼▼▼ BẮT ĐẦU THAY ĐỔI QUAN TRỌNG ▼▼▼
  // Xác định các cột chứa ngày tháng
  const dateColumns = ["Ngày cọc", "Thời gian nhập", "Thời gian ghép", "Ngày xuất hóa đơn"];
  const dateColumnIndices = {};
  headers.forEach((header, index) => {
    if (dateColumns.includes(header)) {
      dateColumnIndices[index] = true;
    }
  });
  // ▲▲▲ KẾT THÚC THAY ĐỔI QUAN TRỌNG ▲▲▲

  for (let i = 1; i < values.length; i++) {
    const rowObject = {};
    for (let j = 0; j < headers.length; j++) {
      const headerName = headers[j];
      const formula = formulas[i][j];
      let cellValue = values[i][j];

      // ▼▼▼ BẮT ĐẦU THAY ĐỔI QUAN TRỌNG ▼▼▼
      // Nếu đây là cột ngày tháng và giá trị là một đối tượng Date hợp lệ,
      // chuyển nó sang định dạng ISO string mà JavaScript có thể đọc dễ dàng.
      if (dateColumnIndices[j] && cellValue instanceof Date && !isNaN(cellValue)) {
        cellValue = cellValue.toISOString();
      }
      // ▲▲▲ KẾT THÚC THAY ĐỔI QUAN TRỌNG ▲▲▲

      if (formula && formula.toUpperCase().startsWith("=HYPERLINK")) {
        const urlMatch = formula.match(/=HYPERLINK\("([^"]+)"/i);
        if (urlMatch && urlMatch[1]) {
          rowObject[headerName] = urlMatch[1];
        } else {
          rowObject[headerName] = "";
        }
      } else {
        rowObject[headerName] = cellValue;
      }
    }
    data.push(rowObject);
  }
  return data;
}

function formatDateTimeForSheet(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) { // Added instanceof Date check
    return "";
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function getCharCodes(str) {
  return Array.from(str).map(char => char.charCodeAt(0)).join(',');
}

function recordOrderHistory(soDonHang, vin, action, details, rowDataObject = null) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, "lichsu_donhang", SHEET_HEADERS["lichsu_donhang"]);
  const timestamp = new Date();
  const user = Session.getActiveUser() ? Session.getActiveUser().getEmail() : "Hệ thống";
  const jsonData = rowDataObject ? JSON.stringify(rowDataObject) : "";
  appendAndFormatRow(sheet, [timestamp, soDonHang, vin, action, details, user, jsonData]);
}

// Thay thế hàm recordVehicleHistory cũ
function recordVehicleHistory(vin, action, details, rowDataObject = null) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, "lichsu_xe", SHEET_HEADERS["lichsu_xe"]);
  const timestamp = new Date();
  const user = Session.getActiveUser() ? Session.getActiveUser().getEmail() : "Hệ thống";
  const jsonData = rowDataObject ? JSON.stringify(rowDataObject) : "";
  appendAndFormatRow(sheet, [timestamp, vin, action, details, user, jsonData]);
}

function getOrCreateSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);

    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange
      .setValues([headers])
      .setBackground(UI_CONFIG.headerBgColor)
      .setFontColor(UI_CONFIG.headerFontColor)
      .setFontFamily(UI_CONFIG.headerFont)
      .setFontSize(UI_CONFIG.headerFontSize)
      .setFontWeight(UI_CONFIG.headerFontWeight)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setWrap(true);

    headerRange.setBorder(
      true, true, true, true, false, false,
      UI_CONFIG.borderColor,
      SpreadsheetApp.BorderStyle.SOLID_MEDIUM
    );

    sheet.setFrozenRows(1);

    const defaultColumnWidth = UI_CONFIG.columnWidth;
    for (let i = 0; i < headers.length; i++) {
      sheet.setColumnWidth(i + 1, defaultColumnWidth);
    }

    const protection = sheet.protect().setDescription(`Bảo vệ tiêu đề sheet ${sheetName}`);
    protection.setUnprotectedRanges([sheet.getRange(2, 1, sheet.getMaxRows() - 1, sheet.getMaxColumns())]);

    if (sheetName === "DaGhep") {
      const ngayCocCol = headers.indexOf("Ngày cọc");
      const thoiGianNhapCol = headers.indexOf("Thời gian nhập");
      const thoiGianGhepCol = headers.indexOf("Thời gian ghép");
      const ngayXuatHoaDonCol = headers.indexOf("Ngày xuất hóa đơn");

      if (ngayCocCol !== -1) sheet.getRange(2, ngayCocCol + 1, sheet.getMaxRows() - 1, 1).setNumberFormat("dd/MM/yyyy hh:mm:ss");
      if (thoiGianNhapCol !== -1) sheet.getRange(2, thoiGianNhapCol + 1, sheet.getMaxRows() - 1, 1).setNumberFormat("dd/MM/yyyy hh:mm:ss");
      if (thoiGianGhepCol !== -1) sheet.getRange(2, thoiGianGhepCol + 1, sheet.getMaxRows() - 1, 1).setNumberFormat("dd/MM/yyyy hh:mm:ss");
      if (ngayXuatHoaDonCol !== -1) sheet.getRange(2, ngayXuatHoaDonCol + 1, sheet.getMaxRows() - 1, 1).setNumberFormat("dd/MM/yyyy");
    }
    if (sheetName === "KhoXe") {
      const ngayNhapCol = headers.indexOf("Ngày nhập");
      if (ngayNhapCol !== -1) sheet.getRange(2, ngayNhapCol + 1, sheet.getMaxRows() - 1, 1).setNumberFormat("dd/MM/yyyy hh:mm:ss");
    }
    if (sheetName === "HuyGhep") {
      const ngayCocCol = headers.indexOf("Ngày cọc");
      const thoiGianNhapCol = headers.indexOf("Thời gian nhập");
      const thoiGianGhepCol = headers.indexOf("Thời gian ghép");
      const thoiGianHuyCol = headers.indexOf("Thời gian hủy");

      if (ngayCocCol !== -1) sheet.getRange(2, ngayCocCol + 1, sheet.getMaxRows() - 1, 1).setNumberFormat("dd/MM/yyyy hh:mm:ss");
      if (thoiGianNhapCol !== -1) sheet.getRange(2, thoiGianNhapCol + 1, sheet.getMaxRows() - 1, 1).setNumberFormat("dd/MM/yyyy hh:mm:ss");
      if (thoiGianGhepCol !== -1) sheet.getRange(2, thoiGianGhepCol + 1, sheet.getMaxRows() - 1, 1).setNumberFormat("dd/MM/yyyy hh:mm:ss");
      if (thoiGianHuyCol !== -1) sheet.getRange(2, thoiGianHuyCol + 1, sheet.getMaxRows() - 1, 1).setNumberFormat("dd/MM/yyyy hh:mm:ss");
    }
    if (sheetName === "lichsu_donhang" || sheetName === "lichsu_xe" || sheetName === "log") {
      const thoiGianCol = headers.indexOf("Thời gian");
      if (thoiGianCol !== -1) sheet.getRange(2, thoiGianCol + 1, sheet.getMaxRows() - 1, 1).setNumberFormat("dd/MM/yyyy HH:mm:ss");
    }
    if (sheetName === XUAT_HOA_DON_SHEET_NAME) {
      // headers here refers to SHEET_HEADERS["Xuathoadon"]
      const ngayXuatHoaDonCol = headers.indexOf("NGÀY XUẤT HÓA ĐƠN"); // Updated
      // Đã xóa checkbox BÁO BÁN
      if (ngayXuatHoaDonCol !== -1) {
        sheet.getRange(2, ngayXuatHoaDonCol + 1, sheet.getMaxRows() - 1, 1).setNumberFormat("dd/MM/yyyy");
      }
      updateSerialNumbers(sheet);
    }
  }
  return sheet;
}

function formatSheet(sheet, numColumns) {
  const maxRows = sheet.getMaxRows();
  if (maxRows < 2) return;

  const dataRange = sheet.getRange(2, 1, maxRows - 1, numColumns);

  dataRange
    .setFontFamily(UI_CONFIG.fontFamily)
    .setFontSize(UI_CONFIG.fontSize)
    .setFontColor(UI_CONFIG.textColor)
    .setHorizontalAlignment("left")
    .setVerticalAlignment("middle");

  sheet.autoResizeRows(2, maxRows - 1);
}


function getSheets(ss) {
  const sheets = {
    daGhepSheet: getOrCreateSheet(ss, DA_GHEP_SHEET_NAME, SHEET_HEADERS["DaGhep"]),
    chuaGhepSheet: getOrCreateSheet(ss, CHUA_GHEP_SHEET_NAME, SHEET_HEADERS["ChuaGhep"]),
    stockSheet: getOrCreateSheet(ss, STOCK_SHEET_NAME, SHEET_HEADERS["KhoXe"]),
    cancelledSheet: getOrCreateSheet(ss, CANCELLED_SHEET_NAME, SHEET_HEADERS["HuyGhep"]),
    mailSheet: getOrCreateSheet(ss, MAIL_SHEET_NAME, SHEET_HEADERS["Mail"]),
    xuathoadonSheet: getOrCreateSheet(ss, XUAT_HOA_DON_SHEET_NAME, SHEET_HEADERS["Xuathoadon"]),
    thongtinxeSheet: getOrCreateSheet(ss, THONG_TIN_XE_SHEET_NAME, SHEET_HEADERS["Thongtinxe"]),
    lichsuDonhangSheet: getOrCreateSheet(ss, "lichsu_donhang", SHEET_HEADERS["lichsu_donhang"]),
    lichsuXeSheet: getOrCreateSheet(ss, "lichsu_xe", SHEET_HEADERS["lichsu_xe"]),
    logSheet: getOrCreateSheet(ss, "log", SHEET_HEADERS["log"]),
    removedCarsLogSheet: getOrCreateSheet(ss, "removed_cars_log", SHEET_HEADERS["removed_cars_log"]),
    nhatKyChinhSuaSheet: getOrCreateSheet(ss, "NhatKyChinhSua", SHEET_HEADERS["NhatKyChinhSua"]),
    dangKyChoSheet: getOrCreateSheet(ss, DANG_KY_CHO_SHEET_NAME, SHEET_HEADERS["DangKyCho"]),
    yeuCauVcSheet: getOrCreateSheet(ss, YEU_CAU_VC_SHEET_NAME, SHEET_HEADERS["YeuCauVC"]),
    chinhSachSheet: getOrCreateSheet(ss, CHINH_SACH_SHEET_NAME, SHEET_HEADERS["Chinhsach"]) // <-- THÊM DÒNG MỚI NÀY
  };
  if (!sheets.mailSheet || sheets.mailSheet.getLastRow() < 2) {
    logAction("Lỗi mailSheet", "Sheet 'mail' không tồn tại hoặc không có dữ liệu");
  }
  return sheets;
}
function updateSerialNumbers(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return; // No data rows

  const sttColIndex = SHEET_HEADERS[sheet.getName()] ? SHEET_HEADERS[sheet.getName()].indexOf("SỐ TT") : -1;
  if (sttColIndex === -1 && sheet.getName() === XUAT_HOA_DON_SHEET_NAME) { // Only apply if SỐ TT exists
    Logger.log("Cột SỐ TT không tìm thấy cho sheet " + sheet.getName());
    return;
  }


  let serialNumber = 1;
  const sttValues = [];
  const dataRange = sheet.getRange(2, 1, lastRow - 1, sheet.getMaxColumns()).getValues();
  const soDonHangColIndex = SHEET_HEADERS[sheet.getName()] ? SHEET_HEADERS[sheet.getName()].indexOf("SỐ ĐƠN HÀNG") : -1;


  for (let i = 0; i < dataRange.length; i++) {
    // Check if the row has data, e.g., by checking the "SỐ ĐƠN HÀNG" column or any key column
    // For Xuathoadon, let's assume if "SỐ ĐƠN HÀNG" (new index 2) has value, it's a valid row.
    let hasData = false;
    if (sheet.getName() === XUAT_HOA_DON_SHEET_NAME && soDonHangColIndex !== -1) {
      if (dataRange[i][soDonHangColIndex] && String(dataRange[i][soDonHangColIndex]).trim() !== "") {
        hasData = true;
      }
    } else { // For other sheets, or if SỐ ĐƠN HÀNG is not the key, assume any data in first few cells
      for (let j = 1; j < 5 && j < dataRange[i].length; j++) { // Check first few data columns
        if (dataRange[i][j] && String(dataRange[i][j]).trim() !== "") {
          hasData = true;
          break;
        }
      }
    }

    if (hasData) {
      sttValues.push([serialNumber++]);
    } else {
      sttValues.push([""]); // Keep STT blank for empty data rows
    }
  }
  if (sttValues.length > 0 && sttColIndex !== -1) {
    sheet.getRange(2, sttColIndex + 1, sttValues.length, 1).setValues(sttValues);
  }
}


function updateInvoiceDateInDaghep(daghepSheet, vin, invoiceDate) {
  const daghepData = daghepSheet.getDataRange().getValues();
  const daghepHeaders = SHEET_HEADERS["DaGhep"];
  const vinCol = daghepHeaders.indexOf("VIN");
  const invoiceDateCol = daghepHeaders.indexOf("Ngày xuất hóa đơn");

  if (vinCol === -1 || invoiceDateCol === -1) {
    logAction("Lỗi updateInvoiceDateInDaghep", "Không tìm thấy cột VIN hoặc Ngày xuất hóa đơn trong DaGhep");
    return;
  }

  for (let i = 1; i < daghepData.length; i++) {
    if (String(daghepData[i][vinCol] || "").trim() === String(vin).trim()) {
      daghepSheet.getRange(i + 1, invoiceDateCol + 1).setValue(invoiceDate);
      logAction("Cập nhật ngày xuất hóa đơn trong DaGhep", `VIN ${vin} cập nhật ngày xuất hóa đơn: ${Utilities.formatDate(invoiceDate, "GMT+7", "dd/MM/yyyy")}`);
      break;
    }
  }
}

function recordKhoxeStateBeforeInvoice(vin, khoxeRowData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const lichsuXeSheet = getOrCreateSheet(ss, "lichsu_xe", SHEET_HEADERS["lichsu_xe"]);
  const timestamp = new Date();
  const khoxeHeaders = SHEET_HEADERS["KhoXe"];
  const chiTiet = `Lưu trạng thái khoxe trước xuất hóa đơn: Trạng thái=${khoxeRowData[khoxeHeaders.indexOf("Trạng thái")]}, Ngày nhập=${khoxeRowData[khoxeHeaders.indexOf("Ngày nhập")]}, Đã thông báo=${khoxeRowData[khoxeHeaders.indexOf("Đã thông báo")]}`;

  lichsuXeSheet.appendRow([
    timestamp,
    vin,
    "Lưu trạng thái khoxe",
    chiTiet,
    Session.getActiveUser().getEmail() || "Unknown"
  ]);
  logAction("Lưu trạng thái khoxe", `Lưu trạng thái cho VIN ${vin}: ${chiTiet}`);
}

function updateKhoxeStatusForVin(stockSheet, vin, newStatus) {
  const stockData = stockSheet.getDataRange().getValues();
  const headers = SHEET_HEADERS["KhoXe"]; // Use defined headers
  const vinCol = headers.indexOf("VIN");
  const statusCol = headers.indexOf("Trạng thái");

  if (vinCol === -1 || statusCol === -1) {
    logAction("Lỗi cập nhật trạng thái KhoXe", "Sheet 'KhoXe' thiếu cột 'VIN' hoặc 'Trạng thái'.");
    return;
  }

  for (let i = 1; i < stockData.length; i++) { // Start from 1 to skip header row
    if (String(stockData[i][vinCol]).trim() === String(vin).trim()) {
      stockSheet.getRange(i + 1, statusCol + 1).setValue(newStatus); // i+1 for 1-based sheet row, statusCol+1 for 1-based col
      logAction("Cập nhật trạng thái KhoXe", `VIN ${vin} cập nhật trạng thái từ '${stockData[i][statusCol]}' thành '${newStatus}'.`);
      return;
    }
  }
  logAction("Cập nhật trạng thái KhoXe", `Không tìm thấy VIN ${vin} trong sheet 'KhoXe' để cập nhật trạng thái.`);
}
function getUnpairedOrdersAndAvailableCars() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const chuaGhepSheet = getOrCreateSheet(ss, CHUA_GHEP_SHEET_NAME, SHEET_HEADERS["ChuaGhep"]);
    const stockSheet = getOrCreateSheet(ss, STOCK_SHEET_NAME, SHEET_HEADERS["KhoXe"]);

    const unpairedOrders = [];
    if (chuaGhepSheet && chuaGhepSheet.getLastRow() > 1) {
      const data = chuaGhepSheet.getDataRange().getValues();
      const headers = SHEET_HEADERS["ChuaGhep"]; // Use defined headers

      const tvbhCol = headers.indexOf("Tên tư vấn bán hàng");
      const tenKhCol = headers.indexOf("Tên khách hàng");
      const dongXeCol = headers.indexOf("Dòng xe");
      const phienBanCol = headers.indexOf("Phiên bản");
      const ngoaiThatCol = headers.indexOf("Ngoại thất");
      const noiThatCol = headers.indexOf("Nội thất");
      const soDonHangCol = headers.indexOf("Số đơn hàng");
      const ngayCocCol = headers.indexOf("Ngày cọc");
      const ketQuaCol = headers.indexOf("Kết quả");

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const orderNumber = String(row[soDonHangCol] || "").trim();
        const ketQua = String(row[ketQuaCol] || "").toLowerCase().trim();

        if ((ketQua === "chưa ghép" || ketQua === "chưa tìm thấy vin" || ketQua === "chưa có") && orderNumber.length > 0) {

          let ngayCocValue = row[ngayCocCol];
          if (ngayCocValue instanceof Date) {
            ngayCocValue = Utilities.formatDate(ngayCocValue, Session.getScriptTimeZone(), "dd/MM/yyyy");
          } else if (ngayCocValue) { // If it's a string or number, try to format
            try {
              ngayCocValue = Utilities.formatDate(new Date(ngayCocValue), Session.getScriptTimeZone(), "dd/MM/yyyy");
            } catch (err) {/*ignore format error, keep original*/ }
          }


          const orderObject = {
            ten_tu_van_ban_hang: row[tvbhCol],
            ten_khach_hang: row[tenKhCol],
            dong_xe: row[dongXeCol],
            phien_ban: row[phienBanCol],
            ngoai_that: row[ngoaiThatCol],
            noi_that: row[noiThatCol],
            so_don_hang: orderNumber,
            ngay_coc: ngayCocValue
          };
          unpairedOrders.push(orderObject);
        }
      }
    }

    const availableCars = [];
    if (stockSheet && stockSheet.getLastRow() > 1) {
      const stockData = stockSheet.getDataRange().getValues();
      const stockHeaders = SHEET_HEADERS["KhoXe"]; // Use defined headers
      const vinCol = stockHeaders.indexOf("VIN");
      const statusCol = stockHeaders.indexOf("Trạng thái");
      const dongXeCol = stockHeaders.indexOf("Dòng xe");
      const phienBanCol = stockHeaders.indexOf("Phiên bản");
      const ngoaiThatCol = stockHeaders.indexOf("Ngoại thất");
      const noiThatCol = stockHeaders.indexOf("Nội thất");
      const ngayNhapCol = stockHeaders.indexOf("Ngày nhập");

      for (let i = 1; i < stockData.length; i++) {
        const rowData = stockData[i];
        if (String(rowData[statusCol]).toLowerCase().trim() === "chưa ghép" && String(rowData[vinCol]).trim() !== "") {
          let formattedDate = "";
          const ngayNhapValue = rowData[ngayNhapCol];
          if (ngayNhapValue) {
            const date = new Date(ngayNhapValue);
            if (date instanceof Date && !isNaN(date.getTime())) {
              formattedDate = Utilities.formatDate(date, "GMT+7", "dd/MM/yyyy HH:mm:ss");
            } else {
              formattedDate = String(ngayNhapValue); // Keep as string if not a valid date
            }
          }
          availableCars.push({
            vin: String(rowData[vinCol]).trim(),
            dong_xe: String(rowData[dongXeCol]).trim(),
            phien_ban: String(rowData[phienBanCol]).trim(),
            ngoai_that: String(rowData[ngoaiThatCol]).trim(),
            noi_that: String(rowData[noiThatCol]).trim(),
            trang_thai: String(rowData[statusCol]).trim(),
            ngay_nhap: formattedDate
          });
        }
      }
    }

    return { status: "SUCCESS", unpairedOrders: unpairedOrders, availableCars: availableCars };

  } catch (e) {
    Logger.log("Lỗi nghiêm trọng trong getUnpairedOrdersAndAvailableCars: " + e.stack);
    return { status: "ERROR", message: `Lỗi máy chủ: ${e.message}` };
  }
}
function getCarDetailsByVin(vin) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const stockSheet = getOrCreateSheet(ss, STOCK_SHEET_NAME, SHEET_HEADERS["KhoXe"]);
    const stockData = stockSheet.getDataRange().getValues();

    if (stockData.length <= 1) {
      return { status: "ERROR", message: "Sheet KhoXe không có dữ liệu." };
    }

    const headers = SHEET_HEADERS["KhoXe"]; // Use defined headers
    const vinCol = headers.indexOf("VIN");
    const dongXeCol = headers.indexOf("Dòng xe");
    const phienBanCol = headers.indexOf("Phiên bản");
    const ngoaiThatCol = headers.indexOf("Ngoại thất");
    const noiThatCol = headers.indexOf("Nội thất");
    const statusCol = headers.indexOf("Trạng thái");
    const ngayNhapCol = headers.indexOf("Ngày nhập");

    if ([vinCol, dongXeCol, phienBanCol, ngoaiThatCol, noiThatCol, statusCol, ngayNhapCol].some(col => col === -1)) {
      logAction("Lỗi", "Sheet KhoXe thiếu một số cột cần thiết để lấy chi tiết xe.");
      return { status: "ERROR", message: "Missing required columns in KhoXe sheet for car details." };
    }

    for (let i = 1; i < stockData.length; i++) {
      const row = stockData[i];
      if (String(row[vinCol]).trim() === String(vin).trim()) {
        let formattedNgayNhap = "";
        if (row[ngayNhapCol]) {
          const date = new Date(row[ngayNhapCol]);
          if (date instanceof Date && !isNaN(date.getTime())) {
            formattedNgayNhap = Utilities.formatDate(date, "GMT+7", "dd/MM/yyyy HH:mm:ss");
          } else {
            formattedNgayNhap = String(row[ngayNhapCol]);
          }
        }
        return {
          status: "SUCCESS",
          car: {
            vin: String(row[vinCol]).trim(),
            dong_xe: String(row[dongXeCol]).trim(),
            phien_ban: String(row[phienBanCol]).trim(),
            ngoai_that: String(row[ngoaiThatCol]).trim(),
            noi_that: String(row[noiThatCol]).trim(),
            trang_thai: String(row[statusCol]).trim(),
            ngay_nhap: formattedNgayNhap
          }
        };
      }
    }
    return { status: "ERROR", message: "Không tìm thấy xe với VIN này." };
  } catch (e) {
    logAction("Lỗi lấy chi tiết xe theo VIN", `Lỗi: ${e.message} Stack: ${e.stack}`);
    return { status: "ERROR", message: `Lỗi khi lấy chi tiết xe: ${e.message}` };
  }
}
function showToastOnSheet(message, title = "Thông Báo", timeoutSeconds = 5) {
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(message, title, timeoutSeconds);
    Logger.log(`Toast displayed: ${message}`);
  } catch (e) {
    Logger.log(`Lỗi khi hiển thị toast: ${e.message}`);
    // Fallback: nếu toast không hoạt động (ví dụ, do không có UI), log lỗi hoặc dùng alert.
    SpreadsheetApp.getUi().alert("Thông báo", message);
  }
}
function addToChuaghepIfNotDuplicate(chuaGhepSheet, orderData) {
  const chuaGhepData = chuaGhepSheet.getDataRange().getValues();
  const headers = SHEET_HEADERS["ChuaGhep"]; // Use defined headers
  const soDonHangCol = headers.indexOf("Số đơn hàng");
  // const vinCol = headers.indexOf("VIN"); // VIN is not expected to be in orderData for ChuaGhep

  const existingOrder = chuaGhepData.slice(1).find(row => // slice(1) to skip header
    String(row[soDonHangCol] || "").trim() === String(orderData.so_don_hang || "").trim()
  );

  if (existingOrder) {
    logAction("Bỏ qua thêm vào ChuaGhep", `Đơn hàng ${orderData.so_don_hang} đã tồn tại trong ChuaGhep.`);
    return;
  }

  const newRowValues = [];
  headers.forEach(header => {
    // Map orderData (which uses underscore keys) to header names
    let value = "";
    if (header === "Tên tư vấn bán hàng") value = orderData.ten_ban_hang;
    else if (header === "Tên khách hàng") value = orderData.ten_khach_hang;
    else if (header === "Dòng xe") value = orderData.dong_xe;
    else if (header === "Phiên bản") value = orderData.phien_ban;
    else if (header === "Ngoại thất") value = orderData.ngoai_that;
    else if (header === "Nội thất") value = orderData.noi_that;
    else if (header === "Số đơn hàng") value = orderData.so_don_hang;
    else if (header === "Ngày cọc") value = orderData.ngay_coc;
    else if (header === "Thời gian nhập") value = formatDateTimeForSheet(new Date(orderData.thoi_gian_nhap)); // Ensure format
    else if (header === "Kết quả") value = "Chưa ghép";
    // VIN, Thời gian ghép, Số ngày ghép, Trạng thái gửi mail will be empty or default
    newRowValues.push(value);
  });


  appendAndFormatRow(chuaGhepSheet, newRowValues);
  logAction("Thêm vào ChuaGhep", `Đã thêm đơn hàng ${orderData.so_don_hang} vào ChuaGhep.`);
}


function deleteCarFromStockLogic(vinToDelete, reason) {
  Logger.log(`DEBUG: Bắt đầu xóa xe ${vinToDelete} với lý do: "${reason}"`);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const stockSheet = getOrCreateSheet(ss, STOCK_SHEET_NAME, SHEET_HEADERS["KhoXe"]);
  const removedCarsLogSheet = getOrCreateSheet(ss, "removed_cars_log", SHEET_HEADERS["removed_cars_log"]);
  const userEmail = Session.getActiveUser().getEmail() || "Không xác định";

  const stockData = stockSheet.getDataRange().getValues();
  const actualStockHeaders = stockData[0]; // [SỬA LỖI] Lấy header thực tế từ sheet
  const vinColStock = actualStockHeaders.indexOf("VIN");

  if (vinColStock === -1) {
    return "Lỗi: Sheet KhoXe không có cột VIN.";
  }

  for (let i = 1; i < stockData.length; i++) {
    const currentRow = stockData[i];
    const currentVin = String(currentRow[vinColStock] || "").trim();

    if (currentVin === vinToDelete) {
      // [SỬA LỖI] Tạo object chi tiết xe bằng cách map header thực tế với giá trị
      const carToRemoveDetails = {};
      actualStockHeaders.forEach((header, index) => {
        if (header) carToRemoveDetails[header] = currentRow[index];
      });

      const logEntry = [
        formatDateTimeForSheet(new Date()),
        userEmail,
        carToRemoveDetails["Dòng xe"],
        carToRemoveDetails["Phiên bản"],
        carToRemoveDetails["Ngoại thất"],
        carToRemoveDetails["Nội thất"],
        vinToDelete,
        carToRemoveDetails["Mã DMS"], // Đọc đúng từ object chi tiết
        carToRemoveDetails["Trạng thái"],
        carToRemoveDetails["Ngày nhập"] ? formatDateTimeForSheet(new Date(carToRemoveDetails["Ngày nhập"])) : "",
        carToRemoveDetails["Đã thông báo"],
        reason || "Không có lý do"
      ];
      appendAndFormatRow(removedCarsLogSheet, logEntry);

      stockSheet.deleteRow(i + 1);

      // --- ĐỒNG BỘ SUPABASE ---
      try {
        deleteSupabase('khoxe', `vin=eq.${vinToDelete}`);
      } catch (e) {
        Logger.log(`Lỗi xóa Supabase: ${e.message}`);
      }

      recordVehicleHistory(vinToDelete, "Xóa Khỏi Kho", `Xe đã được xóa bởi ${userEmail}. Lý do: ${reason}`);
      logAction("Xóa Xe Thành Công", `VIN ${vinToDelete} đã được xóa khỏi KhoXe và ghi vào log.`);
      return `Xe với VIN ${vinToDelete} đã được xóa thành công khỏi kho!`;

    }
  }
  return `Không tìm thấy xe với VIN ${vinToDelete} trong KhoXe.`;
}
function getSuggestedColors(userInputColor) {
  if (!userInputColor || typeof userInputColor !== 'string') {
    return [];
  }
  const normalizedUserInput = userInputColor.trim().toLowerCase();
  if (normalizedUserInput === "") return [];

  const suggestions = VALID_EXTERIOR_COLORS.filter(validColor =>
    validColor.trim().toLowerCase().includes(normalizedUserInput)
  );

  return suggestions;
}
/**
 * [PHIÊN BẢN HOÀN CHỈNH] - Lưu trữ các đơn hàng đã xuất hóa đơn từ sheet 'Xuathoadon'
 * sang một sheet lưu trữ riêng theo tháng.
 * Chức năng này sao chép đầy đủ mọi thông tin bao gồm: giá trị, công thức (link),
 * định dạng (màu sắc, font chữ), và data validation (checkbox).
 *
 * @param {number} year - Tùy chọn. Năm 4 chữ số của tháng cần lưu trữ (ví dụ: 2024).
 * @param {number} month - Tùy chọn. Tháng cần lưu trữ (1-12).
 */
function deleteMonthlyInvoicedOrdersFromDaGhepLogic() {
  Logger.log("--- BẮT ĐẦU: deleteMonthlyInvoicedOrdersFromDaGhepLogic ---");
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const daGhepSheet = getOrCreateSheet(ss, DA_GHEP_SHEET_NAME, SHEET_HEADERS["DaGhep"]);

  const daGhepDataRange = daGhepSheet.getDataRange();
  const daGhepValues = daGhepDataRange.getValues();

  if (daGhepValues.length <= 1) {
    const msg = "Sheet DaGhep không có dữ liệu để dọn dẹp.";
    Logger.log(msg);
    logAction("Xóa DaGhep (XHĐ Tháng Trước)", msg);
    return msg;
  }

  const headers = daGhepValues[0];
  const ketQuaCol = headers.indexOf("Kết quả");
  const ngayXuatHDCol = headers.indexOf("Ngày xuất hóa đơn");
  const soDonHangCol = headers.indexOf("Số đơn hàng");
  const vinCol = headers.indexOf("VIN");

  if (ketQuaCol === -1 || ngayXuatHDCol === -1) {
    const msg = "Lỗi: Không tìm thấy cột 'Kết quả' hoặc 'Ngày xuất hóa đơn' trong sheet DaGhep.";
    Logger.log(msg);
    logAction("Lỗi Xóa DaGhep (XHĐ Tháng Trước)", msg);
    return msg;
  }

  const today = new Date();
  let previousMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);
  previousMonthDate.setDate(0);
  const targetYear = previousMonthDate.getFullYear();
  const targetMonth = previousMonthDate.getMonth();

  const rowIndicesToDeleteInDaGhep = [];
  let deletedCount = 0;
  const deletedOrderInfoForLog = [];

  for (let i = daGhepValues.length - 1; i >= 1; i--) {
    const rowContent = daGhepValues[i];
    const ketQua = String(rowContent[ketQuaCol] || "").trim();
    const ngayXuatHDValue = rowContent[ngayXuatHDCol];

    if (ketQua === "Đã xuất hóa đơn") {
      let invoiceDate = null;
      if (ngayXuatHDValue instanceof Date && !isNaN(ngayXuatHDValue)) {
        invoiceDate = ngayXuatHDValue;
      } else if ((typeof ngayXuatHDValue === 'string' && ngayXuatHDValue.trim() !== "") || typeof ngayXuatHDValue === 'number') {
        let parsedDateAttempt;
        if (typeof ngayXuatHDValue === 'string' && ngayXuatHDValue.includes('/')) {
          const parts = ngayXuatHDValue.split('/');
          if (parts.length === 3) {
            parsedDateAttempt = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          }
        } else {
          parsedDateAttempt = new Date(ngayXuatHDValue);
        }

        if (parsedDateAttempt && !isNaN(parsedDateAttempt)) {
          invoiceDate = parsedDateAttempt;
        }
      }

      if (invoiceDate) {
        if (invoiceDate.getFullYear() === targetYear && invoiceDate.getMonth() === targetMonth) {
          rowIndicesToDeleteInDaGhep.push(i + 1);
          deletedCount++;
          const orderNumber = soDonHangCol !== -1 ? String(rowContent[soDonHangCol] || "N/A").trim() : "N/A";
          const vin = vinCol !== -1 ? String(rowContent[vinCol] || "N/A").trim() : "N/A";
          deletedOrderInfoForLog.push(`ĐH: ${orderNumber}, VIN: ${vin} (dòng sheet ${i + 1})`);
        }
      }
    }
  }

  if (deletedCount > 0) {
    rowIndicesToDeleteInDaGhep.forEach(rowIndex => {
      daGhepSheet.deleteRow(rowIndex);
    });

    const successMsg = `Đã xóa vĩnh viễn ${deletedCount} đơn hàng (đã XHĐ tháng ${targetMonth + 1}/${targetYear}) khỏi sheet DaGhep.`;
    logAction("Xóa DaGhep (XHĐ Tháng Trước)", `${successMsg} Chi tiết: ${deletedOrderInfoForLog.join('; ')}`);
    return successMsg;
  } else {
    const noRowsMsg = `Không có đơn hàng nào trong DaGhep đã xuất hóa đơn của tháng ${targetMonth + 1}/${targetYear} để xóa.`;
    logAction("Xóa DaGhep (XHĐ Tháng Trước)", noRowsMsg);
    return noRowsMsg;
  }
}

function deleteOrderLogic(orderNumber, deletedBy) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const daGhepSheet = getOrCreateSheet(ss, DA_GHEP_SHEET_NAME, SHEET_HEADERS["DaGhep"]);
  const chuaGhepSheet = getOrCreateSheet(ss, CHUA_GHEP_SHEET_NAME, SHEET_HEADERS["ChuaGhep"]);
  const stockSheet = getOrCreateSheet(ss, STOCK_SHEET_NAME, SHEET_HEADERS["KhoXe"]);
  const cancelledSheet = getOrCreateSheet(ss, CANCELLED_SHEET_NAME, SHEET_HEADERS["HuyGhep"]);

  if (!orderNumber) {
    return "Số đơn hàng không được cung cấp.";
  }

  let sourceSheet = null;
  let rowIndexToDelete = -1; // Chỉ số dòng 1-based để xóa
  let rowDataToMove = null;
  let headers = null;

  // Tìm trong sheet DaGhep
  const daGhepData = daGhepSheet.getDataRange().getValues();
  // KIỂM TRA MỚI: Chỉ xử lý nếu sheet có nhiều hơn dòng tiêu đề
  if (daGhepData.length > 1) {
    const daGhepHeaders = daGhepData[0];
    const orderNumberColDaGhep = daGhepHeaders.indexOf("Số đơn hàng");
    if (orderNumberColDaGhep !== -1) {
      for (let i = 1; i < daGhepData.length; i++) {
        if (String(daGhepData[i][orderNumberColDaGhep]).trim() === String(orderNumber).trim()) {
          sourceSheet = daGhepSheet;
          rowIndexToDelete = i + 1;
          rowDataToMove = daGhepData[i];
          headers = daGhepHeaders;
          break;
        }
      }
    }
  }

  // Nếu không tìm thấy, tìm trong sheet ChuaGhep
  if (sourceSheet === null) {
    const chuaGhepData = chuaGhepSheet.getDataRange().getValues();
    // KIỂM TRA MỚI: Chỉ xử lý nếu sheet có nhiều hơn dòng tiêu đề
    if (chuaGhepData.length > 1) {
      const chuaGhepHeaders = chuaGhepData[0];
      const orderNumberColChuaGhep = chuaGhepHeaders.indexOf("Số đơn hàng");
      if (orderNumberColChuaGhep !== -1) {
        for (let i = 1; i < chuaGhepData.length; i++) {
          if (String(chuaGhepData[i][orderNumberColChuaGhep]).trim() === String(orderNumber).trim()) {
            sourceSheet = chuaGhepSheet;
            rowIndexToDelete = i + 1;
            rowDataToMove = chuaGhepData[i];
            headers = chuaGhepHeaders;
            break;
          }
        }
      }
    }
  }

  // Nếu vẫn không tìm thấy, trả về lỗi
  if (sourceSheet === null || rowIndexToDelete === -1) {
    logAction("Lỗi Xóa Đơn Hàng", `Không tìm thấy đơn hàng ${orderNumber}.`);
    return `Không tìm thấy đơn hàng ${orderNumber} trong các sheet hoạt động.`;
  }

  const vinCol = headers.indexOf("VIN");
  const vinToRevert = (vinCol !== -1) ? String(rowDataToMove[vinCol] || "").trim() : "";

  // Hoàn trả trạng thái VIN trong KhoXe nếu có
  if (vinToRevert && vinToRevert !== "" && vinToRevert.toLowerCase() !== "hủy") {
    updateKhoxeStatusForVin(stockSheet, vinToRevert, "Chưa ghép");
    recordVehicleHistory(vinToRevert, "Xóa đơn hàng (Thủ công)", `Đã hủy ghép cho đơn hàng ${orderNumber}, VIN về 'Chưa ghép'`);
    logAction("Cập nhật KhoXe (Xóa Đơn Hàng)", `VIN ${vinToRevert} đã được cập nhật về 'Chưa ghép'.`);
  }

  // Di chuyển dòng vào sheet HuyGhep
  const cancelledSheetHeaders = SHEET_HEADERS["HuyGhep"];
  const cancelledRow = {};

  cancelledSheetHeaders.forEach(header => {
    const originalHeaderIndex = headers.indexOf(header);
    if (originalHeaderIndex !== -1) {
      cancelledRow[header] = rowDataToMove[originalHeaderIndex];
    } else if (header === "Người hủy") {
      cancelledRow[header] = deletedBy;
    } else if (header === "Thời gian hủy") {
      cancelledRow[header] = formatDateTimeForSheet(new Date());
    } else if (header === "Kết quả") {
      cancelledRow[header] = "Đã xóa (Thủ công)"; // Trạng thái mới cho việc xóa thủ công
    }
  });

  const cancelledRowData = cancelledSheetHeaders.map(header => cancelledRow[header] || "");
  appendAndFormatRow(cancelledSheet, cancelledRowData);
  logAction("Di chuyển đơn hàng (Xóa)", `Đơn hàng ${orderNumber} đã được chuyển sang ${CANCELLED_SHEET_NAME}.`);

  // Xóa dòng khỏi sheet gốc
  sourceSheet.deleteRow(rowIndexToDelete);
  logAction("Xóa Đơn Hàng Thành Công", `Đơn hàng ${orderNumber} đã được xóa khỏi ${sourceSheet.getName()}.`);

  // Ghi lại lịch sử
  recordOrderHistory(orderNumber, vinToRevert, "Xóa đơn hàng (Thủ công)", `Đơn hàng đã bị xóa bởi ${deletedBy}`);

  return `Đơn hàng ${orderNumber} đã được xóa thành công và chuyển vào sheet ${CANCELLED_SHEET_NAME}.`;
}
function getMatchSuggestions() {
  const userProperties = PropertiesService.getUserProperties();
  const suggestionJson = userProperties.getProperty('MATCH_SUGGESTION_ALL'); // Đọc từ khóa mới

  if (suggestionJson) {
    userProperties.deleteProperty('MATCH_SUGGESTION_ALL'); // Xóa sau khi lấy
    const suggestionData = JSON.parse(suggestionJson);

    const fiveMinutes = 5 * 60 * 1000;
    if (new Date().getTime() - suggestionData.timestamp < fiveMinutes) {
      return suggestionData.allSuggestions; // Trả về mảng các gợi ý
    }
  }
  return null;
}
// [THAY THẾ TOÀN BỘ HÀM CŨ]
function getSuggestionsForExistingData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const chuaGhepSheet = ss.getSheetByName(CHUA_GHEP_SHEET_NAME);
  const stockSheet = ss.getSheetByName(STOCK_SHEET_NAME);
  if (!chuaGhepSheet || chuaGhepSheet.getLastRow() < 2 || !stockSheet || stockSheet.getLastRow() < 2) {
    return { status: "NO_DATA", message: "Không có đủ dữ liệu trong sheet 'Chưa ghép' hoặc 'KhoXe' để tạo gợi ý." };
  }

  const chuaGhepData = chuaGhepSheet.getDataRange().getValues();
  const chuaGhepHeaders = SHEET_HEADERS["ChuaGhep"];
  const stockData = stockSheet.getDataRange().getValues();
  const stockHeaders = SHEET_HEADERS["KhoXe"];
  const suggestions = [];

  // Lấy chỉ số các cột cần thiết
  const tvbhColCHG = chuaGhepHeaders.indexOf("Tên tư vấn bán hàng");
  const tenKhColCHG = chuaGhepHeaders.indexOf("Tên khách hàng");
  const donHangColCHG = chuaGhepHeaders.indexOf("Số đơn hàng");
  const dongXeColCHG = chuaGhepHeaders.indexOf("Dòng xe");
  const phienBanColCHG = chuaGhepHeaders.indexOf("Phiên bản");
  const ngoaiThatColCHG = chuaGhepHeaders.indexOf("Ngoại thất");
  const noiThatColCHG = chuaGhepHeaders.indexOf("Nội thất");
  const ngayCocColCHG = chuaGhepHeaders.indexOf("Ngày cọc");
  const vinColStock = stockHeaders.indexOf("VIN");
  const statusColStock = stockHeaders.indexOf("Trạng thái");
  const dongXeColStock = stockHeaders.indexOf("Dòng xe");
  const phienBanColStock = stockHeaders.indexOf("Phiên bản");
  const ngoaiThatColStock = stockHeaders.indexOf("Ngoại thất");
  const noiThatColStock = stockHeaders.indexOf("Nội thất");
  const ngayNhapColStock = stockHeaders.indexOf("Ngày nhập");

  for (let i = 1; i < stockData.length; i++) {
    const car = stockData[i];
    const carVin = String(car[vinColStock] || "").trim();
    const carStatus = String(car[statusColStock] || "").toLowerCase().trim();

    if (carStatus === "chưa ghép" && carVin) {
      const carDongXe = normalizeForComparison(car[dongXeColStock]);
      const carPhienBan = normalizeForComparison(car[phienBanColStock]);
      const carNgoaiThat = normalizeForComparison(car[ngoaiThatColStock]);
      const carNoiThat = normalizeForComparison(car[noiThatColStock]); // Chuẩn hóa nội thất xe
      const carNgayNhap = car[ngayNhapColStock];

      const matchingOrdersForCar = [];
      for (let j = 1; j < chuaGhepData.length; j++) {
        const order = chuaGhepData[j];
        const orderKetQua = String(order[chuaGhepHeaders.indexOf("Kết quả")] || "").toLowerCase().trim();

        if (orderKetQua.startsWith("chưa")) {
          const orderDongXe = normalizeForComparison(order[dongXeColCHG]);
          const orderPhienBan = normalizeForComparison(order[phienBanColCHG]);
          const orderNgoaiThat = normalizeForComparison(order[ngoaiThatColCHG]);
          const orderNoiThat = normalizeForComparison(order[noiThatColCHG]); // Chuẩn hóa nội thất đơn hàng

          // [TỐI ƯU] So sánh nội thất đã được chuẩn hóa
          if (carDongXe === orderDongXe &&
            carPhienBan === orderPhienBan &&
            carNgoaiThat === orderNgoaiThat &&
            carNoiThat === orderNoiThat) { // So sánh bằng thay vì includes

            let ngayCocValue = order[ngayCocColCHG];
            if (ngayCocValue instanceof Date) {
              ngayCocValue = Utilities.formatDate(ngayCocValue, Session.getScriptTimeZone(), "dd/MM/yyyy");
            } else if (ngayCocValue) {
              try {
                ngayCocValue = Utilities.formatDate(new Date(ngayCocValue), Session.getScriptTimeZone(), "dd/MM/yyyy");
              } catch (err) { /* Bỏ qua lỗi định dạng */ }
            }

            matchingOrdersForCar.push({
              so_don_hang: order[donHangColCHG],
              ten_khach_hang: order[tenKhColCHG],
              ten_tu_van: order[tvbhColCHG],
              ngay_coc: ngayCocValue
            });
          }
        }
      }

      if (matchingOrdersForCar.length > 0) {
        matchingOrdersForCar.sort((a, b) => {
          const dateA = new Date(a.ngay_coc);
          const dateB = new Date(b.ngay_coc);
          if (isNaN(dateA.getTime())) return 1;
          if (isNaN(dateB.getTime())) return -1;
          return dateA.getTime() - dateB.getTime();
        });
        suggestions.push({
          car: {
            vin: carVin,
            dong_xe: String(car[dongXeColStock]).trim(),
            phien_ban: String(car[phienBanColStock]).trim(),
            ngoai_that: String(car[ngoaiThatColStock]).trim(),
            noi_that: String(car[noiThatColStock]).trim(),
            ngay_nhap: carNgayNhap instanceof Date ? Utilities.formatDate(carNgayNhap, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss") : String(carNgayNhap || "")
          },
          orders: matchingOrdersForCar
        });
      }
    }
  }

  if (suggestions.length > 0) {
    suggestions.sort((a, b) => {
      const dateA = new Date(a.car.ngay_nhap);
      const dateB = new Date(b.car.ngay_nhap);
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;
      return dateA.getTime() - dateB.getTime();
    });
    const userProperties = PropertiesService.getUserProperties();
    const suggestionData = {
      timestamp: new Date().getTime(),
      allSuggestions: suggestions
    };
    userProperties.setProperty('MATCH_SUGGESTION_ALL', JSON.stringify(suggestionData));
    return { status: "SUCCESS", message: `Tìm thấy ${suggestions.length} nhóm gợi ý ghép xe.`, data: suggestionData };
  } else {
    return { status: "NO_SUGGESTIONS", message: "Không tìm thấy bất kỳ gợi ý ghép xe nào phù hợp." };
  }
}
function getFilterOptions() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = getSheets(ss);
  const options = {
    dong_xe: new Set(),
    phien_ban: new Set(),
    ngoai_that: new Set(),
  };

  const sheetsToScan = {
    DaGhep: { sheet: sheets.daGhepSheet, headers: SHEET_HEADERS.DaGhep },
    ChuaGhep: { sheet: sheets.chuaGhepSheet, headers: SHEET_HEADERS.ChuaGhep },
    KhoXe: { sheet: sheets.stockSheet, headers: SHEET_HEADERS.KhoXe }
  };

  for (const key in sheetsToScan) {
    const { sheet, headers } = sheetsToScan[key];
    if (!sheet || sheet.getLastRow() < 2) continue;
    const data = sheet.getDataRange().getValues();

    const dongXeCol = headers.indexOf("Dòng xe");
    const phienBanCol = headers.indexOf("Phiên bản");
    const ngoaiThatCol = headers.indexOf("Ngoại thất");

    for (let i = 1; i < data.length; i++) {
      if (dongXeCol > -1 && data[i][dongXeCol]) options.dong_xe.add(data[i][dongXeCol]);
      if (phienBanCol > -1 && data[i][phienBanCol]) options.phien_ban.add(data[i][phienBanCol]);
      if (ngoaiThatCol > -1 && data[i][ngoaiThatCol]) options.ngoai_that.add(data[i][ngoaiThatCol]);
    }
  }

  VALID_EXTERIOR_COLORS.forEach(c => options.ngoai_that.add(c));

  // Danh sách trạng thái hợp nhất, dễ hiểu
  const combinedStatus = new Set([
    'Chưa ghép / Sẵn có',
    'Đã ghép',
    'Đã xuất hóa đơn',
    'Đã hủy'
  ]);

  return {
    dong_xe: Array.from(options.dong_xe).sort(),
    phien_ban: Array.from(options.phien_ban).sort(),
    ngoai_that: Array.from(options.ngoai_that).sort(),
    status: Array.from(combinedStatus) // Trả về danh sách trạng thái mới
  };
}
/**
 * Thực hiện tìm kiếm nâng cao trên nhiều sheet dựa trên một bộ lọc đã được đơn giản hóa.
 * @param {Object} filters - Một đối tượng chứa các tiêu chí lọc từ sidebar.
 * @returns {Object} Một đối tượng chứa kết quả tìm kiếm, được nhóm theo tên sheet.
 */
function anSoKhongChoSheetKPI() {
  const tenSheet = "KPI";
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(tenSheet);

  if (!sheet) {
    // Nếu không tìm thấy sheet "KPI", hiển thị cảnh báo cho người dùng
    SpreadsheetApp.getUi().alert(`Không tìm thấy sheet với tên "${tenSheet}". Vui lòng kiểm tra lại.`);
    return;
  }

  // Lấy toàn bộ vùng dữ liệu của sheet
  const range = sheet.getDataRange();

  // Định dạng để ẩn số 0
  const dinhDangAnSoKhong = "0;-0;;@";

  // Áp dụng định dạng cho toàn bộ vùng dữ liệu
  range.setNumberFormat(dinhDangAnSoKhong);

  // Thông báo cho người dùng khi hoàn tất
  SpreadsheetApp.getUi().alert(`Đã ẩn tất cả các giá trị bằng 0 trên sheet "${tenSheet}".`);
}
/**
 * [HÀM MỚI] Quét và đồng bộ các Mã DMS còn thiếu từ Thongtinxe sang KhoXe.
 * Hàm này được thiết kế để chạy tự động theo thời gian (ví dụ: mỗi 5 phút).
 */
function updateDmsFromThongtinxe(khoXeSheet, thongtinxeSheet, vin, rowIndex) {
  if (!vin || !thongtinxeSheet || !khoXeSheet) return;
  // Tạo map để tra cứu nhanh, hiệu quả hơn vòng lặp
  const thongtinxeData = thongtinxeSheet.getDataRange().getValues();
  const thongtinxeHeaders = SHEET_HEADERS["Thongtinxe"];
  const vinColThongtinxe = thongtinxeHeaders.indexOf("Số VIN");
  const khuVucColThongtinxe = thongtinxeHeaders.indexOf("Khu vực");
  if (vinColThongtinxe === -1 || khuVucColThongtinxe === -1) {
    logAction("Lỗi cập nhật Mã DMS (onEdit)", "Sheet Thongtinxe thiếu cột 'Số VIN' hoặc 'Khu vực'.");
    return;
  }

  const vinToDmsMap = new Map(
    thongtinxeData.slice(1).map(row => [
      String(row[vinColThongtinxe] || "").trim(),
      String(row[khuVucColThongtinxe] || "").trim()
    ])
  );
  const dmsCode = vinToDmsMap.get(vin);

  if (dmsCode) {
    const khoXeHeaders = SHEET_HEADERS["KhoXe"];
    const maDmsColKhoXe = khoXeHeaders.indexOf("Mã DMS");
    if (maDmsColKhoXe > -1) {
      khoXeSheet.getRange(rowIndex, maDmsColKhoXe + 1).setValue(dmsCode);
      logAction("Cập nhật Mã DMS (onEdit)", `Đã tự động điền Mã DMS '${dmsCode}' cho VIN ${vin} tại dòng ${rowIndex}.`);
    }
  } else {
    logAction("Cập nhật Mã DMS (onEdit)", `Không tìm thấy Mã DMS cho VIN ${vin} trong sheet Thongtinxe.`);
  }
}
function getOrCreateSubFolder(parentFolder, childFolderName) {
  const folders = parentFolder.getFoldersByName(childFolderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return parentFolder.createFolder(childFolderName);
  }
}
// [THAY THẾ TOÀN BỘ HÀM CŨ BẰNG HÀM NÀY]
function deleteDriveFileFromFormula(formulaString, orderNumber, fileTypeForLog) {
  if (!formulaString || !formulaString.toUpperCase().startsWith("=HYPERLINK")) {
    return; // Không có công thức hoặc không phải HYPERLINK, không cần làm gì
  }

  try {
    const urlMatch = formulaString.match(/=HYPERLINK\("([^"]+)"/i);
    if (urlMatch && urlMatch[1]) {
      const url = urlMatch[1];

      // ===== SỬA LỖI QUAN TRỌNG TẠI ĐÂY =====
      // Regex mới để tìm ID file từ cả 2 loại link: /d/FILE_ID/ hoặc id=FILE_ID
      const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]{25,})|id=([a-zA-Z0-9_-]{25,})/);

      if (fileIdMatch) {
        // ID của file sẽ nằm ở nhóm bắt thứ 1 hoặc thứ 2
        const fileId = fileIdMatch[1] || fileIdMatch[2];
        if (fileId) {
          DriveApp.getFileById(fileId).setTrashed(true); // Chuyển vào thùng rác
          logAction("Xóa file cũ thành công", `Đã chuyển vào thùng rác file ${fileTypeForLog} (ID: ${fileId}) của đơn hàng ${orderNumber}`);
        }
      } else {
        logAction("Không thể trích xuất File ID", `Không tìm thấy File ID trong URL: ${url}`);
      }
    }
  } catch (err) {
    logAction("Lỗi xóa file cũ", `Không thể xóa file ${fileTypeForLog} của đơn hàng ${orderNumber}. Lỗi: ${err.message}`);
    // Không dừng thực thi nếu không xóa được file cũ, vẫn cho phép tải file mới lên
  }
}
// [THAY THẾ TOÀN BỘ HÀM handleUploadIssuedInvoice CŨ]
function getEngineNumberForVin(thongtinxeSheet, vin) {
  const thongtinxeData = thongtinxeSheet.getDataRange().getValues();
  const thongtinxeHeaders = SHEET_HEADERS["Thongtinxe"];
  const vinCol = thongtinxeHeaders.indexOf("Số VIN");
  const soDongCoCol = thongtinxeHeaders.indexOf("Số động cơ");
  for (let i = 1; i < thongtinxeData.length; i++) {
    if (String(thongtinxeData[i][vinCol] || "").trim() === vin) {
      return String(thongtinxeData[i][soDongCoCol] || "").trim();
    }
  }
  return "";
}
function getDataVersion() {
  const scriptProperties = PropertiesService.getScriptProperties();
  return scriptProperties.getProperty('DATA_VERSION') || '0';
}


function getVehicleAnalytics() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const daGhepSheet = ss.getSheetByName(DA_GHEP_SHEET_NAME);
  const chuaGhepSheet = ss.getSheetByName(CHUA_GHEP_SHEET_NAME);
  const stockSheet = ss.getSheetByName(STOCK_SHEET_NAME);

  const analytics = {
    requestFrequency: {}, // Giữ nguyên: Tần suất yêu cầu (ghép và chờ ghép)
    stockStatus: {},      // Giữ nguyên: Tình trạng tồn kho
    // --- BẮT ĐẦU PHẦN BỔ SUNG ---
    pendingRequestCount: {} // MỚI: Chỉ đếm số lượng yêu cầu trong sheet "ChuaGhep"
    // --- KẾT THÚC PHẦN BỔ SUNG ---
  };

  // Hàm helper để tạo key duy nhất từ dòng xe, phiên bản và màu sắc
  const createVehicleKey = (dongXe, phienBan, ngoaiThat) => {
    if (!dongXe || !phienBan || !ngoaiThat) return null;
    return `${dongXe}|${phienBan}|${ngoaiThat}`.trim().toLowerCase();
  };

  // 1. Phân tích tần suất yêu cầu chung (giữ nguyên logic cũ)
  const sheetsToAnalyze = [daGhepSheet, chuaGhepSheet];
  sheetsToAnalyze.forEach(sheet => {
    if (sheet && sheet.getLastRow() > 1) {
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const dongXeCol = headers.indexOf("Dòng xe");
      const phienBanCol = headers.indexOf("Phiên bản");
      const ngoaiThatCol = headers.indexOf("Ngoại thất");

      if ([dongXeCol, phienBanCol, ngoaiThatCol].some(col => col === -1)) return;

      for (let i = 1; i < data.length; i++) {
        const key = createVehicleKey(data[i][dongXeCol], data[i][phienBanCol], data[i][ngoaiThatCol]);
        if (key) {
          analytics.requestFrequency[key] = (analytics.requestFrequency[key] || 0) + 1;
        }
      }
    }
  });

  // --- BẮT ĐẦU LOGIC MỚI: Đếm các yêu cầu đang chờ trong "ChuaGhep" ---
  if (chuaGhepSheet && chuaGhepSheet.getLastRow() > 1) {
    const data = chuaGhepSheet.getDataRange().getValues();
    const headers = data[0];
    const dongXeCol = headers.indexOf("Dòng xe");
    const phienBanCol = headers.indexOf("Phiên bản");
    const ngoaiThatCol = headers.indexOf("Ngoại thất");

    if (![dongXeCol, phienBanCol, ngoaiThatCol].some(col => col === -1)) {
      for (let i = 1; i < data.length; i++) {
        const key = createVehicleKey(data[i][dongXeCol], data[i][phienBanCol], data[i][ngoaiThatCol]);
        if (key) {
          // Chỉ tăng bộ đếm cho các yêu cầu đang chờ
          analytics.pendingRequestCount[key] = (analytics.pendingRequestCount[key] || 0) + 1;
        }
      }
    }
  }
  // --- KẾT THÚC LOGIC MỚI ---


  // 2. Phân tích tình trạng tồn kho từ sheet KhoXe (giữ nguyên logic cũ)
  if (stockSheet && stockSheet.getLastRow() > 1) {
    const stockData = stockSheet.getDataRange().getValues();
    const stockHeaders = stockData[0];
    const dongXeCol = stockHeaders.indexOf("Dòng xe");
    const phienBanCol = stockHeaders.indexOf("Phiên bản");
    const ngoaiThatCol = stockHeaders.indexOf("Ngoại thất");
    const statusCol = stockHeaders.indexOf("Trạng thái");
    const ngayNhapCol = stockHeaders.indexOf("Ngày nhập");

    if ([dongXeCol, phienBanCol, ngoaiThatCol, statusCol, ngayNhapCol].some(col => col === -1)) return analytics;

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    for (let i = 1; i < stockData.length; i++) {
      const key = createVehicleKey(stockData[i][dongXeCol], stockData[i][phienBanCol], stockData[i][ngoaiThatCol]);
      const status = String(stockData[i][statusCol] || '').trim().toLowerCase();
      const ngayNhap = new Date(stockData[i][ngayNhapCol]);

      if (key && status === 'chưa ghép') {
        if (!analytics.stockStatus[key]) {
          analytics.stockStatus[key] = { count: 0, isSlowMoving: false };
        }
        analytics.stockStatus[key].count++;

        if (ngayNhap && ngayNhap < ninetyDaysAgo) {
          analytics.stockStatus[key].isSlowMoving = true;
        }
      }
    }
  }

  return analytics;
}
// [THAY THẾ TOÀN BỘ HÀM CŨ]
function deleteCarFromStockLogic(vinToDelete, reason) {
  Logger.log(`DEBUG: Bắt đầu xóa xe ${vinToDelete} với lý do: "${reason}"`);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const stockSheet = getOrCreateSheet(ss, STOCK_SHEET_NAME, SHEET_HEADERS["KhoXe"]);
  const removedCarsLogSheet = getOrCreateSheet(ss, "removed_cars_log", SHEET_HEADERS["removed_cars_log"]);
  const userEmail = Session.getActiveUser().getEmail() || "Không xác định";

  const stockData = stockSheet.getDataRange().getValues();
  const actualStockHeaders = stockData[0]; // [SỬA LỖI] Lấy header thực tế từ sheet
  const vinColStock = actualStockHeaders.indexOf("VIN");

  if (vinColStock === -1) {
    return "Lỗi: Sheet KhoXe không có cột VIN.";
  }

  for (let i = 1; i < stockData.length; i++) {
    const currentRow = stockData[i];
    const currentVin = String(currentRow[vinColStock] || "").trim();

    if (currentVin === vinToDelete) {
      // [SỬA LỖI] Tạo object chi tiết xe bằng cách map header thực tế với giá trị
      const carToRemoveDetails = {};
      actualStockHeaders.forEach((header, index) => {
        if (header) carToRemoveDetails[header] = currentRow[index];
      });

      const logEntry = [
        formatDateTimeForSheet(new Date()),
        userEmail,
        carToRemoveDetails["Dòng xe"],
        carToRemoveDetails["Phiên bản"],
        carToRemoveDetails["Ngoại thất"],
        carToRemoveDetails["Nội thất"],
        vinToDelete,
        carToRemoveDetails["Mã DMS"], // Đọc đúng từ object chi tiết
        carToRemoveDetails["Trạng thái"],
        carToRemoveDetails["Ngày nhập"] ? formatDateTimeForSheet(new Date(carToRemoveDetails["Ngày nhập"])) : "",
        carToRemoveDetails["Đã thông báo"],
        reason || "Không có lý do"
      ];
      appendAndFormatRow(removedCarsLogSheet, logEntry);

      stockSheet.deleteRow(i + 1);

      recordVehicleHistory(vinToDelete, "Xóa Khỏi Kho", `Xe đã được xóa bởi ${userEmail}. Lý do: ${reason}`);
      logAction("Xóa Xe Thành Công", `VIN ${vinToDelete} đã được xóa khỏi KhoXe và ghi vào log.`);
      return `Xe với VIN ${vinToDelete} đã được xóa thành công khỏi kho!`;
    }
  }
  return `Không tìm thấy xe với VIN ${vinToDelete} trong KhoXe.`;
}

// [THAY THẾ TOÀN BỘ HÀM CŨ]
function deleteOrderLogic(orderNumber) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const deletedBy = Session.getActiveUser().getEmail() || "Admin Web App";

  const e_simulated = {
    parameter: {
      orderNumber: orderNumber,
      reason: "Xóa thủ công từ Web App",
      fromUI: 'true',
      cancelledBy: deletedBy
    }
  };

  // Gọi lại hàm handleCancelRequest vì logic cơ bản là giống nhau
  const resultJson = handleCancelRequest(
    e_simulated,
    getOrCreateSheet(ss, DA_GHEP_SHEET_NAME, SHEET_HEADERS["DaGhep"]),
    getOrCreateSheet(ss, CHUA_GHEP_SHEET_NAME, SHEET_HEADERS["ChuaGhep"]),
    getOrCreateSheet(ss, STOCK_SHEET_NAME, SHEET_HEADERS["KhoXe"]),
    getOrCreateSheet(ss, CANCELLED_SHEET_NAME, SHEET_HEADERS["HuyGhep"]),
    getOrCreateSheet(ss, MAIL_SHEET_NAME, SHEET_HEADERS["Mail"]),
    getOrCreateSheet(ss, XUAT_HOA_DON_SHEET_NAME, SHEET_HEADERS["Xuathoadon"])
  );

  const result = JSON.parse(resultJson.getContent());
  return result.message;
}

/**
 * [HÀM MỚI] - Xử lý logic xóa các đơn đã ghép của tháng trước.
 * @returns {string} - Thông báo kết quả.
 */
function deleteMonthlyInvoicedOrdersFromDaGhepLogic() {
  Logger.log("--- BẮT ĐẦU: deleteMonthlyInvoicedOrdersFromDaGhepLogic ---");
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const daGhepSheet = getOrCreateSheet(ss, DA_GHEP_SHEET_NAME, SHEET_HEADERS["DaGhep"]);

  if (daGhepSheet.getLastRow() <= 1) {
    return "Sheet DaGhep không có dữ liệu để dọn dẹp.";
  }

  const daGhepValues = daGhepSheet.getDataRange().getValues();
  const headers = daGhepValues[0];
  const ketQuaCol = headers.indexOf("Kết quả");
  const ngayXuatHDCol = headers.indexOf("Ngày xuất hóa đơn");

  if (ketQuaCol === -1 || ngayXuatHDCol === -1) {
    return "Lỗi: Không tìm thấy cột 'Kết quả' hoặc 'Ngày xuất hóa đơn' trong sheet DaGhep.";
  }

  const today = new Date();
  let previousMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);
  previousMonthDate.setDate(0);
  const targetYear = previousMonthDate.getFullYear();
  const targetMonth = previousMonthDate.getMonth(); // 0-indexed

  const rowIndicesToDelete = [];
  for (let i = 1; i < daGhepValues.length; i++) {
    const ketQua = String(daGhepValues[i][ketQuaCol] || "").trim();
    const ngayXuatHDValue = daGhepValues[i][ngayXuatHDCol];

    if (ketQua === "Đã xuất hóa đơn" && ngayXuatHDValue && (ngayXuatHDValue instanceof Date)) {
      if (ngayXuatHDValue.getFullYear() === targetYear && ngayXuatHDValue.getMonth() === targetMonth) {
        rowIndicesToDelete.push(i + 1);
      }
    }
  }

  if (rowIndicesToDelete.length > 0) {
    rowIndicesToDelete.sort((a, b) => b - a).forEach(rowIndex => {
      daGhepSheet.deleteRow(rowIndex);
    });
    const successMsg = `Đã xóa vĩnh viễn ${rowIndicesToDelete.length} đơn hàng (đã XHĐ tháng ${targetMonth + 1}/${targetYear}) khỏi sheet DaGhep.`;
    logAction("Xóa DaGhep (XHĐ Tháng Trước)", successMsg);
    return successMsg;
  } else {
    return `Không có đơn hàng nào trong DaGhep đã xuất hóa đơn của tháng ${targetMonth + 1}/${targetYear} để xóa.`;
  }
}
function addCarToStockLogic(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const stockSheet = getOrCreateSheet(ss, STOCK_SHEET_NAME, SHEET_HEADERS["KhoXe"]);
  const userEmail = Session.getActiveUser().getEmail() || "Admin Web App";

  // Lấy dữ liệu từ params gửi lên từ form
  const {
    vin,
    dongXe,
    phienBan,
    ngoaiThat,
    noiThat,
    maDMS
  } = params;

  // --- BƯỚC 1: Xác thực dữ liệu đầu vào ---
  if (!vin || vin.trim().length !== 17) {
    return "Lỗi: Số VIN không hợp lệ. Phải có đủ 17 ký tự.";
  }
  const vinToAdd = vin.trim().toUpperCase();

  const stockData = stockSheet.getDataRange().getValues();
  const stockHeaders = SHEET_HEADERS["KhoXe"];
  const vinColStock = stockHeaders.indexOf("VIN");

  // Kiểm tra xem VIN đã tồn tại trong kho chưa
  for (let i = 1; i < stockData.length; i++) {
    if (String(stockData[i][vinColStock] || "").trim().toUpperCase() === vinToAdd) {
      return `Lỗi: Xe với VIN ${vinToAdd} đã tồn tại trong KhoXe.`;
    }
  }

  // --- BƯỚC 2: Chuẩn bị dữ liệu cho dòng mới ---
  const newCarRowValues = stockHeaders.map(header => {
    switch (header) {
      case "Dòng xe": return dongXe || "";
      case "Phiên bản": return phienBan || "";
      case "Ngoại thất": return ngoaiThat || "";
      case "Nội thất": return noiThat || "";
      case "VIN": return vinToAdd;
      case "Mã DMS": return maDMS || "";
      case "Trạng thái": return "Chưa ghép"; // Trạng thái mặc định khi xe mới vào kho
      case "Ngày nhập": return new Date(); // Ghi nhận ngày giờ hiện tại
      case "Đã thông báo": return ""; // Mặc định là chưa thông báo
      default: return "";
    }
  });

  // --- BƯỚC 3: Thêm dòng mới vào sheet và ghi log ---
  appendAndFormatRow(stockSheet, newCarRowValues);
  // Định dạng lại cột ngày tháng cho đúng
  stockSheet.getRange(stockSheet.getLastRow(), stockHeaders.indexOf("Ngày nhập") + 1).setNumberFormat("dd/MM/yyyy hh:mm:ss");

  // Ghi lại lịch sử hoạt động
  recordVehicleHistory(vinToAdd, "Nhập Kho Mới", `Xe đã được thêm vào kho bởi ${userEmail} từ Web App.`);
  logAction("Thêm Xe Mới Thành Công", `VIN ${vinToAdd} đã được thêm vào KhoXe.`);

  // --- BƯỚC 4: Đồng bộ với Supabase ---
  try {
    const supabaseData = {
      vin: vinToAdd,
      dong_xe: dongXe || "",
      phien_ban: phienBan || "",
      ngoai_that: ngoaiThat || "",
      noi_that: noiThat || "",
      ma_dms: maDMS || "",
      trang_thai: "Chưa ghép",
      ngay_nhap: new Date().toISOString()
    };
    insertSupabase('khoxe', supabaseData);
  } catch (e) {
    Logger.log(`Lỗi đồng bộ Supabase khi thêm xe: ${e.message}`);
  }

  // Trả về thông báo thành công
  return `Xe với VIN ${vinToAdd} đã được thêm thành công vào kho!`;

}
// KHÔNG CẦN THAY ĐỔI GÌ TRONG HÀM NÀY, NÓ ĐÃ GỌI HÀM getThongtinxeData() CÓ CACHE.
function getCarInfoFromMasterData(vin) {
  try {
    if (!vin || String(vin).trim().length !== 17) {
      return { status: "ERROR", message: "Lỗi: Số VIN không hợp lệ." };
    }
    const vinToFind = String(vin).trim().toUpperCase();

    // Gọi đúng tên hàm mới có cache
    const data = getThongtinxeData();

    if (!data) {
      return { status: "ERROR", message: "Lỗi: Không thể đọc dữ liệu từ sheet Thongtinxe." };
    }
    const headers = data[0];

    const vinCol = headers.indexOf("Số VIN");
    const moTaSanPhamCol = headers.indexOf("Mô tả sản phẩm");
    const phienBanCol = headers.indexOf("Phiên bản");
    const ngoaiThatCol = headers.indexOf("Màu ngoại thất xe");
    const noiThatCol = headers.indexOf("Màu nội thất xe");
    const maDMSCol = headers.indexOf("Khu vực");
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][vinCol] || "").trim().toUpperCase() === vinToFind) {
        const rawNgoaiThat = data[i][ngoaiThatCol] || '';
        const standardizedNgoaiThat = findMatchedValidColor(rawNgoaiThat) || rawNgoaiThat;
        const carData = {
          dongXe: data[i][moTaSanPhamCol] || '',
          phienBan: data[i][phienBanCol] || '',
          ngoaiThat: standardizedNgoaiThat,
          noiThat: data[i][noiThatCol] || '',
          maDMS: data[i][maDMSCol] || ''
        };
        const moTa = String(carData.dongXe).toUpperCase();
        if (moTa.includes("VF 3")) {
          carData.dongXe = "VF 3";
          carData.phienBan = "Base";
          carData.noiThat = "Black";
        } else if (moTa.includes("VF 5")) {
          carData.dongXe = "VF 5";
          carData.phienBan = "Plus";
          carData.noiThat = "Black";
        }
        return { status: "SUCCESS", data: carData };
      }
    }
    Logger.log(`Không tìm thấy thông tin cho VIN ${vinToFind} trong Thongtinxe. Sẽ thêm xe với thông tin trống.`);
    return {
      status: "SUCCESS",
      data: { dongXe: "", phienBan: "", ngoaiThat: "", noiThat: "", maDMS: "" }
    };
  } catch (e) {
    Logger.log(`Lỗi trong getCarInfoFromMasterData: ${e.message}`);
    sendErrorAlert('getCarInfoFromMasterData', e);
    return { status: "ERROR", message: `Lỗi máy chủ: ${e.message}` };
  }
}
// KHÔNG CẦN THAY ĐỔI TRONG HÀM NÀY, NÓ VẪN HỮU ÍCH CHO VIỆC TÌM VÀ THÊM XE BẰNG VIN
function getThongtinxeDataWithCache() {
  const cache = CacheService.getScriptCache();
  const CACHE_KEY = 'THONGTINXE_DATA_V2'; // Dùng key mới để tránh xung đột
  const cachedData = cache.get(CACHE_KEY);

  if (cachedData != null) {
    Logger.log("Lấy dữ liệu Thongtinxe từ CACHE.");
    return JSON.parse(cachedData);
  }

  Logger.log("Lấy dữ liệu Thongtinxe từ SHEET và lưu vào cache.");
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const thongtinxeSheet = ss.getSheetByName(THONG_TIN_XE_SHEET_NAME);
  if (!thongtinxeSheet) return null;

  const data = thongtinxeSheet.getDataRange().getValues();
  // Lưu vào cache trong 1 giờ (3600 giây)
  cache.put(CACHE_KEY, JSON.stringify(data), 3600);
  return data;
}
function getFileBlobFromUrl(inputString) {
  if (!inputString) return null;

  let url = null;
  // Case 1: HYPERLINK formula
  if (String(inputString).toUpperCase().startsWith("=HYPERLINK")) {
    const urlMatch = String(inputString).match(/=HYPERLINK\("([^"]+)"/i);
    if (urlMatch && urlMatch[1]) {
      url = urlMatch[1];
    }
  } else if (String(inputString).startsWith("http")) {
    // Case 2: Plain URL
    url = String(inputString).trim();
  }

  if (!url) return null;

  try {
    // Try to extract Google Drive File ID
    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]{25,})|id=([a-zA-Z0-9_-]{25,})/);
    if (fileIdMatch) {
      const fileId = fileIdMatch[1] || fileIdMatch[2];
      if (fileId) {
        return DriveApp.getFileById(fileId).getBlob();
      }
    }

    // Fallback: If it's a plain URL (like Supabase), try to fetch it directly
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (response.getResponseCode() === 200) {
      return response.getBlob();
    } else {
      logAction("Lỗi getFileBlobFromUrl", `Không thể fetch URL: ${url}. Status loop: ${response.getResponseCode()}`);
    }
  } catch (e) {
    logAction("Lỗi getFileBlobFromUrl", `Không thể lấy file từ: ${inputString}. Lỗi: ${e.message}`);
    return null;
  }
  return null;
}

function getOrderHistory(orderNumber) {
  if (!orderNumber) {
    return [];
  }
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const historySheet = ss.getSheetByName("lichsu_donhang");
    if (!historySheet) return [];

    const data = historySheet.getDataRange().getValues();
    const headers = data[0];
    const orderColIndex = headers.indexOf("Số đơn hàng");

    if (orderColIndex === -1) return [];

    const filteredData = data.slice(1).filter(row => String(row[orderColIndex]).trim() === String(orderNumber).trim());

    // Sắp xếp theo thời gian từ cũ nhất đến mới nhất
    filteredData.sort((a, b) => new Date(a[0]) - new Date(b[0]));

    const result = filteredData.map(row => {
      const rowObject = {};
      headers.forEach((header, index) => {
        rowObject[header] = row[index];
      });
      return rowObject;
    });

    return result;
  } catch (e) {
    logAction("Lỗi getOrderHistory", `Lỗi khi lấy lịch sử cho ĐH ${orderNumber}: ${e.message}`);
    return [];
  }
}
function getGeminiChatResponse(userMessage, pageContext) {
  try {
    if (!userMessage || !pageContext) {
      throw new Error("Tin nhắn hoặc bối cảnh trang không được cung cấp.");
    }

    // Xây dựng prompt chi tiết cho Gemini
    const finalPrompt = `Bạn là một trợ lý ảo am hiểu về các chính sách của VinFast được cung cấp trong ngữ cảnh sau. Dựa vào nội dung dưới đây để trả lời câu hỏi của người dùng một cách ngắn gọn, chính xác và thân thiện. Không tự bịa ra thông tin không có trong văn bản.

    --- Bối cảnh chính sách ---
    ${pageContext}
    --- Hết bối cảnh ---

    Câu hỏi của người dùng: "${userMessage}"`;

    // Gọi hàm callGeminiAPI đã có sẵn trong code của bạn
    const response = callGeminiAPI(finalPrompt);[cite_start]// [cite: 2088]
    return response;

  } catch (e) {
    Logger.log(`Lỗi trong getGeminiChatResponse: ${e.message}`);
    // Trả về một thông báo lỗi thân thiện cho người dùng
    return "Xin lỗi, đã có lỗi xảy ra khi kết nối với trợ lý AI. Vui lòng thử lại sau.";
  }
}
/**
 * Tìm và xóa sheet có tên là "CocXe" khỏi spreadsheet hiện tại.
 */
function deleteCocXeSheet() {
  try {
    [cite_start]// Lấy spreadsheet đang hoạt động bằng ID đã được khai báo [cite: 1]
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    [cite_start]// Lấy sheet cần xóa bằng tên đã được khai báo [cite: 2]
    const sheetToDelete = ss.getSheetByName(COC_XE_SHEET_NAME);

    // Kiểm tra xem sheet có tồn tại không
    if (sheetToDelete) {
      // Nếu có, thực hiện xóa sheet
      ss.deleteSheet(sheetToDelete);

      // Hiển thị thông báo thành công cho người dùng
      SpreadsheetApp.getUi().alert(`Sheet "${COC_XE_SHEET_NAME}" đã được xóa thành công!`);
      Logger.log(`Sheet '${COC_XE_SHEET_NAME}' đã được xóa.`);
    } else {
      // Nếu không tìm thấy, thông báo cho người dùng
      SpreadsheetApp.getUi().alert(`Không tìm thấy sheet với tên "${COC_XE_SHEET_NAME}".`);
      Logger.log(`Không tìm thấy sheet '${COC_XE_SHEET_NAME}' để xóa.`);
    }
  } catch (e) {
    // Bắt và ghi lại bất kỳ lỗi nào xảy ra trong quá trình
    Logger.log(`Đã xảy ra lỗi khi xóa sheet 'CocXe': ${e.message}`);

    [cite_start]// Gửi email báo lỗi cho quản trị viên [cite: 185, 1795]
    sendErrorAlert('deleteCocXeSheet', e);

    // Hiển thị thông báo lỗi cho người dùng
    SpreadsheetApp.getUi().alert(`Đã xảy ra lỗi khi cố gắng xóa sheet: ${e.message}`);
  }
}
function updateCellAndLog(sheet, row, col, newValue, user, actionId, nhatKyChinhSuaSheet) {
  const cell = sheet.getRange(row, col);
  const oldValue = cell.getValue();
  const oldValueStr = oldValue !== undefined ? String(oldValue) : "[Ô trống]";
  const newValueStr = newValue !== undefined ? String(newValue) : "[Ô trống]";

  if (oldValueStr !== newValueStr) {
    cell.setValue(newValue);
    if (nhatKyChinhSuaSheet) {
      nhatKyChinhSuaSheet.appendRow([
        new Date(), user, sheet.getName(), cell.getA1Notation(),
        oldValueStr, newValueStr, actionId, ""
      ]);
    }
  }
}
/**
 * [HÀM MỚI] - Tìm và hoàn tác trạng thái gần nhất của một đơn hàng dựa trên nhật ký chỉnh sửa.
 * @param {string} orderNumber - Số đơn hàng cần hoàn tác.
 * @param {string} userEmail - Email của người thực hiện.
 * @returns {object} - Đối tượng chứa thông báo kết quả.
 */
function getAllSheetDataWithHyperlink(sheet) {
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const formulas = dataRange.getFormulas();
  const headers = values[0].map(header => header.trim());
  const data = [];

  for (let i = 1; i < values.length; i++) {
    const rowObject = {};
    for (let j = 0; j < headers.length; j++) {
      const headerName = headers[j];
      const formula = formulas[i][j];
      if (formula && formula.toUpperCase().startsWith("=HYPERLINK")) {
        const urlMatch = formula.match(/=HYPERLINK\("([^"]+)"/i);
        rowObject[headerName] = urlMatch ? urlMatch[1] : "";
      } else {
        rowObject[headerName] = values[i][j];
      }
    }
    data.push(rowObject);
  }

  return data;
}




function getPaginatedData(params) {
  try {
    const currentUser = params.currentUser;
    const isAdmin = params.isAdmin === 'true';
    const filtersParam = params.filters ? JSON.parse(params.filters) : {};
    const usersToView = filtersParam.usersToView || [];

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const daGhepSheet = ss.getSheetByName(DA_GHEP_SHEET_NAME);
    const chuaGhepSheet = ss.getSheetByName(CHUA_GHEP_SHEET_NAME);

    // --- BẮT ĐẦU KHU VỰC SỬA LỖI ---
    let daGhepData = [];
    if (daGhepSheet) {
      // 1. Lấy tên header của cột M (chỉ số 12)
      const daGhepHeaders = daGhepSheet.getRange(1, 1, 1, daGhepSheet.getLastColumn()).getValues()[0];
      const vcStatusHeaderFromColM = daGhepHeaders[12];

      // 2. Sử dụng lại hàm gốc để lấy dữ liệu, tránh lỗi type
      const daGhepDataObjects = getAllSheetData(daGhepSheet);

      // 3. Cập nhật trạng thái VC bằng giá trị từ cột M
      daGhepData = daGhepDataObjects.map(row => {
        let vcStatus = "";
        if (vcStatusHeaderFromColM && row[vcStatusHeaderFromColM]) {
          vcStatus = row[vcStatusHeaderFromColM];
        } else if (row["Trạng thái VC"]) {
          vcStatus = row["Trạng thái VC"];
        }
        row["Trạng thái VC"] = vcStatus; // Ghi đè lại trạng thái VC trong object
        return row;
      });
    }
    // --- KẾT THÚC KHU VỰC SỬA LỖI ---

    const chuaGhepData = getAllSheetData(chuaGhepSheet);
    let combinedData = [...daGhepData, ...chuaGhepData];

    // Phần logic còn lại của hàm được giữ nguyên
    let filteredData;
    if (isAdmin) {
      filteredData = combinedData;
    } else if (usersToView && usersToView.length > 0) {
      const usersSet = new Set(usersToView.map(normalizeNameGas));
      filteredData = combinedData.filter(row => {
        const tvbhName = normalizeNameGas(row["Tên tư vấn bán hàng"]);
        return usersSet.has(tvbhName);
      });
    } else {
      const currentUserNormalized = normalizeNameGas(currentUser);
      filteredData = combinedData.filter(row => {
        const tvbhName = normalizeNameGas(row["Tên tư vấn bán hàng"]);
        return tvbhName === currentUserNormalized;
      });
    }

    const sortBy = params.sortBy || 'Thời gian nhập';
    const sortOrder = params.sortOrder || 'desc';
    filteredData.sort((a, b) => {
      let valA = a[sortBy] ?? "";
      let valB = b[sortBy] ?? "";
      if (['Ngày cọc', 'Thời gian nhập', 'Thời gian ghép'].includes(sortBy)) {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const page = parseInt(params.page, 10) || 1;
    const pageSize = parseInt(params.pageSize, 10) || 50;
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

    const totalDataForAllUsers = [...daGhepData, ...chuaGhepData];
    const summary = { topCar: "N/A", topAdvisor: "N/A" };
    if (totalDataForAllUsers.length > 0) {
      const carCounts = totalDataForAllUsers.reduce((acc, row) => {
        if (row["Dòng xe"]) acc[row["Dòng xe"]] = (acc[row["Dòng xe"]] || 0) + 1;
        return acc;
      }, {});
      const topCarEntry = Object.entries(carCounts).sort((a, b) => b[1] - a[1])[0];
      if (topCarEntry) summary.topCar = `${topCarEntry[0]} (${topCarEntry[1]})`;
      const advisorCounts = totalDataForAllUsers.reduce((acc, row) => {
        if (row["Tên tư vấn bán hàng"]) acc[row["Tên tư vấn bán hàng"]] = (acc[row["Tên tư vấn bán hàng"]] || 0) + 1;
        return acc;
      }, {});
      const topAdvisorEntry = Object.entries(advisorCounts).sort((a, b) => b[1] - a[1])[0];
      if (topAdvisorEntry) summary.topAdvisor = `${topAdvisorEntry[0]} (${topAdvisorEntry[1]})`;
    }

    return createJsonResponse({
      status: "SUCCESS",
      data: paginatedData,
      totalItems: totalItems,
      totalPages: totalPages,
      currentPage: page,
      summary: summary
    });
  } catch (e) {
    Logger.log(`Lỗi trong getPaginatedData: ${e.message}, Stack: ${e.stack}`);
    sendErrorAlert('getPaginatedData', e);
    return createJsonResponse({ status: "ERROR", message: `Lỗi máy chủ khi lấy dữ liệu: ${e.message}` });
  }
}
// [THAY THẾ] - Toàn bộ hàm getArchivedDataPage cũ bằng phiên bản có lọc theo người dùng
function getArchivedDataPage(params) {
  try {
    const page = parseInt(params.page, 10) || 1;
    const pageSize = 100;
    let currentArchiveName = params.archiveSheetName;

    // [NÂNG CẤP] - Lấy thông tin người dùng từ request
    const currentUser = params.currentUser;
    const isAdmin = params.isAdmin === 'true';

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const allSheets = ss.getSheets();
    const archiveSheetRegex = /^LuuTru_\d{4}_\d{2}$/;

    const sortedArchiveSheets = allSheets
      .filter(sheet => archiveSheetRegex.test(sheet.getName()))
      .sort((a, b) => b.getName().localeCompare(a.getName()));

    if (sortedArchiveSheets.length === 0) {
      return createJsonResponse({ status: "SUCCESS", data: [], isLastArchive: true });
    }

    if (!currentArchiveName) {
      currentArchiveName = sortedArchiveSheets[0].getName();
    }

    const currentArchiveSheet = ss.getSheetByName(currentArchiveName);
    if (!currentArchiveSheet) {
      throw new Error(`Không tìm thấy sheet lưu trữ: ${currentArchiveName}`);
    }

    const rawArchiveData = getAllSheetData(currentArchiveSheet);

    // [NÂNG CẤP] - Lọc dữ liệu nếu người dùng không phải là Admin
    let filteredData = rawArchiveData;
    if (!isAdmin && currentUser) {
      const normalizedCurrentUser = normalizeString(currentUser);
      filteredData = rawArchiveData.filter(row => {
        const tvbh = row["TƯ VẤN BÁN HÀNG"] || "";
        return normalizeString(tvbh) === normalizedCurrentUser;
      });
    }

    // Chuẩn hóa dữ liệu sau khi đã lọc
    const archiveData = filteredData.map(row => {
      return {
        "Tên khách hàng": row["TÊN KHÁCH HÀNG"],
        "Số đơn hàng": row["SỐ ĐƠN HÀNG"],
        "Tên tư vấn bán hàng": row["TƯ VẤN BÁN HÀNG"],
        "Dòng xe": row["DÒNG XE"],
        "Phiên bản": row["PHIÊN BẢN"],
        "Ngoại thất": row["NGOẠI THẤT"],
        "Nội thất": row["NỘI THẤT"],
        "VIN": row["SỐ VIN"],
        "Kết quả": "Đã xuất hóa đơn",
        "Ngày xuất hóa đơn": row["NGÀY XUẤT HÓA ĐƠN"],
        "Thời gian nhập": row["NGÀY YÊU CẦU XHĐ"],
      };
    });

    const totalItemsInArchive = archiveData.length;
    const totalPagesInArchive = Math.ceil(totalItemsInArchive / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedData = archiveData.slice(startIndex, startIndex + pageSize);

    let nextArchiveSheetName = null;
    let isLastPageOfCurrentArchive = (page >= totalPagesInArchive);
    let isLastArchiveOverall = false;

    if (isLastPageOfCurrentArchive) {
      const currentIndex = sortedArchiveSheets.findIndex(s => s.getName() === currentArchiveName);
      if (currentIndex > -1 && currentIndex + 1 < sortedArchiveSheets.length) {
        nextArchiveSheetName = sortedArchiveSheets[currentIndex + 1].getName();
      } else {
        isLastArchiveOverall = true;
      }
    }

    return createJsonResponse({
      status: "SUCCESS",
      data: paginatedData,
      currentArchiveSheetName: currentArchiveName,
      nextArchiveSheetName: nextArchiveSheetName,
      isLastArchive: isLastArchiveOverall && isLastPageOfCurrentArchive
    });

  } catch (e) {
    Logger.log(`Lỗi trong getArchivedDataPage: ${e.message}`);
    return createJsonResponse({ status: "ERROR", message: e.message });
  }
}
/**
 * [SỬA LỖI TRIỆT ĐỂ] Lấy toàn bộ dữ liệu lưu trữ cho người dùng.
 * - Sửa lỗi "toLowerCase" bằng cách ép buộc tất cả các giá trị trả về thành chuỗi (string).
 * - Vẫn ưu tiên lấy trạng thái VC từ cột U của các sheet LuuTru.
 */
function getAllArchivedDataForUser(params) {
  try {
    const currentUser = params.currentUser;
    const isAdmin = params.isAdmin === 'true';

    if (!currentUser || isAdmin) {
      return createJsonResponse({ status: "SUCCESS", data: [] });
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const allSheets = ss.getSheets();
    const archiveSheetRegex = /^LuuTru_\d{4}_\d{2}$/;
    const sortedArchiveSheets = allSheets
      .filter(sheet => archiveSheetRegex.test(sheet.getName()))
      .sort((a, b) => b.getName().localeCompare(a.getName()));

    if (sortedArchiveSheets.length === 0) {
      return createJsonResponse({ status: "SUCCESS", data: [] });
    }

    let allUserArchives = [];
    const normalizedCurrentUser = normalizeString(currentUser);

    for (const sheet of sortedArchiveSheets) {
      if (sheet.getLastRow() < 2) continue;

      // Lấy headers và dữ liệu bằng hàm gốc để đảm bảo tính toàn vẹn
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const vcStatusHeaderFromColU = headers[20]; // Header của Cột U
      const rawArchiveData = getAllSheetDataWithHyperlink(sheet);

      const filteredData = rawArchiveData.filter(row => {
        const tvbh = row["TƯ VẤN BÁN HÀNG"] || "";
        return normalizeString(String(tvbh)) === normalizedCurrentUser; // Chuyển tvbh thành string trước khi so sánh
      });

      // --- BẮT ĐẦU KHU VỰC SỬA LỖI QUAN TRỌNG ---
      // Ánh xạ lại dữ liệu, đảm bảo MỌI TRƯỜNG đều là chuỗi (string)
      const mappedData = filteredData.map(row => {
        let vcStatus = "";
        if (vcStatusHeaderFromColU && row[vcStatusHeaderFromColU]) {
          vcStatus = row[vcStatusHeaderFromColU];
        } else if (row["Trạng thái VC"]) {
          vcStatus = row["Trạng thái VC"];
        }

        return {
          "Tên khách hàng": String(row["TÊN KHÁCH HÀNG"] || ""),
          "Số đơn hàng": String(row["SỐ ĐƠN HÀNG"] || ""),
          "Tên tư vấn bán hàng": String(row["TƯ VẤN BÁN HÀNG"] || ""),
          "Dòng xe": String(row["DÒNG XE"] || ""),
          "Phiên bản": String(row["PHIÊN BẢN"] || ""),
          "Ngoại thất": String(row["NGOẠI THẤT"] || ""),
          "Nội thất": String(row["NỘI THẤT"] || ""),
          "VIN": String(row["SỐ VIN"] || ""),
          "Kết quả": "Đã xuất hóa đơn",
          "Trạng thái VC": String(vcStatus || ""),
          "Ngày xuất hóa đơn": String(row["NGÀY XUẤT HÓA ĐƠN"] || ""),
          "Thời gian nhập": String(row["NGÀY YÊU CẦU XHĐ"] || ""),
          "LinkHoaDonDaXuat": String(row["URL Hóa Đơn Đã Xuất"] || "")
        };
      });
      // --- KẾT THÚC KHU VỰC SỬA LỖI QUAN TRỌNG ---

      if (mappedData.length > 0) {
        allUserArchives.push(...mappedData);
      }
    }

    return createJsonResponse({ status: "SUCCESS", data: allUserArchives });
  } catch (e) {
    Logger.log(`Lỗi trong getAllArchivedDataForUser: ${e.message} Stack: ${e.stack}`);
    return createJsonResponse({ status: "ERROR", message: e.message });
  }
}
function getOrCreateFolderByPath(rootFolder, path) {
  let currentFolder = rootFolder;
  path.split('/').forEach(part => {
    if (part) {
      const iterator = currentFolder.getFoldersByName(part);
      currentFolder = iterator.hasNext() ? iterator.next() : currentFolder.createFolder(part);
    }
  });
  return currentFolder;
}

function findOrderInSheetSimple(orderNumber, sheetsToSearch) {
  const normalizedOrder = String(orderNumber).trim();
  for (const sheet of sheetsToSearch) {
    if (!sheet) continue;

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) continue;

    const headers = data[0];
    const orderCol = headers.indexOf("Số đơn hàng");
    if (orderCol === -1) continue;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][orderCol]).trim() === normalizedOrder) {
        // Tìm thấy! Trả về đối tượng đầy đủ
        const rowData = {};
        headers.forEach((header, index) => {
          rowData[header] = data[i][index];
        });

        return {
          sheet: sheet,
          rowIndex: i + 1, // 1-based index
          rowData: rowData // Dữ liệu hàng dưới dạng object
        };
      }
    }
  }
  return null; // Không tìm thấy
}

/**
 * [HÀM HỖ TRỢ MỚI] - Cập nhật một hàng trong sheet và ghi lại nhật ký.
 * Hàm này thay thế việc lặp lại logic ghi đè và ghi log.
 */
function updateRowInSheet(sheet, rowIndex, headers, newRowObject, oldRowData, user, actionId, nhatKyChinhSuaSheet) {
  const newRowValues = [];
  const changesToLog = [];

  // Xây dựng mảng giá trị mới theo đúng thứ tự của header
  headers.forEach((header, index) => {
    const newValue = newRowObject[header];
    const oldValue = oldRowData[header];
    newRowValues.push(newValue);

    // Chuẩn bị log thay đổi
    if (String(oldValue) !== String(newValue)) {
      changesToLog.push({
        cellA1: sheet.getRange(rowIndex, index + 1).getA1Notation(),
        oldValue: oldValue,
        newValue: newValue
      });
    }
  });

  // Ghi đè toàn bộ hàng bằng dữ liệu mới
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([newRowValues]);

  // Ghi lại từng thay đổi vào nhật ký
  const timestamp = new Date();
  const logEntries = changesToLog.map(change => [
    timestamp,
    user,
    sheet.getName(),
    change.cellA1,
    String(change.oldValue),
    String(change.newValue),
    actionId,
    ""
  ]);

  if (logEntries.length > 0) {
    nhatKyChinhSuaSheet.getRange(nhatKyChinhSuaSheet.getLastRow() + 1, 1, logEntries.length, logEntries[0].length).setValues(logEntries);
  }
}
function recordUserPresence(userEmail) {
  if (!userEmail) return;
  try {
    // Sử dụng ScriptProperties để lưu trữ chung cho toàn bộ script
    const scriptProperties = PropertiesService.getScriptProperties();
    const key = PRESENCE_PREFIX + userEmail;
    // Ghi đè dấu thời gian mới nhất
    scriptProperties.setProperty(key, new Date().toISOString());
  } catch (e) {
    Logger.log(`Lỗi khi ghi lại sự hiện diện của ${userEmail}: ${e.message}`);
  }
}

/**
 * [HÀM MỚI] Lấy danh sách người dùng đang hoạt động (cho Admin).
 * [ĐÃ NÂNG CẤP] - Trả về cả tên đầy đủ (FullName) thay vì chỉ email.
 */
function getActiveUsers() {
  try {
    // ----- BẮT ĐẦU NÂNG CẤP -----
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const userSheet = ss.getSheetByName(USER_SHEET_NAME); // Lấy sheet Users [cite: 4]
    if (!userSheet) {
      throw new Error("Không tìm thấy User Sheet.");
    }
    // ----- KẾT THÚC NÂNG CẤP -----

    const scriptProperties = PropertiesService.getScriptProperties();
    const allKeys = scriptProperties.getKeys();
    const now = new Date().getTime();
    const expiryMs = PRESENCE_EXPIRY_MINUTES * 60 * 1000;
    const activeUsers = [];
    const keysToDelete = [];

    for (const key of allKeys) {
      if (key.startsWith(PRESENCE_PREFIX)) { // [cite: 2898]
        const email = key.replace(PRESENCE_PREFIX, ''); // Đây là email
        const lastSeenIso = scriptProperties.getProperty(key);
        const lastSeenTime = new Date(lastSeenIso).getTime();

        if (now - lastSeenTime < expiryMs) {
          // Vẫn còn hoạt động

          // ----- BẮT ĐẦU NÂNG CẤP -----
          const user = findUserByEmail(userSheet, email); // Tìm thông tin user [cite: 2836]
          const fullName = user ? user.fullName : null; // Lấy tên đầy đủ

          activeUsers.push({
            email: email,
            fullName: fullName, // Trả về thêm fullName
            lastSeen: lastSeenIso
          });
          // ----- KẾT THÚC NÂNG CẤP -----
        } else {
          // Hết hạn, thêm vào danh sách dọn dẹp
          keysToDelete.push(key);
        }
      }
    }

    // Dọn dẹp các key đã hết hạn (chỉ khi có key để xóa)
    if (keysToDelete.length > 0) {
      scriptProperties.deleteProperties(keysToDelete);
      Logger.log(`Dọn dẹp ${keysToDelete.length} key "presence" đã hết hạn.`);
    }

    return { status: "SUCCESS", users: activeUsers };
  } catch (e) {
    Logger.log(`Lỗi khi lấy danh sách người dùng hoạt động: ${e.message}`);
    return { status: "ERROR", message: e.message };
  }
}
/**
 * Hàm này dùng để lấy các sheet cần thiết và gọi hàm syncKhoxeStatus.
 * Chỉ nên chạy thủ công (Manual Run) hoặc đặt làm Trigger định kỳ.
 */
function recordUserPresence(email) {
  if (!email) return;
  try {
    const props = PropertiesService.getScriptProperties();
    const key = 'active_user_' + email.trim().toLowerCase();
    const timestamp = new Date().getTime().toString();
    props.setProperty(key, timestamp);
  } catch (e) {
    Logger.log('Error recording presence for ' + email + ': ' + e.message);
  }
}

function getActiveUsers() {
  const props = PropertiesService.getScriptProperties();
  const allProps = props.getProperties();
  const now = new Date().getTime();
  // Threshold: 5 minutes (plus small buffer)
  const threshold = 5 * 60 * 1000;

  const onlineList = [];
  const keysToDelete = [];

  // 1. Get User Map for Full Names (Optimization)
  const userSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users"); // Hardcoded or use constant if available
  let userMap = {};

  if (userSheet) {
    // Assuming headers are standard: [Username, Pass, FullName, Role, Email, ...]
    // We'll try to find the Email and FullName columns dynamically or fallback to known indices
    const data = userSheet.getDataRange().getValues();
    if (data.length > 0) {
      const headers = data[0];
      // Find indices
      let emailIdx = -1;
      let nameIdx = -1;

      for (let i = 0; i < headers.length; i++) {
        const h = String(headers[i]).toLowerCase();
        if (h.includes('email')) emailIdx = i;
        if (h.includes('name') || h.includes('tên')) nameIdx = i;
      }

      // Fallback if not found (based to known structure in setupInitialAdminUser)
      if (emailIdx === -1) emailIdx = 4;
      if (nameIdx === -1) nameIdx = 2;

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[emailIdx]) {
          userMap[String(row[emailIdx]).trim().toLowerCase()] = row[nameIdx];
        }
      }
    }
  }

  // 2. Filter Active Users
  for (const key in allProps) {
    if (key.startsWith('active_user_')) {
      const timestamp = parseInt(allProps[key]);
      // Check if valid timestamp
      if (!isNaN(timestamp)) {
        if (now - timestamp <= threshold) {
          const email = key.replace('active_user_', '');
          onlineList.push({
            email: email,
            fullName: userMap[email] || email,
            lastSeen: new Date(timestamp).toISOString()
          });
        } else {
          // Mark for deletion if older than threshold
          keysToDelete.push(key);
        }
      } else {
        // Invalid format, delete
        keysToDelete.push(key);
      }
    }
  }

  // 3. Cleanup Stale Data
  if (keysToDelete.length > 0) {
    try {
      // Batch delete is consistent and reduces property store clutter
      props.deleteProperties(keysToDelete);
    } catch (e) {
      Logger.log('Error cleaning up active users: ' + e.message);
    }
  }

  // Sort by Last Seen (descending - most recent first)
  onlineList.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());

  return { status: 'SUCCESS', data: onlineList };
}
function getChatReadStatus() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const chatSheet = ss.getSheetByName(CHAT_SHEET_NAME);

  if (!chatSheet) return {};

  const statusCell = chatSheet.getRange(1, 26);
  const currentContent = statusCell.getValue();

  try {
    if (currentContent && currentContent.startsWith('{')) {
      return JSON.parse(currentContent);
    }
  } catch (e) {
    return {};
  }

  return {};
}

/**
 * Toggle cảm xúc cho một tin nhắn trong chat nội bộ
 */