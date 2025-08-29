-- Enable Row Level Security
ALTER DATABASE postgres SET timezone TO 'UTC';

-- Create the RMA tickets table
CREATE TABLE IF NOT EXISTS rma_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rma_number VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ticket Information
    ticket_date TIMESTAMP WITH TIME ZONE,
    customer_name TEXT,
    customer_email TEXT,
    customer_information TEXT,
    status TEXT,
    freshdesk_status_code INTEGER,
    vids_associated TEXT,
    
    -- AI Analysis Results
    primary_reason TEXT,
    specific_issue TEXT,
    customer_impact TEXT,
    timeline TEXT,
    additional_notes TEXT,
    
    -- Processing Information
    processing_status TEXT CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
    error_message TEXT,
    raw_ticket_data JSONB,
    
    -- Teams Search Results
    teams_search_results JSONB,
    teams_summary TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rma_tickets_rma_number ON rma_tickets(rma_number);
CREATE INDEX IF NOT EXISTS idx_rma_tickets_created_at ON rma_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rma_tickets_processing_status ON rma_tickets(processing_status);
CREATE INDEX IF NOT EXISTS idx_rma_tickets_primary_reason ON rma_tickets(primary_reason);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_rma_tickets_updated_at 
    BEFORE UPDATE ON rma_tickets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE rma_tickets ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust these based on your security requirements)
CREATE POLICY "Enable read access for all users" ON rma_tickets
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON rma_tickets
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON rma_tickets
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON rma_tickets
    FOR DELETE USING (true);

-- Create a view for ticket summaries
CREATE OR REPLACE VIEW rma_ticket_summary AS
SELECT 
    rma_number,
    created_at,
    ticket_date,
    customer_name,
    status,
    primary_reason,
    processing_status,
    CASE 
        WHEN vids_associated IS NOT NULL 
        THEN array_length(string_to_array(vids_associated, ', '), 1)
        ELSE 0 
    END as device_count
FROM rma_tickets
ORDER BY created_at DESC;
