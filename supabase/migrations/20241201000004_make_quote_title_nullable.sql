-- Make title column nullable in quotes table
-- The application doesn't use this field currently

ALTER TABLE public.quotes 
  ALTER COLUMN title DROP NOT NULL;

-- Add comment explaining
COMMENT ON COLUMN quotes.title IS 'Optional title for quote (currently unused, defaults to quote number)';
