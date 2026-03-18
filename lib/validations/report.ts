import { z } from 'zod'

// ── Common Validators ───────────────────────────────────────

export const indianMobile = z.string().regex(
  /^[6-9]\d{9}$/,
  'Enter a valid 10-digit Indian mobile number'
)

export const ifscCode = z.string().regex(
  /^[A-Z]{4}0[A-Z0-9]{6}$/,
  'Enter a valid IFSC code'
).optional().or(z.literal(''))

// ── Step 1: Complainant ─────────────────────────────────────

export const complainantSchema = z.object({
  filingMode: z.enum(['self', 'behalf']),
  behalfName: z.string().optional(),
  behalfRelation: z.string().optional(),
  behalfContact: z.string().optional(),
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  mobile: indianMobile,
  altMobile: z.string().optional(),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  address: z.string().optional(),
  district: z.string().min(2, 'Select a district'),
  policeStation: z.string().min(2, 'Select a police station'),
}).refine(data => {
  if (data.filingMode === 'behalf') {
    return !!data.behalfName && !!data.behalfRelation && !!data.behalfContact
  }
  return true
}, { message: 'Behalf details are required when filing on behalf', path: ['behalfName'] })

// ── Step 2: Incident ────────────────────────────────────────

export const incidentStepSchema = z.object({
  district: z.string().min(2, 'Select a district'),
  policeStation: z.string().min(2, 'Select police station area'),
  state: z.string().min(2, 'Select a state'),
  city: z.string().min(2, 'Enter city name'),
  date: z.string().min(1, 'Select incident date'),
  approxTime: z.string().optional(),
  complaintType: z.enum([
    'simple_theft', 'cyber_crime', 'ncr', 'cheating_fraud', 'burglary'
  ], { message: 'Select complaint type' }),
})

// ── Step 3: Type-Specific Schemas ───────────────────────────

export const simpleTheftSchema = z.object({
  propertyType: z.enum([
    'mobile_phone', 'vehicle', 'cash',
    'jewellery', 'electronics', 'documents', 'other'
  ]),
  propertyDescription: z.string().min(10, 'Describe the property (min 10 chars)').max(1000),
  estimatedPrice: z.number().positive().optional().or(z.nan()),
  hasSuspect: z.boolean().default(false),
  suspectName: z.string().optional(),
  suspectAddress: z.string().optional(),
  suspectDescription: z.string().optional(),
  suspectPhone: z.string().optional(),
  detailedDescription: z.string().min(20, 'Description too short (min 20 chars)').max(5000),
})

export const cyberCrimeSchema = z.object({
  cyberType: z.enum([
    'online_fraud', 'upi_scam', 'credit_debit_fraud',
    'social_media_hack', 'phishing', 'otp_scam',
    'fake_job_scam', 'cyber_bullying', 'identity_theft', 'other'
  ]),
  platformUsed: z.array(z.string()).min(1, 'Select at least one platform'),
  platformOtherDesc: z.string().optional(),
  websiteUrl: z.string().optional(),
  amountLost: z.number().positive().optional().or(z.nan()),
  transactionId: z.string().optional(),
  upiId: z.string().optional(),
  ifscCode: z.string().optional(),
  bankName: z.string().optional(),
  dateOfTransaction: z.string().optional(),
  hasSuspect: z.boolean().default(false),
  suspectName: z.string().optional(),
  suspectPhone: z.string().optional(),
  suspectWebsite: z.string().optional(),
  suspectSocialHandle: z.string().optional(),
  suspectDescription: z.string().optional(),
  detailedDescription: z.string().min(20, 'Description too short (min 20 chars)').max(5000),
})

export const cheatingFraudSchema = z.object({
  fraudType: z.enum([
    'money_lending_fraud', 'business_fraud', 'property_fraud',
    'online_investment_scam', 'job_offer_scam',
    'fake_company_fraud', 'loan_fraud', 'other'
  ]),
  fraudAmount: z.number().positive().optional().or(z.nan()),
  paymentMethod: z.enum([
    'cash', 'bank_transfer', 'upi', 'cheque',
    'online_payment', 'crypto'
  ]).optional(),
  hasTransaction: z.boolean().default(false),
  transactionId: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  upiId: z.string().optional(),
  hasSuspect: z.boolean().default(false),
  suspectName: z.string().optional(),
  suspectMob: z.string().optional(),
  suspectAddress: z.string().optional(),
  suspectCompany: z.string().optional(),
  suspectWebsite: z.string().optional(),
  suspectBankAcc: z.string().optional(),
  detailedDescription: z.string().min(20, 'Description too short (min 20 chars)').max(5000),
})

export const burglarySchema = z.object({
  premisesType: z.enum([
    'residential_house', 'apartment', 'shop',
    'office', 'warehouse', 'other'
  ]),
  entryMethod: z.enum([
    'door_broken', 'window_broken', 'lock_cut',
    'duplicate_key_suspected', 'unknown'
  ]).optional(),
  cctvAvailable: z.boolean(),
  stolenPropertyDesc: z.string().min(10, 'Describe stolen property (min 10 chars)').max(2000),
  estimatedValue: z.number().positive().optional().or(z.nan()),
  hasSuspect: z.boolean().default(false),
  suspectName: z.string().optional(),
  suspectAddress: z.string().optional(),
  suspectDescription: z.string().optional(),
  detailedDescription: z.string().min(20, 'Description too short (min 20 chars)').max(5000),
})

export const ncrSchema = z.object({
  ncrType: z.enum(['noise_complaint', 'neighbour_dispute']),
  description: z.string().min(20, 'Description too short (min 20 chars)').max(5000),
  suspectName: z.string().optional(),
  suspectAddress: z.string().optional(),
  suspectPhone: z.string().optional(),
  suspectDescription: z.string().optional(),
})

// ── Step 4: Review & Signature ──────────────────────────────

export const reviewSchema = z.object({
  declarationAccepted: z.boolean().refine(v => v === true, 'You must accept the declaration'),
  yourLoss: z.number().optional().or(z.nan()),
  totalEstimatedLoss: z.number().optional().or(z.nan()),
})
