-- V9__seed_default_tables.sql
INSERT INTO restaurant_tables (id, tenant_id, outlet_id, table_number, name, capacity, status)
VALUES 
    (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '1', 'Table 1', 2, 'AVAILABLE'),
    (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '2', 'Table 2', 4, 'AVAILABLE'),
    (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '3', 'Table 3', 4, 'AVAILABLE'),
    (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '4', 'Table 4', 6, 'AVAILABLE'),
    (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '5', 'Table 5', 2, 'AVAILABLE'),
    (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '6', 'Table 6', 8, 'AVAILABLE')
ON CONFLICT (outlet_id, table_number) DO NOTHING;
