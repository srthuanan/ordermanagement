-- Migration: Auto sync engine numbers (số máy) to orders and invoices
-- Trigger push from thongtinxe/khoxe to donhang/yeucauxhd

-- 1. Function to push engine number to related tables when a car is inserted/updated
CREATE OR REPLACE FUNCTION public.push_engine_to_orders() RETURNS TRIGGER AS $$
BEGIN
   IF NEW.so_may IS NOT NULL AND NEW.so_may != '' THEN
      -- Update donhang
      UPDATE public.donhang 
      SET so_may = NEW.so_may 
      WHERE vin = NEW.vin AND (so_may IS NULL OR so_may = '');
      
      -- Update yeucauxhd
      UPDATE public.yeucauxhd 
      SET so_may = NEW.so_may 
      WHERE vin = NEW.vin AND (so_may IS NULL OR so_may = '');
   END IF;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on thongtinxe
DROP TRIGGER IF EXISTS trigger_push_engine_to_orders ON public.thongtinxe;
CREATE TRIGGER trigger_push_engine_to_orders
AFTER INSERT OR UPDATE OF so_may ON public.thongtinxe
FOR EACH ROW EXECUTE PROCEDURE public.push_engine_to_orders();

-- Trigger on khoxe
DROP TRIGGER IF EXISTS trigger_push_engine_from_khoxe ON public.khoxe;
CREATE TRIGGER trigger_push_engine_from_khoxe
AFTER INSERT OR UPDATE OF so_may ON public.khoxe
FOR EACH ROW EXECUTE PROCEDURE public.push_engine_to_orders();


-- 2. Function to pull engine number when yeucauxhd is inserted/updated with a VIN
CREATE OR REPLACE FUNCTION public.set_engine_for_yeucauxhd() RETURNS TRIGGER AS $$
BEGIN
   IF NEW.vin IS NOT NULL AND (NEW.so_may IS NULL OR NEW.so_may = '') THEN
      SELECT so_may INTO NEW.so_may FROM public.thongtinxe WHERE vin = NEW.vin LIMIT 1;
      
      -- If still null, try from khoxe
      IF NEW.so_may IS NULL OR NEW.so_may = '' THEN
          SELECT so_may INTO NEW.so_may FROM public.khoxe WHERE vin = NEW.vin LIMIT 1;
      END IF;
   END IF;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on yeucauxhd
DROP TRIGGER IF EXISTS trigger_update_engine_yeucauxhd ON public.yeucauxhd;
CREATE TRIGGER trigger_update_engine_yeucauxhd
BEFORE INSERT OR UPDATE OF vin ON public.yeucauxhd
FOR EACH ROW EXECUTE PROCEDURE public.set_engine_for_yeucauxhd();


-- 3. Enhance existing trigger for donhang to also check khoxe as fallback
CREATE OR REPLACE FUNCTION public.set_engine_from_thongtinxe() RETURNS TRIGGER AS $$
BEGIN
   IF NEW.vin IS NOT NULL AND (NEW.so_may IS NULL OR NEW.so_may = '') THEN
      SELECT so_may INTO NEW.so_may FROM public.thongtinxe WHERE vin = NEW.vin LIMIT 1;
      
      -- Fallback to khoxe
      IF NEW.so_may IS NULL OR NEW.so_may = '' THEN
          SELECT so_may INTO NEW.so_may FROM public.khoxe WHERE vin = NEW.vin LIMIT 1;
      END IF;
   END IF;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- (Trigger trigger_update_engine already exists on donhang and will use this updated function)

-- 4. Immediate Backfill to ensure consistency right now
UPDATE public.donhang d
SET so_may = COALESCE(t.so_may, k.so_may)
FROM public.donhang d2
LEFT JOIN public.thongtinxe t ON t.vin = d2.vin AND t.so_may IS NOT NULL AND t.so_may != ''
LEFT JOIN public.khoxe k ON k.vin = d2.vin AND k.so_may IS NOT NULL AND k.so_may != ''
WHERE d.so_don_hang = d2.so_don_hang 
  AND d.vin IS NOT NULL 
  AND (d.so_may IS NULL OR d.so_may = '') 
  AND (t.so_may IS NOT NULL OR k.so_may IS NOT NULL);

UPDATE public.yeucauxhd y
SET so_may = COALESCE(t.so_may, k.so_may)
FROM public.yeucauxhd y2
LEFT JOIN public.thongtinxe t ON t.vin = y2.vin AND t.so_may IS NOT NULL AND t.so_may != ''
LEFT JOIN public.khoxe k ON k.vin = y2.vin AND k.so_may IS NOT NULL AND k.so_may != ''
WHERE y.id = y2.id 
  AND y.vin IS NOT NULL 
  AND (y.so_may IS NULL OR y.so_may = '') 
  AND (t.so_may IS NOT NULL OR k.so_may IS NOT NULL);
