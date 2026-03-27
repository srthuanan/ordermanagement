import { supabaseAdmin } from "../services/supabaseClient";

/**
 * Hàm hỗ trợ chuyển file tải lên từ trình duyệt sang Base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // FileReader trả về dạng: "data:application/pdf;base64,JVBERi0xLjQK..."
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = error => reject(error);
  });
}

/**
 * Gửi file PDF / Hình ảnh lên Máy chủ bảo mật Supabase (Edge Function) để AI quét
 * @param file Đối tượng File do người dùng chọn từ <input type="file" />
 */
export async function extractDocumentWithGemini(file: File) {
  console.log(`Bắt đầu chuyển file '${file.name}' thành chuỗi và gửi lên máy chủ AI...`);
  const base64Data = await fileToBase64(file);
  const mimeType = file.type;

  console.log(`Đang gọi Edge Function 'scan-pdf' trên Supabase bằng Admin Client...`);
  
  const { data, error } = await supabaseAdmin.functions.invoke('scan-pdf', {
    body: { base64Data, mimeType }
  });

  if (error) {
    console.error("Lỗi từ Supabase Edge Function:", error);
    throw new Error(`❌ Máy chủ AI từ chối: ${error.message}`);
  }

  if (!data?.success) {
    throw new Error(`❌ Lỗi phân tích: ${data?.error || "Không rõ nguyên nhân từ Edge Function"}`);
  }

  console.log("=========================================================");
  console.log(`🎉 EDGE FUNCTION TRẢ VỀ THÀNH CÔNG TỪ MÁY CHỦ!`);
  console.log(`Model đã sử dụng ngầm định: ${data.model}`);
  console.log("Dữ liệu trích xuất:", data.data);
  console.log("=========================================================");

  let extractedResult = data.data;
  // Fallback: If AI still returns an array, take the first item as the main document.
  if (Array.isArray(extractedResult) && extractedResult.length > 0) {
      extractedResult = extractedResult[0];
  }

  return extractedResult;
}

export function compareDocumentWithOrder(extractedData: any, order: any): { isValid: boolean; mismatches: string[] } {
  const result = {
    isValid: true,
    mismatches: [] as string[]
  };
  
  // Normalize string for fuzzy matching (removes accents, spaces, special chars, converts to lowercase)
  const normalize = (str?: string) => {
    if (!str) return "";
    let s = str.toLowerCase().replace(/đ/g, "d").normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[\W_]+/g, "");
    // Smart abbreviations mapping for Companies & Names
    s = s.replace(/congty/g, "cty").replace(/trachnhiemhuuhan/g, "tnhh").replace(/cophan/g, "cp");
    return s;
  };

  const loai_giay_to = normalize(extractedData?.loai_giay_to || "");
  const isDNXHD = loai_giay_to.includes("denghi") || loai_giay_to.includes("hoadon");
  const isChungTuChoVay = loai_giay_to.includes("chovay") || loai_giay_to.includes("thanhtoan") || loai_giay_to.includes("nganhang") || loai_giay_to.includes("baolanh") || loai_giay_to.includes("camket");

  // Check name (allow substrings) - Cả 3 loại đều check tên
  const orderName = normalize(order["Tên khách hàng"]);
  const docName = normalize(extractedData?.khach_hang?.ho_ten);
  // Improved logic: Since company names can be very long, if one is at least 80% substring of another
  if (orderName && docName && !docName.includes("khongdecap") && !docName.includes(orderName) && !orderName.includes(docName)) {
     result.isValid = false;
     result.mismatches.push(`Sai tên KH (Hồ sơ ghi: '${extractedData?.khach_hang?.ho_ten || 'Trống'}')`);
  }

  const isHDMB = loai_giay_to.includes("hopdong") || loai_giay_to.includes("muaban");

  // Check VIN - Bỏ qua nếu là chứng từ cho vay HOẶC HĐMB
  if (!isChungTuChoVay && !isHDMB) {
    const orderVin = normalize(order.VIN);
    const docVin = normalize(extractedData?.xe_mua?.so_vin);
    if (orderVin && docVin && !docVin.includes("khongdecap") && !docVin.includes(orderVin) && !orderVin.includes(docVin)) {
       // Check Levenshtein / Typo
       let diffCount = Math.abs(orderVin.length - docVin.length);
       for(let i=0; i < Math.min(orderVin.length, docVin.length); i++) {
          if(orderVin[i] !== docVin[i]) diffCount++;
       }
       if (diffCount <= 2 && orderVin.length > 10) {
           result.isValid = false;
           result.mismatches.push(`Số VIN lệch ${diffCount} ký tự (Hồ sơ: '${extractedData?.xe_mua?.so_vin}')`);
       } else {
           result.isValid = false;
           result.mismatches.push(`Sai số VIN (Hồ sơ ghi: '${extractedData?.xe_mua?.so_vin || 'Trống'}')`);
       }
    } else if (orderVin && docVin && docVin.includes("khongdecap")) {
       // Báo lỗi nhẹ nếu không tìm thấy VIN
       if (!isDNXHD) {
           result.mismatches.push(`Không tìm thấy số VIN trên hồ sơ.`);
       }
    }
  }
  
  // Dòng xe
  if (!isChungTuChoVay) {
    const orderModel = normalize(order["Dòng xe"]);
    const docModel = normalize(extractedData?.xe_mua?.dong_xe);
    if (orderModel && docModel && !docModel.includes("khongdecap") && !docModel.includes(orderModel) && !orderModel.includes(docModel)) {
       result.isValid = false;
       result.mismatches.push(`Sai dòng xe (Hồ sơ ghi: '${extractedData?.xe_mua?.dong_xe || 'Trống'}')`);
    }
  }

  // Flexible check logic for mapping synonyms
  const checkFlexibleMatch = (sysVal: string, docVal: string, map: Record<string, string[]>) => {
      const s = normalize(sysVal);
      const d = normalize(docVal);
      if (!s || !d || d.includes("khongdecap")) return false;
      if (s.includes(d) || d.includes(s)) return true; // Direct match
      
      // Look for overlapping map categories
      for (const [, aliases] of Object.entries(map)) {
          const sysMatches = aliases.some(alias => s.includes(alias));
          const docMatches = aliases.some(alias => d.includes(alias));
          if (sysMatches && docMatches) return true; // Both map to the same conceptual category
      }
      return false;
  };

  const versionMap: Record<string, string[]> = {
      "plus": ["plus", "nangcao", "nângcao", "nang", "cao"],
      "eco": ["eco", "tieu", "tiêu"],
      "base": ["base", "tieuchuan", "tiêuchuẩn", "tieu", "chuan"],
      "limo": ["limo"],
      "lux": ["lux", "caocap", "caocấp", "premium"]
  };

  const colorMap: Record<string, string[]> = {
      "red": ["do", "đỏ", "red", "crimson"],
      "white": ["trang", "trắng", "white", "brahminy"],
      "black": ["den", "đen", "black", "jet"],
      "silver": ["bac", "bạc", "silver", "desat"],
      "gray": ["xam", "xám", "grey", "gray", "neptune", "titan"],
      "blue": ["xanh", "xanhduong", "vinfasblue", "blue", "ocean"],
      "orange": ["cam", "orange", "sunset"],
      "green": ["xanhla", "green", "aurora", "limo", "mint", "xanhngoc"]
  };

  // Check Phiên bản (Chỉ check cho HĐMB, bỏ qua cho ĐNXHĐ & Chứng từ cho vay)
  if (!isDNXHD && !isChungTuChoVay) {
    const orderVersion = order["Phiên bản"] || "";
    const docVersion = extractedData?.xe_mua?.phien_ban || "";
    const docNorm = normalize(docVersion);
    if (orderVersion && docNorm && !docNorm.includes("khongdecap") && !checkFlexibleMatch(orderVersion, docVersion, versionMap)) {
       result.isValid = false;
       result.mismatches.push(`Sai phiên bản (Hồ sơ ghi: '${docVersion || 'Trống'}')`);
    }
  }

  // Check Màu sắc (Bỏ qua cho Chứng từ cho vay)
  if (!isChungTuChoVay) {
    const orderColor = order["Ngoại thất"] || "";
    const docColorOut = Math.max((extractedData?.xe_mua?.mau_sac_ngoai_that || "").length, (extractedData?.xe_mua?.mau_sac || "").length) > 0 
                        ? (extractedData?.xe_mua?.mau_sac_ngoai_that || extractedData?.xe_mua?.mau_sac) : "";
    const docColorOutNorm = normalize(docColorOut);
    if (orderColor && docColorOutNorm && !docColorOutNorm.includes("khongdecap") && !checkFlexibleMatch(orderColor, docColorOut, colorMap)) {
       result.isValid = false;
       result.mismatches.push(`Sai màu ngoại thất (Hồ sơ ghi: '${docColorOut || 'Trống'}')`);
    }

    const orderInterior = order["Nội thất"] || "";
    const docColorIn = extractedData?.xe_mua?.mau_sac_noi_that || "";
    const docColorInNorm = normalize(docColorIn);
    if (orderInterior && docColorInNorm && orderInterior !== "None" && !docColorInNorm.includes("khongdecap") && !checkFlexibleMatch(orderInterior, docColorIn, colorMap)) {
       result.isValid = false;
       result.mismatches.push(`Sai màu nội thất (Hồ sơ ghi: '${docColorIn || 'Trống'}')`);
    }
  }

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
      const hasDeNghiXuatHoSo = cacGiayToNorm.some(g => (g.includes("denghi") && g.includes("xuathoso")) || g.includes("hoso") || g.includes("phieuyeucauxuat"));
      const hasDieuKienBanHang = cacGiayToNorm.some(g => g.includes("dieukien") || g.includes("banhang"));
      
      if (!hasDeNghiXuatHoSo) {
          result.isValid = false;
          result.mismatches.push(`Thiếu giấy tờ đính kèm: Giấy đề nghị xuất hồ sơ xe`);
      }
      if (!hasDieuKienBanHang) {
          result.isValid = false;
          result.mismatches.push(`Thiếu giấy tờ đính kèm: Đề nghị điều kiện bán hàng`);
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
        if (co_con_dau_do === false) {
             result.mismatches.push(`Pháp lý: ĐNXHĐ chưa đóng mộc đỏ`);
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
