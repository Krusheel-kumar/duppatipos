DO $$
DECLARE
    v_order_id UUID := gen_random_uuid();
    v_ticket_id UUID := gen_random_uuid();
    v_item_id UUID := gen_random_uuid();
    v_bill_id UUID := gen_random_uuid();
    v_tenant_id UUID := '11111111-1111-1111-1111-111111111111';
    v_outlet_id UUID := '22222222-2222-2222-2222-222222222222';
    v_prod1 UUID := '66666666-6666-6666-6666-666666666661';
    v_variant_id UUID;
    v_addon1 UUID := '77777777-7777-7777-7777-777777777771';
BEGIN
    SELECT id INTO v_variant_id FROM product_variants WHERE product_id = v_prod1 LIMIT 1;

    -- Create Sample Order
    INSERT INTO orders (id, tenant_id, outlet_id, order_number, order_type, status, subtotal, discount_amount, taxable_amount, tax_amount, total_amount, customer_notes)
    VALUES (v_order_id, v_tenant_id, v_outlet_id, 'ORD-DEMO-001', 'DINE_IN', 'PREPARING', 6.25, 0.00, 6.25, 0.00, 6.25, 'Less ice, please');

    -- Order Item
    INSERT INTO order_items (id, tenant_id, order_id, product_id, variant_id, product_name_snapshot, variant_name_snapshot, unit_price_snapshot, quantity, line_total_snapshot, item_tax_snapshot, is_tax_inclusive_snapshot)
    VALUES (v_item_id, v_tenant_id, v_order_id, v_prod1, v_variant_id, 'Signature Brown Sugar Boba', 'Regular 16oz', 5.50, 1, 6.25, 0.00, false);

    -- Order Item Addon
    INSERT INTO order_item_add_ons (id, tenant_id, order_item_id, add_on_id, add_on_name_snapshot, price_snapshot)
    VALUES (gen_random_uuid(), v_tenant_id, v_item_id, v_addon1, 'Brown Sugar Tapioca Pearls', 0.75);

    -- Kitchen Ticket
    INSERT INTO kitchen_tickets (id, tenant_id, outlet_id, order_id, ticket_number, status, order_number_snapshot, order_type_snapshot, customer_notes_snapshot)
    VALUES (v_ticket_id, v_tenant_id, v_outlet_id, v_order_id, 'KOT-DEMO-101', 'PREPARING', 'ORD-DEMO-001', 'DINE_IN', 'Less ice, please');

    -- Kitchen Ticket Item
    INSERT INTO kitchen_ticket_items (id, tenant_id, ticket_id, order_item_id, product_name_snapshot, variant_name_snapshot, quantity, status, item_notes_snapshot)
    VALUES (gen_random_uuid(), v_tenant_id, v_ticket_id, v_item_id, 'Signature Brown Sugar Boba', 'Regular 16oz', 1, 'PREPARING', 'Less ice');

    -- Sample Bill
    INSERT INTO bills (id, tenant_id, outlet_id, order_id, invoice_number, status, subtotal, discount_amount, tax_amount, total_amount, paid_amount)
    VALUES (v_bill_id, v_tenant_id, v_outlet_id, v_order_id, 'INV-DEMO-501', 'ISSUED', 6.25, 0.00, 0.00, 6.25, 0.00);

END $$;
