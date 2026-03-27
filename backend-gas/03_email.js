function sendEmailViaEdge(options_or_recipient, subject, htmlBody_or_body) {
  let to, sub, html, attachments = [];
  if (typeof options_or_recipient === 'object') {
    to = options_or_recipient.to;
    sub = options_or_recipient.subject;
    html = options_or_recipient.htmlBody || options_or_recipient.body || options_or_recipient.html;
    if (options_or_recipient.attachments) {
      for (let att of options_or_recipient.attachments) {
        attachments.push({
          name: typeof att.getName === 'function' ? att.getName() : 'attachment.pdf',
          content: Utilities.base64Encode(typeof att.getBytes === 'function' ? att.getBytes() : att)
        });
      }
    }
  } else {
    to = options_or_recipient;
    sub = subject;
    html = htmlBody_or_body;
  }

  const payload = {
    actionId: 'raw',
    recipient_email: to,
    subject: sub,
    html: html,
    attachments: attachments
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const res = UrlFetchApp.fetch('https://jwvgxqrkjlbewvpkvucj.supabase.co/functions/v1/send-email', options);
  } catch(e) {
    Logger.log("Edge Email Error: " + e.message);
  }
}

function getNotifications(currentUser, isAdmin) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const NOTIFICATION_HEADERS = SHEET_HEADERS["ThongBaoWebApp"];
  const sheet = getOrCreateSheet(ss, NOTIFICATION_SHEET_NAME, NOTIFICATION_HEADERS);
  if (sheet.getLastRow() < 2) {
    return createJsonResponse({ status: 'SUCCESS', notifications: [], unreadCount: 0 });
  }

  // Lấy tối đa 50 thông báo gần nhất để xử lý
  const data = sheet.getRange(2, 1, Math.min(50, sheet.getLastRow() - 1), NOTIFICATION_HEADERS.length).getValues();
  // Ánh xạ dữ liệu gốc sang đối tượng để dễ xử lý
  const allNotifications = data.map(row => ({
    timestamp: row[0],
    message: row[1],
    type: row[2],
    targetView: row[3],
    targetId: row[4],
    createdBy: String(row[5] || "").trim(),
    isRead: row[6] === 'Đã đọc',
    recipient: String(row[7] || "").trim()
  }));

  let filteredNotifications;

  // --- LOGIC LỌC THÔNG BÁO ĐÃ THAY ĐỔI ---
  if (isAdmin) {
    // Nếu là Admin, vẫn thấy tất cả thông báo như cũ
    filteredNotifications = allNotifications;
  } else {
    // Nếu là TVBH, thấy các thông báo gửi đích danh HOẶC gửi cho tất cả (recipient trống hoặc ALL)
    filteredNotifications = allNotifications.filter(n =>
      n.recipient === currentUser || !n.recipient || n.recipient === "ALL"
    );
  }
  // --- KẾT THÚC THAY ĐỔI ---

  // Đếm số thông báo chưa đọc DỰA TRÊN DANH SÁCH ĐÃ LỌC
  const unreadCount = filteredNotifications.filter(n => !n.isRead).length;
  return createJsonResponse({ status: 'SUCCESS', notifications: filteredNotifications, unreadCount });
}
function createFullHtmlEmail(emailTitle, bodyContent) {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${emailTitle}</title>
    <style>
        /* --- BASE STYLES --- */
        body, table, td, th { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; font-family: 'Roboto', Arial, sans-serif; }
        table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        body { margin: 0; padding: 0; width: 100%; height: 100% !important; background-color: #f0f8ff; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }

        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Roboto:wght@300;400;500&display=swap');

        :root {
            --primary: #1e3a8a;   
            --secondary: #3b82f6;    
            --bg-body: #f3f4f6;
            --text-main: #1f2937;
        }
        
        body { 
            margin: 0; padding: 0; width: 100%; height: 100% !important; 
            background-color: var(--bg-body); 
            font-family: 'Roboto', sans-serif;
        }

        .email-wrapper { 
            background-color: var(--bg-body);
            padding: 40px 0;
        }
        
        .email-container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
        }

        .content-cell {
            padding: 40px 40px 20px 40px;
        }

        .content-card {
            background-color: rgba(255, 255, 255, 0.95);
            border: 1px solid #E6D5B8;
            border-radius: 4px;
            padding: 30px 25px;
            text-align: center;
            box-shadow: 0 5px 15px rgba(183, 28, 28, 0.05);
        }

        .header-cell {
            background-color: var(--primary);
            padding: 30px 40px;
            text-align: center;
        }
        
        .header-title { 
            margin: 0; 
            font-size: 24px; 
            color: #ffffff;
            font-weight: 700;
            letter-spacing: 0.5px;
        }

        .header-subtitle {
            color: #bfdbfe;
            font-size: 14px;
            margin-top: 8px;
        }

        .greeting {
            font-family: 'Playfair Display', serif;
            font-size: 18px;
            color: var(--text-main);
            margin-bottom: 20px;
        }

        .paragraph { 
            color: #555; 
            font-size: 15px; 
            line-height: 1.6; 
            margin: 0 0 20px 0;
            text-align: left;
        }

        .details-table { 
            width: 100%; 
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 14px;
        }
        
        .details-row td { 
            padding: 12px 10px; 
            border-bottom: 1px dashed #E0E0E0;
            text-align: left;
        }
        .details-row:last-child td { border-bottom: none; }
        
        .key-cell { 
            color: #6b7280; 
            width: 35%;
            font-weight: 500;
            font-size: 13px;
        }
        
        .value-cell { 
            color: var(--text-main); 
            font-weight: 600;
            font-size: 14px;
        }

        .vin-highlight td { background-color: #eff6ff; }
        .vin-highlight .value-cell { color: var(--secondary); font-weight: 700; }

        .footer-cell {
            padding: 20px 40px;
            background-color: #f9fafb;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        
        .warning { color: #dc2626; border-left-color: #dc2626; }
        .info { color: #2563eb; border-left-color: #3b82f6; }
    </style>
</head>
<body>
    ${bodyContent}
</body>
</html>`;
}
function createUnifiedEmailBody(title, recipientName, details, note, titleClass = '', hideFooter = false) {
  let detailsHtml = '';
  for (const key in details) {
    if (details.hasOwnProperty(key)) {
      const isVin = ['vin', 'số vin', 'vin đã hủy', 'xe mới đã về'].includes(key.toLowerCase());

      // Inline styles for table cells
      const cellStyle = "padding: 12px 10px; border-bottom: 1px solid #e5e7eb; text-align: left;";
      const keyStyle = "color: #6b7280; width: 40%; font-weight: 500; font-size: 13px;";
      const valueStyle = "color: #1f2937; font-weight: 600; font-size: 14px;";

      // Highlight style for VIN
      const rowBg = isVin ? "background-color: #eff6ff;" : "";
      const valColor = isVin ? "color: #2563eb; font-weight: 700;" : valueStyle;

      detailsHtml += `
        <tr style="${rowBg}">
            <td style="${cellStyle} ${keyStyle}">${key}:</td>
            <td style="${cellStyle} ${valColor}">${details[key]}</td>
        </tr>`;
    }
  }

  let footerHtml = '';
  if (!hideFooter) {
    footerHtml = `
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px;">Thông báo tự động từ hệ thống quản lý.</div>
          <div style="font-size: 12px; color: #9ca3af;">Vui lòng không trả lời email này.</div>
      </div>
    `;
  } else {
    footerHtml = `<div style="margin-top: 20px;"></div>`;
  }

  return `
    <div style="background-color: #f3f4f6; padding: 40px 0; font-family: 'Roboto', sans-serif;">
        <table align="center" width="600" border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <tr>
                <td style="background-color: #1e3a8a; padding: 25px 40px; text-align: center;">
                    <h1 style="margin: 0; font-size: 20px; color: #ffffff; font-weight: 700; letter-spacing: 0.5px;">THÔNG BÁO HỆ THỐNG</h1>
                    <div style="color: #bfdbfe; font-size: 13px; margin-top: 5px;">VinFast Thuận An</div>
                </td>
            </tr>
            <tr>
                <td valign="top" align="center" style="padding: 30px 40px;">
                    
                    <div style="width: 100%; text-align: left;">
                        <!-- Greeting -->
                        <div style="font-size: 15px; color: #374151; margin-bottom: 20px;">
                            Kính gửi <b>${recipientName}</b>,
                        </div>

                        <!-- Main Title -->
                        <h3 style="color: #1e3a8a; margin-top: 0; margin-bottom: 20px; font-size: 18px; line-height: 1.4;">${title}</h3>

                        <!-- Details Table -->
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                            ${detailsHtml}
                        </table>
                        
                        <!-- Note -->
                        <div style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0; text-align: left;">
                            ${note}
                        </div>

                        ${footerHtml}
                    </div>

                </td>
            </tr>
        </table>
    </div>
  `;
}
function createOverdueWarningEmailBody(title, recipientName, orders, note) {
  let ordersHtml = `
    <tr class="details-row">
      <th style="padding: 10px; border: 1px solid #dfe6f1; text-align: left; background-color: #f0f4f8;">STT</th>
      <th style="padding: 10px; border: 1px solid #dfe6f1; text-align: left; background-color: #f0f4f8;">Số đơn hàng</th>
      <th style="padding: 10px; border: 1px solid #dfe6f1; text-align: left; background-color: #f0f4f8;">Khách hàng</th>
      <th style="padding: 10px; border: 1px solid #dfe6f1; text-align: left; background-color: #f0f4f8;">Số VIN</th>
      <th style="padding: 10px; border: 1px solid #dfe6f1; text-align: center; background-color: #f0f4f8;">Số ngày ghép</th>
    </tr>`;
  orders.forEach((order, index) => {
    ordersHtml += `
      <tr class="details-row">
        <td style="padding: 10px; border: 1px solid #dfe6f1;">${index + 1}</td>
        <td style="padding: 10px; border: 1px solid #dfe6f1;">${order.so_don_hang}</td>
        <td style="padding: 10px; border: 1px solid #dfe6f1;">${order.ten_khach_hang}</td>
        <td style="padding: 10px; border: 1px solid #dfe6f1;">${order.vin}</td>
        <td style="padding: 10px; border: 1px solid #dfe6f1; text-align: center; font-weight: bold; color: #dc3545;">${order.so_ngay_ghep}</td>
      </tr>`;
  });

  return `
    <div class="email-wrapper">
      <table class="email-container" width="100%" border="0" cellspacing="0" cellpadding="0">
        <thead><tr><th class="header-cell"><h1 class="header-title">Thông Báo Hệ Thống</h1></th></tr></thead>
        <tbody>
          <tr>
            <td class="content-cell">
              <h2 class="content-title warning">${title}</h2>
              <p class="paragraph">Xin chào <b>${recipientName}</b>,</p>
              <p class="paragraph">Hệ thống ghi nhận các đơn hàng dưới đây đã ghép xe <b>4 ngày trở lên</b> nhưng chưa được xuất hóa đơn. Anh/Chị vui lòng kiểm tra và xử lý sớm:</p>
              <table class="details-table" width="100%" border="0" cellspacing="0" cellpadding="0">${ordersHtml}</table>
              <p class="paragraph" style="margin-top: 25px;">${note}</p>
            </td>
          </tr>
          <tr><td class="footer-cell"><p>Đây là email tự động, vui lòng không trả lời.</p><p style="margin-top: 5px;">Trân trọng.</p></td></tr>
        </tbody>
      </table>
    </div>`;
}

/**
 * TẠO NỘI DUNG EMAIL XE MỚI NHẬP KHO (HÀM MỚI)
 * Tách logic tạo HTML ra khỏi hàm sendNewCarNotifications.
 */
function createNewCarNotificationBody(newCars) {
  let carsHtml = `
    <tr class="details-row">
      <th style="padding: 10px; border: 1px solid #dfe6f1; text-align: left; background-color: #f0f4f8;">STT</th>
      <th style="padding: 10px; border: 1px solid #dfe6f1; text-align: left; background-color: #f0f4f8;">Dòng xe</th>
      <th style="padding: 10px; border: 1px solid #dfe6f1; text-align: left; background-color: #f0f4f8;">Phiên bản</th>
      <th style="padding: 10px; border: 1px solid #dfe6f1; text-align: left; background-color: #f0f4f8;">Ngoại thất</th>
      <th style="padding: 10px; border: 1px solid #dfe6f1; text-align: left; background-color: #f0f4f8;">Nội thất</th>
      <th style="padding: 10px; border: 1px solid #dfe6f1; text-align: left; background-color: #f0f4f8;">Số VIN</th>
    </tr>`;
  newCars.forEach((car, index) => {
    carsHtml += `
      <tr class="details-row">
        <td style="padding: 10px; border: 1px solid #dfe6f1;">${index + 1}</td>
        <td style="padding: 10px; border: 1px solid #dfe6f1;">${car.dong_xe}</td>
        <td style="padding: 10px; border: 1px solid #dfe6f1;">${car.phien_ban}</td>
        <td style="padding: 10px; border: 1px solid #dfe6f1;">${car.ngoai_that}</td>
        <td style="padding: 10px; border: 1px solid #dfe6f1;">${car.noi_that}</td>
        <td style="padding: 10px; border: 1px solid #dfe6f1; font-weight: 600;">${car.vin}</td>
      </tr>`;
  });

  return `
    <div class="email-wrapper">
      <table class="email-container" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 800px;">
        <thead><tr><th class="header-cell"><h1 class="header-title">Thông Báo Hệ Thống</h1></th></tr></thead>
        <tbody>
          <tr>
            <td class="content-cell">
              <h2 class="content-title info">Danh Sách Xe Mới Nhập Kho</h2>
              <p class="paragraph">Xin chào Quý Anh/Chị Tư vấn bán hàng,</p>
              <p class="paragraph">Hệ thống ghi nhận có <b>${newCars.length} xe mới</b> vừa được nhập kho và sẵn sàng để ghép. Thông tin chi tiết như sau:</p>
              <table class="details-table" width="100%" border="0" cellspacing="0" cellpadding="0">${carsHtml}</table>
            </td>
          </tr>
          <tr><td class="footer-cell"><p>Đây là email tự động, vui lòng không trả lời.</p></td></tr>
        </tbody>
      </table>
    </div>`;
}
/**
 * Lấy email của tư vấn bán hàng.
 * Ưu tiên từ bảng users trên Supabase.
 * Fallback về sheet "Mail" nếu Supabase trống hoặc không tìm thấy.
 */
function getEmailForAdvisor(mailSheet, advisorName) {
  if (!advisorName) {
    logAction("Lỗi getEmailForAdvisor", "Tên tư vấn rỗng hoặc không xác định");
    return null;
  }

  const cache = CacheService.getScriptCache();
  const cacheKey = 'EMAIL_MAP_USERS_V3';
  let emailMap = null;
  const cachedData = cache.get(cacheKey);

  if (cachedData) {
    try {
      emailMap = JSON.parse(cachedData);
    } catch (e) { }
  }

  if (!emailMap) {
    emailMap = {};
    try {
      const url = `${SUPABASE_URL}/rest/v1/users?select=full_name,username,email&limit=500`;
      let finalApiKey = (typeof SUPABASE_SERVICE_KEY !== 'undefined' ? SUPABASE_SERVICE_KEY : "").toString().trim();
      const response = UrlFetchApp.fetch(url, {
        method: 'GET',
        headers: {
          'apikey': finalApiKey,
          'Authorization': `Bearer ${finalApiKey}`,
          'Content-Type': 'application/json'
        },
        muteHttpExceptions: true
      });

      if (response.getResponseCode() === 200) {
        const rows = JSON.parse(response.getContentText());
        rows.forEach(row => {
          const normalizedName = normalizeString(String(row.full_name || ""));
          if (normalizedName) {
            emailMap[normalizedName] = String(row.email || "").trim();
          }
          const uName = String(row.username || "").trim().toLowerCase();
          if (uName) {
            emailMap[uName] = String(row.email || "").trim();
          }
        });
        logAction("getEmailForAdvisor", `Đã tải ${rows.length} email từ Supabase (Họ tên + Username)`);
      } else {
        logAction("Lỗi getEmailForAdvisor", `Supabase trả về ${response.getResponseCode()}, dùng fallback sheet`);
      }
    } catch (e) {
      logAction("Lỗi getEmailForAdvisor", `Lỗi Supabase API: ${e.message}, dùng fallback sheet`);
    }

    // === FALLBACK: Nếu Supabase trống, đọc từ sheet "Mail" cũ ===
    if (Object.keys(emailMap).length === 0 && mailSheet) {
      try {
        const data = mailSheet.getDataRange().getValues();
        if (data.length > 1) {
          for (let i = 1; i < data.length; i++) {
            const sheetAdvisorName = normalizeString(String(data[i][0] || ""));
            const email = String(data[i][1] || "").trim();
            if (sheetAdvisorName && email) {
              emailMap[sheetAdvisorName] = email;
            }
          }
          logAction("getEmailForAdvisor", `Fallback: Đã tải ${Object.keys(emailMap).length} email từ sheet Mail`);
        }
      } catch (e) {
        logAction("Lỗi getEmailForAdvisor", `Lỗi đọc sheet Mail: ${e.message}`);
      }
    }

    // Cache 6 tiếng (chỉ cache nếu có dữ liệu)
    if (Object.keys(emailMap).length > 0) {
      cache.put(cacheKey, JSON.stringify(emailMap), 21600);
    }
  }

  const normalizedAdvisorName = normalizeString(advisorName);
  let email = emailMap[normalizedAdvisorName];
  
  // Thử thêm tìm kiếm theo username (không dấu, lowercase)
  if (!email) {
    const usernameKey = String(advisorName).trim().toLowerCase();
    email = emailMap[usernameKey];
  }

  if (email) {
    return email;
  } else if (email === "") {
    logAction("Lỗi getEmailForAdvisor", `Tư vấn: '${advisorName}' có email rỗng`);
    return null;
  }

  logAction("Lỗi getEmailForAdvisor", `Không tìm thấy email cho tư vấn '${advisorName}'`);
  return null;
}



/**
 * Gửi email thông báo ghép xe thành công.
 * So sánh Mã DMS với 6 ký tự đầu của Số đơn hàng để đưa ra cảnh báo nếu cần.
 * @param {Sheet} mailSheet - Sheet chứa email của tư vấn viên.
 * @param {Object} data - Dữ liệu của đơn hàng (chứa so_don_hang).
 * @param {string} vin - Số VIN của xe đã ghép.
 * @param {string} maDMS - Mã DMS của xe đã ghép.
 * @param {Date} timestamp - Thời gian thực hiện ghép.
 * @returns {boolean} - Trả về true nếu gửi thành công.
 */
function sendEmailNotification(mailSheet, data, vin, maDMS, timestamp) {
  const tenTVBH = data.ten_ban_hang;
  const ngayGhep = formatDateTimeForSheet(timestamp);
  const subject = `[THÔNG BÁO] V/v Ghép xe thành công cho Đơn hàng ${data.so_don_hang}`;
  const recipientEmail = getEmailForAdvisor(mailSheet, tenTVBH);

  if (!recipientEmail) {
    logAction("Lỗi gửi email ghép", `Không tìm thấy email cho ${tenTVBH}, đơn ${data.so_don_hang}`);
    return { success: false, dmsMismatch: false };
  }

  // Khởi tạo các chi tiết cơ bản của đơn hàng
  const details = {
    "Số đơn hàng": `<b>${data.so_don_hang}</b>`,
    "Tên khách hàng": data.ten_khach_hang,
    "Dòng xe": data.dong_xe,
    "Phiên bản": data.phien_ban,
    "Ngoại thất": data.ngoai_that,
    "Nội thất": data.noi_that,
    "Ngày cọc": (data.ngay_coc instanceof Date) ?
      formatDateTimeForSheet(data.ngay_coc) : String(data.ngay_coc || ""),
    "Thời gian ghép": ngayGhep,
    "VIN": vin
  };

  // Ghi chú mặc định
  let note = "Vui lòng kiểm tra và xác nhận thông tin. Trân trọng.";
  let dmsMismatch = false;

  // --- LOGIC MỚI: So sánh Số đơn hàng và Mã DMS ---
  const dmsCode = String(maDMS || "").trim();

  // Chỉ thực hiện logic nếu có Mã DMS
  if (dmsCode) {
    // Luôn hiển thị Mã DMS nếu có
    details["Mã DMS"] = `<b>${dmsCode}</b>`;

    const orderPrefix = String(data.so_don_hang || "").trim().substring(0, 6);

    // Nếu 6 ký tự đầu của SĐH không khớp với Mã DMS, thay đổi ghi chú thành cảnh báo
    if (orderPrefix.toUpperCase() !== dmsCode.toUpperCase()) {
      note = `<b style="color: red;">CẢNH BÁO: Mã đơn hàng (${orderPrefix}) không khớp với Mã DMS (${dmsCode}).</b><br>Vui lòng kiểm tra và lên đơn hàng theo đúng Mã DMS được cung cấp.`;
      dmsMismatch = true;
    }
    // Nếu khớp, ghi chú mặc định sẽ được sử dụng ("không cần note" đặc biệt).
  }
  // --- KẾT THÚC LOGIC MỚI ---

  const bodyContent = createUnifiedEmailBody(`Đơn hàng của Anh/Chị đã được ghép VIN thành công:`, tenTVBH, details, note);
  const fullHtml = createFullHtmlEmail(subject, bodyContent);

  try {
    sendEmailViaEdge({ to: recipientEmail, subject: subject, htmlBody: fullHtml });
    logAction("Gửi email ghép thành công", `Tới ${recipientEmail} cho đơn ${data.so_don_hang}, VIN ${vin}`);
    return { success: true, dmsMismatch: dmsMismatch };
  } catch (e) {
    logAction("Lỗi gửi email ghép", `Email: ${recipientEmail}, Đơn: ${data.so_don_hang}, Lỗi: ${e.message}`);
    return { success: false, dmsMismatch: dmsMismatch };
  }
}

function sendPendingEmail(mailSheet, data, timestamp) {
  const tenTVBH = data.ten_ban_hang;
  const thoiGianNhapFormatted = formatDateTimeForSheet(timestamp);
  const subject = `[HỆ THỐNG] Đã tiếp nhận yêu cầu ghép xe cho Đơn hàng ${data.so_don_hang}`;
  const recipientEmail = getEmailForAdvisor(mailSheet, tenTVBH);

  if (!recipientEmail) {
    logAction("Lỗi gửi email chờ ghép", `Không tìm thấy email cho ${tenTVBH}, đơn ${data.so_don_hang}`);
    return false;
  }

  const details = {
    "Số đơn hàng": `<b>${data.so_don_hang}</b>`,
    "Tên khách hàng": data.ten_khach_hang,
    "Dòng xe": data.dong_xe,
    "Phiên bản": data.phien_ban,
    "Ngoại thất": data.ngoai_that,
    "Nội thất": data.noi_that,
    "Ngày cọc": (data.ngay_coc instanceof Date) ? formatDateTimeForSheet(data.ngay_coc) : String(data.ngay_coc || ""),
    "Thời gian nhập": thoiGianNhapFormatted
  };
  const note = "Hệ thống sẽ tự động tìm xe phù hợp. Vui lòng chờ hoặc liên hệ Admin nếu cần hỗ trợ.";

  const bodyContent = createUnifiedEmailBody("Đơn hàng sau đang trong trạng thái chờ ghép VIN:", tenTVBH, details, note);
  const fullHtml = createFullHtmlEmail(subject, bodyContent);

  try {
    sendEmailViaEdge({ to: recipientEmail, subject: subject, htmlBody: fullHtml });
    logAction("Gửi email chờ ghép thành công", `Tới ${recipientEmail} cho đơn ${data.so_don_hang}`);
    return true;
  } catch (e) {
    logAction("Lỗi gửi email chờ ghép", `Email: ${recipientEmail}, Đơn: ${data.so_don_hang}, Lỗi: ${e.message}`);
    return false;
  }
}
/**
 * Gửi email thông báo hủy ghép VIN.
 * Tự động điều chỉnh nội dung email dựa trên việc có thông tin người hủy hay không.
 * @param {Sheet} mailSheet - Sheet 'Mail' để tra cứu email.
 * @param {Object} data - Dữ liệu cơ bản của đơn hàng.
 * @param {string} vin - Số VIN đã được hủy ghép.
 * @param {Date} timestamp - Thời gian thực hiện hủy.
 * @param {string | null} cancelledBy - Email của người hủy. Nếu là null, trường này sẽ bị ẩn.
 * @param {string} reason - Lý do hủy.
 * @returns {boolean} - Trả về true nếu gửi thành công.
 */
function sendCancelEmail(mailSheet, data, vin, timestamp, cancelledBy, reason) {
  const tenTVBH = data.ten_ban_hang || data.ten_tu_van_ban_hang;
  const thoiGianHuyFormatted = formatDateTimeForSheet(timestamp);
  const subject = `[THÔNG BÁO] V/v hủy ghép xe cho đơn hàng của KH ${data.ten_khach_hang}`;
  const recipientEmail = getEmailForAdvisor(mailSheet, tenTVBH);

  if (!recipientEmail) {
    logAction("Lỗi gửi email hủy ghép", `Không tìm thấy email cho ${tenTVBH}, đơn ${data.so_don_hang}`);
    return false;
  }

  // Bắt đầu với các chi tiết cơ bản của email
  const details = {
    "Số đơn hàng": `<b>${data.so_don_hang}</b>`,
    "Tên khách hàng": data.ten_khach_hang,
    "Dòng xe": data.dong_xe,
    "VIN đã hủy": vin || "N/A",
    "Thời gian hủy": thoiGianHuyFormatted,
  };

  // Tùy chỉnh hiển thị dựa trên việc có thông tin người hủy hay không
  if (cancelledBy) {
    // Nếu có người hủy (hủy từ web-app), hiển thị cả 2 dòng
    details["Người hủy"] = cancelledBy;
    details["Lý do"] = reason;
  } else {
    // Nếu không có người hủy (hủy từ UI), chỉ hiển thị lý do
    details["Lý do hủy"] = reason;
  }

  const note = "Vui lòng kiểm tra lại thông tin.";
  const bodyContent = createUnifiedEmailBody("Đơn hàng sau đã được hủy ghép VIN:", tenTVBH, details, 'Vui lòng kiểm tra thông tin lại với Admin!');
  const fullHtml = createFullHtmlEmail(subject, bodyContent);

  try {
    sendEmailViaEdge({ to: recipientEmail, subject: subject, htmlBody: fullHtml });
    logAction("Gửi email hủy ghép thành công", `Tới ${recipientEmail} cho đơn ${data.so_don_hang}`);
    return true;
  } catch (e) {
    logAction("Lỗi gửi email hủy ghép", `Email: ${recipientEmail}, Đơn: ${data.so_don_hang}, Lỗi: ${e.message}`);
    return false;
  }
}

function sendInvoiceNotification(sheet, row) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = getSheets(ss);
  const mailSheet = sheets.mailSheet;
  const xuathoadonHeaders = SHEET_HEADERS["Xuathoadon"];
  const KET_QUA_GUI_MAIL_HEADER = "KẾT QUẢ GỬI MAIL";
  const ketQuaGuiMailColIndex = xuathoadonHeaders.indexOf(KET_QUA_GUI_MAIL_HEADER);
  try {
    const dataRowValues = sheet.getRange(row, 1, 1, xuathoadonHeaders.length).getValues()[0];
    const invoiceData = {};
    xuathoadonHeaders.forEach((header, index) => invoiceData[header] = dataRowValues[index]);
    const tenTuVan = invoiceData["TƯ VẤN BÁN HÀNG"];
    const recipientEmail = getEmailForAdvisor(mailSheet, tenTuVan);

    if (!recipientEmail) {
      logAction("Lỗi gửi mail XHĐ (sendInvoiceNotification)", `Không tìm thấy email cho TVBH '${tenTuVan}', đơn ${invoiceData["SỐ ĐƠN HÀNG"]}`);
      if (ketQuaGuiMailColIndex !== -1) {
        sheet.getRange(row, ketQuaGuiMailColIndex + 1).setValue("Lỗi: Không tìm thấy email TVBH");
      }
      return;
    }

    const subject = `[HÓA ĐƠN PHÁT HÀNH] KH ${invoiceData["TÊN KHÁCH HÀNG"]} (VIN ${invoiceData["SỐ VIN"]})`;
    const ngayXuatHDFormatted = (invoiceData["NGÀY XUẤT HÓA ĐƠN"] instanceof Date)
      ? Utilities.formatDate(invoiceData["NGÀY XUẤT HÓA ĐƠN"], Session.getScriptTimeZone(), "dd/MM/yyyy")
      : "N/A";

    const details = {
      "Số đơn hàng": `<b>${invoiceData["SỐ ĐƠN HÀNG"]}</b>`,
      "Tên khách hàng": `<b>${invoiceData["TÊN KHÁCH HÀNG"]}</b>`,
      "VIN": `<b>${invoiceData["SỐ VIN"]}</b>`,
      "Ngày xuất hóa đơn": `<b>${ngayXuatHDFormatted}</b>`,
      "Dòng xe": invoiceData["DÒNG XE"],
      "Phiên bản": invoiceData["PHIÊN BẢN"],
      "Ngoại thất": invoiceData["NGOẠI THẤT"],
      "Nội thất": invoiceData["NỘI THẤT"]
    };
    const note = "Vui lòng liên hệ bộ phận Kế toán để nhận hóa đơn.";

    const bodyContent = createUnifiedEmailBody(`Đơn hàng đã được xuất hóa đơn thành công:`, tenTuVan, details, note);
    const fullHtml = createFullHtmlEmail(subject, bodyContent);

    sendEmailViaEdge({ to: recipientEmail, subject: subject, htmlBody: fullHtml });
    logAction("Gửi mail XHĐ thành công (sendInvoiceNotification)", `Tới ${recipientEmail} cho đơn ${invoiceData["SỐ ĐƠN HÀNG"]}`);
    if (ketQuaGuiMailColIndex !== -1) {
      sheet.getRange(row, ketQuaGuiMailColIndex + 1).setValue("Đã gửi");
    }
  } catch (e) {
    Logger.log(`sendInvoiceNotification: Lỗi nghiêm trọng khi gửi email hoặc cập nhật sheet cho dòng ${row}: ${e.message}. Stack: ${e.stack}`);
    logAction("Lỗi gửi mail XHĐ (sendInvoiceNotification)", `Dòng ${row}, Lỗi: ${e.message}`);
    if (ketQuaGuiMailColIndex !== -1) {
      sheet.getRange(row, ketQuaGuiMailColIndex + 1).setValue(`Lỗi gửi: ${e.message.substring(0, 50)}`);
    }
  }
}

/**
 * Gửi email thông báo xuất hóa đơn từ webhook Supabase.
 * @param {Object} record - Dữ liệu record từ donhang table của Supabase.
 */
function sendInvoiceEmailFromSupabase(record) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = getSheets(ss);
  const mailSheet = sheets.mailSheet;

  const tenTVBH = record.ten_ban_hang;
  const recipientEmail = getEmailForAdvisor(mailSheet, tenTVBH);

  if (!recipientEmail) {
    logAction("Lỗi gửi mail XHĐ (Supabase Webhook)", `Không tìm thấy email cho TVBH '${tenTVBH}', đơn ${record.so_don_hang}`);
    return { success: false, message: "Không tìm thấy email TVBH." };
  }

  const subject = `✅ [Hóa Đơn] ${record.ten_khach_hang} (${record.so_don_hang})`;

  const details = {
    "Số đơn hàng": `<b>${record.so_don_hang}</b>`,
    "Tên khách hàng": `<b>${record.ten_khach_hang}</b>`,
    "VIN": `<b>${record.vin || "N/A"}</b>`,
    "Dòng xe": record.dong_xe,
    "Phiên bản": record.phien_ban,
    "Ngoại thất": record.ngoai_that,
    "Nội thất": record.noi_that
  };

  const note = "Đơn hàng đã được cập nhật trạng thái đã xuất hóa đơn. Vui lòng liên hệ bộ phận Kế toán để nhận tài liệu. Trân trọng!";
  const bodyContent = createUnifiedEmailBody(`Thông báo xuất hóa đơn (Tự động từ Supabase):`, tenTVBH, details, note);
  const fullHtml = createFullHtmlEmail(subject, bodyContent);

  try {
    sendEmailViaEdge({ to: recipientEmail, subject: subject, htmlBody: fullHtml });
    logAction("Gửi mail XHĐ thành công (Supabase Webhook)", `Tới ${recipientEmail} cho đơn ${record.so_don_hang}`);
    return { success: true };
  } catch (e) {
    logAction("Lỗi gửi mail XHĐ (Supabase Webhook)", `Đơn: ${record.so_don_hang}, Lỗi: ${e.message}`);
    return { success: false, message: e.message };
  }
}
// Thay thế hàm recordOrderHistory cũ
function createOverdueWarningEmailBody(title, recipientName, orders, note) {
  let ordersHtml = `
    <tr style="background-color: #f0f4f8;">
      <th style="padding: 10px; border: 1px solid #dfe6f1; text-align: left;">STT</th>
      <th style="padding: 10px; border: 1px solid #dfe6f1; text-align: left;">Số đơn hàng</th>
      <th style="padding: 10px; border: 1px solid #dfe6f1; text-align: left;">Tên khách hàng</th>
      <th style="padding: 10px; border: 1px solid #dfe6f1; text-align: left;">Số VIN</th>
      <th style="padding: 10px; border: 1px solid #dfe6f1; text-align: center;">Số ngày ghép</th>
    </tr>
  `;

  orders.forEach((order, index) => {
    ordersHtml += `
      <tr>
        <td style="padding: 10px; border: 1px solid #dfe6f1;">${index + 1}</td>
        <td style="padding: 10px; border: 1px solid #dfe6f1;">${order.so_don_hang}</td>
        <td style="padding: 10px; border: 1px solid #dfe6f1;">${order.ten_khach_hang}</td>
        <td style="padding: 10px; border: 1px solid #dfe6f1;">${order.vin}</td>
        <td style="padding: 10px; border: 1px solid #dfe6f1; text-align: center; font-weight: bold; color: #dc3545;">${order.so_ngay_ghep}</td>
      </tr>
    `;
  });

  const vinfastBlue = '#00509E';
  const body = `
    <div style="font-family: 'Roboto', Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 20px;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 700px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
        <thead>
          <tr>
            <th style="background-color: ${vinfastBlue}; color: #ffffff; padding: 15px 25px; text-align: left;">
              <h1 style="margin: 0; font-size: 16px; font-weight: 400; text-transform: uppercase; letter-spacing: 0.5px;">Thông Báo Hệ Thống</h1>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 25px;">
              <h2 style="color: #dc3545; font-size: 20px; margin-top: 0; margin-bottom: 15px;">${title}</h2>
              <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Xin chào <b>${recipientName}</b>,
              </p>
              <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Hệ thống ghi nhận các đơn hàng dưới đây đã ghép xe được 4 ngày trở lên nhưng chưa được xuất hóa đơn. Anh/Chị vui lòng kiểm tra và xử lý sớm:
              </p>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; border: 1px solid #dfe6f1; border-radius: 5px;">
                ${ordersHtml}
              </table>
              <p style="color: #555; font-size: 16px; line-height: 1.6; margin-top: 25px;">
                ${note}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f1f3f5; padding: 20px; text-align: center; font-size: 12px; color: #888;">
              <p style="margin: 0;">Đây là email tự động, vui lòng không trả lời.</p>
              <p style="margin: 5px 0 0;">Trân trọng.</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>`;
  return body;
}
function sendOverdueWarningEmail(mailSheet, consultantName, orders) {
  const recipientEmail = getEmailForAdvisor(mailSheet, consultantName); // 
  if (!recipientEmail) {
    logAction("Lỗi gửi cảnh báo quá hạn", `Không tìm thấy email cho ${consultantName}`);
    return false;
  }

  // TIÊU ĐỀ EMAIL ĐƯỢC LÀM NỔI BẬT HƠN
  const subject = `[CẢNH BÁO] ${orders.length} đơn hàng quá hạn xuất hóa đơn cần xử lý ngay`;
  const title = "Cảnh Báo Đơn Hàng Quá Hạn Ghép Xe"; // 
  const note = "Vui lòng liên hệ Admin nếu có bất kỳ thắc mắc nào."; // 

  const bodyContent = createOverdueWarningEmailBody(title, consultantName, orders, note); // 
  const fullHtml = createFullHtmlEmail(subject, bodyContent); // 

  try {
    sendEmailViaEdge({ to: recipientEmail, subject: subject, htmlBody: fullHtml }); // 
    logAction("Gửi cảnh báo quá hạn", `Gửi thành công tới ${recipientEmail} với ${orders.length} đơn hàng.`); // 
    return true; // 
  } catch (e) {
    logAction("Lỗi gửi cảnh báo quá hạn", `Lỗi khi gửi mail tới ${recipientEmail}: ${e.message}`); // 
    return false; // 
  }
}
function sendNewCarNotifications() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const stockSheet = ss.getSheetByName(STOCK_SHEET_NAME);

  try {
    // --- BẮT ĐẦU THAY ĐỔI: Khai báo địa chỉ email nhóm ở đây ---
    const GROUP_EMAIL = "new-stock@googlegroups.com"; // <-- THAY ĐỊA CHỈ EMAIL NHÓM CỦA BẠN VÀO ĐÂY

    if (!GROUP_EMAIL) {
      throw new Error("Chưa cấu hình địa chỉ email nhóm để nhận thông báo xe mới.");
    }
    // --- KẾT THÚC THAY ĐỔI ---

    if (!stockSheet) {
      throw new Error("Không tìm thấy sheet KhoXe.");
    }

    const stockHeaders = SHEET_HEADERS["KhoXe"];
    const statusCol = stockHeaders.indexOf("Trạng thái");
    const notifiedCol = stockHeaders.indexOf("Đã thông báo");
    const stockData = stockSheet.getDataRange().getValues();
    const newCars = [];

    // Tìm tất cả xe mới cần thông báo
    for (let i = 1; i < stockData.length; i++) {
      if (String(stockData[i][statusCol]).toLowerCase().trim() === "chưa ghép" && !stockData[i][notifiedCol]) {
        newCars.push({
          dong_xe: stockData[i][stockHeaders.indexOf("Dòng xe")],
          phien_ban: stockData[i][stockHeaders.indexOf("Phiên bản")],
          ngoai_that: stockData[i][stockHeaders.indexOf("Ngoại thất")],
          noi_that: stockData[i][stockHeaders.indexOf("Nội thất")],
          vin: stockData[i][stockHeaders.indexOf("VIN")],
          rowIndex: i + 1
        });
      }
    }

    if (newCars.length === 0) {
      logAction("Thông Báo Xe Mới", "Không có xe mới nào cần thông báo.");
      return; // Không có gì để làm, thoát ra
    }

    // Chuẩn bị nội dung email
    const bodyContent = createNewCarNotificationBody(newCars);
    const subject = `[THÔNG BÁO] Có ${newCars.length} Xe Mới Vừa Nhập Kho`;
    const fullHtml = createFullHtmlEmail(subject, bodyContent);

    // Gửi email và cập nhật sheet
    let emailSentSuccessfully = false;
    try {
      // Chỉ gửi 1 email duy nhất đến địa chỉ nhóm
      sendEmailViaEdge({
        to: GROUP_EMAIL,
        subject: subject,
        htmlBody: fullHtml
      });
      emailSentSuccessfully = true;
      logAction("Gửi email xe mới nhập kho", `Đã gửi thông báo cho ${newCars.length} xe mới đến nhóm ${GROUP_EMAIL}.`);
    } catch (emailError) {
      throw new Error(`Gửi email thất bại: ${emailError.message}`);
    }

    if (emailSentSuccessfully) {
      const notificationDate = "Đã thông báo ngày " + Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
      for (const car of newCars) {
        stockSheet.getRange(car.rowIndex, notifiedCol + 1).setValue(notificationDate);
        Utilities.sleep(300); // Vẫn giữ độ trễ để đảm bảo cập nhật ổn định
      }
    }

  } catch (e) {
    logAction("Lỗi Thông Báo Xe Mới (Nghiêm trọng)", `Lỗi: ${e.message}`);
    showToastOnSheet(`Đã có lỗi xảy ra: ${e.message}`, "Lỗi Hệ Thống");
    sendErrorAlert('sendNewCarNotifications', e);
  }
}
function sendDmsMismatchWarningEmail() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = getSheets(ss);
  const { daGhepSheet, stockSheet, mailSheet } = sheets;
  if (!daGhepSheet || !stockSheet || !mailSheet) {
    logAction("Lỗi Cảnh báo Mã DMS", "Không tìm thấy một trong các sheet cần thiết: DaGhep, KhoXe, Mail.");
    return;
  }

  // Bước 1: Tạo một Map tra cứu nhanh từ VIN sang Mã DMS từ sheet KhoXe
  const stockData = stockSheet.getDataRange().getValues();
  const stockHeaders = SHEET_HEADERS["KhoXe"];
  const vinColStock = stockHeaders.indexOf("VIN");
  const maDmsColStock = stockHeaders.indexOf("Mã DMS");
  const vinToDmsMap = new Map();
  if (vinColStock > -1 && maDmsColStock > -1) {
    for (let i = 1; i < stockData.length; i++) {
      const vin = String(stockData[i][vinColStock] || "").trim().toUpperCase();
      const dms = String(stockData[i][maDmsColStock] || "").trim().toUpperCase();
      if (vin && dms) {
        vinToDmsMap.set(vin, dms);
      }
    }
  } else {
    logAction("Lỗi Cảnh báo Mã DMS", "Sheet KhoXe thiếu cột 'VIN' hoặc 'Mã DMS'.");
    return;
  }

  // Bước 2: Quét sheet DaGhep để tìm các đơn hàng không khớp VÀ chưa được cảnh báo
  const daGhepData = daGhepSheet.getDataRange().getValues();
  const daGhepHeaders = SHEET_HEADERS["DaGhep"];
  const vinColDaghep = daGhepHeaders.indexOf("VIN");
  const soDonHangCol = daGhepHeaders.indexOf("Số đơn hàng");
  const ketQuaCol = daGhepHeaders.indexOf("Kết quả");
  const ngayXuatHDCol = daGhepHeaders.indexOf("Ngày xuất hóa đơn");
  const tvbhCol = daGhepHeaders.indexOf("Tên tư vấn bán hàng");
  const tenKhachHangCol = daGhepHeaders.indexOf("Tên khách hàng");
  const canhBaoSaiDmsCol = daGhepHeaders.indexOf("Cảnh báo sai DMS"); // Lấy chỉ số cột mới

  if (canhBaoSaiDmsCol === -1) {
    logAction("Lỗi Cảnh báo Mã DMS", "Sheet DaGhep thiếu cột 'Cảnh báo sai DMS'. Vui lòng chạy lại hàm setup để tạo cột.");
    return;
  }

  const mismatchedOrdersByConsultant = {};
  for (let i = 1; i < daGhepData.length; i++) {
    const row = daGhepData[i];
    const ketQua = String(row[ketQuaCol] || "").trim();
    const ngayXuatHD = row[ngayXuatHDCol];
    const vin = String(row[vinColDaghep] || "").trim().toUpperCase();
    const soDonHang = String(row[soDonHangCol] || "").trim();
    const daGuiCanhBao = String(row[canhBaoSaiDmsCol] || "").trim();

    // Điều kiện: Đã ghép, chưa xuất hóa đơn, có VIN, và CHƯA từng gửi cảnh báo
    if (ketQua === "Đã ghép" && !ngayXuatHD && vin && daGuiCanhBao !== "Đã gửi") {
      const expectedDms = vinToDmsMap.get(vin);
      const orderPrefix = soDonHang.substring(0, 6).toUpperCase();

      // Nếu có Mã DMS và nó không khớp với 6 ký tự đầu của SĐH
      if (expectedDms && expectedDms !== orderPrefix) {
        const consultantName = String(row[tvbhCol] || "Chưa xác định").trim();
        if (!mismatchedOrdersByConsultant[consultantName]) {
          mismatchedOrdersByConsultant[consultantName] = [];
        }

        mismatchedOrdersByConsultant[consultantName].push({
          so_don_hang: soDonHang,
          ten_khach_hang: String(row[tenKhachHangCol] || ""),
          vin: vin,
          ma_dms_xe: expectedDms,
          ma_don_hang_dms: orderPrefix,
          rowIndex: i + 1 // Lưu chỉ số dòng để cập nhật trạng thái
        });
      }
    }
  }

  // Bước 3: Gửi email cho từng nhân viên tư vấn và cập nhật trạng thái
  if (Object.keys(mismatchedOrdersByConsultant).length === 0) {
    logAction("Hoàn tất Cảnh báo Mã DMS", "Không có đơn hàng nào mới bị sai Mã DMS cần cảnh báo.");
    return;
  }

  for (const consultantName in mismatchedOrdersByConsultant) {
    const orders = mismatchedOrdersByConsultant[consultantName];
    const recipientEmail = getEmailForAdvisor(mailSheet, consultantName);

    if (recipientEmail) {
      const subject = `[CẢNH BÁO] Phát hiện sai mã DMS trên ${orders.length} đơn hàng đã ghép xe`;
      const bodyContent = createDmsMismatchEmailBody(consultantName, orders);
      const fullHtml = createFullHtmlEmail(subject, bodyContent);
      try {
        sendEmailViaEdge({
          to: recipientEmail,
          subject: subject,
          htmlBody: fullHtml
        });
        logAction("Gửi Cảnh báo Mã DMS", `Đã gửi email thành công đến ${consultantName} (${recipientEmail}) cho ${orders.length} đơn hàng.`);

        // Cập nhật trạng thái "Đã gửi" sau khi gửi email thành công
        orders.forEach(order => {
          daGhepSheet.getRange(order.rowIndex, canhBaoSaiDmsCol + 1).setValue("Đã gửi");
        });
        logAction("Cập nhật trạng thái Cảnh báo DMS", `Đã cập nhật trạng thái cho ${orders.length} đơn hàng của ${consultantName}.`);

      } catch (e) {
        logAction("Lỗi Gửi Cảnh báo Mã DMS", `Lỗi khi gửi email đến ${consultantName}: ${e.message}`);
      }
    } else {
      logAction("Lỗi Gửi Cảnh báo Mã DMS", `Không tìm thấy email cho nhân viên tư vấn: ${consultantName}.`);
    }
  }
}
function createDmsMismatchEmailBody(recipientName, orders) {
  let ordersHtml = `
    <tr style="background-color: #f0f4f8;">
      <th style="padding: 10px; border: 1px solid #dfe6f1; text-align: left;">STT</th>
      <th style="padding: 10px; border: 1px solid #dfe6f1; text-align: left;">Số Đơn Hàng</th>
      <th style="padding: 10px; border: 1px solid #dfe6f1; text-align: left;">Tên Khách Hàng</th>
      <th style="padding: 10px; border: 1px solid #dfe6f1; text-align: left;">Số VIN</th>
      <th style="padding: 10px; border: 1px solid #dfe6f1; text-align: center; color: #dc3545; font-weight: bold;">Mã Đơn Hàng (6 ký tự)</th>
      <th style="padding: 10px; border: 1px solid #dfe6f1; text-align: center; color: #28a745; font-weight: bold;">Mã DMS Đúng Của Xe</th>
    </tr>
  `;

  orders.forEach((order, index) => {
    ordersHtml += `
      <tr>
        <td style="padding: 10px; border: 1px solid #dfe6f1;">${index + 1}</td>
        <td style="padding: 10px; border: 1px solid #dfe6f1;">${order.so_don_hang}</td>
        <td style="padding: 10px; border: 1px solid #dfe6f1;">${order.ten_khach_hang}</td>
        <td style="padding: 10px; border: 1px solid #dfe6f1; font-weight: 600;">${order.vin}</td>
        <td style="padding: 10px; border: 1px solid #dfe6f1; text-align: center; background-color: #ffe8e8;">${order.ma_don_hang_dms}</td>
        <td style="padding: 10px; border: 1px solid #dfe6f1; text-align: center; background-color: #e2f5e8;">${order.ma_dms_xe}</td>
      </tr>
    `;
  });

  const vinfastBlue = '#00509E';
  return `
    <div class="email-wrapper">
      <table class="email-container" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 800px;">
        <thead>
          <tr>
            <th class="header-cell" style="background-color: ${vinfastBlue}; color: #ffffff; padding: 15px 25px; text-align: left;">
              <h1 class="header-title" style="margin: 0; font-size: 16px; font-weight: 400; text-transform: uppercase; letter-spacing: 0.5px;">Yêu Cầu Xử Lý Trước Khi Gửi XUất Hóa Đơn</h1>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="content-cell" style="padding: 25px;">
              <p class="paragraph" style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Xin chào <b>${recipientName}</b>,</p>
              <p class="paragraph" style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hệ thống phát hiện các đơn hàng dưới đây đã được ghép xe, nhưng <b>Mã DMS của xe không khớp với mã DMS của Số đơn hàng</b> hiện tại.
                Điều này sẽ gây ra lỗi khi xuất hóa đơn.
              </p>
              <p class="paragraph" style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; font-weight: bold; border-left: 4px solid #ffc107; padding-left: 15px;">
                YÊU CẦU: Anh/Chị vui lòng <b style="color: #dc3545;">HỦY ĐƠN HÀNG CŨ VÀ TẠO LẠI ĐƠN HÀNG MỚI</b> sử dụng "Mã DMS Đúng Của Xe" được cung cấp cho số đơn hàng mới.
              </p>
              <table class="details-table" width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #dfe6f1; border-radius: 5px; margin-bottom: 20px;">
                ${ordersHtml}
              </table>
            </td>
          </tr>
          <tr>
            <td class="footer-cell" style="background-color: #f1f3f5; padding: 20px; text-align: center; font-size: 12px; color: #888;">
              <p style="margin: 0;">Đây là email tự động từ hệ thống quản lý xe. Vui lòng không trả lời.</p>
              <p style="margin-top: 5px;">Trân trọng.</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}
/**
 * Thiết lập trigger tự động chạy hàm sendDmsMismatchWarningEmail mỗi ngày một lần.
 */
function sendInvoiceRequestConfirmationEmailToTVBH(mailSheet, data) {
  const tenTVBH = data.ten_ban_hang;
  const recipientEmail = getEmailForAdvisor(mailSheet, tenTVBH);
  if (!recipientEmail) {
    logAction("Lỗi gửi mail xác nhận Y/C XHĐ", `Không tìm thấy email cho TVBH '${tenTVBH}', đơn ${data.so_don_hang}`);
    return false;
  }
  const subject = `[XÁC NHẬN] Yêu cầu xuất hóa đơn cho ĐH ${data.so_don_hang} đã được gửi`;
  // Lọc bỏ nội dung AI quét hồ sơ (bắt đầu bằng ⚠️ hoặc ✅) khỏi email gửi cho TVBH
  let displayPolicy = String(data.policy || "");
  if (displayPolicy.includes("⚠️")) {
    displayPolicy = displayPolicy.split("⚠️")[0];
  }
  if (displayPolicy.includes("✅")) {
    displayPolicy = displayPolicy.split("✅")[0];
  }
  // Loại bỏ dấu phẩy và khoảng trắng dư thừa ở cuối
  displayPolicy = displayPolicy.replace(/,\s*$/, "").trim();

  const details = {
    "Số đơn hàng": `<b>${data.so_don_hang}</b>`,
    "Tên khách hàng": data.ten_khach_hang,
    "Số VIN": `<b>${data.vin}</b>`,
    "Chính sách": displayPolicy,
    "Hoa hồng ứng": data.commission,
    "Vpoint sử dụng": data.vpoint,
    "Trạng thái mới": "<b>Chờ xuất hóa đơn</b>"
  };
  const note = "Yêu cầu của bạn đã được chuyển đến bộ phận liên quan để xử lý. Hệ thống sẽ có thông báo tiếp theo khi hóa đơn được chính thức phát hành. Xin cảm ơn!";
  const bodyContent = createUnifiedEmailBody("Yêu cầu xuất hóa đơn đã được gửi thành công!", tenTVBH, details, note, 'info');
  const fullHtml = createFullHtmlEmail(subject, bodyContent);

  const mailOptions = {
    to: recipientEmail,
    subject: subject,
    htmlBody: fullHtml
  };

  // Đính kèm file nếu có
  if (data.attachments && Array.isArray(data.attachments)) {
    mailOptions.attachments = data.attachments;
  }

  try {
    sendEmailViaEdge(mailOptions);
    logAction("Gửi mail xác nhận Y/C XHĐ thành công", `Tới ${recipientEmail} cho đơn ${data.so_don_hang} (Có ${data.attachments ? data.attachments.length : 0} file đính kèm)`);
    return true;
  } catch (e) {
    logAction("Lỗi gửi mail xác nhận Y/C XHĐ", `Email: ${recipientEmail}, Đơn: ${data.so_don_hang}, Lỗi: ${e.message}`);
    return false;
  }
}
function sendSupplementRequestEmail(mailSheet, data, reason, imagesBase64Json = null) {
  const tenTVBH = data.ten_ban_hang;
  const recipientEmail = getEmailForAdvisor(mailSheet, tenTVBH);
  if (!recipientEmail) {
    logAction("Lỗi gửi mail YCBS", `Không tìm thấy email cho TVBH '${tenTVBH}', đơn ${data.so_don_hang}`);
    return;
  }

  const subject = `[CẦN XỬ LÝ] Yêu cầu bổ sung hồ sơ cho ĐH ${data.so_don_hang}`;
  const details = {
    "Số đơn hàng": `<b>${data.so_don_hang}</b>`,
    "Tên khách hàng": data.ten_khach_hang,
    "Số VIN": `<b>${data.vin}</b>`,
    "Trạng thái": "<b style='color: orange;'>Yêu cầu bổ sung</b>",
    "Nội dung cần bổ sung": `<b style="color: #dc3545;">${reason}</b>`
  };

  const mailOptions = {
    to: recipientEmail,
    subject: subject,
    inlineImages: {} // Khởi tạo đối tượng rỗng
  };

  let imageAttachmentHtml = '';

  // --- BẮT ĐẦU LOGIC XỬ LÝ NHIỀU ẢNH ---
  let imagesArray = [];
  if (imagesBase64Json) {
    try {
      imagesArray = JSON.parse(imagesBase64Json);
    } catch (e) {
      logAction("Lỗi phân tích JSON ảnh YCBS", `Đơn ${data.so_don_hang}, Lỗi: ${e.message}`);
    }
  }

  if (Array.isArray(imagesArray) && imagesArray.length > 0) {
    imageAttachmentHtml = `<p style="color: #555; font-size: 16px; line-height: 1.6; margin: 15px 0 5px 0;"><strong>Hình ảnh:</strong></p><div>`;

    imagesArray.forEach((base64string, index) => {
      if (base64string && base64string.startsWith('data:image')) {
        try {
          const parts = base64string.split(',');
          const mimeType = parts[0].match(/:(.*?);/)[1];
          const decodedData = Utilities.base64Decode(parts[1]);
          const blob = Utilities.newBlob(decodedData, mimeType, `hinh_${index + 1}.png`);

          const cid = `pastedImage_${index}`; // Tạo Content ID duy nhất cho mỗi ảnh
          mailOptions.inlineImages[cid] = blob;

          // Thêm thẻ <img> cho mỗi ảnh vào email
          imageAttachmentHtml += `<img src="cid:${cid}" alt="Hình ${index + 1}" style="max-width: 250px; height: auto; border: 1px solid #ddd; border-radius: 4px; margin: 5px; display: inline-block;">`;
        } catch (e) {
          logAction("Lỗi xử lý 1 ảnh YCBS", `Đơn ${data.so_don_hang}, Ảnh số ${index + 1}, Lỗi: ${e.message}`);
        }
      }
    });

    imageAttachmentHtml += `</div>`;
  }
  // --- KẾT THÚC LOGIC XỬ LÝ NHIỀU ẢNH ---

  const note = "Anh/Chị vui lòng chuẩn bị lại hồ sơ và sử dụng chức năng 'Cập nhật/Thay thế hồ sơ' trên web để gửi lại. Cảm ơn!" + imageAttachmentHtml;

  const bodyContent = createUnifiedEmailBody("Yêu cầu xuất hóa đơn cần bổ sung thông tin!", tenTVBH, details, note, 'warning');
  const fullHtml = createFullHtmlEmail(subject, bodyContent);

  mailOptions.htmlBody = fullHtml;

  try {
    sendEmailViaEdge(mailOptions);
    logAction("Gửi mail YCBS thành công", `Tới ${recipientEmail} cho đơn ${data.so_don_hang}`);
  } catch (e) {
    logAction("Lỗi gửi mail YCBS", `Email: ${recipientEmail}, Đơn: ${data.so_don_hang}, Lỗi: ${e.message}`);
  }
}
function sendVinClubRequestEmail(mailSheet, data, reason, imagesBase64Json = null) {
  const tenTVBH = data.ten_ban_hang;
  const recipientEmail = getEmailForAdvisor(mailSheet, tenTVBH);
  if (!recipientEmail) {
    logAction("Lỗi gửi mail Y/C VinClub", `Không tìm thấy email cho TVBH '${tenTVBH}', đơn ${data.so_don_hang}`);
    return;
  }

  const subject = `[CẦN XỬ LÝ] Yêu cầu xác thực VinClub cho ĐH ${data.so_don_hang}`;
  const details = {
    "Số đơn hàng": `<b>${data.so_don_hang}</b>`,
    "Tên khách hàng": data.ten_khach_hang,
    "Số VIN": `<b>${data.vin}</b>`,
    "Trạng thái": "<b style='color: #8b5cf6;'>Yêu cầu VinClub</b>",
    "Nội dung yêu cầu": `<b style="color: #dc3545;">${reason}</b>`
  };

  const historyLink = "https://srthuanan.github.io/ordermanagement/yeucaughepxe.html?tab=history";
  const note = `
        <p class="paragraph" style="border-left: 4px solid #8b5cf6; padding-left: 15px; background-color: #f5f3ff;">
            <strong>HƯỚNG DẪN PHẢN HỒI:</strong><br>
            Sau khi hoàn tất, Anh/Chị vui lòng truy cập Web tại mục <strong>"Lịch Sử Ghép"</strong> và nhấn nút <strong>"Xác Nhận VinClub"</strong> trên đúng dòng đơn hàng để hoàn tất.
        </p>
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="padding: 20px 0;">
              <a href="${historyLink}" target="_blank" style="background-color: #4f46e5; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Đi đến Lịch Sử Ghép
              </a>
            </td>
          </tr>
        </table>
    `;

  const mailOptions = { to: recipientEmail, subject: subject, inlineImages: {} };
  let imageAttachmentHtml = '';
  let imagesArray = [];
  if (imagesBase64Json) {
    try { imagesArray = JSON.parse(imagesBase64Json); } catch (e) { }
  }

  if (Array.isArray(imagesArray) && imagesArray.length > 0) {
    imageAttachmentHtml = `<p style="color: #555; font-size: 16px; line-height: 1.6; margin: 15px 0 5px 0;"><strong>Hình ảnh đính kèm:</strong></p><div>`;
    imagesArray.forEach((base64string, index) => {
      try {
        const parts = base64string.split(',');
        const mimeType = parts[0].match(/:(.*?);/)[1];
        const decodedData = Utilities.base64Decode(parts[1]);
        const blob = Utilities.newBlob(decodedData, mimeType, `hinh_${index + 1}.png`);
        const cid = `pastedImage_${index}`;
        mailOptions.inlineImages[cid] = blob;
        imageAttachmentHtml += `<img src="cid:${cid}" alt="Hình ${index + 1}" style="max-width: 250px; height: auto; border: 1px solid #ddd; border-radius: 4px; margin: 5px; display: inline-block;">`;
      } catch (e) { }
    });
    imageAttachmentHtml += `</div>`;
  }

  const finalNote = note + imageAttachmentHtml;
  const bodyContent = createUnifiedEmailBody("Yêu cầu Xác thực Tài khoản VinClub", tenTVBH, details, finalNote, 'warning', true);
  const fullHtml = createFullHtmlEmail(subject, bodyContent);
  mailOptions.htmlBody = fullHtml;

  try {
    sendEmailViaEdge(mailOptions);
    logAction("Gửi mail Y/C VinClub thành công", `Tới ${recipientEmail} cho đơn ${data.so_don_hang}`);
  } catch (e) {
    logAction("Lỗi gửi mail Y/C VinClub", `Email: ${recipientEmail}, Đơn: ${data.so_don_hang}, Lỗi: ${e.message}`);
  }
}
function addNotification(message, type = 'info', targetView = null, targetId = null, createdBy = 'Hệ thống', recipientName = null) {
  try {
    const timestamp = new Date();

    // Ghi vào Supabase (CHÍNH - REALTIME)
    const supabaseData = {
      timestamp: timestamp.toISOString(),
      message: message,
      type: type,
      target_view: targetView || '',
      target_id: String(targetId || ''),
      created_by: createdBy,
      is_read: false,
      recipient: recipientName || 'ALL'
    };

    const success = insertSupabase('notifications', supabaseData);

    if (!success) {
      // Dự phòng (Fallback): Nếu Supabase lỗi thì mới ghi vào Sheet để không mất dữ liệu
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const notificationSheet = ss.getSheetByName(NOTIFICATION_SHEET_NAME);
      if (notificationSheet) {
        notificationSheet.insertRowBefore(2);
        notificationSheet.getRange(2, 1, 1, 8).setValues([[
          timestamp, message, type, targetView, targetId, createdBy, 'Chưa đọc', recipientName
        ]]);
      }
    }

  } catch (e) {
    Logger.log(`Lỗi khi thêm thông báo: ${e.message}`);
  }
}
// [THAY THẾ TOÀN BỘ HÀM markAllNotificationsAsRead CŨ]
function markAllNotificationsAsRead(e) {
  const currentUser = e.parameter.currentUser;
  const isAdmin = e.parameter.isAdmin === 'true'; // Lấy cờ xác định vai trò Admin

  if (!currentUser) {
    return createJsonResponse({ status: 'ERROR', message: 'Không thể xác định người dùng.' });
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreateSheet(ss, NOTIFICATION_SHEET_NAME, SHEET_HEADERS["ThongBaoWebApp"]);
  if (sheet.getLastRow() < 2) {
    return createJsonResponse({ status: 'SUCCESS', message: 'Không có thông báo để đánh dấu.' });
  }

  const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
  const values = dataRange.getValues();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  const isReadColIndex = headers.indexOf("IsRead");
  const recipientColIndex = headers.indexOf("Recipient");

  if (isReadColIndex === -1 || recipientColIndex === -1) {
    return createJsonResponse({ status: 'ERROR', message: 'Lỗi cấu trúc sheet thông báo.' });
  }

  let changesMade = false;
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const isUnread = row[isReadColIndex] === 'Chưa đọc';
    if (!isUnread) continue; // Bỏ qua các thông báo đã đọc

    const recipient = String(row[recipientColIndex] || "").trim();

    let shouldMarkAsRead = false;
    if (isAdmin) {
      // Nếu là Admin, chỉ đánh dấu đã đọc các thông báo chung (không có người nhận) 
      // hoặc các thông báo gửi đích danh cho Admin.
      if (!recipient || recipient === ADMIN_EMAIL) {
        shouldMarkAsRead = true;
      }
    } else {
      // Nếu là TVBH, chỉ đánh dấu đã đọc các thông báo gửi đích danh cho TVBH đó.
      if (recipient === currentUser) {
        shouldMarkAsRead = true;
      }
    }

    if (shouldMarkAsRead) {
      values[i][isReadColIndex] = 'Đã đọc';
      changesMade = true;
    }
  }

  if (changesMade) {
    dataRange.setValues(values);
  }

  return createJsonResponse({ status: 'SUCCESS', message: 'Đã đánh dấu đã đọc.' });
}
function resendNotificationEmail(orderNumber, emailType, userEmail, ss) {
  if (!ss) ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  if (!orderNumber || String(orderNumber).trim() === "" || String(orderNumber) === "undefined") {
    return { success: false, message: "Số đơn hàng không hợp lệ (Trống hoặc Undefined)." };
  }

  // Lazy sheets getter to avoid initializing all 17 sheets at start
  const getS = (name) => ss.getSheetByName(name);

  try {
    switch (emailType) {
      case 'match_success': {
        const cleanOrderNo = String(orderNumber || "").trim();
        const encodedOrderNo = encodeURIComponent(cleanOrderNo);
        let vin, orderDataForEmail, maDMS = "";

        // 1. Prioritize Supabase (Source of Truth for modern orders)
        let supaDh = fetchSupabase('donhang', `so_don_hang=eq.${encodedOrderNo}`);
        
        // CỐ GẮNG TÌM KIẾM LINH HOẠT NẾU KHÔNG THẤY (do dư dấu cách trong DB)
        if (!supaDh || supaDh.length === 0) {
           supaDh = fetchSupabase('donhang', `so_don_hang=ilike.*${cleanOrderNo}*`);
        }

        if (supaDh && supaDh.length > 0) {
          const dh = supaDh[0];
          orderDataForEmail = {
            ten_ban_hang: dh.ten_tu_van_ban_hang,
            ten_khach_hang: dh.ten_khach_hang,
            dong_xe: dh.dong_xe, phien_ban: dh.phien_ban,
            ngoai_that: dh.ngoai_that, noi_that: dh.noi_that,
            so_don_hang: cleanOrderNo, ngay_coc: dh.ngay_coc,
            thoi_gian_nhap: dh.thoi_gian_nhap
          };
          vin = dh.vin || dh.so_vin;
          Logger.log(`[resend_match] Found order in Supabase: ${cleanOrderNo}`);
        } else {
          // 2. Fallback to Google Sheets
          const dgS = getS(DA_GHEP_SHEET_NAME);
          const rowData = findRowByKeyValue(dgS, "Số đơn hàng", cleanOrderNo);
          if (rowData) {
            orderDataForEmail = {
              ten_ban_hang: rowData["Tên tư vấn bán hàng"],
              ten_khach_hang: rowData["Tên khách hàng"],
              dong_xe: rowData["Dòng xe"], phien_ban: rowData["Phiên bản"],
              ngoai_that: rowData["Ngoại thất"], noi_that: rowData["Nội thất"],
              so_don_hang: cleanOrderNo, ngay_coc: rowData["Ngày cọc"],
              thoi_gian_nhap: rowData["Thời gian nhập"]
            };
            vin = rowData["VIN"];
            Logger.log(`[resend_match] Fallback found order in DaGhep sheet: ${cleanOrderNo}`);
          }
        }

        if (!orderDataForEmail) throw new Error("Không tìm thấy đơn hàng trong sheet DaGhep hoặc Supabase.");
        if (!vin) throw new Error("Đơn hàng này chưa được ghép xe.");

        // Fetch maDMS, prioritizing Supabase
        const encodedVin = encodeURIComponent(vin);
        const supaCar = fetchSupabase('khoxe', `vin=eq.${encodedVin}`);
        if (supaCar && supaCar.length > 0) {
          maDMS = supaCar[0].ma_dms;
          Logger.log(`[resend_match] Found maDMS in Supabase for VIN: ${vin}`);
        } else {
          const sS = getS(STOCK_SHEET_NAME);
          const stockRow = findRowByKeyValue(sS, "VIN", vin);
          if (stockRow) {
            maDMS = stockRow["Mã DMS"];
            Logger.log(`[resend_match] Fallback found maDMS in stockSheet for VIN: ${vin}`);
          }
        }

        const mailS = getS(MAIL_SHEET_NAME);
        const success = sendEmailNotification(mailS, orderDataForEmail, vin, maDMS, new Date());
        if (!success) throw new Error("Lỗi hệ thống khi cố gắng gửi email.");
        recordOrderHistory(cleanOrderNo, vin, "Gửi lại Email Ghép Xe", `Gửi lại bởi ${userEmail}`);
        return { success: true, message: "Đã gửi lại email thông báo ghép xe thành công!" };
      }

      case 'invoice_issued': {
        const cleanOrderNumber = String(orderNumber || "").trim();
        const encodedOrderNo = encodeURIComponent(cleanOrderNumber);

        let urlHoaDon, vin, customerName, tvbhName, dongXe, phienBan, ngoaiThat, noiThat;

        // 1. Prioritize Supabase (yeucauxhd & donhang)
        Logger.log(`[resend_invoice] Fetching from Supabase for ĐH: ${cleanOrderNumber}`);
        let supaData = fetchSupabase('yeucauxhd', `so_don_hang=eq.${encodedOrderNo}`);
        if (!supaData || supaData.length === 0) {
           supaData = fetchSupabase('yeucauxhd', `so_don_hang=ilike.*${cleanOrderNumber}*`);
        }

        if (supaData && supaData.length > 0) {
          const r = supaData[0];
          urlHoaDon = r.url_hoa_don_da_xuat || r.url_hoa_don || r.url_final_invoice;
          vin = r.vin || r.so_vin;
          customerName = r.ten_khach_hang;
          Logger.log(`[resend_invoice] Found in yeucauxhd: Link=${urlHoaDon}, Vin=${vin}`);
        }

        let supaDh = fetchSupabase('donhang', `so_don_hang=eq.${encodedOrderNo}`);
        if (!supaDh || supaDh.length === 0) {
           supaDh = fetchSupabase('donhang', `so_don_hang=ilike.*${cleanOrderNumber}*`);
        }
        
        if (supaDh && supaDh.length > 0) {
          const dh = supaDh[0];
          customerName = customerName || dh.ten_khach_hang;
          tvbhName = tvbhName || dh.ten_tu_van_ban_hang;
          dongXe = dongXe || dh.dong_xe;
          phienBan = phienBan || dh.phien_ban;
          ngoaiThat = ngoaiThat || dh.ngoai_that;
          noiThat = noiThat || dh.noi_that;
          vin = vin || dh.vin || dh.so_vin;
          urlHoaDon = urlHoaDon || dh.link_hoa_don_da_xuat || dh.url_hoa_don_da_xuat || dh.link_hoa_don || dh.url_hoa_don;
          Logger.log(`[resend_invoice] Found in donhang: Link=${urlHoaDon}, Vin=${vin}, KH=${customerName}`);
        }

        // 2. Fallback to Google Sheets (if still missing critical info)
        if (!urlHoaDon || !vin || !customerName) {
          Logger.log(`[resend_invoice] Missing info from Supabase, checking Sheets for ĐH: ${cleanOrderNumber}`);
          const xhdS = getS(XUAT_HOA_DON_SHEET_NAME);
          const dgS = getS(DA_GHEP_SHEET_NAME);
          const rowXHD = findRowByKeyValue(xhdS, "SỐ ĐƠN HÀNG", cleanOrderNumber);
          const rowDaGhep = findRowByKeyValue(dgS, "Số đơn hàng", cleanOrderNumber);

          urlHoaDon = urlHoaDon || (rowXHD ? (rowXHD["URL Hóa Đơn Đã Xuất"] || rowXHD["URL Hóa Đơn"]) : null);
          if (!urlHoaDon && rowDaGhep) urlHoaDon = rowDaGhep["LinkHoaDonDaXuat"];

          vin = vin || (rowXHD ? rowXHD["SỐ VIN"] : null) || (rowDaGhep ? rowDaGhep["VIN"] : null);
          customerName = customerName || (rowDaGhep ? rowDaGhep["Tên khách hàng"] : null);
          tvbhName = tvbhName || (rowDaGhep ? rowDaGhep["Tên tư vấn bán hàng"] : null);
          dongXe = dongXe || (rowDaGhep ? rowDaGhep["Dòng xe"] : null);
          phienBan = phienBan || (rowDaGhep ? rowDaGhep["Phiên bản"] : null);
          ngoaiThat = ngoaiThat || (rowDaGhep ? rowDaGhep["Ngoại thất"] : null);
          noiThat = noiThat || (rowDaGhep ? rowDaGhep["Nội thất"] : null);
        }

        if (!urlHoaDon) throw new Error("Không tìm thấy link hóa đơn để gửi lại.");

        const invoiceFileBlob = getFileBlobFromUrl(urlHoaDon);
        if (!invoiceFileBlob) throw new Error("Không thể truy cập file hóa đơn từ URL: " + urlHoaDon);

        const orderDataForEmail = {
          so_don_hang: cleanOrderNumber,
          ten_khach_hang: customerName || "Khách hàng",
          ten_tu_van_ban_hang: tvbhName || "Admin",
          vin: vin || "N/A",
          dong_xe: dongXe || "",
          phien_ban: phienBan || "",
          ngoai_that: ngoaiThat || "",
          noi_that: noiThat || ""
        };

        const xhdSheetForEmail = getS(XUAT_HOA_DON_SHEET_NAME);
        const mailS = getS(MAIL_SHEET_NAME);
        const xhdRowId = findRowIndexByKeyValue(xhdSheetForEmail, "SỐ ĐƠN HÀNG", cleanOrderNumber);

        const success = sendIssuedInvoiceWithAttachment(mailS, orderDataForEmail, invoiceFileBlob, xhdSheetForEmail, xhdRowId);
        if (!success) throw new Error("Lỗi hệ thống khi cố gắng gửi email.");
        recordOrderHistory(cleanOrderNumber, vin, "Gửi lại Email Hóa Đơn", `Gửi lại bởi ${userEmail}`);
        return { success: true, message: "Đã gửi lại email hóa đơn thành công!" };
      }

      case 'invoice_supplement_requested': {
        const encodedOrderNo = encodeURIComponent(String(orderNumber || "").trim());
        let orderData = null;

        // 1. Fetch from Supabase First
        const supaDh = fetchSupabase('donhang', `so_don_hang=eq.${encodedOrderNo}`);
        if (supaDh && supaDh.length > 0) {
            const dh = supaDh[0];
            orderData = {
                ten_ban_hang: dh.ten_tu_van_ban_hang,
                ten_khach_hang: dh.ten_khach_hang,
                so_don_hang: dh.so_don_hang,
                vin: dh.vin || dh.so_vin
            };
        } else {
            // 2. Fallback to GAS
            const dgS = getS(DA_GHEP_SHEET_NAME);
            const rowData = findRowByKeyValue(dgS, "Số đơn hàng", orderNumber);
            if (!rowData) throw new Error("Không tìm thấy đơn hàng trong Supabase hoặc sheet DaGhep.");
            orderData = {
                ten_ban_hang: rowData["Tên tư vấn bán hàng"],
                ten_khach_hang: rowData["Tên khách hàng"],
                so_don_hang: orderNumber,
                vin: rowData["VIN"]
            };
        }
        const reason = "[GỬI LẠI] Vui lòng kiểm tra và bổ sung hồ sơ theo yêu cầu trước đó.";
        const mailS = getS(MAIL_SHEET_NAME);
        sendSupplementRequestEmail(mailS, orderData, reason);
        recordOrderHistory(orderNumber, orderData.vin, "Gửi lại Email YCBS", `Gửi lại bởi ${userEmail}`);
        return { success: true, message: "Đã gửi lại email yêu cầu bổ sung hồ sơ." };
      }

      case 'vc_request_received': {
        const ycVcSheet = getS(YEU_CAU_VC_SHEET_NAME);
        const rowData = findRowByKeyValue(ycVcSheet, "Số đơn hàng", orderNumber);
        if (!rowData) throw new Error("Không tìm thấy Yêu cầu VinClub cho đơn hàng này trong sheet YeuCauVC.");

        const emailData = {
          ten_ban_hang: rowData["Người YC"],
          so_don_hang: orderNumber,
          ten_khach_hang: rowData["Tên khách hàng"],
          vin: rowData["VIN"],
          customerType: rowData["Loại YC"] === "Cá Nhân" ? 'personal' : 'company',
          dmsCode: rowData["Mã KH DMS"]
        };

        const mailS = getS(MAIL_SHEET_NAME);
        const success = sendVcRequestConfirmationEmailToTVBH(mailS, emailData);
        if (!success) throw new Error("Lỗi hệ thống khi cố gắng gửi email.");

        recordOrderHistory(orderNumber, rowData["VIN"], "Gửi lại Email Y/C VC", `Gửi lại bởi ${userEmail}`);
        return { success: true, message: "Đã gửi lại email xác nhận yêu cầu VinClub!" };
      }

      default:
        throw new Error(`Loại email "${emailType}" không được hỗ trợ để gửi lại.`);
    }
  } catch (e) {
    Logger.log(`Lỗi trong resendNotificationEmail: ${e.message}. Stack: ${e.stack}`);
    return { success: false, message: e.message };
  }
}
function sendUnmatchNotificationEmail(mailSheet, data, vin, reason, unmatchedBy) {
  const tenTVBH = data.ten_ban_hang;
  const recipientEmail = getEmailForAdvisor(mailSheet, tenTVBH);
  if (!recipientEmail) {
    logAction("Lỗi gửi email Hủy Ghép", `Không tìm thấy email cho ${tenTVBH}, đơn ${data.so_don_hang}`);
    return false;
  }

  const subject = `[CẢNH BÁO] Đơn hàng ${data.so_don_hang} đã được hủy ghép xe`;
  const details = {
    "Số đơn hàng": `<b>${data.so_don_hang}</b>`,
    "Tên khách hàng": data.ten_khach_hang,
    "VIN đã hủy ghép": vin || "N/A",
    "Lý do": reason,
    "Người thực hiện": unmatchedBy,
    "Trạng thái mới": "Đã chuyển về hàng chờ"
  };
  const note = "Đơn hàng này đã được đưa trở lại danh sách chờ ghép. Vui lòng kiểm tra lại hoặc liên hệ Admin để được hỗ trợ ghép xe khác.";
  const bodyContent = createUnifiedEmailBody("Một đơn hàng đã được hủy ghép:", tenTVBH, details, note, 'warning');
  const fullHtml = createFullHtmlEmail(subject, bodyContent);

  try {
    sendEmailViaEdge({ to: recipientEmail, subject: subject, htmlBody: fullHtml });
    logAction("Gửi email Hủy Ghép thành công", `Tới ${recipientEmail} cho đơn ${data.so_don_hang}`);
    return true;
  } catch (e) {
    logAction("Lỗi gửi email Hủy Ghép", `Email: ${recipientEmail}, Đơn: ${data.so_don_hang}, Lỗi: ${e.message}`);
    return false;
  }
}
function sendCarAvailableNotification(mailSheet, orderData, carDetails) {
  const tenTVBH = orderData.ten_tvbh;
  const recipientEmail = getEmailForAdvisor(mailSheet, tenTVBH);
  if (!recipientEmail) {
    logAction("Lỗi gửi mail báo có xe", `Không tìm thấy email cho ${tenTVBH}, YC ID: ${orderData.request_id}`);
    return false;
  }

  const webAppUrl = ScriptApp.getService().getUrl();
  const pairingUrl = `https://srthuanan.github.io/ordermanagement/yeucaughepxe.html`;
  const subject = `[XE ĐÃ VỀ] Thông báo có xe phù hợp cho KH ${orderData.ten_khach_hang}`;
  const details = {
    "Khách hàng": `<b>${orderData.ten_khach_hang}</b>`,
    "Yêu cầu chờ": `${orderData.dong_xe} - ${orderData.phien_ban}`,
    "Màu sắc": `${orderData.ngoai_that} / ${orderData.noi_that}`,
    "Ngày đăng ký chờ": orderData.ngay_dang_ky,
    "XE MỚI ĐÃ VỀ": `<b>${carDetails.vin}</b>`,
    "Thông tin xe": `${carDetails.dong_xe} - ${carDetails.phien_ban}`,
    "Màu sắc xe": `${carDetails.ngoai_that} / ${carDetails.noi_that}`
  };
  const note = `
    <p class="paragraph" style="text-align: center; margin-top: 25px;">
      Một chiếc xe phù hợp với yêu cầu của Anh/Chị đã về kho.
      <br>
      Vui lòng nhấp vào nút bên dưới để tạo yêu cầu ghép xe ngay lập tức.
    </p>
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center" style="padding: 15px 0;">
          <a href="${pairingUrl}" target="_blank" style="background-color: #00509E; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Tạo Yêu Cầu Ghép Ngay
          </a>
        </td>
      </tr>
    </table>
  `;
  const bodyContent = createUnifiedEmailBody("Xe Phù Hợp Đã Về Kho!", tenTVBH, details, note, 'info');
  const fullHtml = createFullHtmlEmail(subject, bodyContent);
  try {
    sendEmailViaEdge({ to: recipientEmail, subject: subject, htmlBody: fullHtml });
    logAction("Gửi mail báo có xe thành công", `Tới ${recipientEmail} cho YC ID: ${orderData.request_id}, VIN ${carDetails.vin}`);

    // --- BẮT ĐẦU SỬA LỖI ---
    const notificationMessage = `Đã có xe VIN ${carDetails.vin} phù hợp với yêu cầu chờ của KH ${orderData.ten_khach_hang}.`;
    // Gửi thông báo tới đúng TVBH đã đăng ký chờ
    addNotification(notificationMessage, 'success', 'danhSachCho', orderData.request_id, 'Hệ thống', tenTVBH);
    // --- KẾT THÚC SỬA LỖI ---

    return true;
  } catch (e) {
    logAction("Lỗi gửi mail báo có xe", `Email: ${recipientEmail}, YC ID: ${orderData.request_id}, Lỗi: ${e.message}`);
    return false;
  }
}
function sendAdminReplyNotification(mailSheet, requestData) {
  const tenTVBH = requestData.ten_tvbh;
  const recipientEmail = getEmailForAdvisor(mailSheet, tenTVBH);

  if (!recipientEmail) {
    logAction("Lỗi gửi mail phản hồi Admin", `Không tìm thấy email cho TVBH '${tenTVBH}', YC ID: ${requestData.id}`);
    return false;
  }

  const subject = `[PHẢN HỒI] Admin đã có ghi chú về Yêu Cầu Chờ của KH ${requestData.ten_khach_hang}`;

  const details = {
    "Khách hàng": `<b>${requestData.ten_khach_hang}</b>`,
    "Yêu cầu chờ": `${requestData.dong_xe} - ${requestData.phien_ban}`,
    "Ghi chú từ Admin": `<b style="color: #00509E;">${requestData.admin_note}</b>`
  };

  const note = "Anh/Chị vui lòng xem ghi chú trên và xử lý nếu cần. Trân trọng!";

  const bodyContent = createUnifiedEmailBody("Admin Phản Hồi Yêu Cầu Chờ Xe", tenTVBH, details, note, 'info');
  const fullHtml = createFullHtmlEmail(subject, bodyContent);

  try {
    sendEmailViaEdge({ to: recipientEmail, subject: subject, htmlBody: fullHtml });
    logAction("Gửi mail phản hồi Admin thành công", `Tới ${recipientEmail} cho YC ID: ${requestData.id}`);
    return true;
  } catch (e) {
    logAction("Lỗi gửi mail phản hồi Admin", `Email: ${recipientEmail}, YC ID: ${requestData.id}, Lỗi: ${e.message}`);
    return false;
  }
}
// THAY THẾ TOÀN BỘ HÀM CŨ BẰNG HÀM NÀY
function sendTelegramNotification(message) {
  const TELEGRAM_BOT_TOKEN = "8444242103:AAGupLJ1RJS3b3LD5LMEYIWMfwCFW3mzhB4";
  const TELEGRAM_CHAT_ID = "5812034168";

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    Logger.log("Lỗi: Chưa cấu hình TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID.");
    return;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: 'HTML'
  };

  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    Logger.log(`Telegram API response: ${response.getContentText()}`);
  } catch (e) {
    Logger.log(`Lỗi khi gửi thông báo Telegram: ${e.message}`);
  }
}
/**
 * [HÀM MỚI] Gửi một file (dạng Blob) kèm theo chú thích đến kênh Telegram.
 * @param {Blob} fileBlob - Đối tượng Blob của file cần gửi.
 * @param {string} caption - Chú thích cho file, hỗ trợ định dạng HTML.
 */
function createFullHtmlEmail(emailTitle, bodyContent) {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${emailTitle}</title>
    <style>
        /* --- BASE STYLES --- */
        body, table, td, th { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; font-family: 'Roboto', Arial, sans-serif; }
        table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        body { margin: 0; padding: 0; width: 100%; height: 100% !important; background-color: #f0f8ff; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }

        /* --- WINTER THEME COLORS --- */
        :root {
            --deep-blue: #0A638D;
            --light-blue: #5AC3E2;
            --background-icy: #e0f2f7;
            --text-color-dark: #3a4750;
            --highlight-icy: #C8E6F0;
            --dark-icy: #0A638D;
        }
        
        .email-wrapper { 
            background-color: #e0f2f7;
            padding: 40px 10px;
        }
        
        .email-container { 
            max-width: 600px; 
            margin: 0 auto; 
            border-radius: 12px;
            overflow: hidden; 
            box-shadow: 0 10px 25px rgba(10, 99, 141, 0.2);
            border: 1px solid #B3E5FC;
            
            /* --- CẬP NHẬT HÌNH NỀN TẠI ĐÂY --- */
            background-image: url('https://wallpapershome.com/images/pages/pic_v/26912.jpg');
            background-repeat: no-repeat;
            background-position: center top;
            background-size: cover; 
            background-color: #ffffff; /* Màu dự phòng */
        }
        
        .header-cell { 
            /* Nền tối bán trong suốt để làm nổi bật tiêu đề trên nền ảnh */
            background-color: rgba(10, 99, 141, 0.92);
            color: #ffffff; 
            padding: 30px 25px; 
            text-align: center; 
            border-bottom: 4px solid #5AC3E2;
        }
        
        .header-title { 
            margin: 0; 
            font-size: 22px; 
            font-weight: bold; 
            text-transform: uppercase; 
            letter-spacing: 1px; 
            text-shadow: 0 2px 4px rgba(0,0,0,0.4);
        }
        
        .content-cell { 
            padding: 30px 25px; 
            /* Nền trắng trong suốt 90% để chữ dễ đọc đè lên ảnh nền */
            background-color: rgba(255, 255, 255, 0.90);
        }
        
        .content-title { 
            color: #0A638D; 
            font-size: 20px; 
            margin-top: 0; 
            margin-bottom: 20px;
            border-left: 4px solid #5AC3E2;
            padding-left: 12px;
        }
        
        .paragraph { 
            color: #3a4750; 
            font-size: 16px; 
            line-height: 1.6; 
            margin: 0 0 20px 0; 
        }
        
        .details-table { 
            width: 100%; 
            border: 1px solid #B3E5FC; 
            border-radius: 8px; 
            margin-bottom: 25px; 
            overflow: hidden;
            border-collapse: separate;
            border-spacing: 0;
            /* Nền bảng trắng hoàn toàn để dữ liệu rõ ràng nhất */
            background-color: #ffffff; 
        }
        
        .details-row td { border-bottom: 1px solid #E1F5FE; }
        .details-row:last-child td { border-bottom: none; }
        
        .key-cell { 
            padding: 12px 15px; 
            color: #0A638D; 
            font-weight: 600; 
            width: 150px; 
            background-color: #f8fcff;
            vertical-align: top; 
            border-right: 1px solid #E1F5FE;
        }
        
        .value-cell { 
            padding: 12px 15px; 
            color: #333; 
            vertical-align: top; 
            background-color: #ffffff;
        }
        
        /* Highlight VIN */
        .vin-highlight td { background-color: #C8E6F0 !important; }
        .vin-highlight .key-cell { color: #0A638D; background-color: transparent; border-right: 1px solid #a9d4e6;}
        .vin-highlight .value-cell { color: #0A638D; font-weight: 800; background-color: transparent; }
        
        .footer-cell { 
            /* Footer tối màu bán trong suốt */
            background-color: rgba(10, 99, 141, 0.95);
            padding: 25px; 
            text-align: center; 
            font-size: 13px; 
            color: #ffffff; 
            border-top: 1px solid #ECEFF1;
        }
        
        .snowflake-greeting { 
            margin-top: 15px; 
            font-size: 14px; 
            color: #ffffff; 
            font-weight: bold; 
        }
        .snowflake { font-size: 18px; margin: 0 5px; color: #5AC3E2; }
        
        /* Utility Classes */
        .warning { color: #d32f2f; border-left-color: #d32f2f; }
        .info { color: #0A638D; border-left-color: #5AC3E2; }
        
    </style>
</head>
<body>
    ${bodyContent}
</body>
</html>`;
}

function findUserByEmail(sheet, email) {
  return findUserBy(sheet, 4, email); // Column E for Email
}
/**
 * [HÀM MỚI] - Xử lý cập nhật thông tin chi tiết cho một đơn hàng đã tồn tại.
 * Tự động kiểm tra và chạy lại thuật toán ghép xe nếu cần.
 */
function sendVcRequestConfirmationEmailToTVBH(mailSheet, data) {
  const tenTVBH = data.ten_ban_hang;
  const recipientEmail = getEmailForAdvisor(mailSheet, tenTVBH);
  if (!recipientEmail) {
    logAction("Lỗi gửi mail xác nhận Y/C VC", `Không tìm thấy email cho TVBH '${tenTVBH}', đơn ${data.so_don_hang}`);
    return false;
  }

  const subject = `[XÁC NHẬN] Đã tiếp nhận Yêu cầu cấp VinClub cho ĐH ${data.so_don_hang}`;

  const details = {
    "Số đơn hàng": `<b>${data.so_don_hang}</b>`,
    "Tên khách hàng": data.ten_khach_hang,
    "Số VIN": `<b>${data.vin}</b>`,
    "Loại YC": data.customerType === 'personal' ? "Cá Nhân" : "Công Ty",
    "Mã KH DMS": data.dmsCode || "N/A",
    "Trạng thái mới": "<b>Chờ Admin duyệt</b>"
  };

  const note = "Yêu cầu của bạn đã được gửi đến Admin để phê duyệt. Hệ thống sẽ có thông báo tiếp theo khi yêu cầu được xử lý.";
  const bodyContent = createUnifiedEmailBody("Yêu cầu cấp VinClub đã được gửi thành công!", tenTVBH, details, note, 'info');
  const fullHtml = createFullHtmlEmail(subject, bodyContent);

  try {
    sendEmailViaEdge({ to: recipientEmail, subject: subject, htmlBody: fullHtml });
    logAction("Gửi mail xác nhận Y/C VC thành công", `Tới ${recipientEmail} cho đơn ${data.so_don_hang}`);
    return true;
  } catch (e) {
    logAction("Lỗi gửi mail xác nhận Y/C VC", `Email: ${recipientEmail}, Đơn: ${data.so_don_hang}, Lỗi: ${e.message}`);
    return false;
  }
}
function testSend2026Email() {
  const targetEmail = "ptnhan190697@gmail.com";
  const emailSubject = "TEST: ✨ CHÚC MỪNG NĂM MỚI 2026 - XUÂN BÍNH NGỌ: MÃ ĐÁO THÀNH CÔNG ✨";

  // HTML Template giống hệt hàm chính
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

  sendEmailViaEdge({
    to: targetEmail,
    subject: emailSubject,
    htmlBody: htmlBody
  });

  Logger.log(`Đã gửi mail test thành công tới: ${targetEmail}`);
}
function getGlobalNotification() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Config");
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("Config");
    appendAndFormatRow(sheet, ["Key", "Value"]);
    appendAndFormatRow(sheet, ["GlobalNotification", JSON.stringify({ content: "", isActive: false, type: "info" })]);
  }
  var data = sheet.getDataRange().getValues();
  var notification = { content: "", isActive: false, type: "info" };
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == "GlobalNotification") {
      try {
        notification = JSON.parse(data[i][1]);
      } catch (e) { }
      break;
    }
  }
  return ContentService.createTextOutput(JSON.stringify({
    status: "SUCCESS",
    data: notification
  })).setMimeType(ContentService.MimeType.JSON);
}

function updateGlobalNotification(params) {
  var notificationJson = params.notification;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Config");
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("Config");
    appendAndFormatRow(sheet, ["Key", "Value"]);
  }
  var data = sheet.getDataRange().getValues();
  var found = false;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == "GlobalNotification") {
      sheet.getRange(i + 1, 2).setValue(notificationJson);
      found = true;
      break;
    }
  }
  if (!found) {
    appendAndFormatRow(sheet, ["GlobalNotification", notificationJson]);
  }
  return ContentService.createTextOutput(JSON.stringify({
    status: "SUCCESS",
    message: "Global notification updated."
  })).setMimeType(ContentService.MimeType.JSON);
}


function testSendEmail(targetEmail) {
  // Nếu chạy trực tiếp từ trình soạn thảo mà không có tham số, sử dụng email Admin mặc định
  if (!targetEmail) {
    targetEmail = ADMIN_EMAIL;
    Logger.log("Chạy thủ công: Đang gửi mail test tới email Admin mặc định: " + targetEmail);
  }

  if (!targetEmail) {
    throw new Error("Vui lòng cung cấp địa chỉ email nhận.");
  }
  const emailSubject = "TEST EMAIL - GIAO DIỆN MỚI TỪ WEBAPP";

  const title = "Xác Nhận Kết Nối - Layout Mới";
  const recipientName = "Quản Trị Viên / Tester";
  const details = {
    "Trạng thái kết nối": "Hoạt động ổn định",
    "Giao diện áp dụng": "Công Sở Hiện Đại (Modern Corporate)",
    "Thời gian gửi": formatDateTimeForSheet(new Date()),
    "Số VIN giả lập": "VF8-1234567890 (Sẽ có hiệu ứng highlight)"
  };
  const note = "Nếu bạn nhận được email này, tính năng gửi thông báo của ứng dụng đang hoạt động hoàn hảo. Từ nay tất cả email (Thông báo, Cấp tài khoản, Duyệt Hóa Đơn, vv.) đều sẽ đồng nhất hiển thị trên bộ khung giao diện chuyên nghiệp này.";

  const fullEmailHtml = createUnifiedEmailBody(title, recipientName, details, note);

  sendEmailViaEdge({
    to: targetEmail,
    subject: emailSubject,
    htmlBody: fullEmailHtml
  });
  Logger.log(`Đã gửi mail test tới: ${targetEmail}`);
}

function sendSupplementSubmittedEmail(mailSheet, data, filesInfo, attachments) {
  const tenTVBH = data.ten_ban_hang || 'TVBH';
  const recipientEmail = getEmailForAdvisor(mailSheet, tenTVBH);

  if (!recipientEmail) {
    Logger.log("Không tìm thấy email cho TVBH: " + tenTVBH);
    return;
  }

  const subject = `[BIÊN NHẬN] Xác nhận nộp bổ sung hồ sơ ĐH ${data.so_don_hang}`;

  const details = {
    'Số đơn hàng': `<b>${data.so_don_hang}</b>`,
    'Tên khách hàng': `<b>${data.ten_khach_hang}</b>`,
    'Số VIN': `<b>${data.vin || 'N/A'}</b>`,
    'Chứng từ đã nộp': `<b style="color: #2e7d32;">${filesInfo || 'Các tệp bổ sung (HĐMB/Đề nghị)'}</b>`,
    'Thời gian nộp': `<b>${Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss")}</b>`
  };

  const note = "Hệ thống đã dọn dẹp file rác và ghi nhận các chứng từ cập nhật của bạn an toàn trên nền tảng Cloud. Bộ phận duyệt hồ sơ sẽ sớm kiểm tra lại yêu cầu này.";
  
  const bodyContent = createUnifiedEmailBody("Nộp Bổ Sung Hồ Sơ Thành Công!", tenTVBH, details, note, 'success');
  const fullHtml = createFullHtmlEmail(subject, bodyContent);

  const mailOptions = {
    to: recipientEmail,
    subject: subject,
    htmlBody: fullHtml
  };

  if (attachments && attachments.length > 0) {
    mailOptions.attachments = attachments;
  }

  sendEmailViaEdge(mailOptions);
}

/**
 * Hàm nâng cấp: Đồng bộ trạng thái VC từ cột F sheet YeuCauVC sang tất cả các sheet khác.
 * Chỉ tập trung vào 2 trạng thái cuối cùng: Đã phê duyệt và Từ chối.
 */