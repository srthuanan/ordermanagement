/**
 * 03_utils.js - Các hàm tiện ích dùng chung
 */

function insertSupabase(table, data) {
  try {
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
    return response.getResponseCode() >= 200 && response.getResponseCode() < 300;
  } catch (e) {
    Logger.log(`Supabase Insert Error: ${e.message}`);
    return false;
  }
}

function updateSupabase(table, queryParams, data) {
  try {
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
    return response.getResponseCode() >= 200 && response.getResponseCode() < 300;
  } catch (e) {
    Logger.log(`Supabase Update Error: ${e.message}`);
    return false;
  }
}

function fetchSupabase(table, queryParams = "") {
  try {
    let url = `${SUPABASE_URL}/rest/v1/${table}`;
    if (queryParams) url += `?${queryParams}`;
    const options = {
      method: "get",
      headers: {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": "Bearer " + SUPABASE_SERVICE_KEY
      },
      muteHttpExceptions: true
    };
    const res = UrlFetchApp.fetch(url, options);
    return res.getResponseCode() === 200 ? JSON.parse(res.getContentText()) : [];
  } catch (e) {
    Logger.log(`Supabase Fetch Error: ${e.message}`);
    return [];
  }
}

function deleteSupabase(table, queryParams) {
  try {
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
    return response.getResponseCode() >= 200 && response.getResponseCode() < 300;
  } catch (e) {
    Logger.log(`Supabase Delete Error: ${e.message}`);
    return false;
  }
}

function applyFormattingToRange(sheet, startRow, numRows) {
  try {
    let maxCols = sheet.getLastColumn();
    if (maxCols > 0 && startRow > 1) {
      const formatRange = sheet.getRange(startRow, 1, numRows, maxCols);
      formatRange
        .setBorder(true, true, true, true, true, true, "#d3d9e6", SpreadsheetApp.BorderStyle.SOLID)
        .setFontFamily("Roboto")
        .setFontSize(11)
        .setHorizontalAlignment("left")
        .setVerticalAlignment("middle");
    }
  } catch (e) {}
}

function appendAndFormatRow(sheet, rowData) {
  if (!sheet) return;
  sheet.appendRow(rowData);
  applyFormattingToRange(sheet, sheet.getLastRow(), 1);
}

function sendTelegramNotification(message) {
  try {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payload = {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    };
    UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (e) {
    Logger.log("Telegram Error: " + e.message);
  }
}

function formatDateTimeForSheet(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return "";
  const d = (n) => String(n).padStart(2, '0');
  return `${d(date.getDate())}/${d(date.getMonth() + 1)}/${date.getFullYear()} ${d(date.getHours())}:${d(date.getMinutes())}:${d(date.getSeconds())}`;
}

function logAction(action, details) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = getOrCreateSheet(ss, "Backend", ["Hệ thống đã chuyển đổi sang Supabase 100%"]);
    logSheet.appendRow([
      formatDateTimeForSheet(new Date()),
      action,
      details
    ]);
  } catch (e) {}
}

/**
 * Hàm hỗ trợ: Lấy sheet đã có hoặc tạo mới nếu chưa có
 */
function getOrCreateSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      applyFormattingToRange(sheet, 1, 1);
    }
  }
  return sheet;
}

/**
 * Chuẩn hóa chuỗi: xóa dấu tiếng Việt, viết thường, xóa khoảng trắng thừa
 */
function normalizeString(str) {
  if (!str) return "";
  const from = "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ";
  const to   = "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd";
  let result = String(str).toLowerCase().trim();
  for (let i = 0, l = from.length; i < l; i++) {
    result = result.replace(new RegExp(from[i], "g"), to[i]);
  }
  // Xóa các ký tự đặc biệt khác nếu cần
  return result.replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}
