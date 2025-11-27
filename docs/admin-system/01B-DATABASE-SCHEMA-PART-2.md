# Database Schema Documentation - Part 2

Continuing from Part 1: supporting tables and views.

Includes: project_materials, equipment, vehicles, invoices, invoice_line_items, payments, appointments, project_photos, project_notes, email_logs, system_settings, views, functions, migration strategy.

Example: project_materials

CREATE TABLE public.project_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  material_id UUID REFERENCES materials(id) NOT NULL,
  quantity_estimated DECIMAL(10,2) NOT NULL,
  quantity_used DECIMAL(10,2) DEFAULT 0,
  quantity_remaining DECIMAL(10,2),
  unit_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  ordered_date DATE,
  delivered_date DATE,
  used_date DATE,
  status TEXT NOT NULL DEFAULT 'planned',
  notes TEXT,
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT status_check CHECK (status IN ('planned', 'ordered', 'delivered','in_use', 'used', 'returned'))
);

-- Indexes, RLS policies, and other tables described in full doc.

Migration Strategy:
1. Create all tables
2. Create indexes
3. Enable RLS
4. Create policies
5. Create functions/triggers
6. Create views
7. Insert default system settings

Last Updated: November 14, 2025
Version: 1.0
Status: Complete schema definition
