import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenAI } from "npm:@google/genai"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
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

    const keysString = Deno.env.get('GEMINI_API_KEYS') || Deno.env.get('GEMINI_API_KEY') || "";
    const API_KEYS = keysString.split(/[,;]+/).map((k: string) => k.trim()).filter((k: string) => !!k);
    
    if (API_KEYS.length === 0) {
      throw new Error("Không tìm thấy cấu hình GEMINI_API_KEYS");
    }

    const MODELS_TO_TRY = [
      "gemini-3.1-flash-lite-preview",
      "gemini-3.1-flash-lite",
      "gemini-3-flash",
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash"
    ];

    const promptText = `Bạn là chuyên gia phân tích chính sách bán hàng VinFast.
Hãy đọc kỹ văn bản PDF/ảnh đính kèm và trình bày chi tiết các thông tin sau:
1. "ten_chinh_sach_chinh": Tên chính của toàn bộ văn bản.
2. "danh_sach_chinh_sach_con": Một mảng (array) các chính sách con/ưu đãi trong văn bản.

QUY TẮC BÓC TÁCH RẤT QUAN TRỌNG:
- Nếu trong một chính sách có bảng hoặc danh sách chia ra TỪNG DÒNG XE với các mức ưu đãi / giá trị khác nhau, BẠN PHẢI TÁCH CHÚNG THÀNH TỪNG CHÍNH SÁCH CON RIÊNG BIỆT cho mỗi dòng xe.
- NẾU CÓ MỨC TIỀN CỤ THỂ, VUI LÒNG GHI NGẮN GỌN SỐ TIỀN ĐÓ VÀO CUỐI TÊN CHÍNH SÁCH theo định dạng rút gọn (ví dụ: 3.000.000 -> 3Tr, 50.000.000 -> 50Tr).
- NẾU CÓ MỤC Phân loại "PHIÊN BẢN" CỤ THỂ (như Eco, Plus...), BẮT BUỘC PHẢI THÊM TÊN PHIÊN BẢN ĐÓ VÀO BÊN TRONG TÊN CHÍNH SÁCH (ví dụ để trong vòng ngoặc vuông []).
- KHÔNG CẦN ĐƯA TÊN DÒNG XE VÀO "ten_uu_dai". Tên dòng xe CHỈ ĐƯỢC ĐIỀN VÀO trường "dong_xe_ap_dung".
- Ví dụ Bảng Ưu đãi một số dòng xe:
  + Dòng xe VF 3, Phiên bản "Eco - Tiêu chuẩn 1", giảm 3.000.000 -> ten_uu_dai: "Chính sách ưu đãi [Eco - Tiêu chuẩn 1] - 3Tr" (dong_xe_ap_dung: "VF 3")
  + Dòng xe VF 7, Phiên bản "Plus (1 cầu)", giảm 50 triệu -> ten_uu_dai: "Chính sách ưu đãi [Plus (1 cầu)] - 50Tr" (dong_xe_ap_dung: "VF 7")

QUY TẮC CHUẨN HÓA TÊN DÒNG XE (bắt buộc áp dụng khi điền vào "dong_xe_ap_dung"):
- Bất kỳ tên dòng xe nào có chữ "Green" thì BỎ chữ "Green" đi (ví dụ: "Minio Green" -> "Minio", "Limo Green" -> "Limo", "Nerio Green" -> "Nerio", "Herio Green" -> "Herio").
- "VF MPV 7" -> đổi thành "VF LIMO".
- "VF MPV7" -> đổi thành "VF LIMO".
- Ví dụ chuẩn hóa: Văn bản ghi "VF 3/ Minio Green/ EC Van" -> dong_xe_ap_dung: "VF 3, Minio, EC Van".
- Ví dụ chuẩn hóa: Văn bản ghi "VF 6/ Limo Green/ VF MPV 7" -> dong_xe_ap_dung: "VF 6, Limo, VF LIMO".

   Với mỗi chính sách con đã tách, cung cấp đầy đủ:
   - "ten_uu_dai": Tên ưu đãi (thêm Tên Phiên Bản nếu có, kèm Số Tiền Rút Gọn vào cuối nếu có, KHÔNG ghi tên dòng xe).
   - "dong_xe_ap_dung": Áp dụng cho dòng xe cụ thể nào (đã chuẩn hóa tên theo quy tắc trên).
   - "han_su_dung": Thời gian áp dụng của chính sách.
   - "muc_uu_dai": Cụ thể mức hỗ trợ hoặc phần quà.

KHÔNG Giải thích. TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON DUY NHẤT SAU ĐÂY:
{
  "ten_chinh_sach_chinh": "...",
  "danh_sach_chinh_sach_con": [
    {
      "ten_uu_dai": "...",
      "dong_xe_ap_dung": "...",
      "han_su_dung": "...",
      "muc_uu_dai": "..."
    }
  ]
}
`;

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
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    }

    if (!finalJsonData) {
      throw new Error("Thất bại toàn bộ AI do quá tải hoặc API Limit. Lỗi cuối:\n" + lastGoogleError);
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
      status: 200, 
    })
  }
})
