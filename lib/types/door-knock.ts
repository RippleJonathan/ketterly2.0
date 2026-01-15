// Door Knock Map Feature Types

export enum DoorKnockPinType {
  NOT_HOME = 'not_home',
  NOT_INTERESTED = 'not_interested',
  FOLLOW_UP = 'follow_up',
  APPOINTMENT_SET = 'appointment_set',
  LEAD_CREATED = 'lead_created',
  EXISTING_CUSTOMER = 'existing_customer',
  CALLBACK_REQUESTED = 'callback_requested',
  DO_NOT_CONTACT = 'do_not_contact',
}

export interface DoorKnockPin {
  id: string;
  company_id: string;
  location_id: string | null;
  created_by: string;
  
  // Geographic data
  latitude: number;
  longitude: number;
  address: string | null;
  
  // Pin details
  pin_type: DoorKnockPinType;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
  interaction_date: string;
  
  // Related entities
  lead_id: string | null;
  appointment_id: string | null;
  
  // Metadata
  device_location_accuracy: number | null;
  metadata: Record<string, any>;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DoorKnockPinWithUser extends DoorKnockPin {
  created_by_user: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export interface DoorKnockPinInsert {
  company_id: string;
  location_id?: string | null;
  created_by: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  pin_type: DoorKnockPinType;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  notes?: string | null;
  interaction_date?: string;
  lead_id?: string | null;
  appointment_id?: string | null;
  device_location_accuracy?: number | null;
  metadata?: Record<string, any>;
}

export interface DoorKnockPinUpdate {
  pin_type?: DoorKnockPinType;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  notes?: string | null;
  interaction_date?: string;
  lead_id?: string | null;
  appointment_id?: string | null;
  metadata?: Record<string, any>;
  deleted_at?: string | null;
}

export interface DoorKnockStats {
  pin_type: DoorKnockPinType;
  count: number;
  conversion_rate: number;
}

export interface DoorKnockFilters {
  location_id?: string;
  created_by?: string;
  pin_types?: DoorKnockPinType[];
  start_date?: string;
  end_date?: string;
  search?: string;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

// Pin type configuration for UI
export const PIN_TYPE_CONFIG: Record<DoorKnockPinType, {
  label: string;
  color: string;
  icon: string;
  description: string;
}> = {
  [DoorKnockPinType.NOT_HOME]: {
    label: 'Not Home',
    color: '#9CA3AF', // gray-400
    icon: 'home',
    description: 'No one answered the door',
  },
  [DoorKnockPinType.NOT_INTERESTED]: {
    label: 'Not Interested',
    color: '#EF4444', // red-500
    icon: 'x-circle',
    description: 'Declined service or not interested',
  },
  [DoorKnockPinType.FOLLOW_UP]: {
    label: 'Follow Up',
    color: '#F59E0B', // amber-500
    icon: 'clock',
    description: 'Interested, needs follow-up contact',
  },
  [DoorKnockPinType.APPOINTMENT_SET]: {
    label: 'Appointment Set',
    color: '#3B82F6', // blue-500
    icon: 'calendar',
    description: 'Appointment has been scheduled',
  },
  [DoorKnockPinType.LEAD_CREATED]: {
    label: 'Lead Created',
    color: '#10B981', // green-500
    icon: 'user-plus',
    description: 'Converted to a lead in the system',
  },
  [DoorKnockPinType.EXISTING_CUSTOMER]: {
    label: 'Existing Customer',
    color: '#8B5CF6', // violet-500
    icon: 'star',
    description: 'Already a customer',
  },
  [DoorKnockPinType.CALLBACK_REQUESTED]: {
    label: 'Callback Requested',
    color: '#EC4899', // pink-500
    icon: 'phone',
    description: 'Asked to be called back later',
  },
  [DoorKnockPinType.DO_NOT_CONTACT]: {
    label: 'Do Not Contact',
    color: '#DC2626', // red-600
    icon: 'ban',
    description: 'Do not contact again',
  },
};

// Helper function to get pin color
export function getPinColor(pinType: DoorKnockPinType): string {
  return PIN_TYPE_CONFIG[pinType]?.color || '#9CA3AF';
}

// Helper function to get pin label
export function getPinLabel(pinType: DoorKnockPinType): string {
  return PIN_TYPE_CONFIG[pinType]?.label || pinType;
}
