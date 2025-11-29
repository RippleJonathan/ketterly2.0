export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      activities: {
        Row: {
          id: string
          company_id: string
          entity_type: 'lead' | 'customer' | 'quote' | 'project' | 'invoice'
          entity_id: string
          activity_type: 'note' | 'call' | 'email' | 'sms' | 'meeting' | 'status_change' | 'file_upload' | 'payment' | 'other'
          title: string
          description: string | null
          metadata: Json | null
          created_by: string | null
          created_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          entity_type: 'lead' | 'customer' | 'quote' | 'project' | 'invoice'
          entity_id: string
          activity_type: 'note' | 'call' | 'email' | 'sms' | 'meeting' | 'status_change' | 'file_upload' | 'payment' | 'other'
          title: string
          description?: string | null
          metadata?: Json | null
          created_by?: string | null
          created_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          entity_type?: 'lead' | 'customer' | 'quote' | 'project' | 'invoice'
          entity_id?: string
          activity_type?: 'note' | 'call' | 'email' | 'sms' | 'meeting' | 'status_change' | 'file_upload' | 'payment' | 'other'
          title?: string
          description?: string | null
          metadata?: Json | null
          created_by?: string | null
          created_at?: string
          deleted_at?: string | null
        }
      }
      companies: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          primary_color: string
          contact_email: string | null
          contact_phone: string | null
          address: string | null
          city: string | null
          state: string | null
          zip: string | null
          subscription_tier: 'trial' | 'starter' | 'professional' | 'enterprise'
          subscription_status: 'active' | 'paused' | 'cancelled' | 'expired'
          trial_ends_at: string | null
          onboarding_completed: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          primary_color?: string
          contact_email?: string | null
          contact_phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          subscription_tier?: 'trial' | 'starter' | 'professional' | 'enterprise'
          subscription_status?: 'active' | 'paused' | 'cancelled' | 'expired'
          trial_ends_at?: string | null
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          primary_color?: string
          contact_email?: string | null
          contact_phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          subscription_tier?: 'trial' | 'starter' | 'professional' | 'enterprise'
          subscription_status?: 'active' | 'paused' | 'cancelled' | 'expired'
          trial_ends_at?: string | null
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      customers: {
        Row: {
          id: string
          company_id: string
          full_name: string
          email: string | null
          phone: string | null
          address: string | null
          city: string | null
          state: string | null
          zip: string | null
          customer_type: 'residential' | 'commercial' | 'property_manager'
          source: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          full_name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          customer_type?: 'residential' | 'commercial' | 'property_manager'
          source?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          full_name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          customer_type?: 'residential' | 'commercial' | 'property_manager'
          source?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      leads: {
        Row: {
          id: string
          company_id: string
          full_name: string
          email: string
          phone: string
          address: string | null
          city: string | null
          state: string | null
          zip: string | null
          source: 'website' | 'referral' | 'facebook' | 'google' | 'yard_sign' | 'door_hanger' | 'phone' | 'other'
          service_type: 'repair' | 'replacement' | 'inspection' | 'maintenance' | 'emergency' | 'gutter' | 'siding' | 'other'
          status: 'new' | 'contacted' | 'qualified' | 'quote_sent' | 'follow_up' | 'won' | 'lost' | 'archived'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          estimated_value: number | null
          notes: string | null
          assigned_to: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          full_name: string
          email: string
          phone: string
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          source?: 'website' | 'referral' | 'facebook' | 'google' | 'yard_sign' | 'door_hanger' | 'phone' | 'other'
          service_type?: 'repair' | 'replacement' | 'inspection' | 'maintenance' | 'emergency' | 'gutter' | 'siding' | 'other'
          status?: 'new' | 'contacted' | 'qualified' | 'quote_sent' | 'follow_up' | 'won' | 'lost' | 'archived'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          estimated_value?: number | null
          notes?: string | null
          assigned_to?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          full_name?: string
          email?: string
          phone?: string
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          source?: 'website' | 'referral' | 'facebook' | 'google' | 'yard_sign' | 'door_hanger' | 'phone' | 'other'
          service_type?: 'repair' | 'replacement' | 'inspection' | 'maintenance' | 'emergency' | 'gutter' | 'siding' | 'other'
          status?: 'new' | 'contacted' | 'qualified' | 'quote_sent' | 'follow_up' | 'won' | 'lost' | 'archived'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          estimated_value?: number | null
          notes?: string | null
          assigned_to?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      project_tasks: {
        Row: {
          id: string
          company_id: string
          project_id: string
          title: string
          description: string | null
          status: 'pending' | 'in_progress' | 'completed' | 'blocked'
          priority: 'low' | 'medium' | 'high'
          assigned_to: string | null
          due_date: string | null
          completed_at: string | null
          sort_order: number
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          project_id: string
          title: string
          description?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'blocked'
          priority?: 'low' | 'medium' | 'high'
          assigned_to?: string | null
          due_date?: string | null
          completed_at?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          project_id?: string
          title?: string
          description?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'blocked'
          priority?: 'low' | 'medium' | 'high'
          assigned_to?: string | null
          due_date?: string | null
          completed_at?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      projects: {
        Row: {
          id: string
          company_id: string
          project_number: string
          customer_id: string
          quote_id: string | null
          title: string
          description: string | null
          service_address: string | null
          service_city: string | null
          service_state: string | null
          service_zip: string | null
          status: 'scheduled' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          contract_amount: number | null
          start_date: string | null
          end_date: string | null
          actual_start_date: string | null
          actual_end_date: string | null
          completion_percentage: number
          assigned_crew_lead: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          project_number: string
          customer_id: string
          quote_id?: string | null
          title: string
          description?: string | null
          service_address?: string | null
          service_city?: string | null
          service_state?: string | null
          service_zip?: string | null
          status?: 'scheduled' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          contract_amount?: number | null
          start_date?: string | null
          end_date?: string | null
          actual_start_date?: string | null
          actual_end_date?: string | null
          completion_percentage?: number
          assigned_crew_lead?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          project_number?: string
          customer_id?: string
          quote_id?: string | null
          title?: string
          description?: string | null
          service_address?: string | null
          service_city?: string | null
          service_state?: string | null
          service_zip?: string | null
          status?: 'scheduled' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          contract_amount?: number | null
          start_date?: string | null
          end_date?: string | null
          actual_start_date?: string | null
          actual_end_date?: string | null
          completion_percentage?: number
          assigned_crew_lead?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      quote_line_items: {
        Row: {
          id: string
          company_id: string
          quote_id: string
          item_type: 'service' | 'material' | 'labor' | 'other'
          name: string
          description: string | null
          quantity: number
          unit_price: number
          total: number
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          quote_id: string
          item_type?: 'service' | 'material' | 'labor' | 'other'
          name: string
          description?: string | null
          quantity?: number
          unit_price: number
          total: number
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          quote_id?: string
          item_type?: 'service' | 'material' | 'labor' | 'other'
          name?: string
          description?: string | null
          quantity?: number
          unit_price?: number
          total?: number
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      quotes: {
        Row: {
          id: string
          company_id: string
          quote_number: string
          customer_id: string | null
          lead_id: string | null
          title: string
          description: string | null
          service_address: string | null
          service_city: string | null
          service_state: string | null
          service_zip: string | null
          status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired' | 'archived'
          subtotal: number
          tax_rate: number
          tax_amount: number
          discount_amount: number
          total: number
          valid_until: string | null
          notes: string | null
          terms_and_conditions: string | null
          created_by: string | null
          sent_at: string | null
          viewed_at: string | null
          accepted_at: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          quote_number: string
          customer_id?: string | null
          lead_id?: string | null
          title: string
          description?: string | null
          service_address?: string | null
          service_city?: string | null
          service_state?: string | null
          service_zip?: string | null
          status?: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired' | 'archived'
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          discount_amount?: number
          total?: number
          valid_until?: string | null
          notes?: string | null
          terms_and_conditions?: string | null
          created_by?: string | null
          sent_at?: string | null
          viewed_at?: string | null
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          quote_number?: string
          customer_id?: string | null
          lead_id?: string | null
          title?: string
          description?: string | null
          service_address?: string | null
          service_city?: string | null
          service_state?: string | null
          service_zip?: string | null
          status?: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired' | 'archived'
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          discount_amount?: number
          total?: number
          valid_until?: string | null
          notes?: string | null
          terms_and_conditions?: string | null
          created_by?: string | null
          sent_at?: string | null
          viewed_at?: string | null
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      users: {
        Row: {
          id: string
          company_id: string
          email: string
          full_name: string
          role: 'super_admin' | 'admin' | 'manager' | 'user'
          phone: string | null
          avatar_url: string | null
          is_active: boolean
          last_login_at: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id: string
          company_id: string
          email: string
          full_name: string
          role?: 'super_admin' | 'admin' | 'manager' | 'user'
          phone?: string | null
          avatar_url?: string | null
          is_active?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          email?: string
          full_name?: string
          role?: 'super_admin' | 'admin' | 'manager' | 'user'
          phone?: string | null
          avatar_url?: string | null
          is_active?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
