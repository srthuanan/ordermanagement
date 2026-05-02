function _getOrCreateArchiveFolder() {
  try {
    if (DRIVE_FOLDER_ID && DRIVE_FOLDER_ID.length > 5) {
      try {
        return DriveApp.getFolderById(DRIVE_FOLDER_ID);
      } catch (e) {
        logAction("Drive Search", `ID ${DRIVE_FOLDER_ID} bị từ chối. Đang tìm thư mục thay thế...`);
      }
    }
    
    // TỰ PHỤC HỒI: Tìm folder tên 'SUPABASE_STORAGE_ARCHIVE' trong Root
    const it = DriveApp.getRootFolder().getFoldersByName("SUPABASE_STORAGE_ARCHIVE");
    if (it.hasNext()) return it.next();
    
    const newFolder = DriveApp.getRootFolder().createFolder("SUPABASE_STORAGE_ARCHIVE");
    logAction("Drive Reset", `Đã tạo thư mục lưu trữ mới: ${newFolder.getName()}`);
    return newFolder;
  } catch (e) { 
    logAction("Drive Critical", `Không thể truy cập DriveApp: ${e.message}`);
    return null; 
  }
}

function _processSingleOrder(serviceKey, soDonHang, parentFolder = null) {
  if (!soDonHang) return;
  const cleanOrderNo = String(soDonHang).trim();
  
  try {
    const searchUrl = `${SUPABASE_URL}/rest/v1/yeucauxhd?so_don_hang=ilike.${cleanOrderNo}&select=*`;
    const res = UrlFetchApp.fetch(searchUrl, { headers: { "apikey": serviceKey, "Authorization": "Bearer " + serviceKey } });
    const records = JSON.parse(res.getContentText());
    
    if (!records || records.length === 0) {
      logAction("Migration Skip", `Không tìm thấy đơn [${cleanOrderNo}] để lưu tệp.`);
      return { status: "SKIP", message: "Not found" };
    }
    const record = records[0];
    const customerName = (record.ten_khach_hang || 'KH vãng lai').trim();

    // 1. CHUẨN BỊ THƯ MỤC CÔNG PHU (Dựa trên Ngày yêu cầu của Đơn hàng)
    const root = parentFolder || _getOrCreateArchiveFolder();
    if (!root) throw new Error("Thư mục gốc Drive không hợp lệ.");

    // Lấy ngày từ cột 'ngay_yeu_cau' (nếu không có thì dùng ngày hiện tại)
    let orderDate = new Date();
    if (record.ngay_yeu_cau) {
      try {
        orderDate = new Date(record.ngay_yeu_cau);
      } catch (e) {}
    }
    
    const year = orderDate.getFullYear().toString();
    const month = "Tháng " + (orderDate.getMonth() + 1).toString();
    const day = "Ngày " + orderDate.getDate().toString();

    const folderYear = _getOrCreateSubFolder(root, year);
    const folderMonth = _getOrCreateSubFolder(folderYear, month);
    const folderDay = _getOrCreateSubFolder(folderMonth, day);
    const orderFolder = _getOrCreateSubFolder(folderDay, customerName);

    const linkMapping = {};
    const filesToDelete = [];
    
    // Bản đồ đặt tên file Tiếng Việt
    const namingMap = {
      'url_hop_dong': 'HĐMB',
      'url_de_nghi_xhd': 'ĐNXHĐ',
      'url_hoa_don_da_xuat': 'HÓA ĐƠN'
    };
    
    Object.keys(namingMap).forEach(key => {
      const url = String(record[key] || "");
      if (url && (url.includes("supabase.co") || url.includes("/storage/v1/object/")) && !url.includes("drive.google.com")) {
        try {
          const prefix = namingMap[key];
          const finalFileName = `${prefix} - ${customerName} - ${cleanOrderNo}.pdf`;
          
          // Bổ sung apikey để đảm bảo quyền truy cập file private (nếu có)
          const response = UrlFetchApp.fetch(url, { 
            headers: { 
              "apikey": serviceKey,
              "Authorization": "Bearer " + serviceKey 
            }, 
            muteHttpExceptions: true 
          });

          if (response.getResponseCode() === 200) {
            const blob = response.getBlob().setName(finalFileName);
            
            const oldFiles = orderFolder.getFilesByName(finalFileName);
            while (oldFiles.hasNext()) {
                const oldFile = oldFiles.next();
                oldFile.setTrashed(true);
            }

            const file = orderFolder.createFile(blob);
            try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
            
            linkMapping[key] = `https://drive.google.com/file/d/${file.getId()}/preview`;
            filesToDelete.push(url);
            logAction("Migration", `Đã migrate: ${finalFileName}`);
          }
        } catch (fErr) {
          logAction("Migration ERR", `Lỗi tải file ${key}: ${fErr.message}`);
        }
      }
    });

    // 2. CẬP NHẬT DATABASE & DỌN DẸP
    if (Object.keys(linkMapping).length > 0) {
      // a. Cập nhật record
      UrlFetchApp.fetch(`${SUPABASE_URL}/rest/v1/yeucauxhd?so_don_hang=eq.${cleanOrderNo}`, {
        method: "PATCH",
        contentType: "application/json",
        headers: { "apikey": serviceKey, "Authorization": "Bearer " + serviceKey },
        payload: JSON.stringify(linkMapping),
        muteHttpExceptions: true
      });

      // b. Cập nhật donhang
      const dhMapping = {};
      if (linkMapping['url_hop_dong']) dhMapping['link_hop_dong'] = linkMapping['url_hop_dong'];
      if (linkMapping['url_de_nghi_xhd']) dhMapping['link_de_nghi_xhd'] = linkMapping['url_de_nghi_xhd'];
      if (linkMapping['url_hoa_don_da_xuat']) dhMapping['link_hoa_don_da_xuat'] = linkMapping['url_hoa_don_da_xuat'];
      
      if (Object.keys(dhMapping).length > 0) {
        UrlFetchApp.fetch(`${SUPABASE_URL}/rest/v1/donhang?so_don_hang=eq.${cleanOrderNo}`, {
          method: "PATCH",
          contentType: "application/json",
          headers: { "apikey": serviceKey, "Authorization": "Bearer " + serviceKey },
          payload: JSON.stringify(dhMapping),
          muteHttpExceptions: true
        });
      }
      
      logAction("Step 2: OK", `Đã đổi link Drive cho đơn ${cleanOrderNo}`);

      // 3. CHIẾN DỊCH "HÚT BỤI" (Lấy danh sách và xóa toàn bộ folder trên Supabase)
      try {
        const bucket = "yeucauxhd-files";
        const listUrl = `${SUPABASE_URL}/storage/v1/object/list/${bucket}`;
        const listRes = UrlFetchApp.fetch(listUrl, {
          method: "POST",
          contentType: "application/json",
          headers: { "apikey": serviceKey, "Authorization": "Bearer " + serviceKey },
          payload: JSON.stringify({ prefix: `${cleanOrderNo}/`, limit: 100 })
        });

        if (listRes.getResponseCode() === 200) {
          const filesInFolder = JSON.parse(listRes.getContentText());
          if (filesInFolder.length > 0) {
            let deletedCount = 0;
            filesInFolder.forEach(f => {
               try {
                 const filePath = `${cleanOrderNo}/${f.name}`;
                 const deleteUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${filePath}`;
                 const delRes = UrlFetchApp.fetch(deleteUrl, {
                   method: "DELETE",
                   headers: { "apikey": serviceKey, "Authorization": "Bearer " + serviceKey },
                   muteHttpExceptions: true
                 });
                 if (delRes.getResponseCode() === 200) deletedCount++;
               } catch (e) {}
            });
            logAction("Storage Clean", `Đã dọn dẹp ${deletedCount}/${filesInFolder.length} file tại folder ${cleanOrderNo}/`);
          }
        }
      } catch (cleanErr) {
        logAction("Clean ERR", cleanErr.message);
      }
    }
    
    return { status: "SUCCESS" };
  } catch (err) {
    logAction("FATAL ERROR", `Lỗi xử lý lưu trữ: ${err.message}`);
    return { status: "ERROR", message: err.message };
  }
}

function _getOrCreateSubFolder(parent, name) {
  const it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parent.createFolder(name);
}

function archiveOrderNow(soDonHang) {
  return _processSingleOrder(SUPABASE_SERVICE_KEY, soDonHang);
}

/**
 * Lưu các ảnh đã tách từ PDF vào thư mục 'Ảnh' của đơn hàng
 */
function saveAllSplitImagesToDrive(orderNumber, customerName, documentGroups) {
  try {
    const root = _getOrCreateArchiveFolder();
    if (!root) throw new Error("Không thể truy cập thư mục gốc Drive");

    const now = new Date();
    const year = now.getFullYear().toString();
    const month = "Tháng " + (now.getMonth() + 1).toString();
    const day = "Ngày " + now.getDate().toString();

    const folderYear = _getOrCreateSubFolder(root, year);
    const folderMonth = _getOrCreateSubFolder(folderYear, month);
    const folderDay = _getOrCreateSubFolder(folderMonth, day);
    const orderFolder = _getOrCreateSubFolder(folderDay, customerName.trim());
    
    // Tạo hoặc lấy thư mục 'Ảnh'
    const photoFolder = _getOrCreateSubFolder(orderFolder, "Ảnh");

    const result = [];
    
    // documentGroups là mảng: [ { prefix: 'HĐMB', images: [...] }, { prefix: 'ĐNXHĐ', images: [...] } ]
    const groups = Array.isArray(documentGroups) ? documentGroups : [];
    
    groups.forEach(group => {
       const prefix = group.prefix || "FILE";
       const images = Array.isArray(group.images) ? group.images : [];
       
       images.forEach((base64, index) => {
          if (!base64 || typeof base64 !== 'string') return;
          
          const fileName = `${prefix} - Trang ${index + 1} - ${orderNumber}.jpg`;
          
          // Xóa file cũ nếu trùng tên
          const oldFiles = photoFolder.getFilesByName(fileName);
          while (oldFiles.hasNext()) { oldFiles.next().setTrashed(true); }

          try {
            const blob = Utilities.newBlob(Utilities.base64Decode(base64), "image/jpeg", fileName);
            const file = photoFolder.createFile(blob);
            file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            result.push({ prefix, name: fileName, url: file.getUrl() });
          } catch (blobErr) {
            logAction("Blob Error", `Lỗi tạo blob cho ${fileName}: ${blobErr.message}`);
          }
       });
    });

    logAction("Save All Images", `Đã lưu tổng cộng ${result.length} ảnh cho đơn ${orderNumber}`);
    return { status: "SUCCESS", count: result.length, details: result };
  } catch (err) {
    logAction("Save All Images Error", err.message);
    return { status: "ERROR", message: err.message };
  }
}

function saveSplitImagesToDrive(orderNumber, customerName, imagesBase64, prefix) {
  const imgs = typeof imagesBase64 === 'string' ? JSON.parse(imagesBase64) : imagesBase64;
  return saveAllSplitImagesToDrive(orderNumber, customerName, [{ prefix: prefix, images: imgs }]);
}

function restoreTrashedPdfs() {
  const ui = SpreadsheetApp.getUi();
  const prompt = ui.prompt('🚑 Cứu hộ đơn hàng', 'Vui lòng nhập Mã số đơn hàng (Số HĐ) bạn muốn khôi phục:', ui.ButtonSet.OK_CANCEL);
  
  if (prompt.getSelectedButton() !== ui.Button.OK) return;
  const orderNo = prompt.getResponseText().trim();
  if (!orderNo) {
    ui.alert('Lưu ý', 'Vui lòng nhập mã đơn hàng hợp lệ!', ui.ButtonSet.OK);
    return;
  }
  
  var ss;
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch(e) { ss = null; }
  if(ss) ss.toast('Đang lùng sục đơn [' + orderNo + '] trong Thùng rác...', 'Cứu hộ mục tiêu', 20);
  
  try {
    // Tìm kiếm: File PDF + Đang trong Thùng rác + Tên file có chứa Mã đơn hàng
    // query: trashed = true and mimeType = 'application/pdf' and name contains 'abc'
    const query = "trashed = true and mimeType = 'application/pdf' and name contains '" + orderNo + "'";
    const files = DriveApp.searchFiles(query);
    let count = 0;
    
    while (files.hasNext()) {
      const file = files.next();
      file.setTrashed(false);
      count++;
    }
    
    if (count > 0) {
      if(ss) ss.toast('Đã hồi sinh thành công ' + count + ' file của đơn ' + orderNo + '!', 'Hoàn tất', 10);
      ui.alert('Thành công', 'Đã tìm thấy và khôi phục ' + count + ' hồ sơ của đơn: ' + orderNo, ui.ButtonSet.OK);
    } else {
      ui.alert('Thông báo', 'Không tìm thấy file nào của đơn [' + orderNo + '] trong Thùng rác.', ui.ButtonSet.OK);
    }
    return count;
  } catch (e) {
    if(ss) ss.toast('Lỗi cứu hộ: ' + e.message, 'Thất bại', 10);
    return 0;
  }
}

/**
 * Lấy danh sách ảnh trong thư mục 'Ảnh' của đơn hàng
 */
function getOrderImagesFromDrive(orderNumber, customerName, orderDateStr) {
  try {
    if (!orderNumber) return { status: "ERROR", message: "Thiếu số đơn hàng." };

    let fileInfos = [];
    let targetFolders = [];

    // CHIẾN LƯỢC 1: ĐI THEO ĐƯỜNG DẪN THƯ MỤC CỐ ĐỊNH (Ưu tiên)
    try {
      const root = _getOrCreateArchiveFolder();
      if (root && orderDateStr && customerName) {
        const dateParts = orderDateStr.split(' ')[0].split('/');
        if (dateParts.length === 3) {
          const dayStr = "Ngày " + parseInt(dateParts[0]);
          const monthStr = "Tháng " + parseInt(dateParts[1]);
          const yearStr = dateParts[2];
          
          const fYear = _getSubFolderByName(root, yearStr);
          if (fYear) {
            const fMonth = _getSubFolderByName(fYear, monthStr);
            if (fMonth) {
              const fDay = _getSubFolderByName(fMonth, dayStr);
              if (fDay) {
                const fOrder = _getSubFolderByName(fDay, customerName.trim());
                if (fOrder) {
                  const fPhoto = _getSubFolderByName(fOrder, "Ảnh");
                  if (fPhoto) targetFolders.push(fPhoto);
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("Lỗi điều hướng đường dẫn:", e.message);
    }

    // CHIẾN LƯỢC 2: TÌM THƯ MỤC KHÁCH HÀNG (Nếu chiến lược 1 không đủ hoặc sai ngày)
    if (targetFolders.length === 0 && customerName) {
      const folders = DriveApp.getFoldersByName(customerName.trim());
      while (folders.hasNext()) {
        const f = folders.next();
        const photo = _getSubFolderByName(f, "Ảnh");
        if (photo) targetFolders.push(photo);
      }
    }

    // GOM FILE TỪ CÁC THƯ MỤC ĐÃ TÌM ĐƯỢC
    targetFolders.forEach(folder => {
      const files = folder.getFiles();
      while (files.hasNext()) {
        const file = files.next();
        if (file.getName().indexOf(orderNumber) > -1) {
          const blob = file.getBlob();
          fileInfos.push({
            base64Data: Utilities.base64Encode(blob.getBytes()),
            mimeType: blob.getContentType(),
            name: file.getName()
          });
        }
      }
    });

    // CHIẾN LƯỢC 3: QUÉT TOÀN BỘ FILE (Cuối cùng, dùng iterator thay vì searchFiles(q))
    if (fileInfos.length === 0) {
       // Lưu ý: Đây là cách an toàn nhất, duyệt qua files thay vì dùng query q
       // Tuy nhiên vì nó rất chậm nếu Drive quá lớn, ta chỉ làm nếu thực sự cần.
       // Để đảm bảo không bao giờ lỗi "q", ta sẽ KHÔNG dùng DriveApp.searchFiles nữa.
    }
    
    if (fileInfos.length === 0) {
      return { status: "ERROR", message: "Không tìm thấy ảnh của đơn hàng " + orderNumber + " trên Drive. Hãy kiểm tra lại tên khách hàng hoặc tệp ảnh." };
    }
    
    return { status: "SUCCESS", files: fileInfos };
  } catch (err) {
    return { status: "ERROR", message: "Lỗi nghiêm trọng lấy ảnh Drive: " + err.message };
  }
}

/**
 * Hàm bổ trợ lấy thư mục con theo tên (không tạo mới)
 */
function _getSubFolderByName(parentFolder, name) {
  const folders = parentFolder.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return null;
}
