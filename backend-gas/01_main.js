/**
 * 01_main.js - Cổng nhận yêu cầu từ Supabase và WebApp
 */

function doPost(e) {
  const action = (e.parameter ? e.parameter.action : null) || 'default';
  const lock = LockService.getScriptLock();
  
  // Xác định các hành động không cần Lock
  const noLockActions = [
    'sendSupabaseEmail',
    'fetchSupabasePdfToDrive',
    'archiveOrderNow',
    'performOcr'
  ];

  const needsLock = !noLockActions.includes(action);
  if (needsLock) {
    if (!lock.tryLock(30000)) {
      return createJsonResponse({ status: "ERROR", message: "Hệ thống đang xử lý yêu cầu khác." });
    }
  }

  try {
    // Zero Sheets: All logging goes to 'Backend' sheet via logAction utility
    const actionName = (e.parameter ? e.parameter.action : action) || 'default';
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
    const payloadStr = e.parameter.payload || (e.postData ? e.postData.contents : null);
    if (!payloadStr) throw new Error("Missing payload");
    
    const payload = JSON.parse(payloadStr);
    const record = payload.record;
    const actionId = payload.actionId || 'invoice_issued';

    if (!record) throw new Error("Missing record data.");

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
    logAction("Webhook", `Nhận tín hiệu ${type} cho Đơn: ${orderNo}`);

    // LOGIC 1: TỰ ĐỘNG XÓA KHI HỦY
    if (type === 'UPDATE' && record.ket_qua === 'Đã hủy') {
       const deleteOk = deleteSupabase('donhang', `so_don_hang=eq.${orderNo}`);
       logAction("Webhook Auto-Delete", `Đã xóa vĩnh viễn đơn ${orderNo}: ${deleteOk}`);
    }
    
    // LOGIC 2: GỬI MAIL KHI CÓ THAY ĐỔI QUAN TRỌNG (Nếu Web App chưa gửi)
    // Ví dụ: Gửi mail Ghép xe thành công khi VIN được gán lần đầu
    if (type === 'UPDATE' && record.vin && !oldRecord?.vin) {
       // sendInvoiceEmailFromSupabase(record); // Optional: if frontend didn't call it
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

function createJsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
