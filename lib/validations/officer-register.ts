import { z } from 'zod'

// Indian mobile validation
const indianMobile = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number')

// Badge number: MP-XXXX format
const badgeNumber = z
  .string()
  .regex(/^[A-Z]{2,4}-\d{3,6}$/, 'Badge number format: XX-0000 (e.g. MP-1234)')
  .toUpperCase()

// ── Section schemas ───────────────────────────────────────────────────────────

export const accountTypeSchema = z.object({
  accountType: z.enum(['constable', 'si', 'sho', 'dsp']),
})

export const personalDetailsSchema = z
  .object({
    fullName: z.string()
      .min(3, 'Name must be at least 3 characters')
      .max(100)
      .regex(/^[a-zA-Z\s.-]+$/, 'Name should only contain letters, spaces, dots or hyphens'),
    email: z.string().email('Enter a valid email address'),
    password: z.string()
      .min(8, 'Minimum 8 characters')
      .regex(/[A-Z]/, 'Must include uppercase letter')
      .regex(/[0-9]/, 'Must include a number')
      .regex(/[^A-Za-z0-9]/, 'Must include a special character'),
    confirmPassword: z.string(),
    mobile: indianMobile,
    altMobile: indianMobile.optional().or(z.literal('')),
    fatherName: z.string().min(2).max(100),
    motherName: z.string().max(100).optional(),
    dateOfBirth: z.string().refine(dob => {
      const age = Math.floor(
        (Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      )
      return age >= 18 && age <= 65
    }, 'Age must be between 18 and 65'),
    gender: z.enum(['male', 'female', 'other']),
    bloodGroup: z.enum(['A+','A-','B+','B-','O+','O-','AB+','AB-','unknown'])
      .default('unknown'),
    officialEmail: z.string().email().optional().or(z.literal('')),
    idProofType: z.enum(['aadhaar','pan','driving_licence','passport','employee_id']),
    idProofNumber: z.string().min(5).max(20),
  })
  .refine(d => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const serviceDetailsSchema = z.object({
  badgeNumber: badgeNumber,
  employeeId: z.string().max(50).optional(),
  joiningDate: z.string().refine(
    d => new Date(d) <= new Date(),
    'Joining date cannot be in the future'
  ),
  department: z.string().default('Madhya Pradesh Police'),
  specialization: z.enum([
    'traffic','crime','cyber_cell','women_safety',
    'anti_narcotics','general_duty','armed_reserve','other'
  ]).default('general_duty'),
  zoneId: z.string().uuid().optional(),
  stationId: z.string().uuid().optional(),
  neighborhoodId: z.string().uuid().optional(),
  previousStationId: z.string().uuid().optional(),
})

export const addressSchema = z.object({
  pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
  state: z.string().min(2, 'State name is too short').default('Madhya Pradesh'),
  district: z.string().min(2, 'District name is too short'),
  cityTown: z.string().optional().or(z.literal('')),
  tehsilDivision: z.string().optional().or(z.literal('')),
  policeStationArea: z.string().optional().or(z.literal('')),
  fullAddress: z.string().min(5, 'Enter complete address').max(500),
})

export const emergencyContactSchema = z.object({
  contactName: z.string().min(2).max(100),
  relationship: z.enum(['spouse','parent','sibling','child','other']),
  emergencyMobile: indianMobile,
  emergencyAltMobile: indianMobile.optional().or(z.literal('')),
  emergencyAddress: z.string().max(300).optional(),
})

export const declarationSchema = z.object({
  declarationAccepted: z.boolean().refine(v => v === true, {
    message: 'You must accept the declaration to proceed'
  }),
  infoCorrect: z.boolean().refine(v => v === true, {
    message: 'You must confirm all information is correct'
  }),
  legalAcknowledgement: z.boolean().refine(v => v === true, {
    message: 'You must acknowledge the legal terms'
  }),
})

// Full registration schema
export const officerRegistrationSchema = accountTypeSchema
  .merge(personalDetailsSchema)
  .merge(serviceDetailsSchema)
  .merge(addressSchema)
  .merge(emergencyContactSchema)
  .merge(declarationSchema)

export type OfficerRegistrationInput = z.infer<typeof officerRegistrationSchema>
