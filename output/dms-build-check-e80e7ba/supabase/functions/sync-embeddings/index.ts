import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getGeminiEmbedding(text: string, apiKey: string) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text }] }
      })
    });
    const result = await res.json();
    return result.embedding?.values || null;
  } catch (err) {
    console.error("❌ Embedding failed:", err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const geminiKeysEnv = Deno.env.get("GEMINI_KEYS") || Deno.env.get("GEMINI_API_KEY") || "";
    const GEMINI_KEYS = geminiKeysEnv.split(/[,;]+/).map(k => k.trim()).filter(k => !!k);
    
    if (GEMINI_KEYS.length === 0) {
      throw new Error("Missing GEMINI_KEYS environment variable");
    }

    // 1. Lấy danh sách các dòng chưa có embedding
    const { data: records, error: fetchError } = await supabaseAdmin
      .from('ai_knowledge_base')
      .select('id, content')
      .is('embedding', null);

    if (fetchError) throw fetchError;

    if (!records || records.length === 0) {
      return new Response(JSON.stringify({ message: "No records to sync." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const results = [];
    let updatedCount = 0;
    let lastGeneralError = "";

    // ═══════════════════════════════════════════════════════════
    // HÀM TẠO EMBEDDING TỪ VERTEX AI (SERVICE ACCOUNT)
    // ═══════════════════════════════════════════════════════════
    const getVertexEmbedding = async (text: string, serviceAccount: any) => {
        try {
            const { project_id, client_email, private_key } = serviceAccount;
            const location = "us-central1"; // Default location
            
            // Ở Deno/Supabase, ta cần manual JWT hoặc dùng library. 
            // Tuy nhiên, để đơn giản và tin cậy, nế chưa cài Google Auth, 
            // ta sẽ tạm bỏ qua Vertex ở bước này hoặc gợi ý dùng lib.
            // TẠM THỜI: Chúng ta sẽ dùng Google API Keys nhưng tối ưu hóa hơn.
            return null;
        } catch (e) { return null; }
    };

    // DANH SÁCH CÁC MODEL EMBEDDING ĐỂ THỬ (Xoay vòng thông minh)
    const EMBEDDING_MODELS = ["text-embedding-004", "gemini-embedding-001"];

    // 2. Chạy vòng lặp cập nhật
    for (const record of records) {
      const apiKey = GEMINI_KEYS[Math.floor(Math.random() * GEMINI_KEYS.length)];
      let success = false;
      
      for (const modelName of EMBEDDING_MODELS) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:embedContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: `models/${modelName}`,
              content: { parts: [{ text: record.content }] },
              output_dimensionality: 768
            })
          });
          
          const result = await res.json();
          const embedding = result.embedding?.values || null;

          if (embedding) {
            const { error: updateError } = await supabaseAdmin
              .from('ai_knowledge_base')
              .update({ embedding })
              .eq('id', record.id);
            
            if (!updateError) {
              updatedCount++;
              success = true;
              break;
            }
          }
        } catch (e: any) {
          lastGeneralError = e.message;
        }
      }
      
      await new Promise(r => setTimeout(r, 100));
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: records.length, 
      updated: updatedCount,
      lastError: lastGeneralError
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})
