-- Cấp độ 2: Hệ thống Trí nhớ dài hạn cho AI (RAG Infrastructure)
-- Tạo bảng lưu trữ các bài học kinh nghiệm và quy tắc nghiệp vụ động

CREATE TABLE IF NOT EXISTS public.ai_knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT NOT NULL, -- Ví dụ: 'VIN', 'PAYMENT', 'IDENTITY', 'VF3', 'VF8'...
    lesson_key TEXT UNIQUE NOT NULL, -- Mã định danh bài học
    content TEXT NOT NULL, -- Nội dung bài học/quy tắc
    importance INTEGER DEFAULT 1, -- Độ ưu tiên (1-5)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT
);

-- Nạp một số bài học cơ bản ban đầu dựa trên các yêu cầu của bạn
INSERT INTO public.ai_knowledge_base (category, lesson_key, content, importance)
VALUES 
('SOURCE_OF_TRUTH', 'PAGE_1_IS_GOLD', 'Luôn ưu tiên dữ liệu tại Trang 1 (Phiếu đề nghị xuất hồ sơ). Nếu các trang sau có mâu thuẫn, mặc định Trang 1 là đúng.', 5),
('VIN', 'VIN_ISOLATION', 'Chỉ được phép trích xuất VIN từ Phiếu đề nghị. Không được lấy VIN từ các ảnh chụp thực tế hoặc hợp đồng khác nếu Trang 1 không ghi.', 5),
('PAYMENT', 'BANK_NOTICE_REQUIRED', 'Nếu thanh toán là Trả góp, bắt buộc phải thấy Thông báo cho vay hoặc Cam kết giải ngân của Ngân hàng. Thiếu thì báo lỗi ngay.', 4),
('IDENTITY', 'NAME_MATCH_LOGIC', 'Đối chiếu tên giữa CCCD, Hệ thống và Hợp đồng. Bỏ qua dấu tiếng Việt và hoa thường, chỉ báo lỗi nếu sai ký tự hoặc sai họ tên.', 4)
ON CONFLICT (lesson_key) DO UPDATE SET content = EXCLUDED.content;
