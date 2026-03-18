import { z } from 'zod'

// Password requirements for a policing platform
export const passwordSchema = z
  .string()
  .min(8, 'Minimum 8 characters')
  .regex(/[A-Z]/, 'Must include at least one uppercase letter')
  .regex(/[0-9]/, 'Must include at least one number')
  .regex(/[^A-Za-z0-9]/, 'Must include at least one special character')
  .max(72, 'Maximum 72 characters') // bcrypt limit

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  })

export const totpVerifySchema = z.object({
  token: z
    .string()
    .length(6, 'Code must be 6 digits')
    .regex(/^\d{6}$/, 'Only digits allowed'),
})

export const backupCodeSchema = z.object({
  code: z
    .string()
    .length(8, 'Backup code must be 8 characters')
    .regex(/^[A-Z0-9]{8}$/, 'Invalid backup code format'),
})

export const privacyControlsSchema = z.object({
  forumNameVisibility: z.enum(['everyone', 'neighborhood_only', 'hidden']),
  allowOfficerProfileView: z.boolean(),
  anonymousByDefault: z.boolean(),
  hideLastSeen: z.boolean(),
})

export const securityNotifPrefsSchema = z.object({
  notifyNewDeviceLogin: z.boolean(),
  notifyPasswordChange: z.boolean(),
  notifyFirStatusChange: z.boolean(),
  notifyNewDeviceLinked: z.boolean(),
  notifyFailedLogins: z.boolean(),
  notifyAccountAccessed: z.boolean(),
  viaEmail: z.boolean(),
  viaSms: z.boolean(),
  viaPush: z.boolean(),
})

export const deletionRequestSchema = z
  .object({
    confirmationText: z.string(),
    reason: z.string().min(10, 'Please provide a reason').max(500).optional().or(z.literal('')),
  })
  .refine((d) => d.confirmationText === 'DELETE MY ACCOUNT', {
    message: 'You must type "DELETE MY ACCOUNT" exactly',
    path: ['confirmationText'],
  })
export const generalSettingsSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  alternateMobile: z.string().min(10, 'Valid emergency contact is required').optional().or(z.literal('')),
  bloodGroup: z.string().optional().or(z.literal('')),
  isVolunteer: z.boolean().default(false),
})
