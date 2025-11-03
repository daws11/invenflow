-- Create kanbans table
CREATE TABLE IF NOT EXISTS kanbans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('order', 'receive')),
    linked_kanban_id UUID REFERENCES kanbans(id) ON DELETE SET NULL,
    public_form_token TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for kanbans
CREATE INDEX IF NOT EXISTS kanbans_type_idx ON kanbans(type);
CREATE INDEX IF NOT EXISTS kanbans_public_form_token_idx ON kanbans(public_form_token);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kanban_id UUID NOT NULL REFERENCES kanbans(id) ON DELETE CASCADE,
    column_status TEXT NOT NULL,
    product_details TEXT NOT NULL,
    product_link TEXT,
    location TEXT,
    priority TEXT,
    stock_level INTEGER CHECK (stock_level >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for products
CREATE INDEX IF NOT EXISTS products_kanban_id_idx ON products(kanban_id);
CREATE INDEX IF NOT EXISTS products_column_status_idx ON products(column_status);

-- Create function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_kanbans_updated_at BEFORE UPDATE ON kanbans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO kanbans (name, type, public_form_token) VALUES
('Sample Order Kanban', 'order', 'sample123'),
('Sample Receive Kanban', 'receive', NULL)
ON CONFLICT DO NOTHING;

-- Link the sample kanbans
UPDATE kanbans
SET linked_kanban_id = (SELECT id FROM kanbans WHERE name = 'Sample Receive Kanban' LIMIT 1)
WHERE name = 'Sample Order Kanban' AND linked_kanban_id IS NULL
ON CONFLICT DO NOTHING;

-- Insert sample products
INSERT INTO products (kanban_id, column_status, product_details, product_link, location, priority) VALUES
((SELECT id FROM kanbans WHERE name = 'Sample Order Kanban' LIMIT 1), 'New Request', 'Office Laptop', 'https://example.com/laptop', 'Storage Room A', 'High'),
((SELECT id FROM kanbans WHERE name = 'Sample Order Kanban' LIMIT 1), 'In Review', 'Office Chair', 'https://example.com/chair', 'Storage Room B', 'Medium'),
((SELECT id FROM kanbans WHERE name = 'Sample Receive Kanban' LIMIT 1), 'Received', 'Standing Desk', 'https://example.com/desk', 'Office 101', 'Low')
ON CONFLICT DO NOTHING;