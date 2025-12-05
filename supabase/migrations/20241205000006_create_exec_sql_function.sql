-- =============================================
-- Migration: Create exec_sql RPC function
-- Created: 2024-12-05
-- Description: Creates a function to execute arbitrary SQL (for migrations)
-- =============================================

-- Create the exec_sql function for running migrations
CREATE OR REPLACE FUNCTION public.exec_sql(sql TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
  RETURN 'OK';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'ERROR: ' || SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.exec_sql IS 'Execute arbitrary SQL for migrations. SECURITY DEFINER allows service role to run this.';
