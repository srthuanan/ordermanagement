-- Tạo hàm RPC tìm kiếm tất cả các bảng trong lược đồ public
CREATE OR REPLACE FUNCTION global_search_all(search_keyword text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    tbl RECORD;
    col RECORD;
    query text;
    json_result jsonb := '{}'::jsonb;
    tbl_data jsonb;
    has_condition boolean;
BEGIN
    -- Vòng lặp qua tất cả các bảng trong schema public
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
    LOOP
        has_condition := false;
        query := 'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (SELECT * FROM ' || quote_ident(tbl.table_name) || ' WHERE ';
        
        -- Vòng lặp qua các cột kiểu chữ của bảng hiện tại
        FOR col IN 
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = tbl.table_name 
              AND data_type IN ('text', 'character varying', 'uuid')
        LOOP
            IF has_condition THEN
                query := query || ' OR ';
            END IF;
            query := query || quote_ident(col.column_name) || '::text ILIKE ' || quote_literal('%' || search_keyword || '%');
            has_condition := true;
        END LOOP;
        
        -- Nếu bảng không có cột text nào, bỏ qua
        IF NOT has_condition THEN
            CONTINUE;
        END IF;

        query := query || ' LIMIT 50) t';
        
        -- Thực thi câu lệnh SQL động
        EXECUTE query INTO tbl_data;
        
        -- Chỉ thêm vào kết quả nếu có dữ liệu
        IF tbl_data IS NOT NULL AND jsonb_array_length(tbl_data) > 0 THEN
            json_result := jsonb_set(json_result, ARRAY[tbl.table_name], tbl_data);
        END IF;
    END LOOP;
    
    RETURN json_result;
END;
$$;
