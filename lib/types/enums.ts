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
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  QUOTE_SENT = 'quote_sent',
  FOLLOW_UP = 'follow_up',
  WON = 'won',
  LOST = 'lost',
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
