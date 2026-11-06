-- V8__tables_and_payment_policies.sql

-- 1. Add payment_policy to outlets table
ALTER TABLE outlets 
ADD COLUMN payment_policy VARCHAR(30) NOT NULL DEFAULT 'FLEXIBLE' 
CHECK (payment_policy IN ('PAY_FIRST', 'PAY_LATER', 'FLEXIBLE'));

-- 2. Create restaurant_tables table
CREATE TABLE restaurant_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    table_number VARCHAR(50) NOT NULL,
    name VARCHAR(100),
    capacity INT NOT NULL DEFAULT 4 CHECK (capacity > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE' 
        CHECK (status IN ('AVAILABLE', 'RUNNING', 'BILL_REQUESTED', 'PAYMENT_DUE', 'PAID_CLEARING', 'CLOSED')),
    current_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_outlet_table_number UNIQUE (outlet_id, table_number)
);

CREATE INDEX idx_tables_tenant_id ON restaurant_tables(tenant_id);
CREATE INDEX idx_tables_outlet_id ON restaurant_tables(outlet_id);
CREATE INDEX idx_tables_status ON restaurant_tables(status);
CREATE INDEX idx_tables_current_order_id ON restaurant_tables(current_order_id);

-- 3. Add table_id to orders table
ALTER TABLE orders
ADD COLUMN table_id UUID REFERENCES restaurant_tables(id) ON DELETE SET NULL;

CREATE INDEX idx_orders_table_id ON orders(table_id);
