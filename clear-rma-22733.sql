-- Clear specific RMA ticket to force reprocessing
DELETE FROM rma_tickets WHERE rma_number = '22733';

-- Verify the record was deleted
SELECT COUNT(*) as remaining_tickets FROM rma_tickets WHERE rma_number = '22733';
