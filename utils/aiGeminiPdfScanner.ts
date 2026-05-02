import { supabaseAdmin } from "../services/supabaseClient";
import { convertPdfToImages } from "../services/ocrService";

/**
 * Hàm hỗ trợ chuyển file tải lên từ trình duyệt sang Base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = error => reject(error);
  });
}

/**
 * Hàm hỗ trợ upload Base64 lên Supabase Storage tạm thời để giảm tải Edge Function
 * @param folder Nếu có, file sẽ được đưa vào thư mục này (e.g. 'session_123/')
 */
async function uploadBase64ToStorage(base64Data: string, mimeType: string, folder: string = ''): Promise<string> {
    const byteCharacters = atob(base64Data);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        byteArrays.push(new Uint8Array(byteNumbers));
    }
    const blob = new Blob(byteArrays, { type: mimeType });
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const fileNameOnly = `scan_${timestamp}_${randomSuffix}.${mimeType.split('/')[1] || 'jpg'}`;
    const filename = folder ? `${folder.replace(/\/$/, '')}/${fileNameOnly}` : fileNameOnly;
    
    // Upload lên bucket public 'temp_scans'
    const { error } = await supabaseAdmin.storage.from('temp_scans').upload(filename, blob, {
        upsert: true
    });
    
    if (error) {
        console.error("Lỗi upload file lên Storage:", error);
        throw new Error("Không thể upload file lên Storage Bucket: " + error.message);
    }
    const { data: urlData } = supabaseAdmin.storage.from('temp_scans').getPublicUrl(filename);
    return urlData.publicUrl;
}

/**
 * Xóa các file tạm sau khi đã quét xong
 */
export async function deleteTempFiles(urls: string[]) {
    try {
        const filenames = urls
            .filter(u => u.includes('temp_scans/'))
            .map(u => {
                const parts = u.split('temp_scans/');
                return parts.length > 1 ? parts[1] : null;
            })
            .filter(Boolean) as string[];
            
        if (filenames.length > 0) {
            console.log(`🧹 [AI CLEANUP] Đang dọn dẹp ${filenames.length} tệp tin trong folder tạm...`);
            await supabaseAdmin.storage.from('temp_scans').remove(filenames);
        }
    } catch (e) {
        console.warn("⚠️ [AI CLEANUP] Không thể xóa file tạm:", e);
    }
}


/**
 * Gửi file PDF / Hình ảnh lên Máy chủ bảo mật Supabase (Edge Function) để AI quét
 * @param file Đối tượng File do người dùng chọn từ <input type="file" />
 */
/**
 * Tiền xử lý file (PDF sang ảnh, Upload Storage) ngay khi người dùng chọn file.
 */
export async function preProcessFile(file: File, folderName?: string): Promise<{ payload: any[], count: number }> {
    // LUÔN TÁCH TRANG ĐỒNG BỘ: Đảm bảo AI và Drive đều có đầy đủ ảnh
    if (file.type === 'application/pdf') {
        console.log(`📄 [AI] Bắt đầu tách trang PDF và Upload đồng thời: ${file.name}`);
        const uploadedImages: any[] = [];
        
        // Gọi hàm convertPdfToImages với callback để upload ngay khi trang vừa tách xong
        await convertPdfToImages(file, async (img) => {
            try {
                const publicUrl = await uploadBase64ToStorage(img.base64Data, img.mimeType, folderName);
                uploadedImages.push({ url: publicUrl, mimeType: img.mimeType, base64Data: img.base64Data });
                console.log(`  - [AI] Đã upload xong trang ${uploadedImages.length}`);
            } catch (err) {
                console.warn(`  - [AI] Lỗi upload trang ${uploadedImages.length + 1}, dùng base64 dự phòng:`, err);
                uploadedImages.push(img); // Dự phòng Base64 nếu Storage lỗi
            }
        });
        
        console.log(`✅ [AI] Đã hoàn tất tách & upload ${uploadedImages.length} trang cho ${file.name}.`);
        return { payload: uploadedImages, count: uploadedImages.length };
    }

    // Xử lý tệp hình ảnh đơn lẻ
    const base64Data = await fileToBase64(file);
    try {
        const publicUrl = await uploadBase64ToStorage(base64Data, file.type, folderName);
        return { payload: [{ url: publicUrl, mimeType: file.type, base64Data: base64Data }], count: 1 };
    } catch {
        return { payload: [{ base64Data, mimeType: file.type }], count: 1 };
    }
}

/**
 * Gửi file PDF / Hình ảnh lên Máy chủ bảo mật Supabase (Edge Function) để AI quét
 * @param fileOrPayload Có thể là File thô hoặc Dữ liệu đã tiền xử lý từ preProcessFile
 */
export async function extractDocumentWithGemini(
    fileOrPayload: (File | { payload: any[], count: number })[], 
    orderData?: any,
    options: { skipCleanup?: boolean } = {}
) {
  const filesPayload: { url?: string; base64Data?: string; mimeType: string }[] = [];
  const fileOrigins: number[] = []; 
  
  console.log(`🚀 Bắt đầu xử lý ${fileOrPayload.length} tệp tin...`);

  // Tạo một folder name duy nhất cho phiên làm việc này
  const scanFolder = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const results = await Promise.all(fileOrPayload.map(async (item) => {
    if (item instanceof File) {
      return await preProcessFile(item, scanFolder);
    } else {
      // Đã được tiền xử lý rồi
      return item;
    }
  }));

  results.forEach(res => {
    filesPayload.push(...res.payload);
    fileOrigins.push(res.count);
  });

  console.log(`✅ [AI DEBUG] Chuẩn bị xong ${filesPayload.length} hình ảnh. Đang gọi Edge Function scan-pdf...`);
  
  const { data, error } = await supabaseAdmin.functions.invoke('scan-pdf', {
    body: { files: filesPayload, orderData }
  });

  if (error) {
    console.error("❌ [AI ERROR] Lỗi kết nối Edge Function:", error);
    throw new Error(`❌ Máy chủ AI từ chối: ${error.message}`);
  }

  if (!data?.success) {
    console.error("❌ [AI ERROR] AI trả về lỗi nghiệp vụ:", data?.error);
    throw new Error(`❌ Lỗi phân tích: ${data?.error || "Không rõ nguyên nhân từ Edge Function"}`);
  }

  console.log("🎯 [AI DEBUG] Nhận kết quả từ Gemini thành công.");

  let extractedResult = data.data;
  if (Array.isArray(extractedResult) && extractedResult.length > 0) {
      extractedResult = extractedResult[0];
  }

  // 🎯 [DỌN DẸP TỰ ĐỘNG]
  // Xóa các file ảnh tạm trên storage sau khi đã AI đã đọc xong để giải phóng bộ nhớ
  // Nếu skipCleanup = true (để dùng cho quét lại), thì không xóa.
  const tempUrls = filesPayload.map(f => f.url).filter(Boolean) as string[];
  if (tempUrls.length > 0 && !options.skipCleanup) {
      deleteTempFiles(tempUrls); // Gọi bất đồng bộ, không cần await để tránh làm chậm UI
  }

  return {
      aiData: extractedResult,
      processedImages: filesPayload,
      fileOrigins: fileOrigins
  };
}


/**
 * Chuyển đổi link Google Drive share sang link download trực tiếp
 */
export function getGoogleDriveDirectLink(url: string): string {
    if (!url.includes('drive.google.com')) return url;
    
    try {
        // Regex để tìm FILE_ID từ các định dạng link Drive khác nhau
        // Google Drive file IDs thường có độ dài khoảng 33 ký tự, chứa chữ, số, - và _
        const regex = /[-\w]{25,}/; 
        const match = url.match(regex);
        
        if (match) {
            const fileId = match[0];
            // Link download trực tiếp của Google Drive
            return `https://drive.google.com/uc?export=download&id=${fileId}`;
        }
    } catch (e) {
        console.error("Lỗi parse link Google Drive:", e);
    }
    
    return url;
}


/**
 * Quét file từ URL (đã lưu trên Storage hoặc link Drive)
 */
export async function scanPdfFromUrl(url: string, orderId: string) {
    try {
        const directUrl = getGoogleDriveDirectLink(url);
        console.log(`Đang tải file để Audit: ${directUrl === url ? url : 'Drive Link detected -> ' + directUrl}`);
        
        // 1. Tải file về dưới dạng Blob
        const response = await fetch(directUrl);
        if (!response.ok) throw new Error("Không thể tải file từ URL.");
        const blob = await response.blob();
        
        let finalFiles: { url?: string; base64Data?: string; mimeType: string }[] = [];
        const scanFolder = `url_scan_${Date.now()}`;
        
        if (blob.type === 'application/pdf') {
            console.log("📄 Đang convert file PDF (từ URL) sang ảnh và Upload...");
            const tempFile = new File([blob], "downloaded.pdf", { type: 'application/pdf' });
            const images = await convertPdfToImages(tempFile);
            for (const img of images) {
               try {
                 const publicUrl = await uploadBase64ToStorage(img.base64Data, img.mimeType, scanFolder);
                 finalFiles.push({ url: publicUrl, mimeType: img.mimeType, base64Data: img.base64Data });
               } catch {
                 finalFiles.push(img);
               }
            }
        } else {
            console.log("🖼️ Đang Upload ảnh lên Storage mới...");
            const base64Data = await fileToBase64(blob as any);
            try {
              const publicUrl = await uploadBase64ToStorage(base64Data, blob.type || 'image/jpeg', scanFolder);
              finalFiles.push({ url: publicUrl, mimeType: blob.type || 'image/jpeg', base64Data: base64Data });
            } catch {
              finalFiles.push({ base64Data, mimeType: blob.type || 'image/jpeg' });
            }
        }

        // 3. Gọi Edge Function
        const { data, error } = await supabaseAdmin.functions.invoke('scan-pdf', {
            body: { files: finalFiles, orderData: orderId } // fallback, should pass true orderData if available
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || "AI thất bại");

        const aiResult = data.data;

        // 🎯 [DỌN DẸP TỰ ĐỘNG]
        const tempUrls = finalFiles.map(f => f.url).filter(Boolean) as string[];
        if (tempUrls.length > 0) {
            deleteTempFiles(tempUrls);
        }

        return aiResult;
    } catch (e: any) {
        console.error("Lỗi scanPdfFromUrl:", e);
        throw e;
    }
}

/**
 * Quét nhiều file cùng lúc để đối chiếu chéo (HĐMB, ĐNXHĐ, v.v.)
 */
export async function scanMultipleFilesFromUrls(urls: string[], orderData?: any) {
    try {
        console.log("🔍 [AI DEBUG] Bắt đầu quy trình quét liên bộ hồ sơ:", urls);
        
        const fileToBase64Promise = (b: Blob): Promise<string> => new Promise((res, rej) => {
            const reader = new FileReader();
            reader.readAsDataURL(b);
            reader.onloadend = () => res((reader.result as string).split(',')[1]);
            reader.onerror = rej;
        });

        // 1. Tải và chuyển đổi tất cả các file
        console.log(`🔍 [AI DEBUG] Đang tải ${urls.length} tệp tin từ Drive/Storage...`);
        const files: { url?: string; base64Data?: string; mimeType: string }[] = [];
        const batchFolder = `multi_scan_${Date.now()}`;
        
        for (const url of urls) {
            try {
                const directUrl = getGoogleDriveDirectLink(url);
                console.log(`[AI DEBUG] Đang fetch: ${directUrl === url ? url : 'Drive detected'}`);
                
                const response = await fetch(directUrl);
                if (!response.ok) continue;
                const blob = await response.blob();
                
                if (blob.type === 'application/pdf') {
                    console.log(`📄 [AI DEBUG] Đang convert PDF sang ảnh và Upload: ${url}`);
                    const tempFile = new File([blob], "doc.pdf", { type: 'application/pdf' });
                    const images = await convertPdfToImages(tempFile);
                    for (const img of images) {
                       try {
                         const publicUrl = await uploadBase64ToStorage(img.base64Data, img.mimeType, batchFolder);
                         files.push({ url: publicUrl, mimeType: img.mimeType, base64Data: img.base64Data });
                       } catch {
                         files.push(img);
                       }
                    }
                } else {
                    const base64Data = await fileToBase64Promise(blob);
                    try {
                      const publicUrl = await uploadBase64ToStorage(base64Data, blob.type || 'image/jpeg', batchFolder);
                      files.push({ url: publicUrl, mimeType: blob.type || 'image/jpeg', base64Data: base64Data });
                    } catch {
                      files.push({ base64Data, mimeType: blob.type || 'image/jpeg' });
                    }
                }
            } catch (err) {
                console.error("❌ [AI DEBUG] Lỗi tải/xử lý file:", err);
            }
        }

        if (files.length === 0) {
            throw new Error("Không thể tải hoặc xử lý bất kỳ file nào trong bộ hồ sơ.");
        }

        // 2. Gọi Edge Function
        console.log("🚀 [AI DEBUG] Đang gửi dữ liệu tới Gemini AI (scan-pdf)...");
        const { data, error } = await supabaseAdmin.functions.invoke('scan-pdf', {
            body: { files, orderData }
        });

        if (error) {
            console.error("❌ [AI DEBUG] Edge Function trả về lỗi:", error);
            throw error;
        }
        
        if (!data?.success) {
            console.error("❌ [AI DEBUG] AI Phân tích thất bại:", data?.error);
            throw new Error(data?.error || "AI thất bại");
        }

        const aiResult = data.data;
        console.log("🎯 [AI DEBUG] Nhận kết quả từ AI thành công:", aiResult);

        // 🎯 [DỌN DẸP TỰ ĐỘNG]
        const tempUrls = files.map(f => f.url).filter(Boolean) as string[];
        if (tempUrls.length > 0) {
            deleteTempFiles(tempUrls);
        }

        return aiResult;
    } catch (e: any) {
        console.error("⛔ [AI DEBUG] Lỗi hệ thống tại scanMultipleFilesFromUrls:", e);
        throw e;
    }
}

export function compareDocumentWithOrder(extractedData: any, order: any): { isValid: boolean; mismatches: string[] } {
  const result = {
    isValid: true,
    mismatches: [] as string[]
  };

  // 1. Tích hợp các lỗi quan trọng từ AI (theo cấu trúc V4 mới)
  if (extractedData?.audit_result?.danh_sach_loi && Array.isArray(extractedData.audit_result.danh_sach_loi)) {
      extractedData.audit_result.danh_sach_loi.forEach((err: any) => {
          result.isValid = false;
          // Format message: [Vị trí] Lỗi -> Cách sửa
          const msg = `[${err.loi_o_dau || 'Hồ sơ'}] ${err.chi_tiet} -> Cần làm: ${err.huong_xu_ly}`;
          if (!result.mismatches.includes(msg)) result.mismatches.push(msg);
      });
  }

  // 1.1 Hiện tại quy tắc Logic tài chính đã được gỡ bỏ theo yêu cầu.

  // 1.2 Hiển thị tóm tắt tình trạng hồ sơ nếu hợp lệ
  if (extractedData?.audit_result?.trang_thai_ho_so === "HỢP LỆ" && result.mismatches.length === 0) {
      // Có thể thêm log hoặc info nếu cần
  }
  
  // Normalize string for fuzzy matching (removes accents, spaces, special chars, converts to lowercase)
  const normalize = (str?: string) => {
    if (!str) return "";
    let s = str.toLowerCase().replace(/đ/g, "d").normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[\W_]+/g, "");
    // Smart abbreviations mapping for Companies & Names
    s = s.replace(/congty/g, "cty").replace(/trachnhiemhuuhan/g, "tnhh").replace(/cophan/g, "cp");
    return s;
  };

  const loai_giay_to = normalize(extractedData?.loai_giay_to || "");
  const isDNXHD = loai_giay_to.includes("denghi") || loai_giay_to.includes("hoadon") || loai_giay_to.includes("phieu");
  const isChungTuChoVay = loai_giay_to.includes("chovay") || loai_giay_to.includes("thanhtoan") || loai_giay_to.includes("nganhang") || loai_giay_to.includes("baolanh") || loai_giay_to.includes("camket") || loai_giay_to.includes("thuxacnhan");

  // Check name (allow substrings) - Cả 3 loại đều check tên
  const orderName = normalize(order["Tên khách hàng"]);
  const docName = normalize(extractedData?.khach_hang?.ho_ten);
  // Improved logic: Since company names can be very long, if one is at least 80% substring of another
  if (orderName && docName && !docName.includes("khongdecap") && !docName.includes(orderName) && !orderName.includes(docName)) {
     result.isValid = false;
     result.mismatches.push(`Sai tên KH (Hồ sơ ghi: '${extractedData?.khach_hang?.ho_ten || 'Trống'}')`);
  }

  const isHDMB = (loai_giay_to.includes("hopdong") || loai_giay_to.includes("muaban")) && !isDNXHD;
  // CCCD check handled by AI in scan prompt

  // VIN
  const orderVin = normalize(order.VIN);
  const docVin = normalize(extractedData?.xe_mua?.so_vin);
  if (orderVin && docVin && docVin !== "khongdecap" && orderVin !== docVin) {
     result.isValid = false;
     result.mismatches.push(`Sai số VIN (Hệ thống: ${order.VIN} vs Hồ sơ: ${extractedData?.xe_mua?.so_vin})`);
  }
  
  // Dòng xe
  const orderModel = normalize(order["Dòng xe"]);
  const docModel = normalize(extractedData?.xe_mua?.dong_xe);
  if (orderModel && docModel && docModel !== "khongdecap" && !docModel.includes(orderModel) && !orderModel.includes(docModel)) {
     result.isValid = false;
     result.mismatches.push(`Sai dòng xe (Hệ thống: ${order["Dòng xe"]} vs Hồ sơ: ${extractedData?.xe_mua?.dong_xe})`);
  }

  // Flexible check logic for mapping synonyms
  // Fuzzy matching for version and color mapping now handled by AI


  // Lưu ý: Các kiểm tra Màu sắc và Phiên bản hiện tại đã được giao cho AI xử lý thông minh trong Prompt.
  // Frontend chỉ thực hiện kiểm tra VIN và Dòng xe cơ bản.

  // Cross-reference documents anomaly detection
  if (extractedData?.canh_bao_sai_lech && extractedData.canh_bao_sai_lech.toLowerCase() !== "không có" && !extractedData.canh_bao_sai_lech.toLowerCase().includes("khong co")) {
      result.isValid = false;
      result.mismatches.push(`Mâu thuẫn giấy tờ: ${extractedData.canh_bao_sai_lech}`);
  }

  // Document existence validation
  const cacGiayTo = (extractedData?.cac_giay_to_dinh_kem || []) as string[];
  const cacGiayToNorm = cacGiayTo.map(g => normalize(g));

  // Check HĐMB Document completeness
  if (isHDMB && cacGiayTo.length > 0) {
      const hasHDMB = cacGiayToNorm.some(g => g.includes("hopdong") || g.includes("muaban"));
      const hasCCCD = cacGiayToNorm.some(g => g.includes("cancuoc") || g.includes("cccd") || g.includes("chungminh") || g.includes("cmnd") || g.includes("dinhdanh"));
      
      if (!hasCCCD) {
          result.isValid = false;
          result.mismatches.push(`Thiếu giấy tờ đính kèm: Căn cước công dân`);
      }
      if (!hasHDMB) {
          result.isValid = false;
          result.mismatches.push(`Thiếu giấy tờ đính kèm: Hợp đồng mua bán`);
      }
  }

  // Check ĐNXHĐ Document completeness
  if (isDNXHD && cacGiayTo.length > 0) {
      const hasDeNghiXuatHoSo = cacGiayToNorm.some(g => g.includes("phieu") && g.includes("hoso"));
      const hasDieuKienBanHang = cacGiayToNorm.some(g => g.includes("dieukien") || g.includes("banhang"));
      
      const isTraGop = normalize(order["Hình thức thanh toán"] || "").includes("tragop");
      const hasTBCV = cacGiayToNorm.some(g => g.includes("chovay") || g.includes("thuxacnhan") || g.includes("camket"));

      if (!hasDeNghiXuatHoSo) {
          result.isValid = false;
          result.mismatches.push(`Thiếu giấy tờ: Phiếu đề nghị xuất hồ sơ xe`);
      }
      if (!hasDieuKienBanHang) {
          result.isValid = false;
          result.mismatches.push(`Thiếu giấy tờ: Đề nghị điều kiện bán hàng`);
      }
      if (isTraGop && !hasTBCV) {
          result.isValid = false;
          result.mismatches.push(`Đơn trả góp: Thiếu Thông báo cho vay / Thư xác nhận Ngân hàng`);
      }
  }

  // Legal Status Validation (Signature & Stamps)
  if (extractedData?.trang_thai_phap_ly) {
     const { co_chu_ky_ben_mua, co_chu_ky_ben_ban, co_con_dau_do, chi_tiet_chu_ky_thieu } = extractedData.trang_thai_phap_ly;
     
     if (isChungTuChoVay) {
        // Thông báo cho vay: chỉ cần ngân hàng ký và đóng dấu
        const tenNganHang = extractedData?.ten_ngan_hang || extractedData?.khach_hang?.ten_ngan_hang || '';
        const soTienVay = extractedData?.so_tien_vay || '';
        
        // Info: hiển thị tên ngân hàng và số tiền vay để Admin kiểm tra
        if (tenNganHang && !tenNganHang.toLowerCase().includes('không đề cập')) {
            result.mismatches.push(`Ngân hàng: ${tenNganHang}`);
        }
        if (soTienVay && !soTienVay.toLowerCase().includes('không đề cập')) {
            result.mismatches.push(`Số tiền vay: ${soTienVay}`);
        }
        
        // Validate: ngân hàng phải ký và đóng dấu xác nhận
        if (co_chu_ky_ben_ban === false) {
            result.isValid = false;
            const msg = chi_tiet_chu_ky_thieu || 'Thiếu chữ ký xác nhận và mộc đỏ của Ngân hàng';
            result.mismatches.push(`Pháp lý: ${msg}`);
        }
        if (co_con_dau_do === false) {
            result.mismatches.push(`Pháp lý: Thông báo cho vay chưa có mộc đỏ NGÂN HÀNG`);
        }
     } else if (isDNXHD) {
        // ĐNXHĐ yêu cầu bắt buộc 4 chữ ký nội bộ
        if (co_chu_ky_ben_ban === false) {
             result.isValid = false;
             const msg = chi_tiet_chu_ky_thieu ? `${chi_tiet_chu_ky_thieu}` : "Thiếu chữ ký duyệt (TVBH, Admin, Kế toán, GĐ)";
             result.mismatches.push(`Pháp lý: ${msg}`);
        }
     } else {
         // HĐMB và các loại khác: cần đủ chữ ký cả 2 bên
         if (co_chu_ky_ben_mua === false) {
             result.isValid = false; 
             result.mismatches.push(`Pháp lý: Thiếu chữ ký của Khách Hàng`);
         }
         if (co_chu_ky_ben_ban === false) {
             result.isValid = false;
             result.mismatches.push(`Pháp lý: Thiếu chữ ký của Đại lý`);
         }
         if (co_con_dau_do === false) {
             result.mismatches.push(`Pháp lý: Chưa đóng dấu mộc đỏ công ty`);
         }
     }
  }

  return result;
}
