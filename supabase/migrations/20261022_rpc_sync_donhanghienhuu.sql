-- Migration: RPC và Policy cho phép đồng bộ Đơn hàng mở vào donhanghienhuu
-- Ngày: 2026-10-22

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'donhanghienhuu_so_don_hang_ban_key'
    ) THEN
        ALTER TABLE public.donhanghienhuu ADD CONSTRAINT donhanghienhuu_so_don_hang_ban_key UNIQUE (so_don_hang_ban);
    END IF;
END $$;

DROP POLICY IF EXISTS "Allow anon all on donhanghienhuu" ON public.donhanghienhuu;
CREATE POLICY "Allow anon all on donhanghienhuu" ON public.donhanghienhuu FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated all on donhanghienhuu" ON public.donhanghienhuu;
CREATE POLICY "Allow authenticated all on donhanghienhuu" ON public.donhanghienhuu FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.rpc_sync_donhanghienhuu(p_orders jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
BEGIN
  IF p_orders IS NULL OR jsonb_array_length(p_orders) = 0 THEN
    RETURN jsonb_build_object('status', 'ok', 'count', 0);
  END IF;

  -- 1. Dọn dẹp các đơn đã xuất HĐ hoặc đã hủy khỏi bảng
  DELETE FROM public.donhanghienhuu
  WHERE ngay_xuat_hoa_don IS NOT NULL
     OR trang_thai ILIKE '%hóa đơn%'
     OR trang_thai ILIKE '%invoiced%'
     OR trang_thai ILIKE '%hủy%'
     OR trang_thai ILIKE '%cancel%';

  -- 2. Upsert đơn hàng MỞ
  INSERT INTO public.donhanghienhuu (
    new_vehicle_sales_order_id,
    kiem_tra_tong_cho_hang,
    ngay_sua_doi,
    ngay_giao_dich,
    tu_van_ban_hang,
    so_don_hang_ban,
    so_bao_gia_xe,
    ngay_xuat_hoa_don,
    khach_hang_tiem_nang,
    promotion,
    ma_khach_hang,
    mo_ta_san_pham,
    ten_phien_ban,
    loai_tran,
    mau_ngoai_that,
    mau_noi_that,
    ma_phien_ban,
    ma_mau_ngoai_that,
    ma_mau_noi_that,
    trang_thai,
    pre_customer,
    so_vin,
    accessory_serial,
    ma_san_pham,
    so_ton_kho,
    so_tien_thuc_sau_thue,
    don_hang_goc,
    chi_nhanh,
    updated_at
  )
  SELECT
    (item->>'new_vehicle_sales_order_id'),
    COALESCE(item->>'kiem_tra_tong_cho_hang', ''),
    NULLIF(item->>'ngay_sua_doi', '')::timestamptz,
    NULLIF(item->>'ngay_giao_dich', '')::date,
    COALESCE(item->>'tu_van_ban_hang', ''),
    (item->>'so_don_hang_ban'),
    COALESCE(item->>'so_bao_gia_xe', ''),
    NULLIF(item->>'ngay_xuat_hoa_don', '')::date,
    COALESCE(item->>'khach_hang_tiem_nang', ''),
    COALESCE(item->>'promotion', ''),
    COALESCE(item->>'ma_khach_hang', ''),
    COALESCE(item->>'mo_ta_san_pham', ''),
    COALESCE(item->>'ten_phien_ban', ''),
    COALESCE(item->>'loai_tran', ''),
    COALESCE(item->>'mau_ngoai_that', ''),
    COALESCE(item->>'mau_noi_that', ''),
    COALESCE(item->>'ma_phien_ban', ''),
    COALESCE(item->>'ma_mau_ngoai_that', ''),
    COALESCE(item->>'ma_mau_noi_that', ''),
    COALESCE(item->>'trang_thai', 'Mở'),
    COALESCE(item->>'pre_customer', ''),
    COALESCE(item->>'so_vin', ''),
    COALESCE(item->>'accessory_serial', ''),
    COALESCE(item->>'ma_san_pham', ''),
    COALESCE(item->>'so_ton_kho', ''),
    COALESCE(NULLIF(item->>'so_tien_thuc_sau_thue', '')::numeric, 0),
    COALESCE(item->>'don_hang_goc', ''),
    COALESCE(item->>'chi_nhanh', ''),
    NOW()
  FROM jsonb_array_elements(p_orders) AS item
  WHERE (item->>'so_don_hang_ban') IS NOT NULL AND (item->>'so_don_hang_ban') != ''
  ON CONFLICT (so_don_hang_ban) DO UPDATE SET
    new_vehicle_sales_order_id = EXCLUDED.new_vehicle_sales_order_id,
    kiem_tra_tong_cho_hang = EXCLUDED.kiem_tra_tong_cho_hang,
    ngay_sua_doi = EXCLUDED.ngay_sua_doi,
    ngay_giao_dich = EXCLUDED.ngay_giao_dich,
    tu_van_ban_hang = EXCLUDED.tu_van_ban_hang,
    so_bao_gia_xe = EXCLUDED.so_bao_gia_xe,
    ngay_xuat_hoa_don = EXCLUDED.ngay_xuat_hoa_don,
    khach_hang_tiem_nang = EXCLUDED.khach_hang_tiem_nang,
    promotion = EXCLUDED.promotion,
    ma_khach_hang = EXCLUDED.ma_khach_hang,
    mo_ta_san_pham = EXCLUDED.mo_ta_san_pham,
    ten_phien_ban = EXCLUDED.ten_phien_ban,
    loai_tran = EXCLUDED.loai_tran,
    mau_ngoai_that = EXCLUDED.mau_ngoai_that,
    mau_noi_that = EXCLUDED.mau_noi_that,
    ma_phien_ban = EXCLUDED.ma_phien_ban,
    ma_mau_ngoai_that = EXCLUDED.ma_mau_ngoai_that,
    ma_mau_noi_that = EXCLUDED.ma_mau_noi_that,
    trang_thai = EXCLUDED.trang_thai,
    pre_customer = EXCLUDED.pre_customer,
    so_vin = EXCLUDED.so_vin,
    accessory_serial = EXCLUDED.accessory_serial,
    ma_san_pham = EXCLUDED.ma_san_pham,
    so_ton_kho = EXCLUDED.so_ton_kho,
    so_tien_thuc_sau_thue = EXCLUDED.so_tien_thuc_sau_thue,
    don_hang_goc = EXCLUDED.don_hang_goc,
    chi_nhanh = EXCLUDED.chi_nhanh,
    updated_at = NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object('status', 'ok', 'count', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_sync_donhanghienhuu(jsonb) TO anon, authenticated, service_role;
