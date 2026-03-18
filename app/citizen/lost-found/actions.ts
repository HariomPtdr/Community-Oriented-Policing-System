'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  reportItemSchema,
  claimItemSchema,
  listFiltersSchema,
  CATEGORY_DETAIL_SCHEMAS,
  type LFItem,
  type LFClaim,
  type LFMatch,
  type ListFilters,
} from '@/lib/validations/lost-found'

// ═══════════════════════════════════════════════════════════════
// 1. SUBMIT LOST/FOUND REPORT
// ═══════════════════════════════════════════════════════════════

export async function submitLostFoundReport(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', success: false }

  // Extract form values
  const raw = {
    reportType: formData.get('reportType') as string,
    itemName: formData.get('itemName') as string,
    category: formData.get('category') as string,
    description: formData.get('description') as string,
    brand: formData.get('brand') as string || undefined,
    color: formData.get('color') as string || undefined,
    locationText: formData.get('locationText') as string,
    locationArea: formData.get('locationArea') as string || undefined,
    latitude: formData.get('latitude') ? parseFloat(formData.get('latitude') as string) : undefined,
    longitude: formData.get('longitude') ? parseFloat(formData.get('longitude') as string) : undefined,
    incidentDate: formData.get('incidentDate') as string,
    incidentTime: formData.get('incidentTime') as string || undefined,
    contactName: formData.get('contactName') as string,
    contactPhone: formData.get('contactPhone') as string,
    contactEmail: formData.get('contactEmail') as string || undefined,
    contactViaPlatform: formData.get('contactViaPlatform') === 'true',
    showPhone: formData.get('showPhone') === 'true',
    showEmail: formData.get('showEmail') === 'true',
    hasReward: formData.get('hasReward') === 'true',
    rewardAmount: formData.get('rewardAmount') ? parseFloat(formData.get('rewardAmount') as string) : undefined,
    rewardNote: formData.get('rewardNote') as string || undefined,
    categoryDetails: formData.get('categoryDetails') ? JSON.parse(formData.get('categoryDetails') as string) : undefined,
  }

  // Validate
  const parsed = reportItemSchema.safeParse(raw)
  if (!parsed.success) {
    const errs = parsed.error.flatten()
    return { error: 'Validation failed', fieldErrors: errs.fieldErrors, success: false }
  }
  const data = parsed.data

  // Validate category-specific details
  if (data.categoryDetails && CATEGORY_DETAIL_SCHEMAS[data.category]) {
    const catSchema = CATEGORY_DETAIL_SCHEMAS[data.category]
    const catParsed = catSchema.safeParse(data.categoryDetails)
    if (!catParsed.success) {
      return { error: 'Category details validation failed', success: false }
    }
  }

  // Duplicate detection
  const forceSubmit = formData.get('forceSubmit') === 'true'
  if (!forceSubmit) {
    const { data: similar } = await supabase
      .from('lost_found_items')
      .select('id, item_name, category, report_type, created_at')
      .eq('reporter_id', user.id)
      .eq('category', data.category)
      .eq('report_type', data.reportType)
      .eq('status', 'active')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(5)

    if (similar && similar.length > 0) {
      return {
        duplicateWarning: true,
        similarItems: similar,
        message: 'You may have already reported a similar item. Review before submitting.',
        success: false,
      }
    }
  }

  // Check active item limit
  const { count: activeCount } = await supabase
    .from('lost_found_items')
    .select('*', { count: 'exact', head: true })
    .eq('reporter_id', user.id)
    .eq('status', 'active')

  if ((activeCount || 0) >= 15) {
    return { error: 'You have too many active reports. Please archive old ones first.', success: false }
  }

  // Photo paths from client-side upload
  const photoPaths: string[] = []
  const photoPathsRaw = formData.getAll('photoPaths')
  for (const p of photoPathsRaw) {
    if (typeof p === 'string' && p.length > 0) photoPaths.push(p)
  }

  // Late date warning for found items
  const incDate = new Date(data.incidentDate)
  const daysSince = Math.floor((Date.now() - incDate.getTime()) / (1000 * 60 * 60 * 24))
  let lateWarning: string | undefined
  if (data.reportType === 'found' && daysSince > 7) {
    lateWarning = 'This item was found over a week ago. Reporting promptly helps reunite items faster.'
  }

  // INSERT
  const { data: newItem, error } = await supabase
    .from('lost_found_items')
    .insert({
      reporter_id: user.id,
      report_type: data.reportType,
      item_name: data.itemName,
      category: data.category,
      description: data.description,
      brand: data.brand || null,
      color: data.color || null,
      category_details: data.categoryDetails || {},
      contact_name: data.contactName,
      contact_phone: data.contactPhone,
      contact_email: data.contactEmail || null,
      contact_via_platform: data.contactViaPlatform,
      show_phone: data.showPhone,
      show_email: data.showEmail,
      location_text: data.locationText,
      location_area: data.locationArea || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      incident_date: data.incidentDate,
      incident_time: data.incidentTime || null,
      has_reward: data.hasReward,
      reward_amount: data.hasReward ? data.rewardAmount : null,
      reward_note: data.hasReward ? data.rewardNote : null,
      photo_paths: photoPaths,
      primary_photo_path: photoPaths[0] || null,
      status: 'active',
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error submitting lost/found item:', error)
    return { error: 'Failed to submit item. Please try again.', success: false }
  }

  revalidatePath('/citizen/lost-found')
  return { success: true, itemId: newItem.id, lateWarning }
}

// ═══════════════════════════════════════════════════════════════
// 2. GET LOST/FOUND ITEMS (LISTING)
// ═══════════════════════════════════════════════════════════════

export async function getLostFoundItems(filters?: Partial<ListFilters>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { items: [], totalCount: 0, currentPage: 1, totalPages: 0 }

  const validatedFilters = listFiltersSchema.parse(filters || {})
  const { search, type, category, dateRange, status, page, pageSize } = validatedFilters

  let query = supabase
    .from('lost_found_items')
    .select(`
      id, item_name, category, report_type, status,
      description, color, brand, location_text, location_area,
      incident_date, incident_time, primary_photo_path, photo_paths,
      has_reward, reward_amount, reward_note,
      contact_name, contact_phone, contact_email,
      contact_via_platform, show_phone, show_email,
      category_details,
      created_at, updated_at, expires_at,
      reporter_id, claim_count, view_count, renewal_count,
      reporter:profiles!reporter_id(full_name, avatar_url)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  // Status filter
  if (status === 'all' || !status) {
    query = query.in('status', ['active', 'matched'])
  } else if (status === 'reunited') {
    query = query.eq('status', 'reunited')
  } else {
    query = query.eq('status', status)
  }

  // Type filter
  if (type && type !== 'all') {
    query = query.eq('report_type', type)
  }

  // Category filter
  if (category && category !== 'all') {
    query = query.eq('category', category)
  }

  // Search
  if (search && search.trim()) {
    const cleanSearch = search.trim().replace(/[%_]/g, '')
    query = query.or(`item_name.ilike.%${cleanSearch}%,description.ilike.%${cleanSearch}%,location_text.ilike.%${cleanSearch}%`)
  }

  // Date range
  const now = new Date()
  if (dateRange === 'today') {
    query = query.gte('incident_date', now.toISOString().split('T')[0])
  } else if (dateRange === 'week') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    query = query.gte('incident_date', weekAgo.toISOString().split('T')[0])
  } else if (dateRange === 'month') {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    query = query.gte('incident_date', monthAgo.toISOString().split('T')[0])
  }

  // Pagination
  const offset = (page - 1) * pageSize
  query = query.range(offset, offset + pageSize - 1)

  const { data: items, error, count } = await query
  if (error) {
    console.error('Error fetching lost/found items:', error)
    return { items: [], totalCount: 0, currentPage: page, totalPages: 0 }
  }

  // Generate photo URLs
  const itemsWithPhotos = (items || []).map((item: any) => {
    let photo_url: string | null = null
    if (item.primary_photo_path) {
      const { data: urlData } = supabase.storage
        .from('lost-found-media')
        .getPublicUrl(item.primary_photo_path)
      photo_url = urlData?.publicUrl || null
    }
    return { ...item, photo_url }
  })

  const totalCount = count || 0
  const totalPages = Math.ceil(totalCount / pageSize)

  return {
    items: itemsWithPhotos as LFItem[],
    totalCount,
    currentPage: page,
    totalPages,
    hasNextPage: page < totalPages,
  }
}

// ═══════════════════════════════════════════════════════════════
// 3. GET USER'S OWN ITEMS
// ═══════════════════════════════════════════════════════════════

export async function getMyLostFoundItems() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('lost_found_items')
    .select(`
      id, item_name, category, report_type, status,
      description, color, brand, location_text, location_area,
      incident_date, primary_photo_path, photo_paths,
      has_reward, reward_amount,
      contact_name, contact_phone, contact_email,
      category_details,
      created_at, updated_at, expires_at,
      claim_count, view_count, renewal_count
    `)
    .eq('reporter_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return []

  return (data || []).map((item: any) => {
    let photo_url = null
    if (item.primary_photo_path) {
      const { data: urlData } = supabase.storage
        .from('lost-found-media')
        .getPublicUrl(item.primary_photo_path)
      photo_url = urlData?.publicUrl || null
    }
    return { ...item, photo_url }
  }) as LFItem[]
}

// ═══════════════════════════════════════════════════════════════
// 4. GET SINGLE ITEM DETAIL
// ═══════════════════════════════════════════════════════════════

export async function getLostFoundItem(itemId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: item, error } = await supabase
    .from('lost_found_items')
    .select(`
      *,
      reporter:profiles!reporter_id(full_name, avatar_url, phone)
    `)
    .eq('id', itemId)
    .single()

  if (error || !item) return null

  // Increment view count (not for own items)
  if (item.reporter_id !== user.id) {
    await supabase.from('lost_found_items')
      .update({ view_count: (item.view_count || 0) + 1 })
      .eq('id', itemId)
  }

  // Generate photo URLs for all photos
  const photoUrls = (item.photo_paths || []).map((path: string) => {
    const { data: urlData } = supabase.storage
      .from('lost-found-media')
      .getPublicUrl(path)
    return urlData?.publicUrl || null
  }).filter(Boolean)

  // Get matches for this item
  const { data: matches } = await supabase
    .from('lost_found_matches')
    .select(`
      *,
      lost_item:lost_found_items!lost_item_id(id, item_name, category, report_type, status, location_text, incident_date, primary_photo_path, reporter:profiles!reporter_id(full_name)),
      found_item:lost_found_items!found_item_id(id, item_name, category, report_type, status, location_text, incident_date, primary_photo_path, reporter:profiles!reporter_id(full_name))
    `)
    .or(`lost_item_id.eq.${itemId},found_item_id.eq.${itemId}`)
    .eq('is_dismissed', false)
    .order('match_score', { ascending: false })
    .limit(5)

  // Get claims for this item (only if reporter or claimant)
  let claims: LFClaim[] = []
  if (item.reporter_id === user.id) {
    const { data: claimData } = await supabase
      .from('lost_found_claims')
      .select(`
        *,
        claimant:profiles!claimant_id(full_name, avatar_url, phone)
      `)
      .eq('item_id', itemId)
      .order('created_at', { ascending: false })
    claims = (claimData || []) as LFClaim[]
  } else {
    const { data: myClaim } = await supabase
      .from('lost_found_claims')
      .select('*')
      .eq('item_id', itemId)
      .eq('claimant_id', user.id)
      .limit(1)
    claims = (myClaim || []) as LFClaim[]
  }

  return {
    item: { ...item, photo_urls: photoUrls } as LFItem & { photo_urls: string[] },
    matches: (matches || []) as LFMatch[],
    claims,
    isOwner: item.reporter_id === user.id,
    currentUserId: user.id,
  }
}

// ═══════════════════════════════════════════════════════════════
// 5. SUBMIT CLAIM
// ═══════════════════════════════════════════════════════════════

export async function submitClaim(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', success: false }

  const raw = {
    itemId: formData.get('itemId') as string,
    claimMessage: formData.get('claimMessage') as string,
    proofDescription: formData.get('proofDescription') as string || undefined,
  }

  const parsed = claimItemSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: 'Please provide more details (at least 30 characters).', success: false }
  }

  // Fetch the item
  const { data: item, error: itemErr } = await supabase
    .from('lost_found_items')
    .select('id, reporter_id, item_name, status, report_type')
    .eq('id', parsed.data.itemId)
    .single()

  if (!item || itemErr) return { error: 'Item not found.', success: false }
  if (item.reporter_id === user.id) return { error: 'You cannot claim an item you reported.', success: false }
  if (!['active', 'matched'].includes(item.status)) {
    return { error: 'This item is no longer available for claiming.', success: false }
  }

  // Check for existing claim
  const { data: existingClaim } = await supabase
    .from('lost_found_claims')
    .select('id')
    .eq('item_id', parsed.data.itemId)
    .eq('claimant_id', user.id)
    .limit(1)

  if (existingClaim && existingClaim.length > 0) {
    return { error: 'You have already submitted a claim for this item.', success: false }
  }

  // Fraud check: 3+ rejected claims this month
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { count: rejectedCount } = await supabase
    .from('lost_found_claims')
    .select('*', { count: 'exact', head: true })
    .eq('claimant_id', user.id)
    .eq('status', 'rejected')
    .gte('created_at', monthAgo)

  if ((rejectedCount || 0) >= 3) {
    return {
      error: 'Too many rejected claims. Please contact your local station for assistance.',
      success: false,
      blocked: true,
    }
  }

  // Get proof file paths
  const proofPaths: string[] = []
  const proofPathsRaw = formData.getAll('proofPaths')
  for (const p of proofPathsRaw) {
    if (typeof p === 'string' && p.length > 0) proofPaths.push(p)
  }

  // Insert claim
  const { data: newClaim, error: claimErr } = await supabase
    .from('lost_found_claims')
    .insert({
      item_id: parsed.data.itemId,
      claimant_id: user.id,
      claim_message: parsed.data.claimMessage,
      proof_description: parsed.data.proofDescription || null,
      proof_file_paths: proofPaths,
      status: 'pending',
    })
    .select('id')
    .single()

  if (claimErr) {
    console.error('Error submitting claim:', claimErr)
    return { error: 'Failed to submit claim.', success: false }
  }

  // Update item status to 'claimed' if currently active
  if (item.status === 'active') {
    await supabase.from('lost_found_items')
      .update({ status: 'claimed' })
      .eq('id', item.id)
  }

  // Notify item reporter
  await supabase.from('notifications').insert({
    user_id: item.reporter_id,
    title: '📋 New Claim on Your Item',
    body: `Someone has claimed your ${item.report_type} item "${item.item_name}". Review the claim details.`,
    type: 'info',
    reference_id: item.id,
  })

  revalidatePath('/citizen/lost-found')
  return {
    success: true,
    claimId: newClaim.id,
    message: 'Claim submitted successfully. The reporter will be notified.',
  }
}

// ═══════════════════════════════════════════════════════════════
// 6. UPLOAD ITEM PHOTO
// ═══════════════════════════════════════════════════════════════

export async function uploadItemPhoto(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', success: false }

  const file = formData.get('file') as File
  const itemId = formData.get('itemId') as string
  const uploadType = (formData.get('type') as string) || 'photo'

  if (!file || file.size === 0) return { error: 'No file provided.', success: false }
  if (file.size > 10 * 1024 * 1024) return { error: 'File too large. Max 10MB.', success: false }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return { error: 'Only JPEG, PNG, and WebP images are allowed.', success: false }
  }

  // Generate storage path
  const ext = file.name.split('.').pop() || 'jpg'
  const folder = uploadType === 'proof' ? 'proof' : 'photos'
  const path = `${itemId || user.id}/${folder}/${crypto.randomUUID()}.${ext}`

  // Upload
  const { error: uploadErr } = await supabase.storage
    .from('lost-found-media')
    .upload(path, file)

  if (uploadErr) {
    console.error('Upload error:', uploadErr)
    return { error: 'Failed to upload photo.', success: false }
  }

  const { data: urlData } = supabase.storage
    .from('lost-found-media')
    .getPublicUrl(path)

  // If item exists, update its photo_paths
  if (itemId && uploadType === 'photo') {
    const { data: item } = await supabase
      .from('lost_found_items')
      .select('photo_paths, primary_photo_path')
      .eq('id', itemId)
      .eq('reporter_id', user.id)
      .single()

    if (item) {
      const currentPaths = item.photo_paths || []
      if (currentPaths.length >= 5) {
        return { error: 'Maximum 5 photos allowed per item.', storagePath: path, signedUrl: urlData?.publicUrl }
      }
      await supabase.from('lost_found_items')
        .update({
          photo_paths: [...currentPaths, path],
          primary_photo_path: item.primary_photo_path || path,
        })
        .eq('id', itemId)
    }
  }

  return {
    success: true,
    storagePath: path,
    signedUrl: urlData?.publicUrl || '',
  }
}

// ═══════════════════════════════════════════════════════════════
// 7. MARK FOUND BY SELF
// ═══════════════════════════════════════════════════════════════

export async function markFoundBySelf(itemId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', success: false }

  const { data: item } = await supabase
    .from('lost_found_items')
    .select('id, reporter_id, report_type, status')
    .eq('id', itemId)
    .eq('reporter_id', user.id)
    .single()

  if (!item) return { error: 'Item not found or not yours.', success: false }
  if (!['active', 'matched', 'claimed'].includes(item.status)) {
    return { error: 'This item cannot be resolved in its current state.', success: false }
  }

  // Update item
  const { error } = await supabase
    .from('lost_found_items')
    .update({ status: 'reunited' })
    .eq('id', itemId)

  if (error) return { error: 'Failed to update.', success: false }

  // Reject all pending claims
  await supabase
    .from('lost_found_claims')
    .update({ status: 'rejected', rejection_reason: 'Item recovered by reporter' })
    .eq('item_id', itemId)
    .in('status', ['pending', 'verifying'])

  revalidatePath('/citizen/lost-found')
  return { success: true }
}

// ═══════════════════════════════════════════════════════════════
// 8. ARCHIVE ITEM
// ═══════════════════════════════════════════════════════════════

export async function archiveItem(itemId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', success: false }

  const { error } = await supabase
    .from('lost_found_items')
    .update({ status: 'archived' })
    .eq('id', itemId)
    .eq('reporter_id', user.id)
    .in('status', ['active', 'matched', 'expired'])

  if (error) return { error: 'Failed to archive.', success: false }

  // Reject pending claims
  await supabase
    .from('lost_found_claims')
    .update({ status: 'rejected', rejection_reason: 'Listing archived by reporter' })
    .eq('item_id', itemId)
    .in('status', ['pending', 'verifying'])

  revalidatePath('/citizen/lost-found')
  return { success: true }
}

// ═══════════════════════════════════════════════════════════════
// 9. RENEW EXPIRED LISTING
// ═══════════════════════════════════════════════════════════════

export async function renewListing(itemId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', success: false }

  const { data: item } = await supabase
    .from('lost_found_items')
    .select('id, status, renewal_count')
    .eq('id', itemId)
    .eq('reporter_id', user.id)
    .single()

  if (!item) return { error: 'Item not found.', success: false }
  if (item.status !== 'expired') return { error: 'Item is not expired.', success: false }
  if ((item.renewal_count || 0) >= 3) {
    return { error: 'Maximum renewals reached (3). Visit your station for assistance.', success: false }
  }

  const { error } = await supabase
    .from('lost_found_items')
    .update({
      status: 'active',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      expiry_warned: false,
      renewal_count: (item.renewal_count || 0) + 1,
    })
    .eq('id', itemId)

  if (error) return { error: 'Failed to renew.', success: false }

  revalidatePath('/citizen/lost-found')
  return { success: true }
}

// ═══════════════════════════════════════════════════════════════
// 10. DISMISS MATCH
// ═══════════════════════════════════════════════════════════════

export async function dismissMatch(matchId: string, reason?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', success: false }

  const { error } = await supabase
    .from('lost_found_matches')
    .update({
      is_dismissed: true,
      dismissed_by: user.id,
      dismissed_reason: reason || 'Not my item',
    })
    .eq('id', matchId)

  if (error) return { error: 'Failed to dismiss match.', success: false }

  revalidatePath('/citizen/lost-found')
  return { success: true }
}

// ═══════════════════════════════════════════════════════════════
// 11. DELETE ITEM PHOTO
// ═══════════════════════════════════════════════════════════════

export async function deleteItemPhoto(itemId: string, photoPath: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', success: false }

  const { data: item } = await supabase
    .from('lost_found_items')
    .select('photo_paths, primary_photo_path')
    .eq('id', itemId)
    .eq('reporter_id', user.id)
    .single()

  if (!item) return { error: 'Item not found.', success: false }

  // Remove from storage
  await supabase.storage.from('lost-found-media').remove([photoPath])

  // Update DB
  const newPaths = (item.photo_paths || []).filter((p: string) => p !== photoPath)
  const newPrimary = item.primary_photo_path === photoPath ? (newPaths[0] || null) : item.primary_photo_path

  await supabase.from('lost_found_items')
    .update({ photo_paths: newPaths, primary_photo_path: newPrimary })
    .eq('id', itemId)

  revalidatePath('/citizen/lost-found')
  return { success: true }
}

// ═══════════════════════════════════════════════════════════════
// 12. GET MATCHES FOR ITEM
// ═══════════════════════════════════════════════════════════════

export async function getItemMatches(itemId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('lost_found_matches')
    .select(`
      *,
      lost_item:lost_found_items!lost_item_id(id, item_name, category, report_type, status, location_text, incident_date, primary_photo_path, reporter:profiles!reporter_id(full_name, avatar_url)),
      found_item:lost_found_items!found_item_id(id, item_name, category, report_type, status, location_text, incident_date, primary_photo_path, reporter:profiles!reporter_id(full_name, avatar_url))
    `)
    .or(`lost_item_id.eq.${itemId},found_item_id.eq.${itemId}`)
    .eq('is_dismissed', false)
    .order('match_score', { ascending: false })

  return (data || []) as LFMatch[]
}
