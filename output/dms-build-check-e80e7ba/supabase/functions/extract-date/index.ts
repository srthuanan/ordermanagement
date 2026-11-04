import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const now = new Date().toISOString();
  console.log(`[${now}] 📥 Nhận yêu cầu mới...`);

  try {
    const { files } = await req.json();
    console.log(`[${now}] 📂 Số lượng file nhận được: ${files?.length || 0}`);
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return new Response(JSON.stringify({ error: "Missing files" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ═══════════════════════════════════════════════════════════
    // LẤY TẤT CẢ CÁC CHÌA KHÓA TỪ SECRETS
    // ═══════════════════════════════════════════════════════════
    const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN") || "";
    const OPENROUTER_KEY = Deno.env.get("OPENROUTER_KEY") || "";
    const GROQ_KEY = Deno.env.get("GROQ_KEY") || "";
    const DEEPSEEK_KEY = Deno.env.get("DEEPSEEK_KEY") || "";
    
    const geminiKeysEnv = Deno.env.get('GEMINI_API_KEYS') || Deno.env.get('GEMINI_API_KEY') || "";
    const GEMINI_KEYS = geminiKeysEnv.split(/[,;]+/).map((k: string) => k.trim()).filter((k: string) => !!k);
    
    const geminiKeysEnv2 = Deno.env.get('GEMINI_KEYS') || "";
    const GEMINI_KEYS_2 = geminiKeysEnv2.split(/[,;]+/).map((k: string) => k.trim()).filter((k: string) => !!k);
    const ALL_GEMINI_KEYS = [...new Set([...GEMINI_KEYS, ...GEMINI_KEYS_2])];
    
    if (ALL_GEMINI_KEYS.length === 0 && !GITHUB_TOKEN && !OPENROUTER_KEY) {
      throw new Error("Không tìm thấy cấu hình API Keys trong biến môi trường.");
    }

    // DANH SÁCH CÁC PROVIDER VÀ MODEL VISION (QUÉT ẢNH/PDF)
    const AI_PROVIDERS = [
      // ── TIER ƯU TIÊN: TỐC ĐỘ CAO ──
      { type: "github", apiKey: GITHUB_TOKEN, model: "gpt-4o-mini" },

      // ── TIER 1: GOOGLE GEMINI FLASH (✅ hoạt động, hỗ trợ PDF trực tiếp) ──
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemini-3.1-flash-lite-preview" })),
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemini-3-flash-preview" })),
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemini-2.5-flash" })),
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemini-2.5-flash-lite" })),
      
      // ── TIER 2: GITHUB MODELS (GPT-4O - CHỈ DÙNG CHO ẢNH) ──
      { type: "github", apiKey: GITHUB_TOKEN, model: "gpt-4o" },

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

    const file = files[0];
    const promptText = `Bạn là chuyên gia bóc tách dữ liệu từ chứng từ ngân hàng (Ủy nhiệm chi, Lệnh chuyển tiền, Giấy nộp tiền).
Nhiệm vụ: Tìm chính xác NGÀY CỌC (Ngày khách hàng nộp tiền/chuyển khoản).
Các từ khóa thường gặp trên chứng từ: "Ngày lập", "Ngày giao dịch", "Ngày hạch toán", "Ngày nộp tiền", "Ngày thanh toán", "Ngày/Date".

Yêu cầu:
1. Trả về định dạng ISO-8601 (YYYY-MM-DDTHH:mm:ss). 
2. Nếu chỉ có ngày (VD: 23/04/2026), hãy trả về: 2026-04-23T00:00:00.
3. Nếu thấy nhiều ngày, hãy ưu tiên "Ngày giao dịch" hoặc "Ngày hạch toán".
4. Nếu hoàn toàn không thấy, trả về ngay_coc: null và ghi rõ lý do.

Trả về JSON: {"ngay_coc": "ISO_DATE_STRING", "ly_do": "Giải thích ngắn gọn"}`;

    const googleResponseSchema = {
      type: "OBJECT",
      properties: {
        ngay_coc: { type: "STRING" },
        ly_do: { type: "STRING" }
      },
      required: ["ngay_coc", "ly_do"]
    };

    let finalJsonData = null;
    let successfulModel = null;
    let lastError = "";

    for (const provider of AI_PROVIDERS) {
      try {
        console.log(`[${now}] 🚀 Đang quét với: ${provider.model}...`);
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
                  { inlineData: { data: file.base64Data, mimeType: file.mimeType || 'image/jpeg' } }
                ]
              }],
              safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
              ],
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
                  { type: "image_url", image_url: { url: `data:${file.mimeType || 'image/jpeg'};base64,${file.base64Data}` } }
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
          break;
        }
      } catch (err: any) {
        lastError = err.message;
        console.warn(`[${now}] ⚠️ ${provider.model} lỗi: ${lastError}`);
      }
    }

    if (!finalJsonData) {
      throw new Error(`Tất cả AI đều thất bại. Lỗi cuối cùng: ${lastError}`);
    }

    console.log(`[${now}] ✅ Xử lý xong với ${successfulModel}. Kết quả: ${finalJsonData.ngay_coc}`);

    return new Response(
      JSON.stringify({ success: true, data: finalJsonData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  }
})
