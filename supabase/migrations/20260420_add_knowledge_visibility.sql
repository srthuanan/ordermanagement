-- Migration: Thêm phân quyền cho Kho kiến thức AI
-- Ngày: 2026-04-20

-- 1. Thêm cột visibility vào bảng ai_knowledge_base
ALTER TABLE public.ai_knowledge_base 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'admin'));

-- 2. Cập nhật các kiến thức nghiệp vụ nhạy cảm (Audit rules) thành 'admin'
UPDATE public.ai_knowledge_base 
SET visibility = 'admin' 
WHERE category IN ('SOURCE_OF_TRUTH', 'VIN_ISOLATION', 'INTERNAL_LOGIC', 'AUDIT_RULES');

-- 3. Cập nhật các bài học mặc định ban đầu sang 'admin' nếu chúng là quy tắc kiểm tra
UPDATE public.ai_knowledge_base 
SET visibility = 'admin' 
WHERE lesson_key IN ('PAGE_1_IS_GOLD', 'VIN_ISOLATION', 'BANK_NOTICE_REQUIRED', 'NAME_MATCH_LOGIC');

-- 4. Cập nhật hàm match_ai_knowledge để hỗ trợ phân quyền
CREATE OR REPLACE FUNCTION public.match_ai_knowledge (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_is_admin BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  content TEXT,
  importance INTEGER,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.id,
    k.category,
    k.content,
    k.importance,
    1 - (k.embedding <=> query_embedding) AS similarity
  FROM public.ai_knowledge_base k
  WHERE (1 - (k.embedding <=> query_embedding) > match_threshold)
    AND (p_is_admin OR k.visibility = 'public') -- Nếu không phải Admin thì chỉ lấy 'public'
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

COMMENT ON COLUMN public.ai_knowledge_base.visibility IS 'public: TVBH có thể thấy | admin: Chỉ Admin mới thấy';
