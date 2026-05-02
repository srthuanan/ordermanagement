import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ═══════════════════════════════════════════════════════════════
// HÀM TRUY VẤN VECTƠ (Vector Search)
// ═══════════════════════════════════════════════════════════════
async function getGeminiEmbedding(text: string, keys: string[]) {
  if (keys.length === 0) return null;
  
  // Trộn key để phân phối tải
  const shuffledKeys = [...keys].sort(() => Math.random() - 0.5);
  const models = ["text-embedding-004", "gemini-embedding-001"];

  for (const key of shuffledKeys) {
    for (const modelName of models) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:embedContent?key=${key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: `models/${modelName}`,
            content: { parts: [{ text }] },
            output_dimensionality: 768
          })
        });
        const result = await res.json();
        if (result.embedding?.values) return result.embedding.values;
        console.warn(`⚠️ Model ${modelName} with key ${key.substring(0,5)} failed:`, result.error?.message);
      } catch (err) {
        console.error(`❌ Embedding attempt failed:`, err);
      }
    }
  }
  return null;
}

async function searchVectorKnowledge(supabase: any, embedding: number[], isAdmin: boolean = false) {
  if (!embedding) return [];
  const { data, error } = await supabase.rpc('match_ai_knowledge', {
    query_embedding: embedding,
    match_threshold: 0.5,
    match_count: 5,
    p_is_admin: isAdmin // CUNG CẤP QUYỀN ADMIN CHO RPC
  });
  if (error) {
    console.error("❌ Vector search error:", error);
    return [];
  }
  return data || [];
}

// ═══════════════════════════════════════════════════════════════
// ĐỊNH DẠNG CÔNG CỤ (Tool Definition)
// ═══════════════════════════════════════════════════════════════
const AI_TOOLS = [
  {
    functionDeclarations: [
      {
        name: "get_car_details",
        description: "Lấy thông tin chi tiết về một chiếc xe dựa trên mã VIN (toàn bộ hoặc một phần).",
        parameters: {
          type: "object",
          properties: {
            vin: { type: "string", description: "Mã VIN hoặc 6 số cuối VIN." }
          },
          required: ["vin"]
        }
      },
      {
        name: "get_order_details",
        description: "Lấy thông tin chi tiết về một đơn hàng dựa trên số đơn hàng.",
        parameters: {
          type: "object",
          properties: {
            order_no: { type: "string", description: "Số đơn hàng (ví dụ: SO123456)." }
          },
          required: ["order_no"]
        }
      }
    ]
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json();
    if (body.ping) {
      return new Response(JSON.stringify({ status: 'ok', message: 'AI Brain v2.0 is ALIVE 🧠' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const { messages } = body;

    const OPENROUTER_KEY = Deno.env.get("OPENROUTER_KEY") || "";
    const DEEPSEEK_KEY = Deno.env.get("DEEPSEEK_KEY") || "";
    const GROQ_KEY = Deno.env.get("GROQ_KEY") || "";
    const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN") || "";
    const geminiKeysEnv = Deno.env.get("GEMINI_KEYS") || "";
    const GEMINI_KEYS = geminiKeysEnv ? geminiKeysEnv.split(",") : [];

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // ═══════════════════════════════════════════════════════════
    // BƯỚC 1: Gom dữ liệu SONG SONG (triệu hồi cùng lúc)
    // ═══════════════════════════════════════════════════════════
    const lastUserMessage = messages[messages.length - 1]?.content || "";
    
    // Trích xuất từ khóa thông minh v3.0 (Siêu thám tử)
    const extractSearchTerms = (msg: string): string[] => {
      const terms: string[] = [];
      const uMsg = msg.toUpperCase();
      
      // 1. VIN pattern (17 chars) hoặc 6 số cuối VIN
      const vinMatch = msg.match(/[VR][A-Z0-9]{16}/gi);
      if (vinMatch) terms.push(...vinMatch.map(v => v.toUpperCase()));
      const partialVin = msg.match(/[0-9]{6,}/g);
      if (partialVin) terms.push(...partialVin);

      // 2. Tên dòng xe (VF3, VF 3, VF5...) -> Chuẩn hóa về VF3
      const modelMatch = msg.match(/VF\s?[3-9]/gi);
      if (modelMatch) {
        terms.push(...modelMatch.map(m => m.replace(/\s+/g, '').toUpperCase()));
      }

      // 3. Tên tiếng Việt (Họ tên đầy đủ)
      const nameMatch = msg.match(/[A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s[A-ZÀ-Ỹ][a-zà-ỹ]+)+/g);
      if (nameMatch) terms.push(...nameMatch);

      // 4. Các từ khóa màu sắc quan trọng
      const colors = ["đỏ", "trắng", "đen", "xanh", "xám", " bạc", "crimson", "zenith", "brahminy", "deepocean", "brown", "introspective", "nâu"];
      const colorAbbr: Record<string, string> = { "TR": "Trắng", "Đ": "Đỏ", "ĐE": "Đen", "XA": "Xanh", "BA": "Bạc" };
      
      colors.forEach(c => {
        if (msg.toLowerCase().includes(c)) terms.push(c);
      });
      
      // Check for standalone abbreviations in capital letters
      Object.keys(colorAbbr).forEach(abbr => {
        const regex = new RegExp(`\\b${abbr}\\b`, 'g');
        if (msg.toUpperCase().match(regex)) terms.push(colorAbbr[abbr]);
      });

      // 5. Số đơn hàng (Pattern: N31920-VSO-... hoặc XX-XX-...)
      const orderMatch = msg.match(/[A-Z0-9]+-[A-Z0-9]+-[0-9-]+/gi);
      if (orderMatch) terms.push(...orderMatch.map(o => o.toUpperCase()));

      if (terms.length === 0 && msg.trim().length > 2) {
        terms.push(msg.trim().substring(0, 50));
      }
      return [...new Set(terms)];
    };

    const contextData = body.contextData || {};
    const userFullName = contextData?.userContext?.fullName || '';
    const userRole = contextData?.userContext?.role || 'Thành viên';
    const isAdmin = userRole === 'Quản trị viên' || userRole === 'Admin' || userRole === 'admin';

    // ═══════════════════════════════════════════════════════════
    // BỘ LỌC BẢO MẬT (Security Guard) v2.0
    // ═══════════════════════════════════════════════════════════
    const isOwner = (ownerName: any): boolean => {
      if (isAdmin) return true;
      if (!ownerName || typeof ownerName !== 'string') return false;
      const normalizedOwner = ownerName.trim().toLowerCase().normalize('NFC');
      const normalizedUser = userFullName.trim().toLowerCase().normalize('NFC');
      return normalizedOwner === normalizedUser || normalizedOwner.includes(normalizedUser) || normalizedUser.includes(normalizedOwner);
    };

    const filterPrivateData = (obj: any): any => {
      if (isAdmin || !obj) return obj;
      
      const checkOwnership = (item: any, contextKey?: string): boolean => {
          if (!item || typeof item !== 'object') return true;
          
          // Rules for what a TVBH can see:
          // 1. Kho xe: Rảnh thì thấy hết, Đã ghép/giữ thì phải là chủ
          if (contextKey === 'khoxe' || (item.vin && !item.so_don_hang)) {
              if (item.trang_thai === 'Chưa ghép') return true;
              return isOwner(item.nguoi_giu_xe) || isOwner(item.username_giu_xe);
          }
          
          // 2. Thông tin xe (Master data): Công khai
          if (contextKey === 'thongtinxe') return true;
          
          // 3. Đơn hàng/Hóa đơn/Yêu cầu: Phải là chủ
          const ownerFields = ['tvbh', 'ten_tu_van_ban_hang', 'nguoi_yc', 'tvbh_name', 'tu_van_ban_hang', 'leader', 'username', 'actor_name', 'recipient'];
          for (const field of ownerFields) {
            if (item[field] && isOwner(item[field])) return true;
          }
          
          return false;
      };

      const processed = { ...obj };
      for (const key in processed) {
        if (Array.isArray(processed[key])) {
          processed[key] = processed[key].filter((item: any) => checkOwnership(item, key));
        } else if (typeof processed[key] === 'object' && processed[key] !== null) {
          if (!checkOwnership(processed[key], key)) {
            processed[key] = null; // Ẩn hoàn toàn nếu không thuộc quyền hạn
          }
        }
      }
      return processed;
    };

    const searchTerms = extractSearchTerms(lastUserMessage);
    if (!isAdmin && userFullName && !searchTerms.includes(userFullName)) {
      searchTerms.push(userFullName);
    }

    const promises: Promise<any>[] = [
      supabaseAdmin.rpc('ai_full_context').then(r => filterPrivateData(r.data)).catch(() => null),
      supabaseAdmin.from('ai_knowledge_base')
        .select('content')
        .neq('status', 'PENDING') // LỌC QUA TRẠM KIỂM DUYỆT (Chỉ lấy bài học đã Duyệt)
        .or(isAdmin ? `visibility.eq.public,visibility.eq.admin` : `visibility.eq.public`) // LỌC KIẾN THỨC THEO QUYỀN
        .order('importance', { ascending: false })
        .then(r => r.data)
        .catch(() => []),
    ];
    
    for (const term of searchTerms.slice(0, 4)) {
      if (term && term.length >= 2) {
        promises.push(
          supabaseAdmin.rpc('ai_global_search', { search_term: term })
            .then(r => filterPrivateData(r.data))
            .catch(() => null)
        );
      }
    }

    const [fullContext, dbLessons, ...searchResults] = await Promise.all(promises);
    
    // --- BỔ SUNG: TRUY VẤN VECTƠ (Vector RAG) ---
    let vectorLessons: any[] = [];
    if (GEMINI_KEYS.length > 0) {
      const embedding = await getGeminiEmbedding(lastUserMessage, GEMINI_KEYS);
      if (embedding) {
        vectorLessons = await searchVectorKnowledge(supabaseAdmin, embedding, isAdmin);
      }
    }
    // -------------------------------------------
    
    // --- FALLBACK LOGIC ---
    let detectiveData = searchResults.filter(Boolean);
    const totalHits = detectiveData.reduce((acc, curr) => {
      const hits = (curr.donhang?.length || 0) + (curr.khoxe?.length || 0) + (curr.yeucauxhd?.length || 0);
      return acc + hits;
    }, 0);

    // Nếu RPC trả về rỗng hoặc lỗi, thực hiện tìm kiếm thủ công (Brute force)
    if (totalHits === 0 && searchTerms.length > 0) {
      console.log("[AI-CHAT] RPC returned no hits (or filtered). Falling back to manual table search...");
      const fallbackPromises = [];
      for (const term of searchTerms.slice(0, 2)) {
        fallbackPromises.push(
          supabaseAdmin.from('khoxe').select('*').ilike('vin', `%${term}%`).limit(10).then(r => ({ khoxe: r.data || [] })),
          supabaseAdmin.from('donhang').select('*').ilike('vin', `%${term}%`).limit(10).then(r => ({ donhang: r.data || [] })),
          supabaseAdmin.from('donhang').select('*').ilike('so_don_hang', `%${term}%`).limit(10).then(r => ({ donhang: r.data || [] })),
          supabaseAdmin.from('donhang').select('*').ilike('ten_khach_hang', `%${term}%`).limit(10).then(r => ({ donhang: r.data || [] })),
          supabaseAdmin.from('yeucauxhd').select('*').ilike('so_don_hang', `%${term}%`).limit(10).then(r => ({ yeucauxhd: r.data || [] }))
        );
      }
      const fallbacks = (await Promise.all(fallbackPromises)).map(filterPrivateData);
      detectiveData = [
        ...detectiveData,
        ...fallbacks.filter(f => (f.khoxe?.length || 0) > 0 || (f.donhang?.length || 0) > 0 || (f.yeucauxhd?.length || 0) > 0)
      ];
    }
    // -----------------------
    const lessonsList = [
      ...dbLessons?.map((l: any, i: number) => `[Keyword Match] ${l.content}`) || [],
      ...vectorLessons.map((l: any) => `[Vector Match] ${l.content}`)
    ].join('\n');

    const ROLE_RULES = isAdmin 
      ? `## QUYỀN HẠN: ADMIN (TOÀN QUYỀN)
- Bạn được phép xem toàn bộ dữ liệu hệ thống. Hãy chủ động phân tích và báo cáo số liệu tổng hợp.`
      : `## PHÂN QUYỀN & BẢO MẬT (SECURITY PROTOCOL):
Người dùng hiện tại: **${userFullName}** | Vai trò: **${userRole}**

1. **QUYỀN TVBH (Tư vấn bán hàng)**:
   - **Được xem**: Kho xe rảnh (\`trang_thai = 'Chưa ghép'\`), các đơn hàng/yêu cầu do CHÍNH MÌNH QUẢN LÝ (tên "${userFullName}").
   - **CẤM TUYỆT ĐỐI**: Không được xem dữ liệu (khách hàng, trạng thái, VIN...) của bất kỳ TVBH nào khác.
   - **HÀNH ĐỘNG**: Nếu người dùng hỏi về thông tin của người khác, bạn phải từ chối lịch sự: "Dạ, em chỉ có quyền hỗ trợ tra cứu dữ liệu cá nhân của anh/chị thôi ạ". KHÔNG GIẢI THÍCH CHI TIẾT những gì bạn không thấy.
2. **DỮ LIỆU ĐÃ ĐƯỢC LỌC**: Hệ thống đã tự động ẩn đi các đơn hàng không thuộc quyền hạn của bạn. Nếu bạn thấy danh sách trống, nghĩa là không tìm thấy đơn hàng nào của bạn khớp với từ khóa.`;

    const SYSTEM_PROMPT = `
MỤC TIÊU: Bạn là một "Người cộng sự đắc lực" của VinFast.
- Xưng "em", gọi người dùng là "anh" hoặc "chị" dựa trên tên "${userFullName}".
- TUYỆT ĐỐI TUÂN THỦ PHÂN QUYỀN: Không bao giờ tiết lộ thông tin của TVBH khác.

${ROLE_RULES}

## CORE DATA FOCUS:
Bạn am tường 3 bảng: khoxe (Kho xe), donhang (Đơn hàng), yeucauxhd (Hóa đơn).
- "Xe rảnh" = Có trong \`khoxe\` với \`trang_thai = 'Chưa ghép'\`.

## QUY TẮC SUY NGHĨ (THINKING PROCESS):
- TRƯỚC KHI TRẢ LỜI, bạn phải luôn thực hiện suy nghĩ logic bên trong thẻ <thought>.
- Trong thẻ <thought>, hãy liệt kê các bước: 
  1. Phân tích ý định người dùng.
  2. Kiểm tra các dữ liệu [DETECTIVE DATA] và [DỮ LIỆU REALTIME] có sẵn.
  3. Quyết định xem có cần gọi Tool không.
  4. Lập kế hoạch trả lời dựa trên phân quyền TVBH.
- Sau thẻ </thought>, hãy đưa ra câu trả lời cuối cùng cho người dùng.
- Ví dụ:
  <thought>Người dùng muốn hỏi về lỗi đơn hàng. Tìm thấy 1 đơn hàng SO123 của họ bị thiếu VIN. Cần nhắc họ bổ sung.</thought>
  Chào anh, em thấy đơn hàng SO123 của mình đang thiếu số VIN ạ...

## QUY TẮC BẢO MẬT TỐI THƯỢNG:
- Nếu dữ liệu [DETECTIVE DATA] trống cho một yêu cầu cụ thể, hãy thông báo lịch sự là không tìm thấy dữ liệu CHÍNH CHỦ.
- Không bao giờ nói "Đơn hàng này của ông A nên tôi không cho xem". Chỉ cần nói "Em không tìm thấy đơn hàng này trong danh sách quản lý của anh/chị ạ".

## [DỮ LIỆU REALTIME]:
${JSON.stringify(fullContext || {})}

## [KẾT QUẢ TRUY VẾT THÁM TỬ]:
${JSON.stringify(detectiveData)}

## [KIẾN THỨC NGHIỆP VỤ]:
${lessonsList}
`;

    const AI_PROVIDERS = [
      // ── TIER 1: GOOGLE FLASH (✅ hoạt động tất cả 4 keys) ──
      { type: "google", model: "gemini-3.1-flash-lite-preview" },
      { type: "google", model: "gemini-3-flash-preview" },
      { type: "google", model: "gemini-2.5-flash" },
      { type: "google", model: "gemini-2.5-flash-lite" },

      // ── TIER 2: EXTERNAL (✅ luôn hoạt động) ──
      { type: "github", apiKey: GITHUB_TOKEN, model: "gpt-4o" },
      { type: "groq", apiKey: GROQ_KEY, model: "llama-3.3-70b-versatile" },
      { type: "groq", apiKey: GROQ_KEY, model: "llama-3.1-8b-instant" },
      { type: "groq", apiKey: GROQ_KEY, model: "meta-llama/llama-4-scout-17b-16e-instruct" },
      { type: "groq", apiKey: GROQ_KEY, model: "qwen/qwen3-32b" },

      // ── TIER 3: GOOGLE GEMMA (✅ hoạt động tất cả 4 keys, ít bị quota) ──
      { type: "google", model: "gemma-4-31b-it" },
      { type: "google", model: "gemma-4-26b-a4b-it" },
      { type: "google", model: "gemma-3-27b-it" },
      { type: "google", model: "gemma-3-12b-it" },
      { type: "google", model: "gemma-3n-e4b-it" },
      { type: "google", model: "gemma-3-4b-it" },
      { type: "google", model: "gemma-3-1b-it" },

      // ── TIER 4: EXTERNAL FALLBACK ──
      { type: "openrouter", apiKey: OPENROUTER_KEY, model: "deepseek/deepseek-chat:free" },
      { type: "github", apiKey: GITHUB_TOKEN, model: "gpt-4o-mini" },
      { type: "groq", apiKey: GROQ_KEY, model: "openai/gpt-oss-120b" },
      { type: "groq", apiKey: GROQ_KEY, model: "openai/gpt-oss-20b" },
      { type: "groq", apiKey: GROQ_KEY, model: "groq/compound" },
      { type: "groq", apiKey: GROQ_KEY, model: "groq/compound-mini" },

      // ── TIER 5: GOOGLE PRO & LEGACY (hay hết quota, tự phục hồi hàng ngày) ──
      { type: "google", model: "gemini-3-pro-preview" },
      { type: "google", model: "gemini-3.1-pro-preview" },
      { type: "google", model: "gemini-2.5-pro" },
      { type: "google", model: "gemini-2.0-flash" },
      { type: "google", model: "gemini-2.0-flash-lite" },
      { type: "google", model: "gemini-flash-latest" },
      { type: "google", model: "gemini-flash-lite-latest" },
      { type: "google", model: "gemini-pro-latest" },
    ];
 
    // Diagnostic: Log trạng thái các API key
    const keyStatus = {
      GEMINI_KEYS: GEMINI_KEYS.length > 0 ? `${GEMINI_KEYS.length} key(s)` : '❌ MISSING',
      GROQ_KEY: GROQ_KEY ? '✅' : '❌ MISSING',
      OPENROUTER_KEY: OPENROUTER_KEY ? '✅' : '❌ MISSING',
      GITHUB_TOKEN: GITHUB_TOKEN ? '✅' : '❌ MISSING',
    };
    console.log(`--- AI Brain v2.1 | User: ${contextData?.userContext?.name || 'Admin'} | Terms: ${searchTerms.join(', ')} | Detective hits: ${detectiveData.length} ---`);
    console.log(`🔑 API Keys Status:`, JSON.stringify(keyStatus));
 
    let lastError = "";
    const failedProviders: string[] = [];
    
    // Utility to sleep between retries if needed
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
 
    // --- LƯU LỊCH SỬ CHAT (PERSISTENCE) ---
    const username = contextData?.userContext?.username || "Anonymous";
    
    const saveToHistory = async (role: string, content: string) => {
      try {
        const { data: historyRow } = await supabaseAdmin
          .from('ai_chat_history')
          .select('messages')
          .eq('username', username)
          .maybeSingle();
        
        const newHistory = [
          ...(historyRow?.messages || []),
          { role, content, time: new Date().toISOString() }
        ].slice(-50);
 
        await supabaseAdmin
          .from('ai_chat_history')
          .upsert({ username, messages: newHistory, updated_at: new Date().toISOString() });
      } catch (dbErr) {
        console.error("⚠️ Failed to save history:", dbErr.message);
      }
    };
 
    // Lưu tin nhắn User trước
    await saveToHistory('user', body.messages[body.messages.length - 1].content);
    // -------------------------------------
 
    // Track các key đã bị quota exhausted để skip nhanh
    const exhaustedKeys = new Set<string>();

    for (const provider of AI_PROVIDERS) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout (system prompt lớn cần thời gian)
 
      try {
        // ... (rest of the provider logic)
        // Đối với Google, chúng ta sẽ thử TẤT CẢ các key có sẵn nếu bị giới hạn dung lượng
        if (provider.type === "google") {
          const keys = GEMINI_KEYS.length > 0 ? GEMINI_KEYS : [];
          if (keys.length === 0) continue;
 
          // Lọc bỏ key đã bị quota exhausted, rồi trộn ngẫu nhiên
          const availableKeys = keys.filter(k => !exhaustedKeys.has(k));
          if (availableKeys.length === 0) {
            console.warn(`⏭️ All keys exhausted, skipping Google/${provider.model}`);
            failedProviders.push(`Google/${provider.model} (ALL KEYS EXHAUSTED)`);
            continue;
          }
          const shuffledKeys = [...availableKeys].sort(() => Math.random() - 0.5);
 
          for (const key of shuffledKeys) {
            try {
              // Format history cho Gemini
              const geminiContents = messages.map((m: any) => ({
                role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
                parts: [{ text: m.content || "" }]
              }));
 
              // --- HỖ TRỢ TOOL USE & ITERATIVE RESPONSE ---
              let toolChoices = AI_TOOLS;
              let currentContents = [...geminiContents];
              let finalResponse = null;
 
              for (let step = 0; step < 5; step++) { // Max 5 steps for tools
                console.log(`[AI-CHAT] Call Gemini (Step ${step + 1})...`);
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent?key=${key}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                    contents: currentContents,
                    tools: toolChoices
                  }),
                  signal: controller.signal
                });
 
                const data = await res.json();
                if (!res.ok) {
                    const errorReason = data?.error?.details?.[0]?.reason || "";
                    const errorCode = data?.error?.code || res.status;
                    if (errorCode === 429 || errorReason === "MODEL_CAPACITY_EXHAUSTED") {
                        console.warn(`⚠️ Key ${key.substring(0, 5)} quota exhausted for ${provider.model}. Marking key...`);
                        exhaustedKeys.add(key); // Đánh dấu key đã hết quota
                        throw new Error("RETRY_WITH_NEXT_KEY");
                    }
                    if (errorCode === 503) {
                        console.warn(`⚠️ Model ${provider.model} overloaded. Trying next key...`);
                        throw new Error("RETRY_WITH_NEXT_KEY");
                    }
                    throw new Error(JSON.stringify(data?.error || data));
                }
 
                const candidate = data.candidates?.[0];
                const parts = candidate?.content?.parts || [];
                const toolCalls = parts.filter((p: any) => p.functionCall);
                const textPart = parts.find((p: any) => p.text);
 
                if (toolCalls.length > 0) {
                  // Lưu tool call vào history để AI biết nó đã yêu cầu gì
                  currentContents.push(candidate.content);
                  
                  const toolResults = [];
                  for (const tc of toolCalls) {
                    const { name, args } = tc.functionCall;
                    console.log(`[AI-CHAT] Executing tool: ${name}`, args);
                    
                    let result;
                    if (name === "get_car_details") {
                      const { data } = await supabaseAdmin.rpc('get_car_details', { p_vin: args.vin });
                      result = filterPrivateData(data);
                    } else if (name === "get_order_details") {
                      const { data } = await supabaseAdmin.rpc('get_order_details', { p_order_no: args.order_no });
                      result = filterPrivateData(data);
                    }
 
                    toolResults.push({
                      functionResponse: {
                        name: name,
                        response: { content: result || "Không tìm thấy dữ liệu." }
                      }
                    });
                  }
                  
                  currentContents.push({ role: "function", parts: toolResults });
                  continue; // Loop again with tool results
                } else if (textPart?.text) {
                  finalResponse = textPart.text;
                  break;
                } else {
                  break;
                }
              }

              if (finalResponse) {
                clearTimeout(timeoutId);
                await saveToHistory('assistant', finalResponse);
                return new Response(JSON.stringify({ content: finalResponse, model: provider.model, provider: "google" }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
              }
            } catch (innerErr: any) {
              if (innerErr.message === "RETRY_WITH_NEXT_KEY") continue;
              lastError = `Google/${provider.model}: ${innerErr.message}`;
              console.error(`❌ Google Key ${key.substring(0, 5)} failed:`, innerErr.message);
            }
          }
          // Nếu tất cả các key của model Google này đều thất bại, chuyển sang Provider tiếp theo
          failedProviders.push(`Google/${provider.model}`);
          continue;
        }

        // --- CÁC PROVIDER KHÁC ---
        if (!provider.apiKey) {
          console.warn(`⏭️ Skipping ${provider.type}/${provider.model} - API key not configured`);
          failedProviders.push(`${provider.type}/${provider.model} (NO KEY)`);
          continue;
        }

        if (provider.type === "deepseek") {
          const res = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${provider.apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: provider.model,
              messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages]
            }),
            signal: controller.signal
          });
          const data = await res.json();
          if (!res.ok) throw new Error(JSON.stringify(data?.error || data));
          if (data.choices?.[0]?.message?.content) {
            clearTimeout(timeoutId);
            const content = data.choices[0].message.content;
            await saveToHistory('assistant', content);
            return new Response(JSON.stringify({ content, model: provider.model, provider: "deepseek" }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }

        if (provider.type === "openrouter") {
          const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${provider.apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: provider.model,
              messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages]
            }),
            signal: controller.signal
          });
          const data = await res.json();
          if (!res.ok) throw new Error(JSON.stringify(data?.error || data));
          if (data.choices?.[0]?.message?.content) {
            clearTimeout(timeoutId);
            const content = data.choices[0].message.content;
            await saveToHistory('assistant', content);
            return new Response(JSON.stringify({ content, model: provider.model, provider: "openrouter" }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }

        if (provider.type === "github" || provider.type === "groq") {
          const url = provider.type === "github" 
            ? "https://models.inference.ai.azure.com/chat/completions" 
            : "https://api.groq.com/openai/v1/chat/completions";
          const res = await fetch(url, {
            method: "POST",
            headers: { "Authorization": `Bearer ${provider.apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: provider.model,
              messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages]
            }),
            signal: controller.signal
          });
          const data = await res.json();
          if (!res.ok) throw new Error(JSON.stringify(data?.error || data));
          if (data.choices?.[0]?.message?.content) {
            clearTimeout(timeoutId);
            const content = data.choices[0].message.content;
            await saveToHistory('assistant', content);
            return new Response(JSON.stringify({ content, model: provider.model, provider: provider.type }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }

      } catch (err: any) {
        lastError = `${provider.type}/${provider.model}: ${err.message}`;
        failedProviders.push(`${provider.type}/${provider.model}`);
        console.error(`❌ Provider ${provider.type} (${provider.model}) failed:`, err.message);
      } finally {
        clearTimeout(timeoutId);
      }
    }

    console.error(`⛔ ALL PROVIDERS FAILED! Failed: [${failedProviders.join(', ')}] | Last error: ${lastError}`);
    console.error(`🔑 Key status reminder:`, JSON.stringify(keyStatus));
    throw new Error(`Dạ, hiện tại tất cả các hệ thống AI đều đang quá tải hoặc lỗi xác thực. Vui lòng thử lại sau 1-2 phút. (${failedProviders.length} providers failed)`);

  } catch (error: any) {
    console.error("🔥 CRITICAL ERROR in ai-chat function:", error);
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 200, // Return 200 with error field to avoid browser 500 block and see the message
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})
