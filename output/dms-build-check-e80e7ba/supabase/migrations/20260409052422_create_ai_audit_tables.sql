-- TẠO BẢNG NHẬT KÝ KIỂM TOÁN AI
CREATE TABLE IF NOT EXISTS public.ai_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    order_id TEXT NOT NULL,
    document_type TEXT,
    raw_ai_data JSONB,
    audit_result JSONB,
    risk_score FLOAT DEFAULT 0,
    confidence_score FLOAT DEFAULT 0,
    human_verified BOOLEAN DEFAULT NULL,
    admin_notes TEXT
);

-- TẠO BẢNG CƠ SỞ TRI THỨC (DÙNG CHO FEW-SHOT LEARNING)
CREATE TABLE IF NOT EXISTS public.ai_knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    pattern_type TEXT, -- e.g. 'signature_location', 'stamp_pattern'
    sample_data JSONB,
    description TEXT,
    is_verified BOOLEAN DEFAULT TRUE
);

-- PHÂN QUYỀN TRUY CẬP
ALTER TABLE public.ai_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_knowledge_base ENABLE ROW LEVEL SECURITY;

-- Cho phép xem và thêm log (từ Edge Function và Admin)
CREATE POLICY "Allow all actions for authenticated users on ai_audit_logs" 
ON public.ai_audit_logs FOR ALL 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all actions for authenticated users on ai_knowledge_base" 
ON public.ai_knowledge_base FOR ALL 
USING (auth.role() = 'authenticated');
