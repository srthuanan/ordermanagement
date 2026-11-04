-- Migration: Tạo bảng staff_activity_logs lưu trữ lịch sử vị trí, thiết bị và các thao tác của TVBH
-- Created at: 2026-10-17

CREATE TABLE IF NOT EXISTS public.staff_activity_logs (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    full_name TEXT,
    user_email TEXT,
    action_type TEXT NOT NULL,                -- 'ENTER_STOCK', 'HOLD_CAR', 'UNHOLD_CAR', 'VIEW_CAR', 'JOIN_QUEUE', 'LEAVE_QUEUE', 'REQUEST_INVOICE'
    action_title TEXT NOT NULL,               -- 'Vào xem kho xe', 'Giữ xe VIN ...', 'Xem chi tiết xe'
    action_details JSONB DEFAULT '{}'::jsonb, -- Dữ liệu chi tiết hành động
    target_vin TEXT,                          -- Số VIN nếu có
    
    -- Tọa độ và độ chính xác GPS
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    accuracy_meters NUMERIC(6, 1),           -- Sai số mét của GPS (VD: 4.5m)
    formatted_address TEXT,                  -- Địa chỉ chi tiết tiếng Việt (số nhà, ngõ, đường, phường, quận/huyện, tỉnh/TP)
    google_maps_url TEXT,                    -- Link trực tiếp Google Maps vệ tinh
    
    -- Thiết bị và hạ tầng mạng
    device_info JSONB DEFAULT '{}'::jsonb,   -- Tên máy, OS, trình duyệt, độ phân giải
    ip_address TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chỉ mục tăng tốc độ truy vấn cho Admin Dashboard
CREATE INDEX IF NOT EXISTS idx_staff_activity_username ON public.staff_activity_logs(username, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_activity_created_at ON public.staff_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_activity_action ON public.staff_activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_staff_activity_vin ON public.staff_activity_logs(target_vin);

-- Kích hoạt Row Level Security (RLS)
ALTER TABLE public.staff_activity_logs ENABLE ROW LEVEL SECURITY;

-- Cho phép tất cả người dùng (TVBH & Quản lý) được ghi log hoạt động
CREATE POLICY "Allow insert staff_activity_logs" 
    ON public.staff_activity_logs 
    FOR INSERT 
    TO authenticated, anon 
    WITH CHECK (true);

-- Cho phép đọc log để hiển thị trên màn hình Admin
CREATE POLICY "Allow read staff_activity_logs" 
    ON public.staff_activity_logs 
    FOR SELECT 
    TO authenticated, anon 
    USING (true);

-- Kích hoạt Realtime để Admin nhận thông báo hoạt động tức thì
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_activity_logs;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Bỏ qua nếu bảng đã có trong publication
END $$;
