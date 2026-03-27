function handleRequestVinClub(e, mailSheet) {
  const STATUS = {
    PENDING_VC_APPROVAL: "Chờ duyệt ycvc", // Trạng thái xử lý trong sheet YeuCauVC
    VC_REQUESTED: "Chờ duyệt VC",       // Trạng thái VC trong sheet đơn hàng
  };
  const CUSTOMER_TYPE = {
    PERSONAL: "Cá Nhân",
    COMPANY: "Công Ty",
  };
  const ARCHIVE_PREFIX = "LuuTru";

  try {
    const { orderNumber, filesData: filesDataJson, customerType, dmsCode = "" } = e.parameter;
    if (!orderNumber || !filesDataJson) {
      throw new Error("Thiếu thông tin quan trọng (số đơn hàng hoặc file).");
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let foundOrder = null;

    const daGhepSheet = ss.getSheetByName(DA_GHEP_SHEET_NAME);
    if (daGhepSheet) {
      const daGhepIndices = {
        order: 6,
        customerName: 1,
        tvbh: 0,
        vin: 9
      };
      foundOrder = findOrderInSheet(daGhepSheet, orderNumber, daGhepIndices);
    }

    if (!foundOrder) {
      const xuathoadonSheet = ss.getSheetByName(XUAT_HOA_DON_SHEET_NAME);
      if (xuathoadonSheet) {
        const xhdIndices = {
          order: 2,
          customerName: 1,
          tvbh: 7,
          vin: 8
        };
        foundOrder = findOrderInSheet(xuathoadonSheet, orderNumber, xhdIndices);
      }
    }

    if (!foundOrder) {
      const archiveSheets = ss.getSheets().filter(sheet => sheet.getName().startsWith(ARCHIVE_PREFIX));
      for (const sheet of archiveSheets) {
        const luuTruIndices = {
          order: 2,
          customerName: 1,
          tvbh: 7,
          vin: 8
        };
        foundOrder = findOrderInSheet(sheet, orderNumber, luuTruIndices);
        if (foundOrder) break;
      }
    }

    if (!foundOrder) {
      const chuaGhepSheet = ss.getSheetByName(CHUA_GHEP_SHEET_NAME);
      if (chuaGhepSheet) {
        const headers = chuaGhepSheet.getRange(1, 1, 1, chuaGhepSheet.getLastColumn()).getValues()[0];
        const orderCol = headers.indexOf("Số đơn hàng");
        const customerCol = headers.indexOf("Tên khách hàng");
        if (orderCol !== -1 && customerCol !== -1 && findOrderInSheet(chuaGhepSheet, orderNumber, { order: orderCol, customerName: customerCol, tvbh: -1, vin: -1 })) {
          throw new Error(`Đơn hàng ${orderNumber} đang ở trạng thái "Chờ Ghép". Vui lòng ghép xe trước.`);
        }
      }
      const huyGhepSheet = ss.getSheetByName(CANCELLED_SHEET_NAME);
      if (huyGhepSheet) {
        const headers = huyGhepSheet.getRange(1, 1, 1, huyGhepSheet.getLastColumn()).getValues()[0];
        const orderCol = headers.indexOf("Số đơn hàng");
        const customerCol = headers.indexOf("Tên khách hàng");
        if (orderCol !== -1 && customerCol !== -1 && findOrderInSheet(huyGhepSheet, orderNumber, { order: orderCol, customerName: customerCol, tvbh: -1, vin: -1 })) {
          throw new Error(`Đơn hàng ${orderNumber} đã bị hủy và không thể thực hiện thao tác này.`);
        }
      }
      throw new Error(`Không tìm thấy đơn hàng ${orderNumber} hoặc đơn hàng thiếu thông tin TVBH/VIN.`);
    }

    const { customerName, orderRowIndex, sheet: sourceSheet, tvbh, vin } = foundOrder;
    // 1. Kiểm tra số VIN (Chỉ cho phép yêu cầu khi xe đã có VIN)
    if (!vin) {
      throw new Error(`Đơn hàng ${orderNumber} chưa có số VIN. Vui lòng cập nhật và thử lại.`);
    }

    // 2. Kiểm tra trùng lặp trong sheet YeuCauVC
    const yeuCauVcSheet = ss.getSheetByName(YEU_CAU_VC_SHEET_NAME);
    const ycData = yeuCauVcSheet.getDataRange().getValues();
    const ycHeaders = ycData[0];
    const ycOrderCol = ycHeaders.indexOf("Số đơn hàng");
    const ycStatusCol = ycHeaders.indexOf("Trạng thái xử lý");

    if (ycOrderCol !== -1 && ycStatusCol !== -1) {
      for (let i = ycData.length - 1; i >= 1; i--) {
        if (String(ycData[i][ycOrderCol]).trim() === orderNumber) {
          const currentStatus = String(ycData[i][ycStatusCol]).trim();
          // Ngăn chặn nếu trạng thái chưa phải là terminal (từ chối/hủy)
          if (currentStatus !== "Từ chối ycvc" && currentStatus !== "Hủy") {
            throw new Error(`Đơn hàng ${orderNumber} đã có yêu cầu VinClub đang xử lý (Trạng thái: ${currentStatus}).`);
          }
        }
      }
    }

    // 3. Kiểm tra trạng thái VC hiện tại trong sheet nguồn (DaGhep/LuuTru)
    const sourceHeaders = sourceSheet.getDataRange().getValues()[0];
    const trangThaiVcCheckCol = sourceHeaders.indexOf("Trạng thái VC");
    if (trangThaiVcCheckCol !== -1) {
      const currentVcStatusInSource = String(sourceSheet.getRange(orderRowIndex, trangThaiVcCheckCol + 1).getValue()).trim();
      const blockStatuses = [STATUS.VC_REQUESTED, "Đã cấp VC", "Chờ xác thực vc (tvbh)"];
      if (blockStatuses.includes(currentVcStatusInSource)) {
        throw new Error(`Đơn hàng ${orderNumber} đã có yêu cầu VinClub trước đó (Trạng thái VC: ${currentVcStatusInSource}).`);
      }
    }

    // Nếu các điều kiện trên thỏa mãn mới tiến hành upload file
    const filesData = JSON.parse(filesDataJson);
    const uploadedFileUrls = {};
    const requestDate = new Date();
    filesData.forEach(fileInfo => {
      const blob = Utilities.newBlob(Utilities.base64Decode(fileInfo.data), fileInfo.type, fileInfo.name);
      const fileResult = saveFileToDrive(blob, orderNumber, `VC_${fileInfo.key}`, customerName, requestDate);
      if (fileResult && fileResult.formula) {
        const urlMatch = fileResult.formula.match(/=HYPERLINK\("([^"]+)"/i);
        if (urlMatch && urlMatch[1]) {
          uploadedFileUrls[fileInfo.key] = urlMatch[1];
        }
      }
    });

    const newVcRequestData = {
      "Số đơn hàng": orderNumber,
      "Tên khách hàng": customerName,
      "Thời gian YC": requestDate,
      "Người YC": tvbh,
      "Loại YC": customerType === 'personal' ? CUSTOMER_TYPE.PERSONAL : CUSTOMER_TYPE.COMPANY,
      "Trạng thái xử lý": STATUS.PENDING_VC_APPROVAL,
      "Ghi chú": "",
      "FileUrls": JSON.stringify(uploadedFileUrls),
      "Mã KH DMS": dmsCode,
      "VIN": vin
    };
    const newRowValues = SHEET_HEADERS["YeuCauVC"].map(header => newVcRequestData[header] || "");
    appendAndFormatRow(yeuCauVcSheet, newRowValues);

    const trangThaiVcCol = sourceSheet.getDataRange().getValues()[0].indexOf("Trạng thái VC");
    if (trangThaiVcCol !== -1) {
      sourceSheet.getRange(orderRowIndex, trangThaiVcCol + 1).setValue(STATUS.VC_REQUESTED);
    }

    recordOrderHistory(orderNumber, vin, "Yêu cầu VinClub", `TVBH ${tvbh} đã gửi yêu cầu cấp tài khoản VinClub.`);
    addNotification(`${tvbh} đã gửi Y/C cấp VinClub cho ĐH ${orderNumber}.`, 'info', 'vc', orderNumber, tvbh, ADMIN_EMAIL);
    const telegramMessage = `💳 <b>Yêu Cầu Cấp VinClub Mới</b>\n\n` +
      `👤 <b>TVBH:</b> ${tvbh}\n` +
      `👨 <b>Khách hàng:</b> ${customerName}\n` +
      `📄 <b>SĐH:</b> <code>${orderNumber}</code>\n` +
      `🔢 <b>VIN:</b> <code>${vin}</code>\n\n` +
      `<b>Trạng thái:</b> Chờ Admin duyệt`;
    sendTelegramNotification(telegramMessage);

    // --- BẮT ĐẦU THÊM MỚI: Gửi email xác nhận cho TVBH ---
    const emailData = {
      ten_ban_hang: tvbh,
      so_don_hang: orderNumber,
      ten_khach_hang: customerName,
      vin: vin,
      customerType: customerType, // [cite: 187]
      dmsCode: dmsCode // [cite: 187]
    };
    sendVcRequestConfirmationEmailToTVBH(mailSheet, emailData);
    // --- KẾT THÚC THÊM MỚI ---

    return createJsonResponse({ status: "SUCCESS", message: "Đã gửi yêu cầu cấp VinClub thành công." });
  } catch (error) {
    Logger.log(`Lỗi khi xử lý yêu cầu VinClub: ${error.message}\nStack: ${error.stack}`);
    return createJsonResponse({ status: "ERROR", message: error.message }, 500);
  }
}

function handleLogin(params) {
  const { username, password } = params;
  if (!username) return { success: false, message: "Vui lòng nhập tên đăng nhập." };

  const normalizedUsername = String(username).toLowerCase().trim();

  // Đảm bảo lấy được API Key và URL sạch sẽ
  let finalApiKey = (typeof SUPABASE_SERVICE_KEY !== 'undefined' ? SUPABASE_SERVICE_KEY : "").toString().trim();
  let finalUrl = (typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : "").toString().trim();

  if (!finalApiKey) {
    finalApiKey = (PropertiesService.getScriptProperties().getProperty('SUPABASE_SERVICE_KEY') || "").trim();
  }

  if (!finalApiKey || !finalUrl) {
    return { success: false, message: "Lỗi cấu hình: Chưa có Supabase API Key hoặc URL." };
  }

  // Let GAS ask Supabase to verify password via the RPC we created
  const url = finalUrl.replace(/\/$/, "") + "/rest/v1/rpc/user_login";
  const options = {
    method: "post",
    headers: {
      "apikey": finalApiKey,
      "Authorization": "Bearer " + finalApiKey,
      "Content-Type": "application/json"
    },
    payload: JSON.stringify({ p_username: normalizedUsername, p_password: password }),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  let result;
  try {
    const content = response.getContentText();
    Logger.log("Supabase Login Response: " + content);
    result = JSON.parse(content);
  } catch (e) {
    return { success: false, message: "Lỗi kết nối tới máy chủ xác thực." };
  }

  if (!result || !result.success) {
    return { success: false, message: result?.message || "Đăng nhập thất bại." };
  }

  const payload = {
    username: result.username,
    fullName: result.consultantName,
    role: result.role,
    email: result.email,
    exp: Date.now() + 86400000 // 1 ngày
  };

  // Generate Google Apps Script standard JWT token for other endpoints
  const token = generateJWT(payload);

  return {
    success: true,
    token: token,
    username: result.username,
    consultantName: result.consultantName,
    role: result.role,
    email: result.email
  };
}
/**
 * Đồng bộ user xuống Supabase
 */
function syncUserToSupabase(username, passwordHash, fullName, role, email) {
  try {
    const url = SUPABASE_URL + "/rest/v1/users";
    const apiKey = SUPABASE_SERVICE_KEY;
    const payload = {
      username: username,
      password_hash: passwordHash,
      full_name: fullName,
      role: role || 'Tư vấn bán hàng',
      email: email
    };

    // Gửi POST tới REST Endpoint của Supabase (lưu ý dùng Prefer: resolution=merge-duplicates để Upsert)
    const options = {
      method: "post",
      headers: {
        "apikey": apiKey,
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    Logger.log("Supabase sync response: " + response.getContentText());
  } catch (e) {
    Logger.log("Error syncing user to Supabase: " + e.message);
  }
}

/**
 * Xử lý thêm người dùng mới và gửi email thông báo.
 * @param {object} params - Các tham số từ request (fullName, email).
 * @param {Sheet} userSheet - Đối tượng trang tính 'Users'.
 * @returns {object} - Kết quả thành công hoặc lỗi.
 */
function handleAddNewUserAndSendMail(params, userSheet) {
  const { fullName, email } = params;
  if (!fullName || !email) {
    throw new Error("Vui lòng cung cấp đầy đủ Họ và Tên và Email.");
  }

  if (findUserByEmail(userSheet, email)) {
    throw new Error(`Email "${email}" đã được đăng ký cho một tài khoản khác.`);
  }

  let username = generateUsernameFromName(fullName);
  let originalUsername = username;
  while (findUserByUsername(userSheet, username)) {
    username = originalUsername + Math.floor(Math.random() * 100);
  }

  const password = generateRandomPassword(10);
  const passwordHash = hashPassword(password);

  appendAndFormatRow(userSheet, [username, passwordHash, fullName, DEFAULT_ROLE, email, '', '']);

  // Gọi hàm đồng bộ sang Supabase
  syncUserToSupabase(username, passwordHash, fullName, DEFAULT_ROLE, email);

  const subject = `Thông tin tài khoản hệ thống`;
  const bodyContent = `
          <div class="content-card">
              <p class="paragraph" style="font-size: 16px; font-weight: 500; margin-bottom: 20px;">Chào <b>${fullName}</b>,</p>
              <p class="paragraph" style="margin-bottom: 25px;">Một tài khoản mới đã được tạo cho bạn trên hệ thống của chúng tôi. Vui lòng sử dụng thông tin dưới đây để đăng nhập:</p>
              
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin-bottom: 25px; text-align: left;">
                  <table class="details-table" style="margin: 0; width: 100%;">
                      <tr class="details-row">
                          <td class="key-cell" style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; width: 40%;">Tên đăng nhập:</td>
                          <td class="value-cell" style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;"><b>${username}</b></td>
                      </tr>
                      <tr class="details-row">
                          <td class="key-cell" style="padding: 10px 0; border-bottom: none;">Mật khẩu tạm thời:</td>
                          <td class="value-cell" style="padding: 10px 0; border-bottom: none;"><b style="color: #2563eb;">${password}</b></td>
                      </tr>
                  </table>
              </div>
              
              <p class="paragraph" style="font-size: 14px; color: #dc2626; background-color: #fef2f2; padding: 12px; border-radius: 6px; border-left: 4px solid #dc2626;">
                  <b>Lưu ý quan trọng:</b> Vì lý do bảo mật, bạn vui lòng đăng nhập và <u>đổi mật khẩu ngay lập tức</u>.
              </p>
          </div>
      `;
  const fullEmailHtml = createFullHtmlEmail(subject, bodyContent);

  sendEmailViaEdge({ to: email, subject: subject, htmlBody: fullEmailHtml });
  return { status: "SUCCESS", message: `Đã tạo tài khoản cho "${fullName}" và gửi email thông báo.` };
}
/**
 * Xử lý đổi mật khẩu cho người dùng.
 * @param {object} params - Các tham số từ request (username, oldPassword, newPassword).
 * @param {Sheet} userSheet - Đối tượng trang tính 'Users'.
 * @returns {object} - Kết quả thành công hoặc lỗi.
 */
function handleChangePassword(params, userSheet) {
  const { username, oldPassword, newPassword } = params;

  if (!newPassword || newPassword.length < 8) {
    throw new Error("Mật khẩu mới phải có ít nhất 8 ký tự.");
  }

  // Gọi Supabase để đổi mật khẩu và xác thực mật khẩu cũ
  const url = SUPABASE_URL + "/rest/v1/rpc/user_change_password";
  const options = {
    method: "post",
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": "Bearer " + SUPABASE_SERVICE_KEY,
      "Content-Type": "application/json"
    },
    payload: JSON.stringify({ p_username: username, p_old_password: oldPassword, p_new_password: newPassword }),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  let result;
  try {
    result = JSON.parse(response.getContentText());
  } catch (e) {
    throw new Error("Lỗi kết nối tới máy chủ dữ liệu.");
  }

  if (!result || !result.success) {
    throw new Error(result?.message || "Đổi mật khẩu thất bại.");
  }

  // Vẫn lưu dự phòng thay đổi hash mới xuống Google Sheet
  const user = findUserByUsername(userSheet, username);
  if (user) {
    const newPasswordHash = hashPassword(newPassword);
    userSheet.getRange(user.row, 2).setValue(newPasswordHash);
  }

  return { success: true, message: result.message };
}
/**
 * Xử lý yêu cầu quên mật khẩu và gửi OTP qua email.
 * @param {object} params - Các tham số từ request (email).
 * @param {Sheet} userSheet - Đối tượng trang tính 'Users'.
 * @returns {object} - Kết quả thành công hoặc lỗi.
 */
function handleForgotPassword(params, userSheet) {
  const { email } = params;
  const user = findUserByEmail(userSheet, email);

  if (!user) {
    throw new Error("Không tìm thấy tài khoản nào được liên kết với email này.");
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + OTP_EXPIRY_MINUTES);
  userSheet.getRange(user.row, 6).setValue(otp);
  userSheet.getRange(user.row, 7).setValue(expiry);

  const subject = `Yêu cầu đặt lại mật khẩu`;
  const bodyContent = `
        <div class="content-card">
            <p class="paragraph" style="font-size: 16px; font-weight: 500; margin-bottom: 20px;">Chào <b>${user.fullName}</b>,</p>
            <p class="paragraph" style="margin-bottom: 25px;">Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng sử dụng mã xác thực (OTP) dưới đây để hoàn tất quá trình:</p>
            
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 25px; margin: 30px 0; text-align: center;">
                <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #166534; margin: 0; font-family: monospace;">${otp}</p>
            </div>
            
            <p class="paragraph" style="font-size: 14px; text-align: center;">
                Mã OTP này sẽ tự động hết hạn trong vòng <b>${OTP_EXPIRY_MINUTES} phút</b>.
            </p>
            <p class="paragraph" style="font-size: 13px; color: #6b7280; text-align: center; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này và báo cáo cho Quản trị viên nếu cần thiết.
            </p>
        </div>
    `;
  const fullEmailHtml = createFullHtmlEmail(subject, bodyContent);

  sendEmailViaEdge({ to: email, subject: subject, htmlBody: fullEmailHtml });
  return { success: true, message: `Mã OTP đã được gửi đến email ${email}.` };
}

/**
 * Xử lý đặt lại mật khẩu bằng OTP.
 * @param {object} params - Các tham số từ request (email, otp, newPassword).
 * @param {Sheet} userSheet - Đối tượng trang tính 'Users'.
 * @returns {object} - Kết quả thành công hoặc lỗi.
 */
function handleResetPassword(params, userSheet) {
  const { email, otp, newPassword } = params;
  const user = findUserByEmail(userSheet, email);

  if (!user) {
    throw new Error("Email không hợp lệ.");
  }

  const data = userSheet.getRange(user.row, 1, 1, 7).getValues()[0];
  const storedOtp = data[5];
  const expiryDate = new Date(data[6]);

  if (storedOtp.toString() !== otp.toString()) {
    throw new Error("Mã OTP không chính xác.");
  }

  if (new Date() > expiryDate) {
    // Xóa OTP đã hết hạn
    userSheet.getRange(user.row, 6, 1, 2).clearContent();
    throw new Error("Mã OTP đã hết hạn. Vui lòng thử lại.");
  }

  if (!newPassword || newPassword.length < 8) {
    throw new Error("Mật khẩu mới phải có ít nhất 8 ký tự.");
  }

  const newPasswordHash = hashPassword(newPassword);
  userSheet.getRange(user.row, 2).setValue(newPasswordHash);
  // Xóa OTP và thời gian hết hạn sau khi sử dụng thành công
  userSheet.getRange(user.row, 6, 1, 2).clearContent();

  // Đồng bộ mật khẩu mới xuống Supabase
  syncUserToSupabase(user.username, newPasswordHash, data[2], data[3], data[4]);

  return { success: true, message: "Mật khẩu đã được đặt lại thành công." };
}

// =================================================================
//   QUẢN LÝ PHÒNG BAN & CÁC CHỨC NĂNG KHÁC
// =================================================================

function handleGetUsers() {
  const userSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(USER_SHEET_NAME);
  const data = userSheet.getDataRange().getValues();
  const users = data.slice(1).map(row => ({
    username: row[0],
    name: row[2],
    role: row[3]
  }));
  return { status: 'SUCCESS', users: users };
}

function handleGetTeamData() {
  const teamSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEAM_SHEET_NAME);
  if (!teamSheet) return { status: 'SUCCESS', teamData: {} };
  const data = teamSheet.getDataRange().getValues();
  const teamData = {};
  for (let i = 1; i < data.length; i++) {
    const leader = data[i][0];
    const membersString = data[i][1] || '';
    if (leader) {
      teamData[leader] = membersString ? membersString.split(',').map(m => m.trim()) : [];
    }
  }
  return { status: 'SUCCESS', teamData: teamData };
}

function handleUpdateTeams(params) {
  const { teams } = params;
  if (!teams) { throw new Error("Không có dữ liệu phòng ban để cập nhật."); }
  const teamData = JSON.parse(teams);
  const teamSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEAM_SHEET_NAME);
  teamSheet.getDataRange().offset(1, 0).clearContent();
  const rows = Object.keys(teamData).map(leader => [leader, (teamData[leader] || []).join(', ')]);
  if (rows.length > 0) {
    teamSheet.getRange(2, 1, rows.length, 2).setValues(rows);
  }
  return { success: true, message: "Cấu trúc phòng kinh doanh đã được cập nhật." };
}
function handleGetLogData() {
  // Cache dữ liệu trong 1 phút (60 giây)
  return fetchAndCacheData('LogData_data', 60, () => {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const logSheet = ss.getSheetByName("log");
    if (!logSheet || logSheet.getLastRow() < 2) {
      return createJsonResponse({ status: "SUCCESS", data: [] });
    }

    // Chỉ lấy 200 dòng log gần nhất để tránh quá tải
    const lastRow = logSheet.getLastRow();
    const startRow = Math.max(2, lastRow - 199); // Lấy 200 dòng hoặc từ dòng 2
    const numRows = lastRow - startRow + 1;

    const dataRange = logSheet.getRange(startRow, 1, numRows, SHEET_HEADERS["log"].length);
    const values = dataRange.getValues();
    const headers = SHEET_HEADERS["log"];

    const data = values.map(row => {
      const rowObject = {};
      headers.forEach((header, index) => {
        rowObject[header] = row[index];
      });
      return rowObject;
    }).sort((a, b) => new Date(b["Thời gian"]) - new Date(a["Thời gian"])); // Sắp xếp mới nhất lên đầu

    return createJsonResponse({ status: "SUCCESS", data: data });
  });
}

function handleAddRequest(e, chuaGhepSheet, daGhepSheet, stockSheet, mailSheet) {
  try { // <--- BẮT ĐẦU KHỐI try...catch ĐỂ BẮT LỖI
    const newRow = {};
    const paramNameMap = {
      "Tên tư vấn bán hàng": "ten_ban_hang", "Tên khách hàng": "ten_khach_hang",
      "Dòng xe": "dong_xe", "Phiên bản": "phien_ban", "Ngoại thất": "ngoai_that",
      "Nội thất": "noi_that", "Số đơn hàng": "so_don_hang", "Ngày cọc": "ngay_coc"
    };
    SHEET_HEADERS["DaGhep"].forEach(header => {
      const paramName = paramNameMap[header] || header.toLowerCase().replace(/ /g, '_').replace(/[\u0300-\u036f]/g, "");
      newRow[header] = e.parameter[paramName] ? e.parameter[paramName].trim() : "";
    });
    if (newRow["Ngày cọc"]) {
      newRow["Ngày cọc"] = formatDateTimeForSheet(new Date(newRow["Ngày cọc"]));
    }
    const currentTime = new Date();
    newRow["Thời gian nhập"] = formatDateTimeForSheet(currentTime);

    const requestedVin = e.parameter.vin_giu_yeu_cau;
    let matchedCarInfo = null;
    const currentUser = String(newRow["Tên tư vấn bán hàng"] || "").trim();
    if (requestedVin) {
      Logger.log(`Yêu cầu ghép xe được chỉ định VIN: ${requestedVin} bởi ${currentUser}`);
      const stockData = stockSheet.getDataRange().getValues();
      const headers = SHEET_HEADERS["KhoXe"]; // Use defined headers instead of reading from sheet
      const vinCol = headers.indexOf("VIN");
      const statusCol = headers.indexOf("Trạng thái");
      const holderCol = headers.indexOf("Người Giữ Xe");
      const expiryCol = headers.indexOf("Thời Gian Hết Hạn Giữ");
      const maDMSCol = headers.indexOf("Mã DMS");
      for (let i = 1; i < stockData.length; i++) {
        const row = stockData[i];
        if (String(row[vinCol]).trim() === requestedVin) {
          const currentStatus = String(row[statusCol]).trim();
          const currentHolder = String(row[holderCol] || "").trim();
          const currentExpiry = row[expiryCol];
          const isAvailable = currentStatus === "Chưa ghép";
          const isHoldingValid = currentStatus === "Đang giữ" &&
            currentHolder === currentUser &&
            currentExpiry &&
            new Date(currentExpiry) > new Date();

          if (isAvailable || isHoldingValid) {
            const extractedMaDMS = row[maDMSCol] || "";
            matchedCarInfo = {

              vin: requestedVin,
              maDMS: extractedMaDMS,
              rowIndex: i + 1,
              statusColIndex: statusCol + 1
            };
            stockSheet.getRange(matchedCarInfo.rowIndex, matchedCarInfo.statusColIndex).setValue("Đã ghép");
            logAction(`Ghép thành công xe đã giữ ${requestedVin}`, `VIN ${requestedVin} được ghép cho ${currentUser} theo yêu cầu. Mã DMS: ${extractedMaDMS}, maDMSCol index: ${maDMSCol}`);
          } else {
            let errorMessage = `Không thể ghép xe ${requestedVin}: `;
            if (currentHolder !== currentUser) errorMessage += "Xe không phải do bạn giữ.";
            else if (!currentExpiry || new Date(currentExpiry) <= new Date()) errorMessage += "Lượt giữ xe đã hết hạn.";
            else if (currentStatus !== "Chưa ghép") errorMessage += `Xe đang ở trạng thái '${currentStatus}'.`;
            else errorMessage += "Lỗi không xác định.";
            Logger.log(`Lỗi khi ghép xe đã giữ: ${errorMessage}`);
            return createJsonResponse({ status: "ERROR", message: errorMessage });
          }
          break;
        }
      }
      if (!matchedCarInfo) {
        return createJsonResponse({ status: "ERROR", message: `Không tìm thấy xe với VIN ${requestedVin} trong kho.` });
      }
    } else {
      matchedCarInfo = matchCarAutomatically(newRow["Dòng xe"], newRow["Phiên bản"], newRow["Ngoại thất"], newRow["Nội thất"], stockSheet);
    }

    let targetSheet, headersToUse, emailSentSuccessfully = false;
    const orderDataForEmail = {
      ten_ban_hang: String(newRow["Tên tư vấn bán hàng"] || "").trim(),
      ten_khach_hang: String(newRow["Tên khách hàng"] || "").trim(),
      dong_xe: String(newRow["Dòng xe"] || "").trim(), phien_ban: String(newRow["Phiên bản"] || "").trim(),
      ngoai_that: String(newRow["Ngoại thất"] || "").trim(), noi_that: String(newRow["Nội thất"] || "").trim(),
      so_don_hang: String(newRow["Số đơn hàng"] || "").trim(), ngay_coc: newRow["Ngày cọc"],
      thoi_gian_nhap: newRow["Thời gian nhập"]
    };
    if (matchedCarInfo) {
      newRow["VIN"] = matchedCarInfo.vin;
      newRow["Kết quả"] = "Đã ghép";
      newRow["Thời gian ghép"] = formatDateTimeForSheet(currentTime);
      const targetRow = daGhepSheet.getLastRow() + 1;
      newRow["Số ngày ghép"] = `=IFERROR(DATEDIF(K${targetRow};TODAY();"D"))`;
      targetSheet = daGhepSheet;
      headersToUse = SHEET_HEADERS["DaGhep"];
      const emailResult = sendEmailNotification(mailSheet, orderDataForEmail, matchedCarInfo.vin, matchedCarInfo.maDMS, currentTime);
      emailSentSuccessfully = emailResult.success;

      // Cập nhật cột "Cảnh báo sai DMS" nếu có mismatch
      if (emailResult.dmsMismatch) {
        newRow["Cảnh báo sai DMS"] = "⚠️ Sai đầu DMS";
      } else {
        newRow["Cảnh báo sai DMS"] = "";
      }

      recordOrderHistory(orderDataForEmail.so_don_hang, matchedCarInfo.vin, "Ghép tự động", "Đã ghép VIN thành công", newRow);
      recordVehicleHistory(matchedCarInfo.vin, "Ghép tự động", `Ghép với đơn hàng ${orderDataForEmail.so_don_hang}`, newRow);
    } else {
      newRow["VIN"] = "";
      newRow["Kết quả"] = "Chưa ghép";
      newRow["Thời gian ghép"] = "";
      newRow["Số ngày ghép"] = "";
      targetSheet = chuaGhepSheet;
      headersToUse = SHEET_HEADERS["ChuaGhep"];
      emailSentSuccessfully = sendPendingEmail(mailSheet, orderDataForEmail, currentTime);
      recordOrderHistory(orderDataForEmail.so_don_hang, "", "Chờ ghép", "Chưa tìm thấy VIN phù hợp", newRow);
      const suggestionsResult = getSuggestionsForExistingData();
      if (suggestionsResult.status === "SUCCESS") {
        showToastOnSheet(`Đơn hàng đã được thêm vào danh sách chờ. ${suggestionsResult.message}`, "✅ Gợi ý Ghép xe", 10);
      }
    }
    newRow["Trạng thái gửi mail"] = emailSentSuccessfully ? "Đã gửi" : "Lỗi gửi";
    const rowData = headersToUse.map(header => newRow[header] || "");
    appendAndFormatRow(targetSheet, rowData);

    const waitingRequestId = e.parameter.waitingRequestId;
    if (waitingRequestId) {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const dangKyChoSheet = getOrCreateSheet(ss, DANG_KY_CHO_SHEET_NAME, SHEET_HEADERS["DangKyCho"]);
      const waitingData = dangKyChoSheet.getDataRange().getValues();
      const idCol = SHEET_HEADERS["DangKyCho"].indexOf("ID Yêu Cầu");
      for (let i = waitingData.length - 1; i >= 1; i--) {
        if (String(waitingData[i][idCol]).trim() === waitingRequestId) {
          dangKyChoSheet.deleteRow(i + 1);
          logAction("Dọn dẹp Yêu Cầu Chờ", `Đã xóa YC ID: ${waitingRequestId} sau khi hoàn tất ghép.`);
          break;
        }
      }
    }

    const ketQuaGhep = newRow["Kết quả"];
    const tvbhGhep = newRow["Tên tư vấn bán hàng"];
    const khachHangGhep = newRow["Tên khách hàng"];
    const xeGhep = `${newRow["Dòng xe"]} ${newRow["Phiên bản"]}`;
    const soDonHangGhep = newRow["Số đơn hàng"];
    const vinGhep = newRow["VIN"];
    const mauSacGhep = `${newRow["Ngoại thất"]} / ${newRow["Nội thất"]}`;

    let telegramMessageGhep = `📝 <b>Yêu Cầu Ghép Xe Mới</b>\n\n` +
      `👤 <b>TVBH:</b> ${tvbhGhep}\n` +
      `👨 <b>Khách hàng:</b> ${khachHangGhep}\n` +
      `🚗 <b>Loại xe:</b> ${xeGhep}\n` +
      `🎨 <b>Màu sắc:</b> ${mauSacGhep}\n` +
      `📄 <b>Số đơn hàng:</b> <code>${soDonHangGhep}</code>\n`;
    if (ketQuaGhep === "Đã ghép") {
      telegramMessageGhep += `✅ <b>Trạng thái:</b> Đã ghép thành công\n` +
        `🔢 <b>VIN:</b> <code>${vinGhep}</code>`;
    } else {
      telegramMessageGhep += `⏳ <b>Trạng thái:</b> Đang chờ ghép`;
    }
    sendTelegramNotification(telegramMessageGhep);
    return createJsonResponse({
      status: "SUCCESS",
      message: `Yêu cầu cho ĐH ${newRow["Số đơn hàng"]} đã được ghi nhận.`,
      orderNumber: newRow["Số đơn hàng"],
      newRecord: newRow
    });
    // <--- BẮT LỖI VÀ TRẢ VỀ PHẢN HỒI JSON
  } catch (err) {
    Logger.log(`Lỗi nghiêm trọng trong handleAddRequest: ${err.message}. Stack: ${err.stack}`);
    sendErrorAlert('handleAddRequest', err);
    return createJsonResponse({ status: "ERROR", message: `Lỗi phía máy chủ: ${err.message}` });
  }
}
function handleAddBulkRequests(e, chuaGhepSheet, daGhepSheet, stockSheet, mailSheet) {
  const requests = JSON.parse(e.parameter.requests);
  const consultantName = e.parameter.consultantName || "Unknown";
  const paramNameMap = {
    "Tên tư vấn bán hàng": "ten_ban_hang",
    "Tên khách hàng": "ten_khach_hang",
    "Dòng xe": "dong_xe",
    "Phiên bản": "phien_ban",
    "Ngoại thất": "ngoai_that",
    "Nội thất": "noi_that",
    "Số đơn hàng": "so_don_hang",
    "Ngày cọc": "ngay_coc"
  };
  const rowsForDaGhep = [];
  const rowsForChuaGhep = [];
  let pairedCount = 0;
  let unPairedCount = 0;
  const startRowForDaGhep = daGhepSheet.getLastRow() + 1;

  for (let i = 0; i < requests.length; i++) {
    const request = requests[i];
    const newRow = {};

    SHEET_HEADERS["DaGhep"].forEach(header => {
      const paramName = paramNameMap[header] || header.toLowerCase().replace(/ /g, '_').replace(/[\u0300-\u036f]/g, "");
      newRow[header] = request[paramName] || "";
    });
    newRow["Tên tư vấn bán hàng"] = consultantName;
    if (newRow["Ngày cọc"]) {
      newRow["Ngày cọc"] = formatDateTimeForSheet(new Date(newRow["Ngày cọc"]));
    }
    const currentTime = new Date();
    newRow["Thời gian nhập"] = formatDateTimeForSheet(currentTime);
    newRow["Ảnh UNC URL"] = "";
    const matchedCarInfo = matchCarAutomatically(newRow["Dòng xe"], newRow["Phiên bản"], newRow["Ngoại thất"], newRow["Nội thất"], stockSheet);
    let headersToUse;
    let emailSentSuccessfully = false;
    const orderDataForEmail = {
      ten_ban_hang: String(newRow["Tên tư vấn bán hàng"] || "").trim(),
      ten_khach_hang: String(newRow["Tên khách hàng"] || "").trim(),
      dong_xe: String(newRow["Dòng xe"] || "").trim(),
      phien_ban: String(newRow["Phiên bản"] || "").trim(),
      ngoai_that: String(newRow["Ngoại thất"] || "").trim(),
      noi_that: String(newRow["Nội thất"] || "").trim(),
      so_don_hang: String(newRow["Số đơn hàng"] || "").trim(),
      ngay_coc: newRow["Ngày cọc"],
      thoi_gian_nhap: newRow["Thời gian nhập"]
    };

    if (matchedCarInfo) {
      newRow["VIN"] = matchedCarInfo.vin;
      newRow["Kết quả"] = "Đã ghép";
      newRow["Thời gian ghép"] = formatDateTimeForSheet(currentTime);

      const targetRow = startRowForDaGhep + pairedCount;
      const thoiGianGhepColLetter = "K";
      newRow["Số ngày ghép"] = `=IFERROR(DATEDIF(${thoiGianGhepColLetter}${targetRow};TODAY();"D"))`;
      headersToUse = SHEET_HEADERS["DaGhep"];

      const emailResult = sendEmailNotification(mailSheet, orderDataForEmail, matchedCarInfo.vin, matchedCarInfo.maDMS, currentTime);
      emailSentSuccessfully = emailResult.success;

      // Cập nhật cột "Cảnh báo sai DMS" nếu có mismatch
      if (emailResult.dmsMismatch) {
        newRow["Cảnh báo sai DMS"] = "⚠️ Sai đầu DMS";
      } else {
        newRow["Cảnh báo sai DMS"] = "";
      }

      recordOrderHistory(orderDataForEmail.so_don_hang, matchedCarInfo.vin, "Ghép tự động (Bulk)", "Đã ghép VIN thành công từ nhập hàng loạt");
      recordVehicleHistory(matchedCarInfo.vin, "Ghép tự động (Bulk)", `Ghép với đơn hàng ${orderDataForEmail.so_don_hang} từ nhập hàng loạt`);
    } else {
      newRow["VIN"] = "";
      newRow["Kết quả"] = "Chưa ghép";
      newRow["Thời gian ghép"] = "";
      newRow["Số ngày ghép"] = "";

      headersToUse = SHEET_HEADERS["ChuaGhep"];
      emailSentSuccessfully = sendPendingEmail(mailSheet, orderDataForEmail, currentTime);
      recordOrderHistory(orderDataForEmail.so_don_hang, "", "Chờ ghép (Bulk)", "Chưa tìm thấy VIN phù hợp từ nhập hàng loạt");
    }

    newRow["Trạng thái gửi mail"] = emailSentSuccessfully ? "Đã gửi" : "Lỗi gửi";
    if (matchedCarInfo) {
      rowsForDaGhep.push(headersToUse.map(header => newRow[header] || ""));
      pairedCount++;
    } else {
      rowsForChuaGhep.push(headersToUse.map(header => newRow[header] || ""));
      unPairedCount++;
    }
  }

  if (rowsForDaGhep.length > 0) {
    daGhepSheet.getRange(daGhepSheet.getLastRow() + 1, 1, rowsForDaGhep.length, SHEET_HEADERS["DaGhep"].length).setValues(rowsForDaGhep);
  }
  if (rowsForChuaGhep.length > 0) {
    chuaGhepSheet.getRange(chuaGhepSheet.getLastRow() + 1, 1, rowsForChuaGhep.length, SHEET_HEADERS["ChuaGhep"].length).setValues(rowsForChuaGhep);
  }
  showToastOnSheet(`Đã thêm ${pairedCount + unPairedCount} yêu cầu ghép xe hàng loạt thành công! (${pairedCount} đã ghép, ${unPairedCount} chưa ghép)`, "Thành công");
  return createJsonResponse({ status: "SUCCESS", message: `Đã thêm ${pairedCount + unPairedCount} yêu cầu ghép xe hàng loạt thành công! (${pairedCount} đã ghép, ${unPairedCount} chưa ghép)` });
}
// [THAY THẾ TOÀN BỘ HÀM CŨ BẰNG HÀM NÀY]
function handleCancelRequest(e, sheets) {
  const { daGhepSheet, chuaGhepSheet, stockSheet, cancelledSheet, xuathoadonSheet } = sheets;
  const orderNumberToCancel = e.parameter.orderNumber;
  const cancelledBy = e.parameter.cancelledBy || "Unknown";
  const reason = e.parameter.reason || "Không có lý do được cung cấp";

  if (!orderNumberToCancel) {
    return { success: false, message: "Số đơn hàng cần hủy không được cung cấp." };
  }

  let vinAssociatedWithRequest = "";
  let daghepRowDataForRevert = null;
  if (xuathoadonSheet) {
    const xuathoadonData = xuathoadonSheet.getDataRange().getValues();
    const xuathoadonHeaders = SHEET_HEADERS["Xuathoadon"];
    const orderNumberColXHD = xuathoadonHeaders.indexOf("SỐ ĐƠN HÀNG");
    const vinColXHD = xuathoadonHeaders.indexOf("SỐ VIN");
    if (orderNumberColXHD !== -1) {
      for (let i = xuathoadonData.length - 1; i >= 1; i--) {
        if (String(xuathoadonData[i][orderNumberColXHD]).trim() === String(orderNumberToCancel).trim()) {
          vinAssociatedWithRequest = String(xuathoadonData[i][vinColXHD] || "").trim();
          xuathoadonSheet.deleteRow(i + 1);
          logAction('Xóa khỏi Xuathoadon (Hủy)', `Đã xóa đơn hàng ${orderNumberToCancel} khỏi sheet Xuathoadon.`);
          updateSerialNumbers(xuathoadonSheet);
          break;
        }
      }
    }
  }

  if (vinAssociatedWithRequest) {
    const daGhepData = daGhepSheet.getDataRange().getValues();
    const daGhepHeaders = daGhepData[0];
    const vinColDaghep = daGhepHeaders.indexOf("VIN");
    const ketQuaColDaghep = daGhepHeaders.indexOf("Kết quả");
    for (let i = 1; i < daGhepData.length; i++) {
      if (String(daGhepData[i][vinColDaghep]).trim() === vinAssociatedWithRequest) {
        daGhepSheet.getRange(i + 1, ketQuaColDaghep + 1).setValue("Đã ghép");
        logAction('Hoàn tác trạng thái DaGhep', `Đơn hàng ${orderNumberToCancel} được trả về trạng thái 'Đã ghép'.`);
        daghepRowDataForRevert = daGhepData[i];
        break;
      }
    }
  }

  let sourceSheet = null;
  let rowIndexToDelete = -1;
  let rowDataToMove = null;
  let headers = null;
  const searchInSheet = (sheet, sheetHeaders) => {
    const data = sheet.getDataRange().getValues();
    const orderCol = sheetHeaders.indexOf("Số đơn hàng");
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][orderCol] || "").trim() === String(orderNumberToCancel).trim()) {
        sourceSheet = sheet;
        rowIndexToDelete = i + 1;
        rowDataToMove = data[i];
        headers = sheetHeaders;
        return true;
      }
    }
    return false;
  };
  searchInSheet(daGhepSheet, daGhepSheet.getRange(1, 1, 1, daGhepSheet.getLastColumn()).getValues()[0]);
  if (!sourceSheet) {
    searchInSheet(chuaGhepSheet, chuaGhepSheet.getRange(1, 1, 1, chuaGhepSheet.getLastColumn()).getValues()[0]);
  }

  if (sourceSheet && rowIndexToDelete > -1) {
    const vinCol = headers.indexOf("VIN");
    const vinToRevert = (vinCol !== -1) ? String(rowDataToMove[vinCol] || "").trim() : "";
    if (vinToRevert && vinToRevert.toLowerCase() !== "hủy") {
      updateKhoxeStatusForVin(stockSheet, vinToRevert, "Chưa ghép");
      recordVehicleHistory(vinToRevert, `Hủy đơn hàng`, `Hủy đơn hàng ${orderNumberToCancel}, VIN về 'Chưa ghép'`);
    }
    const cancelledSheetHeaders = cancelledSheet.getRange(1, 1, 1, cancelledSheet.getLastColumn()).getValues()[0];
    const cancelledRowForHuyGhep = {};
    cancelledSheetHeaders.forEach(header => {
      const originalHeaderIndex = headers.indexOf(header);
      if (originalHeaderIndex !== -1) {
        cancelledRowForHuyGhep[header] = rowDataToMove[originalHeaderIndex];
      }
    });
    cancelledRowForHuyGhep["Người hủy"] = cancelledBy;
    cancelledRowForHuyGhep["Thời gian hủy"] = new Date();
    cancelledRowForHuyGhep["Kết quả"] = `Đã hủy (Lý do: ${reason})`;
    const cancelledRowDataForHuyGhep = cancelledSheetHeaders.map(header => cancelledRowForHuyGhep[header] || "");
    appendAndFormatRow(cancelledSheet, cancelledRowDataForHuyGhep);
    sourceSheet.deleteRow(rowIndexToDelete);
  } else if (!daghepRowDataForRevert) {
    return { success: false, message: `Không tìm thấy đơn hàng ${orderNumberToCancel} trong các sheet hoạt động.` };
  }

  const emailData = {
    ten_ban_hang: rowDataToMove ? String(rowDataToMove[headers.indexOf("Tên tư vấn bán hàng")] || "").trim() : "",
    ten_khach_hang: rowDataToMove ? String(rowDataToMove[headers.indexOf("Tên khách hàng")] || "").trim() : "",
    dong_xe: rowDataToMove ? String(rowDataToMove[headers.indexOf("Dòng xe")] || "").trim() : "",
    so_don_hang: orderNumberToCancel,
  };

  // ===== BẮT ĐẦU THAY ĐỔI =====
  // Gửi thông báo Telegram khi hủy đơn hàng
  if (rowDataToMove) {
    const tenKhachHangHuy = rowDataToMove[headers.indexOf("Tên khách hàng")];
    const dongXeHuy = `${rowDataToMove[headers.indexOf("Dòng xe")]} ${rowDataToMove[headers.indexOf("Phiên bản")]}`;
    const mauSacHuy = `${rowDataToMove[headers.indexOf("Ngoại thất")]} / ${rowDataToMove[headers.indexOf("Nội thất")]}`;
    const vinHuy = rowDataToMove[headers.indexOf("VIN")] || "Chưa có";

    const telegramMessageHuyDon = `❌ <b>Đơn Hàng Đã Bị Hủy</b>\n\n` +
      `👤 <b>Người hủy:</b> ${cancelledBy}\n` +
      `📝 <b>Lý do:</b> <i>${reason}</i>\n\n` +
      `--- Thông Tin Đơn Hàng ---\n` +
      `👨 <b>Khách hàng:</b> ${tenKhachHangHuy}\n` +
      `📄 <b>Số đơn hàng:</b> <code>${orderNumberToCancel}</code>\n` +
      `🚗 <b>Loại xe:</b> ${dongXeHuy}\n` +
      `🎨 <b>Màu sắc:</b> ${mauSacHuy}\n` +
      `🔢 <b>VIN đã ghép (nếu có):</b> <code>${vinHuy}</code>`;
    sendTelegramNotification(telegramMessageHuyDon);
  }
  // ===== KẾT THÚC THAY ĐỔI =====

  return {
    success: true,
    message: `Đơn hàng ${orderNumberToCancel} đã được hủy thành công.`,
    orderNumber: orderNumberToCancel,
    vin: vinAssociatedWithRequest || (rowDataToMove ? String(rowDataToMove[headers.indexOf("VIN")] || "").trim() : ""),
    reason: reason,
    emailData: emailData
  };
}

// Thay thế toàn bộ hàm getAllSheetData cũ bằng hàm này
function handleVcRequestApproval(orderNumber, isApproved, adminUser, reason = "") {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheets = getSheets(ss);
  const { daGhepSheet, yeuCauVcSheet } = sheets;

  const vcData = yeuCauVcSheet.getDataRange().getValues();
  const vcHeaders = vcData[0];
  const vcOrderCol = vcHeaders.indexOf("Số đơn hàng");
  const vcStatusCol = vcHeaders.indexOf("Trạng thái xử lý");
  const vcGhiChuCol = vcHeaders.indexOf("Ghi chú");
  const vcNguoiYcCol = vcHeaders.indexOf("Người YC");

  let vcRowIndex = -1;
  let nguoiYc = "";
  for (let i = 1; i < vcData.length; i++) {
    if (String(vcData[i][vcOrderCol]).trim() === orderNumber) {
      vcRowIndex = i + 1;
      nguoiYc = vcData[i][vcNguoiYcCol];
      break;
    }
  }

  if (vcRowIndex === -1) {
    throw new Error(`Không tìm thấy Yêu cầu VC cho đơn hàng ${orderNumber}.`);
  }

  const newVcStatus = isApproved ? "Đã phê duyệt" : "Từ chối ycvc";
  yeuCauVcSheet.getRange(vcRowIndex, vcStatusCol + 1).setValue(newVcStatus);
  if (!isApproved) {
    yeuCauVcSheet.getRange(vcRowIndex, vcGhiChuCol + 1).setValue(reason);
  }

  // Tìm đơn hàng để cập nhật trạng thái VC (trong DaGhep, Xuathoadon hoặc Lưu trữ)
  let foundOrder = null;

  // 1. Tìm trong DaGhep
  if (daGhepSheet) {
    const daGhepHeaders = SHEET_HEADERS["DaGhep"];
    const daGhepIndices = {
      order: daGhepHeaders.indexOf("Số đơn hàng"),
      customerName: daGhepHeaders.indexOf("Tên khách hàng"),
      tvbh: daGhepHeaders.indexOf("Tên tư vấn bán hàng"),
      vin: daGhepHeaders.indexOf("VIN")
    };
    foundOrder = findOrderInSheet(daGhepSheet, orderNumber, daGhepIndices);
  }

  // 2. Tìm trong Xuathoadon nếu chưa thấy
  if (!foundOrder) {
    const xuathoadonSheet = ss.getSheetByName(XUAT_HOA_DON_SHEET_NAME);
    if (xuathoadonSheet) {
      const xhdHeaders = SHEET_HEADERS["Xuathoadon"];
      const xhdIndices = {
        order: xhdHeaders.indexOf("SỐ ĐƠN HÀNG"),
        customerName: xhdHeaders.indexOf("TÊN KHÁCH HÀNG"),
        tvbh: xhdHeaders.indexOf("TƯ VẤN BÁN HÀNG"),
        vin: xhdHeaders.indexOf("SỐ VIN")
      };
      foundOrder = findOrderInSheet(xuathoadonSheet, orderNumber, xhdIndices);
    }
  }

  // 3. Tìm trong Lưu trữ nếu chưa thấy
  if (!foundOrder) {
    const allSheets = ss.getSheets();
    const xhdHeaders = SHEET_HEADERS["Xuathoadon"];
    const archiveIndices = {
      order: xhdHeaders.indexOf("SỐ ĐƠN HÀNG"),
      customerName: xhdHeaders.indexOf("TÊN KHÁCH HÀNG"),
      tvbh: xhdHeaders.indexOf("TƯ VẤN BÁN HÀNG"),
      vin: xhdHeaders.indexOf("SỐ VIN")
    };
    for (const sheet of allSheets) {
      const sName = sheet.getName();
      if (sName.startsWith("LuuTru")) {
        foundOrder = findOrderInSheet(sheet, orderNumber, archiveIndices);
        if (foundOrder) break;
      }
    }
  }

  let vin = "";
  if (foundOrder) {
    const { sheet: sourceSheet, orderRowIndex, vin: foundVin } = foundOrder;
    vin = foundVin;
    const sourceHeaders = sourceSheet.getDataRange().getValues()[0];
    const trangThaiVcCol = sourceHeaders.indexOf("Trạng thái VC");
    if (trangThaiVcCol !== -1) {
      const newDaGhepStatus = isApproved ? "Đã cấp VC" : "Từ chối VC";
      sourceSheet.getRange(orderRowIndex, trangThaiVcCol + 1).setValue(newDaGhepStatus);
    }
  } else {
    // Fallback nếu không tìm thấy trong sheet nhưng vẫn có trong YeuCauVC
    const vcOrderColIdx = vcHeaders.indexOf("Số đơn hàng");
    const vcVinColIdx = vcHeaders.indexOf("VIN");
    if (vcVinColIdx !== -1) {
      vin = vcData[vcRowIndex - 1][vcVinColIdx];
    }
  }

  const actionLog = isApproved ? "Phê duyệt Yêu cầu VinClub" : "Từ chối Yêu cầu VinClub";
  const detailsLog = isApproved ? `Phê duyệt bởi ${adminUser}` : `Từ chối bởi ${adminUser}. Lý do: ${reason}`;
  recordOrderHistory(orderNumber, vin, actionLog, detailsLog);

  const notifType = isApproved ? 'success' : 'danger';
  const notifMessage = isApproved
    ? `Yêu cầu VinClub cho ĐH ${orderNumber} đã được phê duyệt. Vui lòng vào web để xác nhận UNC.`
    : `Yêu cầu VinClub cho ĐH ${orderNumber} đã bị từ chối. Lý do: ${reason}`;
  addNotification(notifMessage, notifType, 'vc', orderNumber, adminUser, nguoiYc);

  return createJsonResponse({ status: "SUCCESS", message: `Đã ${isApproved ? 'phê duyệt' : 'từ chối'} yêu cầu thành công.` });
}

/**
 * Xử lý khi TVBH xác nhận đã nhận UNC cho yêu cầu VinClub
 */
function handleConfirmVcUnc(e) {
  const orderNumber = e.parameter.orderNumber;
  const user = e.parameter.updatedBy; // Lấy từ apiService.performAdminAction

  if (!user || !orderNumber) {
    throw new Error("Thiếu thông tin để xác nhận UNC.");
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Tìm đơn hàng trong DaGhep, Xuathoadon hoặc Lưu trữ
  let foundOrder = null;

  // 1. Tìm trong DaGhep
  const daGhepSheet = ss.getSheetByName(DA_GHEP_SHEET_NAME);
  if (daGhepSheet) {
    const daGhepIndices = { order: SHEET_HEADERS["DaGhep"].indexOf("Số đơn hàng") };
    foundOrder = findOrderInSheet(daGhepSheet, orderNumber, daGhepIndices);
  }

  // 2. Tìm trong Xuathoadon
  if (!foundOrder) {
    const xuathoadonSheet = ss.getSheetByName(XUAT_HOA_DON_SHEET_NAME);
    if (xuathoadonSheet) {
      const xhdIndices = { order: SHEET_HEADERS["Xuathoadon"].indexOf("SỐ ĐƠN HÀNG") };
      foundOrder = findOrderInSheet(xuathoadonSheet, orderNumber, xhdIndices);
    }
  }

  // 3. Tìm trong Lưu trữ
  if (!foundOrder) {
    const allSheets = ss.getSheets();
    const archiveIndices = { order: SHEET_HEADERS["Xuathoadon"].indexOf("SỐ ĐƠN HÀNG") };
    for (const sheet of allSheets) {
      const sName = sheet.getName();
      if (sName.startsWith("LuuTru")) {
        foundOrder = findOrderInSheet(sheet, orderNumber, archiveIndices);
        if (foundOrder) break;
      }
    }
  }

  if (!foundOrder) {
    throw new Error(`Không tìm thấy đơn hàng ${orderNumber} trong hệ thống.`);
  }

  const { sheet: sourceSheet, orderRowIndex } = foundOrder;
  const sourceHeaders = sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues()[0];
  const trangThaiVcIdx = sourceHeaders.indexOf("Trạng thái VC");
  const vinIdx = sourceHeaders.indexOf("VIN");

  if (trangThaiVcIdx === -1) {
    throw new Error("Sheet không có cột 'Trạng thái VC'.");
  }

  const currentStatus = String(sourceSheet.getRange(orderRowIndex, trangThaiVcIdx + 1).getValue()).trim();
  if (currentStatus !== "Chờ xác thực vc (tvbh)") {
    throw new Error(`Hành động không hợp lệ. Trạng thái hiện tại là '${currentStatus}'.`);
  }

  // Cập nhật trạng thái trong sheet đơn hàng
  sourceSheet.getRange(orderRowIndex, trangThaiVcIdx + 1).setValue("Đã cấp VC");
  const vin = vinIdx !== -1 ? sourceSheet.getRange(orderRowIndex, vinIdx + 1).getValue() : "";

  // Cập nhật trạng thái trong sheet YeuCauVC cho đồng bộ
  const yeuCauVcSheet = ss.getSheetByName(YEU_CAU_VC_SHEET_NAME);
  if (yeuCauVcSheet) {
    const vcData = yeuCauVcSheet.getDataRange().getValues();
    const vcHeaders = vcData[0];
    const vcOrderColIdx = vcHeaders.indexOf("Số đơn hàng");
    const vcStatusColIdx = vcHeaders.indexOf("Trạng thái xử lý");
    if (vcOrderColIdx !== -1 && vcStatusColIdx !== -1) {
      for (let i = vcData.length - 1; i >= 1; i--) {
        if (String(vcData[i][vcOrderColIdx]).trim() === orderNumber) {
          yeuCauVcSheet.getRange(i + 1, vcStatusColIdx + 1).setValue("Đã hoàn thành");
          break;
        }
      }
    }
  }

  recordOrderHistory(orderNumber, vin, "TVBH Xác nhận UNC VinClub", `Xác nhận bởi: ${user}`);
  addNotification(`${user} đã xác nhận UNC VinClub cho ĐH ${orderNumber}.`, 'success', 'vc', orderNumber, user, ADMIN_EMAIL);
  sendTelegramNotification(`✅ <b>TVBH Đã Xác Nhận UNC VinClub</b>\n\n👤 <b>TVBH:</b> ${user}\n📄 <b>SĐH:</b> <code>${orderNumber}</code>`);

  return createJsonResponse({ status: "SUCCESS", message: "Xác nhận thành công." });
}
function handleRequestInvoice(e, daGhepSheet, mailSheet, xuathoadonSheet, thongtinxeSheet, stockSheet) {
  Logger.log("--- BẮT ĐẦU handleRequestInvoice (PHIÊN BẢN CÓ CHÍNH SÁCH & VPOINT - CẬP NHẬT MỚI) ---");
  try {
    const orderNumber = e.parameter.orderNumber;
    const requestedBy = e.parameter.requestedBy || "Không xác định";
    const hopDongBase64String = e.parameter.hop_dong_file_base64;
    const hopDongName = e.parameter.hop_dong_file_name;
    const deNghiBase64String = e.parameter.denghi_xhd_file_base64;
    const deNghiName = e.parameter.denghi_xhd_file_name;
    const requestDate = new Date();

    // --- THAY ĐỔI BẮT ĐẦU: Lấy dữ liệu chính sách, hoa hồng và vpoint từ web app ---
    const policyContent = e.parameter.policy || ""; // Nội dung chính sách trực tiếp
    const commissionAmount = e.parameter.commission || ""; // Hoa hồng ứng
    const vpointAmount = e.parameter.vpoint || ""; // Điểm Vpoint
    // --- THAY ĐỔI KẾT THÚC ---

    if (!hopDongBase64String || !deNghiBase64String) {
      return createJsonResponse({ status: "ERROR", message: "Không nhận được nội dung file Hợp đồng hoặc Đề nghị XHĐ." });
    }
    if (!orderNumber) {
      return createJsonResponse({ status: "ERROR", message: "Số đơn hàng không được cung cấp." });
    }
    const hopDongBlob = Utilities.newBlob(Utilities.base64Decode(hopDongBase64String.split(',')[1]), MimeType.PDF, hopDongName);
    const deNghiBlob = Utilities.newBlob(Utilities.base64Decode(deNghiBase64String.split(',')[1]), MimeType.PDF, deNghiName);

    const daghepData = daGhepSheet.getDataRange().getValues();
    const daghepHeaders = SHEET_HEADERS["DaGhep"];
    const soDonHangColDaghep = daghepHeaders.indexOf("Số đơn hàng");
    const vinColDaghep = daghepHeaders.indexOf("VIN");
    const ketQuaColDaghep = daghepHeaders.indexOf("Kết quả");
    let invoiceDataFromDaghep = null;
    let vin = null;
    let daghepRowIndex = -1;

    for (let i = 1; i < daghepData.length; i++) {
      if (String(daghepData[i][soDonHangColDaghep] || "").trim() === orderNumber) {
        invoiceDataFromDaghep = {};
        daghepHeaders.forEach((header, index) => { invoiceDataFromDaghep[header] = daghepData[i][index]; });
        vin = String(daghepData[i][vinColDaghep] || "").trim();
        daghepRowIndex = i + 1;
        break;
      }
    }
    if (!invoiceDataFromDaghep || !vin) {
      return createJsonResponse({ status: "ERROR", message: `Không tìm thấy số đơn hàng '${orderNumber}' hoặc đơn hàng chưa được ghép VIN.` });
    }
    const currentStatus = String(invoiceDataFromDaghep["Kết quả"]).trim().normalize('NFC');
    if (currentStatus !== "Đã ghép") {
      return createJsonResponse({ status: "ERROR", message: `Chỉ có thể yêu cầu xuất hóa đơn cho đơn hàng có trạng thái 'Đã ghép'. Trạng thái hiện tại: '${invoiceDataFromDaghep["Kết quả"]}'.` });
    }

    const xuathoadonData = xuathoadonSheet.getDataRange().getValues();
    const xuathoadonHeaders = SHEET_HEADERS["Xuathoadon"];
    const soDonHangColXHD = xuathoadonHeaders.indexOf("SỐ ĐƠN HÀNG");
    const vinColXHD = xuathoadonHeaders.indexOf("SỐ VIN");

    for (let i = 1; i < xuathoadonData.length; i++) {
      const existingOrder = String(xuathoadonData[i][soDonHangColXHD] || "").trim();
      const existingVin = String(xuathoadonData[i][vinColXHD] || "").trim();
      if (existingOrder === orderNumber || (vin && existingVin === vin)) {
        return createJsonResponse({ status: "ERROR", message: `Đơn hàng '${orderNumber}' hoặc VIN '${vin}' đã tồn tại trong danh sách chờ xuất hóa đơn.` });
      }
    }
    if (daghepRowIndex !== -1) {
      daGhepSheet.getRange(daghepRowIndex, ketQuaColDaghep + 1).setValue("Chờ phê duyệt");
    }
    const soDongCo = getEngineNumberForVin(thongtinxeSheet, vin);
    const customerName = invoiceDataFromDaghep["Tên khách hàng"] || "KHONG_RO";

    const hopDongResult = saveFileToDrive(hopDongBlob, orderNumber, 'HDMB', customerName, requestDate);
    const deNghiResult = saveFileToDrive(deNghiBlob, orderNumber, 'DNXHD', customerName, requestDate);

    const newXuathoadonRow = xuathoadonHeaders.map(header => {
      switch (header) {
        case "SỐ TT": return "";
        case "TÊN KHÁCH HÀNG": return invoiceDataFromDaghep["Tên khách hàng"];
        case "SỐ ĐƠN HÀNG": return orderNumber;
        case "DÒNG XE": return invoiceDataFromDaghep["Dòng xe"];
        case "PHIÊN BẢN": return invoiceDataFromDaghep["Phiên bản"];
        case "NGOẠI THẤT": return invoiceDataFromDaghep["Ngoại thất"];
        case "NỘI THẤT": return invoiceDataFromDaghep["Nội thất"];
        case "TƯ VẤN BÁN HÀNG": return invoiceDataFromDaghep["Tên tư vấn bán hàng"];
        case "SỐ VIN": return vin;
        case "SỐ ĐỘNG CƠ": return soDongCo;
        case "NGÀY CỌC": return invoiceDataFromDaghep["Ngày cọc"];
        case "NGÀY YÊU CẦU XHĐ": return requestDate;
        case "KẾT QUẢ GỬI MAIL": return "";

        // --- MAPPING 3 TRƯỜNG MỚI/CẬP NHẬT ---
        case "Hoa hồng ứng": return commissionAmount;
        case "Điểm Vpoint sử dụng": return vpointAmount;
        case "CHÍNH SÁCH": return policyContent;
        case "Trạng thái VC": return invoiceDataFromDaghep["Trạng thái VC"] || "";
        // -------------------------------------

        default: return "";
      }
    });

    let rowToInsert = -1;
    for (let i = 1; i < xuathoadonData.length; i++) {
      if (!xuathoadonData[i][soDonHangColXHD] || String(xuathoadonData[i][soDonHangColXHD]).trim() === "") {
        rowToInsert = i + 1;
        break;
      }
    }
    if (rowToInsert === -1) {
      rowToInsert = xuathoadonSheet.getLastRow() + 1;
    }

    Logger.log(`Sẽ chèn dữ liệu yêu cầu hóa đơn vào hàng: ${rowToInsert}`);
    xuathoadonSheet.getRange(rowToInsert, 1, 1, newXuathoadonRow.length).setValues([newXuathoadonRow]);

    const urlHopDongCol = xuathoadonHeaders.indexOf("URL Hợp Đồng") + 1;
    const urlDeNghiCol = xuathoadonHeaders.indexOf("URL Đề Nghị XHĐ") + 1;

    if (urlHopDongCol > 0 && hopDongResult && hopDongResult.formula) {
      xuathoadonSheet.getRange(rowToInsert, urlHopDongCol).setFormula(hopDongResult.formula);
    }
    if (urlDeNghiCol > 0 && deNghiResult && deNghiResult.formula) {
      xuathoadonSheet.getRange(rowToInsert, urlDeNghiCol).setFormula(deNghiResult.formula);
    }

    updateSerialNumbers(xuathoadonSheet);

    const emailData = {
      ten_ban_hang: invoiceDataFromDaghep["Tên tư vấn bán hàng"],
      so_don_hang: orderNumber,
      ten_khach_hang: customerName,
      vin: vin,
      policy: policyContent,
      commission: commissionAmount,
      vpoint: vpointAmount,
      attachments: [hopDongBlob, deNghiBlob] // Đính kèm file TVBH vừa gửi
    };
    sendInvoiceRequestConfirmationEmailToTVBH(mailSheet, emailData);
    recordOrderHistory(orderNumber, vin, "Yêu cầu xuất hóa đơn", `Đơn hàng được chuyển sang danh sách chờ bởi ${requestedBy}`);
    logAction("Yêu cầu xuất hóa đơn", `Đã chuyển đơn hàng ${orderNumber} (VIN: ${vin}) vào sheet Xuathoadon.`);

    const tvbhNotificationMessage = `Yêu cầu XHĐ của bạn cho ĐH ${orderNumber} đã được gửi thành công.`;
    addNotification(tvbhNotificationMessage, 'success', 'xuatHoaDon', orderNumber, requestedBy, requestedBy);

    const adminNotificationMessage = `${requestedBy} đã gửi yêu cầu XHĐ cho ĐH ${orderNumber}.`;
    addNotification(adminNotificationMessage, 'info', 'xuatHoaDon', orderNumber, requestedBy, ADMIN_EMAIL);

    const telegramMessage = `📄 <b>Yêu Cầu Xuất Hóa Đơn Mới</b>\n\n` +
      `👤 <b>TVBH:</b> ${requestedBy}\n` +
      `👨 <b>Khách hàng:</b> ${customerName}\n` +
      `🚗 <b>Xe:</b> ${invoiceDataFromDaghep["Dòng xe"]} ${invoiceDataFromDaghep["Phiên bản"]}\n` +
      `🎨 <b>Màu sắc:</b> ${invoiceDataFromDaghep["Ngoại thất"]} / ${invoiceDataFromDaghep["Nội thất"]}\n` +
      `📄 <b>SĐH:</b> <code>${orderNumber}</code>\n` +
      `🔢 <b>VIN:</b> <code>${vin}</code>\n\n` +
      `<b>Trạng thái:</b> Chờ phê duyệt`;
    const keyboard = [[
      { text: "✅ Phê Duyệt", callback_data: `approve:${orderNumber}` },
      { text: "⚠️ Y/C Bổ Sung", callback_data: `req_supp:${orderNumber}` },
    ]];
    sendTelegramMessage(telegramMessage, keyboard);

    if (hopDongResult && hopDongResult.finalName) {
      hopDongBlob.setName(hopDongResult.finalName);
      sendTelegramDocument(hopDongBlob, `<i>File Hợp đồng cho SĐH: ${orderNumber}</i>`);
    }
    if (deNghiResult && deNghiResult.finalName) {
      deNghiBlob.setName(deNghiResult.finalName);
      sendTelegramDocument(deNghiBlob, `<i>File Đề nghị XHĐ cho SĐH: ${orderNumber}</i>`);
    }

    // Trích xuất URL thực từ công thức HYPERLINK để trả về frontend
    let urlHopDong = '';
    let urlDeNghi = '';
    try {
      if (hopDongResult && hopDongResult.formula) {
        const m = hopDongResult.formula.match(/=HYPERLINK\("([^"]+)"/i);
        if (m) urlHopDong = m[1];
      }
      if (deNghiResult && deNghiResult.formula) {
        const m = deNghiResult.formula.match(/=HYPERLINK\("([^"]+)"/i);
        if (m) urlDeNghi = m[1];
      }
    } catch (urlErr) { Logger.log('Lỗi trích URL: ' + urlErr.message); }

    return createJsonResponse({
      status: "SUCCESS",
      message: `Đã chuyển đơn hàng ${orderNumber} vào danh sách chờ xuất hóa đơn.`,
      url_hop_dong: urlHopDong,
      url_de_nghi_xhd: urlDeNghi,
      vin: vin,
      ten_khach_hang: invoiceDataFromDaghep["Tên khách hàng"] || "",
      tvbh: invoiceDataFromDaghep["Tên tư vấn bán hàng"] || "",
      dong_xe: invoiceDataFromDaghep["Dòng xe"] || "",
      phien_ban: invoiceDataFromDaghep["Phiên bản"] || "",
      ngoai_that: invoiceDataFromDaghep["Ngoại thất"] || "",
      noi_that: invoiceDataFromDaghep["Nội thất"] || "",
      ngay_coc: invoiceDataFromDaghep["Ngày cọc"] ? new Date(invoiceDataFromDaghep["Ngày cọc"]).toISOString() : ""
    });

  } catch (err) {
    Logger.log("Lỗi nghiêm trọng trong handleRequestInvoice (Base64): " + err.toString());
    return createJsonResponse({ status: "ERROR", message: "Lỗi máy chủ khi xử lý: " + err.message });
  }
}
function handleUpdateInvoiceFiles(e) {
  const orderNumber = e.parameter.orderNumber;
  Logger.log(`Bắt đầu handleUpdateInvoiceFiles cho đơn hàng: ${orderNumber}`);
  try {
    const updatedBy = e.parameter.updatedBy || "Không xác định";
    if (!orderNumber) {
      throw new Error("Lỗi nghiêm trọng: Số đơn hàng không được cung cấp.");
    }
    Logger.log(`Yêu cầu bởi: ${updatedBy}`);
    const hopDongBase64String = e.parameter.hop_dong_file_base64;
    const hopDongName = e.parameter.hop_dong_file_name;
    const deNghiBase64String = e.parameter.denghi_xhd_file_base64;
    const deNghiName = e.parameter.denghi_xhd_file_name;
    if (!hopDongBase64String && !deNghiBase64String) {
      throw new Error("Không có file nào được cung cấp để cập nhật.");
    }
    Logger.log(`File HĐMB được cung cấp: ${!!hopDongName}, File ĐNXHĐ được cung cấp: ${!!deNghiName}`);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const xuathoadonSheet = getOrCreateSheet(ss, XUAT_HOA_DON_SHEET_NAME, SHEET_HEADERS["Xuathoadon"]);
    const data = xuathoadonSheet.getDataRange().getValues();
    const headers = data[0];
    const soDonHangCol = headers.indexOf("SỐ ĐƠN HÀNG");
    const urlHdCol = headers.indexOf("URL Hợp Đồng");
    const urlDnxhdCol = headers.indexOf("URL Đề Nghị XHĐ");
    const customerNameCol = headers.indexOf("TÊN KHÁCH HÀNG");
    const vinCol = headers.indexOf("SỐ VIN");
    const requestDateCol = headers.indexOf("NGÀY YÊU CẦU XHĐ");

    // ===== BẮT ĐẦU THAY ĐỔI 1: Lấy thêm thông tin màu sắc từ sheet Xuathoadon =====
    const ngoaiThatCol = headers.indexOf("NGOẠI THẤT");
    const noiThatCol = headers.indexOf("NỘI THẤT");
    // ===== KẾT THÚC THAY ĐỔI 1 =====

    if ([soDonHangCol, urlHdCol, urlDnxhdCol, customerNameCol, vinCol, requestDateCol].some(col => col === -1)) {
      throw new Error("Một hoặc nhiều cột cần thiết ('SỐ ĐƠN HÀNG', 'URL Hợp Đồng', 'URL Đề Nghị XHĐ', 'TÊN KHÁCH HÀNG', 'SỐ VIN', 'NGÀY YÊU CẦU XHĐ') không tồn tại trong sheet Xuathoadon.");
    }
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][soDonHangCol]).trim() === orderNumber) {
        rowIndex = i + 1;
        break;
      }
    }
    if (rowIndex === -1) {
      throw new Error(`Không tìm thấy đơn hàng '${orderNumber}' trong danh sách xuất hóa đơn.`);
    }
    Logger.log(`Tìm thấy đơn hàng '${orderNumber}' tại dòng ${rowIndex}`);
    const rowData = data[rowIndex - 1];
    const customerName = rowData[customerNameCol] || "KHONG_RO";
    const vin = rowData[vinCol] || "";
    const originalRequestDate = rowData[requestDateCol] ? new Date(rowData[requestDateCol]) : null;

    let filesUpdatedLog = [];

    // ===== BẮT ĐẦU THAY ĐỔI 2: Xây dựng caption với thông tin màu sắc =====
    const captionBaseTelegram = `📤 <b>TVBH Đã Bổ Sung Hồ Sơ</b>\n\n` +
      `👤 <b>Người TH:</b> ${updatedBy}\n` +
      `👨 <b>Khách hàng:</b> ${customerName}\n` +
      `🎨 <b>Màu sắc:</b> ${rowData[ngoaiThatCol]} / ${rowData[noiThatCol]}\n` +
      `📄 <b>SĐH:</b> <code>${orderNumber}</code>\n` +
      `🔢 <b>VIN:</b> <code>${vin}</code>\n\n`;
    // ===== KẾT THÚC THAY ĐỔI 2 =====

    if (hopDongBase64String && hopDongName) {
      Logger.log("Đang xử lý Hợp đồng mua bán...");
      const oldHdFormula = xuathoadonSheet.getRange(rowIndex, urlHdCol + 1).getFormula();
      deleteDriveFileFromFormula(oldHdFormula, orderNumber, "HĐMB cũ");
      const hopDongBlob = Utilities.newBlob(Utilities.base64Decode(hopDongBase64String.split(',')[1]), MimeType.PDF, hopDongName);
      const newHdResult = saveFileToDrive(hopDongBlob, orderNumber, 'HDMB', customerName, originalRequestDate);

      if (newHdResult && newHdResult.formula) {
        xuathoadonSheet.getRange(rowIndex, urlHdCol + 1).setFormula(newHdResult.formula);
        filesUpdatedLog.push("Hợp đồng mua bán");
        hopDongBlob.setName(newHdResult.finalName);
        sendTelegramDocument(hopDongBlob, captionBaseTelegram + `<i>File: Hợp Đồng Mua Bán (Mới)</i>`);
        Logger.log("Đã cập nhật thành công file Hợp đồng mua bán.");
      } else {
        throw new Error("Lỗi khi lưu file Hợp đồng mua bán mới lên Drive.");
      }
    }
    if (deNghiBase64String && deNghiName) {
      Logger.log("Đang xử lý Đề nghị XHĐ...");
      const oldDnxhdFormula = xuathoadonSheet.getRange(rowIndex, urlDnxhdCol + 1).getFormula();
      deleteDriveFileFromFormula(oldDnxhdFormula, orderNumber, "ĐNXHĐ cũ");
      const deNghiBlob = Utilities.newBlob(Utilities.base64Decode(deNghiBase64String.split(',')[1]), MimeType.PDF, deNghiName);
      const newDnxhdResult = saveFileToDrive(deNghiBlob, orderNumber, 'DNXHD', customerName, originalRequestDate);

      if (newDnxhdResult && newDnxhdResult.formula) {
        xuathoadonSheet.getRange(rowIndex, urlDnxhdCol + 1).setFormula(newDnxhdResult.formula);
        filesUpdatedLog.push("Đề nghị XHĐ");
        deNghiBlob.setName(newDnxhdResult.finalName);
        sendTelegramDocument(deNghiBlob, captionBaseTelegram + `<i>File: Đề Nghị Xuất Hóa Đơn (Mới)</i>`);
        Logger.log("Đã cập nhật thành công file Đề nghị XHĐ.");
      } else {
        throw new Error("Lỗi khi lưu file Đề nghị XHĐ mới lên Drive.");
      }
    }

    const detailsLog = `Người dùng ${updatedBy} đã cập nhật các file: ${filesUpdatedLog.join(', ')}.`;
    recordOrderHistory(orderNumber, vin, "Cập nhật file XHĐ", detailsLog);
    logAction("Cập nhật file XHĐ", `Đơn hàng ${orderNumber}: ${detailsLog}`);

    // Gửi email xác nhận bổ sung hồ sơ thành công
    const attachments = [];
    if (typeof hopDongBlob !== 'undefined' && hopDongBlob) attachments.push(hopDongBlob);
    if (typeof deNghiBlob !== 'undefined' && deNghiBlob) attachments.push(deNghiBlob);

    if (attachments.length > 0) {
      const emailData = {
        ten_ban_hang: rowData[headers.indexOf("TƯ VẤN BÁN HÀNG")],
        so_don_hang: orderNumber,
        ten_khach_hang: customerName,
        vin: vin,
        policy: rowData[headers.indexOf("CHÍNH SÁCH")],
        commission: rowData[headers.indexOf("Hoa hồng ứng")],
        vpoint: rowData[headers.indexOf("Điểm Vpoint sử dụng")],
        attachments: attachments
      };
      sendInvoiceRequestConfirmationEmailToTVBH(ss.getSheetByName(MAIL_SHEET_NAME), emailData);
    }

    const daGhepSheet = getOrCreateSheet(ss, DA_GHEP_SHEET_NAME, SHEET_HEADERS["DaGhep"]);
    const daGhepData = daGhepSheet.getDataRange().getValues();
    const daGhepHeaders = daGhepData[0];
    const soDonHangColDaghep = daGhepHeaders.indexOf("Số đơn hàng");
    const ketQuaColDaghep = daGhepHeaders.indexOf("Kết quả");
    for (let i = 1; i < daGhepData.length; i++) {
      if (String(daGhepData[i][soDonHangColDaghep]).trim() === orderNumber) {
        if (String(daGhepData[i][ketQuaColDaghep]).trim() === "Yêu cầu bổ sung") {
          daGhepSheet.getRange(i + 1, ketQuaColDaghep + 1).setValue("Đã bổ sung");
          logAction("Cập nhật trạng thái (sau khi bổ sung)", `Đơn hàng ${orderNumber} đã được chuyển về 'Đã bổ sung'.`);
        }
        break;
      }
    }
    Logger.log(`Hoàn tất handleUpdateInvoiceFiles cho đơn hàng: ${orderNumber}.`);
    return createJsonResponse({ status: "SUCCESS", message: `Đã cập nhật thành công: ${filesUpdatedLog.join(' và ')}.` });
  } catch (err) {
    Logger.log(`Lỗi nghiêm trọng trong handleUpdateInvoiceFiles cho đơn ${orderNumber || 'N/A'}: ${err.message}. Stack: ${err.stack}`);
    logAction("Lỗi nghiêm trọng khi cập nhật file", `Đơn hàng ${orderNumber || 'N/A'}: ${err.toString()}`);
    return createJsonResponse({ status: "ERROR", message: "Lỗi phía máy chủ: " + err.message });
  }
}
function handleConfirmVinClubVerification(e) {
  const orderNumber = e.parameter.orderNumber;
  const user = e.parameter.updatedBy;

  if (!user) {
    return createJsonResponse({ status: "ERROR", message: "Không thể xác định người dùng thực hiện." });
  }

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheets = getSheets(ss);
    const { daGhepSheet, nhatKyChinhSuaSheet } = sheets;
    const actionId = `confirm-vinclub-${new Date().getTime()}`;

    const daGhepData = daGhepSheet.getDataRange().getValues();
    const headers = daGhepData[0];
    const soDonHangCol = headers.indexOf("Số đơn hàng");
    const ketQuaCol = headers.indexOf("Kết quả");
    const vinCol = headers.indexOf("VIN");
    const tvbhCol = headers.indexOf("Tên tư vấn bán hàng");
    const ngoaiThatCol = headers.indexOf("Ngoại thất");
    const noiThatCol = headers.indexOf("Nội thất");

    for (let i = 1; i < daGhepData.length; i++) {
      if (String(daGhepData[i][soDonHangCol]).trim() === orderNumber) {
        const currentStatus = String(daGhepData[i][ketQuaCol]).trim();
        const assignedTvbh = String(daGhepData[i][tvbhCol]).trim();

        if (currentStatus === "Yêu cầu VinClub" && user === assignedTvbh) {
          updateCellAndLog(daGhepSheet, i + 1, ketQuaCol + 1, "Đã bổ sung", user, actionId, nhatKyChinhSuaSheet);

          const vin = daGhepData[i][vinCol];
          const adminMessage = `${user} đã xác nhận hoàn tất VinClub cho ĐH ${orderNumber}.`;
          addNotification(adminMessage, 'success', 'xuatHoaDon', orderNumber, user, ADMIN_EMAIL);

          const mauSac = `${daGhepData[i][ngoaiThatCol]} / ${daGhepData[i][noiThatCol]}`;
          const telegramMessageVinClub = `✅ <b>TVBH Đã Xác Nhận VinClub</b>\n\n` +
            `👤 <b>Người xác nhận:</b> ${user}\n` +
            `📄 <b>Số đơn hàng:</b> <code>${orderNumber}</code>\n` +
            `🎨 <b>Màu sắc:</b> ${mauSac}\n` +
            `🔢 <b>VIN:</b> <code>${vin}</code>\n\n` +
            `<i>Đơn hàng đã sẵn sàng cho các bước tiếp theo.</i>`;
          sendTelegramNotification(telegramMessageVinClub);

          recordOrderHistory(orderNumber, vin, "Hoàn tất xác thực VinClub", `Xác nhận bởi TVBH: ${user}`);
          return createJsonResponse({ status: "SUCCESS", message: "Đã xác nhận hoàn tất. Cảm ơn bạn!" });
        } else if (user !== assignedTvbh) {
          return createJsonResponse({ status: "ERROR", message: "Bạn không được phân công cho đơn hàng này." });
        } else {
          return createJsonResponse({ status: "ERROR", message: `Hành động không hợp lệ. Trạng thái hiện tại là '${currentStatus}'.` });
        }
      }
    }
    return createJsonResponse({ status: "ERROR", message: `Không tìm thấy đơn hàng ${orderNumber}.` });
  } catch (err) {
    Logger.log(`Lỗi nghiêm trọng trong handleConfirmVinClubVerification: ${err.message}. Stack: ${err.stack}`);
    sendErrorAlert('handleConfirmVinClubVerification', err);
    return createJsonResponse({ status: 'ERROR', message: `Lỗi máy chủ khi xác nhận VinClub: ${err.message}` });
  }
}
function handleUploadIssuedInvoice(e) {
  try {
    const orderNumber = e.parameter.orderNumber;
    const uploadedBy = e.parameter.uploadedBy || "Admin";
    const originalFileName = e.parameter.invoiceFileName;
    const base64Data = e.parameter.invoiceFileBase64;
    const mimeType = e.parameter.invoiceMimeType;

    const paramCustomerName = e.parameter.customerName;
    const paramVin = e.parameter.vin;
    const paramTvbhName = e.parameter.tvbhName;
    const paramDongXe = e.parameter.dongXe;
    const paramPhienBan = e.parameter.phienBan;
    const paramNgoaiThat = e.parameter.ngoaiThat;
    const paramNoiThat = e.parameter.noiThat;

    if (!orderNumber || !originalFileName || !base64Data || !mimeType) {
      throw new Error("Dữ liệu không đầy đủ để tải lên hóa đơn.");
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheets = getSheets(ss);
    const { daGhepSheet, mailSheet, xuathoadonSheet } = sheets;

    // --- BƯỚC 1: Đọc thông tin cần thiết ---
    // Không ném lỗi nếu không tìm thấy trong sheet, dùng tham số hoặc mặc định
    const daGhepRowData = findRowByKeyValue(daGhepSheet, "Số đơn hàng", orderNumber);
    const xuathoadonRowIndex = findRowIndexByKeyValue(xuathoadonSheet, "SỐ ĐƠN HÀNG", orderNumber);

    const customerName = paramCustomerName || (daGhepRowData ? daGhepRowData["Tên khách hàng"] : "Khách hàng");
    const vin = paramVin || (daGhepRowData ? daGhepRowData["VIN"] : "N/A");
    const tvbhName = paramTvbhName || (daGhepRowData ? daGhepRowData["Tên tư vấn bán hàng"] : "Admin");
    const dongXe = paramDongXe || (daGhepRowData ? daGhepRowData["Dòng xe"] : "");
    const phienBan = paramPhienBan || (daGhepRowData ? daGhepRowData["Phiên bản"] : "");
    const ngoaiThat = paramNgoaiThat || (daGhepRowData ? daGhepRowData["Ngoại thất"] : "");
    const noiThat = paramNoiThat || (daGhepRowData ? daGhepRowData["Nội thất"] : "");

    // Chế độ "Độc lập Supabase": Nếu không tìm thấy dòng trong Sheet, ta vẫn cho phép tải file và gửi mail
    const isIndependent = !daGhepRowData;
    if (isIndependent) {
      Logger.log(`Đã chuyển sang chế độ độc lập cho đơn hàng ${orderNumber}.`);
    }

    // --- BƯỚC 2: Thực hiện các tác vụ chậm (I/O) TRƯỚC KHI KHÓA ---
    const decodedData = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(decodedData, mimeType, originalFileName);
    const xuathoadonHeaders = SHEET_HEADERS["Xuathoadon"];

    // Tìm ngày yêu cầu, nếu không tìm thấy trong sheet thì dùng thời gian hiện tại
    let requestDate = new Date();
    if (xuathoadonRowIndex > -1) {
      const requestDateColXHD = xuathoadonHeaders.indexOf("NGÀY YÊU CẦU XHĐ");
      if (requestDateColXHD > -1) {
        const value = xuathoadonSheet.getRange(xuathoadonRowIndex, requestDateColXHD + 1).getValue();
        if (value) requestDate = new Date(value);
      }
    }

    // Tải file lên Drive
    const fileFormulaObject = saveFileToDrive(blob, orderNumber, 'HOADON', customerName, requestDate);

    // --- BƯỚC 3: KHÓA Bảng tính và thực hiện các tác vụ ghi NHANH ---
    const updateLogic = () => {
      const daghepHeaders = daGhepSheet.getRange(1, 1, 1, daGhepSheet.getLastColumn()).getValues()[0];
      const daghepRowIndex = findRowIndexByKeyValue(daGhepSheet, "Số đơn hàng", orderNumber);

      if (daghepRowIndex > -1) {
        daGhepSheet.getRange(daghepRowIndex, daghepHeaders.indexOf("Kết quả") + 1).setValue("Đã xuất hóa đơn");
        if (fileFormulaObject && fileFormulaObject.formula) {
          const linkCol = daghepHeaders.indexOf("LinkHoaDonDaXuat");
          if (linkCol > -1) {
            daGhepSheet.getRange(daghepRowIndex, linkCol + 1).setFormula(fileFormulaObject.formula);
          }
        }
      }

      if (fileFormulaObject && fileFormulaObject.formula) {
        const urlFinalInvoiceCol = xuathoadonHeaders.indexOf("URL Hóa Đơn Đã Xuất");
        if (urlFinalInvoiceCol !== -1 && xuathoadonRowIndex > -1) {
          xuathoadonSheet.getRange(xuathoadonRowIndex, urlFinalInvoiceCol + 1).setFormula(fileFormulaObject.formula);
        }
      }
      recordOrderHistory(orderNumber, vin, "Tải lên Hóa đơn", `Đã tải lên và phát hành hóa đơn bởi ${uploadedBy}.`);
    };

    if (e.parameter.skipInternalLock === "true") {
      updateLogic();
    } else {
      doReadWriteLock(updateLogic);
    }

    // --- BƯỚC 4: Gửi email và thông báo SAU KHI đã nhả khóa ---
    const orderDataForEmail = {
      so_don_hang: orderNumber,
      ten_khach_hang: customerName,
      ten_tu_van_ban_hang: tvbhName,
      vin: vin,
      dong_xe: dongXe,
      phien_ban: phienBan,
      ngoai_that: ngoaiThat,
      noi_that: noiThat
    };

    const emailSent = sendIssuedInvoiceWithAttachment(mailSheet, orderDataForEmail, blob, xuathoadonSheet, xuathoadonRowIndex);

    if (emailSent) {
      addNotification(`Hóa đơn cho ĐH ${orderNumber} đã được tải lên bởi ${uploadedBy}.`, 'success', 'xuatHoaDon', orderNumber, uploadedBy, tvbhName);
      return createJsonResponse({ status: 'SUCCESS', message: 'Tải lên hóa đơn và gửi email thành công!' });
    } else {
      addNotification(`Hóa đơn cho ĐH ${orderNumber} đã được tải lên NHƯNG GỬI MAIL THẤT BẠI.`, 'warning', 'xuatHoaDon', orderNumber, uploadedBy, tvbhName);
      return createJsonResponse({ status: 'WARNING', message: 'Tải lên thành công nhưng GỬI MAIL THẤT BẠI. Vui lòng kiểm tra lại email TVBH.' });
    }

  } catch (err) {
    Logger.log(`Lỗi nghiêm trọng trong handleUploadIssuedInvoice: ${err.message}. Stack: ${err.stack}`);
    sendErrorAlert('handleUploadIssuedInvoice', err);
    runSyncKhoxeStatus();
    return createJsonResponse({ status: 'ERROR', message: `Lỗi phía máy chủ: ${err.message}` });
  }
}

function handleSheetChange(e) {
  // Ghi lại log để biết trigger đã chạy và loại thay đổi là gì
  Logger.log(`Trigger 'onChange' đã được kích hoạt. Loại thay đổi: ${e.changeType}`);

  // Chỉ tăng phiên bản cho các thay đổi quan trọng do người dùng thực hiện
  const changeTypesToUpdate = ["EDIT", "INSERT_ROW", "REMOVE_ROW", "INSERT_GRID", "REMOVE_GRID"];

  if (e.user && changeTypesToUpdate.includes(e.changeType)) {
    Logger.log("Phát hiện thay đổi cấu trúc quan trọng. Đang cập nhật phiên bản dữ liệu...");

    // Gọi hàm tăng phiên bản để web app có thể nhận biết
    incrementDataVersion();
  }
}
function handleApproveRequestFromWebApp(orderNumber, actionId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheets = getSheets(ss);
  const { daGhepSheet, nhatKyChinhSuaSheet } = sheets;
  const user = Session.getActiveUser().getEmail() || "Admin Web App";

  const daGhepData = daGhepSheet.getDataRange().getValues();
  const headers = daGhepData[0];
  const soDonHangCol = headers.indexOf("Số đơn hàng");
  const ketQuaCol = headers.indexOf("Kết quả");
  const vinCol = headers.indexOf("VIN");
  const tvbhCol = headers.indexOf("Tên tư vấn bán hàng");

  for (let i = 1; i < daGhepData.length; i++) {
    if (String(daGhepData[i][soDonHangCol]).trim() === String(orderNumber).trim()) {
      const currentStatus = String(daGhepData[i][ketQuaCol]).trim();
      if (currentStatus === "Chờ phê duyệt" || currentStatus === "Đã bổ sung") {

        // SỬ DỤNG HÀM MỚI
        updateCellAndLog(daGhepSheet, i + 1, ketQuaCol + 1, "Đã phê duyệt", user, actionId, nhatKyChinhSuaSheet);

        const vin = daGhepData[i][vinCol];
        const tvbhName = daGhepData[i][tvbhCol];
        const message = `Yêu cầu XHĐ cho đơn hàng ${orderNumber} của bạn đã được Admin phê duyệt.`;
        addNotification(message, 'success', 'xuatHoaDon', orderNumber, user, tvbhName);
        recordOrderHistory(orderNumber, vin, "Phê duyệt XHĐ", `Yêu cầu được phê duyệt bởi ${user}`);
        return createJsonResponse({ status: "SUCCESS", message: `Đã phê duyệt thành công yêu cầu cho đơn hàng ${orderNumber}.` });
      } else {
        return createJsonResponse({ status: "ERROR", message: `Không thể phê duyệt. Trạng thái hiện tại là '${currentStatus}'.` });
      }
    }
  }
  return createJsonResponse({ status: "ERROR", message: `Không tìm thấy đơn hàng ${orderNumber} để phê duyệt.` });
}
// [THAY THẾ TOÀN BỘ HÀM CŨ]
function handleRequestSupplementFromWebApp(orderNumber, reason, sheets, imagesBase64Json = null, actionId = null) {
  const { daGhepSheet, mailSheet, nhatKyChinhSuaSheet } = sheets;
  const user = Session.getActiveUser().getEmail() || "Admin Web App";
  const daGhepData = daGhepSheet.getDataRange().getValues();
  const headers = daGhepData[0];
  const soDonHangCol = headers.indexOf("Số đơn hàng");
  const ketQuaCol = headers.indexOf("Kết quả");
  const vinCol = headers.indexOf("VIN");
  const tenKhachHangCol = headers.indexOf("Tên khách hàng");
  const tvbhCol = headers.indexOf("Tên tư vấn bán hàng");
  for (let i = 1; i < daGhepData.length; i++) {
    if (String(daGhepData[i][soDonHangCol]).trim() === String(orderNumber).trim()) {
      const currentStatus = String(daGhepData[i][ketQuaCol]).trim();
      if (currentStatus === "Chờ phê duyệt" || currentStatus === "Đã bổ sung") {

        // SỬ DỤNG HÀM MỚI
        updateCellAndLog(daGhepSheet, i + 1, ketQuaCol + 1, "Yêu cầu bổ sung", user, actionId, nhatKyChinhSuaSheet);

        const orderData = {
          ten_ban_hang: daGhepData[i][tvbhCol],
          ten_khach_hang: daGhepData[i][tenKhachHangCol],
          so_don_hang: orderNumber,
          vin: daGhepData[i][vinCol]
        };
        sendSupplementRequestEmail(mailSheet, orderData, reason, imagesBase64Json);
        const tvbhName = daGhepData[i][tvbhCol];
        const message = `Admin yêu cầu bạn bổ sung hồ sơ cho ĐH ${orderNumber} với lý do: "${reason}"`;
        addNotification(message, 'warning', 'xuatHoaDon', orderNumber, user, tvbhName);
        recordOrderHistory(orderNumber, orderData.vin, "Yêu cầu bổ sung XHĐ", `Lý do: ${reason}. Yêu cầu bởi: ${user}`);
        return createJsonResponse({ status: "SUCCESS", message: `Đã gửi yêu cầu bổ sung cho đơn hàng ${orderNumber}.` });
      } else {
        return createJsonResponse({ status: "ERROR", message: `Không thể yêu cầu bổ sung. Trạng thái hiện tại là '${currentStatus}'.` });
      }
    }
  }
  return createJsonResponse({ status: "ERROR", message: `Không tìm thấy đơn hàng ${orderNumber} để yêu cầu bổ sung.` });
}

function handleUpdateRowData(params, updatedBy) {
  return doReadWriteLock(() => {
    const { sheetName, primaryKeyColumn, primaryKeyValue, actionId } = params; // Thêm actionId
    if (!sheetName || !primaryKeyColumn || !primaryKeyValue) {
      throw new Error("Thiếu thông tin cần thiết để cập nhật.");
    }
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`Không tìm thấy sheet: ${sheetName}`);
    }
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const primaryKeyColIndex = headers.indexOf(primaryKeyColumn);
    if (primaryKeyColIndex === -1) {
      throw new Error(`Không tìm thấy cột khóa chính '${primaryKeyColumn}'.`);
    }
    let rowIndexToUpdate = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][primaryKeyColIndex]).trim() === String(primaryKeyValue).trim()) {
        rowIndexToUpdate = i + 1;
        break;
      }
    }
    if (rowIndexToUpdate === -1) {
      throw new Error(`Không tìm thấy bản ghi '${primaryKeyValue}'.`);
    }
    const nhatKyChinhSuaSheet = getOrCreateSheet(ss, "NhatKyChinhSua", SHEET_HEADERS["NhatKyChinhSua"]);
    let changesMade = 0;
    for (const key in params) {
      if (key !== 'action' && key !== 'sheetName' && key !== 'primaryKeyColumn' && key !== 'primaryKeyValue' && key !== 'updatedBy' && key !== 'actionId') { // Bỏ qua actionId
        const colIndex = headers.indexOf(key);
        if (colIndex !== -1) {
          const cellToUpdate = sheet.getRange(rowIndexToUpdate, colIndex + 1);
          const oldValue = cellToUpdate.getValue();
          let newValue = params[key];
          if (key.toLowerCase().includes('ngày') && newValue) {
            const d = new Date(newValue);
            if (!isNaN(d.getTime())) { newValue = d; }
          }
          if (String(oldValue) !== String(newValue)) {
            cellToUpdate.setValue(newValue);
            appendAndFormatRow(nhatKyChinhSuaSheet, [new Date(), updatedBy, sheetName, cellToUpdate.getA1Notation(), oldValue, newValue, actionId, ""]); // Ghi log với actionId
            changesMade++;
          }
        }
      }
    }
    if (changesMade > 0) {
      logAction("Cập nhật từ Web App", `Người dùng ${updatedBy} đã cập nhật ${changesMade} trường cho '${primaryKeyValue}' trong sheet '${sheetName}'.`);
      return { message: `Đã cập nhật thành công ${changesMade} trường dữ liệu.` };
    } else {
      return { message: "Không có thay đổi nào được thực hiện." };
    }
  });
}

function handleMarkAsPendingSignature(orderNumber, userEmail, actionId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = getSheets(ss);
  const { daGhepSheet, xuathoadonSheet, nhatKyChinhSuaSheet } = sheets;

  const xuathoadonData = xuathoadonSheet.getDataRange().getValues();
  const xuathoadonHeaders = SHEET_HEADERS["Xuathoadon"];
  const soDonHangColXHD = xuathoadonHeaders.indexOf("SỐ ĐƠN HÀNG");
  const vinColXHD = xuathoadonHeaders.indexOf("SỐ VIN");
  const tvbhColXHD = xuathoadonHeaders.indexOf("TƯ VẤN BÁN HÀNG");
  const ngayXuatHDColXHD = xuathoadonHeaders.indexOf("NGÀY XUẤT HÓA ĐƠN");

  // ----- DÒNG MỚI BẮT ĐẦU -----
  const baoBanColXHD = xuathoadonHeaders.indexOf("BÁO BÁN"); // Lấy chỉ số cột "BÁO BÁN"
  // ----- DÒNG MỚI KẾT THÚC -----

  let rowIndexInXuathoadon = -1;
  let vin = "";
  let tvbhName = "";

  for (let i = 1; i < xuathoadonData.length; i++) {
    if (String(xuathoadonData[i][soDonHangColXHD] || "").trim() === String(orderNumber).trim()) {
      rowIndexInXuathoadon = i + 1;
      vin = String(xuathoadonData[i][vinColXHD] || "").trim();
      tvbhName = String(xuathoadonData[i][tvbhColXHD] || "").trim();
      break;
    }
  }

  if (rowIndexInXuathoadon === -1) {
    throw new Error(`Không tìm thấy đơn hàng ${orderNumber} trong sheet Xuathoadon.`);
  }

  // Ghi nhận ngày xuất hóa đơn (logic cũ, giữ nguyên)
  if (ngayXuatHDColXHD !== -1) {
    xuathoadonSheet.getRange(rowIndexInXuathoadon, ngayXuatHDColXHD + 1)
      .setValue(new Date())
      .setNumberFormat("dd/MM/yyyy");
    logAction("Cập nhật Ngày XHĐ", `Đã tự động ghi nhận ngày XHĐ cho đơn hàng ${orderNumber} khi chuyển sang 'Chờ ký HĐ'.`);
  }

  // ----- KHỐI LỆNH MỚI BẮT ĐẦU -----
  // Tự động đánh dấu tick vào cột "BÁO BÁN"
  if (baoBanColXHD !== -1) {
    // Lấy ô cần cập nhật và check vào đó (giá trị TRUE)
    xuathoadonSheet.getRange(rowIndexInXuathoadon, baoBanColXHD + 1).check();
    logAction("Cập nhật Báo Bán", `Đã tự động tick BÁO BÁN cho đơn hàng ${orderNumber}.`);
  }
  // ----- KHỐI LỆNH MỚI KẾT THÚC -----

  const daGhepData = sheets.daGhepSheet.getDataRange().getValues();
  const daGhepHeaders = SHEET_HEADERS["DaGhep"];
  const vinColDaghep = daGhepHeaders.indexOf("VIN");
  const ketQuaColDaghep = daGhepHeaders.indexOf("Kết quả");

  for (let i = 1; i < daGhepData.length; i++) {
    if (String(daGhepData[i][vinColDaghep]).trim() === vin) {
      updateCellAndLog(daGhepSheet, i + 1, ketQuaColDaghep + 1, "Chờ ký hóa đơn", userEmail, actionId, nhatKyChinhSuaSheet);
      break;
    }
  }

  recordOrderHistory(orderNumber, vin, "Chuyển sang Chờ ký hóa đơn", `Kích hoạt bởi ${userEmail}`);
  recordVehicleHistory(vin, "Chuyển sang Chờ ký hóa đơn", `Đơn hàng ${orderNumber}`);
  return { success: true, message: `Đã chuyển đơn hàng ${orderNumber} sang trạng thái "Chờ ký hóa đơn".`, tvbhName: tvbhName };
}
function handleAddDepositInfo(e) {
  try {
    const customerName = e.parameter.customerName;
    const depositDate = e.parameter.depositDate;
    const addedBy = e.parameter.addedBy || "Admin Web App";

    // 1. Kiểm tra dữ liệu đầu vào
    if (!customerName || !depositDate) {
      throw new Error("Vui lòng cung cấp đầy đủ Tên khách hàng và Ngày cọc.");
    }

    const dateObject = new Date(depositDate);
    if (isNaN(dateObject.getTime())) {
      throw new Error("Ngày cọc không hợp lệ.");
    }

    // 2. Lấy sheet và ghi dữ liệu
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID); //
    const cocXeSheet = getOrCreateSheet(ss, COC_XE_SHEET_NAME, SHEET_HEADERS["CocXe"]); //

    // 3. Chuẩn bị dòng mới với các thay đổi theo yêu cầu

    // THAY ĐỔI 1: Chỉ lưu Ngày/Tháng/Năm
    const formattedDate = Utilities.formatDate(dateObject, "GMT+7", "dd/MM/yyyy");

    const newRow = [
      customerName.trim(),
      formattedDate,
      '' // THAY ĐỔI 2: Để trống trạng thái sử dụng
    ];

    // 4. Thêm dòng mới vào sheet
    appendAndFormatRow(cocXeSheet, newRow);

    // 5. Ghi log và trả về thành công
    logAction("Thêm thông tin cọc", `Đã thêm cọc cho KH: ${customerName} bởi ${addedBy}`); //
    return createJsonResponse({ status: "SUCCESS", message: `Đã thêm thông tin cọc cho khách hàng '${customerName}' thành công!` }); //

  } catch (error) {
    Logger.log(`Lỗi trong handleAddDepositInfo: ${error.message}`);
    sendErrorAlert('handleAddDepositInfo', error); //
    return createJsonResponse({ status: "ERROR", message: `Lỗi máy chủ: ${error.message}` });
  }
}
function handleAddBatchDeposits(e) {
  try {
    const depositsJson = e.parameter.deposits;
    const addedBy = e.parameter.addedBy || "Admin Web App";

    if (!depositsJson) {
      throw new Error("Không có dữ liệu cọc được cung cấp.");
    }

    const deposits = JSON.parse(depositsJson);
    if (!Array.isArray(deposits) || deposits.length === 0) {
      return createJsonResponse({ status: "SUCCESS", message: "Không có dòng nào hợp lệ để thêm." });
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const cocXeSheet = getOrCreateSheet(ss, COC_XE_SHEET_NAME, SHEET_HEADERS["CocXe"]); //

    const rowsToAppend = [];
    let errorCount = 0;

    for (const deposit of deposits) {
      const customerName = deposit.customerName;
      const dateObject = new Date(deposit.depositDate);

      // Bỏ qua nếu dữ liệu không hợp lệ
      if (!customerName || isNaN(dateObject.getTime())) {
        errorCount++;
        continue;
      }

      const formattedDate = Utilities.formatDate(dateObject, "GMT+7", "dd/MM/yyyy");
      rowsToAppend.push([customerName, formattedDate, '']);
    }

    // Ghi tất cả các dòng hợp lệ vào sheet trong một lần
    if (rowsToAppend.length > 0) {
      cocXeSheet.getRange(cocXeSheet.getLastRow() + 1, 1, rowsToAppend.length, 3).setValues(rowsToAppend);
    }

    // Tạo thông báo kết quả
    let message = `Đã thêm thành công ${rowsToAppend.length} thông tin cọc.`;
    if (errorCount > 0) {
      message += ` Bỏ qua ${errorCount} dòng do lỗi định dạng.`;
    }

    logAction("Thêm thông tin cọc (Hàng loạt)", message);
    return createJsonResponse({ status: "SUCCESS", message: message });

  } catch (error) {
    Logger.log(`Lỗi trong handleAddBatchDeposits: ${error.message}`);
    sendErrorAlert('handleAddBatchDeposits', error); //
    return createJsonResponse({ status: "ERROR", message: `Lỗi máy chủ: ${error.message}` });
  }
}
function handleAddWaitingRequest(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dangKyChoSheet = getOrCreateSheet(ss, DANG_KY_CHO_SHEET_NAME, SHEET_HEADERS["DangKyCho"]);
    const user = e.parameter.ten_ban_hang || "Không xác định";
    const requestId = "YC-" + new Date().getTime(); // Tạo ID duy nhất
    const newRowData = {
      "ID Yêu Cầu": requestId,
      "Thời gian đăng ký": new Date(),
      "Tên TVBH": user,
      "Tên khách hàng": e.parameter.ten_khach_hang,
      "Dòng xe": e.parameter.dong_xe,
      "Phiên bản": e.parameter.phien_ban,
      "Ngoại thất": e.parameter.ngoai_that,
      "Nội thất": e.parameter.noi_that,
      "Trạng thái": "Đang chờ",

      "VIN gợi ý": "",
      "Ghi chú": e.parameter.ghi_chu || ""
    };
    const rowValues = SHEET_HEADERS["DangKyCho"].map(header => newRowData[header] || "");
    appendAndFormatRow(dangKyChoSheet, rowValues);

    logAction("Thêm Yêu Cầu Chờ", `Đã thêm yêu cầu chờ cho KH ${newRowData["Tên khách hàng"]} bởi ${user}`);

    // Gửi thông báo Telegram khi có yêu cầu chờ mới
    const telegramMessageCho = `🔍 <b>Yêu Cầu Tìm Xe (Đăng Ký Chờ)</b>\n\n` +
      `👤 <b>TVBH:</b> ${newRowData["Tên TVBH"]}\n` +
      `👨 <b>Khách hàng:</b> ${newRowData["Tên khách hàng"]}\n` +
      `🚗 <b>Loại xe:</b> ${newRowData["Dòng xe"]} ${newRowData["Phiên bản"]}\n` +
      `🎨 <b>Màu:</b> ${newRowData["Ngoại thất"]} / ${newRowData["Nội thất"]}\n` +
      `📝 <b>Ghi chú:</b> ${newRowData["Ghi chú"] || "Không có"}`;
    sendTelegramNotification(telegramMessageCho);

    return createJsonResponse({ status: "SUCCESS", message: "Đã gửi yêu cầu đăng ký chờ thành công!" });
  } catch (error) {
    Logger.log(`Lỗi trong handleAddWaitingRequest: ${error.message}`);
    sendErrorAlert('handleAddWaitingRequest', error);
    return createJsonResponse({ status: "ERROR", message: `Lỗi máy chủ: ${error.message}` });
  }
}
// [THAY THẾ TOÀN BỘ HÀM sendCarAvailableNotification CŨ]
function handleUpdateWaitingRequestNote(e) {
  try {
    const requestId = e.parameter.requestId;
    const adminNote = e.parameter.note;
    const adminUser = e.parameter.adminUser || "Admin";
    if (!requestId || !adminNote) {
      throw new Error("Thiếu ID yêu cầu hoặc nội dung ghi chú.");
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = getSheets(ss);
    const { dangKyChoSheet, mailSheet } = sheets;
    const data = dangKyChoSheet.getDataRange().getValues();
    const headers = SHEET_HEADERS["DangKyCho"];
    const idCol = headers.indexOf("ID Yêu Cầu");
    const ghiChuCol = headers.indexOf("Ghi chú");
    let rowIndexToUpdate = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][idCol] === requestId) {
        rowIndexToUpdate = i + 1;
        break;
      }
    }

    if (rowIndexToUpdate === -1) {
      throw new Error(`Không tìm thấy yêu cầu chờ với ID: ${requestId}`);
    }

    dangKyChoSheet.getRange(rowIndexToUpdate, ghiChuCol + 1).setValue(adminNote);

    const updatedRowData = dangKyChoSheet.getRange(rowIndexToUpdate, 1, 1, headers.length).getValues()[0];
    const tenTVBH = updatedRowData[headers.indexOf("Tên TVBH")];
    const tenKH = updatedRowData[headers.indexOf("Tên khách hàng")];
    const requestDataForNotif = {
      id: requestId,
      ten_tvbh: tenTVBH,
      ten_khach_hang: tenKH,
      dong_xe: updatedRowData[headers.indexOf("Dòng xe")],
      phien_ban: updatedRowData[headers.indexOf("Phiên bản")],
      admin_note: adminNote
    };
    sendAdminReplyNotification(mailSheet, requestDataForNotif);

    // <-- THAY ĐỔI BẮT ĐẦU -->
    const notificationMessage = `Admin đã phản hồi YC chờ của KH ${tenKH}: "${adminNote}"`;
    addNotification(notificationMessage, 'info', 'cho-xe', requestId, adminUser, tenTVBH);
    // <-- THAY ĐỔI KẾT THÚC -->

    logAction("Admin trả lời YC chờ (Web)", `Admin ${adminUser} đã trả lời YC ID ${requestId}: "${adminNote}"`);
    return createJsonResponse({ status: "SUCCESS", message: "Đã gửi phản hồi thành công!" });
  } catch (error) {
    Logger.log(`Lỗi trong handleUpdateWaitingRequestNote: ${error.message}`);
    sendErrorAlert('handleUpdateWaitingRequestNote', error);
    return createJsonResponse({ status: "ERROR", message: `Lỗi máy chủ: ${error.message}` });
  }
}
function handleMarkNotificationAsRead(e) {
  try {
    const timestampToMark = e.parameter.timestamp;
    if (!timestampToMark) {
      throw new Error("Không có timestamp được cung cấp.");
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);[cite_start]// [cite: 1]
    const sheet = getOrCreateSheet(ss, NOTIFICATION_SHEET_NAME, SHEET_HEADERS["ThongBaoWebApp"]);[cite_start]// [cite: 1, 6]
    if (sheet.getLastRow() < 2) {
      return createJsonResponse({ status: 'SUCCESS', message: 'Không có thông báo.' });
    }

    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    const values = dataRange.getValues();
    const headers = SHEET_HEADERS["ThongBaoWebApp"];[cite_start]// [cite: 6]
    const timestampCol = headers.indexOf("Timestamp");
    const isReadCol = headers.indexOf("IsRead");

    if (timestampCol === -1 || isReadCol === -1) {
      throw new Error("Lỗi cấu trúc sheet ThongBaoWebApp.");
    }

    // Chuyển đổi timestamp từ request thành đối tượng Date để so sánh chính xác
    const targetDate = new Date(timestampToMark);

    for (let i = 0; i < values.length; i++) {
      const rowDate = new Date(values[i][timestampCol]);
      // So sánh thời gian chính xác
      if (rowDate.getTime() === targetDate.getTime()) {
        if (values[i][isReadCol] !== 'Đã đọc') {
          sheet.getRange(i + 2, isReadCol + 1).setValue('Đã đọc');
          logAction("Đánh dấu đã đọc (Đơn lẻ)", `Đã đánh dấu thông báo lúc ${timestampToMark} là đã đọc.`);
        }
        break; // Dừng lại khi đã tìm thấy và cập nhật
      }
    }

    return createJsonResponse({ status: 'SUCCESS', message: 'Thông báo đã được đánh dấu là đã đọc.' });

  } catch (err) {
    Logger.log(`Lỗi trong handleMarkNotificationAsRead: ${err.message}`);
    return createJsonResponse({ status: 'ERROR', message: err.message });
  }
}

function handleDeleteWaitingRequest(e) {
  const requestId = e.parameter.requestId;
  const deletedBy = e.parameter.deletedBy || "Admin Web App";

  if (!requestId) {
    throw new Error("Không có ID Yêu Cầu được cung cấp để xóa.");
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreateSheet(ss, DANG_KY_CHO_SHEET_NAME, SHEET_HEADERS["DangKyCho"]);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf("ID Yêu Cầu");

  if (idCol === -1) {
    throw new Error("Lỗi cấu trúc sheet 'DangKyCho': Thiếu cột 'ID Yêu Cầu'.");
  }

  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][idCol]).trim() === requestId) {
      const customerName = data[i][headers.indexOf("Tên khách hàng")];
      sheet.deleteRow(i + 1);
      logAction("Xóa Yêu Cầu Chờ", `Đã xóa YC của KH '${customerName}' (ID: ${requestId}) bởi ${deletedBy}.`);
      addNotification(`Yêu cầu chờ của KH ${customerName} đã được xóa bởi ${deletedBy}.`, 'danger', null, null, deletedBy);
      return createJsonResponse({ status: "SUCCESS", message: `Đã xóa thành công yêu cầu chờ của khách hàng ${customerName}.` });
    }
  }

  throw new Error(`Không tìm thấy yêu cầu chờ với ID: ${requestId}.`);
}
function handleTelegramFileUpload(fileInfo, user, orderNumber, chatId) {
  const TELEGRAM_BOT_TOKEN = "8444242103:AAGupLJ1RJS3b3LD5LMEYIWMfwCFW3mzhB4";
  try {
    sendTelegramMessage(`Đang xử lý file cho đơn hàng <b>${orderNumber}</b>...`, null, chatId);

    const fileId = fileInfo.file_id;
    const getFilePathUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`;
    const filePathResponse = UrlFetchApp.fetch(getFilePathUrl);
    const filePathResult = JSON.parse(filePathResponse.getContentText());

    if (!filePathResult.ok) {
      throw new Error("Không thể lấy thông tin file từ Telegram.");
    }

    const filePath = filePathResult.result.file_path;
    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
    const fileBlob = UrlFetchApp.fetch(fileUrl).getBlob();

    const originalFileName = fileInfo.file_name || `hoa_don_${orderNumber}.${filePath.split('.').pop()}`;
    fileBlob.setName(originalFileName);

    const e_simulated = {
      parameter: {
        orderNumber: orderNumber,
        uploadedBy: user.username || user.first_name,
        invoiceFileName: originalFileName,
        invoiceFileBase64: Utilities.base64Encode(fileBlob.getBytes()),
        invoiceMimeType: fileBlob.getContentType()
      }
    };

    const uploadResult = handleUploadIssuedInvoice(e_simulated);
    const resultObject = JSON.parse(uploadResult.getContent());

    if (resultObject.status === "SUCCESS") {
      sendTelegramMessage(`✅ Đã tải lên hóa đơn và cập nhật thành công cho đơn hàng <b>${orderNumber}</b>!`, null, chatId);
    } else {
      throw new Error(resultObject.message);
    }

  } catch (error) {
    Logger.log(`Lỗi trong handleTelegramFileUpload: ${error.message}`);
    sendTelegramMessage(`❌ Đã xảy ra lỗi khi xử lý file cho đơn hàng <b>${orderNumber}</b>:\n\n<i>${error.message}</i>`, null, chatId);
    sendErrorAlert('handleTelegramFileUpload', error);
  }
}
function handleTelegramSupplementRequest(reason, photos, user, orderNumber, chatId) {
  const TELEGRAM_BOT_TOKEN = "8444242103:AAGupLJ1RJS3b3LD5LMEYIWMfwCFW3mzhB4";
  try {
    sendTelegramMessage(`Đang xử lý yêu cầu bổ sung cho đơn hàng <b>${orderNumber}</b>...`, null, chatId);

    let imagesBase64Array = [];
    if (photos && Array.isArray(photos)) {
      photos.forEach(photoSizeArray => {
        const bestPhoto = photoSizeArray[photoSizeArray.length - 1]; // Lấy ảnh chất lượng cao nhất
        const fileId = bestPhoto.file_id;
        const getFilePathUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`;
        const filePathResponse = UrlFetchApp.fetch(getFilePathUrl);
        const filePathResult = JSON.parse(filePathResponse.getContentText());

        if (filePathResult.ok) {
          const filePath = filePathResult.result.file_path;
          const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
          const fileBlob = UrlFetchApp.fetch(fileUrl).getBlob();
          const base64Data = Utilities.base64Encode(fileBlob.getBytes());
          imagesBase64Array.push(`data:${fileBlob.getContentType()};base64,${base64Data}`);
        }
      });
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheets = getSheets(ss);
    const actionId = `telegram-req_supp-${new Date().getTime()}`;
    const imagesBase64Json = imagesBase64Array.length > 0 ? JSON.stringify(imagesBase64Array) : null;

    const resultJson = handleRequestSupplementFromWebApp(orderNumber, reason, sheets, imagesBase64Json, actionId);
    const resultObject = JSON.parse(resultJson.getContent());

    if (resultObject.status === "SUCCESS") {
      sendTelegramMessage(`✅ Đã gửi yêu cầu bổ sung thành công cho đơn hàng <b>${orderNumber}</b>!`, null, chatId);
      // Cập nhật lại tin nhắn gốc trong nhóm chat (nếu có thể)
      const telegramMessage = `⚠️ <b>Đã Yêu Cầu Bổ Sung</b>\n\n` +
        `👤 <b>Admin:</b> ${user.first_name}\n` +
        `📄 <b>SĐH:</b> <code>${orderNumber}</code>\n` +
        `📝 <b>Lý do:</b> ${reason}`;
      sendTelegramMessage(telegramMessage); // Gửi tin nhắn mới vào group chung
    } else {
      throw new Error(resultObject.message);
    }

  } catch (error) {
    Logger.log(`Lỗi trong handleTelegramSupplementRequest: ${error.message}`);
    sendTelegramMessage(`❌ Đã xảy ra lỗi khi xử lý yêu cầu bổ sung cho <b>${orderNumber}</b>:\n\n<i>${error.message}</i>`, null, chatId);
    sendErrorAlert('handleTelegramSupplementRequest', error);
  }
}
/**
 * [HÀM MỚI] - Xử lý việc tải lên nhiều hóa đơn cùng lúc.
 * @param {object} e - Đối tượng sự kiện từ doPost, chứa chuỗi JSON của các file.
 * @returns {ContentService.TextOutput} - Phản hồi JSON về kết quả.
 */
function handleBulkUploadIssuedInvoices(e) {
  try {
    const filesDataJson = e.parameter.filesData;
    const uploadedBy = e.parameter.uploadedBy || "Admin";

    if (!filesDataJson) {
      throw new Error("Không có dữ liệu file được gửi lên.");
    }

    const filesData = JSON.parse(filesDataJson);
    if (!Array.isArray(filesData) || filesData.length === 0) {
      return createJsonResponse({ status: "SUCCESS", message: "Không có file nào để xử lý." });
    }

    let successCount = 0;
    let errorCount = 0;
    const errorDetails = [];

    // --- BƯỚC QUAN TRỌNG: KHÓA 1 LẦN DUY NHẤT CHO TOÀN BỘ BATCH ---
    doReadWriteLock(() => {
      filesData.forEach(fileInfo => {
        try {
          // Tạo một đối tượng sự kiện giả lập `e` để tái sử dụng hàm `handleUploadIssuedInvoice`
          const e_simulated = {
            parameter: {
              orderNumber: fileInfo.orderNumber,
              uploadedBy: uploadedBy,
              invoiceFileName: fileInfo.fileName,
              invoiceFileBase64: fileInfo.base64Data,
              invoiceMimeType: fileInfo.mimeType,
              customerName: fileInfo.customerName,
              vin: fileInfo.vin,
              tvbhName: fileInfo.tvbhName,
              dongXe: fileInfo.dongXe,
              phienBan: fileInfo.phienBan,
              ngoaiThat: fileInfo.ngoaiThat,
              noiThat: fileInfo.noiThat,
              skipInternalLock: "true" // Quan trọng: Tránh lock lồng nhau gây treo máy
            }
          };

          // Gọi hàm xử lý đơn lẻ cho từng file
          const uploadResult = handleUploadIssuedInvoice(e_simulated);
          const resultObject = JSON.parse(uploadResult.getContent());

          if (resultObject.status === "SUCCESS") {
            successCount++;
          } else if (resultObject.status === "WARNING") {
            successCount++;
            errorDetails.push(`- ${fileInfo.orderNumber} (Cảnh báo): ${resultObject.message}`);
          } else {
            errorCount++;
            errorDetails.push(`- ${fileInfo.orderNumber}: ${resultObject.message}`);
          }
        } catch (err) {
          errorCount++;
          errorDetails.push(`- ${fileInfo.orderNumber}: ${err.message}`);
          logAction("Lỗi nghiêm trọng trong Bulk Upload", `Đơn hàng ${fileInfo.orderNumber}: ${err.toString()}`);
        }
      });
    }, 60000); // Tăng timeout lên 60s cho lô hàng lớn

    // Tạo thông báo kết quả cuối cùng
    let message = `Tải lên hàng loạt hoàn tất! Thành công: ${successCount}. Thất bại: ${errorCount}.`;
    if (errorCount > 0) {
      message += "\n\nChi tiết lỗi:\n" + errorDetails.join("\n");
    }

    addNotification(`${uploadedBy} đã tải lên hàng loạt ${successCount} hóa đơn.`, 'success', 'xuatHoaDon', null, uploadedBy, ADMIN_EMAIL);

    return createJsonResponse({ status: "SUCCESS", message: message });

  } catch (err) {
    Logger.log(`Lỗi nghiêm trọng trong handleBulkUploadIssuedInvoices: ${err.message}. Stack: ${err.stack}`);
    sendErrorAlert('handleBulkUploadIssuedInvoices', err);
    return createJsonResponse({ status: 'ERROR', message: `Lỗi máy chủ khi xử lý hàng loạt: ${err.message}` });
  }
}

function handlePerformOcr(e) {
  try {
    const base64Data = e.parameter.base64Data;
    const mimeType = e.parameter.mimeType;
    if (!base64Data || !mimeType) {
      throw new Error("Dữ liệu ảnh không hợp lệ.");
    }

    // 1. Chuyển đổi Base64 thành Blob
    const decodedData = Utilities.base64Decode(base64Data.split(',')[1]);
    const blob = Utilities.newBlob(decodedData, mimeType, "temp_ocr_file");

    // 2. Tải file lên Drive với tùy chọn OCR
    // File sẽ được tạo tạm thời và xóa ngay sau đó.
    const resource = {
      title: "temp_ocr_file",
      mimeType: mimeType
    };
    const optionalArgs = {
      ocr: true,
      ocrLanguage: 'vi,en' // Hỗ trợ cả tiếng Việt và tiếng Anh
    };
    const tempFile = Drive.Files.insert(resource, blob, optionalArgs);

    // 3. Lấy văn bản đã được OCR
    const recognizedText = DocumentApp.openById(tempFile.id).getBody().getText();

    // 4. Xóa file tạm
    Drive.Files.remove(tempFile.id);

    // 5. Phân tích văn bản để tìm ngày tháng (sử dụng logic từ file HTML)
    const extractedDate = findDateInText(recognizedText);

    if (extractedDate) {
      return createJsonResponse({ status: "SUCCESS", date: extractedDate });
    } else {
      return createJsonResponse({ status: "NOT_FOUND", message: "Không tìm thấy ngày giờ." });
    }

  } catch (error) {
    Logger.log(`Lỗi nghiêm trọng trong handlePerformOcr: ${error.message}. Stack: ${error.stack}`);
    // Không cần gửi email báo lỗi cho tác vụ này
    return createJsonResponse({ status: "ERROR", message: `Lỗi máy chủ khi xử lý ảnh: ${error.message}` });
  }
}
function handleGetTestDriveSchedule() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEST_DRIVE_SHEET_NAME);
  if (!sheet) {
    throw new Error(`Không tìm thấy trang tính "${TEST_DRIVE_SHEET_NAME}". Vui lòng chạy hàm setupTestDriveSheet.`);
  }
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return { status: 'SUCCESS', data: [] };
  }

  const headers = data[0];
  const spreadsheetTimeZone = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();

  const schedule = data.slice(1).map(row => {
    const booking = {};
    headers.forEach((header, index) => {
      const cellValue = row[index];
      if (cellValue instanceof Date) {
        if (['thoiGianKhoiHanh', 'thoiGianTroVe'].includes(header)) {
          booking[header] = Utilities.formatDate(cellValue, spreadsheetTimeZone, "HH:mm");
        } else {
          booking[header] = Utilities.formatDate(cellValue, spreadsheetTimeZone, "yyyy-MM-dd");
        }
      } else {
        booking[header] = cellValue;
      }
    });
    return booking;
  });

  return { status: 'SUCCESS', data: schedule };
}

function handleSaveTestDriveBooking(params) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEST_DRIVE_SHEET_NAME);
  if (!sheet) {
    throw new Error(`Không tìm thấy trang tính "${TEST_DRIVE_SHEET_NAME}".`);
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  const newRow = headers.map(header => {
    const value = params[header] || '';
    if ((header === 'dienThoai' || header === 'gplxSo') && value) {
      return "'" + value;
    }
    return value;
  });

  appendAndFormatRow(sheet, newRow);

  const newRecord = {};
  headers.forEach((header, index) => {
    newRecord[header] = params[header] || '';
  });

  return { status: 'SUCCESS', message: 'Lịch lái thử đã được lưu thành công.', newRecord: newRecord };
}

function handleUpdateTestDriveCheckin(data) {
  // Sửa lỗi: Sử dụng 'soPhieu' thay vì 'id' để khớp với dữ liệu từ frontend.
  const {
    soPhieu,
    odoBefore,
    odoAfter,
    imagesBefore,
    imagesAfter
  } = data;

  if (!soPhieu) {
    return createJsonResponse({
      success: false,
      message: 'Thiếu Số Phiếu của lịch hẹn.'
    });
  }

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEST_DRIVE_SHEET_NAME);
    if (!sheet) {
      throw new Error(`Không tìm thấy trang tính "${TEST_DRIVE_SHEET_NAME}".`);
    }

    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    const headers = values[0];
    const spreadsheetTimeZone = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();

    // Sửa lỗi: Tìm cột 'soPhieu' thay vì 'ID'.
    const soPhieuColIndex = headers.indexOf('soPhieu');
    if (soPhieuColIndex === -1) {
      throw new Error("Không tìm thấy cột 'soPhieu' trong trang tính.");
    }

    const rowIndex = values.findIndex(row => String(row[soPhieuColIndex]) === String(soPhieu));

    if (rowIndex === -1) {
      return createJsonResponse({
        success: false,
        message: 'Không tìm thấy lịch hẹn với Số Phiếu: ' + soPhieu
      });
    }

    const rowNumber = rowIndex + 1; // rowNumber là chỉ số 1-based cho getRange
    const rowData = values[rowIndex];

    // Cải tiến: Tạo thư mục lưu ảnh có cấu trúc để dễ quản lý.
    const tenTuVan = rowData[headers.indexOf('tenTuVan')];
    const tenKhachHang = rowData[headers.indexOf('tenKhachHang')];
    const ngayThuXe = new Date(rowData[headers.indexOf('ngayThuXe')]);
    const formattedDate = Utilities.formatDate(ngayThuXe, spreadsheetTimeZone, "yyyy-MM-dd");

    const folderPath = `${sanitizeFolderName(tenTuVan)}/${formattedDate}_${sanitizeFolderName(tenKhachHang)}`;
    const rootFolder = DriveApp.getFolderById(TEST_DRIVE_IMAGE_FOLDER_ID);
    const targetFolder = getOrCreateFolderByPath(rootFolder, folderPath);

    // Sửa lỗi: Tìm vị trí cột động thay vì dùng vị trí cố định.
    const updateCell = (headerName, value) => {
      const colIndex = headers.indexOf(headerName);
      if (value !== undefined && value !== null && colIndex !== -1) {
        sheet.getRange(rowNumber, colIndex + 1).setValue(value);
      }
    };

    const appendImages = (headerName, newImagesJson) => {
      const colIndex = headers.indexOf(headerName);
      if (newImagesJson && colIndex !== -1) {
        const existingImagesJson = sheet.getRange(rowNumber, colIndex + 1).getValue();
        let existingUrls = [];
        if (existingImagesJson && typeof existingImagesJson === 'string' && existingImagesJson.trim().startsWith('[')) {
          try {
            existingUrls = JSON.parse(existingImagesJson);
          } catch (e) {
            Logger.log(`Lỗi parse JSON ảnh cũ (${headerName}) cho soPhieu ${soPhieu}: ${e.toString()}`);
          }
        }

        // Sửa lỗi: Gọi hàm saveBase64FilesToDrive với đúng tham số.
        const newUrlsJsonString = saveBase64FilesToDrive(targetFolder, newImagesJson);
        const newUrls = JSON.parse(newUrlsJsonString);

        const combinedUrls = [...existingUrls, ...newUrls];
        sheet.getRange(rowNumber, colIndex + 1).setValue(JSON.stringify(combinedUrls));
      }
    };

    updateCell('odoBefore', odoBefore);
    updateCell('odoAfter', odoAfter);
    appendImages('imagesBefore', imagesBefore);
    appendImages('imagesAfter', imagesAfter);

    // Cải tiến: Trả về bản ghi đã được cập nhật để frontend có thể làm mới giao diện.
    const updatedRowData = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
    const updatedRecord = {};
    headers.forEach((header, index) => {
      const cellValue = updatedRowData[index];
      if (cellValue instanceof Date) {
        if (['thoiGianKhoiHanh', 'thoiGianTroVe'].includes(header)) {
          updatedRecord[header] = Utilities.formatDate(cellValue, spreadsheetTimeZone, "HH:mm");
        } else {
          updatedRecord[header] = Utilities.formatDate(cellValue, spreadsheetTimeZone, "yyyy-MM-dd");
        }
      } else {
        updatedRecord[header] = cellValue;
      }
    });

    return {
      success: true,
      message: 'Cập nhật check-in thành công.',
      updatedRecord: updatedRecord
    };

  } catch (e) {
    Logger.log('Lỗi nghiêm trọng trong handleUpdateTestDriveCheckin: ' + e.toString() + (e.stack ? '\n' + e.stack : ''));
    return createJsonResponse({
      success: false,
      message: 'Đã xảy ra lỗi hệ thống nghiêm trọng: ' + e.toString()
    });
  }
}

function handleDeleteTestDriveRequest(params) {
  const { soPhieu } = params;
  if (!soPhieu) {
    throw new Error("Thiếu 'số phiếu' để thực hiện xóa.");
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEST_DRIVE_SHEET_NAME);
  if (!sheet) throw new Error(`Không tìm thấy trang tính "${TEST_DRIVE_SHEET_NAME}".`);

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const soPhieuColIndex = headers.indexOf('soPhieu');
  if (soPhieuColIndex === -1) throw new Error("Không tìm thấy cột 'soPhieu'.");

  const rowIndex = data.findIndex(row => String(row[soPhieuColIndex]) === String(soPhieu));
  if (rowIndex === -1) throw new Error(`Không tìm thấy phiếu lái thử với số: ${soPhieu}`);

  const rowNumber = rowIndex + 1;
  const rowData = data[rowIndex];

  // Lấy danh sách đối tượng ảnh trước khi xóa
  const imagesBeforeData = JSON.parse(rowData[headers.indexOf('imagesBefore')] || '[]');
  const imagesAfterData = JSON.parse(rowData[headers.indexOf('imagesAfter')] || '[]');
  const allImageData = [...imagesBeforeData, ...imagesAfterData];

  // === SỬA ĐỔI TẠI ĐÂY ===
  // Xóa file ảnh trên Google Drive bằng cách truy cập vào thuộc tính 'url' của mỗi đối tượng.
  allImageData.forEach(imageObj => {
    if (imageObj && imageObj.url) { // Kiểm tra xem đối tượng và thuộc tính url có tồn tại không
      try {
        const fileId = imageObj.url.match(/id=([^&]+)/)[1];
        if (fileId) {
          DriveApp.getFileById(fileId).setTrashed(true);
          Logger.log(`Đã xóa file có ID: ${fileId}`);
        }
      } catch (e) {
        Logger.log(`Không thể xóa file từ URL: ${imageObj.url}. Lỗi: ${e.message}`);
      }
    }
  });

  // Xóa dòng trong trang tính
  sheet.deleteRow(rowNumber);

  return { status: 'SUCCESS', success: true, message: `Đã xóa thành công yêu cầu lái thử có số phiếu: ${soPhieu}` };
}

// MỚI: Hàm xử lý thêm ảnh vào yêu cầu lái thử đã tồn tại
function handleAddTestDriveImages(params) {
  const { soPhieu, imagesBefore, imagesAfter } = params;
  if (!soPhieu) throw new Error("Thiếu 'số phiếu' để cập nhật ảnh.");
  if (!imagesBefore && !imagesAfter) throw new Error("Không có ảnh mới để thêm.");

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEST_DRIVE_SHEET_NAME);
  if (!sheet) throw new Error(`Không tìm thấy trang tính "${TEST_DRIVE_SHEET_NAME}".`);

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const soPhieuColIndex = headers.indexOf('soPhieu');
  if (soPhieuColIndex === -1) throw new Error("Không tìm thấy cột 'soPhieu'.");

  const rowIndex = data.findIndex(row => String(row[soPhieuColIndex]) === String(soPhieu));
  if (rowIndex === -1) throw new Error(`Không tìm thấy phiếu lái thử với số: ${soPhieu}`);

  const rowNumber = rowIndex + 1;
  const rowData = data[rowIndex];
  const spreadsheetTimeZone = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();

  const tenTuVan = rowData[headers.indexOf('tenTuVan')];
  const tenKhachHang = rowData[headers.indexOf('tenKhachHang')];
  const ngayThuXe = new Date(rowData[headers.indexOf('ngayThuXe')]);
  const formattedDate = Utilities.formatDate(ngayThuXe, spreadsheetTimeZone, "yyyy-MM-dd");

  const folderPath = `${sanitizeFolderName(tenTuVan)}/${formattedDate}_${sanitizeFolderName(tenKhachHang)}`;
  const rootFolder = DriveApp.getFolderById(TEST_DRIVE_IMAGE_FOLDER_ID);
  const targetFolder = getOrCreateFolderByPath(rootFolder, folderPath);

  // Xử lý ảnh trước
  if (imagesBefore) {
    const imagesBeforeColIndex = headers.indexOf('imagesBefore');
    const existingUrls = JSON.parse(rowData[imagesBeforeColIndex] || '[]');
    const newUrlsJson = saveBase64FilesToDrive(targetFolder, imagesBefore);
    const newUrls = JSON.parse(newUrlsJson);
    const combinedUrls = JSON.stringify([...existingUrls, ...newUrls]);
    sheet.getRange(rowNumber, imagesBeforeColIndex + 1).setValue(combinedUrls);
  }

  // Xử lý ảnh sau
  if (imagesAfter) {
    const imagesAfterColIndex = headers.indexOf('imagesAfter');
    const existingUrls = JSON.parse(rowData[imagesAfterColIndex] || '[]');
    const newUrlsJson = saveBase64FilesToDrive(targetFolder, imagesAfter);
    const newUrls = JSON.parse(newUrlsJson);
    const combinedUrls = JSON.stringify([...existingUrls, ...newUrls]);
    sheet.getRange(rowNumber, imagesAfterColIndex + 1).setValue(combinedUrls);
  }

  // Trả về bản ghi đã cập nhật
  const updatedRowData = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  const updatedRecord = {};
  headers.forEach((header, index) => {
    const cellValue = updatedRowData[index];
    if (cellValue instanceof Date) {
      if (['thoiGianKhoiHanh', 'thoiGianTroVe'].includes(header)) {
        updatedRecord[header] = Utilities.formatDate(cellValue, spreadsheetTimeZone, "HH:mm");
      } else {
        updatedRecord[header] = Utilities.formatDate(cellValue, spreadsheetTimeZone, "yyyy-MM-dd");
      }
    } else {
      updatedRecord[header] = cellValue;
    }
  });

  return { status: 'SUCCESS', success: true, message: 'Cập nhật ảnh thành công.', updatedRecord: updatedRecord };
}


// =================================================================
//   CÁC HÀM TIỆN ÍCH
// =================================================================

function handleUpdateOrderDetails(e, sheets, updatedBy) {
  const { orderNumber } = e.parameter;
  const newDetails = e.parameter; // Lấy tất cả các tham số khác làm chi tiết mới

  if (!orderNumber) {
    throw new Error("Không có Số đơn hàng nào được cung cấp.");
  }

  const { daGhepSheet, chuaGhepSheet, stockSheet, mailSheet, nhatKyChinhSuaSheet } = sheets;
  const actionId = `update-${new Date().getTime()}`;

  // 1. Tìm đơn hàng trong cả hai sheet
  let orderInfo = findOrderInSheetSimple(orderNumber, [daGhepSheet, chuaGhepSheet]);
  if (!orderInfo) {
    throw new Error(`Không tìm thấy đơn hàng "${orderNumber}" trong cả sheet Đã Ghép và Chờ Ghép.`);
  }

  const { sheet, rowIndex, rowData } = orderInfo;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // 2. Xác định xem có thay đổi thông tin xe (critical) không
  const criticalFields = ["Dòng xe", "Phiên bản", "Ngoại thất", "Nội thất"];
  let hasCriticalChange = false;

  // Tạo một bản sao của dữ liệu hàng cũ để cập nhật
  const newRowObject = { ...rowData };

  for (const key in newDetails) {
    if (key !== 'action' && key !== 'orderNumber' && key !== 'updatedBy' && headers.includes(key)) {
      if (newDetails[key] !== rowData[key]) {
        newRowObject[key] = newDetails[key]; // Cập nhật giá trị mới
        if (criticalFields.includes(key)) {
          hasCriticalChange = true;
        }
      }
    }
  }

  // 3. Xử lý logic dựa trên sheet tìm thấy

  // ----- TRƯỜNG HỢP 1: ĐƠN HÀNG ĐÃ GHÉP XE (DaGhep) -----
  if (sheet.getName() === DA_GHEP_SHEET_NAME) {
    if (hasCriticalChange) {
      // KHÔNG cho phép thay đổi thông tin xe khi đã ghép
      throw new Error("Không thể thay đổi thông tin xe đã được ghép. Vui lòng 'Hủy Ghép' trước khi cập nhật.");
    }

    // Chỉ cập nhật thông tin phụ (tên KH, ngày cọc,...)
    updateRowInSheet(sheet, rowIndex, headers, newRowObject, rowData, updatedBy, actionId, nhatKyChinhSuaSheet);
    recordOrderHistory(orderNumber, rowData["VIN"], "Cập nhật thông tin", `Cập nhật chi tiết đơn hàng (ví dụ: tên KH) bởi ${updatedBy}`, newRowObject);
    return { status: "SUCCESS", message: `Đã cập nhật thông tin cho đơn hàng ${orderNumber}.` };
  }

  // ----- TRƯỜNG HỢP 2: ĐƠN HÀNG CHƯA GHÉP XE (ChuaGhep) -----
  if (sheet.getName() === CHUA_GHEP_SHEET_NAME) {
    // Luôn cập nhật thông tin trên sheet 'ChuaGhep' trước
    updateRowInSheet(sheet, rowIndex, headers, newRowObject, rowData, updatedBy, actionId, nhatKyChinhSuaSheet);

    // Nếu thông tin xe thay đổi, thử chạy lại thuật toán ghép xe
    if (hasCriticalChange) {
      Logger.log(`Phát hiện thay đổi thông tin xe cho ĐH ${orderNumber}. Đang thử tìm xe mới...`);
      const matchedCarInfo = matchCarAutomatically(newRowObject["Dòng xe"], newRowObject["Phiên bản"], newRowObject["Ngoại thất"], newRowObject["Nội thất"], stockSheet);

      if (matchedCarInfo) {
        // TÌM THẤY XE! Chuyển đơn hàng từ 'ChuaGhep' sang 'DaGhep'
        Logger.log(`Đã tìm thấy VIN ${matchedCarInfo.vin} phù hợp. Đang chuyển sang DaGhep...`);

        const daGhepHeaders = SHEET_HEADERS["DaGhep"];
        const finalDaGhepRow = {};
        const currentTime = new Date();

        daGhepHeaders.forEach(header => {
          finalDaGhepRow[header] = newRowObject[header] || ""; // Lấy từ dữ liệu đã cập nhật
        });

        finalDaGhepRow["VIN"] = matchedCarInfo.vin;
        finalDaGhepRow["Kết quả"] = "Đã ghép";
        finalDaGhepRow["Thời gian ghép"] = formatDateTimeForSheet(currentTime);
        const targetRow = daGhepSheet.getLastRow() + 1;
        finalDaGhepRow["Số ngày ghép"] = `=IFERROR(DATEDIF(K${targetRow};TODAY();"D"))`; // Giả sử K là cột Thời gian ghép

        // Gửi email
        const emailData = {
          ten_ban_hang: finalDaGhepRow["Tên tư vấn bán hàng"],
          ten_khach_hang: finalDaGhepRow["Tên khách hàng"],
          dong_xe: finalDaGhepRow["Dòng xe"], phien_ban: finalDaGhepRow["Phiên bản"],
          ngoai_that: finalDaGhepRow["Ngoại thất"], noi_that: finalDaGhepRow["Nội thất"],
          so_don_hang: orderNumber, ngay_coc: finalDaGhepRow["Ngày cọc"],
          thoi_gian_nhap: finalDaGhepRow["Thời gian nhập"]
        };
        const emailSent = sendEmailNotification(mailSheet, emailData, matchedCarInfo.vin, matchedCarInfo.maDMS, currentTime);
        finalDaGhepRow["Trạng thái gửi mail"] = emailSent ? "Đã gửi" : "Lỗi gửi";

        // Thêm vào DaGhep và Xóa khỏi ChuaGhep
        appendAndFormatRow(daGhepSheet, daGhepHeaders.map(header => finalDaGhepRow[header] || ""));
        chuaGhepSheet.deleteRow(rowIndex);

        recordOrderHistory(orderNumber, matchedCarInfo.vin, "Cập nhật & Tự động ghép", `ĐH được cập nhật và ghép tự động bởi ${updatedBy}`, finalDaGhepRow);
        recordVehicleHistory(matchedCarInfo.vin, "Ghép tự động (Sau Cập nhật)", `Ghép với đơn hàng ${orderNumber}`);
        addNotification(`ĐH ${orderNumber} đã được cập nhật và ghép thành công với xe ${matchedCarInfo.vin}.`, 'success', 'daGhep', orderNumber, updatedBy, emailData.ten_ban_hang);

        return {
          status: "SUCCESS",
          message: `Đã cập nhật đơn hàng ${orderNumber} và tự động ghép thành công với VIN ${matchedCarInfo.vin}!`,
          autoMatched: true,
          vin: matchedCarInfo.vin
        };
      }
    }

    // Nếu không có thay đổi quan trọng, hoặc có thay đổi nhưng không tìm thấy xe mới
    recordOrderHistory(orderNumber, "", "Cập nhật thông tin", `Cập nhật chi tiết đơn hàng bởi ${updatedBy} (vẫn đang chờ)`, newRowObject);
    return { status: "SUCCESS", message: `Đã cập nhật thông tin cho đơn hàng ${orderNumber}. (Đơn hàng vẫn ở hàng chờ).` };
  }

  throw new Error("Đã xảy ra lỗi logic không xác định.");
}
/**
 * [HÀM HỖ TRỢ MỚI] - Tìm một đơn hàng trong danh sách các sheet.
 * Trả về thông tin chi tiết về vị trí và dữ liệu của hàng.
 */
function handleAddChatMessage(params, senderName, senderRole) {
  const { message, mentionedUsers, replyToId, fileId, recipient } = params;

  if ((!message || message.trim() === '') && !fileId) {
    return { status: "ERROR", message: "Tin nhắn hoặc file không được để trống." };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const chatSheet = ss.getSheetByName(CHAT_SHEET_NAME);

  if (!chatSheet) {
    return { status: "ERROR", message: "Chưa cài đặt trang tính ChatHistory." };
  }

  const timestamp = new Date().toISOString();

  // Format: ["Timestamp", "Sender", "Role", "Message", "MentionedUsers", "Reactions", "ReplyTo", "IsPinned", "FileId"]
  chatSheet.appendRow([
    timestamp,
    senderName,
    senderRole || DEFAULT_ROLE,
    message || "",
    mentionedUsers || "",
    "{}", // Reactions
    replyToId || "",
    "FALSE", // IsPinned
    fileId || "",
    recipient || ""
  ]);

  // Nếu có nhắc tên ai đó (@user)
  try {
    if (mentionedUsers && mentionedUsers !== "[]") {
      const mentions = JSON.parse(mentionedUsers);
      mentions.forEach(mention => {
        // Tạo Notification cho người được nhắc
        addNotification(
          `${senderName} đã nhắc đến bạn trong Phòng Chat.`,
          'info',
          'chat',
          timestamp, // dùng timestamp làm ID tạm
          senderName,
          mention
        );
      });
    }
  } catch (e) {
    Logger.log("Lỗi xử lý tag tên trong chat: " + e.message);
  }

  // Xóa bớt tin nhắn cũ nếu quá 1000 dòng để tránh sheet bị quá tải (dọn dẹp định kỳ)
  const lastRow = chatSheet.getLastRow();
  if (lastRow > 5000) {
    // Để lại 1000 dòng mới nhất
    chatSheet.deleteRows(2, lastRow - 1001);
  }

  return { status: "SUCCESS", message: "Đã gửi tin nhắn." };
}

/**
 * Handle retrieving chat messages
 */
function handleGetChatMessages(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const chatSheet = ss.getSheetByName(CHAT_SHEET_NAME);

    if (!chatSheet) {
      return createJsonResponse({ status: "SUCCESS", messages: [] });
    }

    const limit = parseInt(params.limit || '50', 10);
    const searchTerm = (params.search || "").toLowerCase();
    const lastRow = chatSheet.getLastRow();

    if (lastRow <= 1) {
      return createJsonResponse({ status: "SUCCESS", messages: [] });
    }

    // Luôn quét qua 1000 dòng gần nhất để tránh sót tin nhắn riêng quá cũ
    const searchLimit = Math.min(lastRow - 1, 1000);
    const startRow = Math.max(2, lastRow - searchLimit + 1);
    const numRows = lastRow - startRow + 1;

    const dataRange = chatSheet.getRange(startRow, 1, numRows, 10); // 10 columns now
    const values = dataRange.getValues();

    let messages = values.map((row, idx) => {
      if (!row[0] || !row[1]) return null;

      const msgText = row[3] || "";
      const sender = row[1] || "";

      // Lọc theo search term
      if (searchTerm && !msgText.toLowerCase().includes(searchTerm) && !sender.toLowerCase().includes(searchTerm)) {
        return null;
      }

      let mentions = [];
      try { if (row[4]) mentions = JSON.parse(row[4]); } catch (e) { }

      let reactions = {};
      try { if (row[5]) reactions = JSON.parse(row[5]); } catch (e) { }

      const recipient = row[9] || "";
      if (recipient) {
        if (sender !== params.currentUser && recipient !== params.currentUser &&
          sender !== params.currentUserName && recipient !== params.currentUserName) {
          return null; // Skip private message if not involved
        }
      }

      return {
        id: row[0] + row[1] + (startRow + idx),
        timestamp: row[0],
        senderName: row[1],
        senderRole: row[2],
        message: msgText,
        mentions: mentions,
        reactions: reactions,
        replyTo: row[6] || null,
        isPinned: row[7] === "TRUE" || row[7] === true,
        fileId: row[8] || null,
        recipient: recipient
      };
    }).filter(msg => msg !== null);

    // Nếu search, giới hạn kết quả trả về
    if (searchTerm) {
      messages = messages.slice(-limit);
    }

    return createJsonResponse({ status: "SUCCESS", messages: messages, readStatus: getChatReadStatus() });
  } catch (error) {
    return createJsonResponse({ status: "ERROR", message: error.message });
  }
}

/**
 * Cập nhật thời điểm xem tin nhắn cuối cùng của người dùng bằng cách lưu JSON vào 1 ô trong ChatHistory
 */
function handleMarkChatAsRead(username) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const chatSheet = ss.getSheetByName(CHAT_SHEET_NAME);

  if (!chatSheet) {
    return { status: "ERROR", message: "Chưa cài đặt trang tính ChatHistory." };
  }

  // Chúng ta sẽ lưu JSON map ở ô Z1 (cột thứ 26) thay vì F1 (cột thứ 6) để không đè lên Header
  const statusCell = chatSheet.getRange(1, 26);
  let statusMap = {};
  const currentContent = statusCell.getValue();

  try {
    if (currentContent && currentContent.startsWith('{')) {
      statusMap = JSON.parse(currentContent);
    }
  } catch (e) {
    statusMap = {};
  }

  statusMap[username] = new Date().toISOString();
  statusCell.setValue(JSON.stringify(statusMap));

  return { status: "SUCCESS" };
}

/**
 * Lấy danh sách thời gian xem tin nhắn lưu trong ô Z1 của ChatHistory
 */
function handleToggleMessageReaction(params, username) {
  const { timestamp, senderName, emoji } = params;
  if (!timestamp || !senderName || !emoji) {
    return { status: "ERROR", message: "Thiếu thông tin tin nhắn hoặc emoji." };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const chatSheet = ss.getSheetByName(CHAT_SHEET_NAME);
  if (!chatSheet) return { status: "ERROR", message: "Không tìm thấy trang chat." };

  const lastRow = chatSheet.getLastRow();
  const data = chatSheet.getRange(2, 1, lastRow - 1, 6).getValues();

  // Tìm đúng tin nhắn dựa trên timestamp và sender (vì timestamp ISO gần như là duy nhất)
  let foundRowIndex = -1;
  for (let i = data.length - 1; i >= 0; i--) {
    if (new Date(data[i][0]).toISOString() === new Date(timestamp).toISOString() && data[i][1] === senderName) {
      foundRowIndex = i + 2; // +2 vì index bắt đầu từ 0 và data lấy từ dòng 2
      break;
    }
  }

  if (foundRowIndex === -1) return { status: "ERROR", message: "Không tìm thấy tin nhắn để thả cảm xúc." };

  const reactionsCell = chatSheet.getRange(foundRowIndex, 6);
  let reactions = {};
  try {
    const content = reactionsCell.getValue();
    if (content) reactions = JSON.parse(content);
  } catch (e) { }

  if (!reactions[emoji]) reactions[emoji] = [];

  const userIdx = reactions[emoji].indexOf(username);
  if (userIdx > -1) {
    // Nếu đã thả rồi thì xóa đi (un-react)
    reactions[emoji].splice(userIdx, 1);
    if (reactions[emoji].length === 0) delete reactions[emoji];
  } else {
    // Nếu chưa thả thì thêm vào
    reactions[emoji].push(username);

    // Tạo notification cho người gửi tin nhắn gốc (nếu không phải chính mình)
    if (senderName !== username) {
      addNotification(
        `${username} đã thả cảm xúc ${emoji} vào tin nhắn của bạn.`,
        'success',
        'chat',
        new Date().getTime().toString(),
        username,
        senderName
      );
    }
  }

  reactionsCell.setValue(JSON.stringify(reactions));
  return { status: "SUCCESS", reactions: reactions };
}

/**
 * Thu hồi tin nhắn trong vòng 60 phút
 */
function handleRevokeChatMessage(params, username) {
  const { timestamp, senderName } = params;
  if (!timestamp || !senderName) {
    return { status: "ERROR", message: "Thiếu thông tin tin nhắn." };
  }

  // Phải đúng là người gửi mới được thu hồi
  if (senderName !== username) {
    return { status: "ERROR", message: "Bạn không thể thu hồi tin nhắn của người khác." };
  }

  const msgTime = new Date(timestamp).getTime();
  const now = new Date().getTime();
  const diffMinutes = (now - msgTime) / (1000 * 60);

  if (diffMinutes > 60) {
    return { status: "ERROR", message: "Đã quá 60 phút, không thể thu hồi tin nhắn này." };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const chatSheet = ss.getSheetByName(CHAT_SHEET_NAME);
  if (!chatSheet) return { status: "ERROR", message: "Không tìm thấy trang chat." };

  const lastRow = chatSheet.getLastRow();
  const data = chatSheet.getRange(2, 1, lastRow - 1, 2).getValues(); // Chỉ cần cột 1 và 2 để tìm

  let foundRowIndex = -1;
  for (let i = data.length - 1; i >= 0; i--) {
    if (new Date(data[i][0]).toISOString() === new Date(timestamp).toISOString() && data[i][1] === senderName) {
      foundRowIndex = i + 2;
      break;
    }
  }

  if (foundRowIndex === -1) return { status: "ERROR", message: "Không tìm thấy tin nhắn để thu hồi." };

  chatSheet.getRange(foundRowIndex, 4).setValue("Tin nhắn đã bị thu hồi");
  // Xóa mentions, reactions, fileId
  chatSheet.getRange(foundRowIndex, 5, 1, 5).setValues([["", "{}", "", "FALSE", ""]]);

  return { status: "SUCCESS", message: "Đã thu hồi tin nhắn." };
}

/**
 * Tải file/ảnh lên Drive từ chat
 */
function handleUploadChatFile(params, username) {
  const { base64Data, fileName, mimeType } = params;
  if (!base64Data || !fileName) return { status: "ERROR", message: "Thiếu dữ liệu file." };

  try {
    // Tìm hoặc tạo folder chat
    let folder;
    const folders = DriveApp.getFoldersByName(CHAT_IMAGES_FOLDER_NAME);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(CHAT_IMAGES_FOLDER_NAME);
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }

    const decoded = Utilities.base64Decode(base64Data.split(',')[1] || base64Data);
    const blob = Utilities.newBlob(decoded, mimeType || "application/octet-stream", fileName);
    const file = folder.createFile(blob);

    return { status: "SUCCESS", fileId: file.getId(), fileName: fileName };
  } catch (e) {
    return { status: "ERROR", message: "Lỗi upload: " + e.message };
  }
}

/**
 * Ghim hoặc bỏ ghim tin nhắn
 */
function handleTogglePinMessage(params, username) {
  const { timestamp, senderName } = params;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const chatSheet = ss.getSheetByName(CHAT_SHEET_NAME);
  if (!chatSheet) return { status: "ERROR", message: "Không tìm thấy trang chat." };

  const lastRow = chatSheet.getLastRow();
  if (lastRow < 2) return { status: "ERROR", message: "Không có tin nhắn." };

  const data = chatSheet.getRange(2, 1, lastRow - 1, 8).getValues();
  let foundRow = -1;

  for (let i = data.length - 1; i >= 0; i--) {
    if (new Date(data[i][0]).toISOString() === new Date(timestamp).toISOString() && data[i][1] === senderName) {
      foundRow = i + 2;
      break;
    }
  }

  if (foundRow === -1) return { status: "ERROR", message: "Không tìm thấy tin nhắn." };

  const currentPin = chatSheet.getRange(foundRow, 8).getValue();
  const newPin = !(currentPin === "TRUE" || currentPin === true);

  if (newPin) {
    // Bỏ ghim tất cả các tin nhắn khác trước khi ghim tin mới
    chatSheet.getRange(2, 8, lastRow - 1).setValue("FALSE");
  }

  chatSheet.getRange(foundRow, 8).setValue(newPin ? "TRUE" : "FALSE");

  return { status: "SUCCESS", isPinned: newPin };
}

/**
 * Lấy danh sách tin nhắn đang ghim
 */
function handleGetPinnedMessages() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const chatSheet = ss.getSheetByName(CHAT_SHEET_NAME);
  if (!chatSheet) return { status: "SUCCESS", messages: [] };

  const lastRow = chatSheet.getLastRow();
  if (lastRow < 2) return { status: "SUCCESS", messages: [] };

  const data = chatSheet.getRange(2, 1, lastRow - 1, 9).getValues();
  const pinned = data.filter(row => row[7] === "TRUE" || row[7] === true).map((row, idx) => ({
    timestamp: row[0],
    senderName: row[1],
    message: row[3],
    isPinned: true,
    fileId: row[8] || null
  }));

  return { status: "SUCCESS", messages: pinned };
}

/**
 * Xử lý đồng bộ từ Supabase về Google Sheet
 * Được gọi thông qua Webhook của Supabase khi bảng yeucauxhd có thay đổi
 */
function handleSyncYeuCauXhd(payload) {
  const type = payload.type; // INSERT, UPDATE, DELETE
  const record = payload.record;
  const oldRecord = payload.old_record;

  if (!record && !oldRecord) {
    throw new Error("Invalid payload: no record");
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(XUAT_HOA_DON_SHEET_NAME);
  if (!sheet) throw new Error("Không tìm thấy sheet " + XUAT_HOA_DON_SHEET_NAME);

  const so_don_hang = (record || oldRecord).so_don_hang;
  if (!so_don_hang) throw new Error("Thiếu số đơn hàng.");

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  let rowIndex = -1;

  // SỐ ĐƠN HÀNG nằm ở cột 3 (index 2) trong Xuathoadon
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] && data[i][2].toString().trim().toUpperCase() === so_don_hang.trim().toUpperCase()) {
      rowIndex = i + 1;
      break;
    }
  }

  if (type === 'DELETE') {
    if (rowIndex > -1) {
      sheet.deleteRow(rowIndex);
      return { message: "Đã xóa yêu cầu XHĐ cho " + so_don_hang };
    }
    return { message: "Không tìm thấy yêu cầu XHĐ để xóa trên Google Sheet" };
  }

  // Xử lý chung cho INSERT và UPDATE
  const rowData = new Array(headers.length).fill('');

  // Hàm format ngày giờ
  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      return Utilities.formatDate(date, 'GMT+7', 'dd/MM/yyyy HH:mm:ss');
    } catch (e) {
      return isoString;
    }
  };

  // Map dữ liệu từ record vào rowData
  rowData[1] = record.ten_khach_hang || '';
  rowData[2] = record.so_don_hang || '';
  rowData[3] = record.dong_xe || '';
  rowData[4] = record.phien_ban || '';
  rowData[5] = record.ngoai_that || '';
  rowData[6] = record.noi_that || '';
  rowData[7] = record.tvbh || '';
  rowData[8] = record.vin || '';
  rowData[9] = record.so_may || '';
  rowData[10] = formatDateTime(record.ngay_yeu_cau);
  rowData[11] = formatDateTime(record.ngay_xuat_hoa_don);
  rowData[12] = record.hoa_hong_ung || '';
  rowData[13] = record.vpoint || '';
  rowData[14] = record.chinh_sach || '';
  rowData[15] = formatDateTime(record.ngay_coc) || record.ngay_coc || '';
  rowData[16] = record.ket_qua_gui_mail || record.trang_thai || '';
  rowData[17] = record.url_hop_dong || '';
  rowData[18] = record.url_de_nghi_xhd || '';
  rowData[19] = record.url_hoa_don_da_xuat || '';
  rowData[20] = record.trang_thai_vc || '';

  if (rowIndex > -1) {
    // Preserve STT
    rowData[0] = data[rowIndex - 1][0];

    // Nếu có cột nằm ngoài phạm vi map, giữ lại nguyên gốc
    for (let i = 0; i < headers.length; i++) {
      if (rowData[i] === '' && data[rowIndex - 1][i]) {
        rowData[i] = data[rowIndex - 1][i];
      }
    }

    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    return { message: "Đã cập nhật yêu cầu XHĐ cho " + so_don_hang };
  } else {
    // Sinh số TT mới (cột đầu)
    let newStt = 1;
    if (data.length > 1) {
      const lastStt = parseInt(data[data.length - 1][0]);
      if (!isNaN(lastStt)) newStt = lastStt + 1;
      else newStt = data.length;
    }
    rowData[0] = newStt;
    sheet.appendRow(rowData);
    return { message: "Đã thêm mới yêu cầu XHĐ cho " + so_don_hang };
  }
}

/**
 * Xử lý thông báo sau khi hóa đơn đã được tải lên Supabase Storage thành công.
 * Hàm này sẽ cập nhật các sheet liên quan và gửi email cho TVBH.
 */
function handleNotifyInvoiceUploaded(e) {
  try {
    const orderNumber = String(e.parameter.orderNumber || "").trim();
    const uploadedBy = e.parameter.uploadedBy || "Admin";
    const url = e.parameter.url;

    if (!orderNumber || !url) {
      throw new Error("Thiếu số đơn hàng hoặc URL hóa đơn.");
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheets = getSheets(ss);
    const { daGhepSheet, mailSheet, xuathoadonSheet } = sheets;

    // 1. Lấy blob từ URL (Supabase hoặc Drive)
    const blob = getFileBlobFromUrl(url);
    if (!blob) {
      throw new Error(`Không thể lấy file từ URL: ${url}`);
    }

    // 2. Lấy thông tin đơn hàng
    let daGhepRowData = findRowByKeyValue(daGhepSheet, "Số đơn hàng", orderNumber);
    let customerName, tvbhName, vin, dongXe, phienBan, ngoaiThat, noiThat;

    if (daGhepRowData) {
      customerName = daGhepRowData["Tên khách hàng"];
      tvbhName = daGhepRowData["Tên tư vấn bán hàng"];
      vin = daGhepRowData["VIN"];
      dongXe = daGhepRowData["Dòng xe"];
      phienBan = daGhepRowData["Phiên bản"];
      ngoaiThat = daGhepRowData["Ngoại thất"];
      noiThat = daGhepRowData["Nội thất"];
    } else {
      let supaDh = fetchSupabase('donhang', `so_don_hang=eq.${orderNumber}`);
      if (!supaDh || supaDh.length === 0) {
        supaDh = fetchSupabase('donhang', `so_don_hang=ilike.*${orderNumber}*`);
      }
      if (supaDh && supaDh.length > 0) {
        const r = supaDh[0];
        customerName = r.ten_khach_hang;
        tvbhName = r.ten_tu_van_ban_hang;
        vin = r.vin;
        dongXe = r.dong_xe;
        phienBan = r.phien_ban;
        ngoaiThat = r.ngoai_that;
        noiThat = r.noi_that;
      }
    }

    // 3. Cập nhật sheet (Dùng Lock để tránh xung đột)
    const updateLogic = () => {
      const xuathoadonRowIndex = findRowIndexByKeyValue(xuathoadonSheet, "SỐ ĐƠN HÀNG", orderNumber);
      const daghepRowIndex = findRowIndexByKeyValue(daGhepSheet, "Số đơn hàng", orderNumber);

      // Chỉ cập nhật sheet Xuathoadon, bảng donhang đã độc lập trên Supabase
      if (xuathoadonRowIndex > -1) {
        const xhdHeaders = SHEET_HEADERS["Xuathoadon"];
        const urlCol = xhdHeaders.indexOf("URL Hóa Đơn Đã Xuất");
        if (urlCol > -1) {
          xuathoadonSheet.getRange(xuathoadonRowIndex, urlCol + 1).setValue(url);
        }
        const ngayXuatCol = xhdHeaders.indexOf("NGÀY XUẤT HÓA ĐƠN");
        if (ngayXuatCol > -1) {
          xuathoadonSheet.getRange(xuathoadonRowIndex, ngayXuatCol + 1).setValue(new Date());
        }
      }
      recordOrderHistory(orderNumber, vin || "N/A", "Tải lên Hóa đơn (Supabase)", `Đã tải lên Supabase bởi ${uploadedBy}.`);
    };

    doReadWriteLock(updateLogic);

    // 4. Gửi email
    const orderDataForEmail = {
      so_don_hang: orderNumber,
      ten_khach_hang: customerName || "Khách hàng",
      ten_tu_van_ban_hang: tvbhName || "Admin",
      vin: vin || "N/A",
      dong_xe: dongXe || "",
      phien_ban: phienBan || "",
      ngoai_that: ngoaiThat || "",
      noi_that: noiThat || ""
    };

    const xuathoadonRowIndex = findRowIndexByKeyValue(xuathoadonSheet, "SỐ ĐƠN HÀNG", orderNumber);
    const emailSent = sendIssuedInvoiceWithAttachment(mailSheet, orderDataForEmail, blob, xuathoadonSheet, xuathoadonRowIndex);

    if (emailSent) {
      addNotification(`Hóa đơn cho ĐH ${orderNumber} đã được tải lên thành công.`, 'success', 'xuatHoaDon', orderNumber, uploadedBy, tvbhName);
      return createJsonResponse({ status: 'SUCCESS', message: 'Hóa đơn đã được ghi nhận và email đã gửi thành công!' });
    } else {
      return createJsonResponse({ status: 'WARNING', message: 'Hóa đơn đã ghi nhận nhưng GỬI MAIL THẤT BẠI. Vui lòng kiểm tra lại email TVBH.' });
    }

  } catch (err) {
    Logger.log(`Lỗi trong handleNotifyInvoiceUploaded: ${err.message}`);
    return createJsonResponse({ status: 'ERROR', message: err.message });
  }
}
