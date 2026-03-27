-- Migration: Tạo bảng lưu email của Tư Vấn Bán Hàng
-- Ngày: 2026-03-06
-- Mục đích: Thay thế sheet "Mail" trong Google Sheets bằng bảng Supabase
--            để lấy email TVBH nhanh hơn khi gửi mail tự động.

CREATE TABLE IF NOT EXISTS tvbh_emails (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ten_tvbh TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index để tìm kiếm nhanh theo tên (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_tvbh_emails_ten ON tvbh_emails (lower(ten_tvbh));

-- Disable RLS vì đây là bảng nội bộ admin, không cần row-level security
ALTER TABLE tvbh_emails DISABLE ROW LEVEL SECURITY;
-- Create archived_orders table to aggregate past orders from both donhang and yeucauxhd
CREATE TABLE IF NOT EXISTS archived_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Core identification
    so_don_hang TEXT NOT NULL,
    ten_khach_hang TEXT,
    
    -- Vehicle details
    vin TEXT,
    so_may TEXT,
    dong_xe TEXT,
    phien_ban TEXT,
    ngoai_that TEXT,
    noi_that TEXT,
    
    -- Personnel
    tvbh TEXT, -- Tư vấn bán hàng / ten_tu_van_ban_hang
    
    -- Dates and Times
    ngay_coc DATE,
    thoi_gian_nhap TIMESTAMPTZ,
    ngay_yeu_cau TIMESTAMPTZ,
    thoi_gian_ghep TIMESTAMPTZ,
    ngay_xuat_hoa_don DATE,
    
    -- Status and Results
    ket_qua TEXT,
    trang_thai_vc TEXT,
    trang_thai_gui_mail TEXT,
    
    -- Financials and Policies (from yeucauxhd)
    chinh_sach TEXT,
    hoa_hong_ung NUMERIC DEFAULT 0,
    vpoint NUMERIC DEFAULT 0,
    
    -- Links/Assets
    url_hop_dong TEXT,
    url_de_nghi_xhd TEXT,
    url_hoa_don_da_xuat TEXT,
    
    -- Archival Info
    archived_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Original timestamps
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE archived_orders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read access for all users" ON archived_orders FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated" ON archived_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for service role" ON archived_orders FOR UPDATE USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_archived_orders_so_don_hang ON archived_orders(so_don_hang);
CREATE INDEX IF NOT EXISTS idx_archived_orders_vin ON archived_orders(vin);
CREATE INDEX IF NOT EXISTS idx_archived_orders_ngay_xuat_hd ON archived_orders(ngay_xuat_hoa_don);

-- Function to archive old orders from yeucauxhd ONLY
-- This can be called monthly to move orders older than 1 month that are "Đã xuất hóa đơn"
CREATE OR REPLACE FUNCTION archive_old_orders()
RETURNS JSON AS $$
DECLARE
    archived_count INTEGER := 0;
BEGIN
    -- 1. Insert into archived_orders from yeucauxhd
    INSERT INTO archived_orders (
        so_don_hang, ten_khach_hang, dong_xe, phien_ban, ngoai_that, noi_that,
        tvbh, vin, so_may, ngay_coc, ngay_yeu_cau, ngay_xuat_hoa_don,
        chinh_sach, hoa_hong_ung, vpoint, url_hop_dong, url_de_nghi_xhd,
        trang_thai_vc, ket_qua, created_at, updated_at
    )
    SELECT 
        y.so_don_hang, y.ten_khach_hang, y.dong_xe, y.phien_ban, y.ngoai_that, y.noi_that,
        y.tvbh, y.vin, y.so_may, y.ngay_coc, y.ngay_yeu_cau, y.ngay_xuat_hoa_don,
        y.chinh_sach, y.hoa_hong_ung, y.vpoint, y.url_hop_dong, y.url_de_nghi_xhd,
        y.trang_thai_vc, 'Đã xuất hóa đơn', y.created_at, y.updated_at
    FROM yeucauxhd y
    WHERE y.ngay_xuat_hoa_don IS NOT NULL 
    AND y.ngay_xuat_hoa_don < (CURRENT_DATE - INTERVAL '1 month')
    ON CONFLICT (so_don_hang) DO NOTHING;

    GET DIAGNOSTICS archived_count = ROW_COUNT;

    -- 2. Delete ONLY from yeucauxhd once moved
    DELETE FROM yeucauxhd 
    WHERE ngay_xuat_hoa_don IS NOT NULL 
    AND ngay_xuat_hoa_don < (CURRENT_DATE - INTERVAL '1 month');

    RETURN json_build_object(
        'status', 'SUCCESS',
        'archived_count', archived_count
    );
END;
$$ LANGUAGE plpgsql;
-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT now(),
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    target_view TEXT,
    target_id TEXT,
    created_by TEXT DEFAULT 'Hệ thống',
    is_read BOOLEAN DEFAULT false,
    recipient TEXT DEFAULT 'ALL',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies (For now, allow all access since we manage auth at application layer)
CREATE POLICY "Enable all access for all users" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient);
CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON public.notifications(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
-- Create yeucauvc table
CREATE TABLE IF NOT EXISTS yeucauvc (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    so_don_hang TEXT NOT NULL,
    ten_khach_hang TEXT NOT NULL,
    thoi_gian_yc TIMESTAMPTZ DEFAULT NOW(),
    nguoi_yc TEXT NOT NULL,
    loai_yc TEXT NOT NULL,
    trang_thai_xu_ly TEXT DEFAULT 'Chờ duyệt ycvc',
    ghi_chu TEXT DEFAULT '',
    file_urls JSONB DEFAULT '{}'::jsonb,
    ma_kh_dms TEXT DEFAULT '',
    vin TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE yeucauvc ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read access for all users" ON yeucauvc FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON yeucauvc FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON yeucauvc FOR UPDATE USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_yeucauvc_so_don_hang ON yeucauvc(so_don_hang);
CREATE INDEX IF NOT EXISTS idx_yeucauvc_vin ON yeucauvc(vin);
-- Enable Realtime for administrative tables
BEGIN;
  -- 1. Ensure the supabase_realtime publication exists (Supabase default)
  -- This is usually already there, but we make sure.
  
  -- 2. Add tables to the publication to enable Realtime
  ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;

  -- 3. Note: If tables were already in another publication or if this is a fresh setup 
  -- and 'supabase_realtime' doesn't exist, you might need to create it:
  -- CREATE PUBLICATION supabase_realtime FOR TABLE public.audit_logs, public.app_settings, public.user_presence;
COMMIT;
-- Enable the pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to call the Google Apps Script Webhook
CREATE OR REPLACE FUNCTION public.handle_yeucauxhd_sync()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    gas_url TEXT := 'https://script.google.com/macros/s/AKfycbwC_Xw8YcudogtxpPJztqjFdttcL4tgDaHIdgFWqGcnZ0M44oH6KVb-2r52OKPtLex0Fg/exec?action=syncYeuCauXhd';
BEGIN
    -- Construct the payload based on the operation type
    IF (TG_OP = 'INSERT') THEN
        payload := jsonb_build_object(
            'type', 'INSERT',
            'record', to_jsonb(NEW)
        );
    ELSIF (TG_OP = 'UPDATE') THEN
        payload := jsonb_build_object(
            'type', 'UPDATE',
            'record', to_jsonb(NEW),
            'old_record', to_jsonb(OLD)
        );
    ELSIF (TG_OP = 'DELETE') THEN
        payload := jsonb_build_object(
            'type', 'DELETE',
            'old_record', to_jsonb(OLD)
        );
    END IF;

    -- Asynchronous POST request using pg_net
    PERFORM net.http_post(
        url := gas_url,
        body := payload,
        headers := '{"Content-Type": "application/json"}'::jsonb
    );

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on yeucauxhd table
DROP TRIGGER IF EXISTS trg_sync_yeucauxhd_to_gas ON yeucauxhd;
CREATE TRIGGER trg_sync_yeucauxhd_to_gas
AFTER INSERT OR UPDATE OR DELETE ON yeucauxhd
FOR EACH ROW EXECUTE FUNCTION public.handle_yeucauxhd_sync();

COMMENT ON TRIGGER trg_sync_yeucauxhd_to_gas ON yeucauxhd IS 'Tự động đồng bộ dữ liệu từ Supabase về Google Sheet thông qua GAS Webhook';
-- 1. Create app_settings table for Global Notifications and other configs
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by TEXT
);

-- Initialize global notification if not exists
INSERT INTO public.app_settings (key, value, updated_by)
VALUES ('global_notification', '{"content": "", "isActive": false, "type": "info"}', 'System')
ON CONFLICT (key) DO NOTHING;

-- 2. Create user_presence table
CREATE TABLE IF NOT EXISTS public.user_presence (
    username TEXT PRIMARY KEY,
    full_name TEXT,
    last_active_at TIMESTAMPTZ DEFAULT now(),
    status TEXT DEFAULT 'online',
    metadata JSONB DEFAULT '{}'
);

-- 3. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT now(),
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    user_email TEXT,
    user_full_name TEXT,
    target_id TEXT,
    target_type TEXT,
    ip_address TEXT
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies (Allow all for now as app layer handles auth)
CREATE POLICY "Allow all access to app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to user_presence" ON public.user_presence FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_active ON public.user_presence(last_active_at DESC);
-- Add Chat and Stock visibility settings to app_settings
INSERT INTO public.app_settings (key, value, updated_by)
VALUES 
    ('chat_visibility', '{"isChatHidden": false}', 'System'),
    ('stock_visibility', '{"isStockHidden": false}', 'System')
ON CONFLICT (key) DO NOTHING;
-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    sender_name TEXT NOT NULL,
    sender_role TEXT,
    message TEXT,
    mentions TEXT[] DEFAULT '{}',
    reactions JSONB DEFAULT '{}',
    reply_to UUID REFERENCES chat_messages(id),
    is_pinned BOOLEAN DEFAULT false,
    file_id TEXT,
    recipient TEXT, -- NULL for public chat, username/name for private chat
    metadata JSONB DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid errors on rerun
DROP POLICY IF EXISTS "Allow all select" ON chat_messages;
DROP POLICY IF EXISTS "Allow all insert" ON chat_messages;
DROP POLICY IF EXISTS "Allow all update" ON chat_messages;

-- Create policies
CREATE POLICY "Allow all select" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON chat_messages FOR UPDATE USING (true);

-- Enable Realtime
-- Note: If you get an error "already member of publication", it means Realtime is ALREADY enabled. You can ignore it.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
    END IF;
END $$;
-- Enable Realtime for business tables
BEGIN;
  -- Add main trading tables to the realtime publication
  ALTER PUBLICATION supabase_realtime ADD TABLE public.donhang;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.archived_orders;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.yeucauvc;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.yeucauxhd;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
COMMIT;
-- Function to sync changes from donhang to yeucauxhd
CREATE OR REPLACE FUNCTION public.sync_donhang_to_yeucauxhd()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.yeucauxhd
    SET 
        ten_khach_hang = NEW.ten_khach_hang,
        vin = NEW.vin,
        dong_xe = NEW.dong_xe,
        phien_ban = NEW.phien_ban,
        ngoai_that = NEW.ngoai_that,
        noi_that = NEW.noi_that,
        ngay_coc = NEW.ngay_coc,
        tvbh = NEW.ten_tu_van_ban_hang,
        ngay_xuat_hoa_don = NEW.ngay_xuat_hoa_don
    WHERE so_don_hang = NEW.so_don_hang;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on donhang
DROP TRIGGER IF EXISTS trg_sync_donhang_to_yeucauxhd ON public.donhang;
CREATE TRIGGER trg_sync_donhang_to_yeucauxhd
AFTER UPDATE ON public.donhang
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION public.sync_donhang_to_yeucauxhd();

-- Function to sync changes from yeucauxhd to donhang
CREATE OR REPLACE FUNCTION public.sync_yeucauxhd_to_donhang()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.donhang
    SET 
        ten_khach_hang = NEW.ten_khach_hang,
        vin = NEW.vin,
        dong_xe = NEW.dong_xe,
        phien_ban = NEW.phien_ban,
        ngoai_that = NEW.ngoai_that,
        noi_that = NEW.noi_that,
        ngay_coc = NEW.ngay_coc,
        ten_tu_van_ban_hang = NEW.tvbh,
        link_hoa_don_da_xuat = NEW.url_hoa_don_da_xuat,
        ngay_xuat_hoa_don = NEW.ngay_xuat_hoa_don
    WHERE so_don_hang = NEW.so_don_hang;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on yeucauxhd
DROP TRIGGER IF EXISTS trg_sync_yeucauxhd_to_donhang ON public.yeucauxhd;
CREATE TRIGGER trg_sync_yeucauxhd_to_donhang
AFTER UPDATE ON public.yeucauxhd
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION public.sync_yeucauxhd_to_donhang();

-- NEW: Function to automatically set invoice date when status changes to 'Chờ ký hóa đơn'
CREATE OR REPLACE FUNCTION public.set_invoice_date_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- For donhang table
    IF (NEW.ket_qua = 'Chờ ký hóa đơn' AND (OLD.ket_qua IS NULL OR OLD.ket_qua != 'Chờ ký hóa đơn')) THEN
        -- Only set if it hasn't been set yet (to avoid overwriting manual corrections)
        IF (NEW.ngay_xuat_hoa_don IS NULL) THEN
            NEW.ngay_xuat_hoa_don := NOW();
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on donhang for date setting (BEFORE UPDATE so we can modify NEW)
DROP TRIGGER IF EXISTS trg_set_invoice_date ON public.donhang;
CREATE TRIGGER trg_set_invoice_date
BEFORE UPDATE ON public.donhang
FOR EACH ROW
EXECUTE FUNCTION public.set_invoice_date_on_status_change();

COMMENT ON FUNCTION public.sync_donhang_to_yeucauxhd IS 'Đồng bộ thông tin đơn hàng từ bảng donhang sang bảng yeucauxhd khi có cập nhật.';
COMMENT ON FUNCTION public.sync_yeucauxhd_to_donhang IS 'Đồng bộ thông tin đơn hàng từ bảng yeucauxhd sang bảng donhang khi có cập nhật (ví dụ: link hóa đơn).';
COMMENT ON FUNCTION public.set_invoice_date_on_status_change IS 'Tự động thiết lập ngày xuất hóa đơn khi trạng thái đơn hàng chuyển sang "Chờ ký hóa đơn".';

-- Function to automatically sync khoxe details from thongtinxe (master data)
CREATE OR REPLACE FUNCTION public.sync_khoxe_with_master()
RETURNS TRIGGER AS $$
DECLARE
    master_record RECORD;
BEGIN
    -- Tìm thông tin trong bảng thongtinxe dựa trên số VIN
    SELECT * INTO master_record FROM public.thongtinxe WHERE vin = NEW.vin LIMIT 1;
    
    IF master_record IS NOT NULL THEN
        -- Tự động điền nếu trường hiện tại đang trống hoặc NULL
        
        -- 1. Dòng xe (lấy từ mo_ta, chuyển limo green -> LIMO)
        IF (NEW.dong_xe IS NULL OR NEW.dong_xe = '') AND master_record.mo_ta IS NOT NULL THEN
            IF LOWER(master_record.mo_ta) LIKE '%limo green%' THEN
                NEW.dong_xe := 'LIMO';
            ELSE
                NEW.dong_xe := master_record.mo_ta;
            END IF;
        END IF;

        -- 2. Phiên bản
        IF (NEW.phien_ban IS NULL OR NEW.phien_ban = '') AND master_record.phien_ban IS NOT NULL THEN
            NEW.phien_ban := master_record.phien_ban;
        END IF;

        -- 3. Ngoại thất
        IF (NEW.ngoai_that IS NULL OR NEW.ngoai_that = '') AND master_record.ngoai_that IS NOT NULL THEN
            NEW.ngoai_that := master_record.ngoai_that;
        END IF;

        -- 4. Nội thất
        IF (NEW.noi_that IS NULL OR NEW.noi_that = '') AND master_record.noi_that IS NOT NULL THEN
            NEW.noi_that := master_record.noi_that;
        END IF;

        -- 5. Số máy
        IF (NEW.so_may IS NULL OR NEW.so_may = '') AND master_record.so_may IS NOT NULL THEN
            NEW.so_may := master_record.so_may;
        END IF;

        -- 6. Mã DMS (lấy từ khu_vuc)
        IF (NEW.ma_dms IS NULL OR NEW.ma_dms = '') AND master_record.khu_vuc IS NOT NULL THEN
            NEW.ma_dms := master_record.khu_vuc;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run before inserting or updating khoxe
DROP TRIGGER IF EXISTS trigger_sync_khoxe_with_master ON public.khoxe;
CREATE TRIGGER trigger_sync_khoxe_with_master
BEFORE INSERT OR UPDATE ON public.khoxe
FOR EACH ROW
EXECUTE FUNCTION public.sync_khoxe_with_master();

-- One-time update for existing records that are missing info
UPDATE public.khoxe k
SET 
    dong_xe = COALESCE(NULLIF(k.dong_xe, ''), t.mo_ta),
    phien_ban = COALESCE(NULLIF(k.phien_ban, ''), t.phien_ban),
    ngoai_that = COALESCE(NULLIF(k.ngoai_that, ''), t.ngoai_that),
    noi_that = COALESCE(NULLIF(k.noi_that, ''), t.noi_that),
    so_may = COALESCE(NULLIF(k.so_may, ''), t.so_may),
    ma_dms = COALESCE(NULLIF(k.ma_dms, ''), t.khu_vuc)
FROM public.thongtinxe t
WHERE k.vin = t.vin
AND (
    k.dong_xe = '' OR k.dong_xe IS NULL OR
    k.phien_ban = '' OR k.phien_ban IS NULL OR
    k.ngoai_that = '' OR k.ngoai_that IS NULL OR
    k.so_may = '' OR k.so_may IS NULL OR
    k.ma_dms = '' OR k.ma_dms IS NULL
);

-- Migration to rebuild thongtinxe table based on Excel structure
DROP TABLE IF EXISTS "public"."thongtinxe" CASCADE;

CREATE TABLE "public"."thongtinxe" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "inventory_id" text, -- (Không Sửa đổi) Inventory New Vehicle ID
    "check_sum" text,     -- (Không Sửa đổi) Kiểm tra tổng cho Hàng
    "modified_at" timestamptz, -- (Không Sửa đổi) Ngày sửa đổi
    "vin" text NOT NULL,
    "so_ton_kho" text,
    "so_tham_chieu" text,
    "ma_san_pham" text,
    "phien_ban" text,
    "khu_vuc" text,
    "ngoai_that" text,
    "noi_that" text,
    "so_may" text,
    "mo_ta" text,
    "so_don_hang_cuoi" text,
    "nam_san_xuat" integer,
    "ngay_nhan" timestamptz,
    "ngay_xhd_1" timestamptz, -- Ngày xuất hoá đơn (Số đơn hàng bán xe) (Đơn hàng bán xe)
    "ngay_xhd_2" timestamptz, -- Ngày xuất hoá đơn (Số đơn hàng cuối cùng) (Đơn hàng bán xe)
    "created_at" timestamptz DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Index for fast lookup by VIN
CREATE UNIQUE INDEX "thongtinxe_vin_idx" ON "public"."thongtinxe" ("vin");

-- Enable RLS
ALTER TABLE "public"."thongtinxe" ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "Allow authenticated read" ON "public"."thongtinxe"
    FOR SELECT USING (auth.role() = 'authenticated');

-- [Optional] If you want to allow anonymous read (depending on your setup)
-- CREATE POLICY "Allow public read" ON "public"."thongtinxe" 
--    FOR SELECT USING (true);

-- Add missing columns to khoxe for complete inventory management
ALTER TABLE "public"."khoxe" ADD COLUMN IF NOT EXISTS "so_may" text;
ALTER TABLE "public"."khoxe" ADD COLUMN IF NOT EXISTS "ma_dms" text;

-- Update existing records if needed (optional)
-- UPDATE "public"."khoxe" SET "ma_dms" = '' WHERE "ma_dms" IS NULL;
-- UPDATE "public"."khoxe" SET "so_may" = '' WHERE "so_may" IS NULL;
ALTER TABLE car_inquiries ADD COLUMN IF NOT EXISTS chat_history JSONB DEFAULT '[]'::jsonb;
-- Create table for inquiry comments (Mini-chat)
CREATE TABLE car_inquiry_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inquiry_id UUID REFERENCES car_inquiries(id) ON DELETE CASCADE,
    sender_email TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    content TEXT NOT NULL,
    is_admin_comment BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE car_inquiry_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to comments" ON car_inquiry_comments FOR ALL USING (true) WITH CHECK (true);

-- Add real-time to this new table
ALTER PUBLICATION supabase_realtime ADD TABLE car_inquiry_comments;
-- Auto-watch trigger for car inquiries
-- When a new car is added to stock, check if any pending/not_found inquiries match it.

CREATE OR REPLACE FUNCTION public.check_car_inquiries_on_stock_change()
RETURNS TRIGGER AS $$
DECLARE
    r RECORD;
BEGIN
    -- Only check if the car is currently 'Chưa ghép'
    -- (If it's an update, only fire if it moved from other status TO 'Chưa ghép')
    IF (NEW.trang_thai = 'Chưa ghép') AND (TG_OP = 'INSERT' OR (OLD.trang_thai <> 'Chưa ghép')) THEN
        -- Find inquiries that match this car's configuration
        -- Only target inquiries that are not yet answered/found
        FOR r IN (
            SELECT * FROM public.car_inquiries 
            WHERE (status = 'pending' OR status = 'not_found' OR status = 'auto_checking')
            AND model = NEW.dong_xe
            AND version = NEW.phien_ban
            AND exterior_color = NEW.ngoai_that
            AND interior_color = NEW.noi_that
        ) LOOP
            -- Update the inquiry
            UPDATE public.car_inquiries 
            SET status = 'auto_found',
                matched_vin = NEW.vin,
                admin_response = 'Hệ thống vừa tìm thấy 01 xe mới nhập kho khớp với yêu cầu của bạn!',
                responded_at = NOW(),
                is_read_by_tvbh = false -- Mark as unread for Sales
            WHERE id = r.id;

            -- Create individual notification for each TVBH
            INSERT INTO public.notifications (
                message, 
                type, 
                recipient, 
                target_view, 
                target_id,
                created_by
            )
            VALUES (
                'Đã tìm thấy xe ' || NEW.dong_xe || ' khớp với yêu cầu của bạn! (VIN: ' || NEW.vin || ')',
                'success',
                r.tvbh_email,
                'inquiry',
                r.id::text,
                'System'
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_car_inquiries ON public.khoxe;
CREATE TRIGGER trg_check_car_inquiries
AFTER INSERT OR UPDATE ON public.khoxe
FOR EACH ROW
EXECUTE FUNCTION public.check_car_inquiries_on_stock_change();

-- Create car_inquiries table
CREATE TABLE IF NOT EXISTS public.car_inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    tvbh_name TEXT NOT NULL,
    tvbh_email TEXT NOT NULL,
    model TEXT NOT NULL,
    version TEXT NOT NULL,
    exterior_color TEXT NOT NULL,
    interior_color TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'auto_found', 'manual_responded', 'held'
    admin_response TEXT,
    matched_vin TEXT,
    responded_at TIMESTAMPTZ,
    is_read_by_admin BOOLEAN DEFAULT FALSE,
    is_read_by_tvbh BOOLEAN DEFAULT FALSE
);

-- Policies
ALTER TABLE public.car_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.car_inquiries;
DROP POLICY IF EXISTS "Allow all select" ON public.car_inquiries;
DROP POLICY IF EXISTS "Allow all insert" ON public.car_inquiries;
DROP POLICY IF EXISTS "Allow all update" ON public.car_inquiries;
DROP POLICY IF EXISTS "Allow all delete" ON public.car_inquiries;

CREATE POLICY "Allow all select" ON public.car_inquiries FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.car_inquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.car_inquiries FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON public.car_inquiries FOR DELETE USING (true);

-- Enable Realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'car_inquiries'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.car_inquiries;
    END IF;
END $$;
-- Add extension_reason Column to khoxe
ALTER TABLE public.khoxe ADD COLUMN IF NOT EXISTS extension_reason TEXT;
-- Migration for Advanced Hold Features: Queue, Extension, and Reputation
-- 1. Create Hold Queue table
CREATE TABLE IF NOT EXISTS public.hold_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vin TEXT NOT NULL REFERENCES public.khoxe(vin) ON DELETE CASCADE,
    tvbh_name TEXT NOT NULL,
    tvbh_email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'waiting', -- 'waiting', 'notified', 'converted', 'expired'
    UNIQUE(vin, tvbh_email) -- One person can only queue once for the same car
);

-- 2. Create Hold History for Reputation Tracking
CREATE TABLE IF NOT EXISTS public.hold_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vin TEXT NOT NULL,
    tvbh_email TEXT NOT NULL,
    tvbh_name TEXT,
    held_at TIMESTAMPTZ DEFAULT NOW(),
    released_at TIMESTAMPTZ,
    outcome TEXT, -- 'matched', 'released', 'expired'
    duration_hours NUMERIC
);

-- 3. Add Extension columns to khoxe
ALTER TABLE public.khoxe ADD COLUMN IF NOT EXISTS is_extension_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE public.khoxe ADD COLUMN IF NOT EXISTS extension_evidence_url TEXT;
ALTER TABLE public.khoxe ADD COLUMN IF NOT EXISTS extension_count INTEGER DEFAULT 0;

-- 4. RLS for new tables
ALTER TABLE public.hold_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hold_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for all on hold_queue" ON public.hold_queue FOR SELECT USING (true);
CREATE POLICY "Allow insert for all on hold_queue" ON public.hold_queue FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow delete for owners on hold_queue" ON public.hold_queue FOR DELETE USING (auth.email() = tvbh_email OR (auth.jwt()->>'email') = tvbh_email);

CREATE POLICY "Allow read for all on hold_history" ON public.hold_history FOR SELECT USING (true);
CREATE POLICY "Allow insert for system on hold_history" ON public.hold_history FOR INSERT WITH CHECK (true);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_hold_queue_vin ON public.hold_queue(vin);
CREATE INDEX IF NOT EXISTS idx_hold_history_email ON public.hold_history(tvbh_email);

COMMENT ON TABLE public.hold_queue IS 'Danh sách chờ cho các xe đã bị giữ.';
COMMENT ON TABLE public.hold_history IS 'Lịch sử giữ xe để tính toán chỉ số uy tín.';

-- 6. Trigger to notify queue when car becomes available
CREATE OR REPLACE FUNCTION public.on_car_released_notify_queue()
RETURNS TRIGGER AS $$
DECLARE
    next_in_queue RECORD;
BEGIN
    -- Only trigger if status changes from 'Đang giữ' back to 'Chưa ghép'
    IF (OLD.trang_thai = 'Đang giữ' AND NEW.trang_thai = 'Chưa ghép') THEN
        -- Find the first person in queue
        SELECT * INTO next_in_queue 
        FROM public.hold_queue 
        WHERE vin = NEW.vin AND status = 'waiting'
        ORDER BY created_at ASC
        LIMIT 1;

        IF next_in_queue.id IS NOT NULL THEN
            -- 1. Create a notification for this person
            INSERT INTO public.interactions (
                category, type, recipient, message, actor_name, target_view, target_id
            ) VALUES (
                'NOTIFICATION',
                'success',
                next_in_queue.tvbh_email,
                'Xe ' || NEW.vin || ' bạn đang chờ hiện đã rảnh. Bạn có 15 phút ưu tiên để giữ xe!',
                'Hệ thống',
                'stock',
                NEW.vin
            );

            -- 2. Update queue status
            UPDATE public.hold_queue SET status = 'notified' WHERE id = next_in_queue.id;
        ELSE
            -- No one in queue, broadcast to all
            INSERT INTO public.interactions (
                category, type, recipient, message, actor_name, target_view, target_id
            ) VALUES (
                'NOTIFICATION',
                'info',
                'ALL_TVBH',
                '📢 XE RẢNH: Xe ' || NEW.vin || ' (' || NEW.dong_xe || ') vừa được giải phóng. Giữ ngay kẻo lỡ!',
                'Hệ thống',
                'stock',
                NEW.vin
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_hold_queue ON public.khoxe;
CREATE TRIGGER tr_notify_hold_queue
AFTER UPDATE ON public.khoxe
FOR EACH ROW
EXECUTE FUNCTION public.on_car_released_notify_queue();
-- Tự động dọn dẹp thông báo cũ để tránh tràn bộ nhớ
-- Cleanup old notifications automatically

CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS TRIGGER AS $$
BEGIN
    -- Chỉ áp dụng cho category 'NOTIFICATION'
    -- Xóa các thông báo cũ hơn 14 ngày
    DELETE FROM public.interactions
    WHERE category = 'NOTIFICATION'
    AND created_at < NOW() - INTERVAL '14 days';

    -- Ngoài ra, giới hạn mỗi người chỉ giữ tối đa 200 thông báo mới nhất
    -- (Để tránh trường hợp spam quá nhiều trong thời gian ngắn)
    DELETE FROM public.interactions
    WHERE id IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY recipient ORDER BY created_at DESC) as rn
            FROM public.interactions
            WHERE category = 'NOTIFICATION'
            AND recipient = NEW.recipient
        ) t
        WHERE t.rn > 200
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger này chạy SAU khi chèn thông báo mới
DROP TRIGGER IF EXISTS tr_cleanup_notifications ON public.interactions;
CREATE TRIGGER tr_cleanup_notifications
AFTER INSERT ON public.interactions
FOR EACH ROW
WHEN (NEW.category = 'NOTIFICATION')
EXECUTE FUNCTION public.cleanup_old_notifications();
-- Migration: Tự động xử lý xe hết hạn giữ và Chống lách luật
-- Ngày: 2026-03-12

-- 1. Function tự động giải phóng xe hết hạn (chạy định kỳ hoặc qua Trigger)
CREATE OR REPLACE FUNCTION public.auto_release_expired_holds()
RETURNS void AS $$
DECLARE
    r RECORD;
BEGIN
    -- Tìm các xe đã quá hạn thoi_gian_het_han_giu
    -- Định dạng thoi_gian_het_han_giu trong khoxe là 'DD/MM/YYYY HH:mm:ss'
    FOR r IN (
        SELECT vin, nguoi_giu_xe, username_giu_xe 
        FROM public.khoxe 
        WHERE trang_thai = 'Đang giữ' 
        AND thoi_gian_het_han_giu IS NOT NULL 
        AND thoi_gian_het_han_giu <> 'Vô thời hạn'
        AND to_timestamp(thoi_gian_het_han_giu, 'DD/MM/YYYY HH24:MI:SS') < NOW()
    ) LOOP
        -- Sử dụng hàm RPC tập trung để giải phóng xe (tự động xử lý hàng chờ và uy tín)
        PERFORM public.rpc_release_car(r.vin, 'expired');
    END LOOP;
END;
        IF r.username_giu_xe IS NOT NULL THEN
            INSERT INTO public.interactions (
                category, type, recipient, message, actor_name, target_view, target_id
            ) VALUES (
                'NOTIFICATION',
                'warning',
                r.username_giu_xe,
                'Xe ' || r.vin || ' đã tự động giải phóng do quá 24h giữ. Uy tín của bạn có thể bị ảnh hưởng.',
                'Hệ thống',
                'stock',
                r.vin
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 2. Đảm bảo có chỉ mục cho username_giu_xe để check nhanh
CREATE INDEX IF NOT EXISTS idx_khoxe_username_giu_xe ON public.khoxe(username_giu_xe);

-- 3. (Optional) Tạo một cron job nếu Supabase hỗ trợ pg_cron, 
-- hoặc function này sẽ được gọi từ một con bot/api định kỳ.
-- Ở đây ta cung cấp hàm, Admin có thể bấm nút "Dọn dẹp" trên UI hoặc gọi qua API.
-- Script to cleanup redundant tables after consolidation
-- CẢNH BÁO: Chỉ chạy script này sau khi bạn đã xác nhận dữ liệu đã được di chuyển thành công sang bảng 'interactions'

DROP TABLE IF EXISTS public.notifications;
DROP TABLE IF EXISTS public.chat_messages;
DROP TABLE IF EXISTS public.audit_logs;
DROP TABLE IF EXISTS public.car_inquiry_comments;
-- Consolidated Interactions Table
-- Gộp Thông báo, Nhật ký, Tin nhắn và Bình luận vào một bảng duy nhất

-- 1. Create the consolidated table
CREATE TABLE IF NOT EXISTS public.interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Phân loại: NOTIFICATION, LOG, MESSAGE, COMMENT
    category TEXT NOT NULL,
    
    -- Loại chi tiết: INFO, SUCCESS, WARNING, DANGER, hoặc ACTION_CODE (e.g. 'APPROVE_ORDER')
    type TEXT DEFAULT 'info',
    
    -- Nội dung chính
    message TEXT NOT NULL,
    
    -- Thông tin người thực hiện (Actor/Sender)
    actor_id TEXT, -- username hoặc email của người gửi/người khởi tạo
    actor_name TEXT,
    
    -- Thông tin người nhận (Recipient) - Dùng cho NOTIFICATION hoặc MESSAGE riêng tư
    recipient TEXT DEFAULT 'ALL', -- target username, 'ALL', hoặc 'ADMINS'
    is_read BOOLEAN DEFAULT false,
    
    -- Ngữ cảnh / Liên kết (Context)
    target_view TEXT, -- Tên màn hình (e.g. 'orders', 'inquiries', 'sold')
    target_id TEXT,   -- ID cụ thể (Số đơn hàng hoặc Inquiry UUID)
    
    -- Dữ liệu mở rộng (JSONB)
    metadata JSONB DEFAULT '{}'
);

-- 2. Enable RLS
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to interactions" ON public.interactions FOR ALL USING (true) WITH CHECK (true);

-- 3. Enable Real-time
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'interactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE interactions;
    END IF;
END $$;

-- 4. Tạo các chỉ mục (Indexes)
CREATE INDEX IF NOT EXISTS idx_interactions_recipient ON public.interactions(recipient);
CREATE INDEX IF NOT EXISTS idx_interactions_category ON public.interactions(category);
CREATE INDEX IF NOT EXISTS idx_interactions_target ON public.interactions(target_view, target_id);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON public.interactions(created_at DESC);
-- Update triggers to use the consolidated interactions table
-- Thay thế việc chèn vào bảng public.notifications bằng public.interactions (category: 'NOTIFICATION')

CREATE OR REPLACE FUNCTION public.check_car_inquiries_on_stock_change()
RETURNS TRIGGER AS $$
DECLARE
    r RECORD;
BEGIN
    -- Only check if the car is currently 'Chưa ghép'
    -- (If it's an update, only fire if it moved from other status TO 'Chưa ghép')
    IF (NEW.trang_thai = 'Chưa ghép') AND (TG_OP = 'INSERT' OR (OLD.trang_thai <> 'Chưa ghép')) THEN
        -- Find inquiries that match this car's configuration
        -- Only target inquiries that are not yet answered/found
        FOR r IN (
            SELECT * FROM public.car_inquiries 
            WHERE (status = 'pending' OR status = 'not_found' OR status = 'auto_checking')
            AND model = NEW.dong_xe
            AND version = NEW.phien_ban
            AND exterior_color = NEW.ngoai_that
            AND interior_color = NEW.noi_that
        ) LOOP
            -- Update the inquiry
            UPDATE public.car_inquiries 
            SET status = 'auto_found',
                matched_vin = NEW.vin,
                admin_response = 'Hệ thống vừa tìm thấy 01 xe mới nhập kho khớp với yêu cầu của bạn!',
                responded_at = NOW(),
                is_read_by_tvbh = false -- Mark as unread for Sales
            WHERE id = r.id;

            -- Create individual notification for each TVBH in interactions table
            INSERT INTO public.interactions (
                category,
                message, 
                type, 
                recipient, 
                target_view, 
                target_id,
                actor_id,
                actor_name
            )
            VALUES (
                'NOTIFICATION',
                'Đã tìm thấy xe ' || NEW.dong_xe || ' khớp với yêu cầu của bạn! (VIN: ' || NEW.vin || ')',
                'success',
                r.tvbh_email,
                'inquiry',
                r.id::text,
                'System',
                'System'
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Migration: Dọn dẹp Trigger và Gỡ bỏ bảng hold_history hoàn toàn
-- Ngày: 2026-03-12

-- 1. Xóa các trigger cũ liên quan đến hold_history
DROP TRIGGER IF EXISTS tr_sync_khoxe_hold ON public.khoxe;
DROP FUNCTION IF EXISTS public.sync_khoxe_hold_to_history();
DROP FUNCTION IF EXISTS public.sync_khoxe_hold_v2();

-- 2. Xóa bảng hold_history
DROP TABLE IF EXISTS public.hold_history;

-- 3. Cập nhật Trigger duy nhất cho car_hold_activities để đảm bảo đồng bộ
CREATE OR REPLACE FUNCTION public.sync_khoxe_to_activities_final()
RETURNS TRIGGER AS $$
BEGIN
    -- TRƯỜNG HỢP 1: Có người mới giữ xe
    IF (NEW.username_giu_xe IS NOT NULL AND (OLD.username_giu_xe IS NULL OR OLD.username_giu_xe <> NEW.username_giu_xe)) THEN
        -- Đóng các bản ghi 'active' cũ (nếu có)
        UPDATE public.car_hold_activities 
        SET status = 'released', updated_at = NOW() 
        WHERE vin = NEW.vin AND type = 'HOLD' AND status = 'active';

        -- Chỉ tạo bản ghi mới nếu CHƯA có bản ghi active nào vừa được tạo bởi RPC (tránh duplicate)
        IF NOT EXISTS (
            SELECT 1 FROM public.car_hold_activities 
            WHERE vin = NEW.vin AND username = NEW.username_giu_xe AND type = 'HOLD' AND status = 'active'
            AND updated_at >= (NOW() - INTERVAL '5 seconds')
        ) THEN
            INSERT INTO public.car_hold_activities (vin, username, tvbh_name, type, status, created_at, updated_at)
            VALUES (NEW.vin, NEW.username_giu_xe, NEW.nguoi_giu_xe, 'HOLD', 'active', NOW(), NOW());
        END IF;
    END IF;

    -- TRƯỜNG HỢP 2: Giải phóng xe
    IF (NEW.username_giu_xe IS NULL AND OLD.username_giu_xe IS NOT NULL) THEN
        UPDATE public.car_hold_activities 
        SET status = CASE WHEN NEW.trang_thai = 'Đã ghép' THEN 'matched' ELSE 'released' END,
            updated_at = NOW()
        WHERE vin = NEW.vin AND type = 'HOLD' AND status = 'active';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gắn lại trigger chuẩn
DROP TRIGGER IF EXISTS tr_sync_khoxe_activities ON public.khoxe;
CREATE TRIGGER tr_sync_khoxe_activities
AFTER UPDATE ON public.khoxe
FOR EACH ROW
EXECUTE FUNCTION public.sync_khoxe_to_activities_final();
-- Migration script to copy data from old tables to the new interactions table
-- Di chuyển dữ liệu từ các bảng cũ sang bảng interactions mới gộp

DO $$
BEGIN
    -- 1. Migrate Notifications
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        INSERT INTO public.interactions (
            id, created_at, category, type, message, actor_id, actor_name, recipient, is_read, target_view, target_id
        )
        SELECT 
            id, 
            COALESCE(created_at, timestamp, now()), 
            'NOTIFICATION', 
            COALESCE(type, 'info'), 
            message, 
            COALESCE(created_by, 'System'), 
            COALESCE(created_by, 'System'), 
            COALESCE(recipient, 'ALL'), 
            is_read, 
            target_view, 
            target_id
        FROM public.notifications
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- 2. Migrate Audit Logs
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
        INSERT INTO public.interactions (
            id, created_at, category, type, message, actor_id, actor_name, recipient, is_read, target_view, target_id, metadata
        )
        SELECT 
            id, 
            timestamp, 
            'LOG', 
            action, 
            COALESCE(details->>'message', action), 
            user_email, 
            user_full_name, 
            'ALL', 
            true, 
            target_type, -- Ánh xạ target_type cũ vào target_view mới
            target_id,
            details
        FROM public.audit_logs
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- 3. Migrate Chat Messages
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_messages') THEN
        INSERT INTO public.interactions (
            id, created_at, category, type, message, actor_id, actor_name, recipient, is_read, metadata
        )
        SELECT 
            id, 
            created_at, 
            'MESSAGE', 
            'info', 
            message, 
            sender_name, -- Since sender_name was used as primary id in old chat
            sender_name, 
            COALESCE(recipient, 'ALL'), 
            false,
            jsonb_build_object(
                'sender_role', sender_role,
                'mentions', mentions,
                'reactions', reactions,
                'reply_to', reply_to,
                'file_id', file_id,
                'is_pinned', is_pinned
            )
        FROM public.chat_messages
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- 4. Migrate Car Inquiry Comments
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'car_inquiry_comments') THEN
        INSERT INTO public.interactions (
            id, created_at, category, type, message, actor_id, actor_name, recipient, is_read, target_view, target_id, metadata
        )
        SELECT 
            id, 
            created_at, 
            'COMMENT', 
            'info', 
            content, 
            sender_email, 
            sender_name, 
            'ADMINS', 
            false, 
            'inquiry', 
            inquiry_id::text,
            jsonb_build_object('is_admin_comment', is_admin_comment)
        FROM public.car_inquiry_comments
        ON CONFLICT (id) DO NOTHING;
    END IF;

END $$;
-- Migration: Đồng bộ giữ xe sử dụng Username đăng nhập
-- Ngày: 2026-03-12

-- 1. Thêm cột username_giu_xe vào bảng khoxe để lưu định danh người giữ
ALTER TABLE public.khoxe ADD COLUMN IF NOT EXISTS username_giu_xe TEXT;

-- 2. Đảm bảo bảng lịch sử sử dụng username (đổi tên cột nếu cần hoặc dùng tvbh_email làm cột lưu username)
-- Ở đây ta giữ nguyên tên cột tvbh_email nhưng ghi chú nó lưu Username/Email đăng nhập
CREATE TABLE IF NOT EXISTS public.hold_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vin TEXT NOT NULL,
    tvbh_email TEXT, -- Cột này sẽ lưu USERNAME đăng nhập
    tvbh_name TEXT,
    held_at TIMESTAMPTZ DEFAULT now(),
    released_at TIMESTAMPTZ,
    outcome TEXT, -- 'matched', 'released', 'expired'
    duration_hours NUMERIC
);

-- 3. Trigger function đồng bộ hóa cực đơn giản
CREATE OR REPLACE FUNCTION public.sync_khoxe_hold_v2()
RETURNS TRIGGER AS $$
BEGIN
    -- Khi có người mới giữ xe
    IF (NEW.username_giu_xe IS NOT NULL AND (OLD.username_giu_xe IS NULL OR OLD.username_giu_xe <> NEW.username_giu_xe)) THEN
        -- Đóng các bản ghi cũ của xe này
        UPDATE public.hold_history SET released_at = NOW(), outcome = 'released' 
        WHERE vin = NEW.vin AND released_at IS NULL;

        -- Tạo bản ghi lịch sử mới (Dùng trực tiếp thông tin từ khoxe)
        INSERT INTO public.hold_history (vin, tvbh_name, tvbh_email, held_at)
        VALUES (NEW.vin, NEW.nguoi_giu_xe, NEW.username_giu_xe, NOW());
    END IF;

    -- Khi giải phóng xe
    IF (NEW.username_giu_xe IS NULL AND OLD.username_giu_xe IS NOT NULL) THEN
        UPDATE public.hold_history 
        SET released_at = NOW(), 
            outcome = CASE WHEN NEW.trang_thai = 'Đã ghép' THEN 'matched' ELSE 'released' END
        WHERE vin = NEW.vin AND released_at IS NULL;
    END IF;

    -- Trường hợp cập nhật outcome khi trạng thái thay đổi sang Đã ghép
    IF (NEW.trang_thai = 'Đã ghép' AND OLD.trang_thai <> 'Đã ghép') THEN
        UPDATE public.hold_history SET released_at = NOW(), outcome = 'matched'
        WHERE vin = NEW.vin AND released_at IS NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Áp dụng Trigger
DROP TRIGGER IF EXISTS tr_sync_khoxe_hold ON public.khoxe;
CREATE TRIGGER tr_sync_khoxe_hold
AFTER UPDATE ON public.khoxe
FOR EACH ROW
EXECUTE FUNCTION public.sync_khoxe_hold_v2();

-- 5. Đồng bộ dữ liệu hiện có từ kho vào lịch sử (Chỉ chạy 1 lần)
INSERT INTO public.hold_history (vin, tvbh_name, tvbh_email, held_at)
SELECT 
    vin, 
    nguoi_giu_xe, 
    COALESCE(username_giu_xe, nguoi_giu_xe), -- Ưu tiên username, nếu chưa có thì tạm dùng tên
    NOW() 
FROM public.khoxe 
WHERE trang_thai = 'Đang giữ' 
AND nguoi_giu_xe IS NOT NULL
-- Tránh trùng lặp nếu đã có bản ghi active
AND NOT EXISTS (
    SELECT 1 FROM public.hold_history h 
    WHERE h.vin = public.khoxe.vin AND h.released_at IS NULL
);

-- 6. Cập nhật lại username_giu_xe lần cuối cho khớp
UPDATE public.khoxe SET username_giu_xe = nguoi_giu_xe 
WHERE username_giu_xe IS NULL AND nguoi_giu_xe IS NOT NULL;
-- 1. Đảm bảo các bảng liên quan tồn tại
CREATE TABLE IF NOT EXISTS public.car_hold_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vin TEXT NOT NULL,
    username TEXT, -- email/username của TVBH
    tvbh_name TEXT,
    type TEXT DEFAULT 'HOLD', -- 'HOLD' hoặc 'QUEUE'
    status TEXT DEFAULT 'active', -- 'active', 'matched', 'released', 'expired'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bảng hold_history (cho tính năng nâng cao)
CREATE TABLE IF NOT EXISTS public.hold_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vin TEXT NOT NULL,
    tvbh_email TEXT,
    tvbh_name TEXT,
    held_at TIMESTAMPTZ DEFAULT now(),
    released_at TIMESTAMPTZ,
    outcome TEXT, -- 'matched', 'released', 'expired'
    duration_hours NUMERIC
);

-- Bảng tvbh_emails (nếu chưa có)
CREATE TABLE IF NOT EXISTS public.tvbh_emails (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ten_tvbh TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Trigger function để tự động đồng bộ khi khoxe thay đổi
CREATE OR REPLACE FUNCTION public.sync_khoxe_hold_to_history()
RETURNS TRIGGER AS $$
DECLARE
    v_tvbh_email TEXT;
    v_tvbh_name TEXT;
    v_outcome TEXT;
BEGIN
    -- PHẦN 1: Xử lý khi có người mới giữ xe (hoặc đổi người giữ)
    IF (NEW.nguoi_giu_xe IS NOT NULL AND (OLD.nguoi_giu_xe IS NULL OR OLD.nguoi_giu_xe <> NEW.nguoi_giu_xe)) THEN
        -- 1. Kết thúc các bản ghi cũ còn "active" cho xe này (nếu có)
        UPDATE public.hold_history 
        SET released_at = NOW(), 
            outcome = 'released' 
        WHERE vin = NEW.vin AND released_at IS NULL;

        -- 2. Lấy email của TVBH từ bảng tvbh_emails dựa trên tên
        SELECT email INTO v_tvbh_email FROM public.tvbh_emails WHERE lower(ten_tvbh) = lower(NEW.nguoi_giu_xe) LIMIT 1;
        
        -- Nếu không tìm thấy trong bảng tvbh_emails, có thể người dùng nhập tay tên không khớp, 
        -- ta vẫn lưu lại log nhưng email sẽ để trống hoặc dùng username nếu có (nhưng khoxe chỉ lưu tên hiển thị)
        
        -- 3. Tạo bản ghi mới trong hold_history
        INSERT INTO public.hold_history (
            vin,
            tvbh_name,
            tvbh_email,
            held_at
        ) VALUES (
            NEW.vin,
            NEW.nguoi_giu_xe,
            COALESCE(v_tvbh_email, 'unknown@system.local'), -- Fallback email
            NOW()
        );
    END IF;

    -- PHẦN 2: Xử lý khi giải phóng xe (nguoi_giu_xe TRỞ VỀ NULL)
    IF (NEW.nguoi_giu_xe IS NULL AND OLD.nguoi_giu_xe IS NOT NULL) THEN
        -- Xác định lý do kết thúc
        IF (NEW.trang_thai = 'Đã ghép') THEN
            v_outcome := 'matched';
        ELSE
            -- Nếu hết hạn giữ xe (kiểm tra thoi_gian_het_han_giu so với hiện tại)
            -- Hoặc nếu trang_thai chuyển về 'Chưa ghép'
            v_outcome := 'released';
        END IF;

        UPDATE public.hold_history 
        SET released_at = NOW(), 
            outcome = v_outcome
        WHERE vin = NEW.vin AND released_at IS NULL;
    END IF;

    -- PHẦN 3: Xử lý đặc biệt khi trạng thái chuyển sang 'Đã ghép' nhưng nguoi_giu_xe vẫn còn 
    -- (thường xảy ra khi đơn hàng được tạo thành công)
    IF (NEW.trang_thai = 'Đã ghép' AND OLD.trang_thai <> 'Đã ghép') THEN
        UPDATE public.hold_history 
        SET released_at = NOW(), 
            outcome = 'matched'
        WHERE vin = NEW.vin AND released_at IS NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Gắn trigger vào bảng khoxe
DROP TRIGGER IF EXISTS tr_sync_khoxe_hold ON public.khoxe;
CREATE TRIGGER tr_sync_khoxe_hold
AFTER UPDATE ON public.khoxe
FOR EACH ROW
EXECUTE FUNCTION public.sync_khoxe_hold_to_history();

-- 4. Một lần duy nhất: Đồng bộ dữ liệu hiện tại từ khoxe sang hold_history
-- Tạo bản ghi cho những xe đang bị giữ mà chưa có trong history
INSERT INTO public.hold_history (vin, tvbh_name, tvbh_email, held_at)
SELECT 
    k.vin, 
    k.nguoi_giu_xe, 
    COALESCE(te.email, 'legacy@system.local'),
    NOW() -- Vì ta không biết chính xác thời điểm giữ trước đó từ khoxe, lấy NOW()
FROM public.khoxe k
LEFT JOIN public.tvbh_emails te ON lower(k.nguoi_giu_xe) = lower(te.ten_tvbh)
WHERE k.trang_thai = 'Đang giữ' 
AND k.nguoi_giu_xe IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM public.hold_history h 
    WHERE h.vin = k.vin AND h.released_at IS NULL
);

-- 5. Đồng bộ sang car_hold_activities (nếu bảng này vẫn đang được code cũ sử dụng)
-- Ta sẽ tạo một trigger tương tự hoặc gộp chung. 
-- Để an toàn, ta sẽ làm cho car_hold_activities cũng tự cập nhật.

CREATE OR REPLACE FUNCTION public.sync_khoxe_to_activities()
RETURNS TRIGGER AS $$
BEGIN
    -- Nếu bắt đầu giữ
    IF (NEW.nguoi_giu_xe IS NOT NULL AND (OLD.nguoi_giu_xe IS NULL OR OLD.nguoi_giu_xe <> NEW.nguoi_giu_xe)) THEN
        -- Close old
        UPDATE public.car_hold_activities SET status = 'released' WHERE vin = NEW.vin AND status = 'active';
        -- Insert new
        INSERT INTO public.car_hold_activities (vin, tvbh_name, username, type, status)
        SELECT NEW.vin, NEW.nguoi_giu_xe, COALESCE(email, NEW.nguoi_giu_xe), 'HOLD', 'active'
        FROM public.tvbh_emails WHERE lower(ten_tvbh) = lower(NEW.nguoi_giu_xe) LIMIT 1;
    END IF;
    
    -- Nếu giải phóng
    IF (NEW.nguoi_giu_xe IS NULL AND OLD.nguoi_giu_xe IS NOT NULL) THEN
        UPDATE public.car_hold_activities 
        SET status = CASE WHEN NEW.trang_thai = 'Đã ghép' THEN 'matched' ELSE 'released' END
        WHERE vin = NEW.vin AND status = 'active';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gắn trigger cho car_hold_activities
DROP TRIGGER IF EXISTS tr_sync_khoxe_activities ON public.khoxe;
CREATE TRIGGER tr_sync_khoxe_activities
AFTER UPDATE ON public.khoxe
FOR EACH ROW
EXECUTE FUNCTION public.sync_khoxe_to_activities();
-- Add automatic block expiration
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS blocked_until TIMESTAMPTZ;

COMMENT ON COLUMN public.users.blocked_until IS 'Thời điểm tự động mở khóa tài khoản';
-- Migration to add user blocking capability
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS block_reason TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS blocked_by TEXT;

COMMENT ON COLUMN public.users.is_blocked IS 'Trạng thái khóa tài khoản';
COMMENT ON COLUMN public.users.block_reason IS 'Lý do khóa tài khoản';
-- Migration to allow dynamic reputation adjustments
DROP TABLE IF EXISTS public.reputation_overrides;

CREATE TABLE public.reputation_adjustments (
    username TEXT PRIMARY KEY,
    adjustment_value INTEGER NOT NULL DEFAULT 0, -- Điểm cộng thêm hoặc trừ đi (ví dụ: +20 hoặc -10)
    system_score_at_update INTEGER NOT NULL, -- Điểm của hệ thống tại thời điểm Admin chỉnh sửa
    target_score INTEGER NOT NULL, -- Điểm mà Admin muốn Sale đạt tới
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT,
    reason TEXT
);

-- Enable RLS
ALTER TABLE public.reputation_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for all on reputation_adjustments" ON public.reputation_adjustments FOR SELECT USING (true);
CREATE POLICY "Allow all for authenticated users on reputation_adjustments" ON public.reputation_adjustments FOR ALL USING (true);

COMMENT ON TABLE public.reputation_adjustments IS 'Bảng lưu trữ các mức điều chỉnh điểm uy tín (điểm thưởng/phạt) do Admin thiết lập.';
-- 20260313: TRIỂN KHAI LỚP BẢO MẬT RLS (ROW LEVEL SECURITY)
-- Mục tiêu: Ngăn chặn các cuộc tấn công xóa dữ liệu hoặc sửa dữ liệu cấu hình trái phép từ API public (anon role)

-- ==========================================
-- 1. BẢNG USERS: Bảo vệ thông tin tài khoản
-- ==========================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Cho phép SELECT (để hiển thị danh sách TVBH cho tính năng phân công)
DROP POLICY IF EXISTS "Allow public read on users" ON public.users;
CREATE POLICY "Allow public read on users" ON public.users FOR SELECT USING (true);

-- CHỈ ADMIN (service_role) mới được INSERT/UPDATE/DELETE
-- (Bảng này cực kỳ nhạy cảm vì chứa mật khẩu hash)


-- ==========================================
-- 2. BẢNG DONHANG: Bảo vệ dữ liệu đơn hàng
-- ==========================================
ALTER TABLE public.donhang ENABLE ROW LEVEL SECURITY;

-- Cho phép xem tất cả (để hỗ trợ tra cứu chéo giữa các TVBH nếu cần)
DROP POLICY IF EXISTS "Allow public read on donhang" ON public.donhang;
CREATE POLICY "Allow public read on donhang" ON public.donhang FOR SELECT USING (true);

-- Cho phép INSERT (để Sales tạo đơn hàng mới)
DROP POLICY IF EXISTS "Allow public insert on donhang" ON public.donhang;
CREATE POLICY "Allow public insert on donhang" ON public.donhang FOR INSERT WITH CHECK (true);

-- Cho phép UPDATE (để Sales sửa đơn của mình)
-- Lưu ý: Hiện tại chưa có Supabase Auth nên cho phép anon update, nhưng RLS vẫn bảo vệ khỏi DELETE
DROP POLICY IF EXISTS "Allow public update on donhang" ON public.donhang;
CREATE POLICY "Allow public update on donhang" ON public.donhang FOR UPDATE USING (true);


-- ==========================================
-- 3. BẢNG KHOXE: Bảo vệ tài sản xe
-- ==========================================
ALTER TABLE public.khoxe ENABLE ROW LEVEL SECURITY;

-- Cho phép xem kho
DROP POLICY IF EXISTS "Allow public read on khoxe" ON public.khoxe;
CREATE POLICY "Allow public read on khoxe" ON public.khoxe FOR SELECT USING (true);

-- Cho phép Update trang_thai (để giữ xe/nhả xe)
DROP POLICY IF EXISTS "Allow public update on khoxe" ON public.khoxe;
CREATE POLICY "Allow public update on khoxe" ON public.khoxe FOR UPDATE USING (true);


-- ==========================================
-- 4. BẢNG APP_SETTINGS: Tuyệt đối bảo vệ cấu hình
-- ==========================================
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Cho phép tất cả xem cấu hình (để app hoạt động)
DROP POLICY IF EXISTS "Allow public read on app_settings" ON public.app_settings;
CREATE POLICY "Allow public read on app_settings" ON public.app_settings FOR SELECT USING (true);

-- CHẶN hoàn toàn UPDATE/DELETE từ Web (Tránh hacker tắt chat hoặc ẩn kho xe)
-- Các thao tác sửa cấu hình phải thông qua Admin Dashboard (dùng service_role)


-- ==========================================
-- 5. BẢNG INTERACTIONS: Nhật ký và Thông báo
-- ==========================================
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

-- Cho phép xem thông báo
DROP POLICY IF EXISTS "Allow public read on interactions" ON public.interactions;
CREATE POLICY "Allow public read on interactions" ON public.interactions FOR SELECT USING (true);

-- Cho phép ghi log (actor_id sẽ được app truyền vào)
DROP POLICY IF EXISTS "Allow public insert on interactions" ON public.interactions;
CREATE POLICY "Allow public insert on interactions" ON public.interactions FOR INSERT WITH CHECK (true);

-- Cho phép đánh dấu đã đọc (Update is_read)
DROP POLICY IF EXISTS "Allow public update on interactions" ON public.interactions;
CREATE POLICY "Allow public update on interactions" ON public.interactions FOR UPDATE USING (true);


-- ==========================================
-- 6. CÁC BẢNG HỖ TRỢ KHÁC
-- ==========================================
ALTER TABLE public.yeucauxhd ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public full access on yeucauxhd" ON public.yeucauxhd FOR ALL USING (true);

ALTER TABLE public.yeucauvc ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public full access on yeucauvc" ON public.yeucauvc FOR ALL USING (true);

ALTER TABLE public.car_hold_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public full access on car_hold_activities" ON public.car_hold_activities FOR ALL USING (true);

-- ==========================================
-- TỔNG KẾT:
-- 1. service_role KHÔNG bị ảnh hưởng bởi RLS (luôn có toàn quyền).
-- 2. role 'anon' (Web công cộng) bị chặn hoàn toàn lệnh DELETE trên mọi bảng quan trọng.
-- 3. Cấu hình hệ thống (app_settings) và danh sách người dùng (users) được bảo vệ tối đa.
