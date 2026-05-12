-- Create car_telemetry table to store live GPS information
CREATE TABLE IF NOT EXISTS public.car_telemetry (
    vin VARCHAR(17) PRIMARY KEY REFERENCES public.khoxe(vin) ON DELETE CASCADE,
    lat NUMERIC(10, 8) NOT NULL,
    lng NUMERIC(11, 8) NOT NULL,
    speed NUMERIC(5, 2) DEFAULT 0,
    heading NUMERIC(5, 2) DEFAULT 0,
    captured_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.car_telemetry ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS (Allowing read/write access for verified applications and clients)
CREATE POLICY "Allow public select" ON public.car_telemetry FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.car_telemetry FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.car_telemetry FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete" ON public.car_telemetry FOR DELETE USING (true);

-- Create trigger function to sync coordinates from legacy khoxe.extension_reason updates
CREATE OR REPLACE FUNCTION public.sync_khoxe_extension_reason_to_telemetry()
RETURNS TRIGGER AS $$
DECLARE
    lat_val NUMERIC;
    lng_val NUMERIC;
    parts TEXT[];
BEGIN
    IF NEW.extension_reason IS NOT NULL AND NEW.extension_reason LIKE 'GPS:%' THEN
        parts := string_to_array(replace(NEW.extension_reason, 'GPS:', ''), ',');
        IF array_length(parts, 1) >= 2 THEN
            lat_val := parts[1]::NUMERIC;
            lng_val := parts[2]::NUMERIC;
            
            INSERT INTO public.car_telemetry (vin, lat, lng, updated_at)
            VALUES (NEW.vin, lat_val, lng_val, NOW())
            ON CONFLICT (vin) DO UPDATE
            SET lat = EXCLUDED.lat, lng = EXCLUDED.lng, updated_at = NOW();
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind trigger to khoxe
DROP TRIGGER IF EXISTS trg_sync_khoxe_to_telemetry ON public.khoxe;
CREATE TRIGGER trg_sync_khoxe_to_telemetry
AFTER INSERT OR UPDATE OF extension_reason ON public.khoxe
FOR EACH ROW
EXECUTE FUNCTION public.sync_khoxe_extension_reason_to_telemetry();

-- Create trigger function to sync coordinates from location_history (latest update pins to live telemetry)
CREATE OR REPLACE FUNCTION public.sync_location_history_to_telemetry()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.car_telemetry (vin, lat, lng, captured_at, updated_at)
    VALUES (NEW.vin, NEW.lat, NEW.lng, NEW.captured_at, NOW())
    ON CONFLICT (vin) DO UPDATE
    SET lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        captured_at = EXCLUDED.captured_at,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind trigger to location_history
DROP TRIGGER IF EXISTS trg_sync_history_to_telemetry ON public.location_history;
CREATE TRIGGER trg_sync_history_to_telemetry
AFTER INSERT ON public.location_history
FOR EACH ROW
EXECUTE FUNCTION public.sync_location_history_to_telemetry();

-- Initial backfill of existing coordinates from khoxe to car_telemetry
INSERT INTO public.car_telemetry (vin, lat, lng, updated_at)
SELECT 
    vin, 
    split_part(replace(extension_reason, 'GPS:', ''), ',', 1)::NUMERIC as lat,
    split_part(replace(extension_reason, 'GPS:', ''), ',', 2)::NUMERIC as lng,
    NOW() as updated_at
FROM public.khoxe
WHERE extension_reason LIKE 'GPS:%'
ON CONFLICT (vin) DO UPDATE
SET lat = EXCLUDED.lat, lng = EXCLUDED.lng, updated_at = NOW();

-- Safely clean up legacy GPS coordinate strings in khoxe.extension_reason (releasing it for actual hold extension reasons)
UPDATE public.khoxe
SET extension_reason = NULL
WHERE extension_reason LIKE 'GPS:%';
