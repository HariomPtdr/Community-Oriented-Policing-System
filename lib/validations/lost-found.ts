import { z } from 'zod'

// ── Category constants ──────────────────────────────────────

export const LF_CATEGORIES = [
  { value: 'mobile_phone', label: 'Mobile Phone', icon: '📱' },
  { value: 'wallet_bag', label: 'Wallet / Bag', icon: '👜' },
  { value: 'keys', label: 'Keys', icon: '🔑' },
  { value: 'documents', label: 'Documents / ID', icon: '🪪' },
  { value: 'vehicle', label: 'Vehicle', icon: '🚗' },
  { value: 'jewellery', label: 'Jewellery', icon: '💍' },
  { value: 'electronics', label: 'Electronics', icon: '💻' },
  { value: 'clothing', label: 'Clothing', icon: '👕' },
  { value: 'pets', label: 'Pets', icon: '🐾' },
  { value: 'person', label: 'Missing Person', icon: '🧑' },
  { value: 'other', label: 'Other', icon: '📦' },
] as const

export type LFCategory = typeof LF_CATEGORIES[number]['value']

// ── Category-specific detail schemas ────────────────────────

export const mobilePhoneDetailsSchema = z.object({
  imei: z.string().regex(/^\d{15}$/, 'IMEI must be 15 digits').optional().or(z.literal('')),
  model: z.string().max(100).optional(),
  hasLockScreen: z.boolean().optional(),
  caseColor: z.string().max(50).optional(),
})

export const vehicleDetailsSchema = z.object({
  vehicleType: z.enum(['two_wheeler', 'four_wheeler', 'cycle', 'other']).optional(),
  regNumber: z.string().max(20).optional(),
  make: z.string().max(50).optional(),
  model: z.string().max(50).optional(),
})

export const documentDetailsSchema = z.object({
  docType: z.enum(['aadhaar', 'pan', 'driving_licence', 'passport', 'voter_id', 'other']).optional(),
  nameOnDoc: z.string().max(100).optional(),
  issueYear: z.number().int().min(1950).max(new Date().getFullYear()).optional(),
})

export const walletBagDetailsSchema = z.object({
  brand: z.string().max(50).optional(),
  material: z.enum(['leather', 'cloth', 'synthetic', 'other']).optional(),
  contentsDesc: z.string().max(300).optional(),
  approxCash: z.number().min(0).optional(),
})

export const keysDetailsSchema = z.object({
  keyType: z.enum(['house', 'vehicle', 'office', 'other']).optional(),
  keyringDesc: z.string().max(200).optional(),
})

export const jewelleryDetailsSchema = z.object({
  jewelleryType: z.enum(['ring', 'necklace', 'earrings', 'bangle', 'chain', 'other']).optional(),
  metal: z.enum(['gold', 'silver', 'platinum', 'other']).optional(),
  engravings: z.string().max(200).optional(),
  estimatedValue: z.number().min(0).optional(),
})

export const petDetailsSchema = z.object({
  petType: z.enum(['dog', 'cat', 'bird', 'other']).optional(),
  breed: z.string().max(100).optional(),
  petName: z.string().max(50).optional(),
  collarDesc: z.string().max(200).optional(),
})

export const personDetailsSchema = z.object({
  age: z.number().min(0).max(120).optional(),
  height: z.string().max(20).optional(),
  weight: z.string().max(20).optional(),
  lastSeenWearing: z.string().max(300).optional(),
  identifyingMarks: z.string().max(300).optional(),
  relationship: z.string().max(100).optional(),
})

// ── Category detail schema mapping ──────────────────────────

export const CATEGORY_DETAIL_SCHEMAS: Record<string, z.ZodType> = {
  mobile_phone: mobilePhoneDetailsSchema,
  vehicle: vehicleDetailsSchema,
  documents: documentDetailsSchema,
  wallet_bag: walletBagDetailsSchema,
  keys: keysDetailsSchema,
  jewellery: jewelleryDetailsSchema,
  pets: petDetailsSchema,
  person: personDetailsSchema,
}

// ── Master report form schema ───────────────────────────────

export const reportItemSchema = z.object({
  reportType: z.enum(['lost', 'found']),
  itemName: z.string().min(2, 'Item name is too short').max(100),
  category: z.enum([
    'mobile_phone', 'wallet_bag', 'keys', 'documents',
    'vehicle', 'jewellery', 'electronics', 'clothing',
    'pets', 'person', 'other'
  ]),
  description: z.string().min(10, 'Describe in at least 10 characters').max(2000),
  brand: z.string().max(50).optional(),
  color: z.string().max(50).optional(),
  categoryDetails: z.record(z.string(), z.unknown()).optional(),

  // Location
  locationText: z.string().min(3, 'Please enter a location').max(200),
  locationArea: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),

  // Timing
  incidentDate: z.string().refine(
    d => new Date(d) <= new Date(),
    'Date cannot be in the future'
  ),
  incidentTime: z.string().optional(),

  // Contact
  contactName: z.string().min(2, 'Name is required').max(100),
  contactPhone: z.string().min(10, 'Valid phone required').max(15),
  contactEmail: z.string().email('Enter a valid email').optional().or(z.literal('')),
  contactViaPlatform: z.boolean().default(true),
  showPhone: z.boolean().default(false),
  showEmail: z.boolean().default(false),

  // Reward
  hasReward: z.boolean().default(false),
  rewardAmount: z.number().min(0).max(1000000).optional(),
  rewardNote: z.string().max(200).optional(),
})

// ── Claim schema ────────────────────────────────────────────

export const claimItemSchema = z.object({
  itemId: z.string().uuid(),
  claimMessage: z.string()
    .min(30, 'Provide at least 30 characters to verify ownership')
    .max(1000),
  proofDescription: z.string().max(300).optional(),
})

// ── Listing filters ─────────────────────────────────────────

export const listFiltersSchema = z.object({
  search: z.string().max(100).optional(),
  type: z.enum(['all', 'lost', 'found']).default('all'),
  category: z.enum([
    'all', 'mobile_phone', 'wallet_bag', 'keys', 'documents',
    'vehicle', 'jewellery', 'electronics', 'clothing',
    'pets', 'person', 'other'
  ]).default('all'),
  dateRange: z.enum(['all', 'today', 'week', 'month']).default('all'),
  status: z.enum(['all', 'active', 'matched', 'reunited']).default('all'),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
})

// ── Types ───────────────────────────────────────────────────

export type ReportItemInput = z.infer<typeof reportItemSchema>
export type ClaimItemInput = z.infer<typeof claimItemSchema>
export type ListFilters = z.infer<typeof listFiltersSchema>

export type LFItem = {
  id: string
  created_at: string
  updated_at: string
  reporter_id: string
  report_type: 'lost' | 'found'
  status: string
  item_name: string
  category: LFCategory
  description: string
  brand?: string
  color?: string
  category_details?: Record<string, unknown>
  contact_name: string
  contact_phone?: string
  contact_email?: string
  contact_via_platform: boolean
  show_phone: boolean
  show_email: boolean
  location_text: string
  location_area?: string
  latitude?: number
  longitude?: number
  incident_date: string
  incident_time?: string
  has_reward: boolean
  reward_amount?: number
  reward_note?: string
  photo_paths: string[]
  primary_photo_path?: string
  ai_keywords?: string[]
  expires_at?: string
  expiry_warned: boolean
  renewal_count: number
  view_count: number
  claim_count: number
  // Joined
  reporter?: { full_name: string; avatar_url?: string }
  photo_url?: string
}

export type LFClaim = {
  id: string
  created_at: string
  item_id: string
  claimant_id: string
  status: string
  claim_message: string
  proof_description?: string
  proof_file_paths: string[]
  reviewed_by?: string
  reviewed_at?: string
  rejection_reason?: string
  handover_date?: string
  handover_location?: string
  claimant?: { full_name: string; avatar_url?: string; phone?: string }
}

export type LFMatch = {
  id: string
  created_at: string
  lost_item_id: string
  found_item_id: string
  match_score: number
  match_reasons: string[]
  ai_explanation?: string
  is_dismissed: boolean
  led_to_reunion: boolean
  lost_item?: LFItem
  found_item?: LFItem
}
