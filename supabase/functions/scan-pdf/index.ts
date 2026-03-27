import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenAI } from "npm:@google/genai"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Check for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { base64Data, mimeType } = await req.json()
    
    if (!base64Data || !mimeType) {
      return new Response(JSON.stringify({ error: "Missing base64Data or mimeType" }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Get API Keys from Supabase Edge Function Secrets (configured via Dashboard or CLI)
    // Fallback just in case they provided it as GEMINI_API_KEYS
    const keysString = Deno.env.get('GEMINI_API_KEYS') || Deno.env.get('GEMINI_API_KEY') || "";
    const API_KEYS = keysString.split(/[,;]+/).map((k: string) => k.trim()).filter((k: string) => !!k);
    
    if (API_KEYS.length === 0) {
      throw new Error("Không tìm thấy cấu hình GEMINI_API_KEYS trong biến môi trường của máy chủ.");
    }

    const MODELS_TO_TRY = [
      "gemini-3.1-flash-lite-preview",
      "gemini-3.1-flash-lite",
      "gemini-3-flash",
      "gemini-2.5-flash-lite",
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash-8b",
      "gemini-1.5-flash",
      "gemini-flash-latest"
    ];

    const promptText = `
Bạn là một Chuyên viên Kiểm toán cấp cao về Hồ sơ Ô tô VinFast. File đính kèm có thể là MỘT hoặc NHIỀU loại giấy tờ gộp lại trong cùng một file PDF. Nhiệm vụ của bạn là nhận diện VÀ bóc tách TẤT CẢ các loại giấy tờ có trong file. KHÔNG bịa đặt, nếu không có hãy ghi "Không đề cập".

QUY TẮC NHẬN DIỆN TỪNG LOẠI GIẤY TỜ:

1. "ĐỀ NGHỊ XUẤT HÓA ĐÔN" (ĐNXHĐ):
   - Quét: Tên Khách hàng, Số VIN, Màu sắc (nếu có).
   - KHÔNG CẦN CHỮ KÝ KHÁCH HÀNG: Đây là văn bản nội bộ, KH không ký. "co_chu_ky_ben_mua" LUÔN = true.
   - BẮT BUỘC CHECK 4 CHỮ KÝ NỘI BỘ: TVBH, Sale Admin, Kế toán trưởng, Giám đốc (hoặc Phó/Ủy quyền). Thiếu ai thì "co_chu_ky_ben_ban" = false, ghi rõ vào "chi_tiet_chu_ky_thieu". Đủ thì = true.

2. "HỢP ĐỒNG MUA BÁN" (HĐMB):
   - Quét: Tên Khách Hàng, Màu sắc (Nội/Ngoại), Phiên bản xe.
   - KHÔNG CẦN SỐ VIN (HĐMB thường ký trước khi phân VIN). Ghi "Không đề cập", không coi là lỗi.
   - CHECK CHỮ KÝ: "co_chu_ky_ben_mua" (KH đã ký?), "co_chu_ky_ben_ban" (Đại lý đã ký?), "co_con_dau_do" (Đóng dấu chưa?).

3. NẾU LÀ "CHỨNG TỪ CHO VAY" (NHƯ THÔNG BÁO CHO VAY, CAM KẾT THANH TOÁN, v.v.):
   - BẮT BUỘC QUÉT: Tên khách hàng vay (ghi vào ten_khach_hang), Tên ngân hàng (ghi vào ten_ngan_hang), Số tiền vay (ghi chính xác cả số và chữ, VD: "500.000.000 VNĐ (Năm trăm triệu đồng)" vào so_tien_vay).
   - CHECK CHỮ KÝ VÀ MỘC: "co_chu_ky_ben_ban" = true nếu Ngân hàng đã ký tên và đóng dấu đỏ xác nhận, ngược lại false. Ghi rõ lý do vào chi_tiet_chu_ky_thieu.
   - KHÔNG CẦN CHỮ KÝ KHÁCH HÀNG: "co_chu_ky_ben_mua" LUÔN LUÔN TRẢ VỀ true (văn bản nội bộ của Ngân hàng).

LƯU Ý QUAN TRỌNG KHI CÓ NHIỀU GIẤY TỜ TRONG 1 FILE PDF:
- Bạn phải quét TẤT CẢ các tài liệu và phụ đính có trong file.
- KIỂM TRA SỰ ĐỒNG NHẤT: Xem xét chéo các thông tin chính yếu (Tên khách hàng, Số VIN, Màu sắc, Phiên bản) giữa các tài liệu đó xem có bị mâu thuẫn không (VD: HĐMB ghi Nguyễn Văn A nhưng phụ lục lại ghi Nguyễn Văn B; hoặc HĐMB màu trắng nhưng Biên bản màu đen).
- TUYỆT ĐỐI KHÔNG TRẢ VỀ MẢNG (ARRAY). CHỈ TRẢ VỀ 1 OBJECT DUY NHẤT. Thông tin của object (khach_hang, xe_mua...) lấy theo tài liệu CHÍNH (ĐNXHĐ hoặc HĐMB).
- Nếu phát hiện mâu thuẫn giữa các tài liệu với nhau, ghi rõ nội dung mâu thuẫn vào trường "canh_bao_sai_lech". Nếu mọi thứ đồng nhất và khớp nhau, ghi "Không có".

QUY TẮC CHUNG:
- Số VIN: 17 ký tự (VD: RLNV...). Quét kỹ, không bỏ sót.
- Màu sắc: Lấy theo nội dung file. Nếu không có ghi "Không đề cập".
- Khách hàng: Có thể là Cá nhân hoặc Pháp nhân (Công ty).
- NHẬN DIỆN CÁC TÀI LIỆU ĐÍNH KÈM: Ghi lại danh sách các TÊN TÀI LIỆU CỤ THỂ bạn tìm thấy trong file PDF (ví dụ: ["Hợp đồng mua bán", "Căn cước công dân", "Giấy đề nghị xuất hồ sơ xe", "Đề nghị điều kiện bán hàng", ...]). Trả về mảng các tên này vào "cac_giay_to_dinh_kem".

TRẢ VỀ ĐỊNH DẠNG JSON DUY NHẤT SAU ĐÂY (KHÔNG GIẢI THÍCH THÊM, KHÔNG DÙNG MARKDOWN QUOTE \`\`\`json):
{
  "loai_giay_to": "Tên loại giấy tờ (VD: Hợp Đồng Mua Bán Xe Ô Tô, Đề nghị xuất hóa đơn, Thông báo cho vay...)",
  "cac_giay_to_dinh_kem": ["Tên giấy tờ 1", "Tên giấy tờ 2"],
  "ma_he_thong": "Mã Hợp đồng hoặc Số tham chiếu...",
  "canh_bao_sai_lech": "Ghi chú các điểm bất thường/mâu thuẫn giữa các trang/tài liệu trong cùng 1 file, nếu có.",
  "trang_thai_phap_ly": {
    "co_chu_ky_ben_mua": true,
    "co_chu_ky_ben_ban": true,
    "co_con_dau_do": true,
    "chi_tiet_chu_ky_thieu": ""
  },
  "khach_hang": {
    "ho_ten": "...",
    "so_dien_thoai": "...",
    "cccd_hoac_mst": "...",
    "dia_chi": "..."
  },
  "xe_mua": {
    "dong_xe": "...",
    "phien_ban": "...",
    "mau_sac_ngoai_that": "...",
    "mau_sac_noi_that": "...",
    "so_vin": "...",
    "so_may": "..."
  }
}
    `;

    // Shuffle API Keys

    const shuffledKeys = [...API_KEYS].sort(() => 0.5 - Math.random());
    let finalJsonData = null;
    let successfulModel = null;
    let lastGoogleError = "";

    const aiEngines = shuffledKeys.map(key => new GoogleGenAI({ apiKey: key }));
    
    outerLoop:
    for (const modelName of MODELS_TO_TRY) {
      for (let i = 0; i < aiEngines.length; i++) {
        const aiEngine = aiEngines[i];
        try {
          console.log(`Trying model: ${modelName} with engine index: ${i}`);
          const response = await aiEngine.models.generateContent({
            model: modelName,
            contents: [
              {
                role: "user",
                parts: [
                  { text: promptText },
                  {
                    inlineData: {
                      data: base64Data,
                      mimeType: mimeType
                    }
                  }
                ]
              }
            ],
            config: {
                responseMimeType: "application/json",
            }
          });

          const dataStr = response.text || "{}";
          finalJsonData = JSON.parse(dataStr);
          successfulModel = modelName;
          break outerLoop;
          
        } catch (error: any) {
          console.warn(`Fallback triggered for ${modelName}:`, error?.message);
          lastGoogleError = `${modelName}: ` + (error?.message || "Lỗi không xác định");
          await new Promise((resolve) => setTimeout(resolve, 100)); // sleep roughly 0.1s
        }
      }
    }

    if (!finalJsonData) {
      throw new Error(`Thất bại: Toàn bộ ${MODELS_TO_TRY.length} Model và ${API_KEYS.length} Chìa khóa đều bị từ chối. Lỗi cuối cùng: ` + (lastGoogleError || "Unknown"));
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        model: successfulModel,
        data: finalJsonData 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error: any) {
    console.error("Function error:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Return 200 so Supabase invoke doesn't crash, allowing Frontend to read the JSON error
    })
  }
})
