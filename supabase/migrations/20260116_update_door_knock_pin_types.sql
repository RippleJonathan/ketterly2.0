-- Update door_knock_pins table to match new simplified pin types
-- Run this migration to fix the check constraint error

-- First, update existing pins to map old types to new types
UPDATE door_knock_pins
SET pin_type = CASE pin_type
  WHEN 'lead_created' THEN 'appointment_set'
  WHEN 'existing_customer' THEN 'do_not_contact'
  WHEN 'callback_requested' THEN 'follow_up'
  ELSE pin_type
END
WHERE pin_type IN ('lead_created', 'existing_customer', 'callback_requested');

-- Drop the old constraint
ALTER TABLE door_knock_pins 
DROP CONSTRAINT IF EXISTS door_knock_pins_pin_type_check;

-- Add the new constraint with the 6 simplified pin types
ALTER TABLE door_knock_pins 
ADD CONSTRAINT door_knock_pins_pin_type_check 
CHECK (pin_type IN ('not_home', 'not_interested', 'follow_up', 'appointment_set', 'unqualified', 'do_not_contact'));

-- Add comment explaining the pin types
COMMENT ON COLUMN door_knock_pins.pin_type IS 'Type of door knock interaction:
- not_home: No one answered
- not_interested: Declined service
- follow_up: Needs follow-up
- appointment_set: Appointment scheduled
- unqualified: Does not meet criteria
- do_not_contact: Do not contact again';
