// ── Report TypeScript Types ──────────────────────────────────

export type ComplaintType =
  | 'simple_theft'
  | 'cyber_crime'
  | 'ncr'
  | 'cheating_fraud'
  | 'burglary'

export type FilingMode = 'self' | 'behalf'

export type PropertyType =
  | 'mobile_phone' | 'vehicle' | 'cash' | 'jewellery'
  | 'electronics' | 'documents' | 'other'

export type CyberCrimeType =
  | 'online_fraud' | 'upi_scam' | 'credit_debit_fraud'
  | 'social_media_hack' | 'phishing' | 'otp_scam'
  | 'fake_job_scam' | 'cyber_bullying' | 'identity_theft' | 'other'

export type CyberPlatform =
  | 'whatsapp' | 'instagram' | 'facebook' | 'telegram'
  | 'website' | 'phone_call' | 'email' | 'upi_app' | 'other'

export type FraudType =
  | 'money_lending_fraud' | 'business_fraud' | 'property_fraud'
  | 'online_investment_scam' | 'job_offer_scam'
  | 'fake_company_fraud' | 'loan_fraud' | 'other'

export type PaymentMethod =
  | 'cash' | 'bank_transfer' | 'upi' | 'cheque'
  | 'online_payment' | 'crypto'

export type PremisesType =
  | 'residential_house' | 'apartment' | 'shop'
  | 'office' | 'warehouse' | 'other'

export type EntryMethod =
  | 'door_broken' | 'window_broken' | 'lock_cut'
  | 'duplicate_key_suspected' | 'unknown'

export type NcrType = 'noise_complaint' | 'neighbour_dispute'

export type EvidenceCategory =
  | 'property_photo' | 'proof' | 'screenshot'
  | 'transaction_receipt' | 'cctv_footage' | 'other'

// ── Step Interfaces ─────────────────────────────────────────

export interface ComplainantStep {
  filingMode: FilingMode
  behalfName?: string
  behalfRelation?: string
  behalfContact?: string
  fullName: string
  fatherName?: string
  motherName?: string
  mobile: string
  altMobile?: string
  email?: string
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say'
  address?: string
  district?: string
  policeStation?: string
}

export interface IncidentStep {
  district: string
  policeStation: string
  state: string
  city: string
  date: string
  approxTime?: string
  complaintType: ComplaintType
}

export interface SimpleTheftData {
  propertyType: PropertyType
  propertyDescription: string
  propertyDetails?: Record<string, any>
  estimatedPrice?: number
  hasSuspect: boolean
  suspectName?: string
  suspectAddress?: string
  suspectDescription?: string
  suspectPhone?: string
  detailedDescription: string
}

export interface CyberCrimeData {
  cyberType: CyberCrimeType
  cyberTypeDetails?: Record<string, any>
  platformUsed: CyberPlatform   // single platform
  platformDetails?: Record<string, any>
  platformOtherDesc?: string
  websiteUrl?: string
  amountLost?: number
  transactionId?: string
  upiId?: string
  ifscCode?: string
  bankName?: string
  dateOfTransaction?: string
  hasSuspect: boolean
  suspectName?: string
  suspectPhone?: string
  suspectWebsite?: string
  suspectSocialHandle?: string
  suspectDescription?: string
  detailedDescription: string
}

export interface CheatingFraudData {
  fraudType: FraudType
  fraudDetails?: Record<string, any>
  fraudAmount?: number
  paymentMethod?: PaymentMethod
  hasTransaction: boolean
  transactionId?: string
  bankName?: string
  accountNumber?: string
  ifscCode?: string
  upiId?: string
  hasSuspect: boolean
  suspectName?: string
  suspectMob?: string
  suspectAddress?: string
  suspectCompany?: string
  suspectWebsite?: string
  suspectBankAcc?: string
  detailedDescription: string
}

export interface BurglaryData {
  premisesType: PremisesType
  premisesDetails?: Record<string, any>
  entryMethod?: EntryMethod
  cctvAvailable: boolean
  stolenPropertyDesc: string
  estimatedValue?: number
  hasSuspect: boolean
  suspectName?: string
  suspectAddress?: string
  suspectDescription?: string
  detailedDescription: string
}

export interface NcrData {
  ncrType: NcrType
  description: string
  suspectName?: string
  suspectAddress?: string
  suspectPhone?: string
  suspectDescription?: string
}

// ── Master Report Draft ─────────────────────────────────────

export interface ReportDraft {
  id?: string
  currentStep: 1 | 2 | 3 | 4
  complaintType?: ComplaintType

  // Step 1
  complainant: ComplainantStep

  // Step 2
  incident: IncidentStep

  // Step 3 (one populated based on type)
  simpleTheft?: SimpleTheftData
  cyberCrime?: CyberCrimeData
  cheatingFraud?: CheatingFraudData
  burglary?: BurglaryData
  ncr?: NcrData

  // Step 4
  citizenSignaturePath?: string
  declarationAccepted: boolean

  // Recovery (conditional)
  yourLoss?: number
  totalEstimatedLoss?: number
}

// ── Display Constants ───────────────────────────────────────

export const COMPLAINT_TYPE_LABELS: Record<ComplaintType, { label: string; icon: string; desc: string; color: string }> = {
  simple_theft:    { label: 'Simple Theft',     icon: '🔓', desc: 'Property stolen without force or threat', color: 'orange' },
  cyber_crime:     { label: 'Cyber Crime',      icon: '💻', desc: 'Online fraud, hacking, digital crimes',   color: 'blue' },
  ncr:             { label: 'NCR Complaint',    icon: '📋', desc: 'Non-cognizable report (minor offence)',   color: 'gray' },
  cheating_fraud:  { label: 'Cheating / Fraud', icon: '💰', desc: 'Financial fraud, scams, cheating',        color: 'red' },
  burglary:        { label: 'Burglary',         icon: '🏠', desc: 'Forced entry theft from premises',        color: 'purple' },
}

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  mobile_phone: 'Mobile Phone',
  vehicle:      'Vehicle',
  cash:         'Cash',
  jewellery:    'Jewellery',
  electronics:  'Electronics',
  documents:    'Documents',
  other:        'Other',
}

export const CYBER_TYPE_LABELS: Record<CyberCrimeType, string> = {
  online_fraud:       'Online Fraud',
  upi_scam:           'UPI Scam',
  credit_debit_fraud: 'Credit/Debit Card Fraud',
  social_media_hack:  'Social Media Hack',
  phishing:           'Phishing',
  otp_scam:           'OTP Scam',
  fake_job_scam:      'Fake Job Scam',
  cyber_bullying:     'Cyber Bullying',
  identity_theft:     'Identity Theft',
  other:              'Other',
}

export const CYBER_PLATFORM_LABELS: Record<CyberPlatform, string> = {
  whatsapp:   'WhatsApp',
  instagram:  'Instagram',
  facebook:   'Facebook',
  telegram:   'Telegram',
  website:    'Website',
  phone_call: 'Phone Call',
  email:      'Email',
  upi_app:    'UPI App',
  other:      'Other',
}

export const FRAUD_TYPE_LABELS: Record<FraudType, string> = {
  money_lending_fraud:    'Money Lending Fraud',
  business_fraud:         'Business Fraud',
  property_fraud:         'Property Fraud',
  online_investment_scam: 'Online Investment Scam',
  job_offer_scam:         'Job Offer Scam',
  fake_company_fraud:     'Fake Company Fraud',
  loan_fraud:             'Loan Fraud',
  other:                  'Other',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash:           'Cash',
  bank_transfer:  'Bank Transfer',
  upi:            'UPI',
  cheque:         'Cheque',
  online_payment: 'Online Payment',
  crypto:         'Cryptocurrency',
}

export const PREMISES_TYPE_LABELS: Record<PremisesType, string> = {
  residential_house: 'Residential House',
  apartment:         'Apartment',
  shop:              'Shop',
  office:            'Office',
  warehouse:         'Warehouse',
  other:             'Other',
}

export const ENTRY_METHOD_LABELS: Record<EntryMethod, string> = {
  door_broken:            'Door Broken',
  window_broken:          'Window Broken',
  lock_cut:               'Lock Cut',
  duplicate_key_suspected:'Duplicate Key Suspected',
  unknown:                'Unknown',
}

// Recovery applicability
export const RECOVERY_APPLICABLE_TYPES: ComplaintType[] = [
  'simple_theft', 'cheating_fraud', 'burglary'
]

export const RECOVERY_APPLICABLE_CYBER_SUBTYPES: CyberCrimeType[] = [
  'online_fraud', 'upi_scam', 'credit_debit_fraud', 'otp_scam'
]

export function showsRecovery(complaintType?: string, cyberSubType?: string): boolean {
  if (!complaintType) return false
  if (RECOVERY_APPLICABLE_TYPES.includes(complaintType as ComplaintType)) return true
  if (complaintType === 'cyber_crime' && cyberSubType) {
    return RECOVERY_APPLICABLE_CYBER_SUBTYPES.includes(cyberSubType as CyberCrimeType)
  }
  return false
}
