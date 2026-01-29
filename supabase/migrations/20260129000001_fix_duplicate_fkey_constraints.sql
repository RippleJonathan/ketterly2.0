-- =====================================================
-- Fix Duplicate Foreign Key Constraints on Leads Table
-- =====================================================
-- 
-- Issue: When we renamed assigned_to → sales_rep_id, PostgreSQL kept 
-- the old constraint name (leads_assigned_to_fkey), causing ambiguous 
-- relationship errors in PostgREST queries.
--
-- This migration drops the old constraint and ensures proper naming.

-- Step 1: Drop old assigned_to foreign key constraint (if it exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'leads_assigned_to_fkey' 
    AND table_name = 'leads'
  ) THEN
    ALTER TABLE public.leads DROP CONSTRAINT leads_assigned_to_fkey;
    RAISE NOTICE 'Dropped old leads_assigned_to_fkey constraint';
  END IF;
END $$;

-- Step 2: Ensure proper sales_rep_id foreign key exists with correct name
DO $$ 
BEGIN
  -- Drop if exists, then recreate with correct name
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'leads_sales_rep_id_fkey' 
    AND table_name = 'leads'
  ) THEN
    ALTER TABLE public.leads DROP CONSTRAINT leads_sales_rep_id_fkey;
  END IF;
  
  -- Create with proper name
  ALTER TABLE public.leads 
    ADD CONSTRAINT leads_sales_rep_id_fkey 
    FOREIGN KEY (sales_rep_id) 
    REFERENCES public.users(id);
    
  RAISE NOTICE 'Created leads_sales_rep_id_fkey constraint';
END $$;

-- Step 3: Verify all lead assignment constraints are properly named
DO $$ 
BEGIN
  -- Ensure marketing_rep_id has proper constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'leads_marketing_rep_id_fkey' 
    AND table_name = 'leads'
  ) THEN
    ALTER TABLE public.leads 
      ADD CONSTRAINT leads_marketing_rep_id_fkey 
      FOREIGN KEY (marketing_rep_id) 
      REFERENCES public.users(id);
    RAISE NOTICE 'Created leads_marketing_rep_id_fkey constraint';
  END IF;

  -- Ensure sales_manager_id has proper constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'leads_sales_manager_id_fkey' 
    AND table_name = 'leads'
  ) THEN
    ALTER TABLE public.leads 
      ADD CONSTRAINT leads_sales_manager_id_fkey 
      FOREIGN KEY (sales_manager_id) 
      REFERENCES public.users(id);
    RAISE NOTICE 'Created leads_sales_manager_id_fkey constraint';
  END IF;

  -- Ensure production_manager_id has proper constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'leads_production_manager_id_fkey' 
    AND table_name = 'leads'
  ) THEN
    ALTER TABLE public.leads 
      ADD CONSTRAINT leads_production_manager_id_fkey 
      FOREIGN KEY (production_manager_id) 
      REFERENCES public.users(id);
    RAISE NOTICE 'Created leads_production_manager_id_fkey constraint';
  END IF;

  -- Ensure created_by has proper constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'leads_created_by_fkey' 
    AND table_name = 'leads'
  ) THEN
    ALTER TABLE public.leads 
      ADD CONSTRAINT leads_created_by_fkey 
      FOREIGN KEY (created_by) 
      REFERENCES public.users(id);
    RAISE NOTICE 'Created leads_created_by_fkey constraint';
  END IF;

  -- Ensure location_id has proper constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'leads_location_id_fkey' 
    AND table_name = 'leads'
  ) THEN
    ALTER TABLE public.leads 
      ADD CONSTRAINT leads_location_id_fkey 
      FOREIGN KEY (location_id) 
      REFERENCES public.locations(id);
    RAISE NOTICE 'Created leads_location_id_fkey constraint';
  END IF;
END $$;

-- Step 4: Verify final constraint names
SELECT 
  constraint_name,
  table_name,
  'Foreign key constraint' as type
FROM information_schema.table_constraints
WHERE table_name = 'leads' 
  AND constraint_type = 'FOREIGN KEY'
ORDER BY constraint_name;
