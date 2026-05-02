require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jwvgxqrkjlbewvpkvucj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching raw knowledge from AI_KNOWLEDGE_BASE...');
  const { data: allData, error } = await supabase
    .from('ai_knowledge_base')
    .select('*');
  
  if (error) {
    console.error('Fetch error:', error);
    return;
  }
  
  if (!allData || allData.length === 0) {
      console.log('No data to consolidate.');
      return;
  }

  // Chia nhỏ xử lý theo TỪNG NHÓM (Category) để tránh lỗi quá tải 8000 tokens
  const categories = [...new Set(allData.map(d => d.category))];
  console.log(`Found ${allData.length} policies across ${categories.length} categories.`);

  for (const cat of categories) {
    const rawData = allData.filter(d => d.category === cat);
    
    console.log(`\n--- 🧹 Chạy dọn dẹp nhóm [${cat}] với ${rawData.length} bản ghi... ---`);
    
    const promptText = `
Bạn là AI Thẩm Định Tri Thức (Knowledge Auditor) xuất sắc. Nhiệm vụ tối thượng của bạn là: CHECK KỸ, DỌN RÁC, XÓA TRÙNG LẶP và GỘP GỌN các mảnh kiến thức thuộc nhóm ${cat} dưới đây.

QUY TẮC XỬ LÝ & ĐỊNH DẠNG:
1. SO SÁNH CHÉO: So sánh ý nghĩa (semantic) của TỪNG bản ghi.
2. XÓA TRÙNG LẶP HOÀN TOÀN: Xóa bỏ các bản sao trùng nội dung.
3. LUÔN SỬ DỤNG BẢNG (MARKDOWN TABLE) nếu dữ liệu có tính liệt kê nhiều dòng sản phẩm, dòng xe, thông số hoặc mức giá.
4. LOẠI BỎ RÁC: Dùng Bullet Points (gạch đầu dòng) chỉ khi không thể dùng bảng. Nội dung phải cực kỳ KHÚC CHIẾT, RÕ RÀNG.

Đầu ra bắt buộc là 1 MẢNG JSON, trường \`content\` LÀ VĂN BẢN (Text) FORMAT BẰNG MARKDOWN SIÊU GỌN.
Ví dụ:
{
  "data": [
    {
      "category": "${cat}",
      "lesson_key": "KNOWLEDGE_${cat}_GOP",
      "content": "### Tổng hợp kiến thức...\\n| Dòng xe | Ưu đãi |\\n|---|---|\\n| VF3 | ... |",
      "importance": 5,
      "status": "ACTIVE",
      "visibility": "public"
    }
  ]
}
Chỉ trả về Object JSON chứa "data". Tuyệt đối không sinh thêm dấu markdown bên ngoài JSON.

Dữ liệu đầu vào:
${JSON.stringify(rawData.map(d => ({ category: d.category, content: d.content })), null, 2)}
`;

    try {
        const githubKey = process.env.VITE_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
        const res = await fetch('https://models.inference.ai.azure.com/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${githubKey}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: promptText }],
            response_format: { type: 'json_object' }
          })
        });
        
        const aiData = await res.json();
        if (aiData.error) {
          console.error(`[${cat}] API error:`, aiData.error.message || aiData.error);
          continue;
        }
        
        let responseText = aiData.choices[0].message.content;
        const consolidatedWrapper = JSON.parse(responseText);
        const consolidated = consolidatedWrapper.data || consolidatedWrapper.results || consolidatedWrapper.items || Object.values(consolidatedWrapper)[0];
        
        console.log(`[${cat}] Ép thành công còn ${consolidated.length} bài học gốc.`);
        
        const idsToDelete = rawData.map(d => d.id);
        const chunkSize = 20;
        for (let i = 0; i < idsToDelete.length; i += chunkSize) {
            const chunk = idsToDelete.slice(i, i + chunkSize);
            await supabase.from('ai_knowledge_base').delete().in('id', chunk);
        }
        
        for (const item of consolidated) {
          await supabase.from('ai_knowledge_base').insert({
              category: item.category || cat,
              lesson_key: item.lesson_key,
              content: item.content,
              importance: item.importance || 5,
              updated_by: 'AI_CONSOLIDATOR',
              visibility: item.visibility || 'public',
              status: item.status || 'ACTIVE'
          });
        }
    } catch (e) {
        console.error(`[${cat}] Script failed for this chunk:`, e.message);
    }
  }
  console.log('\n✅ Done! Database is fully clean and consolidated.');
}
run();
