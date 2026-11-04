import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

token = os.environ.get('SUPABASE_ACCESS_TOKEN')
ref = 'jwvgxqrkjlbewvpkvucj'

def run_query(sql):
    resp = requests.post(
        f"https://api.supabase.com/v1/projects/{ref}/database/query",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"query": sql},
        timeout=30
    )
    if resp.status_code != 200 and resp.status_code != 201:
        raise Exception(f"HTTP {resp.status_code}: {resp.text}")
    return resp.json()

def main():
    print("=== KIỂM TRA SỐ LƯỢNG BẢN GHI CE18 TRƯỚC KHI CẬP NHẬT ===")
    
    check_sql = """
    SELECT 'donhang' as table_name, count(*) as cnt 
    FROM public.donhang 
    WHERE ngoai_that IN ('Brahminy White (CE18)', 'Infinity Blanc (CE18)')
    UNION ALL
    SELECT 'khoxe', count(*) 
    FROM public.khoxe 
    WHERE ngoai_that IN ('Brahminy White (CE18)', 'Infinity Blanc (CE18)')
    UNION ALL
    SELECT 'yeucauxhd', count(*) 
    FROM public.yeucauxhd 
    WHERE ngoai_that IN ('Brahminy White (CE18)', 'Infinity Blanc (CE18)')
    UNION ALL
    SELECT 'archived_orders', count(*) 
    FROM public.archived_orders 
    WHERE ngoai_that IN ('Brahminy White (CE18)', 'Infinity Blanc (CE18)')
    UNION ALL
    SELECT 'vehicle_configs', count(*) 
    FROM public.vehicle_configs 
    WHERE value IN ('Brahminy White (CE18)', 'Infinity Blanc (CE18)');
    """
    
    before_stats = run_query(check_sql)
    print("Thống kê số lượng cần cập nhật:", json.dumps(before_stats, ensure_ascii=False, indent=2))
    
    print("\n=== TIẾN HÀNH CẬP NHẬT SANG 'White (CE18)' ===")
    
    update_sql = """
    DO $$
    DECLARE
        v_updated_donhang INT;
        v_updated_khoxe INT;
        v_updated_yeucauxhd INT;
        v_updated_archived INT;
        v_updated_configs INT;
        v_updated_flex INT;
    BEGIN
        -- 1. Cập nhật donhang
        UPDATE public.donhang
        SET ngoai_that = 'White (CE18)'
        WHERE ngoai_that IN ('Brahminy White (CE18)', 'Infinity Blanc (CE18)');
        GET DIAGNOSTICS v_updated_donhang = ROW_COUNT;

        -- Cập nhật mảng ngoai_that_flex trong donhang nếu có
        UPDATE public.donhang
        SET ngoai_that_flex = array_replace(array_replace(ngoai_that_flex, 'Brahminy White (CE18)', 'White (CE18)'), 'Infinity Blanc (CE18)', 'White (CE18)')
        WHERE ngoai_that_flex IS NOT NULL 
          AND ('Brahminy White (CE18)' = ANY(ngoai_that_flex) OR 'Infinity Blanc (CE18)' = ANY(ngoai_that_flex));
        GET DIAGNOSTICS v_updated_flex = ROW_COUNT;

        -- 2. Cập nhật khoxe
        UPDATE public.khoxe
        SET ngoai_that = 'White (CE18)'
        WHERE ngoai_that IN ('Brahminy White (CE18)', 'Infinity Blanc (CE18)');
        GET DIAGNOSTICS v_updated_khoxe = ROW_COUNT;

        -- 3. Cập nhật yeucauxhd
        UPDATE public.yeucauxhd
        SET ngoai_that = 'White (CE18)'
        WHERE ngoai_that IN ('Brahminy White (CE18)', 'Infinity Blanc (CE18)');
        GET DIAGNOSTICS v_updated_yeucauxhd = ROW_COUNT;

        -- 4. Cập nhật archived_orders
        UPDATE public.archived_orders
        SET ngoai_that = 'White (CE18)'
        WHERE ngoai_that IN ('Brahminy White (CE18)', 'Infinity Blanc (CE18)');
        GET DIAGNOSTICS v_updated_archived = ROW_COUNT;

        -- 5. Cập nhật vehicle_configs
        UPDATE public.vehicle_configs
        SET value = 'White (CE18)'
        WHERE value IN ('Brahminy White (CE18)', 'Infinity Blanc (CE18)');
        GET DIAGNOSTICS v_updated_configs = ROW_COUNT;

        RAISE NOTICE 'Updated: donhang=%, flex=%, khoxe=%, yeucauxhd=%, archived=%, configs=%', 
            v_updated_donhang, v_updated_flex, v_updated_khoxe, v_updated_yeucauxhd, v_updated_archived, v_updated_configs;
    END $$;
    """
    
    update_res = run_query(update_sql)
    print("Kết quả chạy UPDATE:", update_res)

    print("\n=== KIỂM TRA LẠI SỐ LƯỢNG SAU KHI CẬP NHẬT ===")
    verify_sql = """
    SELECT 'donhang' as table_name, count(*) as cnt_white_ce18 
    FROM public.donhang 
    WHERE ngoai_that = 'White (CE18)'
    UNION ALL
    SELECT 'khoxe', count(*) 
    FROM public.khoxe 
    WHERE ngoai_that = 'White (CE18)'
    UNION ALL
    SELECT 'yeucauxhd', count(*) 
    FROM public.yeucauxhd 
    WHERE ngoai_that = 'White (CE18)'
    UNION ALL
    SELECT 'archived_orders', count(*) 
    FROM public.archived_orders 
    WHERE ngoai_that = 'White (CE18)'
    UNION ALL
    SELECT 'vehicle_configs', count(*) 
    FROM public.vehicle_configs 
    WHERE value = 'White (CE18)';
    """
    after_stats = run_query(verify_sql)
    print("Thống kê số lượng 'White (CE18)':", json.dumps(after_stats, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
