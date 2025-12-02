-- Migration: Add lead checklist system for sub-statuses
-- Date: 2024-11-29
-- Description: Create checklist items table and update lead statuses to support multi-stage workflow

-- STEP 1: Migrate existing lead statuses to new stage values
-- Map old statuses to new stages:
-- 'new' stays 'new'
-- 'contacted' -> 'new' (will be a checklist item)
-- 'qualified' -> 'new' (will be a checklist item)
-- 'quote_sent' -> 'quote'
-- 'follow_up' -> 'quote'
-- 'won' -> 'production'
-- 'invoiced' -> 'invoiced'
-- 'closed' -> 'closed'
-- 'lost' stays 'lost'
-- 'archived' stays 'archived'

UPDATE leads SET status = 'new' WHERE status IN ('contacted', 'qualified');
UPDATE leads SET status = 'quote' WHERE status IN ('quote_sent', 'follow_up');
UPDATE leads SET status = 'production' WHERE status = 'won';

-- STEP 2: Update lead status constraint to new simplified stages
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check 
  CHECK (status IN ('new', 'quote', 'production', 'invoiced', 'closed', 'lost', 'archived'));

-- Create lead_checklist_items table for sub-statuses
CREATE TABLE public.lead_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('new', 'quote', 'production', 'invoiced', 'closed')),
  item_key TEXT NOT NULL, -- e.g., 'contacted', 'qualified', 'deposit_collected'
  item_label TEXT NOT NULL, -- e.g., 'Contacted', 'Qualified', 'Deposit Collected'
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(lead_id, stage, item_key)
);

-- Indexes for performance
CREATE INDEX idx_checklist_items_company_id ON lead_checklist_items(company_id);
CREATE INDEX idx_checklist_items_lead_id ON lead_checklist_items(lead_id);
CREATE INDEX idx_checklist_items_stage ON lead_checklist_items(stage);
CREATE INDEX idx_checklist_items_deleted_at ON lead_checklist_items(deleted_at);

-- Enable RLS
ALTER TABLE lead_checklist_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their company's checklist items"
  ON lead_checklist_items FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their company's checklist items"
  ON lead_checklist_items FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company's checklist items"
  ON lead_checklist_items FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their company's checklist items"
  ON lead_checklist_items FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Function to auto-create checklist items when a lead changes stage
CREATE OR REPLACE FUNCTION create_checklist_items_for_stage()
RETURNS TRIGGER AS $$
DECLARE
  stage_items JSONB;
BEGIN
  -- Define checklist items for each stage
  stage_items := '{
    "new": [
      {"key": "contacted", "label": "Contacted", "order": 1},
      {"key": "qualified", "label": "Qualified", "order": 2}
    ],
    "quote": [
      {"key": "quote_sent", "label": "Quote Sent", "order": 1},
      {"key": "follow_up", "label": "Follow Up", "order": 2},
      {"key": "won", "label": "Won", "order": 3}
    ],
    "production": [
      {"key": "deposit_collected", "label": "Deposit Collected", "order": 1},
      {"key": "materials_ordered", "label": "Materials Ordered", "order": 2},
      {"key": "crew_scheduled", "label": "Crew Scheduled", "order": 3},
      {"key": "complete", "label": "Complete", "order": 4}
    ],
    "invoiced": [
      {"key": "invoice_sent", "label": "Invoice Sent", "order": 1},
      {"key": "final_payment_collected", "label": "Final Payment Collected", "order": 2}
    ],
    "closed": [
      {"key": "expenses_paid", "label": "All Expenses Paid", "order": 1},
      {"key": "commission_paid", "label": "Commission Paid", "order": 2},
      {"key": "review_requested", "label": "Review Requested", "order": 3},
      {"key": "archived", "label": "Archived", "order": 4}
    ]
  }'::jsonb;

  -- Only create items if status changed to a valid stage
  IF NEW.status IN ('new', 'quote', 'production', 'invoiced', 'closed') 
     AND (OLD.status IS NULL OR OLD.status != NEW.status) THEN
    
    -- Insert checklist items for this stage if they don't exist
    INSERT INTO lead_checklist_items (
      company_id, lead_id, stage, item_key, item_label, display_order
    )
    SELECT 
      NEW.company_id,
      NEW.id,
      NEW.status,
      item->>'key',
      item->>'label',
      (item->>'order')::integer
    FROM jsonb_array_elements(stage_items->NEW.status) AS item
    WHERE NOT EXISTS (
      SELECT 1 FROM lead_checklist_items 
      WHERE lead_id = NEW.id 
        AND stage = NEW.status 
        AND item_key = item->>'key'
        AND deleted_at IS NULL
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create checklist items
DROP TRIGGER IF EXISTS create_checklist_on_status_change ON leads;
CREATE TRIGGER create_checklist_on_status_change
  AFTER INSERT OR UPDATE OF status ON leads
  FOR EACH ROW
  EXECUTE FUNCTION create_checklist_items_for_stage();

-- Update existing leads to have checklist items for their current stage
-- (Run this manually if you have existing leads)
-- INSERT INTO lead_checklist_items (company_id, lead_id, stage, item_key, item_label, display_order)
-- SELECT ... (based on current lead status)
