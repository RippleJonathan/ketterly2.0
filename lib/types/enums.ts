// Enums and constants for the application

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
}

export enum LeadSource {
  WEBSITE = 'website',
  REFERRAL = 'referral',
  FACEBOOK = 'facebook',
  GOOGLE = 'google',
  YARD_SIGN = 'yard_sign',
  DOOR_HANGER = 'door_hanger',
  PHONE = 'phone',
  OTHER = 'other',
}

export enum ServiceType {
  REPAIR = 'repair',
  REPLACEMENT = 'replacement',
  INSPECTION = 'inspection',
  MAINTENANCE = 'maintenance',
  EMERGENCY = 'emergency',
  GUTTER = 'gutter',
  SIDING = 'siding',
  OTHER = 'other',
}

export enum LeadStatus {
  NEW_LEAD = 'new_lead',
  QUOTE = 'quote',
  PRODUCTION = 'production',
  INVOICED = 'invoiced',
  CLOSED = 'closed',
}

export enum LeadSubStatus {
  // NEW LEAD sub-statuses
  UNCONTACTED = 'uncontacted',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  NOT_QUALIFIED = 'not_qualified',
  
  // QUOTE sub-statuses
  ESTIMATING = 'estimating',
  QUOTE_SENT = 'quote_sent',
  QUOTE_VIEWED = 'quote_viewed',
  NEGOTIATING = 'negotiating',
  APPROVED = 'approved',
  DECLINED = 'declined',
  EXPIRED = 'expired',
  
  // PRODUCTION sub-statuses
  CONTRACT_SIGNED = 'contract_signed',
  SCHEDULED = 'scheduled',
  MATERIALS_ORDERED = 'materials_ordered',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  INSPECTION_NEEDED = 'inspection_needed',
  INSPECTION_PASSED = 'inspection_passed',
  ON_HOLD = 'on_hold',
  CANCELLED = 'cancelled',
  
  // INVOICED sub-statuses
  DRAFT = 'draft',
  SENT = 'sent',
  VIEWED = 'viewed',
  PARTIAL_PAYMENT = 'partial_payment',
  PAID = 'paid',
  OVERDUE = 'overdue',
  COLLECTIONS = 'collections',
  WRITTEN_OFF = 'written_off',
  
  // CLOSED sub-statuses (reuse some names but context is different)
  // COMPLETED = 'completed', // Already defined above
  LOST = 'lost',
  // CANCELLED = 'cancelled', // Already defined above
  ARCHIVED = 'archived',
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum QuoteStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  VIEWED = 'viewed',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
  ARCHIVED = 'archived',
}

export enum ProjectStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ActivityType {
  NOTE = 'note',
  CALL = 'call',
  EMAIL = 'email',
  SMS = 'sms',
  MEETING = 'meeting',
  STATUS_CHANGE = 'status_change',
  FILE_UPLOAD = 'file_upload',
  PAYMENT = 'payment',
  OTHER = 'other',
}

export enum SubscriptionTier {
  TRIAL = 'trial',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}
