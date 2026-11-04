import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  
  const logs: string[] = [];
  const log = (msg: string) => { console.log(msg); logs.push(msg); };

  try {
    const { base64Data, mimeType } = await req.json();
    
    if (!base64Data || !mimeType) {
      return new Response(JSON.stringify({ error: "Missing base64Data or mimeType" }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }
    
    const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN") || "";
    const OPENROUTER_KEY = Deno.env.get("OPENROUTER_KEY") || "";
    const GROQ_KEY = Deno.env.get("GROQ_KEY") || "";
    
    const geminiKeysEnv = Deno.env.get('GEMINI_API_KEYS') || Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GEMINI_KEYS') || "";
    const GEMINI_KEYS = geminiKeysEnv.split(/[,;]+/).map((k: string) => k.trim()).filter((k: string) => !!k);
    
    const geminiKeysEnv2 = Deno.env.get('GEMINI_KEYS') || "";
    const GEMINI_KEYS_2 = geminiKeysEnv2.split(/[,;]+/).map((k: string) => k.trim()).filter((k: string) => !!k);
    const ALL_GEMINI_KEYS = [...new Set([...GEMINI_KEYS, ...GEMINI_KEYS_2])];

    if (ALL_GEMINI_KEYS.length === 0 && !GITHUB_TOKEN && !OPENROUTER_KEY && !GROQ_KEY) {
      throw new Error("Không tìm thấy cấu hình API Keys trong biến môi trường.");
    }

    const AI_PROVIDERS = [
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemini-3.1-flash-lite-preview" })),
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemini-3-flash-preview" })),
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemini-2.5-flash" })),
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemini-2.5-flash-lite" })),
      
      { type: "github", apiKey: GITHUB_TOKEN, model: "gpt-4o" },
      { type: "github", apiKey: GITHUB_TOKEN, model: "gpt-4o-mini" },
      { type: "groq", apiKey: GROQ_KEY, model: "llama-3.3-70b-versatile" },
      { type: "groq", apiKey: GROQ_KEY, model: "llama-3.1-8b-instant" },
      { type: "groq", apiKey: GROQ_KEY, model: "meta-llama/llama-4-scout-17b-16e-instruct" },
      { type: "groq", apiKey: GROQ_KEY, model: "qwen/qwen3-32b" },

      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemma-4-31b-it" })),
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemma-4-26b-a4b-it" })),
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemma-3-27b-it" })),

      { type: "openrouter", apiKey: OPENROUTER_KEY, model: "google/gemini-2.0-flash-001" },
      { type: "openrouter", apiKey: OPENROUTER_KEY, model: "meta-llama/llama-3.3-70b-instruct" },
      { type: "groq", apiKey: GROQ_KEY, model: "openai/gpt-oss-120b" },
      { type: "groq", apiKey: GROQ_KEY, model: "openai/gpt-oss-20b" },

      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemini-3-pro-preview" })),
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemini-3.1-pro-preview" })),
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemini-2.5-pro" })),
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemini-2.0-flash" })),
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemini-flash-latest" })),
    ].filter(p => !!p.apiKey);

    const isTextFile = mimeType.includes('text') || mimeType.includes('rfc822') || (!mimeType.includes('image') && !mimeType.includes('pdf'));
    let textContent = "";

    if (isTextFile) {
        try {
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
            textContent = new TextDecoder().decode(bytes);
            
            textContent = textContent.replace(/[a-zA-Z0-9+/=]{500,}/g, "[Binary Data Removed]");
            if (textContent.length > 50000) textContent = textContent.substring(0, 50000) + "... [Truncated]";
        } catch (e: any) {
            log(`Decoding error: ${e.message}`);
        }
    }

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

    let finalResult = null;
    let successfulModel = null;
    let lastError = "";

    for (const provider of AI_PROVIDERS) {
      try {
        if (mimeType === 'application/pdf' && provider.type !== 'google' && provider.type !== 'openrouter') {
          continue;
        }

        log(`🚀 Thử nghiệm: ${provider.type} (${provider.model})...`);
        let responseText = "";

        if (provider.type === "google") {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent?key=${provider.apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ 
                role: "user", 
                parts: isTextFile 
                  ? [{ text: promptText }, { text: `NỘI DUNG FILE:\n${textContent}` }]
                  : [{ text: promptText }, { inlineData: { data: base64Data, mimeType } }]
              }],
              generationConfig: { responseMimeType: "application/json" }
            })
          });
          const result = await res.json();
          if (result.error) {
              throw new Error(result.error.message || JSON.stringify(result.error));
          }
          responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } 
        else {
          let baseUrl = "https://models.inference.ai.azure.com/chat/completions";
          if (provider.type === "groq") baseUrl = "https://api.groq.com/openai/v1/chat/completions";
          if (provider.type === "openrouter") baseUrl = "https://openrouter.ai/api/v1/chat/completions";

          const res = await fetch(baseUrl, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json", 
              "Authorization": `Bearer ${provider.apiKey}`,
              ...(provider.type === "openrouter" ? { "HTTP-Referer": "https://supabase.com", "X-Title": "OrderManagement" } : {})
            },
            body: JSON.stringify({
              model: provider.model,
              messages: [{
                role: "user",
                content: isTextFile 
                  ? `${promptText}\n\nNỘI DUNG FILE:\n${textContent}`
                  : [
                      { type: "text", text: promptText },
                      { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } }
                    ]
              }],
              response_format: { type: "json_object" }
            })
          });
          const result = await res.json();
          if (result.error) {
              throw new Error(result.error.message || JSON.stringify(result.error));
          }
          responseText = result.choices?.[0]?.message?.content || "";
        }

        if (responseText) {
          try {
            finalResult = JSON.parse(responseText);
          } catch (e) {
            const match = responseText.match(/\{[\s\S]*\}/);
            if (match) finalResult = JSON.parse(match[0]);
          }
        }

        if (finalResult) {
          successfulModel = provider.model;
          log(`✅ Thành công với ${successfulModel}`);
          break;
        }
      } catch (err: any) {
        lastError = err.message;
        log(`⚠️ ${provider.model} thất bại: ${lastError.substring(0, 100)}`);
      }
    }

    if (!finalResult) throw new Error(`Tất cả AI đều thất bại. Lỗi cuối: ${lastError}`);

    return new Response(JSON.stringify({ 
      success: true, 
      data: finalResult,
      model: successfulModel,
      modelUsed: successfulModel,
      debugLogs: logs
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    log(`Function error: ${error.message}`);
    return new Response(JSON.stringify({ success: false, error: error.message, debugLogs: logs }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, 
    })
  }
})
