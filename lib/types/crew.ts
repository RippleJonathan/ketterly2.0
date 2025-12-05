// Crew management types

export type CrewRole = 'foreman' | 'laborer' | 'none'

export interface CrewMember {
  id: string
  company_id: string
  email: string
  full_name: string
  role: string
  crew_role: CrewRole
  foreman_id: string | null
  
  // Relations (populated via joins)
  foreman?: CrewMember | null
  laborers?: CrewMember[]
}

export interface LeadCrewAssignment {
  id: string
  company_id: string
  lead_id: string
  user_id: string
  role: CrewRole
  assigned_date: string
  created_by: string | null
  created_at: string
  
  // Relations (populated via joins)
  user?: CrewMember
}

export interface AssignCrewParams {
  lead_id: string
  user_id: string
  role: CrewRole
  created_by?: string | null
}

export interface CrewAssignmentFilters {
  lead_id?: string
  user_id?: string
  role?: CrewRole
}
