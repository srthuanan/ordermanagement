-- Migration: Tạo bảng lưu trữ Đơn hàng hiện hữu (từ file donhanghienhuu.xlsx)
-- Ngày: 2026-03-24

CREATE TABLE IF NOT EXISTS public.donhanghienhuu (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    new_vehicle_sales_order_id TEXT,
    kiem_tra_tong_cho_hang TEXT,
    ngay_sua_doi TIMESTAMPTZ,
    ngay_giao_dich DATE,
    tu_van_ban_hang TEXT,
    so_don_hang_ban TEXT,
    so_bao_gia_xe TEXT,
    ngay_xuat_hoa_don DATE,
    khach_hang_tiem_nang TEXT,
    promotion TEXT,
    ma_khach_hang TEXT,
    mo_ta_san_pham TEXT,
    ten_phien_ban TEXT,
    loai_tran TEXT,
    mau_ngoai_that TEXT,
    mau_noi_that TEXT,
    ma_phien_ban TEXT,
    ma_mau_ngoai_that TEXT,
    ma_mau_noi_that TEXT,
    trang_thai TEXT,
    pre_customer TEXT,
    so_vin TEXT,
    accessory_serial TEXT,
    ma_san_pham TEXT,
    so_ton_kho TEXT,
    so_tien_thuc_sau_thue NUMERIC,
    don_hang_goc TEXT,
    chi_nhanh TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index cho các cột thường xuyên tìm kiếm
CREATE INDEX IF NOT EXISTS idx_donhanghienhuu_so_don_hang ON public.donhanghienhuu(so_don_hang_ban);
CREATE INDEX IF NOT EXISTS idx_donhanghienhuu_so_vin ON public.donhanghienhuu(so_vin);
CREATE INDEX IF NOT EXISTS idx_donhanghienhuu_ngay_giao_dich ON public.donhanghienhuu(ngay_giao_dich);

-- Enable RLS
ALTER TABLE public.donhanghienhuu ENABLE ROW LEVEL SECURITY;

-- Policies (Cho phép thao tác cơ bản)
CREATE POLICY "Enable read access for all users" ON public.donhanghienhuu FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated" ON public.donhanghienhuu FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated" ON public.donhanghienhuu FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated" ON public.donhanghienhuu FOR DELETE USING (true);

-- Trigger tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_donhanghienhuu_updated_at ON public.donhanghienhuu;
CREATE TRIGGER set_donhanghienhuu_updated_at
BEFORE UPDATE ON public.donhanghienhuu
FOR EACH ROW
EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- Bật Realtime cho bảng
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'donhanghienhuu'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.donhanghienhuu;
    END IF;
END $$;
