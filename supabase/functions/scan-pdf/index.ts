import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { encode as encodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts"
import { GoogleGenAI } from "npm:@google/genai"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const logs: string[] = [];
  const log = (msg: string) => { console.log(msg); logs.push(msg); };

  try {
    const { files, orderData, action } = await req.json()
    
    // Nếu là action quét ngày cọc, sử dụng prompt tối giản và tập trung
    if (action === 'extract-date') {
      log(`🎯 Chế độ: QUÉT NGÀY CỌC (Extract Date)`);
    }
    
    // Khởi tạo Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return new Response(JSON.stringify({ error: "Missing files array" }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // ═══════════════════════════════════════════════════════════
    // XỬ LÝ ẢNH TỪ URL (NẾU CÓ) ĐỂ TRÁNH LỖI PAYLOAD LỚN
    // ═══════════════════════════════════════════════════════════
    const urlFiles = files.filter(f => !f.base64Data && f.url);
    if (urlFiles.length > 0) {
      log(`⏳ Đang tải ${urlFiles.length} tệp tin từ Storage URLs...`);
    } else {
      log(`📂 Nhận được ${files.length} tệp tin Base64 trực tiếp.`);
    }

    const processedFiles = [];
    for (const f of files) {
      if (f.base64Data) {
        processedFiles.push({ data: f.base64Data, mimeType: f.mimeType || 'image/jpeg' });
      } else if (f.url) {
        try {
          const res = await fetch(f.url);
          if (!res.ok) throw new Error(`Fetch status ${res.status}`);
          const buf = await res.arrayBuffer();
          const b64 = encodeBase64(buf);
          processedFiles.push({ data: b64, mimeType: f.mimeType || res.headers.get('content-type') || 'image/jpeg' });
          log(`  - Đã chuẩn bị xong: ${f.fileName || 'file'}`);
        } catch (e: any) {
          throw new Error(`Không thể parse file từ URL: ${f.url} . Lỗi: ${e.message}`);
        }
      }
    }
    log(`✅ Đã chuẩn bị xong ${processedFiles.length} hình ảnh cho AI.`);

    // Thay thế 'files' bằng 'processedFiles' chuẩn hoá để AI xử lý mượt mà như cũ:
    const finalizedFiles = files.map((f: any, idx: number) => ({
       ...f,
       base64Data: processedFiles[idx].data,
       mimeType: processedFiles[idx].mimeType
    }));

    // ═══════════════════════════════════════════════════════════
    // LẤY TẤT CẢ CÁC CHÌA KHÓA TỪ SECRETS
    // ═══════════════════════════════════════════════════════════
    const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN") || "";
    const OPENROUTER_KEY = Deno.env.get("OPENROUTER_KEY") || "";
    const GROQ_KEY = Deno.env.get("GROQ_KEY") || "";
    const DEEPSEEK_KEY = Deno.env.get("DEEPSEEK_KEY") || "";
    
    const geminiKeysEnv = Deno.env.get('GEMINI_API_KEYS') || Deno.env.get('GEMINI_API_KEY') || "";
    const GEMINI_KEYS = geminiKeysEnv.split(/[,;]+/).map((k: string) => k.trim()).filter((k: string) => !!k);
    
    // Also try GEMINI_KEYS (used by ai-chat)
    const geminiKeysEnv2 = Deno.env.get('GEMINI_KEYS') || "";
    const GEMINI_KEYS_2 = geminiKeysEnv2.split(/[,;]+/).map((k: string) => k.trim()).filter((k: string) => !!k);
    const ALL_GEMINI_KEYS = [...new Set([...GEMINI_KEYS, ...GEMINI_KEYS_2])];
    
    if (ALL_GEMINI_KEYS.length === 0 && !GITHUB_TOKEN && !OPENROUTER_KEY) {
      throw new Error("Không tìm thấy cấu hình API Keys trong biến môi trường.");
    }

    // DANH SÁCH CÁC PROVIDER VÀ MODEL VISION (QUÉT ẢNH/PDF)
    const AI_PROVIDERS = [
      // ── TIER 1: GOOGLE GEMINI FLASH (✅ hoạt động, hỗ trợ PDF trực tiếp) ──
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemini-3.1-flash-lite-preview" })),
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemini-3-flash-preview" })),
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemini-2.5-flash" })),
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemini-2.5-flash-lite" })),
      
      // ── TIER 2: GITHUB MODELS (GPT-4O - CHỈ DÙNG CHO ẢNH) ──
      { type: "github", apiKey: GITHUB_TOKEN, model: "gpt-4o" },
      { type: "github", apiKey: GITHUB_TOKEN, model: "gpt-4o-mini" },

      // ── TIER 3: GROQ VISION MODELS ──
      { type: "groq", apiKey: GROQ_KEY, model: "meta-llama/llama-4-scout-17b-16e-instruct" },

      // ── TIER 4: OPENROUTER (DỰ PHÒNG TỔNG HỢP) ──
      { type: "openrouter", apiKey: OPENROUTER_KEY, model: "google/gemini-2.0-flash-001" },
      { type: "openrouter", apiKey: OPENROUTER_KEY, model: "openai/gpt-4o-mini" },
      { type: "openrouter", apiKey: OPENROUTER_KEY, model: "anthropic/claude-3.5-haiku" },

      // ── TIER 5: GOOGLE PRO & LEGACY (hay hết quota, tự phục hồi) ──
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemini-3-pro-preview" })),
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemini-3.1-pro-preview" })),
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemini-2.5-pro" })),
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemini-2.0-flash" })),
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemini-2.0-flash-lite" })),
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemini-flash-latest" })),
    ].filter(p => !!p.apiKey);

    const googleResponseSchema = action === 'extract-date' 
      ? {
          type: "OBJECT",
          properties: {
            ngay_coc: { type: "STRING", description: "Ngày cọc tìm thấy, định dạng YYYY-MM-DDTHH:mm:ss" },
            ly_do_suy_luan: { type: "STRING", description: "Giải thích ngắn gọn vị trí tìm thấy ngày" }
          },
          required: ["ngay_coc", "ly_do_suy_luan"]
        }
      : {
          type: "OBJECT",
          properties: {
            buoc_suy_luan: { type: "STRING", description: "BƯỚC BẮT BUỘC: Trình bày chi tiết quá trình suy luận, nháp cộng trừ giá, tìm chữ ký trước khi điền kết quả bên dưới" },
            loai_giay_to: { type: "STRING" },
            cac_giay_to_dinh_kem: { type: "ARRAY", items: { type: "STRING" } },
            ma_he_thong: { type: "STRING" },
            canh_bao_sai_lech: { type: "STRING" },
            trang_thai_phap_ly: {
              type: "OBJECT",
              properties: {
                co_chu_ky_ben_mua: { type: "BOOLEAN" },
                co_chu_ky_ben_ban: { type: "BOOLEAN" },
                co_con_dau_do: { type: "BOOLEAN" },
                chi_tiet_chu_ky_thieu: { type: "STRING" }
              },
              required: ["co_chu_ky_ben_mua", "co_chu_ky_ben_ban", "co_con_dau_do", "chi_tiet_chu_ky_thieu"]
            },
            khach_hang: {
              type: "OBJECT",
              properties: {
                ho_ten: { type: "STRING" },
                so_dien_thoai: { type: "STRING" },
                cccd_hoac_mst: { type: "STRING" },
                dia_chi: { type: "STRING" }
              },
              required: ["ho_ten", "so_dien_thoai", "cccd_hoac_mst", "dia_chi"]
            },
            xe_mua: {
              type: "OBJECT",
              properties: {
                dong_xe: { type: "STRING" },
                phien_ban: { type: "STRING" },
                mau_sac_ngoai_that: { type: "STRING" },
                mau_sac_noi_that: { type: "STRING" },
                so_vin: { type: "STRING" },
                so_may: { type: "STRING" }
              },
              required: ["dong_xe", "phien_ban", "mau_sac_ngoai_that", "mau_sac_noi_that", "so_vin", "so_may"]
            },
            potential_knowledge: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  category: { type: "STRING" },
                  lesson_key: { type: "STRING" },
                  content: { type: "STRING" },
                  importance: { type: "INTEGER" }
                },
                required: ["category", "lesson_key", "content", "importance"]
              }
            }
          },
          required: ["buoc_suy_luan", "loai_giay_to", "cac_giay_to_dinh_kem", "ma_he_thong", "canh_bao_sai_lech", "trang_thai_phap_ly", "khach_hang", "xe_mua", "potential_knowledge"]
        };

    // Lọc dòng xe từ dữ liệu đơn hàng (Ví dụ: "VF 3", "VF 5", "VF 9"...)
    const dongXe = (orderData?.["Dòng xe"] || orderData?.dong_xe || "").toString().toUpperCase();
    log(`🔍 Đang lọc kiến thức chuyên biệt cho dòng xe: ${dongXe || "Tất cả"}`);

    // KHO TRI THỨC NGHIỆP VỤ: Lấy kiến thức mục tiêu (Targeted Knowledge)
    let knowledgeQuery = supabase
      .from('ai_knowledge_base')
      .select('category, content')
      .eq('status', 'ACTIVE');

    // Nếu có dòng xe cụ thể, chỉ lấy các bài liên quan đến dòng đó HOẶC các quy trình chung
    if (dongXe) {
      knowledgeQuery = knowledgeQuery.or(`category.ilike.%${dongXe}%,content.ilike.%${dongXe}%,category.eq.COMPANY_PROCESS,category.eq.QUY TRÌNH`);
    }

    const { data: allActiveKnowledge } = await knowledgeQuery;

    const businessKnowledge = allActiveKnowledge?.map(r => `### CHUYÊN MỤC: ${r.category}\n${r.content}`).join('\n\n') || "Chưa có dữ liệu nghiệp vụ.";

    // FEEDBACK LOOP: Lấy các bài học "Chuẩn Vàng" đã được duyệt để dạy AI
    const { data: goldenRecords } = await supabase
      .from('ai_knowledge_base')
      .select('category, content')
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(3); // Giảm xuống 3 bài để tiết kiệm token

    const goldenExamples = goldenRecords?.map(r => `[NHÓM ${r.category}]: ${r.content}`).join('\n---\n') || "Chưa có bài học mẫu.";

    const promptText = action === 'extract-date'
      ? `Bạn là chuyên gia bóc tách dữ liệu tài chính. 
Nhiệm vụ: Tìm chính xác "Ngày giao dịch" hoặc "Ngày lập" hoặc "Ngày thanh toán" trên Ủy nhiệm chi / Chứng từ giao dịch này.
Yêu cầu:
1. Trả về định dạng ISO-8601 (YYYY-MM-DDTHH:mm:ss).
2. Nếu chỉ có ngày không có giờ, hãy mặc định giờ là 00:00:00.
3. Giải thích vị trí tìm thấy ngày trong trường ly_do_suy_luan.
4. KHÔNG được bịa đặt ngày tháng. Nếu hoàn toàn không thấy, trả về null cho ngay_coc.`
      : `
Bạn là một Chuyên viên Kiểm toán cấp cao về Hồ sơ Ô tô VinFast. File đính kèm có thể là MỘT hoặc NHIỀU loại giấy tờ gộp lại trong cùng một file PDF. Nhiệm vụ của bạn là nhận diện VÀ bóc tách TẤT CẢ các loại giấy tờ có trong file. KHÔNG bịa đặt, nếu không có hãy ghi "Không đề cập".

TIÊU CHUẨN TRÌNH BÀY (DỰA TRÊN CÁC BÀI HỌC ĐÃ DUYỆT):
Dưới đây là phong cách trình bày và logic mà Quản trị viên (Admin) mong muốn. Bạn PHẢI học tập và làm theo mức độ chi tiết này:
${goldenExamples}

KHO TRI THỨC NGHIỆP VỤ (NGUỒN SỰ THẬT DUY NHẤT):
Bạn PHẢI sử dụng các quy định, chính sách và công thức dưới đây để đối chiếu và kiểm tra hồ sơ. Mọi sai lệch về giá, khuyến mãi hoặc quy trình so với kho tri thức này đều phải được ghi nhận vào trường "canh_bao_sai_lech".
${businessKnowledge}

QUY TRÌNH BẮT BUỘC:
TRƯỚC KHI kết luận dữ liệu, BẠN PHẢI BẮT BUỘC tiến hành "suy nghĩ" thông qua trường "buoc_suy_luan" đầu tiên. 
Tại trường này, tập trung:
- Phân tích và liệt kê chi tiết các khoản cộng/trừ 5 tầng giá bán.
- Đọc dò từng chữ ký, con dấu của các bộ phận (Tư vấn bán hàng, Kế toán, Ngân hàng...).
Chỉ khi có kết quả nháp ở bước suy luận này, bạn mới điền kết quả vào các trường bên dưới.

QUY TẮC NHẬN DIỆN TỪNG LOẠI GIẤY TỜ:

1. "ĐỀ NGHỊ XUẤT HÓA ĐƠN" (ĐNXHĐ):
   - Quét: Tên Khách hàng, Số VIN, Màu sắc, GIÁ ĐỀ NGHỊ XUẤT HÓA ĐƠN.
   - CHECK 4 CHỮ KÝ NỘI BỘ + TÊN: Bắt buộc tìm đủ 4 chữ ký kèm Tên bên dưới: TVBH, Sale Admin, Kế toán trưởng, Giám đốc (hoặc Phó/Ủy quyền). 
   - LỖI NẾU: Thiếu chữ ký, thiếu mộc đỏ công ty, hoặc "Giá đề nghị xuất" không khớp với HĐMB/Kho tri thức.
   - KHÔNG CẦN CHỮ KÝ KHÁCH HÀNG: "co_chu_ky_ben_mua" LUÔN = true.

2. "HỢP ĐỒNG MUA BÁN" (HĐMB):
   - Quét: Tên Khách Hàng, Màu sắc (Nội/Ngoại), Phiên bản xe, GIÁ HỢP ĐỒNG.
   - KHÔNG CẦN SỐ VIN: Ghi "Không đề cập".
   - CHECK CHỮ KÝ & MỘC: Khách hàng ký chưa? Đại lý đã ký? Có con dấu đỏ đóng đè lên chữ ký Đại lý chưa? 
   - ĐỐI CHIẾU CHÉO (X-CHECK): Kiểm tra Màu sắc và Phiên bản xe có khớp 100% với tờ ĐNXHĐ đi kèm không.

3. NẾU LÀ "CHỨNG TỪ CHO VAY" (NHƯ THÔNG BÁO CHO VAY, CAM KẾT THANH TOÁN, v.v.):
   - Quy tắc: CHỈ DÙNG ĐỂ ĐỐI CHIẾU (Tên KH, Số tiền vay, Ngân hàng). KHÔNG trích xuất bài học từ loại giấy tờ này.
   - CHECK CHỮ KÝ: Phải có chữ ký và mộc đỏ của phía Ngân hàng.

4. "ĐỀ NGHỊ ĐIỀU KIỆN BÁN HÀNG" (ĐNĐKBH - RẤT QUAN TRỌNG):
   - Bạn PHẢI PHÂN TÍCH KỸ bảng "Giá cả và thanh toán" để lấy thông tin giá xe và khuyến mãi.
   - QUY TẮC CỘNG TRỪ GIÁ (Dựa trên mẫu ĐNĐKBH chuẩn):
     + Tầng 1: GIÁ NIÊM YẾT.
     + Tầng 2: CÁC KHOẢN GIẢM TRỰC TIẾP VÀO HĐMB. Các khoản này khi trừ đi Giá niêm yết sẽ ra GIÁ HỢP ĐỒNG.
     + Tầng 3: GIÁ HỢP ĐỒNG (Đây là giá sẽ in trên HĐMB và hóa đơn).
     + Tầng 4: CÁC KHOẢN GIẢM TIỀN THU KHÁCH NHƯNG KHÔNG TRỪ HĐMB.
     + Tầng 5: GIÁ SAU TRỪ KM KHÔNG TRỪ HĐ.

5. NHIỆM VỤ TỰ ĐỘNG HỌC KIẾN THỨC (AUTO-LEARNING TỪ TOÀN BỘ HỒ SƠ):
   Bạn đóng vai trò là cỗ máy AI tự học. Trong BẤT KỲ loại giấy tờ nào (không chỉ ĐNĐKBH), nếu bạn phát hiện ra một "Chính sách, Quy định, Lãi suất, hoặc Quà tặng" có giá trị hệ thống (áp dụng chung được cho đại lý hoặc xe đó), bạn PHẢI trích xuất chúng vào mảng "potential_knowledge" theo 2 nhóm sau:
   - SALES_POLICY (Chính sách Bán hàng): Học từ ĐNĐKBH, HĐMB. Đặc biệt ghi nhớ các PHÉP TÍNH (cộng, trừ, nhân, chia) và CÔNG THỨC liên quan đến: Lệ phí trước bạ, Phí biển số, Giảm trừ KM trực tiếp vs KM gián tiếp. Đối chiếu khớp số giữa các loại hợp đồng (HĐMB vs ĐNĐKBH).
   - COMPANY_PROCESS (Quy trình Nội bộ): Học từ các giấy ghi chú, thỏa thuận. Ví dụ: Quy định cần thu tối thiểu 20tr tiền đối ứng mới được xuất hóa đơn.
   
   Quy tắc điền mảng "potential_knowledge": 
      + category: Chọn 1 trong 2 nhóm trên (SALES_POLICY hoặc COMPANY_PROCESS).
      + lesson_key: Đặt tên gợi nhớ, VIẾT HOA (VD: CHINH_SACH_VF5_THANG_4).
      + content: TRÌNH BÀY DƯỚI DẠNG BẢNG MARKDOWN (Markdown Table) để dễ đọc. Nếu là quy định hãy chia cột "Điều kiện" và "Kết quả".
      + importance: Đánh giá độ quan trọng (từ 1 đến 5).

LƯU Ý QUAN TRỌNG KHI CÓ NHIỀU GIẤY TỜ TRONG 1 FILE:
- KIỂM TRA SỰ ĐỒNG NHẤT: Xem xét chéo các thông tin chính yếu (Tên khách hàng, Số VIN, Màu sắc, Phiên bản) GIỮA CÁC TÀI LIỆU VỚI NHAU.
- TUYỆT ĐỐI KHÔNG TRẢ VỀ MẢNG (ARRAY). CHỈ TRẢ VỀ 1 OBJECT DUY NHẤT. Thông tin lấy theo tài liệu CHÍNH (ĐNXHĐ hoặc HĐMB).
- Nếu phát hiện mâu thuẫn THỰC SỰ GIỮA CÁC GIẤY TỜ với nhau, ghi rõ nội dung mâu thuẫn vào trường "can_bao_sai_lech". Nếu mọi thứ đồng nhất và khớp nhau, ghi "Không có".

TRẢ VỀ ĐỊNH DẠNG JSON DUY NHẤT SAU ĐÂY:
{
  "buoc_suy_luan": "Viết nháp quá trình phân tích loại tài liệu, tính toán giá trị, liệt kê các chữ ký tìm thấy trước khi điền dữ liệu bên dưới...",
  "loai_giay_to": "Tên loại giấy tờ...",
  "cac_giay_to_dinh_kem": ["Tên giấy tờ 1", "Tên giấy tờ 2"],
  "ma_he_thong": "Mã Hợp đồng hoặc Số tham chiếu...",
  "canh_bao_sai_lech": "...",
  "trang_thai_phap_ly": {
    "co_chu_ky_ben_mua": true,
    "co_chu_ky_ben_ban": true,
    "co_con_dau_do": true,
    "chi_tiet_chu_ky_thieu": ""
  },
  "khach_hang": { "ho_ten": "...", "so_dien_thoai": "...", "cccd_hoac_mst": "...", "dia_chi": "..." },
  "xe_mua": { "dong_xe": "...", "phien_ban": "...", "mau_sac_ngoai_that": "...", "mau_sac_noi_that": "...", "so_vin": "...", "so_may": "..." },
  "potential_knowledge": [
    { "category": "SALES_POLICY", "lesson_key": "...", "content": "...", "importance": 5 }
  ]
}

Nội dung hệ thống đang có (để đối chiếu):
${JSON.stringify(orderData || {})}
    `;

    const isPdf = files.some((f: any) => f.mimeType === 'application/pdf');
    let finalJsonData = null;
    let successfulModel = null;
    let lastError = "";

    // ═══════════════════════════════════════════════════════════
    // QUY TRÌNH QUÉT 1 LƯỢT DUY NHẤT (TỐI ƯU CHI PHÍ & TỐC ĐỘ)
    // ═══════════════════════════════════════════════════════════
    for (const provider of AI_PROVIDERS) {
      try {
        if (isPdf && provider.type !== 'google' && provider.type !== 'openrouter') continue;

        log(`🚀 Đang quét hồ sơ với: ${provider.model}...`);
        let responseText = "";

        if (provider.type === "google") {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent?key=${provider.apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                role: "user",
                parts: [
                  { text: promptText },
                  ...finalizedFiles.map((f: any) => ({
                    inlineData: { data: f.base64Data, mimeType: f.mimeType }
                  }))
                ]
              }],
              generationConfig: { 
                responseMimeType: "application/json",
                responseSchema: googleResponseSchema
              }
            })
          });
          const result = await res.json();
          responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } 
        else {
          const baseUrl = provider.type === "openrouter" ? "https://openrouter.ai/api/v1/chat/completions" : "https://models.inference.ai.azure.com/chat/completions";
          const res = await fetch(baseUrl, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json", 
              "Authorization": `Bearer ${provider.apiKey}`
            },
            body: JSON.stringify({
              model: provider.model,
              messages: [{
                role: "user",
                content: [
                  { type: "text", text: promptText },
                  ...finalizedFiles.map((f: any) => ({
                    type: "image_url",
                    image_url: { url: `data:${f.mimeType};base64,${f.base64Data}` }
                  }))
                ]
              }],
              response_format: { type: "json_object" }
            })
          });
          const result = await res.json();
          responseText = result.choices?.[0]?.message?.content || "";
        }

        if (responseText) {
          finalJsonData = JSON.parse(responseText);
          successfulModel = provider.model;
          log(`✅ Thành công với model: ${successfulModel}`);
          break; // Thành công, thoát vòng lặp
        }
      } catch (err: any) {
        lastError = err.message;
        log(`⚠️ ${provider.model} lỗi: ${lastError.substring(0, 100)}`);
      }
    }

    if (!finalJsonData) {
      throw new Error(`Tất cả AI đều thất bại. Lỗi cuối cùng: ${lastError}`);
    }

    // ═══════════════════════════════════════════════════════════
    // AI TỰ ĐỘNG HỌC KIẾN THỨC (SAVE TO KNOWLEDGE BASE & CONSOLIDATE)
    // ═══════════════════════════════════════════════════════════
    if (finalJsonData.potential_knowledge && Array.isArray(finalJsonData.potential_knowledge)) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const touchedCategories = new Set<string>();

        // Bước 1: Lưu tạm kiến thức mới (Batch Upsert để giảm round-trip)
        const validKnowledge = finalJsonData.potential_knowledge.filter((k: any) => k.category && k.lesson_key && k.content);
        if (validKnowledge.length > 0) {
          const batch = validKnowledge.map((k: any) => ({
            category: k.category,
            lesson_key: k.lesson_key,
            content: k.content,
            importance: k.importance || 3,
            updated_by: 'AI_AUTO_LEARNING',
            status: 'PENDING'
          }));

          const { error: dbError } = await supabase
            .from('ai_knowledge_base')
            .upsert(batch, { onConflict: 'lesson_key' });

          if (!dbError) {
            validKnowledge.forEach((k: any) => {
              touchedCategories.add(k.category);
              log(`📥 Đã lưu tạm kiến thức: ${k.lesson_key}`);
            });
          } else {
            console.error("Lỗi batch upsert:", dbError);
          }
        }

        // Bước 2: TỰ ĐỘNG GỘP (Consolidate) các chuyên mục bị ảnh hưởng
        for (const cat of touchedCategories) {
          log(`🧹 Bắt đầu gộp và dọn dẹp chuyên mục: ${cat}...`);
          const { data: catData } = await supabase.from('ai_knowledge_base').select('id, category, lesson_key, content').eq('category', cat);
          
          if (catData && catData.length > 1) {
            const githubKey = Deno.env.get("GITHUB_TOKEN") || Deno.env.get("GITHUB_API_KEY");
            const promptClean = `
Bạn là AI Thẩm Định Tri Thức. Hãy GỘP GỌN các mảnh kiến thức thuộc nhóm ${cat} dưới đây.
Dữ liệu đầu vào: ${JSON.stringify(catData.map(d => ({ content: d.content })))}

QUY TẮC:
1. LUÔN SỬ DỤNG BẢNG (MARKDOWN TABLE) nếu có số liệu.
2. Trả về đúng định dạng JSON: {"data": [{"category": "${cat}", "lesson_key": "KNOWLEDGE_${cat}_CONSOLIDATED", "content": "Markdown text here...", "importance": 5, "status": "PENDING"}]}
`;
            try {
              const res = await fetch("https://models.inference.ai.azure.com/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${githubKey}` },
                body: JSON.stringify({
                  model: "gpt-4o-mini",
                  messages: [{ role: "user", content: promptClean }],
                  response_format: { type: "json_object" }
                })
              });
              const aiResult = await res.json();
              const consolidated = aiResult.choices?.[0]?.message?.content;
              if (consolidated) {
                const parsed = JSON.parse(consolidated);
                const items = parsed.data || [];
                if (items.length > 0) {
                  await supabase.from('ai_knowledge_base').delete().eq('category', cat);
                  for (const item of items) {
                    await supabase.from('ai_knowledge_base').insert({
                      category: item.category || cat,
                      lesson_key: item.lesson_key,
                      content: item.content,
                      importance: item.importance || 5,
                      updated_by: 'AI_CONSOLIDATOR',
                      status: 'PENDING'
                    });
                  }
                  log(`✅ Đã gộp nhóm ${cat}.`);
                }
              }
            } catch (err) {
              console.error(`Lỗi gộp nhóm ${cat}:`, err.message);
            }
          }
        }
      } catch (e) {
        console.error("Lỗi hệ thống tự học:", e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, model: successfulModel, data: finalJsonData, debugLogs: logs }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error: any) {
    console.error("Function error:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message, debugLogs: logs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  }
})
