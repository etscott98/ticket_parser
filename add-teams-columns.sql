-- Add Teams search columns to existing rma_tickets table
ALTER TABLE rma_tickets 
ADD COLUMN IF NOT EXISTS teams_search_results JSONB,
ADD COLUMN IF NOT EXISTS teams_summary TEXT;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'rma_tickets' 
AND column_name IN ('teams_search_results', 'teams_summary');
