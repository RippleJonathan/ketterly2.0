-- Door Knock Map Feature Migration
-- This migration creates the door_knock_pins table and related functionality

-- =====================================================
-- DOOR KNOCK PINS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.door_knock_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  location_id UUID REFERENCES locations(id),
  created_by UUID REFERENCES users(id) NOT NULL,
  
  -- Geographic coordinates
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT,
  
  -- Pin status and type
  pin_type TEXT NOT NULL DEFAULT 'not_home' CHECK (pin_type IN (
    'not_home',           -- No one answered
    'not_interested',     -- Declined service
    'follow_up',          -- Interested, need follow-up
    'appointment_set',    -- Appointment scheduled
    'lead_created',       -- Converted to lead
    'existing_customer',  -- Already a customer
    'callback_requested', -- Asked to be called back
    'do_not_contact'      -- Do not contact again
  )),
  
  -- Contact information (optional)
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  
  -- Notes and interaction details
  notes TEXT,
  interaction_date TIMESTAMPTZ DEFAULT NOW(),
  
  -- Related entities
  lead_id UUID REFERENCES leads(id),
  appointment_id UUID REFERENCES calendar_events(id),
  
  -- Metadata
  device_location_accuracy DECIMAL(10, 2), -- GPS accuracy in meters
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX idx_door_knock_pins_company_id ON door_knock_pins(company_id);
CREATE INDEX idx_door_knock_pins_location_id ON door_knock_pins(location_id);
CREATE INDEX idx_door_knock_pins_created_by ON door_knock_pins(created_by);
CREATE INDEX idx_door_knock_pins_pin_type ON door_knock_pins(pin_type);
CREATE INDEX idx_door_knock_pins_lead_id ON door_knock_pins(lead_id);
CREATE INDEX idx_door_knock_pins_interaction_date ON door_knock_pins(interaction_date);
CREATE INDEX idx_door_knock_pins_deleted_at ON door_knock_pins(deleted_at);

-- Spatial index for geographic queries (requires PostGIS extension)
-- CREATE INDEX idx_door_knock_pins_location ON door_knock_pins USING GIST (
--   ST_MakePoint(longitude::double precision, latitude::double precision)
-- );

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE door_knock_pins ENABLE ROW LEVEL SECURITY;

-- Users can view pins from their company
CREATE POLICY "Users can view their company's door knock pins"
  ON door_knock_pins
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM users 
      WHERE id = auth.uid()
    )
  );

-- Users can insert pins for their company
CREATE POLICY "Users can create door knock pins for their company"
  ON door_knock_pins
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM users 
      WHERE id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Users can update their own pins or pins in their location (if they have permission)
CREATE POLICY "Users can update door knock pins"
  ON door_knock_pins
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id 
      FROM users 
      WHERE id = auth.uid()
    )
    AND (
      created_by = auth.uid()
      OR
      -- Location managers can edit all pins in their location
      location_id IN (
        SELECT location_id
        FROM location_users
        WHERE user_id = auth.uid()
        AND (role = 'location_admin' OR role = 'office_manager')
      )
      OR
      -- Admins can edit all company pins
      EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND company_id = door_knock_pins.company_id
        AND role IN ('super_admin', 'admin')
      )
    )
  );

-- Users can soft delete their own pins
CREATE POLICY "Users can delete their own door knock pins"
  ON door_knock_pins
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id 
      FROM users 
      WHERE id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_door_knock_pins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_door_knock_pins_timestamp
  BEFORE UPDATE ON door_knock_pins
  FOR EACH ROW
  EXECUTE FUNCTION update_door_knock_pins_updated_at();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get pins within a radius (in kilometers)
CREATE OR REPLACE FUNCTION get_door_knock_pins_in_radius(
  p_company_id UUID,
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_radius_km DECIMAL DEFAULT 5.0
)
RETURNS TABLE (
  id UUID,
  latitude DECIMAL,
  longitude DECIMAL,
  pin_type TEXT,
  contact_name TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dkp.id,
    dkp.latitude,
    dkp.longitude,
    dkp.pin_type,
    dkp.contact_name,
    dkp.notes,
    dkp.created_by,
    dkp.created_at,
    -- Haversine formula for distance calculation
    (
      6371 * acos(
        cos(radians(p_latitude)) * 
        cos(radians(dkp.latitude)) * 
        cos(radians(dkp.longitude) - radians(p_longitude)) + 
        sin(radians(p_latitude)) * 
        sin(radians(dkp.latitude))
      )
    )::DECIMAL AS distance_km
  FROM door_knock_pins dkp
  WHERE 
    dkp.company_id = p_company_id
    AND dkp.deleted_at IS NULL
    AND (
      6371 * acos(
        cos(radians(p_latitude)) * 
        cos(radians(dkp.latitude)) * 
        cos(radians(dkp.longitude) - radians(p_longitude)) + 
        sin(radians(p_latitude)) * 
        sin(radians(dkp.latitude))
      )
    ) <= p_radius_km
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pin statistics by user
CREATE OR REPLACE FUNCTION get_door_knock_stats(
  p_company_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  pin_type TEXT,
  count BIGINT,
  conversion_rate DECIMAL
) AS $$
DECLARE
  v_total_pins BIGINT;
BEGIN
  -- Get total pins for conversion rate calculation
  SELECT COUNT(*)
  INTO v_total_pins
  FROM door_knock_pins
  WHERE 
    company_id = p_company_id
    AND (p_user_id IS NULL OR created_by = p_user_id)
    AND (p_start_date IS NULL OR interaction_date >= p_start_date)
    AND (p_end_date IS NULL OR interaction_date <= p_end_date)
    AND deleted_at IS NULL;

  RETURN QUERY
  SELECT 
    dkp.pin_type,
    COUNT(*)::BIGINT,
    CASE 
      WHEN v_total_pins > 0 THEN (COUNT(*)::DECIMAL / v_total_pins * 100)
      ELSE 0
    END AS conversion_rate
  FROM door_knock_pins dkp
  WHERE 
    dkp.company_id = p_company_id
    AND (p_user_id IS NULL OR dkp.created_by = p_user_id)
    AND (p_start_date IS NULL OR dkp.interaction_date >= p_start_date)
    AND (p_end_date IS NULL OR dkp.interaction_date <= p_end_date)
    AND dkp.deleted_at IS NULL
  GROUP BY dkp.pin_type
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ACTIVITY LOG INTEGRATION
-- =====================================================

-- Automatically create activity when a pin converts to a lead
CREATE OR REPLACE FUNCTION log_door_knock_lead_conversion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log when lead_id is added (conversion happens)
  IF NEW.lead_id IS NOT NULL AND (OLD.lead_id IS NULL OR OLD.lead_id != NEW.lead_id) THEN
    INSERT INTO activities (
      company_id,
      entity_type,
      entity_id,
      activity_type,
      title,
      description,
      created_by,
      metadata
    ) VALUES (
      NEW.company_id,
      'lead',
      NEW.lead_id,
      'note',
      'Door Knock Conversion',
      CONCAT('Lead created from door knock at ', NEW.address),
      NEW.created_by,
      jsonb_build_object(
        'door_knock_pin_id', NEW.id,
        'latitude', NEW.latitude,
        'longitude', NEW.longitude,
        'original_pin_type', OLD.pin_type
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_door_knock_conversion
  AFTER UPDATE ON door_knock_pins
  FOR EACH ROW
  EXECUTE FUNCTION log_door_knock_lead_conversion();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON door_knock_pins TO authenticated;
GRANT EXECUTE ON FUNCTION get_door_knock_pins_in_radius TO authenticated;
GRANT EXECUTE ON FUNCTION get_door_knock_stats TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE door_knock_pins IS 'Tracks door-to-door marketing pins on the map for lead generation';
COMMENT ON COLUMN door_knock_pins.pin_type IS 'Status of the door knock interaction';
COMMENT ON COLUMN door_knock_pins.device_location_accuracy IS 'GPS accuracy in meters from the mobile device';
COMMENT ON FUNCTION get_door_knock_pins_in_radius IS 'Returns all pins within a specified radius using Haversine formula';
COMMENT ON FUNCTION get_door_knock_stats IS 'Returns statistics about door knock pins by type';
