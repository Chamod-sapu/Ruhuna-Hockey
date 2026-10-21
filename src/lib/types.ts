export type LeadershipRole = 'Captain' | 'Vice Captain' | 'Team Manager' | 'Coach'
export const LEADERSHIP_ROLES: LeadershipRole[] = ['Captain', 'Vice Captain', 'Team Manager', 'Coach']
export type Position = 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward'
export const POSITIONS: Position[] = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward']
export const SPONSOR_TYPES = ['Title Sponsor','Gold','Silver','Bronze','Kit Partner','Equipment Partner','Media Partner','Supporting Partner'] as const
export const GALLERY_CATEGORIES = ['Matches','Training','Events','Team','Celebrations'] as const
export const ACHIEVEMENT_CATEGORIES = ['Championship','Runner-up','Podium','Individual Award','Milestone'] as const
export const FIXTURE_STATUSES = ['Upcoming','Live','Completed','Postponed','Cancelled'] as const

export interface Tournament { id: string; name: string; season_year: number; location: string | null; start_date: string | null; end_date: string | null; description: string | null; is_active: boolean; created_at: string }
export interface Player { id: string; full_name: string; photo_url: string | null; faculty: string | null; academic_year: string | null; bio: string | null; created_at: string }
export interface SquadMember { id: string; tournament_id: string; player_id: string; jersey_number: number | null; position: Position; is_captain: boolean; is_vice_captain: boolean; created_at: string; players?: Player }
export interface Fixture { id: string; tournament_id: string | null; opponent: string; venue: string | null; match_at: string; home_away: 'Home' | 'Away' | 'Neutral'; status: (typeof FIXTURE_STATUSES)[number]; our_score: number | null; opponent_score: number | null; notes: string | null; created_at: string }
export interface Achievement { id: string; title: string; description: string | null; year: number; category: (typeof ACHIEVEMENT_CATEGORIES)[number]; tournament_name: string | null; result_label: string | null; image_url: string | null; created_at: string }
export interface EventItem { id: string; title: string; description: string | null; event_type: 'Organizing' | 'Participating'; location: string | null; start_at: string; end_at: string | null; banner_url: string | null; registration_url: string | null; created_at: string }
export interface Leader { id: string; season_year: number; role: LeadershipRole; full_name: string; photo_url: string | null; bio: string | null; email: string | null; phone: string | null; created_at: string }
export interface Sponsor { id: string; name: string; logo_url: string | null; website_url: string | null; sponsorship_type: (typeof SPONSOR_TYPES)[number]; description: string | null; season_year: number | null; is_active: boolean; created_at: string }
export interface GalleryItem { id: string; title: string | null; caption: string | null; image_url: string; category: (typeof GALLERY_CATEGORIES)[number]; taken_on: string | null; is_featured: boolean; created_at: string }
export interface ContactMessage { id: string; name: string; email: string; subject: string | null; message: string; is_read: boolean; created_at: string }
