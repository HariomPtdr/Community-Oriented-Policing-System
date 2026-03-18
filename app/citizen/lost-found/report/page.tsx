'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { submitLostFoundReport, uploadItemPhoto } from '../actions'
import { LF_CATEGORIES, type LFCategory } from '@/lib/validations/lost-found'
import { createClient } from '@/lib/supabase/client'
import {
  Package, MapPin, Calendar, Clock,
  Upload, X, Camera, ArrowLeft,
  ChevronRight, Loader2, Info, User,
  Phone, Mail, Shield, Award,
  AlertTriangle, CheckCircle2, Eye, EyeOff
} from 'lucide-react'

// ── Category-specific field configs ─────────────────────────

const CATEGORY_FIELDS: Record<string, { key: string; label: string; type: string; placeholder?: string; options?: { value: string; label: string }[] }[]> = {
  mobile_phone: [
    { key: 'imei', label: 'IMEI Number', type: 'text', placeholder: '15-digit IMEI number' },
    { key: 'model', label: 'Model', type: 'text', placeholder: 'e.g., iPhone 13, Samsung S22' },
    { key: 'hasLockScreen', label: 'Has Screen Lock?', type: 'select', options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] },
    { key: 'caseColor', label: 'Phone Case Color', type: 'text', placeholder: 'e.g., Red, Blue transparent' },
  ],
  vehicle: [
    { key: 'vehicleType', label: 'Vehicle Type', type: 'select', options: [
      { value: 'two_wheeler', label: 'Two Wheeler' }, { value: 'four_wheeler', label: 'Four Wheeler' },
      { value: 'cycle', label: 'Cycle' }, { value: 'other', label: 'Other' },
    ]},
    { key: 'regNumber', label: 'Registration Number', type: 'text', placeholder: 'e.g., MP 09 AB 1234' },
    { key: 'make', label: 'Make', type: 'text', placeholder: 'e.g., Honda, Hyundai' },
    { key: 'model', label: 'Model', type: 'text', placeholder: 'e.g., Activa, i20' },
  ],
  documents: [
    { key: 'docType', label: 'Document Type', type: 'select', options: [
      { value: 'aadhaar', label: 'Aadhaar Card' }, { value: 'pan', label: 'PAN Card' },
      { value: 'driving_licence', label: 'Driving Licence' }, { value: 'passport', label: 'Passport' },
      { value: 'voter_id', label: 'Voter ID' }, { value: 'other', label: 'Other' },
    ]},
    { key: 'nameOnDoc', label: 'Name on Document', type: 'text', placeholder: 'Helps verify ownership' },
    { key: 'issueYear', label: 'Issue Year', type: 'number', placeholder: 'e.g., 2020' },
  ],
  wallet_bag: [
    { key: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g., Wildcraft, Baggit' },
    { key: 'material', label: 'Material', type: 'select', options: [
      { value: 'leather', label: 'Leather' }, { value: 'cloth', label: 'Cloth' },
      { value: 'synthetic', label: 'Synthetic' }, { value: 'other', label: 'Other' },
    ]},
    { key: 'contentsDesc', label: 'Contents Description', type: 'textarea', placeholder: 'Do NOT include card numbers or sensitive info' },
    { key: 'approxCash', label: 'Approximate Cash (₹)', type: 'number', placeholder: '0' },
  ],
  keys: [
    { key: 'keyType', label: 'Key Type', type: 'select', options: [
      { value: 'house', label: 'House' }, { value: 'vehicle', label: 'Vehicle' },
      { value: 'office', label: 'Office' }, { value: 'other', label: 'Other' },
    ]},
    { key: 'keyringDesc', label: 'Keyring Description', type: 'text', placeholder: 'Describe the keyring or attached items' },
  ],
  jewellery: [
    { key: 'jewelleryType', label: 'Type', type: 'select', options: [
      { value: 'ring', label: 'Ring' }, { value: 'necklace', label: 'Necklace' },
      { value: 'earrings', label: 'Earrings' }, { value: 'bangle', label: 'Bangle' },
      { value: 'chain', label: 'Chain' }, { value: 'other', label: 'Other' },
    ]},
    { key: 'metal', label: 'Metal', type: 'select', options: [
      { value: 'gold', label: 'Gold' }, { value: 'silver', label: 'Silver' },
      { value: 'platinum', label: 'Platinum' }, { value: 'other', label: 'Other' },
    ]},
    { key: 'engravings', label: 'Engravings / Markings', type: 'text', placeholder: 'Any engravings or unique marks' },
    { key: 'estimatedValue', label: 'Estimated Value (₹)', type: 'number', placeholder: '0' },
  ],
  pets: [
    { key: 'petType', label: 'Pet Type', type: 'select', options: [
      { value: 'dog', label: 'Dog' }, { value: 'cat', label: 'Cat' },
      { value: 'bird', label: 'Bird' }, { value: 'other', label: 'Other' },
    ]},
    { key: 'breed', label: 'Breed', type: 'text', placeholder: 'e.g., Labrador, Persian' },
    { key: 'petName', label: 'Pet Name', type: 'text', placeholder: "Pet's name if known" },
    { key: 'collarDesc', label: 'Collar Description', type: 'text', placeholder: 'Color, tags, etc.' },
  ],
  person: [
    { key: 'age', label: 'Approximate Age', type: 'number', placeholder: 'Years' },
    { key: 'height', label: 'Height', type: 'text', placeholder: "e.g., 5'8\" or 173cm" },
    { key: 'weight', label: 'Weight', type: 'text', placeholder: 'e.g., 70kg' },
    { key: 'lastSeenWearing', label: 'Last Seen Wearing', type: 'textarea', placeholder: 'Describe clothing when last seen' },
    { key: 'identifyingMarks', label: 'Identifying Marks', type: 'textarea', placeholder: 'Scars, tattoos, birthmarks, etc.' },
    { key: 'relationship', label: 'Relationship', type: 'text', placeholder: 'e.g., Father, Brother, Friend' },
  ],
}

export default function ReportPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null)
  const [step, setStep] = useState(1) // 1-5

  // Report type
  const [reportType, setReportType] = useState<'lost' | 'found'>('lost')

  // Item details
  const [itemName, setItemName] = useState('')
  const [category, setCategory] = useState<LFCategory | ''>('')
  const [description, setDescription] = useState('')
  const [brand, setBrand] = useState('')
  const [color, setColor] = useState('')
  const [categoryDetails, setCategoryDetails] = useState<Record<string, any>>({})

  // Location & timing
  const [locationText, setLocationText] = useState('')
  const [locationArea, setLocationArea] = useState('')
  const [incidentDate, setIncidentDate] = useState('')
  const [incidentTime, setIncidentTime] = useState('')

  // Contact
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactViaPlatform, setContactViaPlatform] = useState(true)
  const [showPhone, setShowPhone] = useState(false)
  const [showEmail, setShowEmail] = useState(false)

  // Reward
  const [hasReward, setHasReward] = useState(false)
  const [rewardAmount, setRewardAmount] = useState('')
  const [rewardNote, setRewardNote] = useState('')

  // Photos
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [uploadedPaths, setUploadedPaths] = useState<string[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)

  // Pre-fill contact from profile
  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .single()
      if (data) {
        setContactName(data.full_name || '')
        setContactPhone(data.phone || '')
        setContactEmail(user.email || '')
      }
    }
    loadProfile()
  }, [])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (images.length + files.length > 5) {
      setError('Maximum 5 photos allowed')
      return
    }
    const validFiles = files.filter(f => {
      if (f.size > 10 * 1024 * 1024) { setError('Each photo must be under 10MB'); return false }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
        setError('Only JPEG, PNG, and WebP allowed'); return false
      }
      return true
    })
    setImages(prev => [...prev, ...validFiles])
    setPreviews(prev => [...prev, ...validFiles.map(f => URL.createObjectURL(f))])
    setError('')
  }

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx))
    setPreviews(prev => prev.filter((_, i) => i !== idx))
  }

  const updateCategoryDetail = (key: string, value: any) => {
    setCategoryDetails(prev => ({ ...prev, [key]: value }))
  }

  // Validate current step
  const validateStep = (): boolean => {
    setError('')
    setFieldErrors({})
    if (step === 1) {
      if (!itemName.trim()) { setError('Item name is required'); return false }
      if (!category) { setError('Please select a category'); return false }
      if (description.length < 10) { setError('Description must be at least 10 characters'); return false }
      return true
    }
    if (step === 2) {
      // Category details are optional
      return true
    }
    if (step === 3) {
      if (!locationText.trim()) { setError('Location is required'); return false }
      if (!incidentDate) { setError('Date is required'); return false }
      if (new Date(incidentDate) > new Date()) { setError('Date cannot be in the future'); return false }
      return true
    }
    if (step === 4) {
      if (!contactName.trim()) { setError('Contact name is required'); return false }
      if (!contactPhone.trim() || contactPhone.length < 10) { setError('Valid phone number is required'); return false }
      return true
    }
    return true
  }

  const nextStep = () => {
    if (validateStep()) setStep(prev => Math.min(6, prev + 1))
  }

  const prevStep = () => setStep(prev => Math.max(1, prev - 1))

  // Submit
  const handleSubmit = async (forceSubmit = false) => {
    setLoading(true)
    setError('')

    try {
      // Upload photos first
      const paths: string[] = []
      if (images.length > 0) {
        setUploadingPhotos(true)
        for (const file of images) {
          const fd = new FormData()
          fd.append('file', file)
          fd.append('type', 'photo')
          const res = await uploadItemPhoto(fd)
          if (res.success && res.storagePath) {
            paths.push(res.storagePath)
          }
        }
        setUploadedPaths(paths)
        setUploadingPhotos(false)
      }

      // Build form data
      const fd = new FormData()
      fd.append('reportType', reportType)
      fd.append('itemName', itemName)
      fd.append('category', category)
      fd.append('description', description)
      if (brand) fd.append('brand', brand)
      if (color) fd.append('color', color)
      if (Object.keys(categoryDetails).length > 0) {
        fd.append('categoryDetails', JSON.stringify(categoryDetails))
      }
      fd.append('locationText', locationText)
      if (locationArea) fd.append('locationArea', locationArea)
      fd.append('incidentDate', incidentDate)
      if (incidentTime) fd.append('incidentTime', incidentTime)
      fd.append('contactName', contactName)
      fd.append('contactPhone', contactPhone)
      if (contactEmail) fd.append('contactEmail', contactEmail)
      fd.append('contactViaPlatform', String(contactViaPlatform))
      fd.append('showPhone', String(showPhone))
      fd.append('showEmail', String(showEmail))
      fd.append('hasReward', String(hasReward))
      if (hasReward && rewardAmount) fd.append('rewardAmount', rewardAmount)
      if (hasReward && rewardNote) fd.append('rewardNote', rewardNote)
      for (const p of paths) fd.append('photoPaths', p)
      if (forceSubmit) fd.append('forceSubmit', 'true')

      const res = await submitLostFoundReport(fd)

      if (res.duplicateWarning && !forceSubmit) {
        setDuplicateWarning(res)
        setLoading(false)
        return
      }

      if (res.success) {
        router.push('/citizen/lost-found')
      } else {
        setError(res.error || 'Something went wrong')
        if (res.fieldErrors) setFieldErrors(res.fieldErrors as Record<string, string[]>)
      }
    } catch (err: any) {
      setError(err.message || 'Submission failed')
    } finally {
      setLoading(false)
    }
  }

  const categoryFields = category ? CATEGORY_FIELDS[category] : []

  // Step labels
  const steps = [
    { num: 1, label: 'Item Details', icon: Package, color: 'orange' },
    { num: 2, label: 'Category Info', icon: Info, color: 'purple' },
    { num: 3, label: 'Location & Date', icon: MapPin, color: 'blue' },
    { num: 4, label: 'Contact', icon: User, color: 'emerald' },
    { num: 5, label: 'Photos & Reward', icon: Camera, color: 'violet' },
    { num: 6, label: 'Review', icon: Eye, color: 'amber' },
  ]

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <button onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-6 group"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        Back
      </button>

      <div className="bg-gradient-to-br from-[#111827] to-[#0D1420] border border-[#1F2D42] rounded-[2rem] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-[#1F2D42]/60">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Report Item</h1>
              <p className="text-gray-500 text-sm">Help the community by providing accurate details.</p>
            </div>
            <div className="flex bg-[#0D1420] border border-[#1F2D42] rounded-2xl p-1.5">
              <button onClick={() => setReportType('lost')}
                className={`flex-1 md:w-32 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  reportType === 'lost' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-gray-500 hover:text-white'
                }`}
              >
                I Lost
              </button>
              <button onClick={() => setReportType('found')}
                className={`flex-1 md:w-32 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  reportType === 'found' ? 'bg-green-500 text-black shadow-lg shadow-green-500/20' : 'text-gray-500 hover:text-white'
                }`}
              >
                I Found
              </button>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1 w-full">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center flex-1 last:flex-none">
                <button
                  onClick={() => { if (s.num < step) setStep(s.num) }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 transition-all ${
                    step === s.num ? 'bg-orange-500 text-black scale-110 shadow-lg shadow-orange-500/30' :
                    step > s.num ? 'bg-green-500/20 text-green-400 cursor-pointer hover:scale-105' :
                    'bg-[#1F2D42] text-gray-600'
                  }`}
                >
                  {step > s.num ? '✓' : s.num}
                </button>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 ${step > s.num ? 'bg-green-500/40' : 'bg-[#1F2D42]'}`} />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-[10px] font-black text-gray-500 uppercase tracking-widest mt-3">
            Step {step}: {steps[step - 1]?.label}
          </p>
        </div>

        <div className="p-6 md:p-8">
          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-red-400 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Duplicate Warning */}
          {duplicateWarning && (
            <div className="mb-6 p-5 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-yellow-400">
                <AlertTriangle className="w-5 h-5" />
                <p className="font-bold text-sm">{duplicateWarning.message}</p>
              </div>
              <div className="space-y-2">
                {duplicateWarning.similarItems?.map((si: any) => (
                  <div key={si.id} className="bg-[#111827] border border-[#1F2D42] rounded-xl p-3 text-xs text-gray-400">
                    {si.item_name} — {si.category} — Reported on {new Date(si.created_at).toLocaleDateString()}
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setDuplicateWarning(null)}
                  className="flex-1 py-2.5 bg-[#1F2D42] text-white font-bold text-xs rounded-xl"
                >
                  Go Back & Edit
                </button>
                <button onClick={() => { setDuplicateWarning(null); handleSubmit(true) }}
                  className="flex-1 py-2.5 bg-orange-500 text-black font-bold text-xs rounded-xl"
                >
                  These Are Different Items — Submit
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 1: Item Details ──────────────────────────── */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Item Name *</label>
                <input
                  value={itemName} onChange={e => setItemName(e.target.value)}
                  placeholder="e.g., iPhone 13 Pro, Brown Leather Wallet"
                  className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-2xl px-5 py-4 text-white outline-none focus:border-orange-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Category *</label>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {LF_CATEGORIES.map(cat => (
                    <button
                      key={cat.value} type="button"
                      onClick={() => { setCategory(cat.value as LFCategory); setCategoryDetails({}) }}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        category === cat.value
                          ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
                          : 'bg-[#0D1420] border-[#1F2D42] text-gray-500 hover:border-[#2a3a52] hover:text-white'
                      }`}
                    >
                      <span className="text-2xl block mb-1">{cat.icon}</span>
                      <span className="text-[10px] font-black uppercase tracking-wider">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Brand</label>
                  <input
                    value={brand} onChange={e => setBrand(e.target.value)}
                    placeholder="e.g., Apple, Samsung, Wildcraft"
                    className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-2xl px-5 py-4 text-white outline-none focus:border-orange-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Color</label>
                  <input
                    value={color} onChange={e => setColor(e.target.value)}
                    placeholder="e.g., Black, Brown, Silver"
                    className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-2xl px-5 py-4 text-white outline-none focus:border-orange-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Description *</label>
                <textarea
                  value={description} onChange={e => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe the item in detail — size, brand, color, unique marks, condition..."
                  className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-2xl px-5 py-4 text-white outline-none focus:border-orange-500 transition-all resize-none"
                />
                <p className={`text-[10px] ${description.length < 10 ? 'text-red-400' : 'text-gray-600'}`}>
                  {description.length}/10 min characters
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 2: Category Details ─────────────────────── */}
          {step === 2 && (
            <div className="space-y-6">
              {categoryFields && categoryFields.length > 0 ? (
                <>
                  <div className="flex items-center gap-3 text-purple-400 mb-2">
                    <Info className="w-5 h-5" />
                    <h2 className="text-sm font-black uppercase tracking-widest">
                      {LF_CATEGORIES.find(c => c.value === category)?.label} Details
                    </h2>
                  </div>
                  <p className="text-gray-500 text-xs">These details increase match accuracy. All fields are optional.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categoryFields.map(field => (
                      <div key={field.key} className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{field.label}</label>
                        {field.type === 'select' ? (
                          <select
                            value={categoryDetails[field.key] || ''}
                            onChange={e => updateCategoryDetail(field.key, e.target.value)}
                            className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-2xl px-5 py-4 text-white outline-none focus:border-purple-500 transition-all appearance-none"
                          >
                            <option value="">Select...</option>
                            {field.options?.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : field.type === 'textarea' ? (
                          <textarea
                            value={categoryDetails[field.key] || ''}
                            onChange={e => updateCategoryDetail(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            rows={3}
                            className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-2xl px-5 py-4 text-white outline-none focus:border-purple-500 transition-all resize-none"
                          />
                        ) : (
                          <input
                            type={field.type}
                            value={categoryDetails[field.key] || ''}
                            onChange={e => updateCategoryDetail(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-2xl px-5 py-4 text-white outline-none focus:border-purple-500 transition-all"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                    <Info className="w-8 h-8 text-purple-400" />
                  </div>
                  <h3 className="text-white font-bold mb-2">No Additional Fields</h3>
                  <p className="text-gray-500 text-sm">This category doesn't require extra details. Continue to the next step.</p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Location & Date ──────────────────────── */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-blue-400 mb-2">
                <MapPin className="w-5 h-5" />
                <h2 className="text-sm font-black uppercase tracking-widest">Location & Timing</h2>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Where was it {reportType}? *</label>
                <input
                  value={locationText} onChange={e => setLocationText(e.target.value)}
                  placeholder="e.g., Sector 15 Metro Station, Near City Mall, MG Road"
                  className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-2xl px-5 py-4 text-white outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Area / Neighborhood</label>
                <input
                  value={locationArea} onChange={e => setLocationArea(e.target.value)}
                  placeholder="e.g., Vijay Nagar, Sector 5, Old City"
                  className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-2xl px-5 py-4 text-white outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Date {reportType === 'lost' ? 'Lost' : 'Found'} *</label>
                  <input
                    type="date" value={incidentDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={e => setIncidentDate(e.target.value)}
                    className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-2xl px-5 py-4 text-white outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Approximate Time</label>
                  <input
                    type="time" value={incidentTime}
                    onChange={e => setIncidentTime(e.target.value)}
                    className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-2xl px-5 py-4 text-white outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 flex gap-3">
                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-gray-400 leading-relaxed">
                  A specific location greatly improves the chance of reuniting items. Include landmarks, shop names, or street numbers when possible.
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 4: Contact ──────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-emerald-400 mb-2">
                <User className="w-5 h-5" />
                <h2 className="text-sm font-black uppercase tracking-widest">Contact Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Your Name *</label>
                  <input
                    value={contactName} onChange={e => setContactName(e.target.value)}
                    placeholder="Full Name" required
                    className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-2xl px-5 py-4 text-white outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Phone Number *</label>
                  <input
                    type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)}
                    placeholder="+91 XXXXX XXXXX" required
                    className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-2xl px-5 py-4 text-white outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Email Address</label>
                <input
                  type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-2xl px-5 py-4 text-white outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Contact Preferences</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 bg-[#0D1420] border border-[#1F2D42] rounded-xl cursor-pointer hover:border-emerald-500/30 transition-all">
                    <input type="radio" name="contact" checked={contactViaPlatform && !showPhone && !showEmail}
                      onChange={() => { setContactViaPlatform(true); setShowPhone(false); setShowEmail(false) }}
                      className="accent-emerald-500"
                    />
                    <div className="flex-1">
                      <p className="text-white text-sm font-bold">Via COPS Platform Only</p>
                      <p className="text-gray-500 text-[10px]">Recommended — keeps your number private</p>
                    </div>
                    <Shield className="w-5 h-5 text-emerald-400" />
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-[#0D1420] border border-[#1F2D42] rounded-xl cursor-pointer hover:border-emerald-500/30 transition-all">
                    <input type="radio" name="contact" checked={showPhone}
                      onChange={() => { setShowPhone(true); setShowEmail(false); setContactViaPlatform(false) }}
                      className="accent-emerald-500"
                    />
                    <div className="flex-1">
                      <p className="text-white text-sm font-bold">Show Phone Number</p>
                      <p className="text-gray-500 text-[10px]">Others can call you directly</p>
                    </div>
                    <Phone className="w-5 h-5 text-gray-500" />
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-[#0D1420] border border-[#1F2D42] rounded-xl cursor-pointer hover:border-emerald-500/30 transition-all">
                    <input type="radio" name="contact" checked={showEmail}
                      onChange={() => { setShowEmail(true); setShowPhone(false); setContactViaPlatform(false) }}
                      className="accent-emerald-500"
                    />
                    <div className="flex-1">
                      <p className="text-white text-sm font-bold">Show Email Address</p>
                      <p className="text-gray-500 text-[10px]">Others can email you</p>
                    </div>
                    <Mail className="w-5 h-5 text-gray-500" />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 5: Photos & Reward ──────────────────────── */}
          {step === 5 && (
            <div className="space-y-8">
              {/* Photos */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-violet-400">
                  <Camera className="w-5 h-5" />
                  <h2 className="text-sm font-black uppercase tracking-widest">Photos</h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {previews.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-[#1F2D42] group">
                      <img src={src} className="w-full h-full object-cover" alt="" />
                      <button type="button" onClick={() => removeImage(i)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {previews.length < 5 && (
                    <label className="aspect-square rounded-2xl border-2 border-dashed border-[#1F2D42] hover:border-violet-500/50 hover:bg-violet-500/5 transition-all flex flex-col items-center justify-center cursor-pointer group">
                      <Upload className="w-7 h-7 text-gray-700 group-hover:text-violet-400 mb-2 transition-colors" />
                      <span className="text-[9px] font-black text-gray-700 uppercase tracking-widest group-hover:text-violet-400">Upload</span>
                      <span className="text-[8px] text-gray-700 mt-0.5">{5 - previews.length} remaining</span>
                      <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} className="hidden" />
                    </label>
                  )}
                </div>

                <div className="bg-violet-500/5 border border-violet-500/10 rounded-2xl p-4 flex gap-3">
                  <Camera className="w-5 h-5 text-violet-400 shrink-0" />
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {reportType === 'lost'
                      ? "Adding a photo of the item or a similar reference image significantly increases match chances."
                      : "Avoid sharing sensitive personal information in photos (e.g., ID numbers, bank details)."}
                  </p>
                </div>
              </div>

              {/* Reward */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-amber-400">
                  <Award className="w-5 h-5" />
                  <h2 className="text-sm font-black uppercase tracking-widest">Reward</h2>
                </div>

                <label className="flex items-center gap-3 p-4 bg-[#0D1420] border border-[#1F2D42] rounded-xl cursor-pointer hover:border-amber-500/30 transition-all">
                  <input type="checkbox" checked={hasReward} onChange={e => setHasReward(e.target.checked)}
                    className="accent-amber-500 w-5 h-5"
                  />
                  <div>
                    <p className="text-white text-sm font-bold">Offering a reward?</p>
                    <p className="text-gray-500 text-[10px]">Shown publicly — COPS does not mediate payments</p>
                  </div>
                </label>

                {hasReward && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Amount (₹)</label>
                      <input
                        type="number" value={rewardAmount} onChange={e => setRewardAmount(e.target.value)}
                        placeholder="500"
                        className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-2xl px-5 py-4 text-white outline-none focus:border-amber-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Note (optional)</label>
                      <input
                        value={rewardNote} onChange={e => setRewardNote(e.target.value)}
                        placeholder="e.g., Sentimental value, no questions asked"
                        className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-2xl px-5 py-4 text-white outline-none focus:border-amber-500 transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 6: Review ───────────────────────────────── */}
          {step === 6 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-amber-400 mb-2">
                <Eye className="w-5 h-5" />
                <h2 className="text-sm font-black uppercase tracking-widest">Review Your Report</h2>
              </div>

              {/* Preview Card */}
              <div className="bg-[#0D1420] border border-[#1F2D42] rounded-2xl overflow-hidden">
                <div className="relative h-48">
                  {previews[0] ? (
                    <img src={previews[0]} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-5xl">{CATEGORY_FIELDS[category as string] ? LF_CATEGORIES.find(c => c.value === category)?.icon : '📦'}</span>
                    </div>
                  )}
                  <div className={`absolute top-3 left-3 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                    reportType === 'lost' ? 'bg-orange-500 text-white' : 'bg-green-500 text-black'
                  }`}>
                    {reportType === 'lost' ? '🔴 LOST' : '🟢 FOUND'}
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <span className="text-[10px] text-orange-400 font-bold uppercase tracking-widest">
                      {LF_CATEGORIES.find(c => c.value === category)?.label}
                    </span>
                    <h3 className="text-xl font-black text-white">{itemName || 'Untitled Item'}</h3>
                    {brand && <p className="text-gray-500 text-xs">Brand: {brand}</p>}
                    {color && <p className="text-gray-500 text-xs">Color: {color}</p>}
                  </div>

                  <p className="text-gray-400 text-sm">{description}</p>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2 text-gray-400">
                      <MapPin className="w-4 h-4 text-blue-400" />
                      {locationText || '—'}
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Calendar className="w-4 h-4 text-amber-400" />
                      {incidentDate || '—'}
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <User className="w-4 h-4 text-emerald-400" />
                      {contactName || '—'}
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Phone className="w-4 h-4 text-emerald-400" />
                      {contactPhone || '—'}
                    </div>
                  </div>

                  {hasReward && rewardAmount && (
                    <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-yellow-400 text-sm font-bold">
                      <Award className="w-4 h-4" /> ₹{rewardAmount} Reward
                    </div>
                  )}

                  {previews.length > 0 && (
                    <div className="flex gap-2">
                      {previews.map((src, i) => (
                        <div key={i} className="w-16 h-16 rounded-xl overflow-hidden border border-[#1F2D42]">
                          <img src={src} className="w-full h-full object-cover" alt="" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <p className="text-xs text-gray-400 leading-relaxed">
                  By submitting, you confirm this information is accurate. False reports may lead to account suspension.
                </p>
              </div>
            </div>
          )}

          {/* ── Navigation Buttons ────────────────────────────── */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button onClick={prevStep}
                className="flex-1 py-4 bg-[#1F2D42] hover:bg-[#2a3a52] text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all"
              >
                ← Back
              </button>
            )}
            {step < 6 ? (
              <button onClick={nextStep}
                className="flex-1 py-4 bg-orange-500 hover:bg-orange-400 text-black font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-orange-500/20"
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={() => handleSubmit(false)}
                disabled={loading}
                className={`flex-1 py-4 rounded-2xl text-sm font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${
                  reportType === 'lost'
                    ? 'bg-orange-500 hover:bg-orange-400 text-black shadow-xl shadow-orange-500/20'
                    : 'bg-green-500 hover:bg-green-400 text-black shadow-xl shadow-green-500/20'
                } disabled:opacity-50`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {uploadingPhotos ? 'Uploading photos...' : 'Submitting...'}
                  </>
                ) : (
                  <>Submit Report <ChevronRight className="w-5 h-5" /></>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
