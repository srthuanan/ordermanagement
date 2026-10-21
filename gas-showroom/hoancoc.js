// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// HÀM CHÍNH ĐỂ CẬP NHẬT VÀ GHI KẾT QUẢ ĐẾM TVBH
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
function updateTVBHCountsLogic(isAutomaticRun) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = "Hoàn cọc"; // <-- TÊN SHEET CỦA BẠN
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    if (!isAutomaticRun) {
      SpreadsheetApp.getUi().alert("Không tìm thấy sheet có tên '" + sheetName + "'. Vui lòng kiểm tra lại.");
    } else {
      console.error("Sheet '" + sheetName + "' không tìm thấy cho tự động cập nhật.");
    }
    return;
  }

  var tvbhColumnIndex = 4; // Cột D là cột TVBH. Nếu là cột C -> 3, E -> 5, v.v.
  var headerRows = 1;      // Số dòng tiêu đề

  var lastRow = sheet.getLastRow();

  // Xác định vị trí cột để ghi kết quả
  var outputStartColumn = determineOutputStartColumn(sheet);
  if (outputStartColumn === -1) { // Không tìm thấy chỗ ghi
    if (!isAutomaticRun) {
      SpreadsheetApp.getUi().alert("Không tìm thấy đủ 2 cột trống liền kề trên sheet '" + sheetName + "' để ghi kết quả. Vui lòng dọn dẹp sheet.");
    } else {
      console.error("Không tìm thấy đủ 2 cột trống để ghi kết quả tự động trên sheet '" + sheetName + "'.");
    }
    return;
  }
  
  // Xóa nội dung cũ ở vùng sẽ ghi kết quả trước
  clearOutputArea(sheet, outputStartColumn);

  if (lastRow <= headerRows) { // Không có dữ liệu để đếm
    if (!isAutomaticRun) {
      SpreadsheetApp.getUi().alert("Không có dữ liệu TVBH để đếm trên sheet '" + sheetName + "'. Bảng thống kê đã được dọn dẹp (nếu có).");
    } else {
      console.log("Không có dữ liệu TVBH để đếm trên sheet '" + sheetName + "' (tự động).");
    }
    // Ghi lại tiêu đề cho bảng trống
    sheet.getRange(1, outputStartColumn, 1, 2).setValues([["TVBH", "Số lượng hoàn cọc"]]).setFontWeight("bold");
    return;
  }

  if (tvbhColumnIndex > sheet.getLastColumn() && sheet.getLastColumn() > 0) {
    if (!isAutomaticRun) {
      SpreadsheetApp.getUi().alert("Chỉ số cột TVBH (" + tvbhColumnIndex + ") không hợp lệ so với số cột dữ liệu (" + sheet.getLastColumn() + ") trên sheet '" + sheetName + "'.");
    } else {
      console.error("Chỉ số cột TVBH không hợp lệ cho cập nhật tự động.");
    }
    return;
  }

  var tvbhDataRange = sheet.getRange(headerRows + 1, tvbhColumnIndex, lastRow - headerRows, 1);
  var tvbhValues = tvbhDataRange.getValues();

  var tvbhCounts = {};
  for (var i = 0; i < tvbhValues.length; i++) {
    var tvbhName = tvbhValues[i][0];
    if (tvbhName && tvbhName.toString().trim() !== "") {
      if (tvbhCounts[tvbhName]) {
        tvbhCounts[tvbhName]++;
      } else {
        tvbhCounts[tvbhName] = 1;
      }
    }
  }

  var outputArray = [["TVBH", "Số lượng hoàn cọc"]]; // Tiêu đề cột khớp với code của bạn
  for (var name in tvbhCounts) {
    if (tvbhCounts.hasOwnProperty(name)) {
      outputArray.push([name, tvbhCounts[name]]);
    }
  }

  if (outputArray.length <= 1) { // Chỉ có tiêu đề, không có TVBH nào được đếm
    if (!isAutomaticRun) {
      SpreadsheetApp.getUi().alert("Không tìm thấy tên TVBH nào hợp lệ để thống kê trên sheet '" + sheetName + "'.");
    } else {
      console.log("Không có tên TVBH hợp lệ để thống kê tự động.");
    }
    // Ghi lại tiêu đề cho bảng trống (đã được clearOutputArea xử lý hoặc làm ở trên nếu lastRow <= headerRows)
    sheet.getRange(1, outputStartColumn, 1, 2).setValues([["TVBH", "Số lượng hoàn cọc"]]).setFontWeight("bold");
    return;
  }

  var dataRows = outputArray.slice(1);
  dataRows.sort(function(a, b) {
    return b[1] - a[1]; // Sắp xếp theo cột "Số lượng hoàn cọc" (index 1) giảm dần
  });
  outputArray = [outputArray[0]].concat(dataRows);

  // Ghi bảng kết quả mới
  sheet.getRange(1, outputStartColumn, outputArray.length, 2).setValues(outputArray);
  sheet.getRange(1, outputStartColumn, 1, 2).setFontWeight("bold"); // In đậm tiêu đề

  if (!isAutomaticRun) {
    SpreadsheetApp.getUi().alert("Đã đếm và hiển thị số lượng hoàn cọc của TVBH trên sheet '" + sheetName + "', bắt đầu từ cột " + sheet.getRange(1, outputStartColumn).getA1Notation().charAt(0) + ".");
  } else {
    console.log("Tự động cập nhật số lượng hoàn cọc TVBH trên sheet '" + sheetName + "' thành công.");
  }
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// HÀM PHỤ TRỢ
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
function determineOutputStartColumn(sheet) {
  var lastDataCol = sheet.getLastColumn();
  var outputStartCol;

  if (lastDataCol === 0) { // Sheet trống hoàn toàn
    outputStartCol = 1; // Bắt đầu từ cột A
  } else {
    outputStartCol = lastDataCol + 2; // Cách 2 cột so với dữ liệu cuối
  }

  // Nếu vị trí đề xuất vượt quá giới hạn hoặc không đủ 2 cột
  if (outputStartCol >= sheet.getMaxColumns()) { 
    outputStartCol = 7; // Thử từ cột G (7)
    while (outputStartCol <= sheet.getMaxColumns() - 1 && // Còn trong giới hạn 2 cột
           (!sheet.getRange(1, outputStartCol).isBlank() || !sheet.getRange(1, outputStartCol + 1).isBlank())) {
      outputStartCol += 2; // Tìm 2 cột trống tiếp theo
    }
  }
  
  // Nếu vẫn vượt quá sau khi tìm kiếm
  if (outputStartCol > sheet.getMaxColumns() - 1) {
    return -1; // Không tìm thấy vị trí phù hợp
  }
  return outputStartCol;
}

function clearOutputArea(sheet, outputStartColumn) {
  if (outputStartColumn !== -1 && outputStartColumn <= sheet.getMaxColumns() -1) {
     // Xóa 2 cột nơi kết quả sẽ được ghi, từ dòng 1 đến dòng cuối của sheet
    sheet.getRange(1, outputStartColumn, sheet.getMaxRows(), 2).clearContent();
  }
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// HÀM KÍCH HOẠT TỰ ĐỘNG (TRIGGER FUNCTION)
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
function handleSheetChange(e) {
  // e.changeType có thể là: EDIT, INSERT_ROW, INSERT_COLUMN, REMOVE_ROW, REMOVE_COLUMN, INSERT_GRID, REMOVE_GRID, FORMAT, OTHER
  const relevantChangeTypes = ["EDIT", "INSERT_ROW", "REMOVE_ROW", "OTHER"]; // OTHER có thể bao gồm dán dữ liệu, xóa nhiều ô
  
  // Chỉ chạy nếu loại thay đổi là phù hợp VÀ thay đổi xảy ra trên sheet "Hoàn cọc"
  var activeSheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet(); // Lấy sheet hiện tại đang có sự kiện
  if (activeSheet.getName() === "Hoàn cọc" && relevantChangeTypes.includes(e.changeType)) {
    // Sử dụng tryLock để tránh việc chạy chồng chéo nếu có nhiều thay đổi nhanh
    var lock = LockService.getScriptLock();
    try {
      if (lock.tryLock(10000)) { // Thử khóa trong 10 giây
        updateTVBHCountsLogic(true); // true: là chạy tự động, không hiện alert
        lock.releaseLock();
      } else {
        console.log("Không thể thực thi handleSheetChange do trigger khác đang chạy hoặc khóa không thể được cấp.");
      }
    } catch (error) {
      console.error("Lỗi trong handleSheetChange: " + error.toString());
      if (lock) {
        lock.releaseLock();
      }
    }
  }
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// HÀM GỐC ĐỂ CHẠY THỦ CÔNG TỪ MENU
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
function demVaHienThiTVBHTrenSheetHoanCoc() {
  updateTVBHCountsLogic(false); // false: chạy thủ công, hiển thị alert
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// HÀM TẠO MENU KHI MỞ BẢNG TÍNH
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// onOpen hợp nhất trong thuchi.js