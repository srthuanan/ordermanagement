-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add embedding column to ai_knowledge_base
-- text-embedding-004 uses 768 dimensions
ALTER TABLE public.ai_knowledge_base 
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- 3. Create RPC for vector similarity search
CREATE OR REPLACE FUNCTION public.match_ai_knowledge (
  query_embedding vector(768),
  match_threshold float,
  match_count int
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
  WHERE 1 - (k.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- 4. Create RPC for updating embeddings (utility function)
CREATE OR REPLACE FUNCTION public.update_ai_knowledge_embedding(
  p_id UUID,
  p_embedding vector(768)
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.ai_knowledge_base
  SET embedding = p_embedding
  WHERE id = p_id;
END;
$$;

-- 5. Helper function for Tool: get_car_details
CREATE OR REPLACE FUNCTION public.get_car_details(p_vin TEXT)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    res JSON;
BEGIN
    SELECT json_build_object(
        'khoxe', (SELECT row_to_json(kx) FROM public.khoxe kx WHERE kx.vin ILIKE '%' || p_vin || '%' LIMIT 1),
        'donhang', (SELECT row_to_json(dh) FROM public.donhang dh WHERE dh.vin ILIKE '%' || p_vin || '%' LIMIT 1),
        'thongtinxe', (SELECT row_to_json(tx) FROM public.thongtinxe tx WHERE tx.vin ILIKE '%' || p_vin || '%' LIMIT 1)
    ) INTO res;
    RETURN res;
END;
$$;

-- 6. Helper function for Tool: get_order_details
CREATE OR REPLACE FUNCTION public.get_order_details(p_order_no TEXT)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    res JSON;
BEGIN
    SELECT json_build_object(
        'donhang', (SELECT row_to_json(dh) FROM public.donhang dh WHERE dh.so_don_hang ILIKE '%' || p_order_no || '%' LIMIT 1),
        'yeucauxhd', (SELECT row_to_json(xhd) FROM public.yeucauxhd xhd WHERE xhd.so_don_hang ILIKE '%' || p_order_no || '%' LIMIT 1),
        'yeucauvc', (SELECT row_to_json(vc) FROM public.yeucauvc vc WHERE vc.so_don_hang ILIKE '%' || p_order_no || '%' LIMIT 1)
    ) INTO res;
    RETURN res;
END;
$$;

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION public.match_ai_knowledge TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_ai_knowledge_embedding TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_car_details TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_order_details TO anon, authenticated, service_role;
