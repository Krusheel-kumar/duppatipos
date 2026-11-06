-- V7__kitchen_order_ticket_workflow.sql

-- 1. Kitchen Tickets table
CREATE TABLE kitchen_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    ticket_number VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN ('QUEUED', 'PREPARING', 'READY', 'CANCELLED')),
    order_number_snapshot VARCHAR(50) NOT NULL,
    order_type_snapshot VARCHAR(30) NOT NULL,
    customer_notes_snapshot TEXT,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_kitchen_ticket_outlet_number UNIQUE (outlet_id, ticket_number),
    CONSTRAINT uk_kitchen_ticket_order UNIQUE (order_id)
);
CREATE INDEX idx_kitchen_tickets_tenant_id ON kitchen_tickets(tenant_id);
CREATE INDEX idx_kitchen_tickets_outlet_id ON kitchen_tickets(outlet_id);
CREATE INDEX idx_kitchen_tickets_order_id ON kitchen_tickets(order_id);
CREATE INDEX idx_kitchen_tickets_status ON kitchen_tickets(status);
CREATE INDEX idx_kitchen_tickets_created_at ON kitchen_tickets(created_at);

-- 2. Kitchen Ticket Items table
CREATE TABLE kitchen_ticket_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    ticket_id UUID NOT NULL REFERENCES kitchen_tickets(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
    product_name_snapshot VARCHAR(200) NOT NULL,
    variant_name_snapshot VARCHAR(100),
    quantity INT NOT NULL CHECK (quantity > 0),
    item_notes_snapshot VARCHAR(255),
    status VARCHAR(30) NOT NULL CHECK (status IN ('QUEUED', 'PREPARING', 'READY', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_kitchen_ticket_items_ticket_id ON kitchen_ticket_items(ticket_id);
CREATE INDEX idx_kitchen_ticket_items_tenant_id ON kitchen_ticket_items(tenant_id);
CREATE INDEX idx_kitchen_ticket_items_status ON kitchen_ticket_items(status);

-- 3. Kitchen Ticket Item Add-Ons table
CREATE TABLE kitchen_ticket_item_add_ons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    ticket_item_id UUID NOT NULL REFERENCES kitchen_ticket_items(id) ON DELETE CASCADE,
    add_on_name_snapshot VARCHAR(150) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_kitchen_ticket_item_addons_item_id ON kitchen_ticket_item_add_ons(ticket_item_id);
