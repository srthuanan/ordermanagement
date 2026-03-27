function applyFormattingToRange(sheet, startRow, numRows) {
  try {
    let maxCols = sheet.getLastColumn();
    const sheetName = sheet.getName();
    if (typeof SHEET_HEADERS !== 'undefined' && SHEET_HEADERS[sheetName]) {
      maxCols = Math.max(maxCols, SHEET_HEADERS[sheetName].length);
    }
    if (maxCols > 0 && startRow > 1) {
      const formatRange = sheet.getRange(startRow, 1, numRows, maxCols);
      formatRange
        .setBorder(true, true, true, true, true, true, UI_CONFIG.borderColor, SpreadsheetApp.BorderStyle.SOLID)
        .setFontFamily(UI_CONFIG.fontFamily)
        .setFontSize(UI_CONFIG.fontSize)
        .setFontColor(UI_CONFIG.textColor)
        .setHorizontalAlignment("left")
        .setVerticalAlignment("middle");
    }
  } catch (e) { }
}

function appendAndFormatRow(sheet, rowData) {
  sheet.appendRow(rowData);
  applyFormattingToRange(sheet, sheet.getLastRow(), 1);
}

function appendAndFormatMultipleRows(sheet, rowsData) {
  if (!rowsData || rowsData.length === 0) return;
  const startRow = sheet.getLastRow() + 1;
  const numRows = rowsData.length;
  const numCols = rowsData[0].length;
  sheet.getRange(startRow, 1, numRows, numCols).setValues(rowsData);
  applyFormattingToRange(sheet, startRow, numRows);
}

function isValidExteriorColor(color) {
  if (!color || typeof color !== 'string') {
    return false;
  }
  const trimmedColor = color.trim().toLowerCase();
  return VALID_EXTERIOR_COLORS.some(validColor => validColor.trim().toLowerCase() === trimmedColor);
}
function doReadWriteLock(callback, timeout = 30000) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(timeout);
    const result = callback();
    return result;
  } catch (e) {
    Logger.log('Could not obtain lock after %s seconds: %s', timeout / 1000, e.message);
    throw new Error('Hệ thống đang bận, vui lòng thử lại sau giây lát. (Lỗi khóa dữ liệu)');
  } finally {
    lock.releaseLock();
  }
}

function setupInitialAdminUser() {
  const ADMIN_FULLNAME = 'PHẠM THÀNH NHÂN';
  const ADMIN_EMAIL = 'showroomthuanan@gmail.com';
  const ADMIN_INITIAL_PASSWORD = '123456';
  const ADMIN_ROLE = 'Admin';

  const userSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(USER_SHEET_NAME);
  if (!userSheet) {
    SpreadsheetApp.getUi().alert('Lỗi', `Không tìm thấy trang tính "${USER_SHEET_NAME}". Vui lòng chạy hàm "setupSheets" trước.`, SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const ui = SpreadsheetApp.getUi();
  const username = generateUsernameFromName(ADMIN_FULLNAME);

  if (findUserByUsername(userSheet, username)) {
    ui.alert('Thông báo', `Tài khoản admin với username "${username}" đã tồn tại.`, ui.ButtonSet.OK);
    return;
  }

  const passwordHash = hashPassword(ADMIN_INITIAL_PASSWORD);
  appendAndFormatRow(userSheet, [username, passwordHash, ADMIN_FULLNAME, ADMIN_ROLE, ADMIN_EMAIL, '', '']);

  const message = `Đã tạo tài khoản Admin thành công!\n\nTên đăng nhập: ${username}\nMật khẩu: ${ADMIN_INITIAL_PASSWORD}\n\nVUI LÒNG ĐĂNG NHẬP VÀ ĐỔI MẬT KHẨU NGAY!`;
  ui.alert('Thành công!', message, ui.ButtonSet.OK);
}

function createJsonResponse(payload, statusCode = 200) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Helper để chèn dữ liệu vào Supabase trực tiếp từ GAS
 */
function insertSupabase(table, data) {
  try {
    if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_SERVICE_KEY === 'undefined') {
      Logger.log("Supabase config not found.");
      return false;
    }
    const url = `${SUPABASE_URL}/rest/v1/${table}`;
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal'
      },
      payload: JSON.stringify(data),
      muteHttpExceptions: true
    };
    const response = UrlFetchApp.fetch(url, options);
    const code = response.getResponseCode();
    if (code >= 200 && code < 300) {
      return true;
    } else {
      Logger.log(`Supabase Insert Error [${table}]: ${response.getContentText()}`);
      return false;
    }
  } catch (e) {
    Logger.log(`Supabase Insert Exception [${table}]: ${e.message}`);
    return false;
  }
}

function updateSupabase(table, queryParams, data) {
  try {
    if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_SERVICE_KEY === 'undefined') {
      Logger.log("Supabase config not found.");
      return false;
    }
    const url = `${SUPABASE_URL}/rest/v1/${table}?${queryParams}`;
    const options = {
      method: 'patch',
      contentType: 'application/json',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal'
      },
      payload: JSON.stringify(data),
      muteHttpExceptions: true
    };
    const response = UrlFetchApp.fetch(url, options);
    const code = response.getResponseCode();
    if (code >= 200 && code < 300) {
      return true;
    } else {
      Logger.log(`Supabase Update Error [${table}]: ${response.getContentText()}`);
      return false;
    }
  } catch (e) {
    Logger.log(`Supabase Update Exception [${table}]: ${e.message}`);
    return false;
  }
}

/**
 * Helper để gọi RPC (Stored Procedure) của Supabase
 */
function callSupabaseRpc(functionName, params) {
  if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_SERVICE_KEY === 'undefined') {
    Logger.log("Supabase config not found.");
    return null;
  }
  const url = `${SUPABASE_URL}/rest/v1/rpc/${functionName}`;
  const options = {
    method: "post",
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": "Bearer " + SUPABASE_SERVICE_KEY,
      "Content-Type": "application/json"
    },
    payload: JSON.stringify(params),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() === 200) {
      return JSON.parse(response.getContentText());
    } else {
      Logger.log(`RPC Error [${functionName}]: ${response.getContentText()}`);
      return null;
    }
  } catch (e) {
    Logger.log(`RPC Exception [${functionName}]: ${e.message}`);
    return null;
  }
}

/**
 * Helper để lấy dữ liệu từ Supabase
 */
function fetchSupabase(table, queryParams = "") {
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  if (queryParams) {
    url += `?${queryParams}`;
  }
  const options = {
    method: "get",
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": "Bearer " + SUPABASE_SERVICE_KEY
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() !== 200) {
    Logger.log(`Lỗi fetchSupabase ${table}: ${response.getContentText()}`);
    return [];
  }
  return JSON.parse(response.getContentText());
}

/**
 * Hàm parse ngày tháng định dạng dd/mm/yyyy hh:mm:ss
 */
function parseVietnameseDateTime(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;

  // Thử parse ISO trước
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime()) && String(dateStr).includes('T')) return isoDate;

  // Nếu là chuỗi dd/mm/yyyy
  const parts = String(dateStr).split(/[\/\s:]/);
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const hours = parts[3] ? parseInt(parts[3], 10) : 0;
    const minutes = parts[4] ? parseInt(parts[4], 10) : 0;
    const seconds = parts[5] ? parseInt(parts[5], 10) : 0;
    const d = new Date(year, month, day, hours, minutes, seconds);
    if (!isNaN(d.getTime())) return d;
  }

  return new Date(dateStr);
}

function deleteSupabase(table, queryParams) {
  try {
    if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_SERVICE_KEY === 'undefined') {
      Logger.log("Supabase config not found.");
      return false;
    }
    const url = `${SUPABASE_URL}/rest/v1/${table}?${queryParams}`;
    const options = {
      method: 'delete',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      muteHttpExceptions: true
    };
    const response = UrlFetchApp.fetch(url, options);
    const code = response.getResponseCode();
    if (code >= 200 && code < 300) {
      return true;
    } else {
      Logger.log(`Supabase Delete Error [${table}]: ${response.getContentText()}`);
      return false;
    }
  } catch (e) {
    Logger.log(`Supabase Delete Exception [${table}]: ${e.message}`);
    return false;
  }
}


function findRelevantData(prompt, sheets) {
  const lowerPrompt = prompt.toLowerCase();
  const { daGhepSheet, chuaGhepSheet, stockSheet, xuathoadonSheet, huyGhepSheet } = sheets;

  const allData = {
    DaGhep: daGhepSheet.getLastRow() > 1 ? daGhepSheet.getDataRange().getValues() : [],
    ChuaGhep: chuaGhepSheet.getLastRow() > 1 ? chuaGhepSheet.getDataRange().getValues() : [],
    KhoXe: stockSheet.getLastRow() > 1 ? stockSheet.getDataRange().getValues() : [],
    Xuathoadon: xuathoadonSheet.getLastRow() > 1 ? xuathoadonSheet.getDataRange().getValues() : [],
    HuyGhep: huyGhepSheet ? (huyGhepSheet.getLastRow() > 1 ? huyGhepSheet.getDataRange().getValues() : []) : []
  };

  const results = {};
  let foundSpecificData = false;

  // Ưu tiên 1: Tìm theo Số Đơn Hàng (ví dụ: SO-123456)
  const orderMatch = prompt.match(/\b(SO-\w+)\b/i);
  if (orderMatch) {
    const orderNumber = orderMatch[1].toUpperCase();
    for (const sheetName in allData) {
      const data = allData[sheetName];
      if (data.length > 1) {
        const headers = data[0];
        const orderCol = headers.findIndex(h => h.toUpperCase().includes('SỐ ĐƠN HÀNG'));
        if (orderCol !== -1) {
          const foundRows = data.slice(1).filter(row => String(row[orderCol]).toUpperCase() === orderNumber);
          if (foundRows.length > 0) {
            results[sheetName] = foundRows.map(row => Object.fromEntries(headers.map((key, i) => [key, row[i]])));
            foundSpecificData = true;
          }
        }
      }
    }
  }

  // Ưu tiên 2: Tìm theo Số VIN (17 ký tự)
  const vinMatch = prompt.match(/\b([A-Z0-9]{17})\b/i);
  if (vinMatch && !foundSpecificData) {
    const vin = vinMatch[1].toUpperCase();
    for (const sheetName in allData) {
      const data = allData[sheetName];
      if (data.length > 1) {
        const headers = data[0];
        const vinCol = headers.findIndex(h => h.toUpperCase().includes('VIN'));
        if (vinCol !== -1) {
          const foundRows = data.slice(1).filter(row => String(row[vinCol]).toUpperCase() === vin);
          if (foundRows.length > 0) {
            results[sheetName] = foundRows.map(row => Object.fromEntries(headers.map((key, i) => [key, row[i]])));
            foundSpecificData = true;
          }
        }
      }
    }
  }

  // Ưu tiên 3: Tìm theo từ khóa chung (tên xe, màu sắc, trạng thái...)
  if (!foundSpecificData) {
    const keywords = lowerPrompt.split(/\s+/).filter(word => word.length > 2);
    for (const sheetName in allData) {
      const data = allData[sheetName];
      if (data.length > 1) {
        const headers = data[0];
        const foundRows = data.slice(1).filter(row => {
          const rowText = row.join(' ').toLowerCase();
          return keywords.every(kw => rowText.includes(kw));
        });
        if (foundRows.length > 0 && foundRows.length <= 10) {
          results[sheetName] = foundRows.map(row => Object.fromEntries(headers.map((key, i) => [key, row[i]])));
          foundSpecificData = true;
        }
      }
    }
  }

  if (!foundSpecificData) {
    return {
      summary: "Không tìm thấy dữ liệu cụ thể. Đây là tóm tắt toàn bộ hệ thống:",
      KhoXe: `${allData.KhoXe.length - 1} xe`,
      ChuaGhep: `${allData.ChuaGhep.length - 1} đơn chờ ghép`,
      DaGhep: `${allData.DaGhep.length - 1} đơn đã ghép`,
      HuyGhep: `${allData.HuyGhep.length - 1} đơn đã hủy`
    };
  }

  return results;
}
function searchGlobalLogic(keyword, isAdmin, scope = 'all') {
  if (!isAdmin) {
    return createJsonResponse({ status: "ERROR", message: "Bạn không có quyền thực hiện chức năng này." });
  }
  if (!keyword || keyword.trim() === "") {
    return createJsonResponse({ status: "SUCCESS", data: {} });
  }

  const startTime = new Date().getTime();
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const searchKeyword = keyword.trim();
  const results = {};

  // Define Active Sheets (High Priority)
  const activeSheets = [DA_GHEP_SHEET_NAME, CHUA_GHEP_SHEET_NAME, STOCK_SHEET_NAME, YEU_CAU_VC_SHEET_NAME, CANCELLED_SHEET_NAME, XUAT_HOA_DON_SHEET_NAME, "DangKyCho"];

  // Use TextFinder for high-performance search
  const textFinder = ss.createTextFinder(searchKeyword).matchCase(false);
  const allMatches = textFinder.findAll();

  // Group matches by Sheet
  const matchesBySheet = {};
  allMatches.forEach(range => {
    const sheet = range.getSheet();
    const sheetName = sheet.getName();

    // Filter based on scope
    if (scope === 'active' && !activeSheets.includes(sheetName)) return;
    if (scope === 'archive' && activeSheets.includes(sheetName)) return;

    const rowIndex = range.getRow();
    if (rowIndex === 1) return;

    if (!matchesBySheet[sheetName]) {
      matchesBySheet[sheetName] = {
        sheet: sheet,
        rowIndices: new Set()
      };
    }
    matchesBySheet[sheetName].rowIndices.add(rowIndex);
  });

  // Process matches
  for (const sheetName in matchesBySheet) {
    const { sheet, rowIndices } = matchesBySheet[sheetName];
    const lastCol = sheet.getLastColumn();

    if (lastCol === 0) continue;

    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
    const sheetResults = [];

    const sortedRows = Array.from(rowIndices).sort((a, b) => a - b);

    sortedRows.forEach(rowIndex => {
      const rowRange = sheet.getRange(rowIndex, 1, 1, lastCol);
      const rowValues = rowRange.getValues()[0];
      const rowRichText = rowRange.getRichTextValues()[0];

      const rowObject = {};

      headers.forEach((h, idx) => {
        const cellValue = rowValues[idx];
        const linkUrl = rowRichText[idx] ? rowRichText[idx].getLinkUrl() : null;

        if (linkUrl) {
          const fileLinkObj = {};
          fileLinkObj[String(cellValue)] = linkUrl;
          rowObject[h] = JSON.stringify(fileLinkObj);
        } else {
          rowObject[h] = cellValue;
        }
      });
      sheetResults.push(rowObject);
    });

    if (sheetResults.length > 0) {
      results[sheetName] = sheetResults;
    }
  }

  const executionTime = (new Date().getTime() - startTime) / 1000;
  Logger.log(`Global Search (${scope}) for '${keyword}' completed in ${executionTime}s`);

  return createJsonResponse({ status: "SUCCESS", data: results, executionTime });
}

function fetchAndCacheData(cacheKey, expirationInSeconds, dataFetchingFunction) {
  const cache = CacheService.getScriptCache();
  const version = getDataVersion();
  const versionedCacheKey = `${cacheKey}_${version}`;
  const CHUNK_SIZE = 100000; // Giới hạn Script Cache max: 100KB/item

  // Hàm con: Lấy chunk
  const getChunkedCache = (key) => {
    const metaStr = cache.get(key);
    if (!metaStr) return null;
    try {
      const meta = JSON.parse(metaStr);
      if (meta && meta.numChunks) {
        let result = "";
        const chunkKeys = [];
        for (let i = 0; i < meta.numChunks; i++) chunkKeys.push(`${key}_chunk_${i}`);
        const chunks = cache.getAll(chunkKeys);
        for (let i = 0; i < meta.numChunks; i++) {
          const piece = chunks[`${key}_chunk_${i}`];
          if (!piece) return null; // Mất mảnh thì tải lại
          result += piece;
        }
        return result;
      }
    } catch (e) { }
    return metaStr;
  }

  // Hàm con: Lưu chunk 
  const putChunkedCache = (key, value, expire) => {
    if (value.length <= CHUNK_SIZE) {
      cache.put(key, value, expire);
    } else {
      const numChunks = Math.ceil(value.length / CHUNK_SIZE);
      const chunks = {};
      for (let i = 0; i < numChunks; i++) {
        chunks[`${key}_chunk_${i}`] = value.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      }
      cache.putAll(chunks, expire);
      cache.put(key, JSON.stringify({ isChunked: true, numChunks: numChunks }), expire);
    }
  }

  let cached = getChunkedCache(versionedCacheKey);
  if (cached != null) {
    Logger.log(`CACHE HIT for key: ${versionedCacheKey}`);
    return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    cached = getChunkedCache(versionedCacheKey);
    if (cached != null) {
      return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
    }

    Logger.log(`CACHE MISS for key: ${versionedCacheKey}. Fetching new data from Sheet.`);
    const freshDataResponse = dataFetchingFunction();
    const freshDataJsonString = freshDataResponse.getContent();

    try {
      putChunkedCache(versionedCacheKey, freshDataJsonString, expirationInSeconds);
    } catch (putErr) {
      Logger.log(`Warning: Failed to cache data for ${versionedCacheKey}. Reason: ${putErr.message}`);
    }

    return freshDataResponse;

  } catch (e) {
    Logger.log(`Lock timeout or Fetch error at fetchAndCacheData: ${e.message}, executing directly.`);
    return dataFetchingFunction();
  } finally {
    try { lock.releaseLock(); } catch (e) { }
  }
}
function sendErrorAlert(functionName, error) {
  try {
    const subject = `[Lỗi Hệ Thống] Đã xảy ra lỗi nghiêm trọng trong hàm: ${functionName}`;
    const body = `
      <p>Một lỗi nghiêm trọng đã xảy ra trong hệ thống quản lý xe.</p>
      <p><b>Thời gian:</b> ${new Date().toLocaleString('vi-VN')}</p>
      <p><b>Hàm bị lỗi:</b> ${functionName}</p>
      <p><b>Thông báo lỗi:</b></p>
      <pre style="background-color: #fcecec; border: 1px solid #f0b6b6; padding: 10px; border-radius: 5px;">${error.message}</pre>
      <p><b>Dấu vết lỗi (Stack Trace):</b></p>
      <pre style="background-color: #f1f1f1; border: 1px solid #ddd; padding: 10px; border-radius: 5px;">${error.stack}</pre>
    `;
    sendEmailViaEdge({
      to: ADMIN_EMAIL,
      subject: subject,
      htmlBody: body
    });
  } catch (e) {
    Logger.log(`Lỗi khi đang gửi email cảnh báo lỗi: ${e.message}`);
  }
}
// Thay thế toàn bộ hàm cũ bằng hàm này trong Code.txt
function matchCarAutomatically(dongXe, phienBan, ngoaiThat, noiThat, stockSheet) {
  try {
    const stockData = stockSheet.getDataRange().getValues();
    const headers = SHEET_HEADERS["KhoXe"];
    const vinCol = headers.indexOf("VIN");
    const statusCol = headers.indexOf("Trạng thái");
    const dongXeCol = headers.indexOf("Dòng xe");
    const phienBanCol = headers.indexOf("Phiên bản");
    const ngoaiThatCol = headers.indexOf("Ngoại thất");
    const noiThatCol = headers.indexOf("Nội thất");
    const maDMSCol = headers.indexOf("Mã DMS");
    const ngayNhapCol = headers.indexOf("Ngày nhập");

    if ([vinCol, statusCol, dongXeCol, phienBanCol, ngoaiThatCol, noiThatCol, maDMSCol, ngayNhapCol].some(col => col === -1)) {
      logAction("Lỗi Ghép Tự Động", "Sheet 'KhoXe' thiếu một hoặc nhiều cột cần thiết.");
      return null;
    }

    const matchingCars = [];
    const normalizedRequestDongXe = normalizeForComparison(dongXe);
    const normalizedRequestPhienBan = normalizeForComparison(phienBan);
    const normalizedRequestNgoaiThat = normalizeForComparison(ngoaiThat);
    const normalizedRequestNoiThat = normalizeForComparison(noiThat);

    for (let i = 1; i < stockData.length; i++) {
      const row = stockData[i];
      const carStatus = normalizeForComparison(row[statusCol]);

      if (carStatus === "chưa ghép") {
        const carDongXe = normalizeForComparison(row[dongXeCol]);
        const carPhienBan = normalizeForComparison(row[phienBanCol]);
        const carNgoaiThat = normalizeForComparison(row[ngoaiThatCol]);
        const carNoiThat = normalizeForComparison(row[noiThatCol]);

        if (carDongXe === normalizedRequestDongXe &&
          carPhienBan === normalizedRequestPhienBan &&
          carNgoaiThat === normalizedRequestNgoaiThat &&
          carNoiThat === normalizedRequestNoiThat) {

          matchingCars.push({
            vin: String(row[vinCol]).trim(),
            maDMS: row[maDMSCol] || "",
            rowIndex: i + 1,
            ngayNhap: new Date(row[ngayNhapCol] || 0)
          });
        }
      }
    }

    if (matchingCars.length > 0) {
      // Sắp xếp để ưu tiên xe nhập kho sớm nhất (FIFO)
      matchingCars.sort((a, b) => a.ngayNhap - b.ngayNhap);
      const oldestMatchedCar = matchingCars[0];

      // Cập nhật trạng thái xe trong kho thành "Đã ghép"
      stockSheet.getRange(oldestMatchedCar.rowIndex, statusCol + 1).setValue("Đã ghép");
      logAction("Ghép Tự Động Thành Công", `Đã ghép VIN ${oldestMatchedCar.vin} cho yêu cầu: ${dongXe} - ${phienBan}.`);

      return {
        vin: oldestMatchedCar.vin,
        maDMS: oldestMatchedCar.maDMS,
        rowIndex: oldestMatchedCar.rowIndex,
        statusColIndex: statusCol + 1
      };
    }

    logAction("Không Tìm Thấy Xe (Tự Động)", `Không có xe nào phù hợp trong kho cho yêu cầu: ${dongXe} - ${phienBan} - ${ngoaiThat}.`);
    return null; // Trả về null nếu không tìm thấy xe phù hợp

  } catch (e) {
    logAction("Lỗi Nghiêm Trọng (Ghép Tự Động)", e.message);
    sendErrorAlert('matchCarAutomatically', e);
    return null;
  }
}

function formatDate(date) {
  return date ? Utilities.formatDate(new Date(date), "GMT+7", "dd/MM/yyyy") : "";
}

function formatDateTime(date) {
  return date ? Utilities.formatDate(new Date(date), "GMT+7", "dd/MM/yyyy HH:mm:ss") : "";
}

function removeDiacritics(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
}

function normalizeString(str) {
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sendIssuedInvoiceWithAttachment(mailSheet, orderData, invoiceFileBlob, xuathoadonSheet, rowIndexInXuathoadon) {
  const tenTVBH = orderData.ten_tu_van_ban_hang;
  const recipientEmail = getEmailForAdvisor(mailSheet, tenTVBH);
  const xuathoadonHeaders = SHEET_HEADERS["Xuathoadon"];
  const ketQuaGuiMailColIndex = xuathoadonHeaders.indexOf("KẾT QUẢ GỬI MAIL");

  // SỬA LỖI: Kiểm tra nếu rowIndexInXuathoadon hợp lệ trước khi lấy Range
  const canUpdateSheet = rowIndexInXuathoadon > 0 && xuathoadonSheet;
  const ketQuaCell = canUpdateSheet ? xuathoadonSheet.getRange(rowIndexInXuathoadon, ketQuaGuiMailColIndex + 1) : null;

  if (!recipientEmail) {
    const errorMsg = "Lỗi: Không tìm thấy email TVBH";
    logAction("Lỗi gửi mail XHĐ (Admin Upload)", `Không tìm thấy email cho TVBH '${tenTVBH}', đơn ${orderData.so_don_hang}`);
    if (ketQuaCell) {
      ketQuaCell.setValue(errorMsg);
    }
    return false;
  }

  const subject = `[HÓA ĐƠN ĐÃ PHÁT HÀNH] - Đơn hàng ${orderData.so_don_hang} cho KH ${orderData.ten_khach_hang}`;
  const details = {
    "Số đơn hàng": `<b>${orderData.so_don_hang}</b>`,
    "Tên khách hàng": `<b>${orderData.ten_khach_hang}</b>`,
    "Số VIN": `<b>${orderData.vin}</b>`,
    "Ngày xuất hóa đơn": `<b>${formatDateTimeForSheet(new Date())}</b>`,
    "Dòng xe": orderData.dong_xe,
    "Phiên bản": orderData.phien_ban,
    "Ngoại thất": orderData.ngoai_that,
    "Nội thất": orderData.noi_that
  };
  const note = "Hóa đơn điện tử đã được phát hành và đính kèm trong email này. Anh/Chị vui lòng tải về và gửi cho khách hàng. Trân trọng!";
  const bodyContent = createUnifiedEmailBody("Hóa đơn đã được phát hành thành công!", tenTVBH, details, note, 'info');
  const fullHtml = createFullHtmlEmail(subject, bodyContent);

  try {
    const customerName = orderData.ten_khach_hang || 'KHONG_XAC_DINH';
    const sanitizedCustomerName = customerName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^\w\s-]/g, '').trim();
    const originalFileName = invoiceFileBlob.getName();
    const extension = originalFileName.includes('.') ? originalFileName.substring(originalFileName.lastIndexOf('.')) : '';
    const newFileName = `Hóa đơn ${sanitizedCustomerName}${extension}`;

    invoiceFileBlob.setName(newFileName);
    logAction("Đổi tên file đính kèm", `Đã đổi tên file hóa đơn cho ĐH ${orderData.so_don_hang} thành "${newFileName}"`);
  } catch (e) {
    logAction("Lỗi đổi tên file", `Không thể đổi tên file cho ĐH ${orderData.so_don_hang}: ${e.message}`);
  }

  try {
    sendEmailViaEdge({
      to: recipientEmail,
      subject: subject,
      htmlBody: fullHtml,
      attachments: [invoiceFileBlob]
    });
    logAction("Gửi mail XHĐ (Admin Upload) thành công", `Tới ${recipientEmail} cho đơn ${orderData.so_don_hang}`);

    const resultMsg = "Đã gửi (Admin)";
    if (ketQuaCell) {
      ketQuaCell.setValue(resultMsg);
    }
    // ĐỒNG BỘ LÊN SUPABASE
    updateSupabaseInvoiceMailStatus(orderData.so_don_hang, resultMsg);

    return true;
  } catch (e) {
    const errorMsg = `Lỗi gửi mail: ${e.message.substring(0, 100)}`;
    logAction("Lỗi gửi mail XHĐ (Admin Upload)", `Email: ${recipientEmail}, Đơn: ${orderData.so_don_hang}, Lỗi: ${e.message}`);
    if (ketQuaCell) {
      ketQuaCell.setValue(errorMsg);
    }
    // ĐỒNG BỘ LÊN SUPABASE (LỖI)
    updateSupabaseInvoiceMailStatus(orderData.so_don_hang, errorMsg);

    return false;
  }
}
function logAction(action, details) {
  const actionsToLog = [
    "Ghép xe thủ công",
    "Gửi email",
    "Lỗi",
    "Thêm vào chuaghep",
    "Hủy ghép",
    "Tạo báo cáo chi tiết",
    "Xóa đơn hàng",
    "Tìm kiếm",
    "Gửi cảnh báo quá hạn",
    "Gửi email xe mới nhập kho",
    "Xóa Xe Khỏi Kho",
    "Phục Hồi Xe Vào Kho",
    "Xuất hóa đơn",
    "Hủy xuất hóa đơn",
    "Cập nhật trạng thái khoxe"
  ];

  if (!actionsToLog.some(keyword => action.includes(keyword))) {
    // return; // Commented out to log more actions if needed for debugging
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = getOrCreateSheet(ss, "log", SHEET_HEADERS["log"]);
  if (!logSheet) return;

  const maxLogRows = 1000;
  const currentRows = logSheet.getLastRow();
  if (currentRows > maxLogRows) {
    logSheet.deleteRows(2, currentRows - maxLogRows);
  }

  const timestamp = new Date();
  logSheet.appendRow([
    Utilities.formatDate(timestamp, "GMT+7", "dd/MM/yyyy HH:mm:ss"),
    action,
    details
  ]);
}

function findMatchedValidColor(userInputColor) {
  if (!userInputColor || typeof userInputColor !== 'string') {
    return null;
  }
  const normalizedUserInput = userInputColor.trim().toLowerCase();
  if (normalizedUserInput === "") return null;

  // 1. Khớp chính xác hoàn toàn (không phân biệt hoa/thường)
  for (const validColor of VALID_EXTERIOR_COLORS) {
    if (validColor.trim().toLowerCase() === normalizedUserInput) {
      return validColor; // Trả về chuỗi gốc từ VALID_EXTERIOR_COLORS
    }
  }

  // 2. Thử khớp nếu userInputColor CHỈ LÀ MÃ MÀU (ví dụ: CE18 hoặc (CE18))
  // Giả định mã màu nằm trong dấu ngoặc đơn hoặc là một chuỗi ngắn không có dấu cách.
  const codeMatchRegex = /^\(?([A-Z0-9]+)\)?$/i; // Regex để bắt mã như CE18 hoặc (CE18)
  const userInputCodeMatch = normalizedUserInput.match(codeMatchRegex);

  if (userInputCodeMatch) {
    const extractedInputCode = userInputCodeMatch[1]; // Mã đã được trích xuất, ví dụ: "ce18"
    for (const validColor of VALID_EXTERIOR_COLORS) {
      const validColorLower = validColor.toLowerCase();
      // Tìm mã trong chuỗi validColor, ví dụ: "brahminy white (ce18)"
      if (validColorLower.includes(`(${extractedInputCode})`)) {
        return validColor;
      }
      // Trường hợp mã không có ngoặc trong VALID_EXTERIOR_COLORS (ít khả năng dựa trên danh sách của bạn)
      // Ví dụ nếu VALID_EXTERIOR_COLORS có "CE18 Special" và người dùng nhập "CE18"
      const parts = validColorLower.split(' ');
      if (parts.some(part => part === extractedInputCode)) {
        // Cần thêm logic để đảm bảo đây là mã chứ không phải một phần của tên
        // Ví dụ kiểm tra xem extractedInputCode có giống định dạng mã không
        if (/^[A-Z0-9]+$/i.test(extractedInputCode) && extractedInputCode.length > 1 && extractedInputCode.length < 6) { // Heuristic cho mã
          // Kiểm tra xem có nhiều kết quả khớp không, nếu có thì không eindeutig
          const potentialMatches = VALID_EXTERIOR_COLORS.filter(vc => vc.toLowerCase().includes(`(${extractedInputCode})`) || vc.toLowerCase().split(' ').some(p => p === extractedInputCode && /^[A-Z0-9]+$/i.test(extractedInputCode) && extractedInputCode.length > 1 && extractedInputCode.length < 6));
          if (potentialMatches.length === 1) return potentialMatches[0];
        }
      }
    }
  }

  // 3. Thử khớp nếu userInputColor CHỈ LÀ TÊN MÀU (ví dụ: "Brahminy White")
  // Điều này phức tạp hơn vì tên có thể chứa nhiều từ.
  // Chúng ta sẽ tìm xem userInputColor có phải là phần đầu của một màu hợp lệ không (trước dấu '(').
  let potentialNameMatches = [];
  for (const validColor of VALID_EXTERIOR_COLORS) {
    const namePartMatch = validColor.match(/^(.*?)\s*\(/);
    if (namePartMatch && namePartMatch[1]) {
      const namePart = namePartMatch[1].trim().toLowerCase();
      if (namePart === normalizedUserInput) {
        potentialNameMatches.push(validColor);
      }
    } else {
      // Nếu không có dấu '(', coi toàn bộ là tên
      if (validColor.trim().toLowerCase() === normalizedUserInput) {
        potentialNameMatches.push(validColor); // Đã được xử lý ở bước 1, nhưng để an toàn
      }
    }
  }
  if (potentialNameMatches.length === 1) {
    return potentialNameMatches[0]; // Chỉ trả về nếu tìm thấy duy nhất 1 kết quả khớp tên
  }


  return null; // Không tìm thấy kết quả khớp nào
}
/**
 * [PHIÊN BẢN CUỐI] Tìm các dòng thiếu thông tin và khôi phục từ lịch sử.
 * Ưu tiên 1: Khôi phục từ snapshot JSON trong 'lichsu_donhang'.
 * Ưu tiên 2: Khôi phục từng ô một từ 'NhatKyChinhSua'.
 */
function findAndRestoreFromHistory(sheets) {
  const { daGhepSheet, chuaGhepSheet, lichsuDonhangSheet, nhatKyChinhSuaSheet } = sheets;
  const corrections = [];
  const errors = [];

  // 1. Lấy dữ liệu từ các sheet lịch sử
  const historyData = lichsuDonhangSheet ? lichsuDonhangSheet.getDataRange().getValues() : [];
  const historyHeaders = SHEET_HEADERS["lichsu_donhang"];
  const historyOrderCol = historyHeaders.indexOf("Số đơn hàng");
  const historyJsonCol = historyHeaders.indexOf("Dữ liệu JSON");

  const auditLogData = nhatKyChinhSuaSheet ? nhatKyChinhSuaSheet.getDataRange().getValues() : [];
  const auditLogHeaders = SHEET_HEADERS["NhatKyChinhSua"];
  const auditSheetNameCol = auditLogHeaders.indexOf("Tên Sheet");
  const auditCellCol = auditLogHeaders.indexOf("Ô");

  // ==========================================================================================
  // HÀM QUAN TRỌNG: TÌM GIÁ TRỊ TRONG NHẬT KÝ CHỈNH SỬA
  // ==========================================================================================
  const findLastCellValueInAuditLog = (sheetName, cellA1Notation) => {
    if (auditLogData.length === 0) return null;

    // Duyệt ngược từ cuối nhật ký để tìm lần chỉnh sửa gần nhất của ô này
    for (let i = auditLogData.length - 1; i >= 1; i--) {
      if (auditLogData[i][auditSheetNameCol] === sheetName && auditLogData[i][auditCellCol] === cellA1Notation) {

        // SỬA LỖI LOGIC QUAN TRỌNG: 
        // Phải lấy "Giá trị cũ" để khôi phục lại dữ liệu đã bị xóa.
        const oldValueColIndex = auditLogHeaders.indexOf("Giá trị cũ");
        return auditLogData[i][oldValueColIndex];
      }
    }
    return null;
  };
  // ==========================================================================================

  // Hàm tìm bản ghi JSON đầy đủ (giữ nguyên)
  const findLastGoodRecord = (orderNumber) => {
    for (let i = historyData.length - 1; i >= 1; i--) {
      if (historyData[i][historyOrderCol] === orderNumber && historyData[i][historyJsonCol]) {
        try { return JSON.parse(historyData[i][historyJsonCol]); } catch (e) { }
      }
    }
    return null;
  };

  // Hàm quét và khôi phục cho từng sheet
  const checkAndRestoreSheet = (sheet, sheetName, headers, essentialCols) => {
    const sheetData = sheet.getDataRange().getValues();
    const orderCol = headers.indexOf("Số đơn hàng");

    for (let i = 1; i < sheetData.length; i++) {
      const rowData = sheetData[i];
      const orderNumber = String(rowData[orderCol] || "").trim();
      const missingFields = essentialCols.filter(colName => !rowData[headers.indexOf(colName)]);

      if (missingFields.length > 0) {
        let restoredFieldsList = [];

        // ƯU TIÊN 1: Thử khôi phục từ snapshot JSON của đơn hàng
        const historicalRecord = orderNumber ? findLastGoodRecord(orderNumber) : null;
        if (historicalRecord) {
          missingFields.forEach(fieldName => {
            if (historicalRecord.hasOwnProperty(fieldName) && historicalRecord[fieldName]) {
              const colIndexToUpdate = headers.indexOf(fieldName);
              // Kiểm tra xem trường đó có còn thiếu không trước khi ghi đè
              if (!restoredFieldsList.includes(fieldName)) {
                sheet.getRange(i + 1, colIndexToUpdate + 1).setValue(historicalRecord[fieldName]);
                restoredFieldsList.push(fieldName);
              }
            }
          });
        }

        // ƯU TIÊN 2: Thử khôi phục từng ô một từ Nhật ký chỉnh sửa `NhatKyChinhSua`
        const remainingMissingFields = missingFields.filter(f => !restoredFieldsList.includes(f));
        if (remainingMissingFields.length > 0) {
          remainingMissingFields.forEach(fieldName => {
            const colIndexToUpdate = headers.indexOf(fieldName);
            const cellA1Notation = sheet.getRange(i + 1, colIndexToUpdate + 1).getA1Notation();

            // Tìm giá trị cũ gần nhất trong nhật ký
            const lastValue = findLastCellValueInAuditLog(sheetName, cellA1Notation);

            if (lastValue && lastValue !== "[Ô trống]") {
              sheet.getRange(i + 1, colIndexToUpdate + 1).setValue(lastValue);
              if (!restoredFieldsList.includes(fieldName)) {
                restoredFieldsList.push(fieldName);
              }
            }
          });
        }

        if (restoredFieldsList.length > 0) {
          corrections.push({
            type: `Khôi phục từ lịch sử`,
            details: `Dòng ${i + 1} đã được khôi phục các trường: ${restoredFieldsList.join(', ')}.`,
            sheetName: sheetName, row: i + 1, vin: rowData[headers.indexOf("VIN")] || '', orderNumber: orderNumber,
          });
        } else {
          errors.push({
            type: 'Thiếu thông tin & Lịch sử',
            details: `Dòng ${i + 1} thiếu các trường: ${missingFields.join(', ')} và không tìm thấy lịch sử để khôi phục.`,
            sheetName: sheetName, row: i + 1, vin: rowData[headers.indexOf("VIN")] || '', orderNumber: orderNumber,
          });
        }
      }
    }
  };

  const essentialColsToCheck = ["Tên tư vấn bán hàng", "Tên khách hàng", "Dòng xe", "Phiên bản", "Ngoại thất", "Nội thất", "Số đơn hàng"];
  checkAndRestoreSheet(daGhepSheet, DA_GHEP_SHEET_NAME, SHEET_HEADERS["DaGhep"], essentialColsToCheck);
  checkAndRestoreSheet(chuaGhepSheet, CHUA_GHEP_SHEET_NAME, SHEET_HEADERS["ChuaGhep"], essentialColsToCheck);

  return { corrections, errors };
}
function findAndFixMissingInformation(sheets) {
  // SỬA LỖI TẠI ĐÂY: Thêm 'chuaGhepSheet' vào danh sách khởi tạo.
  const { daGhepSheet, stockSheet, xuathoadonSheet, thongtinxeSheet, chuaGhepSheet } = sheets;
  const errors = [];
  const corrections = [];

  // --- Dữ liệu và Headers ---
  const thongtinxeData = thongtinxeSheet.getDataRange().getValues();
  const thongtinxeHeaders = SHEET_HEADERS["Thongtinxe"];
  const daghepData = daGhepSheet.getDataRange().getValues();
  const daghepHeaders = SHEET_HEADERS["DaGhep"];
  const khoxeData = stockSheet.getDataRange().getValues();
  const khoxeHeaders = SHEET_HEADERS["KhoXe"];
  const xuathoadonData = xuathoadonSheet.getDataRange().getValues();
  const xuathoadonHeaders = SHEET_HEADERS["Xuathoadon"];

  // --- Chỉ số các cột cần thiết ---
  const vinColThongtinxe = thongtinxeHeaders.indexOf("Số VIN");
  const dongCoColThongtinxe = thongtinxeHeaders.indexOf("Số động cơ");
  const mauNgoaiThatColThongtinxe = thongtinxeHeaders.indexOf("Màu ngoại thất xe");
  const mauNoiThatColThongtinxe = thongtinxeHeaders.indexOf("Màu nội thất xe");
  const phienBanColThongtinxe = thongtinxeHeaders.indexOf("Phiên bản");

  const vinColDaghep = daghepHeaders.indexOf("VIN");

  // --- Tạo Map để tra cứu nhanh ---
  const vinToThongtinxeMap = new Map(thongtinxeData.slice(1).map(row => [String(row[vinColThongtinxe] || "").trim(), row]));
  const vinToDaghepMap = new Map(daghepData.slice(1).map(row => [String(row[vinColDaghep] || "").trim(), row]));

  // --- KIỂM TRA 1: Hoàn thiện dữ liệu trong KhoXe từ Thongtinxe ---
  const khoxeVinCol = khoxeHeaders.indexOf("VIN");
  const khoxePhienBanCol = khoxeHeaders.indexOf("Phiên bản");
  const khoxeNgoaiThatCol = khoxeHeaders.indexOf("Ngoại thất");
  const khoxeNoiThatCol = khoxeHeaders.indexOf("Nội thất");

  for (let i = 1; i < khoxeData.length; i++) {
    const row = khoxeData[i];
    const vin = String(row[khoxeVinCol] || "").trim();
    if (!vin) continue;

    const masterInfo = vinToThongtinxeMap.get(vin);
    if (masterInfo) {
      let changed = false;
      const changes = [];

      // Sửa Phiên bản
      if (!row[khoxePhienBanCol] && masterInfo[phienBanColThongtinxe]) {
        stockSheet.getRange(i + 1, khoxePhienBanCol + 1).setValue(masterInfo[phienBanColThongtinxe]);
        changes.push(`Phiên bản (thành '${masterInfo[phienBanColThongtinxe]}')`);
        changed = true;
      }
      // Sửa Ngoại thất
      if (!row[khoxeNgoaiThatCol] && masterInfo[mauNgoaiThatColThongtinxe]) {
        stockSheet.getRange(i + 1, khoxeNgoaiThatCol + 1).setValue(masterInfo[mauNgoaiThatColThongtinxe]);
        changes.push(`Ngoại thất (thành '${masterInfo[mauNgoaiThatColThongtinxe]}')`);
        changed = true;
      }
      // Sửa Nội thất
      if (!row[khoxeNoiThatCol] && masterInfo[mauNoiThatColThongtinxe]) {
        stockSheet.getRange(i + 1, khoxeNoiThatCol + 1).setValue(masterInfo[mauNoiThatColThongtinxe]);
        changes.push(`Nội thất (thành '${masterInfo[mauNoiThatColThongtinxe]}')`);
        changed = true;
      }

      if (changed) {
        corrections.push({
          type: 'Bổ sung thông tin KhoXe',
          details: `VIN "${vin}" được bổ sung thông tin từ sheet Thongtinxe: ${changes.join(', ')}.`,
          sheetName: STOCK_SHEET_NAME,
          row: i + 1,
          vin: vin,
          orderNumber: ''
        });
      }
    } else {
      // Nếu VIN trong KhoXe không tồn tại trong Thongtinxe thì đây là một lỗi
      errors.push({
        type: 'VIN không có trong dữ liệu gốc',
        details: `VIN "${vin}" trong KhoXe không được tìm thấy trong sheet Thongtinxe. Dữ liệu có thể không chính xác.`,
        sheetName: STOCK_SHEET_NAME,
        row: i + 1,
        vin: vin,
        orderNumber: ''
      });
    }
  }

  // --- KIỂM TRA 2: Hoàn thiện dữ liệu trong Xuathoadon từ DaGhep và Thongtinxe ---
  const xhdVinCol = xuathoadonHeaders.indexOf("SỐ VIN");
  const xhdKhachHangCol = xuathoadonHeaders.indexOf("TÊN KHÁCH HÀNG");
  const xhdDongXeCol = xuathoadonHeaders.indexOf("DÒNG XE");
  const xhdPhienBanCol = xuathoadonHeaders.indexOf("PHIÊN BẢN");
  const xhdDongCoCol = xuathoadonHeaders.indexOf("SỐ ĐỘNG CƠ");

  for (let i = 1; i < xuathoadonData.length; i++) {
    const row = xuathoadonData[i];
    const vin = String(row[xhdVinCol] || "").trim();
    if (!vin) continue;

    const daghepInfo = vinToDaghepMap.get(vin);
    const masterInfo = vinToThongtinxeMap.get(vin);
    let changed = false;
    const changes = [];

    if (daghepInfo) {
      // Bổ sung các thông tin liên quan đến đơn hàng
      if (!row[xhdKhachHangCol] && daghepInfo[daghepHeaders.indexOf("Tên khách hàng")]) {
        xuathoadonSheet.getRange(i + 1, xhdKhachHangCol + 1).setValue(daghepInfo[daghepHeaders.indexOf("Tên khách hàng")]);
        changes.push(`Tên khách hàng`);
        changed = true;
      }
      if (!row[xhdDongXeCol] && daghepInfo[daghepHeaders.indexOf("Dòng xe")]) {
        xuathoadonSheet.getRange(i + 1, xhdDongXeCol + 1).setValue(daghepInfo[daghepHeaders.indexOf("Dòng xe")]);
        changes.push(`Dòng xe`);
        changed = true;
      }
      if (!row[xhdPhienBanCol] && daghepInfo[daghepHeaders.indexOf("Phiên bản")]) {
        xuathoadonSheet.getRange(i + 1, xhdPhienBanCol + 1).setValue(daghepInfo[daghepHeaders.indexOf("Phiên bản")]);
        changes.push(`Phiên bản`);
        changed = true;
      }
    }
    if (masterInfo) {
      // Bổ sung các thông tin liên quan đến xe
      if (!row[xhdDongCoCol] && masterInfo[dongCoColThongtinxe]) {
        xuathoadonSheet.getRange(i + 1, xhdDongCoCol + 1).setValue(masterInfo[dongCoColThongtinxe]);
        changes.push(`Số động cơ`);
        changed = true;
      }
    }

    if (changed) {
      corrections.push({
        type: 'Bổ sung thông tin Xuathoadon',
        details: `VIN "${vin}" được bổ sung thông tin: ${changes.join(', ')}.`,
        sheetName: XUAT_HOA_DON_SHEET_NAME,
        row: i + 1,
        vin: vin,
        orderNumber: row[xuathoadonHeaders.indexOf("SỐ ĐƠN HÀNG")]
      });
    }
  }

  // --- KIỂM TRA 3: Các dòng trong DaGhep/ChuaGhep thiếu thông tin cơ bản ---
  // (Không thể tự sửa, chỉ báo lỗi)
  const checkMissingEssentialData = (sheet, sheetName, headers, essentialCols) => {
    const data = sheet.getDataRange().getValues();
    const orderCol = headers.indexOf("Số đơn hàng");
    const vinCol = headers.indexOf("VIN");

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const missingFields = [];
      essentialCols.forEach(colName => {
        const colIndex = headers.indexOf(colName);
        if (colIndex !== -1 && !row[colIndex]) {
          missingFields.push(colName);
        }
      });

      if (missingFields.length > 0) {
        errors.push({
          type: 'Thiếu thông tin thiết yếu',
          details: `Dòng này thiếu các thông tin quan trọng: ${missingFields.join(', ')}. Vui lòng bổ sung thủ công.`,
          sheetName: sheetName,
          row: i + 1,
          vin: vinCol !== -1 ? row[vinCol] : '',
          orderNumber: orderCol !== -1 ? row[orderCol] : ''
        });
      }
    }
  };

  const daghepEssentialCols = ["Tên tư vấn bán hàng", "Tên khách hàng", "Dòng xe", "Số đơn hàng", "VIN"];
  const chuaghepEssentialCols = ["Tên tư vấn bán hàng", "Tên khách hàng", "Dòng xe", "Số đơn hàng"];

  checkMissingEssentialData(daGhepSheet, DA_GHEP_SHEET_NAME, daghepHeaders, daghepEssentialCols);
  checkMissingEssentialData(chuaGhepSheet, CHUA_GHEP_SHEET_NAME, SHEET_HEADERS["ChuaGhep"], chuaghepEssentialCols);


  return { errors, corrections };
}
function fillXuathoadonFromDaghepAndThongtinxe(e, row, vin) {
  const ss = e.source;
  const sheets = getSheets(ss);
  const { daGhepSheet, thongtinxeSheet, xuathoadonSheet } = sheets;

  vin = String(vin).trim();
  const daghepData = daGhepSheet.getDataRange().getValues();
  const thongtinxeData = thongtinxeSheet.getDataRange().getValues();

  const daghepHeaders = SHEET_HEADERS["DaGhep"];
  const thongtinxeHeaders = SHEET_HEADERS["Thongtinxe"];
  const xuathoadonHeaders = SHEET_HEADERS["Xuathoadon"];

  let daghepInfo = null;
  const vinColDaghep = daghepHeaders.indexOf("VIN");
  for (let i = 1; i < daghepData.length; i++) {
    if (String(daghepData[i][vinColDaghep] || "").trim() === vin) {
      daghepInfo = daghepData[i];
      logAction("Tìm thấy trong DaGhep", `VIN: ${vin}, Dòng: ${i + 1}`);
      break;
    }
  }

  let thongtinxeInfo = null;
  const vinColThongtinxe = thongtinxeHeaders.indexOf("Số VIN");
  for (let i = 1; i < thongtinxeData.length; i++) {
    if (String(thongtinxeData[i][vinColThongtinxe] || "").trim() === vin) {
      thongtinxeInfo = thongtinxeData[i];
      logAction("Tìm thấy trong Thongtinxe", `VIN: ${vin}, Dòng: ${i + 1}`);
      break;
    }
  }

  if (daghepInfo || thongtinxeInfo) {
    const rowData = [];
    // Populate rowData based on xuathoadonHeaders order
    rowData[xuathoadonHeaders.indexOf("SỐ TT")] = ""; // STT will be updated by updateSerialNumbers
    rowData[xuathoadonHeaders.indexOf("TÊN KHÁCH HÀNG")] = daghepInfo ? daghepInfo[daghepHeaders.indexOf("Tên khách hàng")] : "";
    rowData[xuathoadonHeaders.indexOf("SỐ ĐƠN HÀNG")] = daghepInfo ? daghepInfo[daghepHeaders.indexOf("Số đơn hàng")] : "";
    rowData[xuathoadonHeaders.indexOf("DÒNG XE")] = daghepInfo ? daghepInfo[daghepHeaders.indexOf("Dòng xe")] : "";
    rowData[xuathoadonHeaders.indexOf("PHIÊN BẢN")] = daghepInfo ? daghepInfo[daghepHeaders.indexOf("Phiên bản")] : "";
    rowData[xuathoadonHeaders.indexOf("NGOẠI THẤT")] = daghepInfo ? daghepInfo[daghepHeaders.indexOf("Ngoại thất")] : "";
    rowData[xuathoadonHeaders.indexOf("NỘI THẤT")] = daghepInfo ? daghepInfo[daghepHeaders.indexOf("Nội thất")] : "";
    rowData[xuathoadonHeaders.indexOf("TƯ VẤN BÁN HÀNG")] = daghepInfo ? daghepInfo[daghepHeaders.indexOf("Tên tư vấn bán hàng")] : "";
    rowData[xuathoadonHeaders.indexOf("SỐ VIN")] = vin;
    rowData[xuathoadonHeaders.indexOf("SỐ ĐỘNG CƠ")] = thongtinxeInfo ? thongtinxeInfo[thongtinxeHeaders.indexOf("Số động cơ")] : "";
    rowData[xuathoadonHeaders.indexOf("NGÀY XUẤT HÓA ĐƠN")] = ""; // Will be filled when "BÁO BÁN" is checked
    rowData[xuathoadonHeaders.indexOf("PO PIN")] = "";
    rowData[xuathoadonHeaders.indexOf("CHÍNH SÁCH")] = "";
    rowData[xuathoadonHeaders.indexOf("NGÀY CỌC")] = daghepInfo ? daghepInfo[daghepHeaders.indexOf("Ngày cọc")] : "";
    rowData[xuathoadonHeaders.indexOf("BÁO BÁN")] = false;
    rowData[xuathoadonHeaders.indexOf("KẾT QUẢ GỬI MAIL")] = "";


    xuathoadonSheet.getRange(row, 1, 1, xuathoadonHeaders.length).setValues([rowData]);
    updateSerialNumbers(xuathoadonSheet);
    logAction("Điền thông tin xuất hóa đơn", `Đã điền cho VIN ${vin} tại dòng ${row}`);
    syncInvoiceDate(daGhepSheet, xuathoadonSheet);
  } else {
    logAction("Không tìm thấy dữ liệu", `VIN ${vin} không có trong DaGhep hoặc Thongtinxe`);
    SpreadsheetApp.getUi().alert("Cảnh báo", `VIN ${vin} không tìm thấy trong DaGhep hoặc Thongtinxe!`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function findPreviousKhoxeData(ss, vin) {
  const lichsuXeSheet = ss.getSheetByName('lichsu_xe');
  if (!lichsuXeSheet) {
    Logger.log('Lỗi: Không tìm thấy sheet lichsu_xe');
    return { ngayNhap: null, daThongBao: '', trangThai: '' };
  }

  const lichsuXeData = lichsuXeSheet.getDataRange().getValues();
  let ngayNhap = null;
  let daThongBao = '';
  let trangThai = '';
  let latestMatchIndex = -1;

  const vinColLichSu = SHEET_HEADERS["lichsu_xe"].indexOf("VIN");
  const chiTietColLichSu = SHEET_HEADERS["lichsu_xe"].indexOf("Chi tiết");


  for (let i = 1; i < lichsuXeData.length; i++) { // Start from 1 to skip headers
    const vinInSheet = String(lichsuXeData[i][vinColLichSu] || '').trim().toUpperCase();
    const vinToCompare = String(vin || '').trim().toUpperCase();

    if (vinInSheet === vinToCompare) {
      latestMatchIndex = i;
      const chiTiet = String(lichsuXeData[i][chiTietColLichSu] || '').trim();

      const trangThaiMatch = chiTiet.match(/Trạng thái=([^,]+)/);
      if (trangThaiMatch && trangThaiMatch[1]) {
        trangThai = trangThaiMatch[1].trim();
      }

      const ngayNhapMatch = chiTiet.match(/Ngày nhập=([^,]+)/);
      if (ngayNhapMatch && ngayNhapMatch[1]) {
        try {
          // Attempt to parse date, assuming it might be string or number
          let parsedDate = new Date(ngayNhapMatch[1].trim());
          if (isNaN(parsedDate.getTime())) { // Check if parsing failed
            // Try parsing dd/MM/yyyy HH:mm:ss if it's in that format
            const parts = ngayNhapMatch[1].trim().split(' ')[0].split('/');
            if (parts.length === 3) {
              parsedDate = new Date(parts[2], parts[1] - 1, parts[0]); // year, month-1, day
            }
          }
          if (!isNaN(parsedDate.getTime())) {
            ngayNhap = parsedDate;
          } else {
            ngayNhap = null; // Invalid date
          }
        } catch (e) {
          Logger.log(`Lỗi chuyển đổi Ngày nhập cho VIN ${vin}: ${e}`);
          ngayNhap = null;
        }
      }

      const daThongBaoMatch = chiTiet.match(/Đã thông báo=(Đã thông báo ngày \d{2}\/\d{2}\/\d{4}|[^,]*)/); // Adjusted regex
      if (daThongBaoMatch && daThongBaoMatch[1]) {
        daThongBao = daThongBaoMatch[1].trim();
      }
    }
  }

  if (latestMatchIndex === -1) {
    Logger.log(`Không tìm thấy dữ liệu trong lichsu_xe cho VIN ${vin}`);
  } else {
    Logger.log(`Tìm thấy dữ liệu cho VIN ${vin} tại dòng ${latestMatchIndex + 1}: trangThai=${trangThai}, ngayNhap=${ngayNhap}, daThongBao=${daThongBao}`);
  }

  return { ngayNhap, daThongBao, trangThai };
}
function cancelInvoice(soDonHang) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = getSheets(ss);
  const { daGhepSheet, stockSheet, chuaGhepSheet, xuathoadonSheet, mailSheet } = sheets;

  const xuathoadonData = xuathoadonSheet.getDataRange().getValues();
  const xuathoadonHeaders = SHEET_HEADERS["Xuathoadon"]; // 
  const soDonHangColXHD = xuathoadonHeaders.indexOf("SỐ ĐƠN HÀNG");
  const vinColXHD = xuathoadonHeaders.indexOf("SỐ VIN");

  let vinToCancel = null;
  let matchedRowInSheet = -1;
  let invoiceDataRow = null;

  for (let i = 1; i < xuathoadonData.length; i++) {
    if (String(xuathoadonData[i][soDonHangColXHD] || '').trim() === String(soDonHang).trim()) {
      vinToCancel = String(xuathoadonData[i][vinColXHD] || '').trim();
      matchedRowInSheet = i + 1;
      invoiceDataRow = xuathoadonData[i];
      xuathoadonSheet.deleteRow(matchedRowInSheet); // 
      break;
    }
  }

  if (!vinToCancel || matchedRowInSheet === -1) {
    showToastOnSheet(`Không tìm thấy số đơn hàng ${soDonHang} trong danh sách xuất hóa đơn!`, "Lỗi"); // 
    logAction('Lỗi hủy xuất hóa đơn', `Không tìm thấy số đơn hàng ${soDonHang} trong Xuathoadon`); // 
    return;
  }

  const invoiceData = {
    ten_ban_hang: invoiceDataRow[xuathoadonHeaders.indexOf("TƯ VẤN BÁN HÀNG")],
    ten_khach_hang: invoiceDataRow[xuathoadonHeaders.indexOf("TÊN KHÁCH HÀNG")],
    dong_xe: invoiceDataRow[xuathoadonHeaders.indexOf("DÒNG XE")],
    phien_ban: invoiceDataRow[xuathoadonHeaders.indexOf("PHIÊN BẢN")],
    ngoai_that: invoiceDataRow[xuathoadonHeaders.indexOf("NGOẠI THẤT")],
    noi_that: invoiceDataRow[xuathoadonHeaders.indexOf("NỘI THẤT")],
    so_don_hang: soDonHang,
    ngay_coc: invoiceDataRow[xuathoadonHeaders.indexOf("NGÀY CỌC")],
    ngay_xuat_hoa_don: invoiceDataRow[xuathoadonHeaders.indexOf("NGÀY XUẤT HÓA ĐƠN")]
  };
  const { ngayNhap, daThongBao } = findPreviousKhoxeData(ss, vinToCancel);

  // --- THAY ĐỔI QUAN TRỌNG TẠI ĐÂY ---
  // Khi hủy xuất hóa đơn, trạng thái của đơn hàng trong DaGhep phải luôn là "Đã ghép".
  // Bỏ logic suy luận phức tạp, gán cứng giá trị đúng.
  const newDaghepStatus = "Đã ghép";
  // --- KẾT THÚC THAY ĐỔI ---

  let isVinInDaghep = false;
  let daghepRowIndexInSheet = -1; // 1-based
  const daghepData = daGhepSheet.getDataRange().getValues();
  const daghepHeaders = SHEET_HEADERS["DaGhep"];
  const vinColDaghep = daghepHeaders.indexOf("VIN");
  const ketQuaColDaghep = daghepHeaders.indexOf("Kết quả");
  const ngayXuatHDColDaghep = daghepHeaders.indexOf("Ngày xuất hóa đơn");

  for (let i = 1; i < daghepData.length; i++) {
    if (String(daghepData[i][vinColDaghep] || '').trim() === vinToCancel) {
      isVinInDaghep = true;
      daghepRowIndexInSheet = i + 1;
      break;
    }
  }

  if (isVinInDaghep && daghepRowIndexInSheet !== -1) {
    daGhepSheet.getRange(daghepRowIndexInSheet, ketQuaColDaghep + 1).setValue(newDaghepStatus); // Cập nhật trạng thái đúng
    daGhepSheet.getRange(daghepRowIndexInSheet, ngayXuatHDColDaghep + 1).setValue(''); // Xóa ngày xuất hóa đơn
    logAction('Cập nhật DaGhep', `Cập nhật VIN ${vinToCancel} trong DaGhep: Kết quả=${newDaghepStatus}, xóa Ngày xuất hóa đơn`);
  } else if (!isVinInDaghep && invoiceData) {
    // Logic này để khôi phục lại dòng trong DaGhep nếu nó đã bị xóa vì lý do nào đó
    const newDaghepRowValues = [];
    newDaghepRowValues[daghepHeaders.indexOf("Tên tư vấn bán hàng")] = invoiceData.ten_ban_hang;
    newDaghepRowValues[daghepHeaders.indexOf("Tên khách hàng")] = invoiceData.ten_khach_hang;
    newDaghepRowValues[daghepHeaders.indexOf("Dòng xe")] = invoiceData.dong_xe;
    newDaghepRowValues[daghepHeaders.indexOf("Phiên bản")] = invoiceData.phien_ban;
    newDaghepRowValues[daghepHeaders.indexOf("Ngoại thất")] = invoiceData.ngoai_that;
    newDaghepRowValues[daghepHeaders.indexOf("Nội thất")] = invoiceData.noi_that;
    newDaghepRowValues[daghepHeaders.indexOf("Số đơn hàng")] = invoiceData.so_don_hang;
    newDaghepRowValues[daghepHeaders.indexOf("Ngày cọc")] = invoiceData.ngay_coc;
    newDaghepRowValues[daghepHeaders.indexOf("Thời gian nhập")] = invoiceData.ngay_xuat_hoa_don || new Date();
    newDaghepRowValues[vinColDaghep] = vinToCancel;
    newDaghepRowValues[ketQuaColDaghep] = newDaghepStatus; // Gán trạng thái đúng

    appendAndFormatRow(daGhepSheet, daghepHeaders.map((_, index) => newDaghepRowValues[index] || ""));
    logAction('Phục hồi DaGhep', `Phục hồi bản ghi trong DaGhep cho VIN ${vinToCancel} với trạng thái '${newDaghepStatus}'`);
    isVinInDaghep = true;
  }

  const khoxeRowIndexInSheet = findRowByVin(stockSheet, vinToCancel);
  const newKhoxeStatus = isVinInDaghep ? 'Đã ghép' : 'Chưa ghép';
  const khoxeHeaders = SHEET_HEADERS["KhoXe"];
  const statusColKhoXe = khoxeHeaders.indexOf("Trạng thái");
  const ngayNhapColKhoXe = khoxeHeaders.indexOf("Ngày nhập");
  const daThongBaoColKhoXe = khoxeHeaders.indexOf("Đã thông báo");

  if (khoxeRowIndexInSheet !== -1) {
    stockSheet.getRange(khoxeRowIndexInSheet, statusColKhoXe + 1).setValue(newKhoxeStatus);
    if (!stockSheet.getRange(khoxeRowIndexInSheet, ngayNhapColKhoXe + 1).getValue() && ngayNhap) {
      stockSheet.getRange(khoxeRowIndexInSheet, ngayNhapColKhoXe + 1).setValue(ngayNhap);
    }
    if (!stockSheet.getRange(khoxeRowIndexInSheet, daThongBaoColKhoXe + 1).getValue() && daThongBao) {
      stockSheet.getRange(khoxeRowIndexInSheet, daThongBaoColKhoXe + 1).setValue(daThongBao);
    }
    logAction('Cập nhật KhoXe', `Cập nhật trạng thái xe ${vinToCancel} thành "${newKhoxeStatus}" trong KhoXe`);
  } else if (invoiceData) {
    const newKhoxeRowValues = [];
    newKhoxeRowValues[khoxeHeaders.indexOf("Dòng xe")] = invoiceData.dong_xe;
    newKhoxeRowValues[khoxeHeaders.indexOf("Phiên bản")] = invoiceData.phien_ban;
    newKhoxeRowValues[khoxeHeaders.indexOf("Ngoại thất")] = invoiceData.ngoai_that;
    newKhoxeRowValues[khoxeHeaders.indexOf("Nội thất")] = invoiceData.noi_that;
    newKhoxeRowValues[khoxeHeaders.indexOf("VIN")] = vinToCancel;
    newKhoxeRowValues[statusColKhoXe] = newKhoxeStatus;
    newKhoxeRowValues[ngayNhapColKhoXe] = ngayNhap || '';
    newKhoxeRowValues[daThongBaoColKhoXe] = daThongBao || '';
    appendAndFormatRow(stockSheet, khoxeHeaders.map((_, index) => newKhoxeRowValues[index] || ""));
    logAction('Thêm vào KhoXe', `Thêm xe ${vinToCancel} vào KhoXe với trạng thái '${newKhoxeStatus}'`);
  }

  recordOrderHistory(soDonHang, vinToCancel, 'Hủy xuất hóa đơn', `Hủy xuất hóa đơn cho đơn hàng ${soDonHang}`);
  recordVehicleHistory(vinToCancel, 'Hủy xuất hóa đơn', `Hủy xuất hóa đơn cho đơn hàng ${soDonHang}`);
  updateSerialNumbers(xuathoadonSheet);
  showToastOnSheet(`Đã hủy xuất hóa đơn cho đơn hàng ${soDonHang}!`, "Thành công");
  logAction('Hủy xuất hóa đơn', `Hủy xuất hóa đơn cho đơn hàng ${soDonHang}, VIN ${vinToCancel}`);
}
function showCancelInvoicePrompt() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Hủy Xuất Hóa Đơn',
    'Vui lòng nhập số đơn hàng cần hủy xuất hóa đơn:',
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() === ui.Button.OK) {
    const soDonHang = response.getResponseText().trim();
    if (!soDonHang) {
      showToastOnSheet('Số đơn hàng không được để trống!', 'Lỗi'); // Changed from ui.alert
      logAction("Lỗi hủy xuất hóa đơn", "Người dùng không nhập số đơn hàng");
      return;
    }
    cancelInvoice(soDonHang);
  } else {
    showToastOnSheet('Thao tác hủy xuất hóa đơn đã bị hủy bỏ.', 'Đã hủy'); // Changed from ui.alert
    logAction("Hủy thao tác", "Người dùng đã hủy prompt hủy xuất hóa đơn");
  }
}
function removeVehiclesWithInvoicedStatus() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const stockSheet = getOrCreateSheet(ss, STOCK_SHEET_NAME, SHEET_HEADERS["KhoXe"]);
  const removedCarsLogSheet = getOrCreateSheet(ss, "removed_cars_log", SHEET_HEADERS["removed_cars_log"]);
  if (!stockSheet || !removedCarsLogSheet) {
    logAction("Lỗi xóa xe đã xuất hóa đơn", "Không tìm thấy sheet 'KhoXe' hoặc 'removed_cars_log'.");
    return;
  }

  const stockData = stockSheet.getDataRange().getValues();
  if (stockData.length <= 1) {
    logAction("Xóa xe đã xuất hóa đơn", "Sheet 'KhoXe' không có dữ liệu để xử lý.");
    return;
  }

  const headers = SHEET_HEADERS["KhoXe"]; // Use defined headers
  const vinCol = headers.indexOf("VIN");
  const statusCol = headers.indexOf("Trạng thái");
  const dongXeCol = headers.indexOf("Dòng xe");
  const phienBanCol = headers.indexOf("Phiên bản");
  const ngoaiThatCol = headers.indexOf("Ngoại thất");
  const noiThatCol = headers.indexOf("Nội thất");
  const ngayNhapCol = headers.indexOf("Ngày nhập");
  const daThongBaoCol = headers.indexOf("Đã thông báo");
  if (vinCol === -1 || statusCol === -1) {
    logAction("Lỗi xóa xe đã xuất hóa đơn", "Sheet 'KhoXe' thiếu cột 'VIN' hoặc 'Trạng thái'.");
    return;
  }

  const rowsToDelete = [];
  const removedCarLogs = [];
  const timestamp = new Date();
  const user = Session.getActiveUser() ? Session.getActiveUser().getEmail() : "Hệ thống tự động";
  for (let i = 1; i < stockData.length; i++) {
    const row = stockData[i];
    const vin = String(row[vinCol]).trim();
    const status = String(row[statusCol]).trim();

    if (status === "Đã xuất hóa đơn") {
      rowsToDelete.push(i + 1);
      const removedCarData = {};
      removedCarData["Thời gian xóa"] = Utilities.formatDate(timestamp, "GMT+7", "dd/MM/yyyy HH:mm:ss");
      removedCarData["Người xóa"] = user;
      removedCarData["Dòng xe"] = row[dongXeCol] || "";
      removedCarData["Phiên bản"] = row[phienBanCol] || "";
      removedCarData["Ngoại thất"] = row[ngoaiThatCol] || "";
      removedCarData["Nội thất"] = row[noiThatCol] || "";
      removedCarData["VIN"] = vin;
      removedCarData["Trạng thái (cũ)"] = status;
      removedCarData["Ngày nhập (cũ)"] = row[ngayNhapCol] ?
        Utilities.formatDate(new Date(row[ngayNhapCol]), "GMT+7", "dd/MM/yyyy HH:mm:ss") : "";
      removedCarData["Đã thông báo (cũ)"] = row[daThongBaoCol] || "";

      removedCarLogs.push(SHEET_HEADERS["removed_cars_log"].map(header => removedCarData[header]));
    }
  }

  for (let i = rowsToDelete.length - 1; i >= 0; i--) {
    stockSheet.deleteRow(rowsToDelete[i]);
    // Make sure to get VIN from original stockData before it's altered by deletions if logging VIN
    const originalRowIndex = rowsToDelete[i] - 1;
    // 0-based index in stockData
    logAction("Xóa xe đã xuất hóa đơn", `Đã xóa VIN ${stockData[originalRowIndex][vinCol]} khỏi KhoXe.`);
  }

  if (removedCarLogs.length > 0) {
    removedCarLogs.forEach(logRow => {
      appendAndFormatRow(removedCarsLogSheet, logRow);
    });
    logAction("Ghi log xe đã xóa", `Đã ghi ${removedCarLogs.length} xe đã xóa vào sheet 'removed_cars_log'.`);
  }

  if (rowsToDelete.length > 0) {
    showToastOnSheet(`Đã xóa ${rowsToDelete.length} xe có trạng thái "Đã xuất hóa đơn" khỏi kho xe.`, "Thông báo"); // Changed from alert
  } else {
    logAction("Xóa xe đã xuất hóa đơn", "Không tìm thấy xe nào có trạng thái 'Đã xuất hóa đơn' để xóa.");
  }
}
function showCancelMatchPrompt() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Hủy Ghép Đơn Hàng',
    'Vui lòng nhập số đơn hàng cần hủy ghép:',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() === ui.Button.OK) {
    const orderNumber = response.getResponseText().trim();
    if (!orderNumber) {
      showToastOnSheet('Số đơn hàng không được để trống!', 'Lỗi');
      logAction("Lỗi hủy ghép", "Người dùng không nhập số đơn hàng.");
      return;
    }
    // Gọi hàm logic mới
    const resultMessage = doReadWriteLock(() => unmatchOrder(orderNumber, "Hủy thủ công từ Menu"));
    showToastOnSheet(resultMessage, resultMessage.startsWith("Lỗi:") ? "Lỗi" : "Thành Công");
  } else {
    logAction("Hủy thao tác", "Người dùng đã hủy prompt hủy ghép đơn hàng.");
  }
}

function findRowByVin(sheet, vin) {
  const data = sheet.getDataRange().getValues();
  const headers = SHEET_HEADERS[sheet.getName()] || data[0]; // Get headers for the specific sheet
  const vinColIndex = headers.indexOf("VIN");

  if (vinColIndex === -1) {
    logAction("Lỗi findRowByVin", `Sheet ${sheet.getName()} không có cột 'VIN' trong SHEET_HEADERS hoặc sheet trống.`);
    return -1;
  }

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][vinColIndex] || "").trim() === String(vin).trim()) {
      return i + 1;
    }
  }
  return -1;
}
function issueInvoice() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = getSheets(ss);
  const { daGhepSheet, stockSheet, xuathoadonSheet, thongtinxeSheet } = sheets;
  // --- DEBUG: Bắt đầu hàm ---
  Logger.log("Bắt đầu hàm issueInvoice.");
  const response = ui.prompt(
    'Xuất Hóa Đơn',
    'Nhập số đơn hàng cần xuất hóa đơn:',
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK || !response.getResponseText().trim()) {
    Logger.log("Hủy bởi người dùng hoặc không nhập dữ liệu.");
    return;
  }

  const soDonHang = response.getResponseText().trim();
  // --- DEBUG: Lấy được số đơn hàng ---
  Logger.log(`Đang xử lý số đơn hàng: ${soDonHang}`);
  const daghepData = daGhepSheet.getDataRange().getValues();
  const daghepHeaders = SHEET_HEADERS["DaGhep"];
  const soDonHangColDaghep = daghepHeaders.indexOf("Số đơn hàng");
  const vinColDaghep = daghepHeaders.indexOf("VIN");
  let invoiceDataFromDaghep = null;
  let vin = null;
  let daghepRowIndex = -1;
  for (let i = 1; i < daghepData.length; i++) {
    if (String(daghepData[i][soDonHangColDaghep] || "").trim() === soDonHang) {
      invoiceDataFromDaghep = {};
      daghepHeaders.forEach((header, index) => {
        invoiceDataFromDaghep[header] = daghepData[i][index];
      });
      vin = String(daghepData[i][vinColDaghep] || "").trim();
      daghepRowIndex = i + 1;
      break;
    }
  }

  if (!invoiceDataFromDaghep || !vin) {
    showToastOnSheet(`Không tìm thấy số đơn hàng '${soDonHang}' hoặc đơn hàng chưa được ghép VIN trong sheet 'DaGhep'!`, "Lỗi"); // Changed from ui.alert
    // --- DEBUG: Lỗi không tìm thấy đơn hàng hoặc VIN ---
    Logger.log(`Lỗi: Không tìm thấy số đơn hàng '${soDonHang}' hoặc VIN trống trong DaGhep.`);
    return;
  }
  // --- DEBUG: Đã tìm thấy đơn hàng trong DaGhep ---
  Logger.log(`Tìm thấy đơn hàng '${soDonHang}' với VIN: ${vin}`);
  const khoxeRowIndex = findRowByVin(stockSheet, vin);
  if (khoxeRowIndex !== -1) {
    const khoxeRowData = stockSheet.getRange(khoxeRowIndex, 1, 1, SHEET_HEADERS["KhoXe"].length).getValues()[0];
    recordKhoxeStateBeforeInvoice(vin, khoxeRowData);
    stockSheet.getRange(khoxeRowIndex, SHEET_HEADERS["KhoXe"].indexOf("Trạng thái") + 1).setValue("Đã xuất hóa đơn");
    // --- DEBUG: Đã cập nhật trạng thái trong KhoXe ---
    Logger.log(`Đã cập nhật trạng thái cho VIN ${vin} trong KhoXe thành 'Đã xuất hóa đơn'.`);
  } else {
    showToastOnSheet(`Không tìm thấy VIN '${vin}' trong sheet 'KhoXe'!`, "Lỗi"); // Changed from ui.alert
    // --- DEBUG: Lỗi không tìm thấy VIN trong KhoXe ---
    Logger.log(`Lỗi: Không tìm thấy VIN '${vin}' trong KhoXe.`);
    return;
  }

  let soDongCo = "";
  const thongtinxeData = thongtinxeSheet.getDataRange().getValues();
  const thongtinxeHeaders = SHEET_HEADERS["Thongtinxe"];
  const vinColThongtinxe = thongtinxeHeaders.indexOf("Số VIN");
  const soDongCoColThongtinxe = thongtinxeHeaders.indexOf("Số động cơ");
  for (let i = 1; i < thongtinxeData.length; i++) {
    if (String(thongtinxeData[i][vinColThongtinxe] || "").trim() === vin) {
      soDongCo = String(thongtinxeData[i][soDongCoColThongtinxe] || "").trim();
      break;
    }
  }

  if (!soDongCo) {
    showToastOnSheet(`Không tìm thấy Số Động Cơ cho VIN '${vin}' trong sheet 'Thongtinxe'!`, "Lỗi"); // Changed from ui.alert
    // --- DEBUG: Lỗi không tìm thấy Số Động Cơ ---
    Logger.log(`Lỗi: Không tìm thấy Số Động Cơ cho VIN '${vin}' trong Thongtinxe.`);
    return;
  }
  // --- DEBUG: Đã tìm thấy Số Động Cơ ---
  Logger.log(`Tìm thấy Số Động Cơ '${soDongCo}' cho VIN ${vin}.`);
  const xuathoadonDataValues = xuathoadonSheet.getDataRange().getValues();
  const xuathoadonHeaders = SHEET_HEADERS["Xuathoadon"];
  const soDonHangColXHD = xuathoadonHeaders.indexOf("SỐ ĐƠN HÀNG");
  let lastRowWithData = 1;
  for (let i = 1; i < xuathoadonDataValues.length; i++) {
    if (xuathoadonDataValues[i][soDonHangColXHD] && String(xuathoadonDataValues[i][soDonHangColXHD]).trim() !== "") {
      lastRowWithData = i + 1;
    }
  }
  const rowToInsert = lastRowWithData + 1;
  // --- DEBUG: Xác định hàng để chèn dữ liệu ---
  Logger.log(`Sẽ chèn dữ liệu hóa đơn vào hàng: ${rowToInsert}`);
  if (rowToInsert > xuathoadonSheet.getMaxRows()) {
    xuathoadonSheet.insertRowsAfter(xuathoadonSheet.getMaxRows(), 1);
  }

  const newXuathoadonRow = xuathoadonHeaders.map(header => {
    switch (header) {
      case "SỐ TT": return "";
      case "TÊN KHÁCH HÀNG": return invoiceDataFromDaghep["Tên khách hàng"];
      case "SỐ ĐƠN HÀNG": return soDonHang;
      case "DÒNG XE": return invoiceDataFromDaghep["Dòng xe"];
      case "PHIÊN BẢN": return invoiceDataFromDaghep["Phiên bản"];
      case "NGOẠI THẤT": return invoiceDataFromDaghep["Ngoại thất"];
      case "NỘI THẤT": return invoiceDataFromDaghep["Nội thất"];
      case "TƯ VẤN BÁN HÀNG": return invoiceDataFromDaghep["Tên tư vấn bán hàng"];
      case "SỐ VIN": return vin;
      case "SỐ ĐỘNG CƠ": return soDongCo;
      case "NGÀY XUẤT HÓA ĐƠN": return "";
      case "PO PIN": return "";
      case "CHÍNH SÁCH": return "";
      case "NGÀY CỌC": return invoiceDataFromDaghep["Ngày cọc"];
      case "BÁO BÁN": return false;
      case "KẾT QUẢ GỬI MAIL": return "";
      default: return "";
    }
  });

  // --- DEBUG: Dữ liệu chuẩn bị được ghi ---
  Logger.log(`Dữ liệu hàng mới chuẩn bị ghi: ${JSON.stringify(newXuathoadonRow)}`);
  try {
    xuathoadonSheet.getRange(rowToInsert, 1, 1, xuathoadonHeaders.length).setValues([newXuathoadonRow]);
    // --- DEBUG: Ghi dữ liệu thành công ---
    Logger.log("Đã ghi dữ liệu thành công vào sheet Xuathoadon.");
  } catch (err) {
    // --- DEBUG: Lỗi khi ghi dữ liệu ---
    Logger.log(`Lỗi nghiêm trọng khi gọi setValues(): ${err.message}. Stack: ${err.stack}`);
    showToastOnSheet(`Đã xảy ra lỗi khi cố gắng ghi dữ liệu vào sheet Xuathoadon. Vui lòng kiểm tra nhật ký thực thi (Executions).`, "Lỗi"); // Changed from ui.alert
    return;
  }

  if (daghepRowIndex !== -1) {
    daGhepSheet.getRange(daghepRowIndex, daghepHeaders.indexOf("Kết quả") + 1).setValue("Đã xuất hóa đơn");
  }

  recordOrderHistory(soDonHang, vin, "Xuất hóa đơn", `Xuất hóa đơn cho đơn hàng ${soDonHang}`);
  recordVehicleHistory(vin, "Xuất hóa đơn", `Xuất hóa đơn cho đơn hàng ${soDonHang}`);

  updateSerialNumbers(xuathoadonSheet);
  syncKhoxeStatus(daGhepSheet, stockSheet, xuathoadonSheet);
  showToastOnSheet(`Đã xuất hóa đơn cho đơn hàng ${soDonHang}!`, "Thành công"); // Changed from ui.alert
  logAction("Xuất hóa đơn", `Đã xuất hóa đơn cho đơn hàng ${soDonHang}, VIN ${vin}`);
}

function findRowInDaGhep(sheet, soDonHang) {
  const data = sheet.getDataRange().getValues();
  const headers = SHEET_HEADERS["DaGhep"];
  const soDonHangCol = headers.indexOf("Số đơn hàng");
  if (soDonHangCol === -1) return -1;

  for (let i = 1; i < data.length; i++) { // Start from 1 to skip header
    if (String(data[i][soDonHangCol] || "").trim() === soDonHang) return i + 1; // 1-based row index
  }
  return -1;
}

function syncInvoiceDate(daghepSheet, xuathoadonSheet) {
  const daghepData = daghepSheet.getDataRange().getValues();
  const xuathoadonData = xuathoadonSheet.getDataRange().getValues();

  const daghepHeaders = SHEET_HEADERS["DaGhep"];
  const xuathoadonHeaders = SHEET_HEADERS["Xuathoadon"];

  const vinColDaghep = daghepHeaders.indexOf("VIN");
  const invoiceDateColDaghep = daghepHeaders.indexOf("Ngày xuất hóa đơn");

  const vinColXHD = xuathoadonHeaders.indexOf("SỐ VIN");
  const invoiceDateColXHD = xuathoadonHeaders.indexOf("NGÀY XUẤT HÓA ĐƠN");

  const vinToInvoiceDate = new Map();

  for (let i = 1; i < xuathoadonData.length; i++) {
    const vin = String(xuathoadonData[i][vinColXHD] || "").trim();
    const invoiceDate = xuathoadonData[i][invoiceDateColXHD];
    if (vin && invoiceDate) vinToInvoiceDate.set(vin, invoiceDate);
  }

  for (let i = 1; i < daghepData.length; i++) {
    const vin = String(daghepData[i][vinColDaghep] || "").trim();
    const currentInvoiceDate = daghepData[i][invoiceDateColDaghep];
    const expectedInvoiceDate = vinToInvoiceDate.get(vin) || "";
    // Compare dates carefully, as they might be Date objects or strings
    const currentInvoiceDateStr = currentInvoiceDate instanceof Date ? Utilities.formatDate(currentInvoiceDate, Session.getScriptTimeZone(), "yyyy-MM-dd") : String(currentInvoiceDate);
    const expectedInvoiceDateStr = expectedInvoiceDate instanceof Date ? Utilities.formatDate(expectedInvoiceDate, Session.getScriptTimeZone(), "yyyy-MM-dd") : String(expectedInvoiceDate);

    if (currentInvoiceDateStr !== expectedInvoiceDateStr) {
      daghepSheet.getRange(i + 1, invoiceDateColDaghep + 1).setValue(expectedInvoiceDate || null); // Set to null if empty to clear
    }
  }
}


/**
 * ĐỒNG BỘ TRẠNG THÁI KHO XE (NÂNG CẤP)
 * Logic: Xuathoadon > DaGhep > Đang Giữ > Chưa Ghép
 */
function syncKhoxeStatus(daghepSheet, khoxeSheet, xuathoadonSheet) {
  const daghepData = daghepSheet.getDataRange().getValues();
  const xuathoadonData = xuathoadonSheet.getDataRange().getValues();
  const khoxeData = khoxeSheet.getDataRange().getValues();

  const daghepHeaders = SHEET_HEADERS["DaGhep"];
  const xuathoadonHeaders = SHEET_HEADERS["Xuathoadon"];
  const khoxeHeaders = SHEET_HEADERS["KhoXe"];

  // Lấy chỉ số cột
  const vinColDaghep = daghepHeaders.indexOf("VIN");
  const vinColXHD = xuathoadonHeaders.indexOf("SỐ VIN");

  const vinColKhoXe = khoxeHeaders.indexOf("VIN");
  const statusColKhoXe = khoxeHeaders.indexOf("Trạng thái");
  const expiryColKhoXe = khoxeHeaders.indexOf("Thời Gian Hết Hạn Giữ"); // Cần để kiểm tra giữ xe

  if (vinColKhoXe === -1 || statusColKhoXe === -1) {
    logAction("Lỗi Sync", "Không tìm thấy cột VIN hoặc Trạng thái trong KhoXe");
    return;
  }

  // 1. Tạo Map cho Xe đã xuất hóa đơn
  const vinInvoicedSet = new Set();
  for (let i = 1; i < xuathoadonData.length; i++) {
    const vin = String(xuathoadonData[i][vinColXHD] || "").trim().toUpperCase();
    if (vin) vinInvoicedSet.add(vin);
  }

  // 2. Tạo Map cho Xe đã ghép
  const vinMatchedSet = new Set();
  for (let i = 1; i < daghepData.length; i++) {
    const vin = String(daghepData[i][vinColDaghep] || "").trim().toUpperCase();
    if (vin) vinMatchedSet.add(vin);
  }

  // 3. Quét và cập nhật Kho Xe
  const updates = [];
  const timestamp = new Date();

  for (let i = 1; i < khoxeData.length; i++) {
    const vin = String(khoxeData[i][vinColKhoXe] || "").trim().toUpperCase();
    const currentStatus = String(khoxeData[i][statusColKhoXe] || "").trim();

    // Lấy thông tin giữ xe
    const expiryValue = expiryColKhoXe !== -1 ? khoxeData[i][expiryColKhoXe] : null;
    const expiryTime = parseVietnameseDateTime(expiryValue);
    const isHolding = currentStatus.toLowerCase() === "đang giữ" && expiryTime && expiryTime > timestamp;

    let expectedStatus = "Chưa ghép"; // Mặc định

    // --- LOGIC ĐA TẦNG ---
    if (vinInvoicedSet.has(vin)) {
      expectedStatus = "Đã xuất hóa đơn";
    } else if (vinMatchedSet.has(vin)) {
      expectedStatus = "Đã ghép";
    } else if (isHolding) {
      expectedStatus = "Đang giữ"; // Giữ nguyên nếu đang giữ hợp lệ và chưa ghép/xuất HĐ
    }
    // ---------------------

    // Chỉ cập nhật nếu trạng thái thay đổi
    if (vin && currentStatus !== expectedStatus) {
      // Lưu vào mảng updates để ghi 1 lần (batch write) hoặc ghi từng dòng nếu cần an toàn
      khoxeSheet.getRange(i + 1, statusColKhoXe + 1).setValue(expectedStatus);
      // Nếu xe chuyển từ Đang giữ sang Đã ghép/Chưa ghép -> Xóa thông tin giữ xe để sạch dữ liệu
      if (currentStatus.toLowerCase() === "đang giữ" && expectedStatus !== "Đang giữ") {
        const holderCol = khoxeHeaders.indexOf("Người Giữ Xe");
        if (holderCol !== -1) khoxeSheet.getRange(i + 1, holderCol + 1).setValue("");
        if (expiryColKhoXe !== -1) khoxeSheet.getRange(i + 1, expiryColKhoXe + 1).setValue("");
      }
    }
  }

  // 4. Gọi hàm dọn dẹp xe đã xuất hóa đơn (nếu có logic xóa)
  removeVehiclesWithInvoicedStatus();
}
function removeXuathoadonRowsFromPreviousMonth() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = getSheets(ss);
  const { xuathoadonSheet } = sheets;
  if (!xuathoadonSheet) {
    logAction("Lỗi xóa Xuathoadon", "Không tìm thấy sheet 'Xuathoadon'.");
    showToastOnSheet("Không tìm thấy sheet 'Xuathoadon'.", "Lỗi"); // Changed from ui.alert
    return;
  }

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed (January is 0)

  // Determine previous month and year
  let previousMonthDate = new Date(currentYear, currentMonth, 1);
  previousMonthDate.setDate(0); // Go to the last day of the previous month
  const previousYear = previousMonthDate.getFullYear();
  const previousMonth = previousMonthDate.getMonth(); // 0-indexed

  logAction("Thông tin tháng xóa (Xuathoadon)", `Sẽ xóa các dòng trong 'Xuathoadon' có ngày xuất hóa đơn (cột NGÀY XUẤT HÓA ĐƠN) thuộc tháng ${previousMonth + 1}/${previousYear}`);
  const xuathoadonDataRange = xuathoadonSheet.getDataRange();
  const xuathoadonData = xuathoadonDataRange.getValues();
  const xuathoadonHeaders = SHEET_HEADERS["Xuathoadon"];
  const invoiceDateColXHD = xuathoadonHeaders.indexOf("NGÀY XUẤT HÓA ĐƠN");
  const soDonHangColXHD = xuathoadonHeaders.indexOf("SỐ ĐƠN HÀNG");
  const vinColXHD = xuathoadonHeaders.indexOf("SỐ VIN");
  if (xuathoadonData.length <= 1) {
    logAction("Xóa Xuathoadon tháng trước", "Sheet 'Xuathoadon' không có dữ liệu (chỉ có header hoặc trống).");
    return;
  }

  const rowsToDelete = []; // Store 1-based sheet row numbers

  for (let i = 1; i < xuathoadonData.length; i++) { // Start from 1 to skip header
    const rowData = xuathoadonData[i];
    const invoiceDateValue = rowData[invoiceDateColXHD];

    let invoiceDate = null;
    if (invoiceDateValue instanceof Date && !isNaN(invoiceDateValue)) {
      invoiceDate = invoiceDateValue;
    } else if (typeof invoiceDateValue === 'string' || typeof invoiceDateValue === 'number') {
      const parsedDate = new Date(invoiceDateValue);
      if (!isNaN(parsedDate)) {
        invoiceDate = parsedDate;
      }
    }

    if (invoiceDate) {
      const invoiceYear = invoiceDate.getFullYear();
      const invoiceMonth = invoiceDate.getMonth(); // 0-indexed

      if (invoiceYear === previousYear && invoiceMonth === previousMonth) {
        rowsToDelete.push(i + 1);
      }
    }
  }

  if (rowsToDelete.length === 0) {
    logAction("Xóa Xuathoadon tháng trước", `Không tìm thấy dòng nào trong 'Xuathoadon' có ngày xuất hóa đơn thuộc tháng ${previousMonth + 1}/${previousYear} để xóa.`);
    return;
  }

  // Sort rows in descending order to delete from bottom up, avoiding index shifts
  rowsToDelete.sort((a, b) => b - a);
  logAction("Chuẩn bị xóa Xuathoadon", `Các dòng (1-based) trong 'Xuathoadon' được xác định để xóa: ${rowsToDelete.join(', ')}`);

  let deletedCount = 0;
  rowsToDelete.forEach(rowNumToDelete => {
    const originalRowIndexInData = rowNumToDelete - 1; // 0-based index in xuathoadonData

    if (originalRowIndexInData >= 1 && originalRowIndexInData < xuathoadonData.length) { // Ensure it's a valid data row index
      const soDonHangCuaDongBiXoa = String(xuathoadonData[originalRowIndexInData][soDonHangColXHD] || "").trim();
      const vinCuaDongBiXoa = String(xuathoadonData[originalRowIndexInData][vinColXHD] || "").trim();
      const ngayXuatHoaDonBiXoa = xuathoadonData[originalRowIndexInData][invoiceDateColXHD];

      recordOrderHistory(soDonHangCuaDongBiXoa, vinCuaDongBiXoa, "Xóa hóa đơn (Xuathoadon)", `Hóa đơn bị xóa khỏi Xuathoadon do ngày xuất (cột NGÀY XUẤT HÓA ĐƠN: ${Utilities.formatDate(new Date(ngayXuatHoaDonBiXoa), Session.getScriptTimeZone(), "dd/MM/yyyy")}) thuộc tháng ${previousMonth + 1}/${previousYear}.`);

      xuathoadonSheet.deleteRow(rowNumToDelete);
      deletedCount++;
      logAction("Xóa dòng Xuathoadon", `Đã xóa dòng ${rowNumToDelete} trong 'Xuathoadon'.`);
    } else {
      logAction("Lỗi ghi lịch sử hoặc xóa Xuathoadon", `Không thể truy cập xuathoadonData[${originalRowIndexInData}] hoặc dòng sheet ${rowNumToDelete} không hợp lệ.`);
    }
  });


  if (deletedCount > 0) {
    updateSerialNumbers(xuathoadonSheet);
    logAction("Hoàn tất xóa Xuathoadon", `Đã xóa tổng cộng ${deletedCount} dòng khỏi sheet 'Xuathoadon'. Cột Số TT đã được cập nhật.`);
    showToastOnSheet(`Đã xóa ${deletedCount} dòng khỏi sheet 'Xuathoadon' do có ngày xuất hóa đơn thuộc tháng ${previousMonth + 1}/${previousYear}. Số thứ tự đã được cập nhật.`, "Hoàn tất"); // Changed from ui.alert
  }
}

function setupRemoveXuathoadonTrigger() {
  const ui = SpreadsheetApp.getUi();
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === "removeXuathoadonRowsFromPreviousMonth") {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  try {
    ScriptApp.newTrigger("removeXuathoadonRowsFromPreviousMonth")
      .timeBased()
      .onMonthDay(1)
      .atHour(9) // Runs at 9 AM on the 1st of every month
      .create();
    showToastOnSheet("Đã thiết lập trigger xóa hóa đơn trong Xuathoadon đã xuất hóa đơn tháng trước vào ngày 1 mỗi tháng lúc 9:00.", "Thành công"); // Changed from ui.alert
    logAction("Thiết lập trigger", "Trigger xóa hóa đơn Xuathoadon tháng trước được thiết lập");
  } catch (e) {
    showToastOnSheet(`Lỗi khi thiết lập trigger: ${e.message}`, "Lỗi"); // Changed from ui.alert
    logAction("Lỗi thiết lập trigger", `Trigger xóa hóa đơn Xuathoadon tháng trước: ${e.message}`);
  }

}

function showManualMatchSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('Ghép Xe Thủ Công')
    .setWidth(300);
  SpreadsheetApp.getUi().showSidebar(html);
}
function manualMatchCar(orderNumber, vin) {
  // Sử dụng doReadWriteLock để đảm bảo an toàn dữ liệu khi có nhiều người dùng.
  const result = doReadWriteLock(() => {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const daGhepSheet = getOrCreateSheet(ss, DA_GHEP_SHEET_NAME, SHEET_HEADERS["DaGhep"]);
    const chuaGhepSheet = getOrCreateSheet(ss, CHUA_GHEP_SHEET_NAME, SHEET_HEADERS["ChuaGhep"]);
    const stockSheet = getOrCreateSheet(ss, STOCK_SHEET_NAME, SHEET_HEADERS["KhoXe"]);
    const mailSheet = getOrCreateSheet(ss, MAIL_SHEET_NAME, SHEET_HEADERS["Mail"]);

    if (!daGhepSheet || !chuaGhepSheet || !stockSheet || !mailSheet) {
      throw new Error("Không tìm thấy một hoặc nhiều sheet cần thiết.");
    }

    const chuaGhepData = chuaGhepSheet.getDataRange().getValues();
    const chuaGhepHeaders = SHEET_HEADERS["ChuaGhep"];
    const orderNumberColChuaGhep = chuaGhepHeaders.indexOf("Số đơn hàng");
    let orderRowIndex = -1;
    let orderDataFromChuaGhep = null;

    for (let i = 1; i < chuaGhepData.length; i++) {
      if (String(chuaGhepData[i][orderNumberColChuaGhep]).trim() === String(orderNumber).trim()) {
        orderRowIndex = i + 1; // 1-based index
        orderDataFromChuaGhep = chuaGhepData[i];
        break;
      }
    }

    if (orderRowIndex === -1) {
      logAction("Lỗi ghép thủ công", `Không tìm thấy đơn hàng ${orderNumber} trong sheet 'ChuaGhep'.`);
      return { status: "ERROR", message: `Không tìm thấy đơn hàng ${orderNumber} trong danh sách chờ ghép.` };
    }

    const stockData = stockSheet.getDataRange().getValues();
    const stockHeaders = SHEET_HEADERS["KhoXe"];
    const vinColStock = stockHeaders.indexOf("VIN");
    const statusColStock = stockHeaders.indexOf("Trạng thái");
    const maDMSColStock = stockHeaders.indexOf("Mã DMS");
    let carRowIndex = -1;
    let carDataFromStock = null;

    for (let i = 1; i < stockData.length; i++) {
      if (String(stockData[i][vinColStock]).trim() === String(vin).trim()) {
        carRowIndex = i + 1;
        carDataFromStock = stockData[i];
        break;
      }
    }

    if (carRowIndex === -1) {
      logAction("Lỗi ghép thủ công", `Không tìm thấy VIN ${vin} trong sheet 'KhoXe'.`);
      return { status: "ERROR", message: `Không tìm thấy VIN ${vin} trong kho xe.` };
    }

    const carStatus = String(carDataFromStock[statusColStock]).toLowerCase().trim();
    if (carStatus !== "chưa ghép" && carStatus !== "đang giữ") {
      logAction("Lỗi ghép thủ công", `VIN ${vin} đã có trạng thái '${carDataFromStock[statusColStock]}', không thể ghép.`);
      return { status: "ERROR", message: `VIN ${vin} đã có trạng thái '${carDataFromStock[statusColStock]}', không thể ghép.` };
    }

    const maDMS = carDataFromStock[maDMSColStock];
    stockSheet.getRange(carRowIndex, statusColStock + 1).setValue("Đã ghép");
    recordVehicleHistory(vin, "Ghép thủ công", `Đã ghép với đơn hàng ${orderNumber}`);

    const newRowForDaGhep = {};
    const currentTime = new Date();
    const daGhepHeaders = SHEET_HEADERS["DaGhep"];

    daGhepHeaders.forEach(header => {
      const chuaGhepHeaderIndex = chuaGhepHeaders.indexOf(header);
      newRowForDaGhep[header] = (chuaGhepHeaderIndex !== -1) ? orderDataFromChuaGhep[chuaGhepHeaderIndex] : "";
    });

    newRowForDaGhep["VIN"] = vin;
    newRowForDaGhep["Kết quả"] = "Đã ghép";
    newRowForDaGhep["Thời gian ghép"] = formatDateTimeForSheet(currentTime);

    const targetRow = daGhepSheet.getLastRow() + 1;
    const thoiGianGhepColLetter = "K";
    newRowForDaGhep["Số ngày ghép"] = `=IFERROR(DATEDIF(${thoiGianGhepColLetter}${targetRow};TODAY();"D"))`;

    const rowDataToAppend = daGhepHeaders.map(header => newRowForDaGhep[header] || "");
    appendAndFormatRow(daGhepSheet, rowDataToAppend);

    chuaGhepSheet.deleteRow(orderRowIndex);

    const orderDataForEmail = {
      ten_ban_hang: newRowForDaGhep["Tên tư vấn bán hàng"],
      ten_khach_hang: newRowForDaGhep["Tên khách hàng"],
      dong_xe: newRowForDaGhep["Dòng xe"],
      phien_ban: newRowForDaGhep["Phiên bản"],
      ngoai_that: newRowForDaGhep["Ngoại thất"],
      noi_that: newRowForDaGhep["Nội thất"],
      so_don_hang: newRowForDaGhep["Số đơn hàng"],
      ngay_coc: newRowForDaGhep["Ngày cọc"],
      thoi_gian_nhap: newRowForDaGhep["Thời gian nhập"]
    };

    const emailSentSuccessfully = sendEmailNotification(mailSheet, orderDataForEmail, vin, maDMS, currentTime);

    const lastDaGhepRow = daGhepSheet.getLastRow();
    const trangThaiGuiMailColDaGhep = daGhepHeaders.indexOf("Trạng thái gửi mail");
    if (trangThaiGuiMailColDaGhep !== -1) {
      daGhepSheet.getRange(lastDaGhepRow, trangThaiGuiMailColDaGhep + 1).setValue(emailSentSuccessfully ? "Đã gửi" : "Lỗi gửi");
    }

    recordOrderHistory(orderNumber, vin, "Ghép thủ công", `Đã ghép thủ công VIN ${vin} cho đơn hàng ${orderNumber}`);
    runSyncKhoxeStatus();
    return `Đã ghép thành công đơn hàng ${orderNumber} với VIN ${vin}.`;
  });

  // Tích hợp thông báo
  if (result && typeof result === 'string' && result.startsWith("Đã ghép thành công")) {
    addNotification(`Đơn hàng ${orderNumber} đã được ghép thủ công với xe ${vin}.`, 'success');
  } else if (result && result.status === "ERROR") {
    addNotification(`Ghép thủ công thất bại cho ĐH ${orderNumber}: ${result.message}`, 'danger');
  }
  return result;
}


function unmatchOrder(orderNumber, reason, userEmail) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheets = getSheets(ss);
  const { daGhepSheet, stockSheet, chuaGhepSheet } = sheets;

  if (!orderNumber) {
    return { success: false, message: "Lỗi: Không có số đơn hàng." };
  }
  if (!reason || reason.trim() === "") {
    return { success: false, message: "Lỗi: Lý do hủy ghép là bắt buộc." };
  }

  const daGhepData = daGhepSheet.getDataRange().getValues();
  const daGhepHeaders = daGhepSheet.getRange(1, 1, 1, daGhepSheet.getLastColumn()).getValues()[0];
  const orderColIndex = daGhepHeaders.indexOf("Số đơn hàng");
  const vinColIndex = daGhepHeaders.indexOf("VIN");

  let orderRowIndex = -1;
  let rowDataToMove = null;
  for (let i = 1; i < daGhepData.length; i++) {
    if (String(daGhepData[i][orderColIndex]).trim() === String(orderNumber).trim()) {
      orderRowIndex = i + 1;
      rowDataToMove = daGhepData[i];
      break;
    }
  }

  if (orderRowIndex === -1) {
    logAction("Lỗi Hủy Ghép", `Không tìm thấy đơn hàng ${orderNumber} trong sheet 'DaGhep'.`);
    return { success: false, message: `Lỗi: Không tìm thấy đơn hàng ${orderNumber} trong danh sách đã ghép.` };
  }

  const vinToRevert = String(rowDataToMove[vinColIndex] || "").trim();
  if (vinToRevert) {
    updateKhoxeStatusForVin(stockSheet, vinToRevert, "Chưa ghép");
    recordVehicleHistory(vinToRevert, "Hủy ghép xe", `Hủy ghép với ĐH ${orderNumber}. Lý do: ${reason}. VIN được trả về kho.`);
  }

  const chuaGhepHeaders = SHEET_HEADERS["ChuaGhep"];
  const newChuaGhepRow = {};

  chuaGhepHeaders.forEach(header => {
    const indexInDaGhep = daGhepHeaders.indexOf(header);
    if (indexInDaGhep !== -1) {
      newChuaGhepRow[header] = rowDataToMove[indexInDaGhep];
    }
  });
  newChuaGhepRow["Kết quả"] = "Chưa ghép";
  newChuaGhepRow["Trạng thái gửi mail"] = ""; // Xóa trạng thái mail cũ

  const rowDataForChuaGhep = chuaGhepHeaders.map(header => newChuaGhepRow[header] || "");
  appendAndFormatRow(chuaGhepSheet, rowDataForChuaGhep);

  daGhepSheet.deleteRow(orderRowIndex);

  const historyDetails = `Đã hủy ghép xe. Lý do: "${reason}". Đơn hàng được chuyển về lại 'Chờ Ghép' bởi ${userEmail}.`;
  recordOrderHistory(orderNumber, vinToRevert, "Hủy ghép xe", historyDetails);

  const emailData = {
    ten_ban_hang: newChuaGhepRow["Tên tư vấn bán hàng"],
    ten_khach_hang: newChuaGhepRow["Tên khách hàng"],
    so_don_hang: orderNumber
  };
  runSyncKhoxeStatus();
  return {
    success: true,
    message: `Đã hủy ghép thành công cho đơn hàng ${orderNumber}.`,
    emailData: emailData,
    vin: vinToRevert,
    reason: reason
  };
}
function restoreVinToDaghep(ss, vin, xuathoadonRowArray) { // xuathoadonRowArray is the array of values from the deleted row
  const daGhepSheet = getOrCreateSheet(ss, DA_GHEP_SHEET_NAME, SHEET_HEADERS["DaGhep"]);
  const chuaGhepSheet = getOrCreateSheet(ss, CHUA_GHEP_SHEET_NAME, SHEET_HEADERS["ChuaGhep"]);
  const stockSheet = getOrCreateSheet(ss, STOCK_SHEET_NAME, SHEET_HEADERS["KhoXe"]);

  const daghepData = daGhepSheet.getDataRange().getValues();
  const daghepHeaders = SHEET_HEADERS["DaGhep"];
  const vinColDaghep = daghepHeaders.indexOf("VIN");
  const resultColDaghep = daghepHeaders.indexOf("Kết quả");
  const invoiceDateColDaghep = daghepHeaders.indexOf("Ngày xuất hóa đơn");

  let foundInDaghep = false;
  for (let i = 1; i < daghepData.length; i++) { // Start from 1 to skip header
    if (String(daghepData[i][vinColDaghep] || "").trim() === String(vin).trim()) {
      daGhepSheet.getRange(i + 1, resultColDaghep + 1).setValue("Đã ghép");
      daGhepSheet.getRange(i + 1, invoiceDateColDaghep + 1).setValue(""); // Clear invoice date
      logAction("Khôi phục DaGhep", `VIN ${vin} đã được khôi phục trạng thái 'Đã ghép' và xóa ngày xuất hóa đơn trong DaGhep.`);
      foundInDaghep = true;
      break;
    }
  }

  if (!foundInDaghep) {
    const xuathoadonHeaders = SHEET_HEADERS["Xuathoadon"];
    const soDonHang = String(xuathoadonRowArray[xuathoadonHeaders.indexOf("SỐ ĐƠN HÀNG")] || "").trim();

    const orderDataForChuaGhep = {
      ten_ban_hang: xuathoadonRowArray[xuathoadonHeaders.indexOf("TƯ VẤN BÁN HÀNG")],
      ten_khach_hang: xuathoadonRowArray[xuathoadonHeaders.indexOf("TÊN KHÁCH HÀNG")],
      dong_xe: xuathoadonRowArray[xuathoadonHeaders.indexOf("DÒNG XE")],
      phien_ban: xuathoadonRowArray[xuathoadonHeaders.indexOf("PHIÊN BẢN")],
      ngoai_that: xuathoadonRowArray[xuathoadonHeaders.indexOf("NGOẠI THẤT")],
      noi_that: xuathoadonRowArray[xuathoadonHeaders.indexOf("NỘI THẤT")],
      so_don_hang: soDonHang,
      ngay_coc: xuathoadonRowArray[xuathoadonHeaders.indexOf("NGÀY CỌC")],
      thoi_gian_nhap: new Date() // Use current time for re-entry into ChuaGhep
    };
    addToChuaghepIfNotDuplicate(chuaGhepSheet, orderDataForChuaGhep);
    logAction("Thêm vào ChuaGhep (restore)", `VIN ${vin} không có trong DaGhep, đã thêm/kiểm tra đơn hàng ${soDonHang} trong ChuaGhep.`);
  }

  updateKhoxeStatusForVin(stockSheet, vin, foundInDaghep ? "Đã ghép" : "Chưa ghép");
}
/**
 * Tạo nội dung HTML cho email cảnh báo đơn hàng quá hạn.
 * @param {string} title - Tiêu đề chính của email.
 * @param {string} recipientName - Tên người nhận.
 * @param {Array<Object>} orders - Mảng các đối tượng đơn hàng quá hạn.
 * @param {string} note - Ghi chú cuối email.
 * @returns {string} - Nội dung HTML của email.
 */
function checkForOverdueOrders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const daGhepSheet = ss.getSheetByName(DA_GHEP_SHEET_NAME);
  const mailSheet = ss.getSheetByName(MAIL_SHEET_NAME);

  if (!daGhepSheet || !mailSheet) {
    logAction("Lỗi cảnh báo quá hạn", "Không tìm thấy sheet DaGhep hoặc Mail.");
    return;
  }

  const dataRange = daGhepSheet.getDataRange();
  const values = dataRange.getValues();
  const sheetHeaders = values[0];
  const soNgayGhepCol = sheetHeaders.indexOf("Số ngày ghép");
  const ngayXuatHDCol = sheetHeaders.indexOf("Ngày xuất hóa đơn");
  const tvbhCol = sheetHeaders.indexOf("Tên tư vấn bán hàng");
  const soDonHangCol = sheetHeaders.indexOf("Số đơn hàng");
  const tenKhachHangCol = sheetHeaders.indexOf("Tên khách hàng");
  const vinCol = sheetHeaders.indexOf("VIN");
  const canhBaoCol = sheetHeaders.indexOf("Cảnh báo quá hạn");
  const ketQuaCol = sheetHeaders.indexOf("Kết quả");

  if ([soNgayGhepCol, ngayXuatHDCol, tvbhCol, soDonHangCol, tenKhachHangCol, vinCol, canhBaoCol, ketQuaCol].some(c => c === -1)) {
    logAction("Lỗi cảnh báo quá hạn", "Thiếu các cột cần thiết trong sheet DaGhep.");
    return;
  }

  const overdueOrdersByConsultant = {};
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const consultantName = row[tvbhCol];
    if (!consultantName) continue;

    const soNgayGhep = row[soNgayGhepCol];
    const ngayXuatHD = row[ngayXuatHDCol];
    const ketQua = String(row[ketQuaCol]).trim();
    const soNgayGhepValue = parseInt(soNgayGhep, 10);

    if (!isNaN(soNgayGhepValue) && soNgayGhepValue >= 4 && !ngayXuatHD && ketQua === "Đã ghép") {
      if (!overdueOrdersByConsultant[consultantName]) {
        overdueOrdersByConsultant[consultantName] = [];
      }

      overdueOrdersByConsultant[consultantName].push({
        so_don_hang: row[soDonHangCol],
        ten_khach_hang: row[tenKhachHangCol],
        vin: row[vinCol],
        so_ngay_ghep: soNgayGhepValue,
        rowIndex: i + 1
      });
    }
  }

  for (const consultantName in overdueOrdersByConsultant) {
    const orders = overdueOrdersByConsultant[consultantName];
    if (orders.length > 0) {
      const emailSent = sendOverdueWarningEmail(mailSheet, consultantName, orders);
      if (emailSent) {
        // --- THAY ĐỔI TẠI ĐÂY ---
        // Tạo chuỗi trạng thái mới bao gồm cả ngày gửi
        const notificationStatus = "Đã gửi " + Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");

        // Cập nhật trạng thái mới cho từng đơn hàng đã được gửi cảnh báo
        orders.forEach(order => {
          daGhepSheet.getRange(order.rowIndex, canhBaoCol + 1).setValue(notificationStatus);
        });
        logAction("Cập nhật trạng thái cảnh báo", `Đã cập nhật trạng thái cho ${orders.length} đơn hàng của ${consultantName}.`);
      }
    }
  }
}
function setupOverdueCheckTrigger() {
  const ui = SpreadsheetApp.getUi();
  const triggers = ScriptApp.getProjectTriggers();

  // Xóa các trigger cũ cho hàm này để tránh trùng lặp
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === "checkForOverdueOrders") {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  try {
    // Tạo trigger mới
    ScriptApp.newTrigger("checkForOverdueOrders")
      .timeBased()
      .everyDays(2)
      .atHour(8)
      .create();
    const message = "Đã thiết lập thành công trigger tự động kiểm tra và gửi cảnh báo đơn hàng quá hạn vào 9:00 sáng mỗi ngày.";
    showToastOnSheet(message, "Thành Công"); // Changed from ui.alert
    logAction("Thiết lập Trigger Cảnh Báo", message);
  } catch (e) {
    const errorMessage = `Lỗi khi thiết lập trigger: ${e.message}`;
    showToastOnSheet(errorMessage, "Lỗi"); // Changed from ui.alert
    logAction("Lỗi Trigger Cảnh Báo", errorMessage);
  }
}
function showDeleteCarFromStockPrompt() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Xóa Xe Khỏi Kho',
    'Vui lòng nhập Số VIN của xe cần xóa:',
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() === ui.Button.OK) {
    const vinToDelete = response.getResponseText().trim();
    if (!vinToDelete) {
      showToastOnSheet('Số VIN không được để trống!', 'Lỗi'); // Changed from ui.alert
      logAction("Lỗi Xóa Xe Kho", "Người dùng không nhập VIN.");
      return;
    }
    // Gọi hàm logic chính với LockService
    const resultMessage = doReadWriteLock(() => deleteCarFromStockLogic(vinToDelete));
    showToastOnSheet(resultMessage); // Changed from ui.alert
    logAction("Xóa Xe Kho (Prompt)", `Kết quả cho VIN ${vinToDelete}: ${resultMessage}`);
  } else {
    logAction("Hủy Xóa Xe Kho", "Người dùng đã hủy thao tác xóa xe.");
  }
}
// [THAY THẾ TOÀN BỘ HÀM CŨ]
function showRestoreCarToStockPrompt() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Phục Hồi Xe Vào Kho',
    'Vui lòng nhập Số VIN của xe cần phục hồi:',
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() === ui.Button.OK) {
    const vinToRestore = response.getResponseText().trim();
    if (!vinToRestore) {
      showToastOnSheet('Số VIN không được để trống!', 'Lỗi'); // Changed from ui.alert
      logAction("Lỗi Phục Hồi Xe", "Người dùng không nhập VIN.");
      return;
    }
    // Gọi hàm logic chính với LockService
    const resultMessage = doReadWriteLock(() => restoreCarToStockLogic(vinToRestore));
    showToastOnSheet(resultMessage); // Changed from ui.alert
    logAction("Phục Hồi Xe (Prompt)", `Kết quả cho VIN ${vinToRestore}: ${resultMessage}`);
  } else {
    logAction("Hủy Phục Hồi Xe", "Người dùng đã hủy thao tác phục hồi xe.");
  }
}
// [THAY THẾ TOÀN BỘ HÀM CŨ]
function restoreCarToStockLogic(vinToRestore) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const stockSheet = getOrCreateSheet(ss, STOCK_SHEET_NAME, SHEET_HEADERS["KhoXe"]);
  const removedCarsLogSheet = getOrCreateSheet(ss, "removed_cars_log", SHEET_HEADERS["removed_cars_log"]);
  const userEmail = Session.getActiveUser().getEmail() || "Không xác định";

  // Kiểm tra xem VIN đã tồn tại trong kho chưa (giữ nguyên)
  const stockDataCheck = stockSheet.getDataRange().getValues();
  const stockVinColCheck = SHEET_HEADERS["KhoXe"].indexOf("VIN");
  for (let k = 1; k < stockDataCheck.length; k++) {
    if (String(stockDataCheck[k][stockVinColCheck] || "").trim() === vinToRestore) {
      return `Lỗi: Xe với VIN ${vinToRestore} đã tồn tại trong KhoXe.`;
    }
  }

  // Lấy dữ liệu từ log (giữ nguyên)
  const logData = removedCarsLogSheet.getDataRange().getValues();
  const logHeaders = SHEET_HEADERS["removed_cars_log"];
  const vinColLog = logHeaders.indexOf("VIN");
  let carDataFromLog = null;
  for (let i = logData.length - 1; i >= 1; i--) {
    if (String(logData[i][vinColLog] || "").trim() === vinToRestore) {
      carDataFromLog = {};
      logHeaders.forEach((header, index) => {
        carDataFromLog[header] = logData[i][index];
      });
      break;
    }
  }

  if (!carDataFromLog) {
    return `Không tìm thấy thông tin xe với VIN ${vinToRestore} trong nhật ký xe đã xóa.`;
  }

  // [SỬA LỖI] Xây dựng mảng dữ liệu để ghi dựa trên header thực tế của sheet KhoXe
  const actualStockHeaders = stockSheet.getRange(1, 1, 1, stockSheet.getLastColumn()).getValues()[0];

  const newRowValues = actualStockHeaders.map(header => {
    switch (header) {
      case "Dòng xe": return carDataFromLog["Dòng xe"];
      case "Phiên bản": return carDataFromLog["Phiên bản"];
      case "Ngoại thất": return carDataFromLog["Ngoại thất"];
      case "Nội thất": return carDataFromLog["Nội thất"];
      case "VIN": return vinToRestore;
      case "Mã DMS": return carDataFromLog["Mã DMS (cũ)"]; // Lấy đúng Mã DMS từ log
      case "Trạng thái": return "Chưa ghép";
      case "Ngày nhập": return carDataFromLog["Ngày nhập (cũ)"] ? new Date(carDataFromLog["Ngày nhập (cũ)"]) : new Date();
      case "Đã thông báo": return carDataFromLog["Đã thông báo (cũ)"] || "";
      default: return ""; // Để trống cho các cột khác như checkbox, Người giữ xe...
    }
  });

  appendAndFormatRow(stockSheet, newRowValues);

  // Định dạng lại cột ngày cho đúng
  const lastRow = stockSheet.getLastRow();
  const ngayNhapColIndex = actualStockHeaders.indexOf("Ngày nhập");
  if (ngayNhapColIndex > -1) {
    stockSheet.getRange(lastRow, ngayNhapColIndex + 1).setNumberFormat("dd/MM/yyyy hh:mm:ss");
  }

  recordVehicleHistory(vinToRestore, "Phục Hồi Vào Kho", `Xe đã được phục hồi bởi ${userEmail} từ Web App.`);
  logAction("Phục Hồi Xe Thành Công", `VIN ${vinToRestore} đã được phục hồi vào KhoXe.`);
  return `Xe với VIN ${vinToRestore} đã được phục hồi thành công!`;
}
function archiveInvoicedOrdersMonthly(year = null, month = null) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const xuathoadonSheet = getOrCreateSheet(ss, XUAT_HOA_DON_SHEET_NAME, SHEET_HEADERS["Xuathoadon"]);

  if (!xuathoadonSheet || xuathoadonSheet.getLastRow() < 2) {
    const errorMsg = `Lỗi hoặc không có dữ liệu trong sheet '${XUAT_HO_DON_SHEET_NAME}'.`;
    logAction("Lỗi Lưu Trữ XHĐ", errorMsg);
    SpreadsheetApp.getUi().alert(errorMsg);
    return;
  }

  let namLuuTru, thangLuuTru;

  if (year !== null && month !== null) {
    namLuuTru = year;
    thangLuuTru = month - 1; // Tháng trong JavaScript bắt đầu từ 0
  } else {
    const today = new Date();
    const firstDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfPreviousMonth = new Date(firstDayOfCurrentMonth.getTime() - 1);
    namLuuTru = lastDayOfPreviousMonth.getFullYear();
    thangLuuTru = lastDayOfPreviousMonth.getMonth();
  }

  const archiveSheetName = `LuuTru_${namLuuTru}_${String(thangLuuTru + 1).padStart(2, '0')}`;
  const archiveSheet = getOrCreateSheet(ss, archiveSheetName, SHEET_HEADERS["Xuathoadon"]);

  const allData = xuathoadonSheet.getDataRange().getValues();
  const headers = allData[0];
  const invoiceDateColIndex = headers.indexOf("NGÀY XUẤT HÓA ĐƠN");

  if (invoiceDateColIndex === -1) {
    const errorMsg = "Sheet Xuathoadon thiếu cột 'NGÀY XUẤT HÓA ĐƠN'.";
    logAction("Lỗi Lưu Trữ XHĐ", errorMsg);
    SpreadsheetApp.getUi().alert(errorMsg);
    return;
  }

  let copiedCount = 0;
  // Duyệt ngược từ cuối lên để việc xóa (nếu có sau này) không ảnh hưởng đến chỉ số
  for (let i = allData.length - 1; i >= 1; i--) {
    const invoiceDateValue = allData[i][invoiceDateColIndex];
    if (invoiceDateValue instanceof Date && !isNaN(invoiceDateValue)) {
      const invoiceYear = invoiceDateValue.getFullYear();
      const invoiceMonth = invoiceDateValue.getMonth();

      if (invoiceYear === namLuuTru && invoiceMonth === thangLuuTru) {
        // Lấy toàn bộ dòng nguồn
        const sourceRowRange = xuathoadonSheet.getRange(i + 1, 1, 1, xuathoadonSheet.getLastColumn());
        // Xác định dòng tiếp theo trong sheet lưu trữ
        const destinationRow = archiveSheet.getLastRow() + 1;

        // Sử dụng copyTo để sao chép tất cả mọi thứ: giá trị, công thức, định dạng
        sourceRowRange.copyTo(archiveSheet.getRange(destinationRow, 1), { contentsOnly: false });

        copiedCount++;
      }
    }
  }

  if (copiedCount > 0) {
    const successMsg = `Đã sao chép và lưu trữ đầy đủ ${copiedCount} đơn hàng của tháng ${thangLuuTru + 1}/${namLuuTru} vào sheet ${archiveSheetName}.`;
    logAction("Lưu Trữ XHĐ (Bản đầy đủ)", successMsg);
    SpreadsheetApp.getUi().alert(successMsg);
  } else {
    const noRowsMsg = `Không có đơn hàng nào của tháng ${thangLuuTru + 1}/${namLuuTru} cần lưu trữ.`;
    logAction("Lưu Trữ XHĐ", noRowsMsg);
    SpreadsheetApp.getUi().alert(noRowsMsg);
  }
}
/**
 * Displays a prompt to the user to enter a month and year for archiving.
 * It then calls the archiveInvoicedOrdersMonthly function with the user's input.
 */
function showArchivePrompt() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Lưu Trữ Đơn Hàng Theo Tháng',
    'Vui lòng nhập tháng và năm cần lưu trữ (định dạng: MM-YYYY, ví dụ: 09-2024):',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() == ui.Button.OK) {
    const inputText = response.getResponseText();
    const parts = inputText.split('-');

    if (parts.length === 2) {
      const month = parseInt(parts[0], 10);
      const year = parseInt(parts[1], 10);

      if (!isNaN(month) && !isNaN(year) && month >= 1 && month <= 12 && year > 2000) {
        archiveInvoicedOrdersMonthly(year, month);
      } else {
        ui.alert('Định dạng tháng-năm không hợp lệ. Vui lòng thử lại.');
      }
    } else {
      ui.alert('Định dạng nhập không đúng. Vui lòng sử dụng định dạng MM-YYYY.');
    }
  }
}

/**
 * Tự động chuyển các đơn hàng cũ từ yeucauxhd/donhang sang archived_orders trong SQL.
 * Chạy vào ngày 1 hàng tháng thông qua trigger.
 */
function archiveInvoicedOrdersToSql() {
  Logger.log("--- BẮT ĐẦU: Lưu trữ đơn hàng cũ trong Supabase SQL ---");
  // Gọi stored procedure đã tạo trong Supabase
  const result = callSupabaseRpc('archive_old_orders', {});

  if (result && result.status === 'SUCCESS') {
    const msg = `Hệ thống đã tự động dọn dẹp và chuyển ${result.archived_count} đơn hàng cũ sang bảng Lưu Trữ SQL.`;
    Logger.log(msg);
    logAction("Lưu Trữ SQL Tự Động", msg);
    return msg;
  } else {
    const errorMsg = "Lỗi khi gọi lệnh lưu trữ SQL trong Supabase.";
    Logger.log(errorMsg);
    logAction("Lỗi Lưu Trữ SQL", errorMsg);
    return errorMsg;
  }
}

/**
 * Script di chuyển toàn bộ dữ liệu từ các sheet LuuTru_YYYY_MM sang SQL.
 * Chạy một lần duy nhất để đồng bộ dữ liệu cũ.
 */
function migrateHistoricalDataToSql() {
  Logger.log("--- BẮT ĐẦU: Di chuyển dữ liệu lịch sử từ Sheet sang SQL ---");
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  let totalMigrated = 0;

  // mapping từ Header tiếng Việt sang Column SQL (Sử dụng KEY chuẩn VIẾT HOA và TRIM)
  const mapping = {
    "SỐ ĐƠN HÀNG": "so_don_hang",
    "TÊN KHÁCH HÀNG": "ten_khach_hang",
    "DÒNG XE": "dong_xe",
    "PHIÊN BẢN": "phien_ban",
    "NGOẠI THẤT": "ngoai_that",
    "NỘI THẤT": "noi_that",
    "TƯ VẤN BÁN HÀNG": "tvbh",
    "SỐ VIN": "vin",
    "SỐ ĐỘNG CƠ": "so_may",
    "NGÀY YÊU CẦU XHĐ": "ngay_yeu_cau",
    "NGÀY XUẤT HÓA ĐƠN": "ngay_xuat_hoa_don",
    "HOA HỒNG ỨNG": "hoa_hong_ung",
    "ĐIỂM VPOINT SỬ DỤNG": "vpoint",
    "CHÍNH SÁCH": "chinh_sach",
    "NGÀY CỌC": "ngay_coc",
    "KẾT QUẢ GỬI MAIL": "trang_thai_gui_mail",
    "URL HỢP ĐỒNG": "url_hop_dong",
    "URL ĐỀ NGHỊ XHĐ": "url_de_nghi_xhd",
    "URL HÓA ĐƠN ĐÃ XUẤT": "url_hoa_don_da_xuat",
    "TRẠNG THÁI VC": "trang_thai_vc"
  };

  // 1. Xóa dữ liệu cũ trong bảng archived_orders để làm mới hoàn toàn
  deleteSupabase('archived_orders', 'id=not.is.null');

  sheets.forEach(sheet => {
    const rawName = sheet.getName().trim();
    const sheetName = rawName.toUpperCase();

    // Chấp nhận cả LuuTru_ và Luu Tru (có dấu gạch hoặc dấu cách)
    if (sheetName.startsWith("LUUTRU_") || sheetName.startsWith("LUU TRU")) {
      Logger.log(`>>> ĐANG XỬ LÝ SHEET: ${rawName}`);
      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();
      const richTextValues = dataRange.getRichTextValues(); // Cách mới để lấy link (bao gồm cả Ctrl+K)
      const formulas = dataRange.getFormulas();

      if (values.length <= 1) {
        Logger.log(`   Sheet ${rawName} trống hoặc chỉ có header. Bỏ qua.`);
        return;
      }

      // Chuẩn hóa headers: Viết hoa và xóa khoảng trắng dư thừa
      const headers = values[0].map(h => String(h || "").trim().toUpperCase());
      const payload = [];

      for (let i = 1; i < values.length; i++) {
        const obj = {};
        let hasData = false;
        for (let j = 0; j < headers.length; j++) {
          const h = headers[j];
          const sqlField = mapping[h];
          if (sqlField) {
            let val = values[i][j];

            // 1. Kiểm tra Link qua Rich Text (Cách phổ biến nhất hiện nay)
            const richText = richTextValues[i][j];
            const linkUrl = richText ? richText.getLinkUrl() : null;

            if (linkUrl) {
              val = linkUrl;
            } else {
              // 2. Nếu không có Rich Text Link, kiểm tra qua công thức HYPERLINK
              const formula = formulas[i][j];
              if (formula && formula.toUpperCase().indexOf("HYPERLINK") !== -1) {
                const urlMatch = formula.match(/HYPERLINK\s*\(\s*["']([^"']+)["']/i);
                if (urlMatch) val = urlMatch[1];
              }
            }

            // Xử lý định dạng ngày cho SQL
            if (val instanceof Date && !isNaN(val.getTime())) {
              val = val.toISOString();
            } else if (typeof val === 'string' && val.trim() !== "" && val.includes('/')) {
              const p = val.split('/');
              if (p.length === 3) {
                const d = parseInt(p[0]), m = parseInt(p[1]), y = parseInt(p[2]);
                if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
                  val = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                }
              }
            }

            // Đảm bảo không đẩy giá trị trống vào các trường bắt buộc nếu cần, hoặc chuẩn hóa Null
            obj[sqlField] = (val === "" || val === undefined) ? null : val;
            if (val) hasData = true;
          }
        }
        // Chỉ thêm nếu có Số đơn hàng (khóa chính logic)
        if (hasData && obj.so_don_hang) {
          payload.push(obj);
        }
      }

      Logger.log(`   Tìm thấy ${payload.length} dòng dữ liệu hợp lệ trong ${rawName}`);

      // Đẩy dữ liệu theo lô (batch) 50 dòng
      for (let i = 0; i < payload.length; i += 50) {
        const batch = payload.slice(i, i + 50);
        const success = insertSupabase('archived_orders', batch);
        if (success) {
          totalMigrated += batch.length;
        } else {
          Logger.log(`   ❌ Lỗi khi đẩy lô ${i} của sheet ${rawName}`);
        }
      }
    } else {
      // Logger.log(`   Bỏ qua sheet: ${rawName} (không phải sheet Lưu Trữ)`);
    }
  });

  const finalMsg = `Hoàn tất đồng bộ dữ liệu lịch sử. Tổng số đơn hàng đã đẩy lên SQL (có kèm Link): ${totalMigrated}`;
  Logger.log(finalMsg);
  logAction("Đồng bộ Lịch sử SQL", finalMsg);
  return finalMsg;
}

function setupArchiveInvoicedOrdersTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  // Xóa các trigger cũ cho hàm này để tránh trùng lặp
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === "archiveInvoicedOrdersMonthly" ||
      trigger.getHandlerFunction() === "archiveInvoicedOrdersToSql") {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  try {
    ScriptApp.newTrigger("archiveInvoicedOrdersMonthly")
      .timeBased()
      .onMonthDay(1) // Chạy vào ngày 1 hàng tháng
      .atHour(2)     // Chạy vào lúc 2 giờ sáng
      .create();

    // Thêm trigger cho phần SQL
    ScriptApp.newTrigger("archiveInvoicedOrdersToSql")
      .timeBased()
      .onMonthDay(1)
      .atHour(3)     // Chạy vào lúc 3 giờ sáng (sau khi archive sheet xong)
      .create();

    const message = "Đã thiết lập thành công trigger tự động lưu trữ hóa đơn (Sheet & SQL) vào sáng ngày 1 mỗi tháng.";
    showToastOnSheet(message, "Thành Công");
    logAction("Thiết lập Trigger Lưu Trữ XHĐ", message);
  } catch (e) {
    const errorMessage = `Lỗi khi thiết lập trigger lưu trữ XHĐ: ${e.message}`;
    showToastOnSheet(errorMessage, "Lỗi");
    logAction("Lỗi Trigger Lưu Trữ XHĐ", errorMessage);
  }
}
function showDeleteMonthlyInvoicedOrdersFromDaGhepPrompt() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.confirm(
    'Xác Nhận Xóa Vĩnh Viễn Đơn Hàng (Sheet DaGhep)',
    'Bạn có chắc chắn muốn XÓA VĨNH VIỄN các đơn hàng đã xuất hóa đơn của THÁNG TRƯỚC khỏi sheet DaGhep không?\n\nLƯU Ý: Hành động này sẽ xóa dữ liệu và KHÔNG có bước lưu trữ riêng cho các dòng này (trừ khi bạn có cơ chế sao lưu khác).\n\nNên sử dụng chức năng "Lưu trữ hóa đơn" cho sheet Xuathoadon nếu bạn muốn giữ lại bản sao.',
    ui.ButtonSet.YES_NO
  );
  if (response === ui.Button.YES) {
    const resultMessage = doReadWriteLock(() => deleteMonthlyInvoicedOrdersFromDaGhepLogic());
    showToastOnSheet(resultMessage, 'Kết Quả Xóa Từ DaGhep'); // Changed from ui.alert
  } else {
    showToastOnSheet('Đã hủy thao tác xóa đơn hàng khỏi sheet DaGhep.', 'Thông Báo'); // Changed from ui.alert
  }
}
function showDeleteOrderPrompt() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Xóa Đơn Hàng Vĩnh Viễn',
    'CẢNH BÁO: Hành động này sẽ xóa vĩnh viễn đơn hàng khỏi các sheet đang hoạt động (DaGhep, ChuaGhep) và chuyển vào HuyGhep.\n\nVui lòng nhập số đơn hàng cần xóa:',
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() === ui.Button.OK) {
    const orderNumber = response.getResponseText().trim();
    if (!orderNumber) {
      showToastOnSheet('Số đơn hàng không được để trống!', 'Lỗi'); // Changed from ui.alert
      logAction("Lỗi Xóa Đơn Hàng", "Người dùng không nhập số đơn hàng.");
      return;
    }
    // Gọi hàm logic chính với LockService để đảm bảo an toàn dữ liệu
    const resultMessage = doReadWriteLock(() => deleteOrderLogic(orderNumber, Session.getActiveUser().getEmail() || "Manual User"));

    // SỬA ĐỔI TẠI ĐÂY: Thêm ui.ButtonSet.OK
    showToastOnSheet(String(resultMessage), 'Kết Quả Xóa'); // Changed from ui.alert

  } else {
    showToastOnSheet('Thao tác xóa đơn hàng đã bị hủy bỏ.', 'Đã hủy'); // Changed from ui.alert
    logAction("Hủy thao tác", "Người dùng đã hủy prompt xóa đơn hàng.");
  }
}

function runDataHealthCheck() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Bắt đầu Kiểm tra & Sửa lỗi Dữ liệu?',
    'Quá trình này sẽ quét và tự động KHÔI PHỤC dữ liệu lỗi về trạng thái tốt gần nhất được ghi trong lịch sử. Một sheet báo cáo chi tiết sẽ được tạo. Bạn có muốn tiếp tục không?',
    ui.ButtonSet.YES_NO
  );
  if (response !== ui.Button.YES) {
    return;
  }

  SpreadsheetApp.getActiveSpreadsheet().toast('Đang bắt đầu quá trình kiểm tra và sửa lỗi. Vui lòng chờ...', 'Thông Báo', -1);
  logAction("Bắt đầu Kiểm tra & Sửa lỗi Dữ liệu", "Bắt đầu quét.");

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = getSheets(ss);
  const manualFixErrors = [];
  const autoCorrections = [];

  // Chạy các bài kiểm tra
  // ---- THAY THẾ LOGIC CŨ BẰNG LOGIC KHÔI PHỤC TỪ LỊCH SỬ MỚI ----
  const restoreResults = findAndRestoreFromHistory(sheets);
  autoCorrections.push(...restoreResults.corrections);
  manualFixErrors.push(...restoreResults.errors);
  // ---- HẾT THAY THẾ ----

  autoCorrections.push(...findAndFixInconsistentVins(sheets));
  autoCorrections.push(...findAndFixOrphanedOrders(sheets));

  const colorCheckResults = findAndFixInvalidColors(sheets);
  manualFixErrors.push(...colorCheckResults.errors);
  autoCorrections.push(...colorCheckResults.corrections);

  manualFixErrors.push(...findLongPendingOrders(sheets));
  // Tạo báo cáo
  generateHealthCheckReport(ss, manualFixErrors, autoCorrections);
  SpreadsheetApp.getActiveSpreadsheet().toast('Đã hoàn tất kiểm tra. Vui lòng xem sheet báo cáo mới.', 'Hoàn Thành', 10);
  logAction("Hoàn tất Kiểm tra & Sửa lỗi Dữ liệu", `Sửa tự động: ${autoCorrections.length}. Cần sửa thủ công: ${manualFixErrors.length}.`);
}
function findAndFixInconsistentVins(sheets) {
  const { daGhepSheet, stockSheet } = sheets;
  const corrections = [];
  const daGhepData = daGhepSheet.getDataRange().getValues();
  const stockData = stockSheet.getDataRange().getValues();

  const daGhepHeaders = SHEET_HEADERS["DaGhep"];
  const stockHeaders = SHEET_HEADERS["KhoXe"];

  const daGhepVinCol = daGhepHeaders.indexOf("VIN");
  const stockVinCol = stockHeaders.indexOf("VIN");
  const stockStatusCol = stockHeaders.indexOf("Trạng thái");

  const daGhepVins = new Set(daGhepData.slice(1).map(row => String(row[daGhepVinCol] || "").trim()).filter(Boolean));

  for (let i = 1; i < stockData.length; i++) {
    const row = stockData[i];
    const vin = String(row[stockVinCol] || "").trim();
    const status = String(row[stockStatusCol] || "").trim().toLowerCase();

    if (status === 'đã ghép' && vin && !daGhepVins.has(vin)) {
      // Tự động sửa: Đổi trạng thái về "Chưa ghép"
      stockSheet.getRange(i + 1, stockStatusCol + 1).setValue("Chưa ghép");
      const correctionDetails = `VIN "${vin}" trong KhoXe có trạng thái "Đã ghép" nhưng không tìm thấy trong DaGhep. Đã tự động đổi trạng thái về "Chưa ghép".`;
      corrections.push({
        type: 'Sửa VIN không nhất quán',
        details: correctionDetails,
        sheetName: STOCK_SHEET_NAME,
        row: i + 1,
        vin: vin,
        orderNumber: ''
      });
      recordVehicleHistory(vin, "Sửa lỗi tự động", "Trạng thái đổi về 'Chưa ghép' do không nhất quán.");
    }
  }
  return corrections;
}

/**
 * [SỬA LỖI 2] Tìm và sửa các đơn hàng trong DaGhep có VIN nhưng VIN đó lại không có trong KhoXe.
 * Trả về danh sách các hành động đã sửa.
 */
function findAndFixOrphanedOrders(sheets) {
  const { daGhepSheet, stockSheet, chuaGhepSheet } = sheets;
  const corrections = [];
  const daGhepData = daGhepSheet.getDataRange().getValues();
  const stockData = stockSheet.getDataRange().getValues();

  const daGhepHeaders = SHEET_HEADERS["DaGhep"];
  const stockHeaders = SHEET_HEADERS["KhoXe"];
  const chuaGhepHeaders = SHEET_HEADERS["ChuaGhep"];

  const stockVins = new Set(stockData.slice(1).map(row => String(row[stockHeaders.indexOf("VIN")] || "").trim()).filter(Boolean));
  const rowsToDelete = [];

  for (let i = 1; i < daGhepData.length; i++) {
    const rowData = daGhepData[i];
    const vin = String(rowData[daGhepHeaders.indexOf("VIN")] || "").trim();
    const orderNumber = String(rowData[daGhepHeaders.indexOf("Số đơn hàng")] || "").trim();

    if (vin && !stockVins.has(vin)) {
      // Tự động sửa: Chuyển đơn hàng về sheet ChuaGhep
      const newChuaGhepRow = {};
      chuaGhepHeaders.forEach(header => {
        const originalIndex = daGhepHeaders.indexOf(header);
        if (originalIndex !== -1) {
          newChuaGhepRow[header] = rowData[originalIndex];
        }
      });
      newChuaGhepRow["Kết quả"] = "Chờ ghép (VIN cũ không hợp lệ)";
      newChuaGhepRow["VIN"] = ""; // Xóa VIN không hợp lệ

      const rowDataForChuaGhep = chuaGhepHeaders.map(header => newChuaGhepRow[header] || "");
      appendAndFormatRow(chuaGhepSheet, rowDataForChuaGhep);

      rowsToDelete.push(i + 1); // Đánh dấu dòng để xóa khỏi DaGhep

      const correctionDetails = `Đơn hàng "${orderNumber}" có VIN "${vin}" không tồn tại trong KhoXe. Đã tự động chuyển đơn hàng về sheet ChuaGhep.`;
      corrections.push({
        type: 'Sửa đơn hàng mồ côi',
        details: correctionDetails,
        sheetName: DA_GHEP_SHEET_NAME,
        row: i + 1,
        vin: vin,
        orderNumber: orderNumber
      });
      recordOrderHistory(orderNumber, vin, "Sửa lỗi tự động", "Chuyển về ChuaGhep do VIN không tồn tại trong KhoXe.");
    }
  }

  // Xóa các dòng đã chuyển từ sheet DaGhep (xóa từ dưới lên để không bị lệch chỉ số)
  for (let i = rowsToDelete.length - 1; i >= 0; i--) {
    daGhepSheet.deleteRow(rowsToDelete[i]);
  }

  return corrections;
}

/**
 * [SỬA LỖI 3] Tìm và sửa các màu ngoại thất không hợp lệ.
 * Trả về cả danh sách lỗi cần sửa thủ công và danh sách đã sửa tự động.
 */
function findAndFixInvalidColors(sheets) {
  const { daGhepSheet, stockSheet } = sheets;
  const errors = [];
  const corrections = [];

  const checkAndFixSheet = (sheet, sheetName, headers) => {
    const colorColIndex = headers.indexOf("Ngoại thất");
    const vinColIndex = headers.indexOf("VIN");
    const orderColIndex = headers.indexOf("Số đơn hàng");
    if (colorColIndex === -1) return;

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const color = String(row[colorColIndex] || "").trim();
      if (color && !isValidExteriorColor(color)) {
        const matchedColor = findMatchedValidColor(color);
        const vin = vinColIndex !== -1 ? String(row[vinColIndex] || "").trim() : 'N/A';
        const orderNumber = orderColIndex !== -1 ? String(row[orderColIndex] || "").trim() : 'N/A';

        if (matchedColor) {
          // Tự động sửa
          sheet.getRange(i + 1, colorColIndex + 1).setValue(matchedColor);
          const correctionDetails = `Màu "${color}" đã được tự động sửa thành "${matchedColor}".`;
          corrections.push({
            type: 'Sửa màu ngoại thất',
            details: correctionDetails,
            sheetName: sheetName,
            row: i + 1,
            vin: vin,
            orderNumber: orderNumber
          });
        } else {
          // Báo lỗi để sửa thủ công
          errors.push({
            type: 'Màu ngoại thất không hợp lệ',
            details: `Giá trị màu "${color}" không hợp lệ và không thể tự động sửa.`,
            sheetName: sheetName,
            row: i + 1,
            vin: vin,
            orderNumber: orderNumber
          });
        }
      }
    }
  };

  checkAndFixSheet(stockSheet, STOCK_SHEET_NAME, SHEET_HEADERS["KhoXe"]);
  checkAndFixSheet(daGhepSheet, DA_GHEP_SHEET_NAME, SHEET_HEADERS["DaGhep"]);

  return { errors, corrections };
}

// Giữ nguyên hàm findLongPendingOrders vì nó chỉ báo cáo
function findLongPendingOrders(sheets) {
  const { chuaGhepSheet } = sheets;
  const errors = [];
  const data = chuaGhepSheet.getDataRange().getValues();
  const headers = SHEET_HEADERS["ChuaGhep"];
  const ngayCocCol = headers.indexOf("Ngày cọc");
  const orderCol = headers.indexOf("Số đơn hàng");
  const NINETY_DAYS_IN_MS = 90 * 24 * 60 * 60 * 1000;
  const now = new Date();

  if (ngayCocCol === -1) return errors;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const ngayCocValue = row[ngayCocCol];
    const orderNumber = String(row[orderCol] || "").trim();

    if (ngayCocValue && orderNumber) {
      const ngayCocDate = new Date(ngayCocValue);
      if (!isNaN(ngayCocDate.getTime()) && (now - ngayCocDate > NINETY_DAYS_IN_MS)) {
        const daysPending = Math.round((now - ngayCocDate) / (1000 * 60 * 60 * 24));
        errors.push({
          type: 'Đơn hàng chờ quá lâu',
          details: `Đơn hàng đã ở trạng thái chờ ${daysPending} ngày (kể từ ngày cọc). Cần được xem xét.`,
          sheetName: CHUA_GHEP_SHEET_NAME,
          row: i + 1,
          vin: '',
          orderNumber: orderNumber
        });
      }
    }
  }
  return errors;
}
/**
 * Tạo hoặc cập nhật sheet báo cáo duy nhất từ danh sách lỗi và danh sách đã sửa.
 */
function generateHealthCheckReport(ss, errors, corrections) {
  const spreadsheetUrl = ss.getUrl();
  const REPORT_SHEET_NAME = "Báo Cáo Sức Khỏe Dữ Liệu"; // Tên sheet báo cáo cố định

  // Lấy sheet báo cáo. Nếu đã tồn tại, xóa sạch nội dung. Nếu chưa, tạo mới.
  let reportSheet = ss.getSheetByName(REPORT_SHEET_NAME);
  if (reportSheet) {
    reportSheet.clear(); // Xóa sạch nội dung và định dạng cũ
  } else {
    reportSheet = ss.insertSheet(REPORT_SHEET_NAME, 0);
  }

  const reportHeaders = ["Loại Vấn Đề", "Chi Tiết", "Sheet", "Dòng", "Số Đơn Hàng", "VIN", "Link"];
  let currentRow = 1;

  // --- Phần đã tự động sửa ---
  reportSheet.getRange(currentRow, 1, 1, 7).setValue("CÁC VẤN ĐỀ ĐÃ TỰ ĐỘNG SỬA").merge().setBackground("#d9ead3").setFontWeight("bold").setHorizontalAlignment("center");
  currentRow++;
  reportSheet.getRange(currentRow, 1, 1, reportHeaders.length).setValues([reportHeaders]).setBackground("#4682b4").setFontColor("#ffffff").setFontWeight("bold");
  currentRow++;

  if (corrections.length > 0) {
    const correctionData = corrections.map(item => {
      // Lấy sheetId một cách an toàn
      const sourceSheet = ss.getSheetByName(item.sheetName);
      const sheetId = sourceSheet ? sourceSheet.getSheetId() : '0';
      const link = `${spreadsheetUrl}#gid=${sheetId}&range=A${item.row}`;
      return [item.type, item.details, item.sheetName, item.row, item.orderNumber, item.vin, '=HYPERLINK("' + link + '"; "Xem Lại")'];
    });
    reportSheet.getRange(currentRow, 1, correctionData.length, reportHeaders.length).setValues(correctionData);
    currentRow += correctionData.length;
  } else {
    reportSheet.getRange(currentRow, 1, 1, 7).setValue("Không có vấn đề nào được sửa tự động.").merge().setHorizontalAlignment("center");
    currentRow++;
  }

  // --- Phần cần sửa thủ công ---
  currentRow++; // Thêm một dòng trống
  reportSheet.getRange(currentRow, 1, 1, 7).setValue("CÁC VẤN ĐỀ CẦN SỬA THỦ CÔNG").merge().setBackground("#f4cccc").setFontWeight("bold").setHorizontalAlignment("center");
  currentRow++;
  reportSheet.getRange(currentRow, 1, 1, reportHeaders.length).setValues([reportHeaders]).setBackground("#4682b4").setFontColor("#ffffff").setFontWeight("bold");
  currentRow++;

  if (errors.length > 0) {
    const errorData = errors.map(item => {
      // Lấy sheetId một cách an toàn
      const sourceSheet = ss.getSheetByName(item.sheetName);
      const sheetId = sourceSheet ? sourceSheet.getSheetId() : '0';
      const link = `${spreadsheetUrl}#gid=${sheetId}&range=A${item.row}`;
      return [item.type, item.details, item.sheetName, item.row, item.orderNumber, item.vin, '=HYPERLINK("' + link + '"; "Đến Dòng ' + item.row + '")'];
    });
    reportSheet.getRange(currentRow, 1, errorData.length, reportHeaders.length).setValues(errorData);
  } else {
    reportSheet.getRange(currentRow, 1, 1, 7).setValue("Không tìm thấy vấn đề nào cần sửa thủ công. Dữ liệu của bạn rất tốt!").merge().setHorizontalAlignment("center");
  }

  reportSheet.setFrozenRows(1);
  reportSheet.autoResizeColumns(1, reportHeaders.length);

  // Kích hoạt sheet báo cáo để người dùng thấy ngay kết quả
  reportSheet.activate();
}
// THAY THẾ TOÀN BỘ HÀM CŨ BẰNG HÀM NÀY
function logUserEdit(e, actionId = null) {
  try {
    const range = e.range;
    if (range.getNumRows() === 1 && range.getNumColumns() === 1) {
      const oldValue = e.oldValue !== undefined ? String(e.oldValue) : "[Ô trống]";
      const newValue = e.value !== undefined ? String(e.value) : "[Ô trống]";
      if (oldValue !== newValue) {
        const logSheet = getOrCreateSheet(e.source, "NhatKyChinhSua", SHEET_HEADERS["NhatKyChinhSua"]);
        logSheet.appendRow([
          new Date(),
          e.user.getEmail(),
          range.getSheet().getName(),
          range.getA1Notation(),
          oldValue,
          newValue,
          actionId || `manual-${new Date().getTime()}`, // Ghi lại Action ID hoặc tạo ID cho sửa tay
          "" // Trạng thái Log ban đầu để trống
        ]);
        return true;
      }
    } else {
      return true;
    }
  } catch (logError) {
    Logger.log(`Lỗi khi ghi nhật ký chỉnh sửa: ${logError.message}`);
  }
  return false;
}
function findAndSuggestMatches(newCarDetails, userEmail) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const chuaGhepSheet = ss.getSheetByName(CHUA_GHEP_SHEET_NAME);
  if (!chuaGhepSheet || chuaGhepSheet.getLastRow() < 2) {
    return;
  }

  const chuaGhepData = chuaGhepSheet.getDataRange().getValues();
  const chuaGhepHeaders = SHEET_HEADERS["ChuaGhep"];

  const tvbhCol = chuaGhepHeaders.indexOf("Tên tư vấn bán hàng");
  const khachHangCol = chuaGhepHeaders.indexOf("Tên khách hàng");
  const donHangCol = chuaGhepHeaders.indexOf("Số đơn hàng");
  const dongXeCol = chuaGhepHeaders.indexOf("Dòng xe");
  const phienBanCol = chuaGhepHeaders.indexOf("Phiên bản");
  const ngoaiThatCol = chuaGhepHeaders.indexOf("Ngoại thất");
  const noiThatCol = chuaGhepHeaders.indexOf("Nội thất");
  const ngayCocCol = chuaGhepHeaders.indexOf("Ngày cọc");

  const matchedOrders = [];
  const carDongXe = String(newCarDetails.dong_xe).trim().toLowerCase().normalize('NFC');
  const carPhienBan = String(newCarDetails.phien_ban).trim().toLowerCase().normalize('NFC');
  const carNgoaiThat = String(newCarDetails.ngoai_that).trim().toLowerCase().normalize('NFC');
  const carNoiThat = String(newCarDetails.noi_that).trim().toLowerCase().normalize('NFC');
  for (let i = 1; i < chuaGhepData.length; i++) {
    const order = chuaGhepData[i];
    const orderDongXe = String(order[dongXeCol]).trim().toLowerCase().normalize('NFC');
    const orderPhienBan = String(order[phienBanCol]).trim().toLowerCase().normalize('NFC');
    const orderNgoaiThat = String(order[ngoaiThatCol]).trim().toLowerCase().normalize('NFC');
    const orderNoiThat = String(order[noiThatCol]).trim().toLowerCase().normalize('NFC');
    if (carDongXe === orderDongXe &&
      carPhienBan === orderPhienBan &&
      carNgoaiThat === orderNgoaiThat &&
      orderNoiThat.includes(carNoiThat)) {

      matchedOrders.push({
        so_don_hang: order[donHangCol],
        ten_khach_hang: order[khachHangCol],
        ten_tu_van: order[tvbhCol],
        ngay_coc: order[ngayCocCol]
      });
    }
  }

  if (matchedOrders.length > 0) {
    matchedOrders.sort((a, b) => {
      const dateA = new Date(a.ngay_coc);
      const dateB = new Date(b.ngay_coc);
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;
      return dateA.getTime() - dateB.getTime();
    });
    // Tạo cấu trúc dữ liệu tương tự như getSuggestionsForExistingData
    const singleCarSuggestion = [{
      car: newCarDetails,
      orders: matchedOrders
    }];
    const userProperties = PropertiesService.getUserProperties();
    const suggestionData = {
      timestamp: new Date().getTime(),
      allSuggestions: singleCarSuggestion // Lưu chỉ gợi ý cho xe mới nhập
    };
    userProperties.setProperty('MATCH_SUGGESTION_ALL', JSON.stringify(suggestionData)); // Cập nhật cùng một khóa

    showToastOnSheet(
      `Tìm thấy ${matchedOrders.length} đơn hàng phù hợp! Mở sidebar "Gợi ý Ghép xe" để xem.`,
      "✅ Gợi ý Ghép xe",
      10
    );
  }
}
function showSuggestionSidebar() {
  // Gọi hàm để tạo gợi ý từ dữ liệu hiện có
  const result = doReadWriteLock(() => getSuggestionsForExistingData());

  if (result.status === "SUCCESS") {
    showToastOnSheet(result.message, "✅ Gợi ý Ghép xe", 10);
  } else {
    showToastOnSheet(result.message, "Thông báo", 5);
  }

  const html = HtmlService.createHtmlOutputFromFile('SuggestionSidebar')
    .setTitle('Gợi ý Ghép xe')
    .setWidth(350);
  SpreadsheetApp.getUi().showSidebar(html);
}
function showSearchAndFilterSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('SearchSidebar')
    .setTitle('Tìm Kiếm & Lọc Nâng Cao')
    .setWidth(1550); // Tăng chiều rộng
  SpreadsheetApp.getUi().showSidebar(html);
}
/**
 * Lấy các giá trị duy nhất từ các cột được chỉ định trên nhiều sheet để điền vào các dropdown của bộ lọc.
 * @returns {Object} Một đối tượng chứa các mảng giá trị duy nhất cho các tiêu chí lọc khác nhau.
 */
function performAdvancedSearch(filters) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const spreadsheetUrl = ss.getUrl();
    const searchResults = {};

    const sheetConfigs = {
      'DaGhep': { sheet: ss.getSheetByName(DA_GHEP_SHEET_NAME), headers: SHEET_HEADERS.DaGhep },
      'ChuaGhep': { sheet: ss.getSheetByName(CHUA_GHEP_SHEET_NAME), headers: SHEET_HEADERS.ChuaGhep },
      'KhoXe': { sheet: ss.getSheetByName(STOCK_SHEET_NAME), headers: SHEET_HEADERS.KhoXe },
      'HuyGhep': { sheet: ss.getSheetByName(CANCELLED_SHEET_NAME), headers: SHEET_HEADERS.HuyGhep },
      'Xuathoadon': { sheet: ss.getSheetByName(XUAT_HOA_DON_SHEET_NAME), headers: SHEET_HEADERS.Xuathoadon }
    };

    const sheetsToSearch = filters.sheets || [];

    for (const sheetName of sheetsToSearch) {
      const config = sheetConfigs[sheetName];
      if (!config || !config.sheet || config.sheet.getLastRow() < 2) continue;

      const data = config.sheet.getDataRange().getValues();
      const headers = data[0];
      const sheetId = config.sheet.getSheetId();

      const filteredRows = data.slice(1).map((row, index) => ({
        data: row,
        rowIndex: index + 2
      })).filter(rowObject => {
        let isMatch = true;
        const row = rowObject.data;

        // 1. Lọc theo từ khóa
        const keyword = filters.keyword ? normalizeString(String(filters.keyword)) : '';
        if (keyword) {
          const searchableHeaders = ["Số đơn hàng", "SỐ ĐƠN HÀNG", "VIN", "SỐ VIN", "Tên khách hàng", "TÊN KHÁCH HÀNG", "Tên tư vấn bán hàng", "TƯ VẤN BÁN HÀNG"];
          let keywordMatch = false;
          for (const headerName of searchableHeaders) {
            const colIdx = headers.indexOf(headerName);
            if (colIdx > -1 && row[colIdx] && normalizeString(String(row[colIdx])).includes(keyword)) {
              keywordMatch = true;
              break;
            }
          }
          if (!keywordMatch) isMatch = false;
        }

        // 2. Lọc theo các dropdown khác nếu hàng vẫn khớp
        if (isMatch && filters.dong_xe) {
          const colIdx = headers.findIndex(h => h.toUpperCase() === "DÒNG XE");
          if (colIdx === -1 || String(row[colIdx] || '').trim() !== filters.dong_xe) isMatch = false;
        }
        if (isMatch && filters.phien_ban) {
          const colIdx = headers.findIndex(h => h.toUpperCase() === "PHIÊN BẢN");
          if (colIdx === -1 || String(row[colIdx] || '').trim() !== filters.phien_ban) isMatch = false;
        }
        if (isMatch && filters.ngoai_that) {
          const colIdx = headers.findIndex(h => h.toUpperCase() === "NGOẠI THẤT");
          if (colIdx === -1 || String(row[colIdx] || '').trim() !== filters.ngoai_that) isMatch = false;
        }

        // 3. Lọc theo trạng thái hợp nhất
        if (isMatch && filters.status) {
          let statusMatch = false;
          const ketQuaCol = headers.indexOf("Kết quả");
          const trangThaiCol = headers.indexOf("Trạng thái");

          switch (filters.status) {
            case 'Chưa ghép / Sẵn có':
              if (sheetName === 'ChuaGhep' && ketQuaCol > -1 && ["chưa ghép", "chưa tìm thấy vin", "chưa có"].includes(String(row[ketQuaCol] || '').toLowerCase().trim())) statusMatch = true;
              if (sheetName === 'KhoXe' && trangThaiCol > -1 && String(row[trangThaiCol] || '').toLowerCase().trim() === 'chưa ghép') statusMatch = true;
              break;
            case 'Đã ghép':
              if (sheetName === 'DaGhep' && ketQuaCol > -1 && String(row[ketQuaCol] || '').toLowerCase().trim() === 'đã ghép') statusMatch = true;
              if (sheetName === 'KhoXe' && trangThaiCol > -1 && String(row[trangThaiCol] || '').toLowerCase().trim() === 'đã ghép') statusMatch = true;
              break;
            case 'Đã xuất hóa đơn':
              if (sheetName === 'Xuathoadon') statusMatch = true;
              if (sheetName === 'DaGhep' && ketQuaCol > -1 && String(row[ketQuaCol] || '').toLowerCase().trim() === 'đã xuất hóa đơn') statusMatch = true;
              if (sheetName === 'KhoXe' && trangThaiCol > -1 && String(row[trangThaiCol] || '').toLowerCase().trim() === 'đã xuất hóa đơn') statusMatch = true;
              break;
            case 'Đã hủy':
              if (sheetName === 'HuyGhep') statusMatch = true;
              break;
          }
          if (!statusMatch) isMatch = false;
        }

        return isMatch;
      });

      if (filteredRows.length > 0) {
        searchResults[sheetName] = {
          headers: headers,
          rows: filteredRows.map(rowObject => {
            const formattedRow = rowObject.data.map(cell => (cell instanceof Date) ? formatDateTimeForSheet(cell) : cell);
            return { data: formattedRow, link: `${spreadsheetUrl}#gid=${sheetId}&range=A${rowObject.rowIndex}` };
          })
        };
      }
    }
    return { status: "SUCCESS", results: searchResults };
  } catch (e) {
    logAction("Lỗi Tìm Kiếm Nâng Cao", `Error: ${e.message}, Stack: ${e.stack}`);
    return { status: "ERROR", message: `Lỗi máy chủ khi tìm kiếm: ${e.message}` };
  }
}

function syncDmsCodes() {
  // Sử dụng LockService để tránh xung đột khi có nhiều người dùng hoặc tiến trình cùng lúc
  doReadWriteLock(() => {
    Logger.log("Bắt đầu quét Mã DMS còn thiếu...");
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = getSheets(ss);
    const { stockSheet, thongtinxeSheet } = sheets;

    if (!stockSheet || !thongtinxeSheet) {
      logAction("Lỗi đồng bộ Mã DMS", "Không tìm thấy sheet KhoXe hoặc Thongtinxe.");
      return;
    }

    // 1. Tạo Map từ Thongtinxe để tra cứu nhanh VIN -> Mã DMS (Khu vực)
    const thongtinxeData = thongtinxeSheet.getDataRange().getValues();
    const thongtinxeHeaders = SHEET_HEADERS["Thongtinxe"];
    const vinColThongtinxe = thongtinxeHeaders.indexOf("Số VIN");
    const khuVucColThongtinxe = thongtinxeHeaders.indexOf("Khu vực");
    const vinToDmsMap = new Map();

    if (vinColThongtinxe > -1 && khuVucColThongtinxe > -1) {
      for (let i = 1; i < thongtinxeData.length; i++) {
        const vin = String(thongtinxeData[i][vinColThongtinxe] || "").trim();
        const dms = String(thongtinxeData[i][khuVucColThongtinxe] || "").trim();
        if (vin && dms) {
          vinToDmsMap.set(vin, dms);
        }
      }
    } else {
      logAction("Lỗi đồng bộ Mã DMS", "Sheet Thongtinxe thiếu cột 'Số VIN' hoặc 'Khu vực'.");
      return;
    }

    // 2. Quét KhoXe để tìm và cập nhật các Mã DMS còn thiếu
    const stockData = stockSheet.getDataRange().getValues();
    const stockHeaders = SHEET_HEADERS["KhoXe"];
    const vinColStock = stockHeaders.indexOf("VIN");
    const maDmsColStock = stockHeaders.indexOf("Mã DMS");

    if (vinColStock === -1 || maDmsColStock === -1) {
      logAction("Lỗi đồng bộ Mã DMS", "Sheet KhoXe thiếu cột 'VIN' hoặc 'Mã DMS'.");
      return;
    }

    let updatesMade = 0;
    for (let i = 1; i < stockData.length; i++) {
      const vin = String(stockData[i][vinColStock] || "").trim();
      const currentDms = String(stockData[i][maDmsColStock] || "").trim();

      // Nếu có VIN nhưng chưa có Mã DMS, thực hiện cập nhật
      if (vin && !currentDms) {
        const expectedDms = vinToDmsMap.get(vin);
        if (expectedDms) {
          stockSheet.getRange(i + 1, maDmsColStock + 1).setValue(expectedDms);
          updatesMade++;
          logAction("Đồng bộ Mã DMS", `Đã cập nhật Mã DMS '${expectedDms}' cho VIN ${vin} tại dòng ${i + 1} sheet KhoXe.`);
        }
      }
    }

    if (updatesMade > 0) {
      Logger.log(`Hoàn tất quét. Đã cập nhật ${updatesMade} Mã DMS.`);
    } else {
      Logger.log("Hoàn tất quét. Không có Mã DMS nào cần cập nhật.");
    }
  });
}

/**
 * [HÀM MỚI] Thiết lập trình kích hoạt (trigger) tự động chạy hàm syncDmsCodes mỗi 5 phút.
 * Chạy hàm này một lần từ trình soạn thảo script để cài đặt.
 */
function setupDmsSyncTrigger() {
  const ui = SpreadsheetApp.getUi();
  const triggers = ScriptApp.getProjectTriggers();

  // Xóa các trigger cũ cho hàm này để tránh chạy nhiều lần
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === "syncDmsCodes") {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  try {
    // Tạo trigger mới, chạy mỗi 5 phút
    ScriptApp.newTrigger("syncDmsCodes")
      .timeBased()
      .everyMinutes(5)
      .create();
    const message = "Đã thiết lập thành công trigger tự động đồng bộ Mã DMS 5 phút một lần.";
    showToastOnSheet(message, "Thành Công");
    logAction("Thiết lập Trigger", message);
  } catch (e) {
    const errorMessage = `Lỗi khi thiết lập trigger: ${e.message}`;
    showToastOnSheet(errorMessage, "Lỗi");
    logAction("Lỗi Trigger", errorMessage);
  }
}

/**
 * [HÀM HỖ TRỢ MỚI] Cập nhật Mã DMS cho một dòng cụ thể khi người dùng chỉnh sửa VIN.
 * @param {Sheet} khoXeSheet Sheet KhoXe đang được chỉnh sửa.
 * @param {Sheet} thongtinxeSheet Sheet Thongtinxe chứa dữ liệu nguồn.
 * @param {string} vin Số VIN cần tra cứu.
 * @param {number} rowIndex Chỉ số của dòng đang được chỉnh sửa.
 */
function setupDmsMismatchTrigger() {
  const ui = SpreadsheetApp.getUi();
  const triggers = ScriptApp.getProjectTriggers();

  // Xóa trigger cũ để tránh trùng lặp
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === "sendDmsMismatchWarningEmail") {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  try {
    // Tạo trigger mới, chạy vào 8h sáng hàng ngày
    ScriptApp.newTrigger("sendDmsMismatchWarningEmail")
      .timeBased()
      .everyDays(1)
      .atHour(8)
      .create();

    const message = "Đã thiết lập thành công trigger tự động gửi cảnh báo sai Mã DMS vào 8:00 sáng mỗi ngày.";
    showToastOnSheet(message, "Thành Công");
    logAction("Thiết lập Trigger Cảnh báo DMS", message);
  } catch (e) {
    const errorMessage = `Lỗi khi thiết lập trigger: ${e.message}`;
    showToastOnSheet(errorMessage, "Lỗi");
    logAction("Lỗi Trigger Cảnh báo DMS", errorMessage);
  }
}
/**
 * Xử lý phê duyệt hoặc từ chối yêu cầu VinClub.
 */
function showCancelOrderSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('CancelSidebar')
    .setTitle('Hủy Ghép Đơn Hàng');
  SpreadsheetApp.getUi().showSidebar(html);
}
function processCancellationFromDialog(formObject) {
  // Kiểm tra đầu vào
  if (!formObject || !formObject.orderNumber || !formObject.orderNumber.trim() || !formObject.reason || !formObject.reason.trim()) {
    throw new Error("Vui lòng nhập đầy đủ Số đơn hàng và Lý do hủy.");
  }

  const userEmail = Session.getActiveUser().getEmail() || "Manual User";

  // Lấy các sheet cần thiết
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const daGhepSheet = getOrCreateSheet(ss, DA_GHEP_SHEET_NAME, SHEET_HEADERS["DaGhep"]);
  const chuaGhepSheet = getOrCreateSheet(ss, CHUA_GHEP_SHEET_NAME, SHEET_HEADERS["ChuaGhep"]);
  const stockSheet = getOrCreateSheet(ss, STOCK_SHEET_NAME, SHEET_HEADERS["KhoXe"]);
  const cancelledSheet = getOrCreateSheet(ss, CANCELLED_SHEET_NAME, SHEET_HEADERS["HuyGhep"]);
  const mailSheet = getOrCreateSheet(ss, MAIL_SHEET_NAME, SHEET_HEADERS["Mail"]);

  // Tạo một đối tượng sự kiện giả lập để truyền dữ liệu
  const e_simulated = {
    parameter: {
      action: 'cancelRequest',
      orderNumber: formObject.orderNumber.trim(),
      cancelledBy: userEmail,
      fromUI: 'true',
      reason: formObject.reason.trim() // Đảm bảo 'reason' được đưa vào đây
    }
  };

  // Gọi hàm xử lý chính với LockService để đảm bảo an toàn dữ liệu
  const resultJson = doReadWriteLock(() => handleCancelRequest(e_simulated, daGhepSheet, chuaGhepSheet, stockSheet, cancelledSheet, mailSheet));

  // Phân tích kết quả và hiển thị thông báo
  const result = JSON.parse(resultJson.getContent());
  SpreadsheetApp.getActiveSpreadsheet().toast(result.message, 'Thông Báo', 7);

  return result.message; // Trả về kết quả cho client-side
}
// [THAY THẾ TOÀN BỘ HÀM CŨ BẰNG HÀM NÀY]
function onEditXuathoadon(e) {
  const range = e.range;
  const sheet = range.getSheet();

  // Chỉ chạy nếu chỉnh sửa diễn ra trên sheet "Xuathoadon"
  if (sheet.getName() !== XUAT_HOA_DON_SHEET_NAME) {
    return;
  }

  const row = range.getRow();
  const col = range.getColumn();
  const headers = SHEET_HEADERS["Xuathoadon"];
  const vinColIndex = headers.indexOf("SỐ VIN") + 1;

  // Chỉ chạy khi chỉnh sửa ở cột "SỐ VIN", không phải header, và có giá trị mới
  if (col === vinColIndex && row > 1 && e.value) {
    const vin = String(e.value).trim();
    // Khóa tiến trình để đảm bảo an toàn dữ liệu
    doReadWriteLock(() => {
      fillXuathoadonFromDaghepAndThongtinxe(e, row, vin);
    });
  }
}

function setupOnEditXuathoadonTrigger() {
  const ss = SpreadsheetApp.getActive();
  // Xóa các trigger cũ cho hàm này để tránh trùng lặp
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'onEditXuathoadon') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Tạo trigger mới
  ScriptApp.newTrigger('onEditXuathoadon')
    .forSpreadsheet(ss)
    .onEdit()
    .create();

  SpreadsheetApp.getUi().alert('Đã thiết lập thành công trigger tự động điền dữ liệu cho sheet Xuathoadon.');
}
// [THAY THẾ TOÀN BỘ HÀM CŨ BẰNG HÀM NÀY]
function saveFileToDrive(fileObject, orderNumber, fileType, customerName, referenceDate = null) {
  if (!fileObject || !customerName || !fileType) {
    logAction("Lỗi Lưu File Drive", "Thiếu thông tin file, tên khách hàng hoặc loại file.");
    return null;
  }
  try {
    const dateToUse = (referenceDate && referenceDate instanceof Date && !isNaN(referenceDate)) ?
      referenceDate : new Date();
    const monthFolder_Name = Utilities.formatDate(dateToUse, "GMT+7", "yyyy-MM");
    const dayFolder_Name = Utilities.formatDate(dateToUse, "GMT+7", "yyyy-MM-dd");
    const rootFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const monthFolder = getOrCreateSubFolder(rootFolder, monthFolder_Name);
    const dayFolder = getOrCreateSubFolder(monthFolder, dayFolder_Name);

    const sanitizedCustomerNameForFolder = customerName.replace(/[\/\\?%*:|"<>"]/g, '').replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim().replace(/\s+/g, ' ');
    const customerFolder = getOrCreateSubFolder(dayFolder, sanitizedCustomerNameForFolder);

    const originalFileName = fileObject.getName();
    const extension = originalFileName.includes('.') ? originalFileName.substring(originalFileName.lastIndexOf('.')) : '';

    let fileName;
    if (fileType === 'HDMB') {
      fileName = `HĐMB ${sanitizedCustomerNameForFolder}${extension}`;
    } else if (fileType === 'DNXHD') {
      fileName = `ĐNXHĐ ${sanitizedCustomerNameForFolder}${extension}`;
    } else if (fileType === 'HOADON') {
      fileName = `Hóa đơn ${sanitizedCustomerNameForFolder}${extension}`;
    } else {
      const timestamp = Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd_HHmmss");
      fileName = `${orderNumber}_${fileType}_${timestamp}${extension}`;
    }

    const file = customerFolder.createFile(fileObject).setName(fileName);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const fileId = file.getId();
    const viewUrl = 'https://drive.google.com/file/d/' + fileId + '/view?usp=sharing';
    logAction("Lưu File Drive thành công", `Đã lưu file: ${fileName} với URL: ${viewUrl}`);

    const formulaFileName = fileName.replace(/"/g, '""');
    return {
      formula: `=HYPERLINK("${viewUrl}"; "${formulaFileName}")`,
      finalName: fileName
    };
  } catch (error) {
    logAction("Lỗi nghiêm trọng khi lưu File Drive", error.toString());
    Logger.log(error);
    return null;
  }
}

/**
 * Đồng bộ toàn bộ dữ liệu từ Supabase yeucauxhd về Google Sheet (Một lần)
 */
function fullSyncYeuCauXhd() {
  Logger.log("--- BẮT ĐẦU: Đồng bộ TOÀN BỘ yeucauxhd từ Supabase về Sheet ---");
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(XUAT_HOA_DON_SHEET_NAME);
  if (!sheet) throw new Error("Không tìm thấy sheet " + XUAT_HOA_DON_SHEET_NAME);

  // 1. Lấy dữ liệu từ Supabase
  const url = `${SUPABASE_URL}/rest/v1/yeucauxhd?select=*&order=ngay_yeu_cau.asc`;
  const options = {
    method: "get",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY
    }
  };

  const response = UrlFetchApp.fetch(url, options);
  const supabaseData = JSON.parse(response.getContentText());

  if (!supabaseData || supabaseData.length === 0) {
    return "Không có dữ liệu trên Supabase để đồng bộ.";
  }

  // 2. Chuẩn bị Header và dữ liệu Sheet hiện tại
  const sheetData = sheet.getDataRange().getValues();
  const headers = sheetData[0];

  // Hàm format ngày giờ
  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      return Utilities.formatDate(date, 'GMT+7', 'dd/MM/yyyy HH:mm:ss');
    } catch (e) { return isoString; }
  };

  // 3. Tạo Payload mới từ dữ liệu Supabase
  const newRows = supabaseData.map((record, index) => {
    const row = new Array(headers.length).fill('');
    row[0] = index + 1; // Số TT mới
    row[1] = record.ten_khach_hang || '';
    row[2] = record.so_don_hang || '';
    row[3] = record.dong_xe || '';
    row[4] = record.phien_ban || '';
    row[5] = record.ngoai_that || '';
    row[6] = record.noi_that || '';
    row[7] = record.tvbh || '';
    row[8] = record.vin || '';
    row[9] = record.so_may || '';
    row[10] = formatDateTime(record.ngay_yeu_cau);
    row[11] = formatDateTime(record.ngay_xuat_hoa_don);
    row[12] = record.hoa_hong_ung || '';
    row[13] = record.vpoint || '';
    row[14] = record.chinh_sach || '';
    row[15] = formatDateTime(record.ngay_coc) || record.ngay_coc || '';
    row[16] = record.ket_qua_gui_mail || '';
    row[17] = record.url_hop_dong || '';
    row[18] = record.url_de_nghi_xhd || '';
    row[19] = record.url_hoa_don_da_xuat || '';
    row[20] = record.trang_thai_vc || '';
    return row;
  });

  // 4. Cập nhật Sheet: Xóa các dòng dữ liệu cũ (giữ header) và ghi dòng mới
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).clearContent();
  }

  if (newRows.length > 0) {
    sheet.getRange(2, 1, newRows.length, headers.length).setValues(newRows);
  }

  const msg = `Đã đồng bộ thành công ${newRows.length} đơn hàng từ Supabase về Google Sheet.`;
  Logger.log(msg);
  return msg;
}
function approveSelectedInvoiceRequest() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const activeSheet = ss.getActiveSheet();
  if (activeSheet.getName() !== XUAT_HOA_DON_SHEET_NAME) {
    ui.alert("Vui lòng chọn một yêu cầu trong sheet 'Xuathoadon' để phê duyệt.");
    return;
  }

  const selectedRow = activeSheet.getActiveRange().getRow();
  if (selectedRow < 2) {
    ui.alert("Vui lòng chọn một dòng dữ liệu (không phải dòng tiêu đề).");
    return;
  }

  const result = doReadWriteLock(() => {
    const sheets = getSheets(ss);
    const orderNumber = activeSheet.getRange(selectedRow, SHEET_HEADERS["Xuathoadon"].indexOf("SỐ ĐƠN HÀNG") + 1).getValue();

    const daghepData = sheets.daGhepSheet.getDataRange().getValues();
    const headers = SHEET_HEADERS["DaGhep"];
    const soDonHangCol = headers.indexOf("Số đơn hàng");
    const ketQuaCol = headers.indexOf("Kết quả");
    const vinCol = headers.indexOf("VIN");

    for (let i = 1; i < daghepData.length; i++) {
      if (String(daghepData[i][soDonHangCol]).trim() === String(orderNumber).trim()) {
        const currentStatus = String(daghepData[i][ketQuaCol]).trim();

        if (currentStatus === "Chờ phê duyệt" || currentStatus === "Đã bổ sung") {
          sheets.daGhepSheet.getRange(i + 1, ketQuaCol + 1).setValue("Đã phê duyệt");

          const vin = daghepData[i][vinCol];

          recordOrderHistory(orderNumber, vin, "Phê duyệt XHĐ", `Yêu cầu được phê duyệt bởi ${Session.getActiveUser().getEmail()}`);
          return { success: true, message: `Đã phê duyệt thành công yêu cầu cho đơn hàng ${orderNumber}.` };
        } else {
          return { success: false, message: `Không thể phê duyệt đơn hàng này. Trạng thái hiện tại là '${currentStatus}'.` };
        }
      }
    }
    return { success: false, message: `Không tìm thấy đơn hàng ${orderNumber} trong sheet DaGhep.` };
  });

  showToastOnSheet(result.message, result.success ? "Thành công" : "Lỗi");
}
function requestSupplementForInvoice() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const activeSheet = ss.getActiveSheet();

  if (activeSheet.getName() !== XUAT_HOA_DON_SHEET_NAME) { // 
    ui.alert("Vui lòng chọn một yêu cầu trong sheet 'Xuathoadon'.");
    return;
  }

  const selectedRow = activeSheet.getActiveRange().getRow();
  if (selectedRow < 2) {
    ui.alert("Vui lòng chọn một dòng dữ liệu (không phải dòng tiêu đề).");
    return;
  }

  const reasonPrompt = ui.prompt("Yêu Cầu Bổ Sung", "Vui lòng nhập nội dung cần bổ sung (ví dụ: 'Ảnh HĐMB bị mờ', 'Thiếu chữ ký trên ĐNXHĐ'):", ui.ButtonSet.OK_CANCEL);
  if (reasonPrompt.getSelectedButton() !== ui.Button.OK || !reasonPrompt.getResponseText()) {
    showToastOnSheet("Đã hủy thao tác.", "Thông báo"); // 
    return;
  }
  const reason = reasonPrompt.getResponseText().trim();

  const result = doReadWriteLock(() => { // 
    const sheets = getSheets(ss); // 
    const orderNumber = activeSheet.getRange(selectedRow, SHEET_HEADERS["Xuathoadon"].indexOf("SỐ ĐƠN HÀNG") + 1).getValue(); // 

    const daghepData = sheets.daGhepSheet.getDataRange().getValues(); // 
    const headers = SHEET_HEADERS["DaGhep"]; // 
    const soDonHangCol = headers.indexOf("Số đơn hàng"); // 
    const ketQuaCol = headers.indexOf("Kết quả"); // 
    const vinCol = headers.indexOf("VIN"); // 
    const tenKhachHangCol = headers.indexOf("Tên khách hàng"); // 
    const tvbhCol = headers.indexOf("Tên tư vấn bán hàng"); // 

    for (let i = 1; i < daghepData.length; i++) {
      if (String(daghepData[i][soDonHangCol]).trim() === String(orderNumber).trim()) {
        const currentStatus = String(daghepData[i][ketQuaCol]).trim();
        if (currentStatus === "Chờ phê duyệt") {
          sheets.daGhepSheet.getRange(i + 1, ketQuaCol + 1).setValue("Yêu cầu bổ sung");

          const orderData = {
            ten_ban_hang: daghepData[i][tvbhCol],
            ten_khach_hang: daghepData[i][tenKhachHangCol],
            so_don_hang: orderNumber,
            vin: daghepData[i][vinCol]
          };
          // Gửi email yêu cầu bổ sung
          sendSupplementRequestEmail(sheets.mailSheet, orderData, reason);

          recordOrderHistory(orderNumber, orderData.vin, "Yêu cầu bổ sung XHĐ", `Lý do: ${reason}. Yêu cầu bởi: ${Session.getActiveUser().getEmail()}`); // 
          return { success: true, message: `Đã gửi yêu cầu bổ sung cho đơn hàng ${orderNumber}.` };
        } else {
          return { success: false, message: `Không thể thực hiện. Trạng thái hiện tại là '${currentStatus}'.` };
        }
      }
    }
    return { success: false, message: `Không tìm thấy đơn hàng ${orderNumber} trong sheet DaGhep.` };
  });

  showToastOnSheet(result.message, result.success ? "Thành công" : "Lỗi"); // 
}

// [THAY THẾ]
function incrementDataVersion() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const newVersion = new Date().getTime().toString(); // Dùng timestamp để đảm bảo duy nhất
  scriptProperties.setProperty('DATA_VERSION', newVersion);
  Logger.log(`Phiên bản dữ liệu đã được cập nhật thành: ${newVersion}`);
  return newVersion;
}

function verifyDepositInfo(customerName, depositDateString, cocXeSheet) {
  try {
    if (!customerName || !depositDateString) {
      return { success: false, message: "Vui lòng cung cấp đầy đủ Tên khách hàng và Ngày cọc." };
    }

    // 1. Chuẩn hóa dữ liệu đầu vào
    const normalizedCustomerName = normalizeString(customerName);
    const inputDate = new Date(depositDateString);
    if (isNaN(inputDate.getTime())) {
      return { success: false, message: "Ngày cọc không hợp lệ." };
    }
    const inputDateStringYYYYMMDD = Utilities.formatDate(inputDate, "GMT+7", "yyyy-MM-dd");

    // 2. Lấy dữ liệu từ sheet CocXe
    const cocXeData = cocXeSheet.getDataRange().getValues();
    const cocXeHeaders = cocXeData[0];
    const nameCol = cocXeHeaders.indexOf("Tên khách hàng");
    const dateCol = cocXeHeaders.indexOf("Ngày cọc");
    const statusCol = cocXeHeaders.indexOf("Trạng thái sử dụng");

    if (nameCol === -1 || dateCol === -1 || statusCol === -1) {
      logAction("Lỗi cấu hình sheet CocXe", "Sheet CocXe thiếu cột: Tên khách hàng, Ngày cọc, hoặc Trạng thái sử dụng.");
      return { success: false, message: "Lỗi cấu hình hệ thống (CocXe). Vui lòng liên hệ Admin." };
    }

    // 3. Tìm kiếm bản ghi phù hợp
    for (let i = 1; i < cocXeData.length; i++) {
      const row = cocXeData[i];
      const sheetCustomerName = normalizeString(String(row[nameCol] || ""));
      const sheetStatus = String(row[statusCol] || "").trim().toLowerCase();

      if (sheetCustomerName === normalizedCustomerName && sheetStatus !== 'đã sử dụng') {
        const sheetDateValue = row[dateCol];
        if (sheetDateValue instanceof Date && !isNaN(sheetDateValue.getTime())) {
          const sheetDateStringYYYYMMDD = Utilities.formatDate(sheetDateValue, "GMT+7", "yyyy-MM-dd");

          if (sheetDateStringYYYYMMDD === inputDateStringYYYYMMDD) {
            cocXeSheet.getRange(i + 1, statusCol + 1).setValue("Đã sử dụng");
            logAction("Xác thực cọc thành công", `Khách hàng: ${customerName}, Ngày cọc: ${inputDateStringYYYYMMDD}`);
            return { success: true };
          }
        }
      }
    }

    // 4. Nếu không tìm thấy -> trả về thông báo lỗi mới theo yêu cầu
    logAction("Xác thực cọc thất bại", `Sai UNC hoặc thông tin không khớp cho KH: ${customerName}, Ngày cọc: ${inputDateStringYYYYMMDD}`);
    return { success: false, message: "Vui lòng sử dụng Uỷ nhiệm chi đúng cho Khách hàng đã đặt cọc!" };

  } catch (error) {
    logAction("Lỗi trong verifyDepositInfo", `Lỗi: ${error.message}`);
    return { success: false, message: `Lỗi hệ thống khi xác thực: ${error.message}` };
  }
}
/**
 * [HÀM ĐÃ NÂNG CẤP] Phân tích dữ liệu để xác định độ phổ biến, tồn kho,
 * và SỐ LƯỢNG ĐANG CHỜ GHÉP của các loại xe.
 * @returns {Object} Một đối tượng chứa dữ liệu phân tích.
 */
function restoreCarToStockLogic(vinToRestore) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const stockSheet = getOrCreateSheet(ss, STOCK_SHEET_NAME, SHEET_HEADERS["KhoXe"]);
  const removedCarsLogSheet = getOrCreateSheet(ss, "removed_cars_log", SHEET_HEADERS["removed_cars_log"]);
  const userEmail = Session.getActiveUser().getEmail() || "Không xác định";

  const stockDataCheck = stockSheet.getDataRange().getValues();
  const stockVinColCheck = SHEET_HEADERS["KhoXe"].indexOf("VIN");
  for (let k = 1; k < stockDataCheck.length; k++) {
    if (String(stockDataCheck[k][stockVinColCheck] || "").trim() === vinToRestore) {
      return `Lỗi: Xe với VIN ${vinToRestore} đã tồn tại trong KhoXe.`;
    }
  }

  const logData = removedCarsLogSheet.getDataRange().getValues();
  const logHeaders = SHEET_HEADERS["removed_cars_log"];
  const vinColLog = logHeaders.indexOf("VIN");
  let carDataFromLog = null;

  for (let i = logData.length - 1; i >= 1; i--) {
    if (String(logData[i][vinColLog] || "").trim() === vinToRestore) {
      carDataFromLog = {};
      logHeaders.forEach((header, index) => {
        carDataFromLog[header] = logData[i][index];
      });
      break;
    }
  }

  if (!carDataFromLog) {
    return `Không tìm thấy thông tin xe với VIN ${vinToRestore} trong nhật ký xe đã xóa.`;
  }

  // [SỬA LỖI] Xây dựng mảng dữ liệu để ghi dựa trên header thực tế của sheet KhoXe
  const actualStockHeaders = stockSheet.getRange(1, 1, 1, stockSheet.getLastColumn()).getValues()[0];

  const newRowValues = actualStockHeaders.map(header => {
    switch (header) {
      case "Dòng xe": return carDataFromLog["Dòng xe"];
      case "Phiên bản": return carDataFromLog["Phiên bản"];
      case "Ngoại thất": return carDataFromLog["Ngoại thất"];
      case "Nội thất": return carDataFromLog["Nội thất"];
      case "VIN": return vinToRestore;
      case "Mã DMS": return carDataFromLog["Mã DMS (cũ)"]; // Lấy đúng Mã DMS từ log
      case "Trạng thái": return "Chưa ghép";
      case "Ngày nhập": return carDataFromLog["Ngày nhập (cũ)"] ? new Date(carDataFromLog["Ngày nhập (cũ)"]) : new Date();
      case "Đã thông báo": return carDataFromLog["Đã thông báo (cũ)"] || "";
      default: return ""; // Để trống cho các cột khác như checkbox, Người giữ xe...
    }
  });

  appendAndFormatRow(stockSheet, newRowValues);

  // Định dạng lại cột ngày cho đúng
  const lastRow = stockSheet.getLastRow();
  const ngayNhapColIndex = actualStockHeaders.indexOf("Ngày nhập");
  if (ngayNhapColIndex > -1) {
    stockSheet.getRange(lastRow, ngayNhapColIndex + 1).setNumberFormat("dd/MM/yyyy hh:mm:ss");
  }

  recordVehicleHistory(vinToRestore, "Phục Hồi Vào Kho", `Xe đã được phục hồi bởi ${userEmail} từ Web App.`);
  logAction("Phục Hồi Xe Thành Công", `VIN ${vinToRestore} đã được phục hồi vào KhoXe.`);

  // --- ĐỒNG BỘ SUPABASE ---
  try {
    const supabaseData = {
      vin: vinToRestore,
      dong_xe: carDataFromLog["Dòng xe"] || "",
      phien_ban: carDataFromLog["Phiên bản"] || "",
      ngoai_that: carDataFromLog["Ngoại thất"] || "",
      noi_that: carDataFromLog["Nội thất"] || "",
      ma_dms: carDataFromLog["Mã DMS"] || carDataFromLog["Mã DMS (cũ)"] || "",
      trang_thai: "Chưa ghép",
      ngay_nhap: new Date().toISOString()
    };
    insertSupabase('khoxe', supabaseData);
  } catch (e) {
    Logger.log(`Lỗi đồng bộ Supabase khi phục hồi xe: ${e.message}`);
  }

  return `Xe với VIN ${vinToRestore} đã được phục hồi thành công!`;

}

/**
 * [HÀM MỚI] - Xử lý logic xóa đơn hàng.
 * @param {string} orderNumber - Số đơn hàng cần xóa.
 * @returns {string} - Thông báo kết quả.
 */
function findAndAddCarByVin(vin) {
  const carInfoResponse = getCarInfoFromMasterData(vin);
  if (carInfoResponse.status !== "SUCCESS") {
    return carInfoResponse.message;
  }

  const carData = carInfoResponse.data;
  const params = {
    vin: vin,
    dongXe: carData.dongXe,
    phienBan: carData.phienBan,
    ngoaiThat: carData.ngoaiThat,
    noiThat: carData.noiThat,
    maDMS: carData.maDMS
  };
  const resultMessage = addCarToStockLogic(params); // Hàm này vẫn sẽ được gọi

  // Tích hợp thông báo
  if (!resultMessage.startsWith("Lỗi:")) {
    // Nếu xe được thêm thành công (có thông tin hoặc không)
    const notificationMessage = carData.dongXe
      ? `Xe ${carData.dongXe} (${vin}) đã được thêm vào kho.`
      : `Xe mới (${vin}) đã được thêm vào kho (chờ cập nhật thông tin).`;
    addNotification(notificationMessage, 'success');
  } else {
    // Nếu có lỗi (ví dụ: xe đã tồn tại)
    addNotification(`Thêm xe thất bại: ${resultMessage}`, 'danger');
  }

  return resultMessage;
}
// [ĐÃ SỬA LỖI]
function syncMissingKhoXeInfo() {
  doReadWriteLock(() => {
    try {
      Logger.log("Bắt đầu quét và đồng bộ thông tin cho KhoXe...");
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const stockSheet = getOrCreateSheet(ss, STOCK_SHEET_NAME, SHEET_HEADERS["KhoXe"]);

      // Tạo một Map từ sheet Thongtinxe để tra cứu thông tin nhanh chóng
      // SỬA LỖI TẠI ĐÂY: Gọi đúng tên hàm mới là getThongtinxeData()
      const thongtinxeData = getThongtinxeData();

      if (!thongtinxeData) {
        logAction("Lỗi đồng bộ KhoXe", "Không thể lấy dữ liệu từ sheet Thongtinxe.");
        return;
      }

      const thongtinxeHeaders = thongtinxeData[0];
      const vinColThongtinxe = thongtinxeHeaders.indexOf("Số VIN");
      const vinToInfoMap = new Map();

      for (let i = 1; i < thongtinxeData.length; i++) {
        const vin = String(thongtinxeData[i][vinColThongtinxe] || "").trim();
        if (vin) {
          vinToInfoMap.set(vin, thongtinxeData[i]);
        }
      }

      const stockData = stockSheet.getDataRange().getValues();
      const stockHeaders = SHEET_HEADERS["KhoXe"];
      const vinColStock = stockHeaders.indexOf("VIN");
      const dongXeColStock = stockHeaders.indexOf("Dòng xe");
      const phienBanColStock = stockHeaders.indexOf("Phiên bản");
      const ngoaiThatColStock = stockHeaders.indexOf("Ngoại thất");
      const noiThatColStock = stockHeaders.indexOf("Nội thất");
      const maDMSColStock = stockHeaders.indexOf("Mã DMS");

      let updatesMade = 0;
      for (let i = 1; i < stockData.length; i++) {
        const vin = String(stockData[i][vinColStock] || "").trim();
        const dongXe = String(stockData[i][dongXeColStock] || "").trim();

        // Điều kiện để cập nhật: có VIN nhưng chưa có "Dòng xe"
        if (vin && !dongXe) {
          const masterInfo = vinToInfoMap.get(vin);
          if (masterInfo) {
            const carData = getCarInfoFromMasterData(vin).data; // Hàm này cũng đã được sửa để gọi getThongtinxeData()
            stockSheet.getRange(i + 1, dongXeColStock + 1).setValue(carData.dongXe);
            stockSheet.getRange(i + 1, phienBanColStock + 1).setValue(carData.phienBan);
            stockSheet.getRange(i + 1, ngoaiThatColStock + 1).setValue(carData.ngoaiThat);
            stockSheet.getRange(i + 1, noiThatColStock + 1).setValue(carData.noiThat);
            stockSheet.getRange(i + 1, maDMSColStock + 1).setValue(carData.maDMS);

            updatesMade++;
            recordVehicleHistory(vin, "Đồng bộ thông tin", "Tự động cập nhật thông tin xe từ sheet Thongtinxe.");
          }
        }
      }

      if (updatesMade > 0) {
        Logger.log(`Đồng bộ hoàn tất. Đã cập nhật ${updatesMade} dòng trong KhoXe.`);
      } else {
        Logger.log("Đồng bộ hoàn tất. Không có dòng nào cần cập nhật.");
      }
    } catch (e) {
      Logger.log(`Lỗi nghiêm trọng trong syncMissingKhoXeInfo: ${e.message}`);
      sendErrorAlert('syncMissingKhoXeInfo', e);
    }
  });
}
function setupKhoXeSyncTrigger() {
  // Xóa các trigger cũ để tránh trùng lặp
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'syncMissingKhoXeInfo') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Tạo trigger mới, chạy mỗi 10 phút
  ScriptApp.newTrigger('syncMissingKhoXeInfo')
    .timeBased()
    .everyMinutes(10)
    .create();

  SpreadsheetApp.getUi().alert('Đã thiết lập thành công trigger tự động cập nhật thông tin xe trong kho 10 phút một lần.');
}
function sendErrorAlert(functionName, error) {
  try {
    const subject = `[Lỗi Hệ Thống] Đã xảy ra lỗi nghiêm trọng trong hàm: ${functionName}`;
    const body = `
      <p>Một lỗi nghiêm trọng đã xảy ra trong hệ thống quản lý xe.</p>
      <p><b>Thời gian:</b> ${new Date().toLocaleString('vi-VN')}</p>
      <p><b>Hàm bị lỗi:</b> ${functionName}</p>
      <p><b>Thông báo lỗi:</b></p>
      <pre style="background-color: #fcecec; border: 1px solid #f0b6b6; padding: 10px; border-radius: 5px;">${error.message}</pre>
      <p><b>Dấu vết lỗi (Stack Trace):</b></p>
      <pre style="background-color: #f1f1f1; border: 1px solid #ddd; padding: 10px; border-radius: 5px;">${error.stack}</pre>
    `;
    sendEmailViaEdge({
      to: ADMIN_EMAIL,
      subject: subject,
      htmlBody: body
    });
  } catch (e) {
    Logger.log(`Lỗi khi đang gửi email cảnh báo lỗi: ${e.message}`);
  }
}
// THAY THẾ TOÀN BỘ HÀM CŨ BẰNG HÀM NÀY
function importCarsFromExcelLogic(carDataJson, importedBy) {
  try {
    const carData = JSON.parse(carDataJson);
    if (!Array.isArray(carData) || carData.length === 0) {
      return { status: "ERROR", message: "Không có dữ liệu xe hợp lệ để nhập." };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const stockSheet = getOrCreateSheet(ss, STOCK_SHEET_NAME, SHEET_HEADERS["KhoXe"]);
    const stockData = stockSheet.getDataRange().getValues();
    const stockHeaders = SHEET_HEADERS["KhoXe"];
    const vinColStock = stockHeaders.indexOf("VIN");

    // Tạo một Set chứa các VIN đã có để kiểm tra trùng lặp nhanh hơn
    const existingVins = new Set(stockData.slice(1).map(row => String(row[vinColStock] || "").trim().toUpperCase()));

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const newRowsToAppend = [];

    for (const car of carData) {
      const vin = String(car["SỐ VIN"] || "").trim().toUpperCase();

      // Xác thực dữ liệu
      if (!vin || vin.length !== 17) {
        errorCount++;
        logAction("Lỗi Nhập Excel", `VIN không hợp lệ hoặc bị thiếu: '${vin}'`);
        continue; // Bỏ qua dòng này
      }

      // Kiểm tra trùng lặp
      if (existingVins.has(vin)) {
        skippedCount++;
        continue; // Bỏ qua xe đã tồn tại
      }

      // Chuẩn bị dòng mới để thêm vào sheet
      const newRow = stockHeaders.map(header => {
        switch (header) {
          case "VIN": return vin;
          case "Dòng xe": return car["Dòng xe"] || "";
          case "Phiên bản": return car["Phiên bản"] || "";
          case "Ngoại thất": return car["Ngoại thất"] || "";
          case "Nội thất": return car["Nội thất"] || "";
          case "Mã DMS": return car["Mã DMS"] || "";
          case "Trạng thái": return "Chưa ghép";
          case "Ngày nhập": return new Date();
          case "Đã thông báo": return "";
          default: return "";
        }
      });

      newRowsToAppend.push(newRow);
      existingVins.add(vin); // Thêm vào Set để tránh thêm trùng lặp trong cùng một lần nhập
      successCount++;
    }

    // Thêm tất cả các dòng hợp lệ vào sheet một lần để tăng hiệu suất
    if (newRowsToAppend.length > 0) {
      stockSheet.getRange(stockSheet.getLastRow() + 1, 1, newRowsToAppend.length, stockHeaders.length).setValues(newRowsToAppend);
      // Ghi lịch sử cho từng xe được thêm
      newRowsToAppend.forEach(row => {
        const addedVin = row[vinColStock];
        recordVehicleHistory(addedVin, "Nhập Kho (Excel)", `Xe đã được nhập hàng loạt bởi ${importedBy}.`);
      });
    }

    // Tạo thông báo kết quả
    let message = `Nhập hoàn tất! Đã thêm thành công ${successCount} xe.`;
    if (skippedCount > 0) {
      message += ` Bỏ qua ${skippedCount} xe do đã tồn tại.`;
    }
    if (errorCount > 0) {
      message += ` Có ${errorCount} dòng bị lỗi (VIN không hợp lệ).`;
    }

    logAction("Nhập Excel Hoàn Tất", message);
    addNotification(`${importedBy} đã nhập ${successCount} xe từ file Excel.`, 'success', 'khoXe');

    return { status: "SUCCESS", message: message };

  } catch (e) {
    Logger.log(`Lỗi nghiêm trọng trong importCarsFromExcelLogic: ${e.message}, Stack: ${e.stack}`);
    sendErrorAlert('importCarsFromExcelLogic', e);
    return { status: "ERROR", message: `Lỗi máy chủ khi xử lý file: ${e.message}` };
  }
}

/**
 * [HÀM ĐÃ SỬA ĐỔI] - Xử lý khi Admin chuyển trạng thái sang "Chờ ký hóa đơn".
 * Tự động ghi nhận ngày xuất hóa đơn và đánh dấu tick vào cột "BÁO BÁN".
 */
function findRowByKeyValue(sheet, keyColumn, keyValue) {
  const range = sheet.getDataRange();
  const values = range.getValues();
  const formulas = range.getFormulas(); // Lấy cả mảng công thức

  if (values.length < 1) return null;

  const headers = values[0];
  const keyColIndex = headers.indexOf(keyColumn);

  if (keyColIndex === -1) {
    logAction("Lỗi findRowByKeyValue", `Không tìm thấy cột khóa '${keyColumn}' trong sheet '${sheet.getName()}'.`);
    return null;
  }

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][keyColIndex] || "").trim() === String(keyValue).trim()) {
      const rowObject = {};
      headers.forEach((header, index) => {
        // Ưu tiên lấy công thức nếu ô đó có công thức.
        // Nếu không, lấy giá trị hiển thị.
        if (formulas[i][index]) {
          rowObject[header] = formulas[i][index];
        } else {
          rowObject[header] = values[i][index];
        }
      });
      return rowObject;
    }
  }
  return null;
}
function findRowIndexByKeyValue(sheet, keyColumn, keyValue) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 1) return -1;

  const headers = data[0];
  const keyColIndex = headers.indexOf(keyColumn);

  if (keyColIndex === -1) {
    return -1;
  }

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][keyColIndex] || "").trim() === String(keyValue).trim()) {
      return i + 1; // Trả về chỉ số dòng 1-based
    }
  }
  return -1; // Không tìm thấy
}
function archiveFilesByMonth(year = null, month = null) {
  const FOLDER_ID_GOC = DRIVE_FOLDER_ID;
  Logger.log("Bắt đầu quá trình lưu trữ file và dọn dẹp...");

  try {
    let namLuuTru, thangLuuTru;

    if (year === null || month === null) {
      Logger.log("Chạy ở chế độ tự động cho tháng trước.");
      const homNay = new Date();
      const ngayDauThangNay = new Date(homNay.getFullYear(), homNay.getMonth(), 1);
      const ngayCuoiThangTruoc = new Date(ngayDauThangNay.getTime() - 1);
      namLuuTru = ngayCuoiThangTruoc.getFullYear();
      thangLuuTru = ngayCuoiThangTruoc.getMonth() + 1;
    } else {
      Logger.log(`Chạy ở chế độ TEST cho tháng ${month}/${year}.`);
      namLuuTru = year;
      thangLuuTru = month;
    }

    const tenThuMucNguon = `${namLuuTru}-${String(thangLuuTru).padStart(2, '0')}`;
    const tenThuMucLuuTru = `Archive_${tenThuMucNguon}`;

    Logger.log(`Đang tìm kiếm thư mục nguồn: "${tenThuMucNguon}" để lưu trữ.`);

    const thuMucGoc = DriveApp.getFolderById(FOLDER_ID_GOC);
    const cacThuMucNguon = thuMucGoc.getFoldersByName(tenThuMucNguon);

    if (!cacThuMucNguon.hasNext()) {
      Logger.log(`Không tìm thấy thư mục nguồn "${tenThuMucNguon}". Kết thúc quá trình.`);
      SpreadsheetApp.getUi().alert(`Không tìm thấy thư mục nguồn "${tenThuMucNguon}" để lưu trữ.`);
      return;
    }
    const thuMucNguon = cacThuMucNguon.next();

    const thuMucLuuTru = getOrCreateSubFolder(thuMucGoc, tenThuMucLuuTru);
    const thuMucHoaDon = getOrCreateSubFolder(thuMucLuuTru, "Hóa đơn");
    const thuMucHDMB = getOrCreateSubFolder(thuMucLuuTru, "HĐMB");
    const thuMucDNXHD = getOrCreateSubFolder(thuMucLuuTru, "ĐNXHĐ");

    Logger.log(`Đã tạo/xác nhận các thư mục lưu trữ trong: "${tenThuMucLuuTru}"`);

    let thongKe = { daDiChuyen: 0, daBoQua: 0 };
    processFolderRecursively(thuMucNguon, thuMucHoaDon, thuMucHDMB, thuMucDNXHD, thongKe);

    // === PHẦN MỚI: XÓA THƯ MỤC NGUỒN SAU KHI HOÀN TẤT ===
    try {
      if (thongKe.daDiChuyen > 0) { // Chỉ xóa nếu thực sự có file được di chuyển
        thuMucNguon.setTrashed(true);
        Logger.log(`ĐÃ XÓA: Chuyển thư mục nguồn "${tenThuMucNguon}" vào thùng rác.`);
      } else {
        Logger.log(`BỎ QUA XÓA: Không có file nào được di chuyển từ thư mục nguồn "${tenThuMucNguon}".`);
      }
    } catch (err) {
      Logger.log(`Lỗi khi cố gắng xóa thư mục nguồn "${tenThuMucNguon}": ${err.toString()}`);
    }
    // =======================================================

    let noiDungBaoCao = `Quá trình lưu trữ file cho tháng ${thangLuuTru}/${namLuuTru} đã hoàn tất.\n\n- Số file đã di chuyển: ${thongKe.daDiChuyen}\n- Số file bị bỏ qua: ${thongKe.daBoQua}\n\nCác file đã được chuyển vào thư mục: "${tenThuMucLuuTru}".`;

    if (thongKe.daDiChuyen > 0) {
      noiDungBaoCao += `\n\nThư mục nguồn "${tenThuMucNguon}" đã được dọn dẹp và chuyển vào thùng rác.`;
    }

    Logger.log(noiDungBaoCao);

    if (year === null) {
      sendEmailViaEdge(ADMIN_EMAIL,
        `[Báo Cáo] Hoàn tất Lưu trữ File tháng ${thangLuuTru}/${namLuuTru}`,
        noiDungBaoCao
      );
    }

  } catch (e) {
    Logger.log(`LỖI NGHIÊM TRỌNG trong quá trình lưu trữ file: ${e.toString()}`);
    sendErrorAlert('archiveFilesByMonth', e);
  }
}
function processFolderRecursively(thuMucHienTai, dichHoaDon, dichHDMB, dichDNXHD, thongKe) {
  // Xử lý các file trong thư mục hiện tại
  const files = thuMucHienTai.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    const tenFile = file.getName();
    let daDiChuyen = false;

    // Di chuyển file dựa vào tên
    if (tenFile.toLowerCase().startsWith('hóa đơn')) {
      file.moveTo(dichHoaDon);
      thongKe.daDiChuyen++;
      daDiChuyen = true;
    } else if (tenFile.toLowerCase().startsWith('hđmb')) {
      file.moveTo(dichHDMB);
      thongKe.daDiChuyen++;
      daDiChuyen = true;
    } else if (tenFile.toLowerCase().startsWith('đnxhđ')) {
      file.moveTo(dichDNXHD);
      thongKe.daDiChuyen++;
      daDiChuyen = true;
    } else {
      thongKe.daBoQua++;
    }

    if (daDiChuyen) {
      Logger.log(`Đã di chuyển file: ${tenFile}`);
    }
  }

  // Lặp lại quy trình cho các thư mục con
  const subFolders = thuMucHienTai.getFolders();
  while (subFolders.hasNext()) {
    const subFolder = subFolders.next();
    // Bỏ qua việc xóa thư mục rỗng để giữ lại cấu trúc cho việc tra cứu sau này nếu cần
    processFolderRecursively(subFolder, dichHoaDon, dichHDMB, dichDNXHD, thongKe);
  }
}
function runFileArchiveManually() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Chạy Chức Năng Lưu Trữ File',
    'Nhập tháng cần lưu trữ theo định dạng YYYY-MM (ví dụ: 2025-04).\n\nĐể trống và nhấn OK để tự động chạy cho tháng trước.',
    ui.ButtonSet.OK_CANCEL
  );

  // Dừng lại nếu người dùng nhấn Cancel
  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  const inputText = response.getResponseText().trim();

  if (inputText === "") {
    // CHẾ ĐỘ MẶC ĐỊNH: Chạy cho tháng trước
    showToastOnSheet('Bắt đầu quá trình lưu trữ cho tháng trước...', 'Vui lòng chờ');
    archiveFilesByMonth(); // Gọi hàm chính không có tham số
    showToastOnSheet('Đã hoàn tất lưu trữ cho tháng trước!', 'Thành công', 10);
  } else {
    // CHẾ ĐỘ CHỈ ĐỊNH/TEST: Chạy cho tháng cụ thể
    const formatRegex = /^\d{4}-(\d{2})$/;
    if (!formatRegex.test(inputText)) {
      ui.alert('Định dạng không hợp lệ. Vui lòng nhập lại theo đúng định dạng YYYY-MM.');
      return;
    }

    const parts = inputText.split('-');
    const yearToTest = parseInt(parts[0], 10);
    const monthToTest = parseInt(parts[1], 10);

    if (monthToTest < 1 || monthToTest > 12) {
      ui.alert('Tháng không hợp lệ. Vui lòng nhập một số từ 01 đến 12.');
      return;
    }

    showToastOnSheet(`Bắt đầu chạy lưu trữ cho tháng ${monthToTest}/${yearToTest}...`, 'Vui lòng chờ');
    archiveFilesByMonth(yearToTest, monthToTest); // Gọi hàm chính với tham số năm và tháng
    showToastOnSheet(`Đã hoàn tất lưu trữ cho tháng ${monthToTest}/${yearToTest}.`, 'Thành công', 10);
  }
}
// THÊM HÀM MỚI NÀY VÀO FILE CODE.TXT
function normalizeForComparison(str) {
  if (!str) return "";
  return String(str)
    .trim() // Xóa khoảng trắng đầu/cuối
    .toLowerCase() // Chuyển thành chữ thường
    .replace(/\s+/g, ' ') // Thay thế nhiều khoảng trắng bằng một
    .normalize('NFC'); // Chuẩn hóa Unicode cho tiếng Việt
}
function findAndNotifyWaitingRequests(newCarDetails, userEmail) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = getSheets(ss);
  const { dangKyChoSheet, mailSheet } = sheets;
  if (!dangKyChoSheet || dangKyChoSheet.getLastRow() < 2) {
    return; // Không có yêu cầu chờ nào
  }

  const waitingData = dangKyChoSheet.getDataRange().getValues();
  const headers = SHEET_HEADERS["DangKyCho"];
  const idCol = headers.indexOf("ID Yêu Cầu");
  const tvbhCol = headers.indexOf("Tên TVBH");
  const khachHangCol = headers.indexOf("Tên khách hàng");
  const dongXeCol = headers.indexOf("Dòng xe");
  const phienBanCol = headers.indexOf("Phiên bản");
  const ngoaiThatCol = headers.indexOf("Ngoại thất");
  const noiThatCol = headers.indexOf("Nội thất");
  const statusCol = headers.indexOf("Trạng thái");
  const vinCol = headers.indexOf("VIN gợi ý");
  const ngayDKCol = headers.indexOf("Thời gian đăng ký");

  const carDongXe = normalizeForComparison(newCarDetails.dong_xe);
  const carPhienBan = normalizeForComparison(newCarDetails.phien_ban);
  const carNgoaiThat = normalizeForComparison(newCarDetails.ngoai_that);
  const carNoiThat = normalizeForComparison(newCarDetails.noi_that);

  for (let i = 1; i < waitingData.length; i++) {
    const request = waitingData[i];
    const currentStatus = String(request[statusCol] || "").trim();

    if (currentStatus === "Đang chờ") {
      const orderDongXe = normalizeForComparison(request[dongXeCol]);
      const orderPhienBan = normalizeForComparison(request[phienBanCol]);
      const orderNgoaiThat = normalizeForComparison(request[ngoaiThatCol]);
      const orderNoiThat = normalizeForComparison(request[noiThatCol]);

      if (carDongXe === orderDongXe &&
        carPhienBan === orderPhienBan &&
        carNgoaiThat === orderNgoaiThat &&
        orderNoiThat.includes(carNoiThat)) {

        const requestId = request[idCol];
        const tvbhName = request[tvbhCol];

        dangKyChoSheet.getRange(i + 1, statusCol + 1).setValue("Đã có xe");
        dangKyChoSheet.getRange(i + 1, vinCol + 1).setValue(newCarDetails.vin);

        const orderDataForEmail = {
          request_id: requestId,
          ten_tvbh: tvbhName,
          ten_khach_hang: request[khachHangCol],
          dong_xe: request[dongXeCol],
          phien_ban: request[phienBanCol],
          ngoai_that: request[ngoaiThatCol],
          noi_that: request[noiThatCol],
          ngay_dang_ky: formatDateTimeForSheet(new Date(request[ngayDKCol]))
        };
        sendCarAvailableNotification(mailSheet, orderDataForEmail, newCarDetails);

        // THÔNG BÁO MỚI
        const notificationMessage = `Đã có xe VIN ${newCarDetails.vin} phù hợp với yêu cầu chờ của KH ${orderDataForEmail.ten_khach_hang}.`;
        addNotification(notificationMessage, 'success', 'danhSachCho', requestId, userEmail);

        break;
      }
    }
  }
}
// DÁN HÀM MỚI NÀY VÀO FILE CODE.TXT
function callGeminiAPI(prompt) {
  // Lấy API key đã lưu một cách an toàn
  const API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!API_KEY) {
    throw new Error("Chưa cấu hình GEMINI_API_KEY trong Script Properties.");
  }

  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`; // <-- THAY ĐỔI Ở ĐÂY

  // Chuẩn bị dữ liệu gửi đi
  const payload = {
    "contents": [{
      "parts": [{
        "text": prompt
      }]
    }],
    "generationConfig": {
      "temperature": 0.7, // Tăng sự sáng tạo
      "topK": 1,
      "topP": 1,
      "maxOutputTokens": 2048, // Giới hạn độ dài đầu ra
    },
    "safetySettings": [ // Cài đặt an toàn
      { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
      { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
      { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
      { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" }
    ]
  };

  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true // Để có thể bắt lỗi chi tiết
  };

  const response = UrlFetchApp.fetch(API_URL, options);
  const responseCode = response.getResponseCode();
  const responseBody = response.getContentText();

  if (responseCode === 200) {
    const jsonResponse = JSON.parse(responseBody);
    // Trích xuất nội dung text từ cấu trúc trả về của Gemini
    return jsonResponse.candidates[0].content.parts[0].text;
  } else {
    // Ghi lại lỗi để debug
    console.error(`Lỗi Gemini API: ${responseCode} - ${responseBody}`);
    throw new Error(`Không thể lấy phản hồi từ Trợ lý AI. Lỗi: ${responseCode}`);
  }
}
function findRelevantData(prompt, sheets) {
  const lowerPrompt = prompt.toLowerCase();
  const { daGhepSheet, chuaGhepSheet, stockSheet, xuathoadonSheet, huyGhepSheet } = sheets;

  const allData = {
    DaGhep: daGhepSheet.getLastRow() > 1 ? daGhepSheet.getDataRange().getValues() : [],
    ChuaGhep: chuaGhepSheet.getLastRow() > 1 ? chuaGhepSheet.getDataRange().getValues() : [],
    KhoXe: stockSheet.getLastRow() > 1 ? stockSheet.getDataRange().getValues() : [],
    Xuathoadon: xuathoadonSheet.getLastRow() > 1 ? xuathoadonSheet.getDataRange().getValues() : [],
    HuyGhep: huyGhepSheet ? (huyGhepSheet.getLastRow() > 1 ? huyGhepSheet.getDataRange().getValues() : []) : []
  };

  const results = {};
  let foundSpecificData = false;

  // Ưu tiên 1: Tìm theo Số Đơn Hàng (ví dụ: SO-123456)
  const orderMatch = prompt.match(/\b(SO-\w+)\b/i);
  if (orderMatch) {
    const orderNumber = orderMatch[1].toUpperCase();
    for (const sheetName in allData) {
      const data = allData[sheetName];
      if (data.length > 1) {
        const headers = data[0];
        const orderCol = headers.findIndex(h => h.toUpperCase().includes('SỐ ĐƠN HÀNG'));
        if (orderCol !== -1) {
          const foundRows = data.slice(1).filter(row => String(row[orderCol]).toUpperCase() === orderNumber);
          if (foundRows.length > 0) {
            results[sheetName] = foundRows.map(row => Object.fromEntries(headers.map((key, i) => [key, row[i]])));
            foundSpecificData = true;
          }
        }
      }
    }
  }

  // Ưu tiên 2: Tìm theo Số VIN (17 ký tự)
  const vinMatch = prompt.match(/\b([A-Z0-9]{17})\b/i);
  if (vinMatch && !foundSpecificData) {
    const vin = vinMatch[1].toUpperCase();
    for (const sheetName in allData) {
      const data = allData[sheetName];
      if (data.length > 1) {
        const headers = data[0];
        const vinCol = headers.findIndex(h => h.toUpperCase().includes('VIN'));
        if (vinCol !== -1) {
          const foundRows = data.slice(1).filter(row => String(row[vinCol]).toUpperCase() === vin);
          if (foundRows.length > 0) {
            results[sheetName] = foundRows.map(row => Object.fromEntries(headers.map((key, i) => [key, row[i]])));
            foundSpecificData = true;
          }
        }
      }
    }
  }

  // Ưu tiên 3: Tìm theo từ khóa chung (tên xe, màu sắc, trạng thái...)
  if (!foundSpecificData) {
    const keywords = lowerPrompt.split(/\s+/).filter(word => word.length > 2); // Tách câu hỏi thành các từ khóa
    for (const sheetName in allData) {
      const data = allData[sheetName];
      if (data.length > 1) {
        const headers = data[0];
        const foundRows = data.slice(1).filter(row => {
          const rowText = row.join(' ').toLowerCase();
          return keywords.every(kw => rowText.includes(kw));
        });
        if (foundRows.length > 0 && foundRows.length <= 10) { // Giới hạn 10 kết quả để tránh quá tải
          results[sheetName] = foundRows.map(row => Object.fromEntries(headers.map((key, i) => [key, row[i]])));
          foundSpecificData = true;
        }
      }
    }
  }

  // Nếu không tìm thấy dữ liệu cụ thể, trả về bản tóm tắt chung
  if (!foundSpecificData) {
    return {
      summary: "Không tìm thấy dữ liệu cụ thể. Đây là tóm tắt toàn bộ hệ thống:",
      KhoXe: `${allData.KhoXe.length - 1} xe`,
      ChuaGhep: `${allData.ChuaGhep.length - 1} đơn chờ ghép`,
      DaGhep: `${allData.DaGhep.length - 1} đơn đã ghép`,
      HuyGhep: `${allData.HuyGhep.length - 1} đơn đã hủy`
    };
  }

  return results;
}
/**
 * HÀM DỌN DẸP
 * Chạy hàm này một lần để xóa các thuộc tính "lastEdit..." không cần thiết.
 */
function cleanupLastEditProperties() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const allKeys = scriptProperties.getKeys();
  let deletedCount = 0;

  for (const key of allKeys) {
    if (key.startsWith('lastEdit_')) {
      scriptProperties.deleteProperty(key);
      deletedCount++;
    }
  }

  const message = `Dọn dẹp hoàn tất! Đã xóa ${deletedCount} thuộc tính "lastEdit...". Bây giờ bạn có thể làm mới trang Cài đặt để chỉnh sửa.`;
  Logger.log(message);
  SpreadsheetApp.getUi().alert(message);
}
/**
 * [HÀM MỚI] - Nhận prompt từ client-side, gọi Gemini API một cách an toàn, và trả về kết quả.
 * @param {string} userMessage - Tin nhắn của người dùng từ chatbot.
 * @param {string} pageContext - Toàn bộ nội dung văn bản của trang web làm bối cảnh.
 * @returns {string} - Câu trả lời từ Gemini hoặc một thông báo lỗi.
 */
function holdCar(vin, userEmail) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const stockSheet = getOrCreateSheet(ss, STOCK_SHEET_NAME, SHEET_HEADERS["KhoXe"]);
  const data = stockSheet.getDataRange().getValues();
  const headers = data[0];
  const vinCol = headers.indexOf("VIN");
  const statusCol = headers.indexOf("Trạng thái");
  const holderCol = headers.indexOf("Người Giữ Xe");
  const expiryCol = headers.indexOf("Thời Gian Hết Hạn Giữ");

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][vinCol]).trim() === vin) {
      const currentStatus = String(data[i][statusCol]).trim();
      const currentHolder = String(data[i][holderCol] || "").trim();
      const currentExpiry = data[i][expiryCol];
      if (currentStatus !== "Chưa ghép") {
        throw new Error(`Xe này đang ở trạng thái '${currentStatus}', không thể giữ.`);
      }
      if (currentHolder && currentExpiry && new Date(currentExpiry) > new Date()) {
        throw new Error(`Xe đã được giữ bởi ${currentHolder}.`);
      }

      const expiryTime = new Date();
      expiryTime.setHours(expiryTime.getHours() + HOLD_DURATION_HOURS);
      stockSheet.getRange(i + 1, statusCol + 1).setValue("Đang giữ");

      stockSheet.getRange(i + 1, holderCol + 1).setValue(userEmail);
      stockSheet.getRange(i + 1, expiryCol + 1).setValue(expiryTime).setNumberFormat("dd/MM/yyyy HH:mm:ss");

      const expiryFormatted = formatDateTimeForSheet(expiryTime);
      addNotification(`Bạn đã giữ thành công xe ${vin} đến ${expiryFormatted}.`, 'success', 'khoXe', vin, userEmail, userEmail);
      logAction("Giữ Xe Thành Công", `${userEmail} đã giữ xe ${vin}`);

      // --- ĐỒNG BỘ SUPABASE ---
      try {
        const supabaseData = {
          trang_thai: "Đang giữ",
          nguoi_giu_xe: userEmail,
          thoi_gian_het_han_giu: expiryFormatted
        };
        updateSupabase('khoxe', `vin=eq.${vin}`, supabaseData);
      } catch (e) {
        Logger.log(`Lỗi đồng bộ Supabase khi giữ xe: ${e.message}`);
      }

      const telegramMessage = `🚗 <b>Xe Đã Được Giữ</b>\n\n` +
        `👤 <b>Người giữ:</b> ${userEmail}\n` +
        `🔢 <b>VIN:</b> <code>${vin}</code>\n` +
        `⏳ <b>Hết hạn:</b> ${expiryFormatted}`;
      sendTelegramNotification(telegramMessage);

      return { status: "SUCCESS", message: `Đã giữ xe ${vin} thành công đến ${expiryFormatted}.` };

    }
  }
  throw new Error(`Không tìm thấy xe với VIN: ${vin}.`);
}

function releaseCar(vin, userEmail) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const stockSheet = getOrCreateSheet(ss, STOCK_SHEET_NAME, SHEET_HEADERS["KhoXe"]);
  const data = stockSheet.getDataRange().getValues();
  const headers = data[0];
  const vinCol = headers.indexOf("VIN");
  const holderCol = headers.indexOf("Người Giữ Xe");
  const expiryCol = headers.indexOf("Thời Gian Hết Hạn Giữ");
  const statusCol = headers.indexOf("Trạng thái");

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][vinCol]).trim() === vin) {
      const currentHolder = String(data[i][holderCol] || "").trim();
      if (userEmail !== ADMIN_EMAIL && userEmail !== currentHolder) {
        throw new Error("Bạn không có quyền hủy lượt giữ xe này.");
      }
      if (!currentHolder) {
        return {
          status: "SUCCESS", message: "Xe này không có ai giữ."
        };
      }

      stockSheet.getRange(i + 1, statusCol + 1).setValue("Chưa ghép");
      stockSheet.getRange(i + 1, holderCol + 1).setValue("");
      stockSheet.getRange(i + 1, expiryCol + 1).setValue("");

      addNotification(`Bạn đã hủy giữ xe ${vin}.`, 'warning', 'khoXe', vin, userEmail, userEmail);
      if (userEmail !== currentHolder) {
        addNotification(`Lượt giữ xe ${vin} của bạn đã được Admin hủy.`, 'danger', 'khoXe', vin, userEmail, currentHolder);
      }
      logAction("Hủy Giữ Xe", `${userEmail} đã hủy giữ xe ${vin}`);

      // --- ĐỒNG BỘ SUPABASE ---
      try {
        const supabaseData = {
          trang_thai: "Chưa ghép",
          nguoi_giu_xe: null,
          thoi_gian_het_han_giu: null
        };
        updateSupabase('khoxe', `vin=eq.${vin}`, supabaseData);
      } catch (e) {
        Logger.log(`Lỗi đồng bộ Supabase khi hủy giữ xe: ${e.message}`);
      }

      const telegramMessage = `✅ <b>Đã Hủy Giữ Xe</b>\n\n` +
        `👤 <b>Người hủy:</b> ${userEmail}\n` +
        `🔢 <b>VIN:</b> <code>${vin}</code>`;
      sendTelegramNotification(telegramMessage);

      return { status: "SUCCESS", message: `Đã hủy giữ xe ${vin} thành công.` };

    }
  }
  throw new Error(`Không tìm thấy xe với VIN: ${vin}.`);
}

function autoReleaseExpiredHolds() {
  Logger.log("--- BẮT ĐẦU: Tự động giải phóng lượt giữ xe hết hạn (Supabase + Sheet) ---");
  const now = new Date();

  // 1. Lấy toàn bộ xe đang giữ từ Supabase
  const heldCars = fetchSupabase('khoxe', 'trang_thai=eq.Đang giữ');
  if (!heldCars || heldCars.length === 0) {
    Logger.log("Không có xe nào đang ở trạng thái 'Đang giữ' trên Supabase.");
    return;
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const stockSheet = ss.getSheetByName(STOCK_SHEET_NAME);
  const khoxeData = stockSheet ? stockSheet.getDataRange().getValues() : [];
  const headers = khoxeData[0] || [];
  const vinCol = headers.indexOf("VIN");
  const statusCol = headers.indexOf("Trạng thái");
  const holderCol = headers.indexOf("Người Giữ Xe");
  const expiryCol = headers.indexOf("Thời Gian Hết Hạn Giữ");

  let releasedCount = 0;

  heldCars.forEach(car => {
    const vin = car.vin;
    const holder = car.nguoi_giu_xe;
    const expiryStr = car.thoi_gian_het_han_giu;
    const expiryTime = parseVietnameseDateTime(expiryStr);

    if (vin && expiryTime && expiryTime < now) {
      Logger.log(`Giải phóng xe ${vin} (Hết hạn: ${expiryStr})`);

      // A. Cập nhật Supabase
      const success = updateSupabase('khoxe', `vin=eq.${vin}`, {
        trang_thai: 'Chưa ghép',
        nguoi_giu_xe: null,
        thoi_gian_het_han_giu: null
      });

      if (success) {
        releasedCount++;
        const message = `Lượt giữ xe ${vin} của bạn đã tự động hết hạn.`;
        addNotification(message, 'info', 'khoXe', vin, 'Hệ thống', holder);
        logAction("Tự Động Hủy Giữ Xe", message);

        // B. Cập nhật Google Sheet (nếu VIN tồn tại trong sheet)
        if (stockSheet && vinCol !== -1 && statusCol !== -1) {
          for (let i = 1; i < khoxeData.length; i++) {
            if (String(khoxeData[i][vinCol]).trim() === vin) {
              stockSheet.getRange(i + 1, statusCol + 1).setValue("Chưa ghép");
              if (holderCol !== -1) stockSheet.getRange(i + 1, holderCol + 1).setValue("");
              if (expiryCol !== -1) stockSheet.getRange(i + 1, expiryCol + 1).setValue("");
              break;
            }
          }
        }
      }
    }
  });

  Logger.log(`Hoàn tất. Đã giải phóng ${releasedCount} xe.`);
}

function setupAutoReleaseTrigger() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'autoReleaseExpiredHolds') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger('autoReleaseExpiredHolds')
    .timeBased()
    .everyHours(1)
    .create();
  SpreadsheetApp.getUi().alert('Đã cài đặt thành công trigger tự động hủy giữ xe 1 tiếng một lần.');
}

function revertLastActionById(actionId, userEmail) {
  if (!actionId) {
    throw new Error("Không có hành động nào để hoàn tác.");
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const logSheet = getOrCreateSheet(ss, "NhatKyChinhSua", SHEET_HEADERS["NhatKyChinhSua"]);
  const logData = logSheet.getDataRange().getValues();
  const headers = logData[0];
  const actionIdCol = headers.indexOf("Action ID");
  const statusCol = headers.indexOf("Trạng thái Log");

  const rowsToRevert = [];
  for (let i = logData.length - 1; i >= 1; i--) {
    // Tìm các log khớp với Action ID và chưa bị hoàn tác
    if (logData[i][actionIdCol] === actionId && logData[i][statusCol] !== "Đã hoàn tác") {
      rowsToRevert.push({
        sheetName: logData[i][headers.indexOf("Tên Sheet")],
        cellA1: logData[i][headers.indexOf("Ô")],
        oldValue: logData[i][headers.indexOf("Giá trị cũ")],
        newValue: logData[i][headers.indexOf("Giá trị mới")],
        logRowIndex: i + 1 // 1-based index
      });
    }
  }

  if (rowsToRevert.length === 0) {
    throw new Error("Không tìm thấy lịch sử cho hành động này hoặc nó đã được hoàn tác.");
  }

  let revertedCount = 0;
  // Thực hiện hoàn tác (đảo ngược lại)
  for (const item of rowsToRevert) {
    const targetSheet = ss.getSheetByName(item.sheetName);
    if (targetSheet) {
      targetSheet.getRange(item.cellA1).setValue(item.oldValue);
      // Đánh dấu log là đã được hoàn tác
      logSheet.getRange(item.logRowIndex, statusCol + 1).setValue("Đã hoàn tác");
      revertedCount++;
    }
  }

  logAction("Hoàn tác hành động", `Người dùng ${userEmail} đã hoàn tác hành động ID ${actionId}, khôi phục ${revertedCount} thay đổi.`);
  return { message: `Hoàn tác thành công ${revertedCount} thay đổi.` };
}
/**
 * [HÀM HỖ TRỢ MỚI] - Cập nhật giá trị một ô và ghi lại vào nhật ký với Action ID.
 */
function revertOrderStatusByOrderNumber(orderNumber, userEmail) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheets = getSheets(ss);
  const { daGhepSheet, nhatKyChinhSuaSheet } = sheets;

  // 1. Tìm đơn hàng trong sheet DaGhep
  const daGhepData = daGhepSheet.getDataRange().getValues();
  const daGhepHeaders = daGhepData[0];
  const orderCol = daGhepHeaders.indexOf("Số đơn hàng");
  const ketQuaCol = daGhepHeaders.indexOf("Kết quả");

  let rowIndex = -1;
  for (let i = 1; i < daGhepData.length; i++) {
    if (String(daGhepData[i][orderCol]).trim() === orderNumber) {
      rowIndex = i + 1; // 1-based index
      break;
    }
  }

  if (rowIndex === -1) {
    throw new Error(`Không tìm thấy đơn hàng "${orderNumber}" trong sheet DaGhep.`);
  }

  // 2. Tìm trong nhật ký chỉnh sửa (NhatKyChinhSua)
  const logData = nhatKyChinhSuaSheet.getDataRange().getValues();
  const logHeaders = logData[0];
  const sheetNameColLog = logHeaders.indexOf("Tên Sheet");
  const cellColLog = logHeaders.indexOf("Ô");
  const oldValueColLog = logHeaders.indexOf("Giá trị cũ");
  const newValueColLog = logHeaders.indexOf("Giá trị mới");

  const targetCellA1 = daGhepSheet.getRange(rowIndex, ketQuaCol + 1).getA1Notation();
  let lastStatusChangeLog = null;

  // Duyệt ngược từ cuối để tìm lần thay đổi trạng thái gần nhất
  for (let i = logData.length - 1; i >= 1; i--) {
    if (logData[i][sheetNameColLog] === DA_GHEP_SHEET_NAME && logData[i][cellColLog] === targetCellA1) {
      lastStatusChangeLog = {
        oldValue: logData[i][oldValueColLog],
        newValue: logData[i][newValueColLog]
      };
      break;
    }
  }

  if (!lastStatusChangeLog) {
    throw new Error(`Không tìm thấy lịch sử thay đổi trạng thái cho đơn hàng "${orderNumber}".`);
  }

  const currentStatus = daGhepSheet.getRange(rowIndex, ketQuaCol + 1).getValue();
  if (currentStatus !== lastStatusChangeLog.newValue) {
    throw new Error(`Trạng thái hiện tại (${currentStatus}) không khớp với lịch sử gần nhất. Vui lòng kiểm tra lại.`);
  }

  const statusToRevertTo = lastStatusChangeLog.oldValue;
  if (!statusToRevertTo || statusToRevertTo === "[Ô trống]") {
    throw new Error("Không thể hoàn tác về một trạng thái trống.");
  }

  // 3. Thực hiện hoàn tác và ghi log mới
  const actionId = `revert-status-${new Date().getTime()}`;
  updateCellAndLog(daGhepSheet, rowIndex, ketQuaCol + 1, statusToRevertTo, userEmail, actionId, nhatKyChinhSuaSheet);

  logAction("Hoàn tác Trạng thái Đơn hàng", `Người dùng ${userEmail} đã hoàn tác trạng thái ĐH ${orderNumber} từ "${currentStatus}" về "${statusToRevertTo}".`);
  addNotification(`Trạng thái ĐH ${orderNumber} đã được hoàn tác về "${statusToRevertTo}".`, 'success', 'daGhep', orderNumber, userEmail, ADMIN_EMAIL);

  return {
    message: `Đã hoàn tác trạng thái của đơn hàng ${orderNumber} về "${statusToRevertTo}" thành công.`,
    newStatus: statusToRevertTo
  };
}
/**
 * [HÀM MỚI] - Xử lý việc đánh dấu một thông báo cụ thể là đã đọc.
 * @param {object} e - Đối tượng sự kiện từ doPost, chứa tham số 'timestamp'.
 * @returns {ContentService.TextOutput} - Phản hồi JSON.
 */
function sendTelegramDocument(fileBlob, caption = "") {
  const TELEGRAM_BOT_TOKEN = "8444242103:AAGupLJ1RJS3b3LD5LMEYIWMfwCFW3mzhB4";
  const TELEGRAM_CHAT_ID = "5812034168";
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    Logger.log("Lỗi: Chưa cấu hình TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID.");
    return;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;

  // Khi gửi file, payload không phải là JSON mà là một đối tượng chứa các phần của form.
  // UrlFetchApp sẽ tự động mã hóa nó thành multipart/form-data.
  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
    document: fileBlob, // Gán trực tiếp đối tượng Blob vào đây
    caption: caption,
    parse_mode: 'HTML'
  };

  const options = {
    'method': 'post',
    'payload': payload, // Không cần JSON.stringify
    'muteHttpExceptions': true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    Logger.log(`Telegram API (sendDocument) response: ${response.getContentText()}`);
  } catch (e) {
    Logger.log(`Lỗi khi gửi tài liệu qua Telegram: ${e.message}`);
  }
}
function sendTelegramMessage(message, keyboard = null, chatId = null) {
  const TELEGRAM_BOT_TOKEN = "8444242103:AAGupLJ1RJS3b3LD5LMEYIWMfwCFW3mzhB4";
  const TELEGRAM_CHAT_ID = "5812034168";
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    Logger.log("Lỗi: Chưa cấu hình TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID.");
    return;
  }

  const targetChatId = chatId || TELEGRAM_CHAT_ID;
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: targetChatId,
    text: message,
    parse_mode: 'HTML'
  };

  if (keyboard) {
    payload.reply_markup = JSON.stringify({
      inline_keyboard: keyboard
    });
  }

  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    Logger.log(`Telegram API response (sendMessage): ${response.getContentText()}`);
  } catch (e) {
    Logger.log(`Lỗi khi gửi thông báo Telegram: ${e.message}`);
  }
}
function editTelegramMessage(chatId, messageId, newText, newKeyboard = null) {
  const TELEGRAM_BOT_TOKEN = "8444242103:AAGupLJ1RJS3b3LD5LMEYIWMfwCFW3mzhB4";
  if (!TELEGRAM_BOT_TOKEN) return;

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`;
  const payload = {
    chat_id: chatId,
    message_id: messageId,
    text: newText,
    parse_mode: 'HTML'
  };

  if (newKeyboard) {
    payload.reply_markup = JSON.stringify({
      inline_keyboard: newKeyboard
    });
  }

  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    Logger.log(`Telegram API response (editMessageText): ${response.getContentText()}`);
  } catch (e) {
    Logger.log(`Lỗi khi sửa tin nhắn Telegram: ${e.message}`);
  }
}
function forceSyncVinData() {
  const ui = SpreadsheetApp.getUi();

  // Hộp thoại yêu cầu người dùng nhập VIN
  const response = ui.prompt(
    'Đồng bộ dữ liệu xe',
    'Vui lòng nhập chính xác số VIN cần sửa và đồng bộ hóa:',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK || !response.getResponseText()) {
    ui.alert('Đã hủy thao tác.');
    return;
  }

  const vinToFix = response.getResponseText().trim().toUpperCase();
  if (vinToFix.length !== 17) {
    ui.alert('Lỗi', `Số VIN "${vinToFix}" không hợp lệ. Vui lòng kiểm tra lại.`, ui.ButtonSet.OK);
    return;
  }

  const SPREADSHEET_ID = "1CzYUfDAcwt4D64UIZIUC77lZ2lOYQ257xlmVXy2nZG0";
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Lấy các sheet cần thiết
  const thongtinxeSheet = ss.getSheetByName("Thongtinxe");
  const khoXeSheet = ss.getSheetByName("KhoXe");
  const daGhepSheet = ss.getSheetByName("DaGhep");

  if (!thongtinxeSheet || !khoXeSheet || !daGhepSheet) {
    ui.alert('Lỗi', 'Không tìm thấy một trong các sheet cần thiết (Thongtinxe, KhoXe, DaGhep).', ui.ButtonSet.OK);
    return;
  }

  // --- BƯỚC 1: LẤY DỮ LIỆU GỐC TỪ THONGTINXE ---
  const thongtinxeData = thongtinxeSheet.getDataRange().getValues();
  const thongtinxeHeaders = thongtinxeData[0];
  const vinColMaster = thongtinxeHeaders.indexOf("Số VIN");
  let masterData = null;

  for (let i = 1; i < thongtinxeData.length; i++) {
    if (String(thongtinxeData[i][vinColMaster]).trim().toUpperCase() === vinToFix) {
      masterData = thongtinxeData[i];
      break;
    }
  }

  if (!masterData) {
    ui.alert('Lỗi', `Không tìm thấy số VIN "${vinToFix}" trong sheet dữ liệu gốc 'Thongtinxe'.`, ui.ButtonSet.OK);
    return;
  }

  // Trích xuất dữ liệu chuẩn
  const correctInfo = {
    dongXe: masterData[thongtinxeHeaders.indexOf("Mô tả sản phẩm")] || "",
    phienBan: masterData[thongtinxeHeaders.indexOf("Phiên bản")] || "",
    ngoaiThat: masterData[thongtinxeHeaders.indexOf("Màu ngoại thất xe")] || "",
    noiThat: masterData[thongtinxeHeaders.indexOf("Màu nội thất xe")] || "",
    maDMS: masterData[thongtinxeHeaders.indexOf("Khu vực")] || ""
  };

  let fixesMade = [];

  // --- BƯỚC 2: SỬA DỮ LIỆU TRONG KHOXE ---
  const khoXeData = khoXeSheet.getDataRange().getValues();
  const khoXeHeaders = khoXeData[0];
  const vinColKhoXe = khoXeHeaders.indexOf("VIN");
  for (let i = 1; i < khoXeData.length; i++) {
    if (String(khoXeData[i][vinColKhoXe]).trim().toUpperCase() === vinToFix) {
      khoXeSheet.getRange(i + 1, khoXeHeaders.indexOf("Dòng xe") + 1).setValue(correctInfo.dongXe);
      khoXeSheet.getRange(i + 1, khoXeHeaders.indexOf("Phiên bản") + 1).setValue(correctInfo.phienBan);
      khoXeSheet.getRange(i + 1, khoXeHeaders.indexOf("Ngoại thất") + 1).setValue(correctInfo.ngoaiThat);
      khoXeSheet.getRange(i + 1, khoXeHeaders.indexOf("Nội thất") + 1).setValue(correctInfo.noiThat);
      khoXeSheet.getRange(i + 1, khoXeHeaders.indexOf("Mã DMS") + 1).setValue(correctInfo.maDMS);
      fixesMade.push("KhoXe");
      break;
    }
  }

  // --- BƯỚC 3: SỬA DỮ LIỆU TRONG DAGHEP ---
  const daGhepData = daGhepSheet.getDataRange().getValues();
  const daGhepHeaders = daGhepData[0];
  const vinColDaGhep = daGhepHeaders.indexOf("VIN");
  for (let i = 1; i < daGhepData.length; i++) {
    if (String(daGhepData[i][vinColDaGhep]).trim().toUpperCase() === vinToFix) {
      daGhepSheet.getRange(i + 1, daGhepHeaders.indexOf("Dòng xe") + 1).setValue(correctInfo.dongXe);
      daGhepSheet.getRange(i + 1, daGhepHeaders.indexOf("Phiên bản") + 1).setValue(correctInfo.phienBan);
      daGhepSheet.getRange(i + 1, daGhepHeaders.indexOf("Ngoại thất") + 1).setValue(correctInfo.ngoaiThat);
      daGhepSheet.getRange(i + 1, daGhepHeaders.indexOf("Nội thất") + 1).setValue(correctInfo.noiThat);
      fixesMade.push("DaGhep");
      break;
    }
  }

  if (fixesMade.length > 0) {
    ui.alert('Thành công', `Đã đồng bộ hóa và sửa chữa dữ liệu cho VIN "${vinToFix}" trong các sheet: ${fixesMade.join(', ')}. Vui lòng thử lại thao tác trên web.`, ui.ButtonSet.OK);
  } else {
    ui.alert('Thông báo', `Không tìm thấy VIN "${vinToFix}" trong 'KhoXe' hoặc 'DaGhep' để sửa. Dữ liệu gốc đã được xác nhận.`, ui.ButtonSet.OK);
  }
}
/**
 * Hàm tiện ích để chuẩn hóa tên một cách mạnh mẽ.
 * Xóa khoảng trắng thừa, chuyển thành chữ thường và chuẩn hóa Unicode.
 * @param {string} name Tên cần chuẩn hóa.
 * @returns {string} Tên đã được chuẩn hóa.
 */
function normalizeNameGas(name) {
  if (typeof name !== 'string' || !name) {
    return "";
  }
  return name
    .trim()             // 1. Xóa khoảng trắng đầu/cuối
    .replace(/\s+/g, ' ') // 2. Gộp nhiều khoảng trắng thành một
    .toLowerCase()      // 3. Chuyển thành chữ thường
    .normalize('NFC');  // 4. Chuẩn hóa Unicode
}

function sanitizeFolderName(name) {
  return name ? name.replace(/[\\/]/g, '_') : 'unknown';
}

function saveBase64FilesToDrive(targetFolder, filesDataJsonString) {
  if (!filesDataJsonString) return '[]';

  if (TEST_DRIVE_IMAGE_FOLDER_ID === 'YOUR_FOLDER_ID_HERE' || !TEST_DRIVE_IMAGE_FOLDER_ID) {
    throw new Error('Chưa cấu hình TEST_DRIVE_IMAGE_FOLDER_ID trong Google Apps Script.');
  }

  const filesData = JSON.parse(filesDataJsonString);
  if (!Array.isArray(filesData) || filesData.length === 0) return '[]';

  const fileDetails = filesData.map(fileInfo => {
    if (!fileInfo || !fileInfo.data || !fileInfo.type || !fileInfo.name) {
      Logger.log("Bỏ qua một mục file vì thiếu thông tin cần thiết (data, type, hoặc name).");
      return null;
    }

    let base64Data;
    if (fileInfo.data.startsWith('data:')) {
      const parts = fileInfo.data.split(',');
      if (parts.length === 2) {
        base64Data = parts[1];
      } else {
        throw new Error(`Chuỗi Data URL không hợp lệ cho file: ${fileInfo.name}`);
      }
    } else {
      base64Data = fileInfo.data;
    }

    try {
      const decoded = Utilities.base64Decode(base64Data, Utilities.Charset.UTF_8);
      const blob = Utilities.newBlob(decoded, fileInfo.type, fileInfo.name);
      const file = targetFolder.createFile(blob);

      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      const fileId = file.getId();

      // === SỬA ĐỔI TẠI ĐÂY ===
      // Trả về một chuỗi URL thumbnail của ảnh.
      return `https://drive.google.com/thumbnail?id=${fileId}`;

    } catch (e) {
      Logger.log(`Lỗi nghiêm trọng khi giải mã hoặc tạo blob cho file "${fileInfo.name}": ${e.message}`);
      throw new Error(`Không thể xử lý dữ liệu cho file "${fileInfo.name}". Có thể dữ liệu base64 bị hỏng.`);
    }
  }).filter(detail => detail != null);

  return JSON.stringify(fileDetails);
}

function removeVietnameseTones(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

function generateUsernameFromName(fullName) {
  if (!fullName) return '';
  const nameWithoutTones = removeVietnameseTones(fullName.toLowerCase().trim());
  const nameParts = nameWithoutTones.split(/\s+/);
  if (nameParts.length === 1) return nameParts[0];
  const lastName = nameParts[nameParts.length - 1];
  const initials = nameParts.slice(0, -1).map(part => part.charAt(0)).join('');
  return lastName + initials;
}

function generateRandomPassword(length) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length }, () => charset.charAt(Math.floor(Math.random() * charset.length))).join('');
}

function hashPassword(password) {
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  return hash.map(byte => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join('');
}

function findUserBy(sheet, columnIndex, value) {
  if (!value) return null;
  const data = sheet.getDataRange().getValues();
  const normalizedValue = value.toLowerCase().trim();
  for (let i = 1; i < data.length; i++) {
    const cellValue = data[i][columnIndex];
    if (cellValue && cellValue.toString().toLowerCase().trim() === normalizedValue) {
      return {
        row: i + 1,
        username: data[i][0],
        passwordHash: data[i][1],
        fullName: data[i][2],
        role: data[i][3],
        email: data[i][4]
      };
    }
  }
  return null;
}

function findUserByUsername(sheet, username) {
  return findUserBy(sheet, 0, username); // Column A for Username
}

function runSyncKhoxeStatus() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Lấy các Sheet bằng tên (dựa trên các hằng số đã định nghĩa trong mã của bạn)
  const daghepSheet = ss.getSheetByName(DA_GHEP_SHEET_NAME);
  const khoxeSheet = ss.getSheetByName(STOCK_SHEET_NAME);
  const xuathoadonSheet = ss.getSheetByName(XUAT_HOA_DON_SHEET_NAME);

  // Kiểm tra xem các sheet có tồn tại không
  if (!daghepSheet || !khoxeSheet || !xuathoadonSheet) {
    Logger.log("LỖI: Không tìm thấy đủ các Sheet cần thiết (DaGhep, KhoXe, Xuathoadon).");
    return; // Dừng nếu thiếu sheet
  }

  // Gọi hàm chuẩn hóa trạng thái
  syncKhoxeStatus(daghepSheet, khoxeSheet, xuathoadonSheet);

  Logger.log("Đã chạy hàm syncKhoxeStatus thành công.");

  // (Tùy chọn) Nếu bạn đang sử dụng hàm getSheets, bạn có thể gọi:
  // const sheets = getSheets(ss);
  // syncKhoxeStatus(sheets.daGhepSheet, sheets.stockSheet, sheets.xuathoadonSheet);
}
function setupAlwaysCorrectSync() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === "runSyncKhoxeStatus") {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Tạo trigger chạy mỗi 1 phút để quét trạng thái
  ScriptApp.newTrigger("runSyncKhoxeStatus")
    .timeBased()
    .everyMinutes(1)
    .create();

  SpreadsheetApp.getUi().alert("Đã cài đặt tính năng tự động đồng bộ trạng thái mỗi phút.");
}

// =================================================================
//   CHÚC MỪNG NĂM MỚI 2026
// =================================================================

/**
 * Hàm gửi mail chúc mừng năm mới 2026.
 * Hàm này sẽ được Trigger gọi tự động vào đúng 00:00:00 ngày 1/1/2026.
 */
function sendNewYear2026Greetings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName(USER_SHEET_NAME);

  if (!userSheet) {
    Logger.log("Không tìm thấy sheet User để gửi mail chúc tết.");
    return;
  }

  const users = userSheet.getDataRange().getValues();
  // Giả sử dòng 1 là header, bắt đầu từ dòng 2 (index 1)
  // Cấu trúc cột theo hàm findUserBy: [0]Username, [1]PassHash, [2]FullName, [3]Role, [4]Email

  const emailSubject = "✨ CHÚC MỪNG NĂM MỚI 2026 - XUÂN BÍNH NGỌ: MÃ ĐÁO THÀNH CÔNG ✨";

  // Mẫu HTML Modern Luxury (Đã được duyệt)
  const htmlBody = `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HAPPY NEW YEAR 2026</title>
    <style>
        /* --- RESET & FONTS --- */
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@300;400;600&display=swap');
        
        body { margin: 0; padding: 0; width: 100% !important; background-color: #0f172a; font-family: 'Montserrat', sans-serif; -webkit-font-smoothing: antialiased; }
        table { border-collapse: collapse; }
        img { display: block; border: 0; max-width: 100%; }

        /* --- VARIABLES & THEMING --- */
        /* Theme: Midnight Blue & Metallic Gold */
        :root {
            --bg-dark: #0f172a;
            --card-bg: #1e293b;
            --text-gold: #fbbf24;
            --text-gold-gradient: linear-gradient(45deg, #d4af37, #f3e5ab, #d4af37);
            --text-white: #f8fafc;
            --text-dim: #94a3b8;
        }

        .wrapper {
            background-color: #0f172a; /* Fallback */
            background: radial-gradient(circle at top center, #1e293b 0%, #0f172a 100%);
            padding: 60px 10px;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #1e293b;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.1);
            position: relative;
        }

        /* --- HEADER HERO --- */
        .hero {
            background-image: url('https://img.freepik.com/free-vector/luxury-golden-mandala-background-style_23-2148560893.jpg'); /* Abstract Gold Pattern */
            background-size: cover;
            background-position: center;
            height: 250px;
            text-align: center;
            position: relative;
        }

        .hero-overlay {
            background: linear-gradient(to bottom, rgba(15, 23, 42, 0.3), #1e293b);
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            display: block;
            box-sizing: border-box;
            padding-top: 150px;
            text-align: center;
        }

        .year-title {
            font-family: 'Playfair Display', serif;
            font-size: 60px;
            font-weight: 700;
            color: #d4af37;
            margin: 0;
            line-height: .9;
            letter-spacing: 2px;
            text-shadow: 0 4px 10px rgba(0,0,0,0.5);
            text-align: center;
            width: 100%;
        }
        
        .sub-title {
            color: #e2e8f0;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 6px;
            margin-top: 10px;
            opacity: 0.9;
            text-align: center;
            width: 100%;
        }

        /* --- CONTENT BODY --- */
        .content {
            padding: 40px;
            text-align: center;
            color: #f8fafc;
        }
        
        .greeting-header {
            font-family: 'Playfair Display', serif;
            font-size: 28px;
            color: #ffffff;
            margin-bottom: 24px;
        }
        
        .message-text {
            color: #cbd5e1;
            font-size: 16px;
            line-height: 1.8;
            margin-bottom: 30px;
            font-weight: 300;
        }

        /* --- GOLDEN CARD FEATURE --- */
        .gold-card {
            background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
            border: 1px solid rgba(212, 175, 55, 0.3); /* Gold border */
            border-radius: 8px;
            padding: 25px;
            margin: 20px 0;
            position: relative;
        }
        
        .glimmer-icon {
            font-size: 24px;
            color: #d4af37;
            margin-bottom: 10px;
            display: block;
        }
        
        .wish-item {
            font-family: 'Playfair Display', serif;
            font-size: 18px;
            color: #f1f5f9;
            margin: 10px 0;
            letter-spacing: 0.5px;
        }
        
        .divider {
            height: 1px;
            width: 40px;
            background-color: #d4af37;
            margin: 15px auto;
            opacity: 0.5;
        }

        /* --- CALL TO ACTION --- */
        .cta-button {
            display: inline-block;
            background: linear-gradient(90deg, #d4af37, #b48e26);
            color: #0f172a;
            padding: 14px 40px;
            border-radius: 2px;
            font-weight: 600;
            text-decoration: none;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 20px;
            transition: all 0.3s ease;
        }

        /* --- FOOTER --- */
        .footer {
            background-color: #0f172a;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #334155;
        }
        
        .footer-text {
            color: #64748b;
            font-size: 12px;
            margin-bottom: 10px;
        }
        
        .logo-text {
            color: #94a3b8;
            font-weight: 700;
            font-size: 14px;
            letter-spacing: 1px;
        }

        @media only screen and (max-width: 480px) {
            .content { padding: 30px 20px; }
            .year-title { font-size: 48px; }
            .greeting-header { font-size: 24px; }
        }
    </style>
</head>
<body>

    <div class="wrapper">
        <table class="container" role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <!-- HERO SECTION -->
            <tr>
                <td class="hero">
                    <div class="hero-overlay">
                        <h1 class="year-title">2026</h1>
                        <div class="sub-title">Year of the Horse</div>
                    </div>
                </td>
            </tr>
            
            <!-- CONTENT SECTION -->
            <tr>
                <td class="content">
                    <h2 class="greeting-header">Happy New Year</h2>
                    
                    <p class="message-text">
                        Kính gửi Quý đồng nghiệp,<br><br>
                        Khi kim đồng hồ điểm thời khắc giao thừa, chúng tôi muốn dành khoảnh khắc này để gửi lời cảm ơn chân thành tới sự cống hiến tuyệt vời của bạn.
                    </p>
                    
                    <!-- LUXURY WISH CARD -->
                    <div class="gold-card">
                        <span class="glimmer-icon">✦</span>
                        <div class="wish-item">Thịnh Vượng</div>
                        <div class="divider"></div>
                        <div class="wish-item">Hạnh Phúc</div>
                        <div class="divider"></div>
                        <div class="wish-item">Thành Công</div>
                        <span class="glimmer-icon" style="margin-top: 10px;">✦</span>
                    </div>
                    
                    <p class="message-text">
                        Chúc bạn và gia đình một mùa xuân <strong>Bính Ngọ</strong> rực rỡ và một năm mới tràn đầy những cơ hội mới.
                    </p>
                    

                </td>
            </tr>
            

        </table>
    </div>

</body>
</html>`;

  Logger.log(`Bắt đầu gửi mail chúc tết cho ${users.length - 1} nhân sự...`);

  let count = 0;
  for (let i = 1; i < users.length; i++) {
    const row = users[i];
    const fullName = row[2];
    const email = row[4];

    if (email && email.includes("@")) { // Kiểm tra email hợp lệ đơn giản
      try {
        // Nếu muốn thay tên vào email, có thể dùng .replace() ở đây
        // const personalizedBody = htmlBody.replace("Kính gửi Quý đồng nghiệp", `Kính gửi ${fullName}`);

        sendEmailViaEdge({
          to: email,
          subject: emailSubject,
          htmlBody: htmlBody // Gửi email với HTML mới
        });
        count++;
        // Nghỉ nhẹ để tránh hit rate limit của Google nếu danh sách quá dài
        Utilities.sleep(500);
      } catch (e) {
        Logger.log(`Lỗi gửi mail cho ${email}: ${e.message}`);
      }
    }
  }

  Logger.log(`Đã gửi thành công ${count} email chúc mừng năm mới.`);
}

/**
 * CHẠY HÀM NÀY MỘT LẦN DUY NHẤT ĐỂ CÀI ĐẶT LỊCH GỬI
 */
function setupNewYear2026Trigger() {
  // 1. Xóa các trigger cũ nếu có để tránh trùng lặp
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === "sendNewYear2026Greetings") {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // 2. Tạo thời gian: 00:00:00 ngày 1/1/2026
  // Lưu ý: New Date trong App Script sẽ lấy múi giờ của Script (thường là set theo Spreadsheet).
  // Đảm bảo File > Settings > Timezone của dự án Script đúng là GMT+7 (Vietnam).
  const targetDate = new Date("2026-01-01T00:00:00");

  // 3. Tạo Trigger
  ScriptApp.newTrigger("sendNewYear2026Greetings")
    .timeBased()
    .at(targetDate)
    .create();

  Logger.log(`Đã cài đặt lịch gửi mail vào lúc: ${targetDate.toString()}`);
  Logger.log("Đã cài đặt lịch gửi mail Tết 2026 thành công! Kiểm tra trong Triggers.");
}

/**
 * HÀM TEST: Gửi thử 1 email đến địa chỉ chỉ định để kiểm tra giao diện.
 * Chạy hàm này thủ công để xem trước nội dung mail.
 */
function syncAllArchiveVcStatus() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const vcSheet = ss.getSheetByName(YEU_CAU_VC_SHEET_NAME);
  if (!vcSheet) return;

  // 1. Lấy dữ liệu từ YeuCauVC (Cột A: Số đơn hàng, Cột F: Trạng thái xử lý)
  const vcValues = vcSheet.getDataRange().getValues();
  const vcStatusMap = {};
  vcValues.forEach((row, idx) => {
    if (idx === 0) return;
    const orderNo = String(row[0]).trim();
    const status = String(row[5]).trim();

    if (orderNo) {
      if (status === "Đã phê duyệt" || status === "Đã hoàn thành") {
        vcStatusMap[orderNo] = "Đã cấp VC";
      } else if (status === "Từ chối ycvc") {
        vcStatusMap[orderNo] = "Từ chối VC";
      } else if (status === "Chờ phê duyệt" || status === "Chờ duyệt ycvc") {
        vcStatusMap[orderNo] = "Chờ duyệt VC";
      }
    }
  });

  // 2. Danh sách các sheet cần quét
  const targetSheets = ss.getSheets().filter(s => {
    const n = s.getName();
    return n === DA_GHEP_SHEET_NAME || n === XUAT_HOA_DON_SHEET_NAME || n.startsWith("LuuTru");
  });

  targetSheets.forEach(sheet => {
    const lastCol = sheet.getLastColumn();
    if (lastCol === 0) return;

    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
    let vcColIdx = headers.findIndex(h => h === "Trạng thái VC");
    let orderColIdx = headers.findIndex(h => h.toUpperCase() === "SỐ ĐƠN HÀNG");

    // Tạo cột nếu thiếu
    if (vcColIdx === -1) {
      vcColIdx = lastCol;
      sheet.getRange(1, vcColIdx + 1).setValue("Trạng thái VC")
        .setBackground(UI_CONFIG.headerBgColor).setFontColor(UI_CONFIG.headerFontColor).setFontWeight("bold");
    }

    if (orderColIdx === -1) return;

    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      const orderNo = String(values[i][orderColIdx]).trim();
      const statusToFill = vcStatusMap[orderNo];

      if (orderNo && statusToFill) {
        sheet.getRange(i + 1, vcColIdx + 1).setValue(statusToFill);
      }
    }
  });

  if (typeof SpreadsheetApp !== 'undefined' && SpreadsheetApp.getUi) {
    SpreadsheetApp.getUi().alert("Thông báo", "Đã đồng bộ trạng thái: 'Đã có VC' và 'Từ chối' thành công!", SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

// =================================================================
// CHAT HUB - INTERNAL MESSENGER
// =================================================================

/**
 * Handle adding a new chat message
 */

// =================================================================
// JWT AUTHENTICATION
// =================================================================

function base64UrlEncode(str) {
  const bytes = Utilities.newBlob(str).getBytes();
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}

function base64UrlEncodeByteArray(bytes) {
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}

function base64UrlDecode(str) {
  let paddedStr = str + "===".slice((str.length + 3) % 4);
  return Utilities.newBlob(Utilities.base64DecodeWebSafe(paddedStr)).getDataAsString();
}

function getJwtSecret() {
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty('JWT_SECRET');
  if (!secret) {
    secret = Utilities.getUuid();
    props.setProperty('JWT_SECRET', secret);
  }
  return secret;
}

function generateJWT(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${headerEncoded}.${payloadEncoded}`;
  const signature = Utilities.computeHmacSha256Signature(signatureInput, getJwtSecret());
  const signatureEncoded = base64UrlEncodeByteArray(signature);
  return `${signatureInput}.${signatureEncoded}`;
}

function verifyJWT(token) {
  try {
    if (!token) return null;

    // === ĐƯỜNG CAO TỐC CHO ĐĂNG NHẬP NHANH SUPABASE TRÊN WEB ===
    if (token === "FAST_SUPABASE_LOGIN_TOKEN_2026") {
      return { exp: Date.now() + 86400000, username: "FastLoginUser" };
    }

    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const signatureInput = `${parts[0]}.${parts[1]}`;
    const signature = Utilities.computeHmacSha256Signature(signatureInput, getJwtSecret());
    const expectedSignatureEncoded = base64UrlEncodeByteArray(signature);
    if (parts[2] === expectedSignatureEncoded) {
      const payload = JSON.parse(base64UrlDecode(parts[1]));
      if (payload.exp && payload.exp < Date.now()) {
        return null;
      }
      return payload;
    }
  } catch (e) {
    return null;
  }
  return null;
}

/**
 * Đồng bộ toàn bộ dữ liệu từ Supabase yeucauxhd về Google Sheet (Một lần)
 */
function fullSyncYeuCauXhd() {
  Logger.log("--- BẮT ĐẦU: Đồng bộ TOÀN BỘ yeucauxhd từ Supabase về Sheet ---");
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(XUAT_HOA_DON_SHEET_NAME);
  if (!sheet) throw new Error("Không tìm thấy sheet " + XUAT_HOA_DON_SHEET_NAME);

  // 1. Lấy dữ liệu từ Supabase
  const url = `${SUPABASE_URL}/rest/v1/yeucauxhd?select=*&order=ngay_yeu_cau.asc`;
  const options = {
    method: "get",
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": "Bearer " + SUPABASE_SERVICE_KEY
    }
  };

  const response = UrlFetchApp.fetch(url, options);
  const supabaseData = JSON.parse(response.getContentText());

  if (!supabaseData || supabaseData.length === 0) {
    return "Không có dữ liệu trên Supabase để đồng bộ.";
  }

  // 2. Chuẩn bị Header và dữ liệu Sheet hiện tại
  const sheetData = sheet.getDataRange().getValues();
  const headers = sheetData[0];

  // Hàm format ngày giờ
  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      return Utilities.formatDate(date, 'GMT+7', 'dd/MM/yyyy HH:mm:ss');
    } catch (e) { return isoString; }
  };

  // 3. Tạo Payload mới từ dữ liệu Supabase
  const newRows = supabaseData.map((record, index) => {
    const row = new Array(headers.length).fill('');
    row[0] = index + 1; // Số TT mới
    row[1] = record.ten_khach_hang || '';
    row[2] = record.so_don_hang || '';
    row[3] = record.dong_xe || '';
    row[4] = record.phien_ban || '';
    row[5] = record.ngoai_that || '';
    row[6] = record.noi_that || '';
    row[7] = record.tvbh || '';
    row[8] = record.vin || '';
    row[9] = record.so_may || '';
    row[10] = formatDateTime(record.ngay_yeu_cau);
    row[11] = formatDateTime(record.ngay_xuat_hoa_don);
    row[12] = record.hoa_hong_ung || '';
    row[13] = record.vpoint || '';
    row[14] = record.chinh_sach || '';
    row[15] = formatDateTime(record.ngay_coc) || record.ngay_coc || '';
    row[16] = record.ket_qua_gui_mail || '';
    row[17] = record.url_hop_dong || '';
    row[18] = record.url_de_nghi_xhd || '';
    row[19] = record.url_hoa_don_da_xuat || '';
    row[20] = record.trang_thai_vc || '';
    return row;
  });

  // 4. Cập nhật Sheet: Xóa các dòng dữ liệu cũ (giữ header) và ghi dòng mới
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).clearContent();
  }

  if (newRows.length > 0) {
    sheet.getRange(2, 1, newRows.length, headers.length).setValues(newRows);
  }

  const msg = `Đã đồng bộ thành công ${newRows.length} đơn hàng từ Supabase về Google Sheet.`;
  Logger.log(msg);
  return msg;
}