-- V5__order_management.sql

-- 1. Orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    order_number VARCHAR(50) NOT NULL,
    idempotency_key VARCHAR(100),
    order_type VARCHAR(30) NOT NULL CHECK (order_type IN ('DINE_IN', 'TAKEAWAY', 'COUNTER')),
    status VARCHAR(30) NOT NULL CHECK (status IN ('CREATED', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED')),
    customer_notes TEXT,
    cancellation_reason TEXT,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    taxable_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (taxable_amount >= 0),
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    discount_id UUID REFERENCES discounts(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_order_tenant_number UNIQUE (tenant_id, order_number),
    CONSTRAINT uk_order_outlet_idempotency UNIQUE (outlet_id, idempotency_key)
);
CREATE INDEX idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX idx_orders_outlet_id ON orders(outlet_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- 2. Order Items table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    product_name_snapshot VARCHAR(200) NOT NULL,
    variant_name_snapshot VARCHAR(100),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price_snapshot NUMERIC(12, 2) NOT NULL CHECK (unit_price_snapshot >= 0),
    line_total_snapshot NUMERIC(12, 2) NOT NULL CHECK (line_total_snapshot >= 0),
    tax_rate_percent_snapshot NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    is_tax_inclusive_snapshot BOOLEAN NOT NULL DEFAULT FALSE,
    item_tax_snapshot NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    item_notes VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_tenant_id ON order_items(tenant_id);

-- 3. Order Item Add-Ons table
CREATE TABLE order_item_add_ons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    add_on_id UUID NOT NULL REFERENCES add_ons(id) ON DELETE RESTRICT,
    add_on_name_snapshot VARCHAR(150) NOT NULL,
    price_snapshot NUMERIC(12, 2) NOT NULL CHECK (price_snapshot >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_order_item_addons_item_id ON order_item_add_ons(order_item_id);
