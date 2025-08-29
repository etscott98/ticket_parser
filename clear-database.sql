-- Clear all RMA ticket data to allow reprocessing
DELETE FROM rma_tickets;

-- Reset any sequences (if applicable)
-- This will start fresh with clean data

-- Verify the table is empty
SELECT COUNT(*) as remaining_tickets FROM rma_tickets;
