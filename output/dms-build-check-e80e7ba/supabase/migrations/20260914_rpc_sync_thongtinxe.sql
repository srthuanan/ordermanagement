DROP TRIGGER IF EXISTS sync_trigger_to_sheet ON public.thongtinxe;

DROP POLICY IF EXISTS "Allow anon read access to thongtinxe" ON public.thongtinxe;
CREATE POLICY "Allow anon read access to thongtinxe" ON public.thongtinxe FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon insert update on thongtinxe" ON public.thongtinxe;
CREATE POLICY "Allow anon insert update on thongtinxe" ON public.thongtinxe FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated all on thongtinxe" ON public.thongtinxe;
CREATE POLICY "Allow authenticated all on thongtinxe" ON public.thongtinxe FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.rpc_sync_thongtinxe(p_cars jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
BEGIN
  IF p_cars IS NULL OR jsonb_array_length(p_cars) = 0 THEN
    RETURN jsonb_build_object('status', 'ok', 'count', 0);
  END IF;

  INSERT INTO public.thongtinxe (
    inventory_id,
    vin,
    so_ton_kho,
    so_tham_chieu,
    ma_san_pham,
    phien_ban,
    khu_vuc,
    so_may,
    mo_ta,
    so_don_hang_cuoi,
    nam_san_xuat,
    ngay_nhan,
    modified_at
  )
  SELECT
    (item->>'inventory_id'),
    (item->>'vin'),
    (item->>'so_ton_kho'),
    (item->>'so_tham_chieu'),
    (item->>'ma_san_pham'),
    (item->>'phien_ban'),
    (item->>'khu_vuc'),
    (item->>'so_may'),
    (item->>'mo_ta'),
    (item->>'so_don_hang_cuoi'),
    NULLIF(item->>'nam_san_xuat', '')::integer,
    NULLIF(item->>'ngay_nhan', '')::timestamptz,
    NOW()
  FROM jsonb_array_elements(p_cars) AS item
  WHERE (item->>'vin') IS NOT NULL AND (item->>'vin') != ''
  ON CONFLICT (vin) DO UPDATE SET
    inventory_id = EXCLUDED.inventory_id,
    so_ton_kho = EXCLUDED.so_ton_kho,
    so_tham_chieu = EXCLUDED.so_tham_chieu,
    ma_san_pham = EXCLUDED.ma_san_pham,
    phien_ban = EXCLUDED.phien_ban,
    khu_vuc = EXCLUDED.khu_vuc,
    so_may = COALESCE(NULLIF(EXCLUDED.so_may, ''), thongtinxe.so_may),
    mo_ta = EXCLUDED.mo_ta,
    so_don_hang_cuoi = EXCLUDED.so_don_hang_cuoi,
    nam_san_xuat = COALESCE(EXCLUDED.nam_san_xuat, thongtinxe.nam_san_xuat),
    ngay_nhan = COALESCE(EXCLUDED.ngay_nhan, thongtinxe.ngay_nhan),
    modified_at = NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object('status', 'ok', 'count', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_sync_thongtinxe(jsonb) TO anon, authenticated, service_role;
