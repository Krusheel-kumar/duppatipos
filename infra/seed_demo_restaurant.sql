DO $$
DECLARE
    v_tenant_id UUID := '11111111-1111-1111-1111-111111111111';
    v_outlet_id UUID := '22222222-2222-2222-2222-222222222222';
    v_user_id   UUID := '33333333-3333-3333-3333-333333333333';
    v_role_id   UUID := '44444444-4444-4444-4444-444444444444';
    v_cat_bev   UUID := '55555555-5555-5555-5555-555555555551';
    v_cat_food  UUID := '55555555-5555-5555-5555-555555555552';
    v_prod1     UUID := '66666666-6666-6666-6666-666666666661';
    v_prod2     UUID := '66666666-6666-6666-6666-666666666662';
    v_addon1    UUID := '77777777-7777-7777-7777-777777777771';
    v_addon2    UUID := '77777777-7777-7777-7777-777777777772';
BEGIN
    -- 1. Tenant
    INSERT INTO tenants (id, name, domain)
    VALUES (v_tenant_id, 'Krunnex Flagship Café', 'krunnex-cafe.local')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

    -- 2. Outlet
    INSERT INTO outlets (id, tenant_id, name)
    VALUES (v_outlet_id, v_tenant_id, 'Downtown Flagship Outlet')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

    -- 3. Role
    INSERT INTO roles (id, tenant_id, name)
    VALUES (v_role_id, v_tenant_id, 'OWNER')
    ON CONFLICT (id) DO NOTHING;

    -- 4. User (admin@krunnex.com / password123)
    INSERT INTO users (id, email, password_hash, first_name, last_name)
    VALUES (v_user_id, 'admin@krunnex.com', '$2a$10$8Vf/fZMVFvjLU2ARj7iQXuuYNERUZxBBsUuLKJUukFCliwkBLir9O', 'Krunnex', 'Admin')
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

    -- 5. Tenant Membership
    INSERT INTO tenant_memberships (id, user_id, tenant_id, role_id)
    VALUES (gen_random_uuid(), v_user_id, v_tenant_id, v_role_id)
    ON CONFLICT (user_id, tenant_id) DO NOTHING;

    -- 6. Outlet Membership
    INSERT INTO outlet_memberships (id, user_id, outlet_id, role_id)
    VALUES (gen_random_uuid(), v_user_id, v_outlet_id, v_role_id)
    ON CONFLICT (user_id, outlet_id) DO NOTHING;

    -- 7. Categories
    INSERT INTO product_categories (id, tenant_id, name, description, display_order, is_active)
    VALUES 
        (v_cat_bev, v_tenant_id, 'Specialty Beverages', 'Handcrafted coffee, teas, and boba', 1, true),
        (v_cat_food, v_tenant_id, 'Bakery & Food', 'Freshly baked pastries and snacks', 2, true)
    ON CONFLICT (id) DO NOTHING;

    -- 8. Add-ons
    INSERT INTO add_ons (id, tenant_id, name, price, is_active)
    VALUES
        (v_addon1, v_tenant_id, 'Brown Sugar Tapioca Pearls', 0.75, true),
        (v_addon2, v_tenant_id, 'Extra Espresso Shot', 1.25, true)
    ON CONFLICT (id) DO NOTHING;

    -- 9. Products
    INSERT INTO products (id, tenant_id, category_id, name, description, base_price, is_active, sku)
    VALUES
        (v_prod1, v_tenant_id, v_cat_bev, 'Signature Brown Sugar Boba', 'Fresh organic milk, Ceylon tea, slow-cooked boba', 5.50, true, 'BOBA-SIG-01'),
        (v_prod2, v_tenant_id, v_cat_food, 'Butter Croissant', 'Flaky artisan French butter croissant', 3.75, true, 'FOOD-CROIS-01')
    ON CONFLICT (id) DO NOTHING;

    -- 10. Product Variants
    INSERT INTO product_variants (id, tenant_id, product_id, name, size_label, price, sku, is_active, display_order)
    VALUES
        (gen_random_uuid(), v_tenant_id, v_prod1, 'Regular 16oz', '16 oz', 5.50, 'BOBA-SIG-16', true, 1),
        (gen_random_uuid(), v_tenant_id, v_prod1, 'Large 24oz', '24 oz', 6.75, 'BOBA-SIG-24', true, 2)
    ON CONFLICT DO NOTHING;

    -- 11. Product Addon links
    INSERT INTO product_add_ons (product_id, add_on_id)
    VALUES (v_prod1, v_addon1), (v_prod1, v_addon2)
    ON CONFLICT DO NOTHING;

END $$;
