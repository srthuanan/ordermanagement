-- Fix: yeucauxhd RLS policy thiếu WITH CHECK nên INSERT bị 403
-- Policy "FOR ALL USING (true)" không cover INSERT, phải có WITH CHECK (true)

DROP POLICY IF EXISTS "Allow public full access on yeucauxhd" ON public.yeucauxhd;

-- Tạo lại với đầy đủ USING + WITH CHECK để cover cả INSERT
CREATE POLICY "Allow public full access on yeucauxhd"
  ON public.yeucauxhd
  FOR ALL
  USING (true)
  WITH CHECK (true);
