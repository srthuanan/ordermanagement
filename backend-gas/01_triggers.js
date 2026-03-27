function doPost(e) {
  const action = (e.parameter ? e.parameter.action : null) || 'default';

  // === TỐI ƯU ĐĂNG NHẬP: Xử lý ngay lập tức không cần Lock, không cần mở Spreadsheet ===
  if (action === 'login') {
    try {
      // Import handleLogin if needed (it should be global)
      const loginResponse = handleLogin(e.parameter);
      return createJsonResponse(loginResponse);
    } catch (err) {
      return createJsonResponse({ success: false, message: "Lỗi xử lý đăng nhập: " + err.message });
    }
  }

  // Các tác vụ lấy dữ liệu (đọc) hoặc Chat không cần Lock (tránh tình trạng nghẽn cổ chai)
  const noLockActions = [
    'getChatMessages',
    'getPinnedMessages',
    'getAiSuggestion',
    'toggleChatVisibility',
    'toggleStockVisibility',
    'recordUserPresence',
    'sendSupabaseEmail', // Chỉ đọc và gửi mail
    'notifyInvoiceUploaded', // Có lock riêng rẽ bên trong
    'syncYeuCauXhd' // Sẽ tự bọc lock cẩn thận bên trong
  ];

  const needsLock = !noLockActions.includes(action);
  const lock = LockService.getScriptLock();

  if (needsLock) {
    if (!lock.tryLock(30000)) {
      return createJsonResponse({ status: "ERROR", message: "Hệ thống đang xử lý yêu cầu khác. Vui lòng thử lại sau giây lát. Action: " + action });
    }
  }

  let payload = null;
  if (e.postData && e.postData.contents) {
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (err) {
      Logger.log("Không thể parse JSON từ postData: " + err.message);
    }
  }

  try {
    // === JWT VERIFICATION ===
    const publicActions = [
      'forgotPassword', 'resetPassword', 'testEmail', 'sendSupabaseEmail', 'getRawUsers', 'getTeamData', 'syncYeuCauXhd',
      'getKhoXeData', 'getDaGhepData', 'getChuaGhepData', 'getXuathoadonData', 'setupTriggers', 'migrateHistory', 'fullSyncYeuCauXhd'
    ];

    if (!publicActions.includes(action)) {
      const token = e.parameter.token;
      if (!token) {
        if (needsLock) lock.releaseLock();
        return createJsonResponse({ status: "ERROR", message: "Unauthorized: Missing Token." }, 401);
      }
      const decoded = verifyJWT(token);
      if (!decoded) {
        if (needsLock) lock.releaseLock();
        return createJsonResponse({ status: "ERROR", message: "Unauthorized: Invalid or Expired Token. Vui lòng tải lại hoặc đăng nhập lại." }, 401);
      }
    }
    // ========================

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheets = getSheets(ss);
    const userSheet = ss.getSheetByName(USER_SHEET_NAME);

    // Xác định người dùng thực hiện hành động
    const user = e.parameter.updatedBy ||
      e.parameter.cancelledBy ||
      e.parameter.requestedBy ||
      e.parameter.uploadedBy ||
      e.parameter.ten_ban_hang ||
      e.parameter.username ||
      'Admin';

    let response;
    let message = "";
    Logger.log(`doPost action received: ${action} by ${user} with params: ${JSON.stringify(e.parameter)}`);

    switch (action) {
      case 'toggleChatVisibility':
        if (e.parameter.isAdmin !== 'true') {
          response = createJsonResponse({ status: "ERROR", message: "Unauthorized" });
        } else {
          const props = PropertiesService.getScriptProperties();
          const current = props.getProperty('CHAT_HIDDEN') === 'true';
          props.setProperty('CHAT_HIDDEN', (!current).toString());
          response = createJsonResponse({ status: "SUCCESS", isChatHidden: !current });
        }
        break;
      case 'toggleStockVisibility':
        if (e.parameter.isAdmin !== 'true') {
          response = createJsonResponse({ status: "ERROR", message: "Unauthorized" });
        } else {
          const props = PropertiesService.getScriptProperties();
          const current = props.getProperty('STOCK_HIDDEN') === 'true';
          const next = !current;
          props.setProperty('STOCK_HIDDEN', next.toString());

          // Tự động gửi thông báo cho toàn hệ thống
          const statusMsg = next ? "đã được TẠM ẨN để cập nhật dữ liệu" : "đã được HIỂN THỊ trở lại";
          addNotification(
            `Hệ thống: Kho xe ${statusMsg}. Vui lòng tải lại trang nếu cần thiết.`,
            next ? 'warning' : 'success',
            'stock',
            null,
            user,
            'ALL'
          );

          response = createJsonResponse({ status: "SUCCESS", isStockHidden: next });
        }
        break;
      // =================================================================
      // === CÁC CASE TỪ HÀM SỐ 1 (LOGIC NGHIỆP VỤ CHÍNH) ===
      // =================================================================
      case 'performOcr':
        response = handlePerformOcr(e);
        return response; // handlePerformOcr trả về response hoàn chỉnh
      case 'findAndAddCarByVin':
        message = findAndAddCarByVin(e.parameter.vin);
        response = createJsonResponse({ status: message.startsWith("Lỗi:") ? "ERROR" : "SUCCESS", message: message });
        break;
      case 'recordUserPresence':
        recordUserPresence(e.parameter.userEmail);
        response = createJsonResponse({ status: "SUCCESS" });
        break;
      case 'markNotificationAsRead':
        response = doReadWriteLock(() => handleMarkNotificationAsRead(e));
        break;
      case 'addDepositInfo':
        response = doReadWriteLock(() => handleAddDepositInfo(e));
        break;
      case 'requestVinClub':
        // THAY ĐỔI: Thêm sheets.mailSheet vào lời gọi hàm
        response = doReadWriteLock(() => handleRequestVinClub(e, sheets.mailSheet));
        break;
      case 'requestVinClubNotificationOnly':
        response = doReadWriteLock(() => {
          const { orderNumber, customerName, requestedBy, vin } = e.parameter;
          recordOrderHistory(orderNumber, vin, "Yêu cầu VinClub", `TVBH ${requestedBy} đã gửi yêu cầu cấp tài khoản VinClub (Supabase Sync).`);
          addNotification(`${requestedBy} đã gửi Y/C cấp VinClub cho ĐH ${orderNumber}.`, 'info', 'vc', orderNumber, requestedBy, 'ALL');
          const telegramMessage = `💳 <b>Yêu Cầu Cấp VinClub Mới (Supabase)</b>\n\n` +
            `👤 <b>TVBH:</b> ${requestedBy}\n` +
            `👨 <b>Khách hàng:</b> ${customerName}\n` +
            `📄 <b>SĐH:</b> <code>${orderNumber}</code>\n` +
            `🔢 <b>VIN:</b> <code>${vin}</code>\n\n` +
            `<b>Trạng thái:</b> Đã lưu Supabase - Chờ duyệt`;
          sendTelegramNotification(telegramMessage);
          return createJsonResponse({ status: "SUCCESS", message: "Notifications sent." });
        });
        break;
      case 'approveVcRequestNotificationOnly':
        response = doReadWriteLock(() => {
          const { orderNumber } = e.parameter;
          addNotification(`Admin đã phê duyệt Y/C VinClub cho ĐH ${orderNumber}.`, 'success', 'vc', orderNumber, 'Admin', 'ALL');
          sendTelegramNotification(`✅ <b>Phê Duyệt VinClub</b>\n\nĐơn hàng <code>${orderNumber}</code> đã được phê duyệt Yêu Cầu VC.`);
          return createJsonResponse({ status: "SUCCESS" });
        });
        break;
      case 'rejectVcRequestNotificationOnly':
        response = doReadWriteLock(() => {
          const { orderNumber, reason } = e.parameter;
          addNotification(`Admin đã từ chối Y/C VinClub cho ĐH ${orderNumber}. Lý do: ${reason}`, 'error', 'vc', orderNumber, 'Admin', 'ALL');
          sendTelegramNotification(`❌ <b>Từ Chối VinClub</b>\n\nĐơn hàng <code>${orderNumber}</code> bị từ chối Yêu Cầu VC.\n📝 Lý do: ${reason}`);
          return createJsonResponse({ status: "SUCCESS" });
        });
        break;
      case 'approveVcRequest':
        response = doReadWriteLock(() => handleVcRequestApproval(e.parameter.orderNumber, true, e.parameter.adminUser));
        break;
      case 'rejectVcRequest':
        response = doReadWriteLock(() => handleVcRequestApproval(e.parameter.orderNumber, false, e.parameter.adminUser, e.parameter.reason));
        break;
      case 'confirmVcUnc': // Frontend gọi là 'confirmVc' nhưng thực thi 'confirmVcUnc'
        response = doReadWriteLock(() => handleConfirmVcUnc(e));
        break;
      case 'deleteWaitingRequest':
        response = doReadWriteLock(() => handleDeleteWaitingRequest(e));
        break;
      case 'confirmVinClubVerification':
        response = doReadWriteLock(() => handleConfirmVinClubVerification(e));
        break;
      case 'addBatchDeposits':
        response = doReadWriteLock(() => handleAddBatchDeposits(e));
        break;
      case 'addWaitingRequest':
        response = doReadWriteLock(() => handleAddWaitingRequest(e));
        break;
      case 'updateWaitingRequestNote':
        response = doReadWriteLock(() => handleUpdateWaitingRequestNote(e));
        break;
      case 'addCarFromOcr':
        message = addCarToStockFromOcr(e.parameter);
        response = createJsonResponse({ status: message.startsWith("Lỗi:") ? "ERROR" : "SUCCESS", message: message });
        break;
      case 'deleteSupabaseFile':
        try {
          const serviceKey = PropertiesService.getScriptProperties().getProperty('SUPABASE_SERVICE_KEY');
          if (!serviceKey) throw new Error("Chưa cấu hình SUPABASE_SERVICE_KEY");
          const oldPath = e.parameter.filePath;
          if (oldPath) {
            _deleteFromSupabaseStorage(serviceKey, [oldPath]);
          }
          response = createJsonResponse({ status: "SUCCESS" });
        } catch (err) {
          response = createJsonResponse({ status: "ERROR", message: err.message });
        }
        break;
      case 'resendEmail': {
        let orderNo = e.parameter.orderNumber;
        if (!orderNo && e.parameter.orderNumbers) {
          try {
            const list = JSON.parse(e.parameter.orderNumbers);
            if (Array.isArray(list) && list.length > 0) orderNo = list[0];
          } catch (err) {
            Logger.log("Lỗi parse orderNumbers trong resendEmail: " + err.message);
          }
        }
        const resendResult = resendNotificationEmail(orderNo, e.parameter.emailType, user);
        response = createJsonResponse({
          status: resendResult.success ? "SUCCESS" : "ERROR",
          message: resendResult.message
        });
        break;
      }
      case 'revertOrderStatus':
        try {
          const result = revertOrderStatusByOrderNumber(e.parameter.orderNumber, user);
          response = createJsonResponse({ status: "SUCCESS", ...result });
        } catch (err) {
          response = createJsonResponse({ status: "ERROR", message: err.message });
        }
        break;
      case 'holdCar':
        try {
          const result = doReadWriteLock(() => holdCar(e.parameter.vin, user));
          response = createJsonResponse(result);
        } catch (err) {
          response = createJsonResponse({ status: "ERROR", message: err.message });
        }
        break;
      case 'releaseCar':
        try {
          const result = doReadWriteLock(() => releaseCar(e.parameter.vin, user));
          response = createJsonResponse(result);
        } catch (err) {
          response = createJsonResponse({ status: "ERROR", message: err.message });
        }
        break;

      // --- KHU VỰC CẬP NHẬT (từ hàm 1) ---
      case 'markAsPendingSignature':
        try {
          const actionId = e.parameter.actionId;
          if (e.parameter.orderNumbers) {
            const orderNumbers = JSON.parse(e.parameter.orderNumbers);
            let successCount = 0;
            let errorCount = 0;
            let errorMessages = [];
            orderNumbers.forEach(orderNumber => {
              try {
                const result = handleMarkAsPendingSignature(orderNumber, user, `${actionId}-${orderNumber}`);
                if (result.success && result.tvbhName) {
                  addNotification(`Admin đã chuyển ĐH ${orderNumber} sang "Chờ ký hóa đơn".`, 'info', 'xuatHoaDon', orderNumber, user, result.tvbhName);
                }
                successCount++;
              } catch (err) {
                errorCount++;
                errorMessages.push(`ĐH ${orderNumber}: ${err.message}`);
              }
            });
            let summaryMessage = `Hoàn tất. Chuyển trạng thái thành công: ${successCount}. Thất bại: ${errorCount}.`;
            if (errorCount > 0) {
              summaryMessage += `\nChi tiết lỗi:\n` + errorMessages.join('\n');
            }
            response = createJsonResponse({ status: "SUCCESS", message: summaryMessage });
          } else {
            const result = handleMarkAsPendingSignature(e.parameter.orderNumber, user, actionId);
            if (result.success && result.tvbhName) {
              addNotification(`Admin đã chuyển ĐH ${e.parameter.orderNumber} sang "Chờ ký hóa đơn".`, 'info', 'xuatHoaDon', e.parameter.orderNumber, user, result.tvbhName);
            }
            response = createJsonResponse({ status: "SUCCESS", message: result.message });
          }
        } catch (err) {
          response = createJsonResponse({ status: "ERROR", message: err.message });
        }
        break;
      case 'approveSelectedInvoiceRequest':
        if (e.parameter.orderNumbers) {
          const orderNumbers = JSON.parse(e.parameter.orderNumbers);
          let successCount = 0;
          let errorCount = 0;

          orderNumbers.forEach(orderNumber => {
            const resultJson = handleApproveRequestFromWebApp(orderNumber, `${e.parameter.actionId}-${orderNumber}`);
            const result = JSON.parse(resultJson.getContent());
            if (result.status === "SUCCESS") {
              successCount++;
            } else {
              errorCount++;
            }
          });
          const message = `Phê duyệt hàng loạt hoàn tất. Thành công: ${successCount}, Thất bại: ${errorCount}.`;
          response = createJsonResponse({ status: "SUCCESS", message: message });
        } else {
          response = handleApproveRequestFromWebApp(e.parameter.orderNumber, e.parameter.actionId);
        }
        break;
      case 'requestSupplementForInvoice':
        if (e.parameter.orderNumbers) {
          const orderNumbers = JSON.parse(e.parameter.orderNumbers);
          const reason = e.parameter.reason;
          const imagesBase64Json = e.parameter.pastedImagesBase64 || null;

          let successCount = 0;
          let errorCount = 0;
          orderNumbers.forEach(orderNumber => {
            const resultJson = handleRequestSupplementFromWebApp(orderNumber, reason, sheets, imagesBase64Json, `${e.parameter.actionId}-${orderNumber}`);
            const result = JSON.parse(resultJson.getContent());
            if (result.status === "SUCCESS") {
              successCount++;
            } else {
              errorCount++;
            }
          });
          const message = `Y/C bổ sung hàng loạt hoàn tất. Thành công: ${successCount}, Thất bại: ${errorCount}.`;
          response = createJsonResponse({ status: "SUCCESS", message: message });
        } else {
          const imagesBase64Json = e.parameter.pastedImagesBase64 || null;
          response = handleRequestSupplementFromWebApp(e.parameter.orderNumber, e.parameter.reason, sheets, imagesBase64Json, e.parameter.actionId);
        }
        break;
      // --- KẾT THÚC KHU VỰC CẬP NHẬT ---

      case 'cancelRequest':
        if (e.parameter.orderNumbers) {
          const orderNumbers = JSON.parse(e.parameter.orderNumbers);
          const reason = e.parameter.reason;
          let successCount = 0;
          let errorCount = 0;
          orderNumbers.forEach(orderNumber => {
            const e_simulated = {
              parameter: {
                orderNumber: orderNumber,
                reason: reason,
                cancelledBy: user
              }
            };
            const cancelResult = handleCancelRequest(e_simulated, sheets);
            if (cancelResult.success) {
              successCount++;
              sendCancelEmail(sheets.mailSheet, cancelResult.emailData, cancelResult.vin, new Date(), user, cancelResult.reason);
              const tvbhName = cancelResult.emailData.ten_ban_hang;
              addNotification(`Đơn hàng ${cancelResult.orderNumber} đã bị hủy bởi ${user}.`, 'danger', 'huyGhep', cancelResult.orderNumber, user, tvbhName);
            } else {
              errorCount++;
            }
          });
          const message = `Hủy hàng loạt hoàn tất. Thành công: ${successCount}, Thất bại: ${errorCount}.`;
          response = createJsonResponse({ status: "SUCCESS", message: message });
        } else {
          const cancelResult = handleCancelRequest(e, sheets);
          if (cancelResult.success) {
            sendCancelEmail(sheets.mailSheet, cancelResult.emailData, cancelResult.vin, new Date(), user, cancelResult.reason);
            const tvbhName = cancelResult.emailData.ten_ban_hang;
            addNotification(`Đơn hàng ${cancelResult.orderNumber} đã bị hủy bởi ${user}.`, 'danger', 'huyGhep', cancelResult.orderNumber, user, tvbhName);
            response = createJsonResponse({ status: "SUCCESS", message: cancelResult.message });
          } else {
            response = createJsonResponse({ status: "ERROR", message: cancelResult.message });
          }
        }
        break;
      case 'manualMatchCar':
      case 'pairVin':
        message = manualMatchCar(e.parameter.orderNumber, e.parameter.vin);
        if (typeof message === 'object' && message.status === 'ERROR') {
          response = createJsonResponse(message);
        } else {
          const orderDetails = findRowByKeyValue(sheets.daGhepSheet, "Số đơn hàng", e.parameter.orderNumber);
          const tvbhName = orderDetails ? orderDetails["Tên tư vấn bán hàng"] : null;
          addNotification(`Đơn hàng ${e.parameter.orderNumber} đã được ghép thủ công với xe ${e.parameter.vin} bởi ${user}.`, 'success', 'daGhep', e.parameter.orderNumber, user, tvbhName);
          response = createJsonResponse({ status: "SUCCESS", message: message });
        }
        break;
      case 'importCarsFromExcel':
        const importResult = doReadWriteLock(() => {
          return importCarsFromExcelLogic(e.parameter.carData, e.parameter.importedBy);
        });
        response = createJsonResponse(importResult);
        break;
      case 'unmatchOrder':
        const unmatchResult = unmatchOrder(e.parameter.orderNumber, e.parameter.reason, user);
        if (unmatchResult.success) {
          sendUnmatchNotificationEmail(sheets.mailSheet, unmatchResult.emailData, unmatchResult.vin, unmatchResult.reason, user);
          const tvbhName = unmatchResult.emailData.ten_ban_hang;
          addNotification(`Đơn hàng ${e.parameter.orderNumber} đã được hủy ghép và chuyển về hàng chờ bởi ${user}.`, 'warning', 'chuaGhep', e.parameter.orderNumber, user, tvbhName);
          response = createJsonResponse({ status: "SUCCESS", message: unmatchResult.message });
        } else {
          response = createJsonResponse({ status: "ERROR", message: unmatchResult.message });
        }
        break;
      case 'deleteOrderLogic':
        message = deleteOrderLogic(e.parameter.orderNumber, user);
        if (!message.startsWith("Không tìm thấy")) addNotification(`Đơn hàng ${e.parameter.orderNumber} đã bị xóa vĩnh viễn bởi ${user}.`, 'danger', 'huyGhep', e.parameter.orderNumber, user);
        response = createJsonResponse({ status: message.startsWith("Không tìm thấy") ? "ERROR" : "SUCCESS", message: message });
        break;
      case 'deleteCarFromStockLogic':
        message = deleteCarFromStockLogic(e.parameter.vinToDelete, e.parameter.reason);
        response = createJsonResponse({ status: message.startsWith("Lỗi:") ? "ERROR" : "SUCCESS", message: message });
        if (!message.startsWith("Lỗi:")) {
          addNotification(`Xe VIN ${e.parameter.vinToDelete} đã bị xóa khỏi kho bởi ${user}.`, 'danger', 'khoXe', e.parameter.vinToDelete, user);
        }
        break;
      case 'restoreCarToStockLogic':
        message = restoreCarToStockLogic(e.parameter.vinToRestore);
        response = createJsonResponse({ status: message.startsWith("Lỗi:") ? "ERROR" : "SUCCESS", message: message });
        if (!message.startsWith("Lỗi:")) {
          addNotification(`Xe VIN ${e.parameter.vinToRestore} đã được phục hồi vào kho bởi ${user}.`, 'success', 'khoXe', e.parameter.vinToRestore, user);
        }
        break;
      case 'updateRowData':
        try {
          const updateResult = handleUpdateRowData(e.parameter, user);
          response = createJsonResponse({ status: "SUCCESS", message: updateResult.message });
        } catch (err) {
          response = createJsonResponse({ status: "ERROR", message: err.message });
        }
        break;
      case 'updateOrderDetails':
        try {
          // Chúng ta sẽ tạo hàm handleUpdateOrderDetails ở bước 2
          const result = doReadWriteLock(() => handleUpdateOrderDetails(e, sheets, user));
          response = createJsonResponse(result);
        } catch (err) {
          response = createJsonResponse({ status: "ERROR", message: err.message });
        }
        break;
      case 'requestInvoice':
        response = handleRequestInvoice(e, sheets.daGhepSheet, sheets.mailSheet, sheets.xuathoadonSheet, sheets.thongtinxeSheet, sheets.stockSheet);
        break;
      case 'updateInvoiceFiles':
        response = handleUpdateInvoiceFiles(e);
        if (response && JSON.parse(response.getContent()).status === "SUCCESS") {
          const orderNumber = e.parameter.orderNumber;
          const tvbhName = user;
          const adminMessage = `Bạn vừa bổ sung hồ sơ cho ĐH ${orderNumber}.`;
          addNotification(adminMessage, 'info', 'xuatHoaDon', orderNumber, tvbhName, tvbhName);
        }
        break;
      case 'addRequest':
        response = handleAddRequest(e, sheets.chuaGhepSheet, sheets.daGhepSheet, sheets.stockSheet, sheets.mailSheet);
        if (response && JSON.parse(response.getContent()).status === "SUCCESS") {
          const result = JSON.parse(response.getContent());
          const newRecord = result.newRecord || {};
          const orderNum = newRecord["Số đơn hàng"] || "không rõ";
          const targetView = newRecord["Kết quả"] === "Đã ghép" ? "daGhep" : "chuaGhep";
          const messageText = newRecord["Kết quả"] === "Đã ghép"
            ?
            `Bạn đã tạo YC và đã ghép thành công cho ĐH ${orderNum}.`
            : `Bạn đã tạo YC và đang chờ ghép cho ĐH ${orderNum}.`;
          const messageType = newRecord["Kết quả"] === "Đã ghép" ? "success" : "info";
          addNotification(messageText, messageType, targetView, orderNum, user, user);
        }
        break;
      case 'addBulkRequests':
        response = handleAddBulkRequests(e, sheets.chuaGhepSheet, sheets.daGhepSheet, sheets.stockSheet, sheets.mailSheet);
        if (response && JSON.parse(response.getContent()).status === "SUCCESS") {
          const result = JSON.parse(response.getContent());
          addNotification(result.message, 'info', 'chuaGhep', null, user, user);
        }
        break;
      case 'handleBulkUploadIssuedInvoices':
        response = handleBulkUploadIssuedInvoices(e);
        break;
      case 'notifyInvoiceUploaded':
        response = handleNotifyInvoiceUploaded(e);
        break;
      case 'uploadIssuedInvoice':
        response = handleUploadIssuedInvoice(e);
        break;
      case 'markAllNotificationsAsRead':
        response = markAllNotificationsAsRead(e);
        break;
      case 'getAiSuggestion':
        try {
          const { orderData, customPrompt } = e.parameter;
          if (!orderData || !customPrompt) {
            throw new Error("Dữ liệu đơn hàng hoặc yêu cầu tự do không được cung cấp.");
          }
          const order = JSON.parse(orderData);
          const finalPrompt = `
            Bối cảnh: Bạn là một trợ lý ảo cho một showroom ô tô VinFast.
            Nhiệm vụ: Dựa vào dữ liệu đơn hàng dưới đây và yêu cầu từ người dùng, hãy đưa ra một câu trả lời chuyên nghiệp, chi tiết và phù hợp.
            Dữ liệu đơn hàng (định dạng JSON):
            ${JSON.stringify(order, null, 2)}
            Yêu cầu từ người dùng:
            "${customPrompt}"
            Câu trả lời của bạn:
          `;
          const suggestion = callGeminiAPI(finalPrompt);
          response = createJsonResponse({ status: "SUCCESS", suggestion: suggestion });
        } catch (err) {
          response = createJsonResponse({ status: "ERROR", message: err.message });
        }
        break;
      case 'getGlobalAiResponse':
        try {
          const userPrompt = e.parameter.userPrompt;
          const pageContext = e.parameter.pageContext;
          if (!userPrompt) {
            throw new Error("Không có câu hỏi nào được cung cấp.");
          }
          const finalPrompt = `
            BỐI CẢNH: Bạn là một trợ lý ảo thông minh và hữu ích cho nhân viên của showroom VinFast Thuận An.
            NHIỆM VỤ: Dựa vào NỘI DUNG CỦA TRANG WEB được cung cấp dưới đây, hãy trả lời câu hỏi của người dùng một cách chính xác, ngắn gọn và thân thiện.
            Không tự bịa ra thông tin không có trong văn bản.
            --- NỘI DUNG CỦA TRANG WEB ---
            ${pageContext || "Không có ngữ cảnh trang web."}
            --- HẾT NỘI DUNG ---

            CÂU HỎI CỦA NGƯỜI DÙNG:
            "${userPrompt}"

            CÂU TRẢ LỜI CỦA BẠN:
          `;
          const suggestion = callGeminiAPI(finalPrompt);
          // Hàm này trả về text thuần, không phải JSON
          response = ContentService.createTextOutput(suggestion);
        } catch (err) {
          // Hàm này trả về text thuần, không phải JSON
          response = ContentService.createTextOutput(`Xin lỗi, đã có lỗi xảy ra: ${err.message}`);
        }
        break;
      case 'revertLastAction':
        try {
          const result = revertLastActionById(e.parameter.actionId, user);
          response = createJsonResponse({ status: "SUCCESS", message: result.message });
        } catch (err) {
          response = createJsonResponse({ status: "ERROR", message: err.message });
        }
        break;

      // =================================================================
      // === CÁC CASE ĐƯỢC GHÉP TỪ HÀM SỐ 2 (AUTH, LÁI THỬ) ===
      // =================================================================
      // Lưu ý: Chúng ta dùng createJsonResponse để gói kết quả trả về
      // từ các hàm handler này, để phù hợp với logic của hàm 1.
      case 'getRawUsers': {
        const data = userSheet.getDataRange().getValues();
        let users = [];
        for (let i = 1; i < data.length; i++) {
          users.push({
            username: data[i][0] ? String(data[i][0]).toLowerCase().trim() : '',
            password_hash: data[i][1] ? String(data[i][1]) : '',
            full_name: data[i][2] ? String(data[i][2]) : '',
            role: data[i][3] ? String(data[i][3]) : 'Tư vấn bán hàng',
            email: data[i][4] ? String(data[i][4]) : null
          });
        }
        response = createJsonResponse({ users: users.filter(u => u.username) });
        break;
      }
      case 'login':
        response = createJsonResponse(handleLogin(e.parameter, userSheet));
        break;
      case 'addUser':
        response = createJsonResponse(handleAddNewUserAndSendMail(e.parameter, userSheet));
        break;
      case 'changePassword':
        response = createJsonResponse(handleChangePassword(e.parameter, userSheet));
        break;
      case 'forgotPassword':
        response = createJsonResponse(handleForgotPassword(e.parameter, userSheet));
        break;
      case 'resetPassword':
        response = createJsonResponse(handleResetPassword(e.parameter, userSheet));
        break;
      case 'updateTeams':
        response = createJsonResponse(handleUpdateTeams(e.parameter));
        break;
      case 'saveTestDriveBooking':
        response = createJsonResponse(handleSaveTestDriveBooking(e.parameter));
        break;
      case 'submitTestDriveCheckin':
        response = createJsonResponse(handleUpdateTestDriveCheckin(e.parameter));
        break;
      case 'deleteTestDriveBooking':
        response = createJsonResponse(handleDeleteTestDriveRequest(e.parameter));
        break;
      case 'addTestDriveImages':
        response = createJsonResponse(handleAddTestDriveImages(e.parameter));
        break;
      case 'testEmail':
        try {
          testSendEmail(e.parameter.email);
          response = createJsonResponse({ status: "SUCCESS", message: "Đã gửi mail test thành công" });
        } catch (err) {
          response = createJsonResponse({ status: "ERROR", message: err.message });
        }
        break;

      case 'updateGlobalNotification':
        response = updateGlobalNotification(e.parameter);
        break;

      case 'addChatMessage':
        try {
          response = createJsonResponse(handleAddChatMessage(e.parameter, user, e.parameter.userRole));
        } catch (err) {
          response = createJsonResponse({ status: "ERROR", message: err.message });
        }
        break;

      case 'markChatAsRead':
        try {
          response = createJsonResponse(handleMarkChatAsRead(user));
        } catch (err) {
          response = createJsonResponse({ status: "ERROR", message: err.message });
        }
        break;

      case 'toggleMessageReaction':
        try {
          response = createJsonResponse(handleToggleMessageReaction(e.parameter, user));
        } catch (err) {
          response = createJsonResponse({ status: "ERROR", message: err.message });
        }
        break;

      case 'getYeuCauVcData':
        response = getYeuCauVcData();
        break;

      case 'revokeChatMessage':
        try {
          response = createJsonResponse(handleRevokeChatMessage(e.parameter, user));
        } catch (err) {
          response = createJsonResponse({ status: "ERROR", message: err.message });
        }
        break;

      case 'uploadChatFile':
        try {
          response = createJsonResponse(handleUploadChatFile(e.parameter, user));
        } catch (err) {
          response = createJsonResponse({ status: "ERROR", message: err.message });
        }
        break;

      case 'togglePinMessage':
        try {
          response = createJsonResponse(handleTogglePinMessage(e.parameter, user));
        } catch (err) {
          response = createJsonResponse({ status: "ERROR", message: err.message });
        }
        break;

      case 'getPinnedMessages':
        try {
          response = createJsonResponse(handleGetPinnedMessages());
        } catch (err) {
          response = createJsonResponse({ status: "ERROR", message: err.message });
        }
        break;

      // =================================================================
      // === CASE MẶC ĐỊNH ===
      // =================================================================
      case 'sendSupabaseEmail':
        try {
          // Lấy từ e.parameter.payload (frontend axios) hoặc e.postData.contents (webhook)
          const payloadStr = e.parameter.payload || (e.postData ? e.postData.contents : null);
          if (!payloadStr) throw new Error("Missing payload for sendSupabaseEmail");
          
          const payload = JSON.parse(payloadStr);
          const record = payload.record;        // row mới (NEW)
          const oldRecord = payload.old_record; // row cũ (OLD) nếu là UPDATE
          // Hỗ trợ cả 2 params: emailType (cũ) và actionId (mới)
          const emailType = payload.actionId || payload.emailType || 'invoice_issued';

          if (!record) throw new Error("Không có dữ liệu record.");

          const ss = SpreadsheetApp.getActiveSpreadsheet();
          const emailSheets = getSheets(ss);
          const mailSheet = emailSheets.mailSheet;
          let result = { success: false, message: 'Loại email không được xử lý.' };

          switch (emailType) {

            // --- XUẤT HÓA ĐƠN (donhang.ket_qua = 'Đã xuất hóa đơn') ---
            case 'invoice_issued':
              result = sendInvoiceEmailFromSupabase(record);
              break;

            // --- TVBH NỘP Y/C XUẤT HĐ (yeucauxhd INSERT) ---
            case 'invoice_request_submitted': {
              const attachments = [];
              try {
                if (record.url_hop_dong) {
                  const blob = UrlFetchApp.fetch(record.url_hop_dong).getBlob();
                  blob.setName("HopDongMuaBan_" + record.so_don_hang + ".pdf");
                  attachments.push(blob);
                }
                if (record.url_de_nghi_xhd) {
                  const blob = UrlFetchApp.fetch(record.url_de_nghi_xhd).getBlob();
                  blob.setName("DeNghiXuatHoaDon_" + record.so_don_hang + ".pdf");
                  attachments.push(blob);
                }
              } catch (fError) {
                Logger.log("Không thể tải file đính kèm từ Supabase: " + fError.message);
              }

              const data = {
                ten_ban_hang: record.ten_tu_van_ban_hang || record.tvbh,
                ten_khach_hang: record.ten_khach_hang,
                so_don_hang: record.so_don_hang,
                vin: record.vin,
                policy: record.chinh_sach || '',
                commission: record.hoa_hong_ung || '',
                vpoint: record.vpoint || '', // Đã sửa từ diem_vpoint thành vpoint
                attachments: attachments
              };
              const ok = sendInvoiceRequestConfirmationEmailToTVBH(mailSheet, data);
              result = { success: ok, message: ok ? 'Đã gửi mail xác nhận Y/C XHĐ kèm file.' : 'Lỗi gửi mail.' };
              break;
            }

            // --- TVBH NỘP Y/C GHÉP XE - CHỜ GHÉP (donhang INSERT, ket_qua = 'Chưa ghép') ---
            case 'match_request_pending': {
              const data = {
                ten_ban_hang: record.ten_tu_van_ban_hang || record.ten_ban_hang,
                ten_khach_hang: record.ten_khach_hang,
                so_don_hang: record.so_don_hang,
                dong_xe: record.dong_xe,
                phien_ban: record.phien_ban,
                ngoai_that: record.ngoai_that,
                noi_that: record.noi_that,
                ngay_coc: record.ngay_coc,
                thoi_gian_nhap: record.thoi_gian_nhap,
              };
              const ok = sendPendingEmail(mailSheet, data, new Date());
              result = { success: ok, message: ok ? 'Đã gửi mail xác nhận tiếp nhận Y/C ghép xe.' : 'Lỗi gửi mail.' };
              break;
            }

            // --- GHÉP XE THÀNH CÔNG (donhang INSERT auto-match HOẶC UPDATE ket_qua = 'Đã ghép') ---
            case 'match_success': {
              const data = {
                ten_ban_hang: record.ten_tu_van_ban_hang || record.ten_ban_hang,
                ten_khach_hang: record.ten_khach_hang,
                so_don_hang: record.so_don_hang,
                dong_xe: record.dong_xe,
                phien_ban: record.phien_ban,
                ngoai_that: record.ngoai_that,
                noi_that: record.noi_that,
                ngay_coc: record.ngay_coc,
              };
              const vin = record.vin || '';
              const emailResult = sendEmailNotification(mailSheet, data, vin, '', new Date());
              result = { success: emailResult.success, message: emailResult.success ? 'Đã gửi mail ghép xe thành công.' : 'Lỗi gửi mail.' };
              break;
            }

            // --- TVBH TỰ HỦY ĐƠN HÀNG (donhang UPDATE ket_qua = 'Đã hủy') ---
            case 'order_self_cancelled': {
              const data = {
                ten_ban_hang: record.ten_tu_van_ban_hang || record.ten_ban_hang,
                ten_khach_hang: record.ten_khach_hang,
                so_don_hang: record.so_don_hang,
                dong_xe: record.dong_xe,
              };
              const vin = record.vin || 'N/A';
              const cancelledBy = null; // Không có người hủy bên ngoài — TVBH tự hủy
              const reason = record.ghi_chu_huy || 'Không có lý do.';
              const ok = sendCancelEmail(mailSheet, data, vin, new Date(), cancelledBy, reason);
              result = { success: ok, message: ok ? 'Đã gửi mail thông báo hủy đơn.' : 'Lỗi gửi mail.' };
              break;
            }

            // NOTE: 'invoice_request_approved' đã bị xóa theo yêu cầu
            // Admin phê duyệt Y/C XHĐ KHÔNG gửi mail cho TVBH

            // --- ADMIN YÊU CẦU BỔ SUNG (yeucauxhd UPDATE trang_thai = 'Cần bổ sung') ---
            case 'invoice_supplement_requested': {
              const data = {
                ten_ban_hang: record.ten_tu_van_ban_hang || record.tvbh,
                ten_khach_hang: record.ten_khach_hang,
                so_don_hang: record.so_don_hang,
                vin: record.vin,
              };
              const reason = record.ghi_chu_admin || 'Vui lòng liên hệ Admin để biết thêm chi tiết.';
              sendSupplementRequestEmail(mailSheet, data, reason);
              result = { success: true };
              break;
            }

            // --- TVBH BỔ SUNG HỒ SƠ THÀNH CÔNG (Gửi Biên Nhân cho TVBH) ---
            case 'invoice_supplement_submitted': {
              const data = {
                ten_ban_hang: record.ten_tu_van_ban_hang || record.tvbh,
                ten_khach_hang: record.ten_khach_hang,
                so_don_hang: record.so_don_hang,
                vin: record.vin,
              };
              
              const attachments = [];
              try {
                if (record.url_hop_dong) {
                  const blob = UrlFetchApp.fetch(record.url_hop_dong).getBlob();
                  blob.setName("BoSung_HD_" + record.so_don_hang + ".pdf");
                  attachments.push(blob);
                }
                if (record.url_de_nghi_xhd) {
                  const blob = UrlFetchApp.fetch(record.url_de_nghi_xhd).getBlob();
                  blob.setName("BoSung_DNXHD_" + record.so_don_hang + ".pdf");
                  attachments.push(blob);
                }
              } catch (fError) {
                Logger.log("Không thể tải file bổ sung: " + fError.message);
              }

              const filesInfo = record.filesInfo || 'Các tệp bổ sung';
              sendSupplementSubmittedEmail(mailSheet, data, filesInfo, attachments);
              result = { success: true };
              break;
            }

            // --- ADMIN HỦY Y/C XHĐ (yeucauxhd UPDATE trang_thai = 'Đã hủy') ---
            case 'invoice_request_cancelled': {
              const data = {
                ten_ban_hang: record.ten_tu_van_ban_hang || record.tvbh,
                ten_khach_hang: record.ten_khach_hang,
                so_don_hang: record.so_don_hang,
                vin: record.vin,
              };
              const reason = record.ghi_chu_admin || 'Không có lý do.';
              const details = {
                'Số đơn hàng': `<b>${data.so_don_hang}</b>`,
                'Tên khách hàng': `<b>${data.ten_khach_hang}</b>`,
                'Lý do hủy': `<b style="color: red;">${reason}</b>`
              };
              const note = 'Vui lòng liên hệ Admin để biết thêm thông tin hoặc tạo lại yêu cầu.';
              const body = createUnifiedEmailBody('Yêu cầu xuất hóa đơn đã bị hủy.', data.ten_ban_hang, details, note, 'warning');
              const html = createFullHtmlEmail(`[HỦY] Y/C XHĐ cho ĐH ${data.so_don_hang}`, body);
              const recipientEmail = getEmailForAdvisor(mailSheet, data.ten_ban_hang);
              if (recipientEmail) {
                sendEmailViaEdge({ to: recipientEmail, subject: `[HỦY] Y/C XHĐ cho ĐH ${data.so_don_hang}`, htmlBody: html });
                result = { success: true };
              } else {
                result = { success: false, message: 'Không tìm thấy email TVBH.' };
              }
              break;
            }

            // NOTE: 'invoice_pending_signature' đã bị xóa theo yêu cầu
            // Admin chuyển 'Chờ ký hóa đơn' KHÔNG gửi mail cho TVBH

            // --- XE MỚI VÀO KHO (khoxe INSERT) ---
            case 'new_car_arrived': {
              sendNewCarNotifications();
              result = { success: true };
              break;
            }

            default:
              result = { success: false, message: `emailType="${emailType}" chưa được hỗ trợ.` };
              break;
          }

          logAction(`sendSupabaseEmail [${emailType}]`,
            result.success ? `Xử lý thành công cho đơn ${record.so_don_hang || record.so_don || 'N/A'}` : result.message
          );
          response = createJsonResponse({ status: result.success ? "SUCCESS" : "ERROR", message: result.message });
        } catch (err) {
          Logger.log(`Lỗi sendSupabaseEmail: ${err.message}`);
          response = createJsonResponse({ status: "ERROR", message: err.message });
        }
        break;


      case 'syncYeuCauXhd':
        try {
          // payload có thể lấy từ e.parameter.payload (thủ công) hoặc e.postData (Supabase Webhook)
          const finalPayload = payload || (e.parameter.payload ? JSON.parse(e.parameter.payload) : null);

          if (!finalPayload) throw new Error("Thiếu dữ liệu payload (webhook payload null)");

          const syncResult = doReadWriteLock(() => handleSyncYeuCauXhd(finalPayload));
          response = createJsonResponse({ status: "SUCCESS", ...syncResult });
        } catch (err) {
          Logger.log(`Lỗi syncYeuCauXhd: ${err.message}`);
          response = createJsonResponse({ status: "ERROR", message: err.message });
        }
        break;

      case 'getTeamData':
        response = createJsonResponse(handleGetTeamData());
        break;
      case 'setupTriggers':
        try {
          setupArchiveInvoicedOrdersTrigger();
          setupAutoReleaseTrigger(); // Thêm trigger nhả xe quá hạn
          setupAlwaysCorrectSync();   // Thêm trigger đồng bộ 1 phút
          response = createJsonResponse({ status: "SUCCESS", message: "Đã kích hoạt toàn bộ trigger (Lưu trữ, Nhả xe quá hạn, Đồng bộ trạng thái) thành công." });
        } catch (err) {
          response = createJsonResponse({ status: "ERROR", message: "Lỗi kích hoạt trigger: " + err.message });
        }
        break;
      case 'migrateHistory':
        try {
          const resultMsg = migrateHistoricalDataToSql();
          response = createJsonResponse({ status: "SUCCESS", message: resultMsg });
        } catch (err) {
          response = createJsonResponse({ status: "ERROR", message: "Lỗi đồng bộ lịch sử: " + err.message });
        }
        break;
      case 'fullSyncYeuCauXhd':
        try {
          const resultMsg = fullSyncYeuCauXhd();
          response = createJsonResponse({ status: "SUCCESS", message: resultMsg });
        } catch (err) {
          response = createJsonResponse({ status: "ERROR", message: "Lỗi đồng bộ đầy đủ: " + err.message });
        }
        break;
      default:
        response = createJsonResponse({ status: "ERROR", message: `Hành động không hợp lệ: ${action}` });
        break;
    }

    // Logic tăng phiên bản dữ liệu từ hàm 1
    // Áp dụng cho tất cả các case (kể cả các case mới ghép)
    // Ngoại trừ các hàm 'get' đặc biệt không làm thay đổi dữ liệu
    if (response && action !== 'getAiSuggestion' && action !== 'getGlobalAiResponse') {
      try {
        const responseObject = JSON.parse(response.getContent());
        if (responseObject.status === "SUCCESS") {
          incrementDataVersion();
        }
      } catch (parseError) {
        // Lỗi nếu response không phải là JSON (ví dụ: getGlobalAiResponse trả về text)
        // Không cần làm gì ở đây, vì chúng ta đã loại trừ nó ở trên
        Logger.log(`Không thể parse JSON hoặc không cần tăng version cho action: ${action}`);
      }
    }

    return response;

  } catch (error) {
    Logger.log(`Lỗi nghiêm trọng trong doPost: ${error.message}, Stack: ${error.stack}`);
    sendErrorAlert('doPost', error);
    return createJsonResponse({ status: "ERROR", message: `Lỗi máy chủ: ${error.message}` });
  } finally {
    if (needsLock) {
      lock.releaseLock();
    }
  }
}



/**
 * BƯỚC 3: Chạy hàm này để tạo tài khoản Admin ban đầu.
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    const currentUser = e.parameter.currentUser;
    const isAdmin = e.parameter.isAdmin === 'true';

    // === JWT VERIFICATION ===
    const publicGetActions = [
      'getVersion', 'getChatVisibility', 'getStockVisibility', 'getTeamData',
      'getKhoXeData', 'getDaGhepData', 'getChuaGhepData', 'getXuathoadonData'
    ];

    if (action && !publicGetActions.includes(action)) {
      const token = e.parameter.token;
      if (!token) {
        return createJsonResponse({ status: "ERROR", message: "Unauthorized: Missing Token." }, 401);
      }
      const decoded = verifyJWT(token);
      if (!decoded) {
        return createJsonResponse({ status: "ERROR", message: "Unauthorized: Invalid or Expired Token. Vui lòng tải lại hoặc đăng nhập lại." }, 401);
      }
    }
    // ========================

    // ================= BẮT ĐẦU SỬA LỖI =================
    // Thêm khối IF này để xử lý riêng yêu cầu lấy thông báo
    if (action === 'getNotifications') {
      return getNotifications(currentUser, isAdmin);
    }
    if (action === 'getGlobalNotification') {
      return getGlobalNotification();
    }

    if (action === 'getChatVisibility') {
      const props = PropertiesService.getScriptProperties();
      const isHidden = props.getProperty('CHAT_HIDDEN') === 'true';
      return createJsonResponse({ status: "SUCCESS", isChatHidden: isHidden });
    }

    if (action === 'getStockVisibility') {
      const props = PropertiesService.getScriptProperties();
      const isHidden = props.getProperty('STOCK_HIDDEN') === 'true';
      return createJsonResponse({ status: "SUCCESS", isStockHidden: isHidden });
    }

    if (action === 'getChatMessages') {
      return handleGetChatMessages(e.parameter);
    }
    if (action === 'getPinnedMessages') {
      return createJsonResponse(handleGetPinnedMessages());
    }
    // ================= KẾT THÚC SỬA LỖI =================

    if (action === 'getArchivedDataPage') {
      return getArchivedDataPage(e.parameter);
    }
    if (action === 'getAllArchivedDataForUser') {
      return getAllArchivedDataForUser(e.parameter);
    }
    if (action === 'getPaginatedData') {
      return getPaginatedData(e.parameter);
    }
    if (action === 'getOrderHistory') {
      const orderNumber = e.parameter.orderNumber;
      const historyData = getOrderHistory(orderNumber);
      return createJsonResponse({ status: "SUCCESS", history: historyData });
    }
    if (action === 'getVersion') {
      const version = getDataVersion();
      return createJsonResponse({ status: "SUCCESS", version: version });
    }
    if (action === 'getAnalytics') {
      const analyticsData = getVehicleAnalytics();
      return createJsonResponse({ status: "SUCCESS", analytics: analyticsData });
    }

    // Bộ điều hướng (router) cho các yêu cầu lấy dữ liệu riêng lẻ
    switch (action) {
      // --- Cases từ logic Auth/Lái thử (Hàm 1) ---
      // (Giả định các hàm handler này trả về object, ta bọc chúng trong createJsonResponse)
      case 'getUsers':
        return createJsonResponse(handleGetUsers());
      case 'getTeamData':
        return createJsonResponse(handleGetTeamData());
      case 'getTestDriveSchedule':
        return createJsonResponse(handleGetTestDriveSchedule());

      case 'getActiveUsers':
        return createJsonResponse(getActiveUsers());
      case 'getDaGhepData':
        return getDaGhepData();

      case 'getChuaGhepData':
        return getChuaGhepData();
      case 'getKhoXeData':
        return getKhoXeData();
      case 'getXuathoadonData':
        return getXuathoadonData();
      case 'getHuyGhepData':
        return getHuyGhepData();
      case 'getDangKyChoData':
        return getDangKyChoData();
      case 'getYeuCauVcData':
        return getYeuCauVcData();
      case 'getChinhSachData': // <-- THÊM CASE MỚI NÀY
        return getChinhSachData();
      case 'searchGlobal':
        return searchGlobalLogic(e.parameter.keyword, isAdmin);
      case 'getLogData':
        return handleGetLogData();
    }

    // Logic mặc định khi không có action nào ở trên được gọi (tải lần đầu)
    Logger.log(`Đang lấy dữ liệu cơ bản từ Google Sheet cho người dùng: ${currentUser}.`);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheets = getSheets(ss);

    const notificationsResponse = getNotifications(currentUser, isAdmin);
    const notificationsResult = JSON.parse(notificationsResponse.getContent());

    const result = {
      status: "SUCCESS",
      version: getDataVersion(),
      currentUser: currentUser,
      isAdmin: isAdmin,
      notifications: notificationsResult.notifications || [],
      unreadCount: notificationsResult.unreadCount || 0
    };

    return createJsonResponse(result);

  } catch (error) {
    Logger.log(`Lỗi nghiêm trọng trong doGet: ${error.message}, Stack: ${error.stack}`);
    sendErrorAlert('doGet', error);
    return createJsonResponse({ status: "ERROR", message: `Lỗi máy chủ: ${error.message}` });
  }
}
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('Quản Lý Xe')
      .addItem('Tìm Kiếm Nâng Cao', 'showSearchAndFilterSidebar')
      .addItem('KHO XE', 'runSyncKhoxeStatus')
      .addItem('Gợi ý Ghép xe', 'showSuggestionSidebar')
      .addItem('Ghép Xe Thủ Công', 'showManualMatchSidebar')
      .addItem('Hủy Ghép Đơn Hàng', 'showCancelOrderSidebar')
      .addItem('Hủy Xuất Hóa Đơn', 'showCancelInvoicePrompt')
      .addItem('Xuất Hóa Đơn', 'issueInvoice')
      .addItem('Phê duyệt Yêu cầu', 'approveSelectedInvoiceRequest')
      .addItem('Yêu cầu Bổ sung Hồ sơ', 'requestSupplementForInvoice')
      .addItem('Xóa Xe Khỏi Kho', 'showDeleteCarFromStockPrompt')
      .addItem('Phục Hồi Xe Vào Kho', 'showRestoreCarToStockPrompt')
      .addItem('Xóa Đơn Hàng', 'showDeleteOrderPrompt')
      .addSeparator()
      .addItem('Lưu Trữ Hóa Đơn (Theo Tháng)', 'showArchivePrompt')
      .addItem('Lưu Trữ File Drive (Tháng Trước)', 'runFileArchiveManually')
      .addItem('Lưu Trữ Đơn Hàng XHĐ', 'archiveInvoicedOrdersMonthly')
      .addItem('Xóa Đơn Hàng Đã Ghép XHĐ Tháng Trước', 'deleteMonthlyInvoicedOrdersFromDaGhepLogic')
      .addItem('Xóa Đơn Hàng Xuất Hóa Đơn Tháng Trước', 'removeXuathoadonRowsFromPreviousMonth')
      .addItem('Kiểm Tra Sức Khỏe Dữ Liệu', 'runDataHealthCheck')
      .addToUi();
  } catch (e) {
    Logger.log('Lỗi onOpen: ' + e.message);
    SpreadsheetApp.getUi().alert('Lỗi khởi tạo menu: ' + e.message);
  }
}
function handleEditTrigger(e) {
  // Lấy các thông tin cơ bản từ sự kiện
  const ss = e.source;
  const range = e.range;
  const sheet = range.getSheet();
  const sheetName = sheet.getName();
  const userEmail = e.user ? e.user.getEmail() : 'N/A';

  // Chống lặp (Debounce) để ngăn trigger chạy nhiều lần cho một hành động
  const props = PropertiesService.getScriptProperties();
  const lastEditKey = `lastEdit_trigger`; // Sử dụng key chung để đơn giản hóa
  const now = Date.now();
  const lastEditTime = props.getProperty(lastEditKey);
  if (lastEditTime && (now - parseInt(lastEditTime)) < 1500) {
    return;
  }
  props.setProperty(lastEditKey, now.toString());

  // Bộ đệm (Cache) cho các đối tượng Sheet để tăng hiệu suất
  let sheetsCache = null;
  function getCachedSheets() {
    if (!sheetsCache) {
      sheetsCache = getSheets(ss);
    }
    return sheetsCache;
  }

  // --- BỘ ĐIỀU PHỐI (DISPATCHER) ---
  const handlers = {
    /**
     * =======================================================
     * XỬ LÝ CHỈNH SỬA TRÊN SHEET "DaGhep" (GIỮ NGUYÊN)
     * =======================================================
     */
    "DaGhep": () => {
      if (range.getRow() <= 1) return;
      const daGhepHeaders = SHEET_HEADERS["DaGhep"];
      const vinCol = daGhepHeaders.indexOf("VIN") + 1;
      // Xử lý khi người dùng xóa một VIN khỏi đơn hàng
      if (range.getColumn() === vinCol && !range.getValue() && e.oldValue) {
        const vinToRevert = String(e.oldValue).trim();
        const currentSheets = getCachedSheets();
        const rowData = sheet.getRange(range.getRow(), 1, 1, daGhepHeaders.length).getValues()[0];
        const orderNumber = rowData[daGhepHeaders.indexOf("Số đơn hàng")];
        // 1. Cập nhật trạng thái xe trong KhoXe về "Chưa ghép"
        updateKhoxeStatusForVin(currentSheets.stockSheet, vinToRevert, "Chưa ghép");
        recordVehicleHistory(vinToRevert, "Hủy ghép (Sửa tay)", `Hủy ghép với ĐH ${orderNumber} bởi ${userEmail}`);
        // 2. Chuyển đơn hàng về sheet ChuaGhep
        const chuaGhepHeaders = SHEET_HEADERS["ChuaGhep"];
        const newChuaGhepRow = chuaGhepHeaders.map(header => {
          const indexInDaGhep = daGhepHeaders.indexOf(header);
          return indexInDaGhep !== -1 ? rowData[indexInDaGhep] : "";
        });
        currentSheets.appendAndFormatRow(chuaGhepSheet, newChuaGhepRow);

        // 3. Xóa dòng khỏi DaGhep
        sheet.deleteRow(range.getRow());
        recordOrderHistory(orderNumber, vinToRevert, "Hủy ghép (Sửa tay)", `Đơn hàng được chuyển về 'ChuaGhep' bởi ${userEmail}`);
        showToastOnSheet(`Đã hủy ghép cho ĐH ${orderNumber} và chuyển về sheet 'ChuaGhep'.`, "Thao Tác Thành Công");
      }
    },

    /**
     * =======================================================
     * XỬ LÝ CHỈNH SỬA TRÊN SHEET "KhoXe" (LOGIC MỚI ĐÃ SỬA)
     * =======================================================
     */
    "KhoXe": () => {
      const editedRange = e.range;
      const startRow = editedRange.getRow();
      const startCol = editedRange.getColumn();
      const numRows = editedRange.getNumRows();

      const currentSheets = getCachedSheets();
      const khoXeHeaders = SHEET_HEADERS["KhoXe"];
      const vinColIndex = khoXeHeaders.indexOf("VIN");
      const ngayNhapColIndex = khoXeHeaders.indexOf("Ngày nhập");

      // Chỉ xử lý nếu cột được chỉnh sửa là cột VIN
      if (startCol !== vinColIndex + 1) return;

      // Vòng lặp để xử lý cho từng dòng trong phạm vi được dán (paste)
      for (let i = 0; i < numRows; i++) {
        const currentRow = startRow + i;
        if (currentRow <= 1) continue; // Bỏ qua dòng tiêu đề

        const vinCell = sheet.getRange(currentRow, vinColIndex + 1);
        const vinValue = vinCell.getValue();

        if (vinValue) {
          const currentVinInCell = String(vinValue).trim().toUpperCase();
          vinCell.setValue(currentVinInCell); // Chuẩn hóa viết hoa

          if (currentVinInCell.length !== 17) {
            vinCell.setNote(`LỖI: Số VIN phải có đúng 17 ký tự.`);
          } else {
            vinCell.clearNote();
            // Tự động điền các thông tin khác cho dòng hiện tại
            updateDmsFromThongtinxe(sheet, currentSheets.thongtinxeSheet, currentVinInCell, currentRow);
            const ngayNhapCell = sheet.getRange(currentRow, ngayNhapColIndex + 1);
            if (!ngayNhapCell.getValue()) {
              ngayNhapCell.setValue(new Date()).setNumberFormat("dd/MM/yyyy hh:mm:ss");
            }
            recordVehicleHistory(currentVinInCell, "Nhập kho (Sửa tay)", `Xe được nhập/sửa bởi ${userEmail}`);
          }
        }
      }
      if (numRows > 1) {
        showToastOnSheet(`Đã xử lý ${numRows} xe.`, "Hoàn tất");
      }
    },


    /**
     * =======================================================
     * XỬ LÝ CHỈNH SỬA TRÊN SHEET "Xuathoadon" (GIỮ NGUYÊN)
     * =======================================================
     */
    "Xuathoadon": () => {
      if (range.getRow() <= 1) return;
      const headers = SHEET_HEADERS["Xuathoadon"];
      const vinCol = headers.indexOf("SỐ VIN") + 1;
      if (range.getColumn() === vinCol && e.value) {
        const vin = String(e.value).trim().toUpperCase();
        fillXuathoadonFromDaghepAndThongtinxe(e, range.getRow(), vin);
        logAction("Điền tự động XHĐ", `Đã điền thông tin cho VIN ${vin} tại dòng ${range.getRow()}.`);
      }
    },

    /**
     * =======================================================
     * XỬ LÝ CHỈNH SỬA TRÊN SHEET "DangKyCho" (GIỮ NGUYÊN)
     * =======================================================
     */
    "DangKyCho": () => {
      if (range.getRow() <= 1) return;
      const currentSheets = getCachedSheets();
      const dangKyChoHeaders = SHEET_HEADERS["DangKyCho"];
      const ghiChuColIndex = dangKyChoHeaders.indexOf("Ghi chú");

      if (range.getColumn() === ghiChuColIndex + 1 && userEmail === ADMIN_EMAIL) {
        const editedRowValues = sheet.getRange(range.getRow(), 1, 1, dangKyChoHeaders.length).getValues()[0];
        const adminNote = editedRowValues[ghiChuColIndex];

        if (adminNote && adminNote.trim() !== "") {
          const tenTVBH = editedRowValues[dangKyChoHeaders.indexOf("Tên TVBH")];
          const tenKH = editedRowValues[dangKyChoHeaders.indexOf("Tên khách hàng")];

          const requestData = {
            id: editedRowValues[dangKyChoHeaders.indexOf("ID Yêu Cầu")],
            ten_tvbh: tenTVBH,
            ten_khach_hang: tenKH,
            dong_xe: editedRowValues[dangKyChoHeaders.indexOf("Dòng xe")],
            phien_ban: editedRowValues[dangKyChoHeaders.indexOf("Phiên bản")],
            admin_note: adminNote
          };

          sendAdminReplyNotification(currentSheets.mailSheet, requestData);
          const notificationMessage = `Admin đã phản hồi YC chờ của KH ${tenKH}: "${adminNote}"`;
          addNotification(notificationMessage, 'info', 'cho-xe', requestData.id, tenTVBH);
        }
      }
    }
  };
  // --- THỰC THI HANDLER VÀ ĐỒNG BỘ HÓA (GIỮ NGUYÊN) ---
  try {
    if (handlers[sheetName]) {
      handlers[sheetName]();
      const currentSheetsForSync = getCachedSheets();
      if ([XUAT_HOA_DON_SHEET_NAME, DA_GHEP_SHEET_NAME, STOCK_SHEET_NAME, CANCELLED_SHEET_NAME, CHUA_GHEP_SHEET_NAME].includes(sheetName)) {
        syncKhoxeStatus(currentSheetsForSync.daGhepSheet, currentSheetsForSync.stockSheet, currentSheetsForSync.xuathoadonSheet);
        syncInvoiceDate(currentSheetsForSync.daGhepSheet, currentSheetsForSync.xuathoadonSheet);
      }
    }
  } catch (error) {
    Logger.log(`Lỗi trong handleEditTrigger khi xử lý sheet ${sheetName}: ${error.message} \nStack: ${error.stack}`);
    showToastOnSheet(`Đã xảy ra lỗi: ${error.message}`, "Lỗi Hệ Thống");
  }
}

function myOnEditTrigger(e) {
  const range = e.range;
  const sheet = range.getSheet();
  const sheetName = sheet.getName();

  // Danh sách các sheet không cần chạy trigger
  const sheetsToExclude = ["Báo Cáo Sức Khỏe Dữ Liệu", "log", "NhatKyChinhSua", "lichsu_donhang", "lichsu_xe"];
  if (sheetsToExclude.includes(sheetName) || !e.user || e.user.getEmail() === "") {
    return;
  }

  // Khóa script để tránh xung đột
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    e.source.toast(`Hệ thống đang bận, thay đổi của bạn sẽ được xử lý sau ít phút.`, "Vui lòng chờ", 5);
    return;
  }

  try {
    let dataChanged = logUserEdit(e); // Ghi lại lịch sử chỉnh sửa
    if (dataChanged) {

      // --- BẮT ĐẦU TỰ ĐỘNG FORMAT VÀ KẺ BẢNG CHO DỮ LIỆU MỚI ---
      const startRow = range.getRow();
      const numRows = range.getNumRows();
      if (startRow > 1) { // Bỏ qua dòng tiêu đề
        let maxCols = sheet.getLastColumn();
        if (typeof SHEET_HEADERS !== 'undefined' && SHEET_HEADERS[sheetName]) {
          maxCols = Math.max(maxCols, SHEET_HEADERS[sheetName].length);
        }

        if (maxCols > 0) {
          const dataVals = sheet.getRange(startRow, 1, numRows, maxCols).getValues();
          let hasData = false;
          for (let r = 0; r < dataVals.length; r++) {
            for (let c = 0; c < dataVals[r].length; c++) {
              if (dataVals[r][c] !== "" && dataVals[r][c] !== null) {
                hasData = true;
                break;
              }
            }
            if (hasData) break;
          }

          if (hasData) {
            const formatRange = sheet.getRange(startRow, 1, numRows, maxCols);
            formatRange
              .setBorder(true, true, true, true, true, true, UI_CONFIG.borderColor, SpreadsheetApp.BorderStyle.SOLID)
              .setFontFamily(UI_CONFIG.fontFamily)
              .setFontSize(UI_CONFIG.fontSize)
              .setFontColor(UI_CONFIG.textColor)
              .setHorizontalAlignment("left")
              .setVerticalAlignment("middle");
          }
        }
      }
      // --- KẾT THÚC TỰ ĐỘNG FORMAT VÀ KẺ BẢNG ---

      // --- BẮT ĐẦU PHẦN SỬA LỖI QUAN TRỌNG ---
      // Xử lý logic nghiệp vụ trong hàm handleEditTrigger
      if (["DaGhep", "KhoXe", "Xuathoadon"].includes(sheetName)) { // Bỏ "DangKyCho" ra khỏi đây
        Logger.log(`onEdit: Bắt đầu gọi hàm handleEditTrigger cho sheet ${sheetName}...`);
        handleEditTrigger(e); // Gọi hàm xử lý logic chính
        Logger.log(`onEdit: Hoàn tất thực thi handleEditTrigger cho sheet ${sheetName}.`);
      }

      // XỬ LÝ GỬI THÔNG BÁO KHI ADMIN PHẢN HỒI YÊU CẦU CHỜ
      // (Logic này được đặt trực tiếp ở đây để đảm bảo nó luôn chạy đúng)
      if (sheetName === "DangKyCho" && range.getRow() > 1) {
        const currentSheets = getSheets(e.source);
        const dangKyChoHeaders = SHEET_HEADERS["DangKyCho"];
        const ghiChuColIndex = dangKyChoHeaders.indexOf("Ghi chú");

        // Chỉ gửi thông báo khi Admin (hoặc người có quyền) chỉnh sửa cột "Ghi chú"
        if (range.getColumn() === ghiChuColIndex + 1 && e.user.getEmail() === ADMIN_EMAIL) {
          const editedRowValues = sheet.getRange(range.getRow(), 1, 1, dangKyChoHeaders.length).getValues()[0];
          const adminNote = editedRowValues[ghiChuColIndex];

          if (adminNote && adminNote.trim() !== "") {
            const tenTVBH = editedRowValues[dangKyChoHeaders.indexOf("Tên TVBH")];
            const tenKH = editedRowValues[dangKyChoHeaders.indexOf("Tên khách hàng")];
            const requestId = editedRowValues[dangKyChoHeaders.indexOf("ID Yêu Cầu")];

            const notificationMessage = `Admin đã phản hồi YC chờ của KH ${tenKH}: "${adminNote}"`;
            // GỌI HÀM addNotification VỚI ĐÚNG THAM SỐ
            addNotification(notificationMessage, 'info', 'cho-xe', requestId, e.user.getEmail(), tenTVBH);
          }
        }
      }
      // --- KẾT THÚC PHẦN SỬA LỖI QUAN TRỌNG ---

      // Tăng phiên bản dữ liệu để web app nhận biết và cập nhật
      incrementDataVersion();
    }
  } catch (error) {
    Logger.log(`Lỗi nghiêm trọng trong myOnEditTrigger: ${error.message} Stack: ${error.stack}`);
    e.source.toast(`Đã xảy ra lỗi khi xử lý chỉnh sửa: ${error.message}`, "Lỗi Hệ Thống", 10);
  } finally {
    lock.releaseLock();
  }
}
