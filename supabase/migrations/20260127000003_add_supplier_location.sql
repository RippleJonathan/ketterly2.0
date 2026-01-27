-- Add location filtering to suppliers
-- =====================================================

-- Add location_id column to specify which location a supplier is associated with
ALTER TABLE public.suppliers
ADD COLUMN location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

-- Add index for faster location-based queries
CREATE INDEX idx_suppliers_location_id ON suppliers(location_id);

-- Add comment
COMMENT ON COLUMN suppliers.location_id IS 'Location this supplier is associated with. If null, supplier is available to all locations (company-wide).';
