-- Migration: Update all foreign keys referencing khoxe(vin) to ON UPDATE CASCADE
-- Created: 2026-06-24

DO $$
DECLARE
    r RECORD;
    drop_stmt TEXT;
    add_stmt TEXT;
BEGIN
    FOR r IN
        SELECT
            tc.table_schema,
            tc.table_name,
            tc.constraint_name,
            kcu.column_name,
            ccu.table_schema AS foreign_table_schema,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            rc.delete_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints rc
          ON tc.constraint_name = rc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_name = 'khoxe'
          AND ccu.column_name = 'vin'
    LOOP
        -- 1. Xóa constraint hiện tại (chỉ có ON DELETE CASCADE, thiếu ON UPDATE CASCADE)
        drop_stmt := format('ALTER TABLE %I.%I DROP CONSTRAINT %I;',
                             r.table_schema, r.table_name, r.constraint_name);
        EXECUTE drop_stmt;

        -- 2. Tạo lại constraint mới với ON UPDATE CASCADE
        -- Vẫn giữ nguyên quy tắc ON DELETE cũ (ví dụ: CASCADE, RESTRICT, v.v.)
        add_stmt := format('ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I.%I (%I) ON DELETE %s ON UPDATE CASCADE;',
                            r.table_schema, r.table_name, r.constraint_name,
                            r.column_name, r.foreign_table_schema, r.foreign_table_name, r.foreign_column_name,
                            r.delete_rule);
        EXECUTE add_stmt;
    END LOOP;
END;
$$;
