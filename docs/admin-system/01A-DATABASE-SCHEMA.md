# Database Schema Documentation

## Overview

This document defines the complete database schema for the admin system. All tables use PostgreSQL and include Row Level Security (RLS) policies.

## Schema Design Principles

- Normalized Structure
- Foreign Key Integrity
- Audit Trails
- Soft Deletes
- UUID Primary Keys
- Indexed Queries

## Core Tables

### users (extends Supabase auth.users)

Stores additional user profile information.

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT role_check CHECK (role IN ('super_admin','admin','manager','crew_lead','crew_member','customer'))
);

-- Indexes and RLS policies described in full doc.

### leads

Tracks potential customers from initial contact through conversion.

CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT DEFAULT 'TX',
  zip TEXT,
  source TEXT NOT NULL,
  service_type TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'new',
  description TEXT,
  estimated_budget DECIMAL(10,2),
  preferred_start_date DATE,
  score INTEGER DEFAULT 0,
  quality TEXT DEFAULT 'unqualified',
  assigned_to UUID REFERENCES users(id),
  converted_to_customer BOOLEAN DEFAULT false,
  converted_at TIMESTAMPTZ,
  lost_reason TEXT,
  lost_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- More tables: customers, activities, quotes, quote_line_items, projects, project_tasks, crew_assignments, materials. See Part 2 for the rest.

Last Updated: November 14, 2025
Version: 1.0
Status: Core tables defined
