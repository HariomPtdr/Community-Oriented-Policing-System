import { createClient } from '@/lib/supabase/client'
import type { EvidenceCategory } from '@/lib/types/report'

const MAX_SIZE = 50 * 1024 * 1024 // 50 MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/quicktime',
  'application/pdf'
]

export async function uploadEvidence(
  incidentId: string,
  file: File,
  category: EvidenceCategory
): Promise<{ storagePath: string; publicUrl: string }> {
  const supabase = createClient()

  if (file.size > MAX_SIZE) throw new Error('File too large (max 50 MB)')
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error('File type not allowed')

  const ext = file.name.split('.').pop()
  const fileName = `${crypto.randomUUID()}.${ext}`
  const storagePath = `${incidentId}/${category}/${fileName}`

  const { data, error } = await supabase.storage
    .from('incident-evidence')
    .upload(storagePath, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })

  if (error) throw error

  // Create signed URL
  const { data: signedData } = await supabase.storage
    .from('incident-evidence')
    .createSignedUrl(storagePath, 3600)

  // Log to evidence table
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await supabase.from('incident_evidence').insert({
      incident_id: incidentId,
      bucket: 'incident-evidence',
      storage_path: storagePath,
      public_url: signedData?.signedUrl,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      category,
      uploaded_by: user.id,
    })
  }

  return {
    storagePath: data.path,
    publicUrl: signedData?.signedUrl ?? '',
  }
}

export async function uploadMultipleEvidence(
  incidentId: string,
  files: File[],
  category: EvidenceCategory,
  onProgress?: (pct: number) => void
): Promise<string[]> {
  const paths: string[] = []
  for (let i = 0; i < files.length; i++) {
    const { storagePath } = await uploadEvidence(incidentId, files[i], category)
    paths.push(storagePath)
    onProgress?.(Math.round(((i + 1) / files.length) * 100))
  }
  return paths
}

export async function getSignedUrl(storagePath: string, expiresIn = 3600): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from('incident-evidence')
    .createSignedUrl(storagePath, expiresIn)
  if (error) throw error
  return data.signedUrl
}

export async function uploadSignature(
  incidentId: string,
  signatureDataUrl: string
): Promise<string> {
  const supabase = createClient()
  const res = await fetch(signatureDataUrl)
  const blob = await res.blob()
  const file = new File([blob], 'signature.png', { type: 'image/png' })
  const storagePath = `${incidentId}/signature/signature.png`

  const { error } = await supabase.storage
    .from('incident-evidence')
    .upload(storagePath, file, { upsert: true })

  if (error) throw error
  return storagePath
}

export async function deleteEvidence(
  incidentId: string,
  storagePath: string
): Promise<void> {
  const supabase = createClient()
  await supabase.storage
    .from('incident-evidence')
    .remove([storagePath])

  await supabase
    .from('incident_evidence')
    .delete()
    .eq('incident_id', incidentId)
    .eq('storage_path', storagePath)
}
