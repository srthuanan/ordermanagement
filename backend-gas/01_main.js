/**
 * 01_main.js - Cổng nhận yêu cầu từ Supabase và WebApp
 */

function doGet(e) {
  return doPost(e);
}

function doPost(e) {
  let action = 'default';
  
  // Hỗ trợ nhận diện JSON từ Supabase gửi sang
  try {
    if (e.postData && e.postData.contents) {
      const body = JSON.parse(e.postData.contents);
      if (body && body.action) action = body.action;
    }
  } catch (ex) {}

  // Hỗ trợ nhận diện Form từ Web gửi sang (Ưu tiên e.parameter)
  if (e.parameter && e.parameter.action) {
    action = e.parameter.action;
  }
  
  const lock = LockService.getScriptLock();
  
  // Xác định các hành động không cần Lock
  const noLockActions = [
    'sendSupabaseEmail',
    'fetchSupabasePdfToDrive',
    'archiveOrderNow',
    'performOcr',
    'notifyInvoiceUploaded',
    'resendEmail',
    'getOrderImagesFromDrive'
  ];
  // Note: 'supabase_webhook' removed from noLockActions to prevent race conditions during sync.
  // Note: 'supabase_webhook' removed from noLockActions to prevent race conditions during sync.

  const needsLock = !noLockActions.includes(action);
  if (needsLock) {
    if (!lock.tryLock(30000)) {
      return createJsonResponse({ status: "ERROR", message: "Hệ thống đang xử lý yêu cầu khác." });
    }
  }

  try {
    const actionName = action || 'default';
    logAction("System", `--- Nhận yêu cầu: ${actionName} ---`);

    let response;
    switch (actionName) {
      case 'sendSupabaseEmail':
        response = createJsonResponse(handleSendSupabaseEmail(e));
        break;
      
      case 'supabase_webhook':
        response = createJsonResponse(handleSupabaseWebhook(e));
        break;

      case 'fetchSupabasePdfToDrive':
        response = handleFetchSupabasePdfToDrive(e);
        break;

      case 'archiveOrderNow':
        // Gọi từ backend-gas/04_maintenance.js
        archiveOrderNow(e.parameter.orderNumber);
        response = createJsonResponse({ status: "SUCCESS" });
        break;

      case 'performOcr':
        response = handlePerformOcr(e);
        break;

      case 'forceSync':
        const syncOk = syncAllFromSupabase();
        response = createJsonResponse({ status: syncOk ? "SUCCESS" : "ERROR" });
        break;

      case 'fetchSheetData':
        response = createJsonResponse(handleFetchSheetData(e));
        break;
      
      case 'notifyInvoiceUploaded':
        response = createJsonResponse(handleNotifyInvoiceUploaded(e));
        break;

      case 'resendEmail':
        response = createJsonResponse(handleResendEmail(e));
        break;

      case 'saveAllSplitImagesToDrive':
        const payload = (e.postData && e.postData.contents) ? JSON.parse(e.postData.contents) : {};
        response = createJsonResponse(saveAllSplitImagesToDrive(
          payload.orderNumber || e.parameter.orderNumber,
          payload.customerName || e.parameter.customerName,
          payload.documentGroups
        ));
        break;

      case 'saveSplitImagesToDrive':
        const payloadSingle = (e.postData && e.postData.contents) ? JSON.parse(e.postData.contents) : {};
        response = createJsonResponse(saveSplitImagesToDrive(
          payloadSingle.orderNumber || e.parameter.orderNumber,
          payloadSingle.customerName || e.parameter.customerName,
          payloadSingle.images, // Array or JSON string
          payloadSingle.prefix || e.parameter.prefix
        ));
        break;
      
      case 'getOrderImagesFromDrive':
        response = createJsonResponse(getOrderImagesFromDrive(
          e.parameter.orderNumber,
          e.parameter.customerName,
          e.parameter.orderDate
        ));
        break;

      default:
        response = createJsonResponse({ status: "ERROR", message: `Hành động '${action}' không được hỗ trợ.` });
    }

    return response;
  } catch (err) {
    Logger.log(`Lỗi doPost: ${err.message}`);
    return createJsonResponse({ status: "ERROR", message: err.message });
  } finally {
    if (needsLock) lock.releaseLock();
  }
}

/**
 * Xử lý gửi email từ payload của Supabase Webhook hoặc Edge Function
 */
function handleSendSupabaseEmail(e) {
  try {
    const payloadStr = (e.parameter && e.parameter.payload) ? e.parameter.payload : (e.postData ? e.postData.contents : null);
    if (!payloadStr) throw new Error("Missing payload");
    
    const payload = JSON.parse(payloadStr);
    const record = payload.record;
    const actionId = payload.actionId || payload.action || null;

    if (!record) throw new Error("Missing record data.");
    if (!actionId) throw new Error("Missing actionId in payload.");

    // Khởi tạo mảng đính kèm chung
    const attachments = [];
    try {
      const urlFiles = [record.url_hop_dong, record.url_de_nghi_xhd, record.url_files];
      urlFiles.forEach((url, index) => {
        if (url) {
          const b = UrlFetchApp.fetch(url).getBlob();
          // Đặt tên file theo loại
          const names = ["HDMB", "DNXHD", "BoSung"];
          b.setName(`${names[index] || "File"}_${record.so_don_hang}.pdf`);
          attachments.push(b);
        }
      });
    } catch (ex) {
      Logger.log("Chung Attachment error: " + ex.message);
    }

    let result = { success: false, message: 'Unknown email action.' };

    switch (actionId) {
      case 'invoice_issued':
        result = sendInvoiceEmailFromSupabase(record);
        break;

      case 'invoice_request_submitted':
        result = handleInvoiceRequestMail(record, attachments);
        break;

      case 'match_request_pending':
        const okPending = sendPendingEmail(record, new Date());
        result = { success: okPending };
        break;

      case 'match_success':
        const emailResult = sendEmailNotification(record, record.vin || '', '', new Date());
        result = { success: emailResult.success };
        break;
      
      case 'order_self_cancelled':
        const okCancel = sendCancelEmail(record, record.vin || 'N/A', new Date(), null, record.ghi_chu_huy || 'Hủy theo yêu cầu.');
        
        // Logic Xóa mạnh mẽ: Nếu xác định là Hủy Đơn hẳn (is_waiting = false/null/'Không')
        const isNotWaiting = (payload.is_waiting === false) || 
                             (payload.chờ_xe === false) || 
                             (String(payload.is_waiting).toLowerCase() === 'false') ||
                             (String(payload.is_waiting).toLowerCase() === 'không');

        if (isNotWaiting) {
          const deleteOk = deleteSupabase('donhang', `so_don_hang=eq.${record.so_don_hang}`);
          logAction("Tự động Xóa ĐH", `Đã xóa đơn ${record.so_don_hang} khỏi Supabase (Không chờ xe). Kết quả: ${deleteOk}`);
        }
        result = { success: okCancel };
        break;

      case 'invoice_supplement_requested':
        sendSupplementRequestEmail(record, record.ghi_chu_admin || 'Vui lòng bổ sung hồ sơ.');
        result = { success: true };
        break;

      case 'invoice_supplement_submitted':
        sendSupplementSubmittedEmail(record, record.files_info || 'Các tệp bổ sung', attachments);
        result = { success: true };
        break;
      
      // Xử lý Webhook tự động từ Database Supabase (Khi có thay đổi trực tiếp trên table)
      case 'supabase_webhook':
        // Webhook handles the actual logic in a separate function for cleanliness
        result = handleSupabaseWebhook(e);
        break;
    }

    return result;
  } catch (err) {
    logAction("Error", `Lỗi xử lý Robot: ${err.message}`);
    return { success: false, message: err.message };
  }
}

/**
 * Xử lý tín hiệu Webhook tự động từ Database Supabase (Zero Sheets Center)
 */
function handleSupabaseWebhook(e) {
  try {
    const payloadStr = e.postData ? e.postData.contents : null;
    if (!payloadStr) throw new Error("Missing payload");
    const payload = JSON.parse(payloadStr);
    
    // Supabase Webhook payload structure: { type: 'INSERT|UPDATE', record: {...}, old_record: {...} }
    const type = payload.type; 
    const record = payload.record || payload.new_record || payload.data;
    const oldRecord = payload.old_record;
    
    if (!record) return { success: true, message: "No record to process" };
    
    const orderNo = record.so_don_hang;
    const tableName = payload.table || payload.table_name || 'unknown';
    logAction("Webhook", `Nhận tín hiệu ${type} bảng ${tableName} cho Đơn: ${orderNo}`);

    // LOGIC 1: TỰ ĐỘNG XÓA KHI HỦY (Bảng donhang)
    if (tableName === 'donhang' && type === 'UPDATE' && record.ket_qua === 'Đã hủy') {
       const deleteOk = deleteSupabase('donhang', `so_don_hang=eq.${orderNo}`);
       logAction("Webhook Auto-Delete", `Đã xóa vĩnh viễn đơn ${orderNo}: ${deleteOk}`);
    }
    
    // LOGIC 2: TỰ ĐỘNG BỐC FILE SANG DRIVE (Bảng yeucauxhd)
    // Khi Admin duyệt đơn hoặc có link mới từ Supabase
    if (tableName === 'yeucauxhd' && (type === 'UPDATE' || type === 'INSERT')) {
       if ((record.url_hop_dong && record.url_hop_dong.includes("supabase.co") && !record.url_hop_dong.includes("drive.google.com")) ||
           (record.url_de_nghi_xhd && record.url_de_nghi_xhd.includes("supabase.co") && !record.url_de_nghi_xhd.includes("drive.google.com")) ||
           (record.url_hoa_don_da_xuat && record.url_hoa_don_da_xuat.includes("supabase.co") && !record.url_hoa_don_da_xuat.includes("drive.google.com"))) {
          
          logAction("Auto-Migration", `Tự động bốc hồ sơ Đơn ${orderNo} sang Drive...`);
          archiveOrderNow(orderNo);
       }
    }

    // LOGIC 4: ĐÃ CHUYỂN SANG FRONTEND GỌI TRỰC TIẾP QUA EDGE FUNCTION
    // (KHÔNG còn gửi mail hóa đơn từ webhook nữa để tránh gửi trùng)

    // LOGIC 3: TỰ ĐỘNG CẬP NHẬT SHEET KHI CÓ THAY ĐỔI TRÊN DATABASE
    const tablesToSyncNames = TABLES_TO_SYNC.map(function(t) { return t.table; });
    if (tablesToSyncNames.indexOf(tableName) !== -1) {
       logAction("Auto-Sync", `Tín hiệu ${type} bảng ${tableName} -> Đang cập nhật dòng thay đổi...`);
       syncOneRecordToSheet(tableName, record || oldRecord, type);
    }

    return { success: true };
  } catch (err) {
    logAction("Webhook Error", err.message);
    return { success: false, message: err.message };
  }
}

function handleInvoiceRequestMail(record, attachments) {
  const data = {
    ten_ban_hang: record.tvbh || record.ten_tu_van_ban_hang,
    ten_khach_hang: record.ten_khach_hang,
    so_don_hang: record.so_don_hang,
    vin: record.vin,
    attachments: attachments || []
  };
  const success = sendInvoiceRequestConfirmationEmailToTVBH(data);
  return { success: success };
}

function handleFetchSupabasePdfToDrive(e) {
  try {
    const orderNumber = e.parameter.orderNumber;
    if (!orderNumber) throw new Error("Missing orderNumber parameter");
    
    // Gọi hàm xử lý từ 04_maintenance.js
    const result = archiveOrderNow(orderNumber);
    return createJsonResponse({ status: "SUCCESS", result: result });
  } catch (err) {
    logAction("File Error", err.message);
    return createJsonResponse({ status: "ERROR", message: err.message });
  }
}

function createJsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Lấy dữ liệu từ một sheet dưới dạng JSON để kiểm tra (dành cho Python/Tools)
 */
function handleFetchSheetData(e) {
  try {
    const sheetName = e.parameter.sheetName || 'yeucauxhd';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error("Không tìm thấy sheet: " + sheetName);
    
    const data = sheet.getDataRange().getValues();
    if (data.length === 0) return createJsonResponse({ status: "SUCCESS", data: [] });
    
    const headers = data[0];
    const result = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = row[i];
      });
      return obj;
    });
    
    return createJsonResponse({ status: "SUCCESS", data: result, headers: headers });
  } catch (err) {
    return createJsonResponse({ status: "ERROR", message: err.message });
  }
}

/**
 * Xử lý thông báo khi hóa đơn được tải lên
 * 1. Di chuyển file từ Supabase sang Google Drive
 * 2. Gửi email thông báo cho TVBH
 */
function handleNotifyInvoiceUploaded(e) {
  try {
    const orderNo = e.parameter.orderNumber || e.parameter.orderNo;
    if (!orderNo) throw new Error("Thiếu mã đơn hàng.");

    logAction("Bulk Notify", `Đang xử lý hóa đơn cho đơn: ${orderNo}`);

    // 1. Di chuyển sang Drive
    archiveOrderNow(orderNo);

    // 2. Gửi email (Chỉ gửi nếu không yêu cầu skipEmail)
    // Lưu ý: e.parameter luôn là string "true" hoặc "false"
    const skipEmail = (e.parameter.skipEmail === "true");
    
    if (skipEmail) {
      logAction("Bulk Notify", `Bỏ qua gửi email theo yêu cầu (skipEmail=true) cho đơn: ${orderNo}`);
      return { status: "SUCCESS" };
    }

    const record = fetchSupabase('donhang', `so_don_hang=eq.${orderNo}`);
    if (record && record.length > 0) {
      sendInvoiceEmailFromSupabase(record[0]);
      return { status: "SUCCESS" };
    } else {
      return { status: "ERROR", message: "Không tìm thấy đơn hàng trên Supabase." };
    }
  } catch (err) {
    logAction("Notify Error", err.message);
    return { status: "ERROR", message: err.message };
  }
}

/**
 * Xử lý gửi lại email cho một hoặc nhiều đơn hàng
 */
function handleResendEmail(e) {
  try {
    const orderNumbersStr = e.parameter.orderNumbers || (e.postData ? JSON.parse(e.postData.contents).orderNumbers : null);
    const emailType = e.parameter.emailType || (e.postData ? JSON.parse(e.postData.contents).emailType : null);
    
    if (!orderNumbersStr) throw new Error("Thiếu danh sách số đơn hàng.");
    if (!emailType) throw new Error("Thiếu loại email cần gửi.");
    
    const orderNumbers = Array.isArray(orderNumbersStr) ? orderNumbersStr : JSON.parse(orderNumbersStr);
    
    let successCount = 0;
    let errors = [];

    for (const orderNo of orderNumbers) {
      try {
        const record = fetchSupabase('donhang', `so_don_hang=eq.${orderNo}`);
        if (record && record.length > 0) {
          // Giả lập payload cho handleSendSupabaseEmail
          const fakeE = {
            postData: {
              contents: JSON.stringify({
                actionId: emailType,
                record: record[0]
              })
            }
          };
          const res = handleSendSupabaseEmail(fakeE);
          if (res.success) {
            successCount++;
          } else {
            errors.push(`${orderNo}: ${res.message}`);
          }
        } else {
          errors.push(`${orderNo}: Không tìm thấy đơn hàng.`);
        }
      } catch (ex) {
        errors.push(`${orderNo}: ${ex.message}`);
      }
    }

    return { 
      status: successCount > 0 ? "SUCCESS" : "ERROR", 
      message: `Đã gửi lại thành công ${successCount}/${orderNumbers.length} email.` + (errors.length > 0 ? ` Lỗi: ${errors.join(', ')}` : "")
    };
  } catch (err) {
    logAction("Resend Error", err.message);
    return { status: "ERROR", message: err.message };
  }
}
