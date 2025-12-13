-- =====================================================================
-- OPTIONAL: Archive Old Invoice System
-- Safely archive invoice tables while preserving historical data
-- =====================================================================

-- IMPORTANT: Only run this if you're SURE you don't need the invoice tables
-- This doesn't delete data, just moves it to archive tables

-- Create archive schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS archive;

-- Move invoice tables to archive schema
-- This preserves all data but removes them from active use

-- 1. Move customer_invoices to archive
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'customer_invoices'
  ) THEN
    -- Create archive table
    CREATE TABLE IF NOT EXISTS archive.customer_invoices AS 
    SELECT * FROM public.customer_invoices;
    
    -- Add archive timestamp
    ALTER TABLE archive.customer_invoices 
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NOW();
    
    RAISE NOTICE 'Archived % invoices to archive.customer_invoices', 
      (SELECT COUNT(*) FROM public.customer_invoices);
  END IF;
END $$;

-- 2. Move invoice_line_items to archive
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'invoice_line_items'
  ) THEN
    -- Create archive table
    CREATE TABLE IF NOT EXISTS archive.invoice_line_items AS 
    SELECT * FROM public.invoice_line_items;
    
    -- Add archive timestamp
    ALTER TABLE archive.invoice_line_items 
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NOW();
    
    RAISE NOTICE 'Archived % invoice line items to archive.invoice_line_items', 
      (SELECT COUNT(*) FROM public.invoice_line_items);
  END IF;
END $$;

-- 3. Keep payments table in public schema (still actively used)
-- Payments are now linked to leads, not invoices

-- OPTIONAL: Drop the public invoice tables if you're confident
-- UNCOMMENT THESE LINES ONLY IF YOU'RE SURE:
-- DROP TABLE IF EXISTS public.invoice_line_items CASCADE;
-- DROP TABLE IF EXISTS public.customer_invoices CASCADE;

-- If you keep the tables, at least disable RLS policies to prevent confusion
ALTER TABLE IF EXISTS public.customer_invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoice_line_items DISABLE ROW LEVEL SECURITY;

-- Add warning comments
COMMENT ON SCHEMA archive IS 'Contains archived tables that are no longer actively used but preserved for historical data.';

-- Add table comments (only if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'archive' AND table_name = 'customer_invoices') THEN
    EXECUTE 'COMMENT ON TABLE archive.customer_invoices IS ''Archived invoices from old invoice-centric system. Use quotes table for current estimates/invoices.''';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'archive' AND table_name = 'invoice_line_items') THEN
    EXECUTE 'COMMENT ON TABLE archive.invoice_line_items IS ''Archived invoice line items. Use quote_line_items for current line items.''';
  END IF;
END $$;

-- Success messages
DO $$
BEGIN
  RAISE NOTICE 'Invoice tables archived. Historical data preserved in archive schema.';
  RAISE NOTICE 'To fully drop old tables, uncomment DROP TABLE statements in this migration.';
END $$;
