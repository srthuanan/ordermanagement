import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

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
    
    // ═══════════════════════════════════════════════════════════
    // LẤY TẤT CẢ CÁC CHÌA KHÓA TỪ SECRETS (Y HỆT SCAN-PDF)
    // ═══════════════════════════════════════════════════════════
    const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN") || "";
    const OPENROUTER_KEY = Deno.env.get("OPENROUTER_KEY") || "";
    const GROQ_KEY = Deno.env.get("GROQ_KEY") || "";
    const DEEPSEEK_KEY = Deno.env.get("DEEPSEEK_KEY") || "";
    
    const geminiKeysEnv = Deno.env.get('GEMINI_API_KEYS') || Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GEMINI_KEYS') || "";
    const GEMINI_KEYS = geminiKeysEnv.split(/[,;]+/).map((k: string) => k.trim()).filter((k: string) => !!k);
    
    // Also try GEMINI_KEYS (used by ai-chat)
    const geminiKeysEnv2 = Deno.env.get('GEMINI_KEYS') || "";
    const GEMINI_KEYS_2 = geminiKeysEnv2.split(/[,;]+/).map((k: string) => k.trim()).filter((k: string) => !!k);
    const ALL_GEMINI_KEYS = [...new Set([...GEMINI_KEYS, ...GEMINI_KEYS_2])];

    if (ALL_GEMINI_KEYS.length === 0 && !GITHUB_TOKEN && !OPENROUTER_KEY) {
      throw new Error("Không tìm thấy cấu hình API Keys trong biến môi trường.");
    }

    // DANH SÁCH PROVIDER DỰ PHÒNG (ƯU TIÊN CÁC MODEL THÔNG MINH NHẤT)
    const AI_PROVIDERS = [
      // ── TIER 1: GOOGLE GEMINI FLASH (✅ hoạt động tất cả keys) ──
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemini-3.1-flash-lite-preview" })),
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemini-3-flash-preview" })),
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemini-2.5-flash" })),
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemini-2.5-flash-lite" })),
      
      // ── TIER 2: EXTERNAL (✅ luôn hoạt động) ──
      { type: "github", apiKey: GITHUB_TOKEN, model: "gpt-4o" },
      { type: "github", apiKey: GITHUB_TOKEN, model: "gpt-4o-mini" },
      { type: "groq", apiKey: GROQ_KEY, model: "llama-3.3-70b-versatile" },
      { type: "groq", apiKey: GROQ_KEY, model: "llama-3.1-8b-instant" },
      { type: "groq", apiKey: GROQ_KEY, model: "meta-llama/llama-4-scout-17b-16e-instruct" },
      { type: "groq", apiKey: GROQ_KEY, model: "qwen/qwen3-32b" },

      // ── TIER 3: GOOGLE GEMMA (✅ text processing, ít bị quota) ──
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemma-4-31b-it" })),
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemma-4-26b-a4b-it" })),
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemma-3-27b-it" })),

      // ── TIER 4: OPENROUTER & GROQ FALLBACK ──
      { type: "openrouter", apiKey: OPENROUTER_KEY, model: "google/gemini-2.0-flash-001" },
      { type: "openrouter", apiKey: OPENROUTER_KEY, model: "meta-llama/llama-3.3-70b-instruct" },
      { type: "groq", apiKey: GROQ_KEY, model: "openai/gpt-oss-120b" },
      { type: "groq", apiKey: GROQ_KEY, model: "openai/gpt-oss-20b" },

      // ── TIER 5: GOOGLE PRO & LEGACY (hay hết quota, tự phục hồi) ──
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemini-3-pro-preview" })),
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemini-3.1-pro-preview" })),
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemini-2.5-pro" })),
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemini-2.0-flash" })),
      ...ALL_GEMINI_KEYS.map(key => ({ type: "google", apiKey: key, model: "gemini-flash-latest" })),
    ].filter(p => !!p.apiKey);

    // KIỂM TRA LOẠI FILE (TEXT/EML vs VISION)
    const isTextFile = mimeType.includes('text') || mimeType.includes('rfc822') || !mimeType;
    let textContent = "";

    if (isTextFile) {
        try {
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
            textContent = new TextDecoder().decode(bytes);
            
            // Tối ưu hóa EML: Xóa binary rác
            textContent = textContent.replace(/[a-zA-Z0-9+/=]{500,}/g, "[Binary Data Removed]");
            if (textContent.length > 50000) textContent = textContent.substring(0, 50000) + "... [Truncated]";
        } catch (e) {
            log(`Decoding error: ${e.message}`);
        }
    }

    const promptText = `Bạn là một chuyên gia đào tạo AI cho hệ thống VinFast. Hãy trích xuất "Điểm tri thức" (Knowledge Points) từ tài liệu này (Email, PDF hoặc Ảnh).
TRẢ VỀ ĐỊNH DẠNG JSON DUY NHẤT:
{
  "knowledge_points": [
    { 
      "category": "GIÁ XE" hoặc "CHÍNH SÁCH" hoặc "THỦ TỤC", 
      "lesson_key": "Mã viết hoa không dấu (VD: POLICY_VF3_2026)",
      "content": "Nội dung quy tắc chi tiết...", 
      "importance": 4 
    }
  ]
}`;

    let finalResult = null;
    let successfulModel = null;
    let lastError = "";

    for (const provider of AI_PROVIDERS) {
      try {
        // Bỏ qua vision model cho PDF nếu không phải Gemini/OpenRouter (Giống scan-pdf)
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
        log(`⚠️ ${provider.model} thất bại: ${lastError.substring(0, 50)}`);
      }
    }

    if (!finalResult) throw new Error(`Tất cả AI đều thất bại. Lỗi cuối: ${lastError}`);

    return new Response(JSON.stringify({ 
      success: true, 
      data: finalResult, 
      modelUsed: successfulModel,
      debugLogs: logs
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message, debugLogs: logs }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})
