'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createReportDraft, updateComplainantStep, saveIncidentStep, saveSimpleTheft, saveCyberCrime, saveCheatingFraud, saveBurglary, saveNcr, submitReport, getUserDrafts } from './actions'
import { COMPLAINT_TYPE_LABELS, PROPERTY_TYPE_LABELS, CYBER_TYPE_LABELS, CYBER_PLATFORM_LABELS, FRAUD_TYPE_LABELS, PAYMENT_METHOD_LABELS, PREMISES_TYPE_LABELS, ENTRY_METHOD_LABELS, showsRecovery } from '@/lib/types/report'
import type { ComplaintType, ComplainantStep, IncidentStep } from '@/lib/types/report'
import { InputField, SelectField, TextArea, Toggle, SectionHeader } from '@/components/report/FormFields'
import { getStateNames, getDistrictsForState, getCitiesForDistrict, getTehsilsForDistrict, getPoliceStationsForTehsil, lookupPincode, GENDER_OPTIONS, ID_PROOF_TYPES, ID_VALIDATION_RULES, validateIdNumber } from '@/lib/data/indian-locations'
import { FileText, User, MapPin, ClipboardList, CheckCircle, ArrowRight, ArrowLeft, Loader2, AlertTriangle, Shield, PenTool, Search, Image as ImageIcon, Camera } from 'lucide-react'
import { EvidenceUpload } from '@/components/report/EvidenceUpload'

const STEPS = [
  { num: 1, label: 'Complainant', icon: User },
  { num: 2, label: 'Incident', icon: MapPin },
  { num: 3, label: 'Details', icon: ClipboardList },
  { num: 4, label: 'Evidence', icon: PenTool },
  { num: 5, label: 'Review & Submit', icon: CheckCircle },
]

export default function ReportPage() {
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [incidentId, setIncidentId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const sigCanvas = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSigned, setHasSigned] = useState(false)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)
  const points = useRef<{ x: number; y: number }[]>([])
  const [submitted, setSubmitted] = useState(false)

  // ══ Step 1 state ══════════════════════════════════════════
  const [filingMode, setFilingMode] = useState<'self'|'behalf'>('self')
  const [behalfName, setBehalfName] = useState('')
  const [behalfRelation, setBehalfRelation] = useState('')
  const [behalfContact, setBehalfContact] = useState('')
  const [fullName, setFullName] = useState('')
  const [fatherName, setFatherName] = useState('')
  const [motherName, setMotherName] = useState('')
  const [mobile, setMobile] = useState('')
  const [altMobile, setAltMobile] = useState('')
  const [email, setEmail] = useState('')
  const [gender, setGender] = useState('')
  const [idProofType, setIdProofType] = useState('')
  const [idProofNumber, setIdProofNumber] = useState('')
  // Location (complainant)
  const [cState, setCState] = useState('')
  const [cDistrict, setCDistrict] = useState('')
  const [cCity, setCCity] = useState('')
  const [cPincode, setCPincode] = useState('')
  const [cAddress, setCAddress] = useState('')
  const [cPoliceStation, setCPoliceStation] = useState('')
  const [cTehsil, setCTehsil] = useState('')
  const [cPinLoading, setCPinLoading] = useState(false)

  // ══ Step 2 state ══════════════════════════════════════════
  const [iState, setIState] = useState('')
  const [iDistrict, setIDistrict] = useState('')
  const [iCity, setICity] = useState('')
  const [iPincode, setIPincode] = useState('')
  const [iAddress, setIAddress] = useState('')
  const [iPoliceStation, setIPoliceStation] = useState('')
  const [iTehsil, setITehsil] = useState('')
  const [iDate, setIDate] = useState('')
  const [iTime, setITime] = useState('')
  const [complaintType, setComplaintType] = useState<ComplaintType|''>('')
  const [iPinLoading, setIPinLoading] = useState(false)

  // ══ Step 3 ════════════════════════════════════════════════
  // Simple Theft
  const [propertyType, setPropertyType] = useState('')
  const [propertyDesc, setPropertyDesc] = useState('')
  const [estimatedPrice, setEstimatedPrice] = useState('')
  const [propertyDetails, setPropertyDetails] = useState<Record<string, string>>({})
  // Cyber Crime
  const [cyberType, setCyberType] = useState('')
  const [cyberTypeDetails, setCyberTypeDetails] = useState<Record<string, string>>({})
  const [selectedPlatform, setSelectedPlatform] = useState('')
  const [platformDetails, setPlatformDetails] = useState<Record<string, string>>({})
  const [platformOther, setPlatformOther] = useState('')
  const [webUrl, setWebUrl] = useState('')
  const [amountLost, setAmountLost] = useState('')
  const [txnId, setTxnId] = useState('')
  const [upiId, setUpiId] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [bankName, setBankName] = useState('')
  const [txnDate, setTxnDate] = useState('')
  // Fraud
  const [fraudType, setFraudType] = useState('')
  const [fraudDetails, setFraudDetails] = useState<Record<string, string>>({})
  const [fraudAmount, setFraudAmount] = useState('')
  const [payMethod, setPayMethod] = useState('')
  const [hasTxn, setHasTxn] = useState(false)
  const [fTxnId, setFTxnId] = useState('')
  const [fBankName, setFBankName] = useState('')
  const [fAccNum, setFAccNum] = useState('')
  const [fIfsc, setFIfsc] = useState('')
  const [fUpi, setFUpi] = useState('')
  // Burglary
  const [premType, setPremType] = useState('')
  const [premisesDetails, setPremisesDetails] = useState<Record<string, string>>({})
  const [entryMethod, setEntryMethod] = useState('')
  const [cctvAvail, setCctvAvail] = useState(false)
  const [stolenDesc, setStolenDesc] = useState('')
  const [estValue, setEstValue] = useState('')
  // NCR
  const [ncrType, setNcrType] = useState('noise_complaint')
  const [ncrDesc, setNcrDesc] = useState('')
  // Common suspect
  const [hasSuspect, setHasSuspect] = useState(false)
  const [suspectName, setSuspectName] = useState('')
  const [suspectAddr, setSuspectAddr] = useState('')
  const [suspectPhone, setSuspectPhone] = useState('')
  const [suspectDesc, setSuspectDesc] = useState('')
  const [suspectCompany, setSuspectCompany] = useState('')
  const [suspectWeb, setSuspectWeb] = useState('')
  const [suspectBankAcc, setSuspectBankAcc] = useState('')
  const [suspectSocial, setSuspectSocial] = useState('')
  const [detailedDesc, setDetailedDesc] = useState('')

  // ══ Step 4 ════════════════════════════════════════════════
  const [declaration, setDeclaration] = useState(false)
  const [yourLoss, setYourLoss] = useState('')
  const [totalLoss, setTotalLoss] = useState('')

  // Auto-fill from profile
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (profile) {
        setFullName(profile.full_name || '')
        setMobile(profile.phone || '')
        setEmail(user.email || '')
        setFatherName(profile.father_husband_name || '')
        setMotherName(profile.mother_name || '')
        setGender(profile.gender || '')
        setAltMobile(profile.alternate_mobile || '')
        setIdProofType(profile.id_proof_type || '')
        setIdProofNumber(profile.id_number || '')
        setCPincode(profile.pincode || '')
        setCState(profile.state || '')
        setCDistrict(profile.district || '')
        setCCity(profile.city_town || '')
        setCTehsil(profile.tehsil_division || '')
        setCPoliceStation(profile.police_station_area || '')
        setCAddress(profile.full_address || profile.address || '')
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pincode auto-locate for complainant
  const handleCPincode = async (val: string) => {
    setCPincode(val)
    if (val.length === 6) {
      setCPinLoading(true)
      const result = await lookupPincode(val)
      if (result) {
        setCState(result.state)
        setCDistrict(result.district)
        setCCity(result.city || '')
        setCTehsil(result.division || '')
      }
      setCPinLoading(false)
    }
  }
  // Helpers for current date & time constraints
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  // Pincode auto-locate for incident
  const handleIPincode = async (val: string) => {
    setIPincode(val)
    if (val.length === 6) {
      setIPinLoading(true)
      const result = await lookupPincode(val)
      if (result) {
        setIState(result.state)
        setIDistrict(result.district)
        setICity(result.city || '')
        setITehsil(result.division || '')
      }
      setIPinLoading(false)
    }
  }

  // Reset dependent dropdowns
  const handleCStateChange = (val: string) => { setCState(val); setCDistrict(''); setCCity(''); setCTehsil(''); setCPoliceStation('') }
  const handleCDistrictChange = (val: string) => { setCDistrict(val); setCCity(''); setCTehsil(''); setCPoliceStation('') }
  const handleCCityChange = (val: string) => { setCCity(val); setCTehsil(''); setCPoliceStation('') }
  const handleCTehsilChange = (val: string) => { setCTehsil(val); setCPoliceStation('') }

  const handleIStateChange = (val: string) => { setIState(val); setIDistrict(''); setICity(''); setITehsil(''); setIPoliceStation('') }
  const handleIDistrictChange = (val: string) => { setIDistrict(val); setICity(''); setITehsil(''); setIPoliceStation('') }
  const handleICityChange = (val: string) => { setICity(val); setITehsil(''); setIPoliceStation('') }
  const handleITehsilChange = (val: string) => { setITehsil(val); setIPoliceStation('') }

  const validate = (s: number) => {
    const e: Record<string, string> = {}
    if (s === 1) {
      if (!fullName.trim()) e.fullName = 'Required'
      if (!fatherName.trim()) e.fatherName = 'Required'
      if (!gender) e.gender = 'Required'
      if (!/^[6-9]\d{9}$/.test(mobile)) e.mobile = 'Valid 10-digit mobile required'
      if (!idProofType) e.idProofType = 'Required'
      if (!idProofNumber.trim()) e.idProofNumber = 'Required'
      if (!cState) e.cState = 'Select state'
      if (!cDistrict) e.cDistrict = 'Select district'
      if (!cCity) e.cCity = 'Select or enter city'
      if (!cTehsil.trim()) e.cTehsil = 'Required'
      if (!cPoliceStation.trim()) e.cPoliceStation = 'Required'
      if (!cAddress.trim()) e.cAddress = 'Required'
      if (filingMode === 'behalf' && !behalfName) e.behalfName = 'Required'
      // Validate ID number format if both type and number provided
      if (idProofType && idProofNumber) {
        const idErr = validateIdNumber(idProofType, idProofNumber)
        if (idErr) e.idProofNumber = idErr
      }
    }
    if (s === 2) {
      if (!iDate) e.iDate = 'Select incident date'
      else if (iDate > todayStr) e.iDate = 'Cannot be in the future'
      
      if (typeof iTime === 'string' && iDate === todayStr && iTime > timeStr) {
        e.iTime = 'Cannot be in the future'
      }

      if (!iState) e.iState = 'Select state'
      if (!iDistrict) e.iDistrict = 'Select district'
      if (!iCity) e.iCity = 'Select or enter city'
      if (!iTehsil.trim()) e.iTehsil = 'Required'
      if (!iPoliceStation.trim()) e.iPoliceStation = 'Required'
      if (!iAddress.trim()) e.iAddress = 'Required'
      if (!complaintType) e.complaintType = 'Select complaint type'
    }
    if (s === 3) {
      if (complaintType !== 'ncr' && detailedDesc.length < 20) e.detailedDesc = 'Min 20 characters required'
      if (complaintType === 'ncr' && ncrDesc.length < 20) e.ncrDesc = 'Min 20 characters'
      if (complaintType === 'simple_theft' && !propertyType) e.propertyType = 'Select property type'
      if (complaintType === 'simple_theft' && propertyDesc.length < 10) e.propertyDesc = 'Min 10 chars'
      if (complaintType === 'simple_theft' && propertyType === 'mobile_phone' && propertyDetails.imei && propertyDetails.imei.length > 0 && !/^\d{15}$/.test(propertyDetails.imei)) e.imei = 'IMEI must be exactly 15 digits'
      if (complaintType === 'simple_theft' && propertyType === 'other' && (!propertyDetails.other_description || propertyDetails.other_description.length < 5)) e.otherPropertyDesc = 'Describe the property'
      if (complaintType === 'cyber_crime' && !cyberType) e.cyberType = 'Select cyber crime type'
      if (complaintType === 'cyber_crime' && !selectedPlatform) e.platforms = 'Select a platform'
      if (complaintType === 'cyber_crime' && selectedPlatform === 'other' && !platformOther.trim()) e.platformOther = 'Specify the platform'
      if (complaintType === 'burglary' && !premType) e.premType = 'Select premises type'
      if (complaintType === 'burglary' && stolenDesc.length < 10) e.stolenDesc = 'Min 10 chars'
      if (complaintType === 'cheating_fraud' && !fraudType) e.fraudType = 'Select fraud type'
    }
    setErrors(e)
    if (s === 4) return true // Evidence is optional but we check next anyway
    return Object.keys(e).length === 0
  }

  const handleNext = async () => {
    if (!validate(step)) return
    setSaving(true)
    try {
      if (step === 1) {
        const data: any = { filingMode, behalfName, behalfRelation, behalfContact, fullName, fatherName, motherName, mobile, altMobile, email, gender, state: cState, district: cDistrict, city: cCity, pincode: cPincode, tehsil: cTehsil, address: cAddress, policeStation: cPoliceStation, idProofType, idProofNumber }
        if (!incidentId) {
          const id = await createReportDraft(data)
          setIncidentId(id)
        } else {
          await updateComplainantStep(incidentId, data)
        }
      }
      if (step === 2 && incidentId) {
        await saveIncidentStep(incidentId, { district: iDistrict, policeStation: iPoliceStation, state: iState, city: iCity, date: iDate, approxTime: iTime, complaintType: complaintType as ComplaintType, pincode: iPincode, tehsil: iTehsil, address: iAddress } as any)
      }
      if (step === 3 && incidentId) {
        if (complaintType === 'simple_theft') await saveSimpleTheft(incidentId, { propertyType: propertyType as any, propertyDescription: propertyDesc, propertyDetails, estimatedPrice: parseFloat(estimatedPrice) || undefined, hasSuspect, suspectName, suspectAddress: suspectAddr, suspectDescription: suspectDesc, suspectPhone, detailedDescription: detailedDesc })
        if (complaintType === 'cyber_crime') await saveCyberCrime(incidentId, { cyberType: cyberType as any, cyberTypeDetails, platformUsed: selectedPlatform as any, platformDetails, platformOtherDesc: platformOther, websiteUrl: webUrl, amountLost: parseFloat(amountLost) || undefined, transactionId: txnId, upiId, ifscCode: ifsc, bankName, dateOfTransaction: txnDate, hasSuspect, suspectName, suspectPhone, suspectWebsite: suspectWeb, suspectSocialHandle: suspectSocial, suspectDescription: suspectDesc, detailedDescription: detailedDesc })
        if (complaintType === 'cheating_fraud') await saveCheatingFraud(incidentId, { fraudType: fraudType as any, fraudDetails, fraudAmount: parseFloat(fraudAmount) || undefined, paymentMethod: payMethod as any, hasTransaction: hasTxn, transactionId: fTxnId, bankName: fBankName, accountNumber: fAccNum, ifscCode: fIfsc, upiId: fUpi, hasSuspect, suspectName, suspectMob: suspectPhone, suspectAddress: suspectAddr, suspectCompany, suspectWebsite: suspectWeb, suspectBankAcc, detailedDescription: detailedDesc })
        if (complaintType === 'burglary') await saveBurglary(incidentId, { premisesType: premType as any, premisesDetails, entryMethod: entryMethod as any || undefined, cctvAvailable: cctvAvail, stolenPropertyDesc: stolenDesc, estimatedValue: parseFloat(estValue) || undefined, hasSuspect, suspectName, suspectAddress: suspectAddr, suspectDescription: suspectDesc, detailedDescription: detailedDesc })
        if (complaintType === 'ncr') await saveNcr(incidentId, { ncrType: ncrType as any, description: ncrDesc, suspectName, suspectAddress: suspectAddr, suspectPhone, suspectDescription: suspectDesc })
      }
      setStep(s => Math.min(s + 1, 5))
    } catch (err: any) { setErrors({ _global: err.message }) }
    setSaving(false)
  }

  const handleSubmit = async () => {
    if (!declaration) { setErrors({ declaration: 'Accept the declaration' }); return }
    if (!incidentId) return
    setSaving(true)
    try {
      let sigPath: string | null = null
      if (sigCanvas.current && hasSigned) {
        sigPath = sigCanvas.current.toDataURL('image/png')
      }
      const recovery = showsRecovery(complaintType, complaintType === 'cyber_crime' ? cyberType : undefined)
        ? { yourLoss: parseFloat(yourLoss) || undefined, totalEstimatedLoss: parseFloat(totalLoss) || undefined } : undefined
      await submitReport(incidentId, sigPath, recovery)
      setSubmitted(true)
    } catch (err: any) { setErrors({ _global: err.message }) }
    setSaving(false)
  }

  // ── Smooth Signature Drawing ────────────────────────────
  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = sigCanvas.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const canvas = sigCanvas.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    setIsDrawing(true)
    setHasSigned(true)
    const point = getCanvasPoint(e)
    lastPoint.current = point
    points.current = [point]
    ctx.beginPath()
    ctx.moveTo(point.x, point.y)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    e.preventDefault()
    const canvas = sigCanvas.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const point = getCanvasPoint(e)
    points.current.push(point)

    ctx.strokeStyle = '#f97316'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.shadowColor = 'rgba(249, 115, 22, 0.3)'
    ctx.shadowBlur = 2

    if (points.current.length >= 3) {
      // Smooth quadratic bezier through last 3 points
      const len = points.current.length
      const p0 = points.current[len - 3]
      const p1 = points.current[len - 2]
      const p2 = points.current[len - 1]

      const midX1 = (p0.x + p1.x) / 2
      const midY1 = (p0.y + p1.y) / 2
      const midX2 = (p1.x + p2.x) / 2
      const midY2 = (p1.y + p2.y) / 2

      ctx.beginPath()
      ctx.moveTo(midX1, midY1)
      ctx.quadraticCurveTo(p1.x, p1.y, midX2, midY2)
      ctx.stroke()
    } else if (lastPoint.current) {
      ctx.beginPath()
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
      ctx.lineTo(point.x, point.y)
      ctx.stroke()
    }

    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    lastPoint.current = point
  }

  const endDraw = () => {
    setIsDrawing(false)
    lastPoint.current = null
    points.current = []
  }

  const clearSig = () => {
    const canvas = sigCanvas.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSigned(false)
    lastPoint.current = null
    points.current = []
  }

  const handleBack = () => setStep(s => Math.max(s - 1, 1))

  // ── Success Screen ────────────────────────
  if (submitted) return (
    <div className="max-w-lg mx-auto text-center py-16">
      <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-10 h-10 text-green-400" />
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">Report Submitted Successfully!</h1>
      <p className="text-gray-400 mb-2">Your incident report has been filed and is now under review.</p>
      <p className="text-xs text-gray-500 font-mono mb-8">Report ID: {incidentId?.slice(0, 12)}...</p>
      <div className="flex gap-3 justify-center">
        <a href="/citizen/my-reports" className="bg-orange-500 hover:bg-orange-400 text-black font-semibold text-sm px-6 py-2.5 rounded-xl transition-colors">Track Report</a>
        <a href="/citizen/dashboard" className="bg-[#111827] border border-[#1F2D42] text-white text-sm px-6 py-2.5 rounded-xl hover:border-orange-500/30 transition-colors">Dashboard</a>
      </div>
    </div>
  )

  // helpers for state-filtered selects
  const stateOpts = getStateNames().map(s => ({ value: s, label: s }))
  const cDistrictOpts = getDistrictsForState(cState).map(d => ({ value: d, label: d }))
  const cCityOpts = getCitiesForDistrict(cState, cDistrict).map(c => ({ value: c, label: c }))
  const cTehsilOpts = getTehsilsForDistrict(cState, cDistrict).map(t => ({ value: t, label: t }))
  const cPoliceStationOpts = getPoliceStationsForTehsil(cTehsil).map(p => ({ value: p, label: p }))

  const iDistrictOpts = getDistrictsForState(iState).map(d => ({ value: d, label: d }))
  const iCityOpts = getCitiesForDistrict(iState, iDistrict).map(c => ({ value: c, label: c }))
  const iTehsilOpts = getTehsilsForDistrict(iState, iDistrict).map(t => ({ value: t, label: t }))
  const iPoliceStationOpts = getPoliceStationsForTehsil(iTehsil).map(p => ({ value: p, label: p }))

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-orange-400" />
          </div>
          File an Incident Report
        </h1>
        <p className="text-sm text-gray-400 mt-1.5 ml-[46px]">Complete the form below to file your FIR/NCR. Each step is auto-saved as a draft.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2 flex-shrink-0">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              step === s.num ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30' :
              step > s.num ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
              'bg-[#111827] text-gray-500 border border-[#1F2D42]'
            }`}>
              <s.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{s.num}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`w-6 h-0.5 rounded ${step > s.num ? 'bg-green-500/40' : 'bg-[#1F2D42]'}`} />}
          </div>
        ))}
      </div>

      {errors._global && (
        <div className="mb-4 p-3 bg-red-500/5 border border-red-500/20 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{errors._global}</p>
        </div>
      )}

      {/* ══════════════ STEP 1: COMPLAINANT ══════════════ */}
      {step === 1 && (
        <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-6 space-y-6">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-orange-400" /> Complainant Details
          </h2>

          {/* Filing Mode */}
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-2 font-semibold">Who is filing this report?</p>
            <div className="flex gap-3">
              {(['self', 'behalf'] as const).map(m => (
                <button key={m} onClick={() => setFilingMode(m)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${filingMode === m ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-[#0D1420] border-[#1F2D42] text-gray-400 hover:border-[#2A3A52]'}`}>
                  {m === 'self' ? '👤 Self' : '👥 On Behalf of Someone'}
                </button>
              ))}
            </div>
          </div>

          {filingMode === 'behalf' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[#0B0F1A] border border-blue-500/20 rounded-xl">
              <InputField label="Person's Name" value={behalfName} onChange={setBehalfName} required error={errors.behalfName} placeholder="Full name" />
              <InputField label="Relation" value={behalfRelation} onChange={setBehalfRelation} placeholder="Father, Friend..." />
              <InputField label="Contact No." value={behalfContact} onChange={setBehalfContact} placeholder="10-digit mobile" />
            </div>
          )}

          {/* Personal Details */}
          <SectionHeader icon="👤" title="Personal Information" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Full Name (as per ID)" value={fullName} onChange={setFullName} required error={errors.fullName} placeholder="Enter your full legal name" />
            <InputField label="Father's / Husband's Name" value={fatherName} onChange={setFatherName} required error={errors.fatherName} placeholder="Full name" />
            <InputField label="Mother's Name" value={motherName} onChange={setMotherName} placeholder="Full name" />
            <SelectField label="Gender" value={gender} onChange={setGender} required error={errors.gender} options={GENDER_OPTIONS} placeholder="Select gender" />
          </div>

          {/* Contact Details */}
          <SectionHeader icon="📞" title="Contact Information" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Mobile Number" value={mobile} onChange={setMobile} required error={errors.mobile} placeholder="10-digit mobile" mono maxLength={10} />
            <InputField label="Alternate Mobile" value={altMobile} onChange={setAltMobile} placeholder="Optional" maxLength={10} />
            <InputField label="Email Address" value={email} onChange={setEmail} type="email" placeholder="email@example.com" />
          </div>

          {/* ID Proof */}
          <SectionHeader icon="🪪" title="Identity Proof (for verification)" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectField label="ID Proof Type" value={idProofType} onChange={(v) => { setIdProofType(v); setIdProofNumber('') }} required error={errors.idProofType} options={ID_PROOF_TYPES} placeholder="Select ID type" />
            <div>
              <InputField
                label={idProofType && ID_VALIDATION_RULES[idProofType] ? ID_VALIDATION_RULES[idProofType].label : 'ID Number'}
                value={idProofNumber}
                onChange={setIdProofNumber}
                required
                placeholder={idProofType && ID_VALIDATION_RULES[idProofType] ? ID_VALIDATION_RULES[idProofType].placeholder : 'Select ID type first'}
                mono
                maxLength={idProofType && ID_VALIDATION_RULES[idProofType] ? ID_VALIDATION_RULES[idProofType].maxLength : 20}
                disabled={!idProofType}
                error={errors.idProofNumber}
              />
              {idProofType && ID_VALIDATION_RULES[idProofType] && (
                <p className="text-[10px] text-gray-500 mt-1">💡 {ID_VALIDATION_RULES[idProofType].hint}</p>
              )}
            </div>
          </div>

          {/* Address — State → District → City → Pincode → Full Address */}
          <SectionHeader icon="🏠" title="Permanent Address" subtitle="Select state first, then district and city will auto-populate" />

          {/* Pincode auto-fill shortcut */}
          <div className="p-3 bg-[#0B0F1A] border border-blue-500/15 rounded-xl">
            <p className="text-[10px] text-blue-400 mb-2 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Search className="w-3 h-3" /> Quick Fill — Enter Pincode to auto-detect location
            </p>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <InputField label="Pincode" value={cPincode} onChange={handleCPincode} placeholder="6-digit pincode" mono maxLength={6} />
              </div>
              {cPinLoading && <Loader2 className="w-4 h-4 text-orange-400 animate-spin mb-3" />}
              {cPincode.length === 6 && !cPinLoading && cState && (
                <p className="text-[10px] text-green-400 mb-3">✓ Located</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectField label="State" value={cState} onChange={handleCStateChange} options={stateOpts} required error={errors.cState} placeholder="Select state" />
            <SelectField label="District" value={cDistrict} onChange={handleCDistrictChange} options={cDistrictOpts} required error={errors.cDistrict} placeholder={cState ? 'Select district' : 'Select state first'} disabled={!cState} />
            {cCityOpts.length > 0 ? (
              <SelectField label="City / Town" value={cCity} onChange={handleCCityChange} options={cCityOpts} required error={errors.cCity} placeholder={cDistrict ? 'Select city' : 'Select district first'} disabled={!cDistrict} />
            ) : (
              <InputField label="City / Town" value={cCity} onChange={handleCCityChange} required error={errors.cCity} placeholder={cDistrict ? 'Enter city/town name' : 'Select district first'} disabled={!cDistrict} />
            )}
            
            {cTehsilOpts.length > 0 ? (
              <SelectField label="Tehsil / Division" value={cTehsil} onChange={handleCTehsilChange} options={cTehsilOpts} required error={errors.cTehsil} placeholder={cDistrict ? 'Select Tehsil' : 'Select district first'} disabled={!cDistrict} />
            ) : (
              <InputField label="Tehsil / Division" value={cTehsil} onChange={handleCTehsilChange} required error={errors.cTehsil} placeholder="Auto-filled via pincode or enter manually" disabled={!cDistrict} />
            )}

            {cPoliceStationOpts.length > 0 ? (
              <SelectField label="Police Station Area" value={cPoliceStation} onChange={setCPoliceStation} options={cPoliceStationOpts} required error={errors.cPoliceStation} placeholder={cTehsil ? 'Select Police Station' : 'Select Tehsil first'} disabled={!cTehsil} />
            ) : (
              <InputField label="Police Station Area" value={cPoliceStation} onChange={setCPoliceStation} required error={errors.cPoliceStation} placeholder="Nearest police station" disabled={!cTehsil && !cDistrict} />
            )}
          </div>
          <TextArea label="Full Address" value={cAddress} onChange={setCAddress} required error={errors.cAddress} rows={2} placeholder="House/Flat No., Street, Locality, Landmark..." />
        </div>
      )}

      {/* ══════════════ STEP 2: INCIDENT ═════════════════ */}
      {step === 2 && (
        <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-6 space-y-6">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-orange-400" /> Incident Details
          </h2>

          {/* When did it happen? */}
          <SectionHeader icon="📅" title="When did the incident occur?" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Date of Incident" value={iDate} onChange={setIDate} required error={errors.iDate} type="date" max={todayStr} />
            <InputField label="Approximate Time" value={iTime} onChange={setITime} error={errors.iTime} type="time" max={iDate === todayStr ? timeStr : undefined} />
          </div>

          {/* Where did it happen? */}
          <SectionHeader icon="📍" title="Where did the incident occur?" subtitle="Enter pincode for quick fill or select state, district, city" />

          {/* Pincode auto-fill */}
          <div className="p-3 bg-[#0B0F1A] border border-blue-500/15 rounded-xl">
            <p className="text-[10px] text-blue-400 mb-2 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Search className="w-3 h-3" /> Quick Fill — Enter Pincode
            </p>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <InputField label="Pincode" value={iPincode} onChange={handleIPincode} placeholder="6-digit pincode" mono maxLength={6} />
              </div>
              {iPinLoading && <Loader2 className="w-4 h-4 text-orange-400 animate-spin mb-3" />}
              {iPincode.length === 6 && !iPinLoading && iState && (
                <p className="text-[10px] text-green-400 mb-3">✓ Located</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectField label="State" value={iState} onChange={handleIStateChange} options={stateOpts} required error={errors.iState} placeholder="Select state" />
            <SelectField label="District" value={iDistrict} onChange={handleIDistrictChange} options={iDistrictOpts} required error={errors.iDistrict} placeholder={iState ? 'Select district' : 'Select state first'} disabled={!iState} />
            {iCityOpts.length > 0 ? (
              <SelectField label="City / Town" value={iCity} onChange={handleICityChange} options={iCityOpts} required error={errors.iCity} placeholder={iDistrict ? 'Select city' : 'Select district first'} disabled={!iDistrict} />
            ) : (
              <InputField label="City / Town" value={iCity} onChange={handleICityChange} required error={errors.iCity} placeholder={iDistrict ? 'Enter city/town name' : 'Select district first'} disabled={!iDistrict} />
            )}

            {iTehsilOpts.length > 0 ? (
              <SelectField label="Tehsil / Division" value={iTehsil} onChange={handleITehsilChange} options={iTehsilOpts} required error={errors.iTehsil} placeholder={iDistrict ? 'Select Tehsil' : 'Select district first'} disabled={!iDistrict} />
            ) : (
              <InputField label="Tehsil / Division" value={iTehsil} onChange={handleITehsilChange} required error={errors.iTehsil} placeholder="Auto-filled via pincode or enter manually" disabled={!iDistrict} />
            )}

            {iPoliceStationOpts.length > 0 ? (
              <SelectField label="Police Station Area" value={iPoliceStation} onChange={setIPoliceStation} options={iPoliceStationOpts} required error={errors.iPoliceStation} placeholder={iTehsil ? 'Select Police Station' : 'Select Tehsil first'} disabled={!iTehsil} />
            ) : (
              <InputField label="Police Station Area" value={iPoliceStation} onChange={setIPoliceStation} required error={errors.iPoliceStation} placeholder="Nearest police station" disabled={!iTehsil && !iDistrict} />
            )}
          </div>
          <TextArea label="Incident Location Address" value={iAddress} onChange={setIAddress} required error={errors.iAddress} rows={2} placeholder="Exact address or landmark where the incident occurred..." />

          {/* Complaint Type */}
          <SectionHeader icon="📝" title="Type of Complaint" subtitle="Select the category that best matches your complaint" />
          {errors.complaintType && <p className="text-[10px] text-red-400">{errors.complaintType}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(Object.entries(COMPLAINT_TYPE_LABELS) as [ComplaintType, any][]).map(([key, val]) => (
              <button key={key} onClick={() => setComplaintType(key)} type="button"
                className={`text-left p-4 rounded-xl border transition-all ${complaintType === key
                  ? 'bg-orange-500/10 border-orange-500/30 shadow-lg shadow-orange-500/5'
                  : 'bg-[#0D1420] border-[#1F2D42] hover:border-[#2A3A52]'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{val.icon}</span>
                  <div>
                    <p className={`text-sm font-semibold ${complaintType === key ? 'text-orange-400' : 'text-white'}`}>{val.label}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{val.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════ STEP 3: TYPE-SPECIFIC ════════════ */}
      {step === 3 && (
        <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-6 space-y-5">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-orange-400" />
            {COMPLAINT_TYPE_LABELS[complaintType as ComplaintType]?.label || 'Details'}
          </h2>

          {/* Simple Theft */}
          {complaintType === 'simple_theft' && (<>
            <SectionHeader icon="📦" title="Stolen Property Details" />
            <SelectField label="Type of Property" value={propertyType} onChange={v => { setPropertyType(v); setPropertyDetails({}); }} required error={errors.propertyType} options={Object.entries(PROPERTY_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} placeholder="Select property type" />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
              {propertyType === 'mobile_phone' && (<>
                <InputField label="Make / Brand" value={propertyDetails.brand || ''} onChange={v => setPropertyDetails({...propertyDetails, brand: v})} placeholder="e.g. Apple, Samsung" />
                <InputField label="Model" value={propertyDetails.model || ''} onChange={v => setPropertyDetails({...propertyDetails, model: v})} placeholder="e.g. iPhone 13" />
                <InputField label="IMEI Number" value={propertyDetails.imei || ''} onChange={v => setPropertyDetails({...propertyDetails, imei: v})} placeholder="15-digit IMEI" mono />
                <InputField label="Mobile Number" value={propertyDetails.mobile_number || ''} onChange={v => setPropertyDetails({...propertyDetails, mobile_number: v})} placeholder="Number in phone" mono />
              </>)}
              {propertyType === 'vehicle' && (<>
                <InputField label="Make / Brand" value={propertyDetails.brand || ''} onChange={v => setPropertyDetails({...propertyDetails, brand: v})} placeholder="e.g. Honda" />
                <InputField label="Model" value={propertyDetails.model || ''} onChange={v => setPropertyDetails({...propertyDetails, model: v})} placeholder="e.g. City" />
                <InputField label="Registration No." value={propertyDetails.reg_no || ''} onChange={v => setPropertyDetails({...propertyDetails, reg_no: v})} placeholder="e.g. MH 01 AB 1234" mono />
                <InputField label="Color" value={propertyDetails.color || ''} onChange={v => setPropertyDetails({...propertyDetails, color: v})} placeholder="Vehicle color" />
                <InputField label="Chassis Number" value={propertyDetails.chassis_no || ''} onChange={v => setPropertyDetails({...propertyDetails, chassis_no: v})} placeholder="Optional" mono />
                <InputField label="Engine Number" value={propertyDetails.engine_no || ''} onChange={v => setPropertyDetails({...propertyDetails, engine_no: v})} placeholder="Optional" mono />
              </>)}
              {propertyType === 'jewellery' && (<>
                <InputField label="Metal Type" value={propertyDetails.metal_type || ''} onChange={v => setPropertyDetails({...propertyDetails, metal_type: v})} placeholder="e.g. Gold" />
                <InputField label="Weight" value={propertyDetails.weight || ''} onChange={v => setPropertyDetails({...propertyDetails, weight: v})} placeholder="e.g. 10 grams" />
              </>)}
              {propertyType === 'electronics' && (<>
                <InputField label="Device Type" value={propertyDetails.device_type || ''} onChange={v => setPropertyDetails({...propertyDetails, device_type: v})} placeholder="e.g. Laptop" />
                <InputField label="Brand" value={propertyDetails.brand || ''} onChange={v => setPropertyDetails({...propertyDetails, brand: v})} placeholder="e.g. Dell" />
                <InputField label="Model" value={propertyDetails.model || ''} onChange={v => setPropertyDetails({...propertyDetails, model: v})} placeholder="Device model" />
                <InputField label="Serial Number" value={propertyDetails.serial_no || ''} onChange={v => setPropertyDetails({...propertyDetails, serial_no: v})} placeholder="Optional" mono />
              </>)}
              {propertyType === 'documents' && (<>
                <InputField label="Document Type" value={propertyDetails.document_type || ''} onChange={v => setPropertyDetails({...propertyDetails, document_type: v})} placeholder="e.g. Passport" />
                <InputField label="Document Number" value={propertyDetails.document_no || ''} onChange={v => setPropertyDetails({...propertyDetails, document_no: v})} placeholder="ID number" mono />
              </>)}
              {propertyType === 'cash' && (<>
                <InputField label="Denominations" value={propertyDetails.denominations || ''} onChange={v => setPropertyDetails({...propertyDetails, denominations: v})} placeholder="e.g. 5x 500 notes" />
              </>)}
            </div>

            {propertyType === 'other' && (
              <InputField label="What was stolen?" value={propertyDetails.other_description || ''} onChange={v => setPropertyDetails({...propertyDetails, other_description: v})} required error={errors.otherPropertyDesc} placeholder="Describe the stolen property in detail" />
            )}

            <TextArea label="Additional Description" value={propertyDesc} onChange={setPropertyDesc} required error={errors.propertyDesc} placeholder="Describe any other identifying marks, damage, specific covers etc..." maxLength={1000} />
            <InputField label="Estimated Value (₹)" value={estimatedPrice} onChange={setEstimatedPrice} type="number" placeholder="Approximate total value in rupees" />
          </>)}

          {/* Cyber Crime */}
          {complaintType === 'cyber_crime' && (<>
            <SectionHeader icon="🌐" title="Cyber Crime Details" />
            <SelectField label="Type of Cyber Crime" value={cyberType} onChange={v => { setCyberType(v); setCyberTypeDetails({}); }} required error={errors.cyberType} options={Object.entries(CYBER_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} />

            {/* Dynamic fields per cyber crime type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cyberType === 'online_fraud' && (<>
                <InputField label="Fraud Website / App" value={cyberTypeDetails.fraud_website || ''} onChange={v => setCyberTypeDetails({...cyberTypeDetails, fraud_website: v})} placeholder="URL or app name" />
                <InputField label="Order / Reference ID" value={cyberTypeDetails.order_id || ''} onChange={v => setCyberTypeDetails({...cyberTypeDetails, order_id: v})} placeholder="Order/booking ID" mono />
                <InputField label="Payment Gateway" value={cyberTypeDetails.payment_gateway || ''} onChange={v => setCyberTypeDetails({...cyberTypeDetails, payment_gateway: v})} placeholder="e.g. Razorpay, Paytm" />
              </>)}
              {cyberType === 'upi_scam' && (<>
                <InputField label="UPI Reference No." value={cyberTypeDetails.upi_ref || ''} onChange={v => setCyberTypeDetails({...cyberTypeDetails, upi_ref: v})} placeholder="UPI transaction ref" mono />
                <InputField label="Beneficiary Name Shown" value={cyberTypeDetails.beneficiary_name || ''} onChange={v => setCyberTypeDetails({...cyberTypeDetails, beneficiary_name: v})} placeholder="Name displayed on UPI" />
              </>)}
              {cyberType === 'credit_debit_fraud' && (<>
                <InputField label="Card Last 4 Digits" value={cyberTypeDetails.card_last4 || ''} onChange={v => setCyberTypeDetails({...cyberTypeDetails, card_last4: v})} placeholder="XXXX" mono maxLength={4} />
                <SelectField label="Card Type" value={cyberTypeDetails.card_type || ''} onChange={v => setCyberTypeDetails({...cyberTypeDetails, card_type: v})} options={[{value:'credit',label:'Credit Card'},{value:'debit',label:'Debit Card'},{value:'prepaid',label:'Prepaid Card'}]} placeholder="Select card type" />
                <InputField label="Issuing Bank" value={cyberTypeDetails.issuing_bank || ''} onChange={v => setCyberTypeDetails({...cyberTypeDetails, issuing_bank: v})} placeholder="Bank name" />
                <SelectField label="Was card physically lost?" value={cyberTypeDetails.card_lost || ''} onChange={v => setCyberTypeDetails({...cyberTypeDetails, card_lost: v})} options={[{value:'yes',label:'Yes'},{value:'no',label:'No'},{value:'unknown',label:'Not sure'}]} />
              </>)}
              {cyberType === 'social_media_hack' && (<>
                <InputField label="Hacked Account URL" value={cyberTypeDetails.account_url || ''} onChange={v => setCyberTypeDetails({...cyberTypeDetails, account_url: v})} placeholder="Profile URL" />
                <InputField label="Recovery Email Used" value={cyberTypeDetails.recovery_email || ''} onChange={v => setCyberTypeDetails({...cyberTypeDetails, recovery_email: v})} placeholder="email@example.com" />
                <SelectField label="Was 2FA Enabled?" value={cyberTypeDetails.two_fa || ''} onChange={v => setCyberTypeDetails({...cyberTypeDetails, two_fa: v})} options={[{value:'yes',label:'Yes'},{value:'no',label:'No'},{value:'unknown',label:'Not sure'}]} />
              </>)}
              {cyberType === 'phishing' && (<>
                <InputField label="Phishing URL Received" value={cyberTypeDetails.phishing_url || ''} onChange={v => setCyberTypeDetails({...cyberTypeDetails, phishing_url: v})} placeholder="Fake URL" />
                <InputField label="What Info Was Entered" value={cyberTypeDetails.info_entered || ''} onChange={v => setCyberTypeDetails({...cyberTypeDetails, info_entered: v})} placeholder="e.g. password, OTP, bank details" />
              </>)}
              {cyberType === 'otp_scam' && (<>
                <InputField label="OTP Shared With (Number)" value={cyberTypeDetails.otp_shared_with || ''} onChange={v => setCyberTypeDetails({...cyberTypeDetails, otp_shared_with: v})} placeholder="Phone number" mono />
                <InputField label="How Many OTPs Shared" value={cyberTypeDetails.otp_count || ''} onChange={v => setCyberTypeDetails({...cyberTypeDetails, otp_count: v})} placeholder="e.g. 2" />
                <InputField label="Service OTP Was For" value={cyberTypeDetails.otp_service || ''} onChange={v => setCyberTypeDetails({...cyberTypeDetails, otp_service: v})} placeholder="e.g. Bank, GPay" />
              </>)}
              {cyberType === 'fake_job_scam' && (<>
                <InputField label="Company / Portal Name" value={cyberTypeDetails.company_name || ''} onChange={v => setCyberTypeDetails({...cyberTypeDetails, company_name: v})} placeholder="Fake company name" />
                <InputField label="Job Position Offered" value={cyberTypeDetails.job_position || ''} onChange={v => setCyberTypeDetails({...cyberTypeDetails, job_position: v})} placeholder="e.g. Data Entry" />
                <InputField label="Registration/Processing Fee Paid (₹)" value={cyberTypeDetails.fee_paid || ''} onChange={v => setCyberTypeDetails({...cyberTypeDetails, fee_paid: v})} type="number" placeholder="Amount" />
              </>)}
              {cyberType === 'cyber_bullying' && (<>
                <SelectField label="Nature of Bullying" value={cyberTypeDetails.nature || ''} onChange={v => setCyberTypeDetails({...cyberTypeDetails, nature: v})} options={[{value:'threats',label:'Threats'},{value:'harassment',label:'Harassment'},{value:'defamation',label:'Defamation'},{value:'morphed_images',label:'Morphed Images'},{value:'stalking',label:'Stalking'},{value:'other',label:'Other'}]} placeholder="Select type" />
                <InputField label="Duration (approx)" value={cyberTypeDetails.duration || ''} onChange={v => setCyberTypeDetails({...cyberTypeDetails, duration: v})} placeholder="e.g. 2 months" />
                <InputField label="Number of Incidents" value={cyberTypeDetails.incident_count || ''} onChange={v => setCyberTypeDetails({...cyberTypeDetails, incident_count: v})} placeholder="e.g. 5" />
              </>)}
              {cyberType === 'other' && (<>
                <InputField label="Type of Cyber Crime" value={cyberTypeDetails.other_type || ''} onChange={v => setCyberTypeDetails({...cyberTypeDetails, other_type: v})} placeholder="Describe the cyber crime type" />
                <InputField label="Additional Details" value={cyberTypeDetails.other_details || ''} onChange={v => setCyberTypeDetails({...cyberTypeDetails, other_details: v})} placeholder="Any other relevant info" />
              </>)}
              {cyberType === 'identity_theft' && (<>
                <InputField label="Type of ID Misused" value={cyberTypeDetails.id_type || ''} onChange={v => setCyberTypeDetails({...cyberTypeDetails, id_type: v})} placeholder="e.g. Aadhaar, PAN" />
                <InputField label="How Was It Misused" value={cyberTypeDetails.misuse_desc || ''} onChange={v => setCyberTypeDetails({...cyberTypeDetails, misuse_desc: v})} placeholder="e.g. opened fake bank account" />
              </>)}
            </div>

            {/* Platform selection — SINGLE select (radio-style) */}
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-2 font-semibold">Platform Where Crime Occurred <span className="text-orange-500">*</span></p>
              <p className="text-[10px] text-gray-600 mb-2">Select the primary platform used by the suspect</p>
              {errors.platforms && <p className="text-[10px] text-red-400 mb-1">{errors.platforms}</p>}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {Object.entries(CYBER_PLATFORM_LABELS).map(([k, v]) => (
                  <button key={k} type="button" onClick={() => { setSelectedPlatform(k === selectedPlatform ? '' : k); setPlatformDetails({}); }}
                    className={`text-xs px-3 py-2.5 rounded-xl border transition-all text-center ${
                      selectedPlatform === k
                        ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 shadow-lg shadow-orange-500/5'
                        : 'bg-[#0D1420] border-[#1F2D42] text-gray-400 hover:border-[#2A3A52]'
                    }`}>{v}</button>
                ))}
              </div>
            </div>

            {/* Dynamic fields per selected platform */}
            {selectedPlatform && (
              <div className="p-4 bg-[#0B0F1A] border border-blue-500/15 rounded-xl space-y-3">
                <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">📱 {CYBER_PLATFORM_LABELS[selectedPlatform as keyof typeof CYBER_PLATFORM_LABELS]} — Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedPlatform === 'whatsapp' && (<>
                    <InputField label="Suspect's WhatsApp Number" value={platformDetails.whatsapp_number || ''} onChange={v => setPlatformDetails({...platformDetails, whatsapp_number: v})} placeholder="+91 XXXXXXXXXX" mono />
                    <InputField label="Group Name (if applicable)" value={platformDetails.group_name || ''} onChange={v => setPlatformDetails({...platformDetails, group_name: v})} placeholder="WhatsApp group name" />
                    <InputField label="Date of First Contact" value={platformDetails.first_contact || ''} onChange={v => setPlatformDetails({...platformDetails, first_contact: v})} type="date" />
                  </>)}
                  {selectedPlatform === 'instagram' && (<>
                    <InputField label="Suspect's Instagram Handle" value={platformDetails.ig_handle || ''} onChange={v => setPlatformDetails({...platformDetails, ig_handle: v})} placeholder="@username" />
                    <InputField label="Profile URL" value={platformDetails.ig_url || ''} onChange={v => setPlatformDetails({...platformDetails, ig_url: v})} placeholder="https://instagram.com/..." />
                    <SelectField label="Contact Type" value={platformDetails.ig_contact_type || ''} onChange={v => setPlatformDetails({...platformDetails, ig_contact_type: v})} options={[{value:'dm',label:'Direct Message'},{value:'story',label:'Story Reply'},{value:'post',label:'Post/Comment'},{value:'reel',label:'Reel'},{value:'ad',label:'Sponsored Ad'}]} placeholder="How were you contacted?" />
                  </>)}
                  {selectedPlatform === 'facebook' && (<>
                    <InputField label="Suspect's Facebook Profile URL" value={platformDetails.fb_url || ''} onChange={v => setPlatformDetails({...platformDetails, fb_url: v})} placeholder="https://facebook.com/..." />
                    <InputField label="Name on Facebook" value={platformDetails.fb_name || ''} onChange={v => setPlatformDetails({...platformDetails, fb_name: v})} placeholder="Display name" />
                    <SelectField label="Contact Type" value={platformDetails.fb_contact_type || ''} onChange={v => setPlatformDetails({...platformDetails, fb_contact_type: v})} options={[{value:'messenger',label:'Messenger'},{value:'marketplace',label:'Marketplace'},{value:'post',label:'Post/Comment'},{value:'group',label:'Group'},{value:'page',label:'Page'}]} placeholder="Where did it happen?" />
                  </>)}
                  {selectedPlatform === 'telegram' && (<>
                    <InputField label="Suspect's Telegram Username" value={platformDetails.tg_username || ''} onChange={v => setPlatformDetails({...platformDetails, tg_username: v})} placeholder="@username" />
                    <InputField label="Channel / Group Name" value={platformDetails.tg_group || ''} onChange={v => setPlatformDetails({...platformDetails, tg_group: v})} placeholder="Group or channel name" />
                    <InputField label="Bot Name (if applicable)" value={platformDetails.tg_bot || ''} onChange={v => setPlatformDetails({...platformDetails, tg_bot: v})} placeholder="@botname" />
                  </>)}
                  {selectedPlatform === 'website' && (<>
                    <InputField label="Website URL" value={platformDetails.website_url || ''} onChange={v => setPlatformDetails({...platformDetails, website_url: v})} placeholder="https://..." />
                    <InputField label="Domain Registrar (if known)" value={platformDetails.registrar || ''} onChange={v => setPlatformDetails({...platformDetails, registrar: v})} placeholder="e.g. GoDaddy" />
                  </>)}
                  {selectedPlatform === 'phone_call' && (<>
                    <InputField label="Caller's Phone Number" value={platformDetails.caller_number || ''} onChange={v => setPlatformDetails({...platformDetails, caller_number: v})} placeholder="+91 XXXXXXXXXX" mono />
                    <InputField label="Number of Calls" value={platformDetails.call_count || ''} onChange={v => setPlatformDetails({...platformDetails, call_count: v})} placeholder="e.g. 3" />
                    <InputField label="SIM Provider (if known)" value={platformDetails.sim_provider || ''} onChange={v => setPlatformDetails({...platformDetails, sim_provider: v})} placeholder="e.g. Jio, Airtel" />
                    <SelectField label="Was number spoofed?" value={platformDetails.spoofed || ''} onChange={v => setPlatformDetails({...platformDetails, spoofed: v})} options={[{value:'yes',label:'Yes'},{value:'no',label:'No'},{value:'unknown',label:'Not sure'}]} />
                  </>)}
                  {selectedPlatform === 'email' && (<>
                    <InputField label="Sender's Email Address" value={platformDetails.sender_email || ''} onChange={v => setPlatformDetails({...platformDetails, sender_email: v})} placeholder="scammer@example.com" />
                    <InputField label="Email Subject" value={platformDetails.email_subject || ''} onChange={v => setPlatformDetails({...platformDetails, email_subject: v})} placeholder="Subject line" />
                    <SelectField label="Contained phishing link?" value={platformDetails.has_link || ''} onChange={v => setPlatformDetails({...platformDetails, has_link: v})} options={[{value:'yes',label:'Yes'},{value:'no',label:'No'}]} />
                  </>)}
                  {selectedPlatform === 'upi_app' && (<>
                    <SelectField label="UPI App Name" value={platformDetails.upi_app_name || ''} onChange={v => setPlatformDetails({...platformDetails, upi_app_name: v})} options={[{value:'gpay',label:'Google Pay'},{value:'phonepe',label:'PhonePe'},{value:'paytm',label:'Paytm'},{value:'cred',label:'CRED'},{value:'bhim',label:'BHIM'},{value:'whatsapp_pay',label:'WhatsApp Pay'},{value:'other',label:'Other'}]} placeholder="Select UPI app" />
                    <InputField label="Suspect's UPI ID / VPA" value={platformDetails.suspect_vpa || ''} onChange={v => setPlatformDetails({...platformDetails, suspect_vpa: v})} placeholder="name@upi" />
                  </>)}
                  {selectedPlatform === 'other' && (<>
                    <InputField label="Platform Name" value={platformOther} onChange={setPlatformOther} required error={errors.platformOther} placeholder="Specify the platform" />
                    <InputField label="Suspect's ID / Handle" value={platformDetails.other_handle || ''} onChange={v => setPlatformDetails({...platformDetails, other_handle: v})} placeholder="Username or ID" />
                  </>)}
                </div>
              </div>
            )}

            {/* Financial details — shown only for money-related cyber crimes */}
            {['online_fraud','upi_scam','credit_debit_fraud','otp_scam','fake_job_scam'].includes(cyberType) && (<>
              <SectionHeader icon="💳" title="Financial / Transaction Details" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputField label="Amount Lost (₹)" value={amountLost} onChange={setAmountLost} type="number" placeholder="Total amount" />
                <InputField label="Transaction ID / Ref No." value={txnId} onChange={setTxnId} mono placeholder="TXN123456" />
                <InputField label="UPI ID" value={upiId} onChange={setUpiId} placeholder="name@upi" />
                <InputField label="IFSC Code" value={ifsc} onChange={setIfsc} mono placeholder="ABCD0123456" />
                <InputField label="Bank Name" value={bankName} onChange={setBankName} placeholder="Bank name" />
                <InputField label="Transaction Date" value={txnDate} onChange={setTxnDate} type="date" />
              </div>
            </>)}
          </>)}

          {/* Cheating / Fraud */}
          {complaintType === 'cheating_fraud' && (<>
            <SectionHeader icon="💰" title="Fraud Details" />
            <SelectField label="Type of Fraud" value={fraudType} onChange={v => { setFraudType(v); setFraudDetails({}); }} required error={errors.fraudType} options={Object.entries(FRAUD_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} placeholder="Select fraud type" />

            {/* Dynamic fields per fraud type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fraudType === 'money_lending_fraud' && (<>
                <InputField label="Lender Name / Company" value={fraudDetails.lender_name || ''} onChange={v => setFraudDetails({...fraudDetails, lender_name: v})} placeholder="Money lender name" />
                <InputField label="Loan Amount (₹)" value={fraudDetails.loan_amount || ''} onChange={v => setFraudDetails({...fraudDetails, loan_amount: v})} type="number" placeholder="Amount" />
                <InputField label="Interest Rate Promised" value={fraudDetails.interest_rate || ''} onChange={v => setFraudDetails({...fraudDetails, interest_rate: v})} placeholder="e.g. 12% p.a." />
                <SelectField label="Written Agreement Exists?" value={fraudDetails.has_agreement || ''} onChange={v => setFraudDetails({...fraudDetails, has_agreement: v})} options={[{value:'yes',label:'Yes'},{value:'no',label:'No'}]} />
              </>)}
              {fraudType === 'business_fraud' && (<>
                <InputField label="Business / Company Name" value={fraudDetails.business_name || ''} onChange={v => setFraudDetails({...fraudDetails, business_name: v})} placeholder="Company name" />
                <InputField label="Nature of Deal" value={fraudDetails.deal_nature || ''} onChange={v => setFraudDetails({...fraudDetails, deal_nature: v})} placeholder="What was the deal?" />
                <SelectField label="Contract / Agreement Exists?" value={fraudDetails.has_contract || ''} onChange={v => setFraudDetails({...fraudDetails, has_contract: v})} options={[{value:'yes',label:'Yes'},{value:'no',label:'No'}]} />
              </>)}
              {fraudType === 'property_fraud' && (<>
                <InputField label="Property Address" value={fraudDetails.property_address || ''} onChange={v => setFraudDetails({...fraudDetails, property_address: v})} placeholder="Location of property" />
                <InputField label="Property Type" value={fraudDetails.property_type || ''} onChange={v => setFraudDetails({...fraudDetails, property_type: v})} placeholder="House, Plot, etc." />
                <InputField label="Registry / Title Details" value={fraudDetails.registry || ''} onChange={v => setFraudDetails({...fraudDetails, registry: v})} placeholder="Registry number" mono />
                <InputField label="Sold By (Name)" value={fraudDetails.seller_name || ''} onChange={v => setFraudDetails({...fraudDetails, seller_name: v})} placeholder="Seller's name" />
              </>)}
              {fraudType === 'online_investment_scam' && (<>
                <InputField label="Investment Platform / App" value={fraudDetails.platform || ''} onChange={v => setFraudDetails({...fraudDetails, platform: v})} placeholder="App or website name" />
                <InputField label="Scheme Name" value={fraudDetails.scheme_name || ''} onChange={v => setFraudDetails({...fraudDetails, scheme_name: v})} placeholder="Investment scheme" />
                <InputField label="Returns Promised" value={fraudDetails.returns || ''} onChange={v => setFraudDetails({...fraudDetails, returns: v})} placeholder="e.g. 50% in 3 months" />
                <InputField label="Initial Investment (₹)" value={fraudDetails.initial_amount || ''} onChange={v => setFraudDetails({...fraudDetails, initial_amount: v})} type="number" placeholder="Amount invested" />
              </>)}
              {fraudType === 'job_offer_scam' && (<>
                <InputField label="Company Name" value={fraudDetails.company || ''} onChange={v => setFraudDetails({...fraudDetails, company: v})} placeholder="Company name" />
                <InputField label="Position Offered" value={fraudDetails.position || ''} onChange={v => setFraudDetails({...fraudDetails, position: v})} placeholder="Job title" />
                <InputField label="Recruitment Fees Paid (₹)" value={fraudDetails.fees_paid || ''} onChange={v => setFraudDetails({...fraudDetails, fees_paid: v})} type="number" placeholder="Amount" />
                <InputField label="Portal Used" value={fraudDetails.portal || ''} onChange={v => setFraudDetails({...fraudDetails, portal: v})} placeholder="e.g. Naukri, LinkedIn" />
              </>)}
              {fraudType === 'fake_company_fraud' && (<>
                <InputField label="Company Name" value={fraudDetails.fake_company || ''} onChange={v => setFraudDetails({...fraudDetails, fake_company: v})} placeholder="Fake company name" />
                <InputField label="Registration No. Claimed" value={fraudDetails.reg_number || ''} onChange={v => setFraudDetails({...fraudDetails, reg_number: v})} placeholder="CIN / GST" mono />
                <InputField label="Nature of Fraud" value={fraudDetails.fraud_nature || ''} onChange={v => setFraudDetails({...fraudDetails, fraud_nature: v})} placeholder="What did they promise?" />
              </>)}
              {fraudType === 'loan_fraud' && (<>
                <InputField label="App / Company Name" value={fraudDetails.loan_app || ''} onChange={v => setFraudDetails({...fraudDetails, loan_app: v})} placeholder="Loan app name" />
                <InputField label="Loan Amount (₹)" value={fraudDetails.loan_amount || ''} onChange={v => setFraudDetails({...fraudDetails, loan_amount: v})} type="number" placeholder="Amount" />
                <InputField label="Actual Interest Charged" value={fraudDetails.actual_interest || ''} onChange={v => setFraudDetails({...fraudDetails, actual_interest: v})} placeholder="e.g. 5% per week" />
                <SelectField label="Harassment / Threats?" value={fraudDetails.harassment || ''} onChange={v => setFraudDetails({...fraudDetails, harassment: v})} options={[{value:'yes',label:'Yes'},{value:'no',label:'No'}]} />
              </>)}
              {fraudType === 'other' && (<>
                <InputField label="Type of Fraud" value={fraudDetails.other_fraud_type || ''} onChange={v => setFraudDetails({...fraudDetails, other_fraud_type: v})} placeholder="Describe the type of fraud" />
                <InputField label="Person / Entity Involved" value={fraudDetails.other_entity || ''} onChange={v => setFraudDetails({...fraudDetails, other_entity: v})} placeholder="Who committed the fraud?" />
                <InputField label="Relationship with Accused" value={fraudDetails.other_relationship || ''} onChange={v => setFraudDetails({...fraudDetails, other_relationship: v})} placeholder="e.g. Known person, stranger" />
                <InputField label="How Were You Contacted" value={fraudDetails.other_contact_method || ''} onChange={v => setFraudDetails({...fraudDetails, other_contact_method: v})} placeholder="e.g. Phone, in-person" />
              </>)}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InputField label="Fraud Amount (₹)" value={fraudAmount} onChange={setFraudAmount} type="number" placeholder="Total amount cheated" />
              <SelectField label="Payment Method" value={payMethod} onChange={setPayMethod} options={Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
            </div>
            <Toggle label="I have transaction / payment proof" checked={hasTxn} onChange={setHasTxn} desc="Check if you have receipts, bank statements, UPI screenshots" />
            {hasTxn && (
              <div className="p-4 bg-[#0B0F1A] border border-[#1F2D42] rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputField label="Transaction ID" value={fTxnId} onChange={setFTxnId} mono />
                <InputField label="Bank Name" value={fBankName} onChange={setFBankName} />
                <InputField label="Account No." value={fAccNum} onChange={setFAccNum} mono />
                <InputField label="IFSC Code" value={fIfsc} onChange={setFIfsc} mono />
                <InputField label="UPI ID" value={fUpi} onChange={setFUpi} />
              </div>
            )}
          </>)}

          {/* Burglary */}
          {complaintType === 'burglary' && (<>
            <SectionHeader icon="🏠" title="Burglary Details" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SelectField label="Type of Premises" value={premType} onChange={v => { setPremType(v); setPremisesDetails({}); }} required error={errors.premType} options={Object.entries(PREMISES_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} placeholder="Select premises type" />
              <SelectField label="Method of Entry" value={entryMethod} onChange={setEntryMethod} options={Object.entries(ENTRY_METHOD_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
            </div>

            {/* Dynamic fields per premises type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {premType === 'residential_house' && (<>
                <InputField label="Number of Floors" value={premisesDetails.floors || ''} onChange={v => setPremisesDetails({...premisesDetails, floors: v})} placeholder="e.g. 2" />
                <SelectField label="Was House Occupied?" value={premisesDetails.occupied || ''} onChange={v => setPremisesDetails({...premisesDetails, occupied: v})} options={[{value:'yes',label:'Yes — was home'},{value:'no',label:'No — was away'},{value:'partially',label:'Partially occupied'}]} />
                <InputField label="Which Floor Was Burgled" value={premisesDetails.target_floor || ''} onChange={v => setPremisesDetails({...premisesDetails, target_floor: v})} placeholder="e.g. Ground floor" />
              </>)}
              {premType === 'apartment' && (<>
                <InputField label="Society / Building Name" value={premisesDetails.society_name || ''} onChange={v => setPremisesDetails({...premisesDetails, society_name: v})} placeholder="Society name" />
                <InputField label="Floor Number" value={premisesDetails.floor_no || ''} onChange={v => setPremisesDetails({...premisesDetails, floor_no: v})} placeholder="e.g. 5th floor" />
                <InputField label="Flat Number" value={premisesDetails.flat_no || ''} onChange={v => setPremisesDetails({...premisesDetails, flat_no: v})} placeholder="e.g. 501" />
                <SelectField label="Security Guard Present?" value={premisesDetails.security || ''} onChange={v => setPremisesDetails({...premisesDetails, security: v})} options={[{value:'yes',label:'Yes'},{value:'no',label:'No'},{value:'unknown',label:'Not sure'}]} />
              </>)}
              {premType === 'shop' && (<>
                <InputField label="Shop Name" value={premisesDetails.shop_name || ''} onChange={v => setPremisesDetails({...premisesDetails, shop_name: v})} placeholder="Shop/store name" />
                <InputField label="Market / Area" value={premisesDetails.market || ''} onChange={v => setPremisesDetails({...premisesDetails, market: v})} placeholder="Market name" />
                <SelectField label="Shutter Type" value={premisesDetails.shutter_type || ''} onChange={v => setPremisesDetails({...premisesDetails, shutter_type: v})} options={[{value:'rolling',label:'Rolling Shutter'},{value:'collapsible',label:'Collapsible Gate'},{value:'glass',label:'Glass Door'},{value:'other',label:'Other'}]} />
              </>)}
              {premType === 'office' && (<>
                <InputField label="Office / Company Name" value={premisesDetails.office_name || ''} onChange={v => setPremisesDetails({...premisesDetails, office_name: v})} placeholder="Office name" />
                <InputField label="Floor Number" value={premisesDetails.floor || ''} onChange={v => setPremisesDetails({...premisesDetails, floor: v})} placeholder="e.g. 3rd floor" />
                <SelectField label="Watchman Present?" value={premisesDetails.watchman || ''} onChange={v => setPremisesDetails({...premisesDetails, watchman: v})} options={[{value:'yes',label:'Yes'},{value:'no',label:'No'}]} />
              </>)}
              {premType === 'warehouse' && (<>
                <InputField label="Warehouse Name" value={premisesDetails.warehouse_name || ''} onChange={v => setPremisesDetails({...premisesDetails, warehouse_name: v})} placeholder="Warehouse identifier" />
                <InputField label="Storage Content Type" value={premisesDetails.content_type || ''} onChange={v => setPremisesDetails({...premisesDetails, content_type: v})} placeholder="What was stored?" />
              </>)}
              {premType === 'other' && (<>
                <InputField label="Type of Premises" value={premisesDetails.other_type || ''} onChange={v => setPremisesDetails({...premisesDetails, other_type: v})} placeholder="Describe the premises type" />
                <InputField label="Location / Landmark" value={premisesDetails.other_landmark || ''} onChange={v => setPremisesDetails({...premisesDetails, other_landmark: v})} placeholder="Nearby landmark" />
              </>)}
            </div>

            <Toggle label="CCTV Footage Available" checked={cctvAvail} onChange={setCctvAvail} desc="Is there CCTV recording of the incident area?" />
            <TextArea label="List of Stolen Items" value={stolenDesc} onChange={setStolenDesc} required error={errors.stolenDesc} placeholder="List each stolen item with description, brand, value..." maxLength={2000} />
            <InputField label="Total Estimated Value (₹)" value={estValue} onChange={setEstValue} type="number" placeholder="Approximate total" />
          </>)}

          {/* NCR */}
          {complaintType === 'ncr' && (<>
            <SectionHeader icon="📋" title="Non-Cognizable Report" />
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-2 font-semibold">NCR Type <span className="text-orange-500">*</span></p>
              <div className="flex gap-3">
                {[{ v: 'noise_complaint', l: '🔊 Noise Complaint' }, { v: 'neighbour_dispute', l: '🏘 Neighbour Dispute' }].map(({ v, l }) => (
                  <button key={v} type="button" onClick={() => setNcrType(v)}
                    className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-all ${ncrType === v ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-[#0D1420] border-[#1F2D42] text-gray-400'}`}>{l}</button>
                ))}
              </div>
            </div>
            <TextArea label="Detailed Description of the Issue" value={ncrDesc} onChange={setNcrDesc} required error={errors.ncrDesc} placeholder="Describe the situation in detail — when it started, frequency, impact on you..." rows={5} maxLength={5000} />
          </>)}

          {/* Common: Suspect */}
          <Toggle label="Do you have information about the suspect?" checked={hasSuspect} onChange={setHasSuspect} desc="Name, phone, address, physical description, etc." />
          {hasSuspect && (
            <div className="p-4 bg-[#0B0F1A] border border-[#1F2D42] rounded-xl space-y-3">
              <SectionHeader icon="🕵️" title="Suspect Information" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputField label="Suspect Name" value={suspectName} onChange={setSuspectName} placeholder="Full name (if known)" />
                <InputField label="Suspect Phone" value={suspectPhone} onChange={setSuspectPhone} placeholder="Mobile number" />
                <InputField label="Known Address" value={suspectAddr} onChange={setSuspectAddr} placeholder="Last known address" />
                {(complaintType === 'cheating_fraud') && <InputField label="Company / Firm" value={suspectCompany} onChange={setSuspectCompany} placeholder="Company name" />}
                {(complaintType === 'cheating_fraud' || complaintType === 'cyber_crime') && <InputField label="Website" value={suspectWeb} onChange={setSuspectWeb} placeholder="https://..." />}
                {complaintType === 'cyber_crime' && <InputField label="Social Media Handle" value={suspectSocial} onChange={setSuspectSocial} placeholder="@username" />}
                {complaintType === 'cheating_fraud' && <InputField label="Suspect Bank Account" value={suspectBankAcc} onChange={setSuspectBankAcc} placeholder="Account number" mono />}
              </div>
              <TextArea label="Physical Description / Other Details" value={suspectDesc} onChange={setSuspectDesc} placeholder="Height, build, complexion, identifying marks, vehicle..." rows={2} />
            </div>
          )}

          {/* Common: Detailed description (not NCR) */}
          {complaintType !== 'ncr' && (
            <TextArea label="Detailed Incident Description" value={detailedDesc} onChange={setDetailedDesc} required error={errors.detailedDesc} placeholder="Provide a complete narrative of what happened — include timeline, sequence of events, actions taken by you..." rows={5} maxLength={5000} />
          )}
        </div>
      )}

      {/* ══════════════ STEP 4: EVIDENCE ═════════════════ */}
      {step === 4 && (
        <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#1F2D42]/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                <ImageIcon className="w-4.5 h-4.5 text-orange-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Upload Evidence</h2>
                <p className="text-[10px] text-gray-500 mt-0.5">Attach photos, videos, PDFs, or audio recordings</p>
              </div>
            </div>
            <div className="text-[9px] bg-gradient-to-r from-orange-500/10 to-amber-500/5 text-orange-400 px-3 py-1.5 rounded-xl border border-orange-500/20 font-black uppercase tracking-[0.15em]">
              Optional, Recommended
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {/* Guidance cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0D1420] border border-[#1F2D42]/50 rounded-xl p-3.5">
                <p className="text-[10px] text-orange-400 font-black uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Camera className="w-3 h-3" /> What to Upload
                </p>
                <ul className="space-y-1.5 text-[10px] text-gray-400 leading-relaxed">
                  <li className="flex items-start gap-1.5"><span className="text-green-400 mt-0.5">✓</span> Photos of damaged/stolen property</li>
                  <li className="flex items-start gap-1.5"><span className="text-green-400 mt-0.5">✓</span> Screenshots of chats or transactions</li>
                  <li className="flex items-start gap-1.5"><span className="text-green-400 mt-0.5">✓</span> CCTV or dashcam footage</li>
                  <li className="flex items-start gap-1.5"><span className="text-green-400 mt-0.5">✓</span> Receipts, invoices, or documents</li>
                </ul>
              </div>
              <div className="bg-[#0D1420] border border-[#1F2D42]/50 rounded-xl p-3.5">
                <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Shield className="w-3 h-3" /> Privacy & Security
                </p>
                <ul className="space-y-1.5 text-[10px] text-gray-400 leading-relaxed">
                  <li className="flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">🔒</span> Files are encrypted at rest</li>
                  <li className="flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">🛡️</span> Only you and assigned officer can view</li>
                  <li className="flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">📋</span> Max 50 MB per file</li>
                  <li className="flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">🗑️</span> Deletable until report is submitted</li>
                </ul>
              </div>
            </div>

            {/* Upload component */}
            {incidentId ? (
              <EvidenceUpload incidentId={incidentId} />
            ) : (
              <div className="p-8 text-center bg-[#0D1420] border border-[#1F2D42] rounded-2xl">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                <p className="text-sm text-white font-medium">Draft Not Found</p>
                <p className="text-xs text-gray-500 mt-1">Please go back and save your previous steps first.</p>
              </div>
            )}
          </div>
        </div>
      )}


      {/* ══════════════ STEP 5: REVIEW & SUBMIT ═════════ */}
      {step === 5 && (
        <div className="space-y-4">
          <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-orange-400" /> Review Your Report
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-[#0D1420] rounded-xl p-4">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">👤 Complainant</p>
                <p className="text-sm text-white font-medium">{fullName}</p>
                <p className="text-xs text-gray-400 mt-1">{mobile}{email && ` · ${email}`}</p>
                <p className="text-xs text-gray-500">{cCity}, {cDistrict}, {cState}</p>
                {cPincode && <p className="text-xs text-gray-600">PIN: {cPincode}</p>}
              </div>
              <div className="bg-[#0D1420] rounded-xl p-4">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">📍 Incident</p>
                <p className="text-sm text-white font-medium">{COMPLAINT_TYPE_LABELS[complaintType as ComplaintType]?.label}</p>
                <p className="text-xs text-gray-400 mt-1">{iDate}{iTime && ` at ${iTime}`}</p>
                <p className="text-xs text-gray-500">{iCity}, {iDistrict}, {iState}</p>
                {iPincode && <p className="text-xs text-gray-600">PIN: {iPincode}</p>}
              </div>
            </div>

            {(detailedDesc || ncrDesc) && (
              <div className="bg-[#0D1420] rounded-xl p-4">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">📝 Description</p>
                <p className="text-sm text-gray-300 leading-relaxed">{(detailedDesc || ncrDesc).slice(0, 300)}{(detailedDesc || ncrDesc).length > 300 ? '...' : ''}</p>
              </div>
            )}
          </div>

          {/* Recovery */}
          {showsRecovery(complaintType, complaintType === 'cyber_crime' ? cyberType : undefined) && (
            <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-6 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">💰 Loss / Recovery Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputField label="Your Financial Loss (₹)" value={yourLoss} onChange={setYourLoss} type="number" placeholder="Amount lost by you" />
                <InputField label="Total Estimated Loss (₹)" value={totalLoss} onChange={setTotalLoss} type="number" placeholder="Including others if applicable" />
              </div>
            </div>
          )}

          {/* Signature */}
          <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <PenTool className="w-4 h-4 text-orange-400" /> Digital Signature
              </h3>
              <div className="flex items-center gap-3">
                {hasSigned && (
                  <span className="text-[9px] text-green-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Signed
                  </span>
                )}
                {hasSigned && (
                  <button type="button" onClick={clearSig}
                    className="text-[10px] text-red-400 hover:text-red-300 bg-red-500/5 hover:bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/10 transition-all"
                  >Clear</button>
                )}
              </div>
            </div>
            <div className="relative">
              <canvas ref={sigCanvas} width={800} height={200}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
                className={`w-full h-[150px] bg-[#0A0F1A] border-2 rounded-xl cursor-crosshair touch-none transition-all duration-300 ${
                  isDrawing ? 'border-orange-500/50 shadow-lg shadow-orange-500/10' : 'border-[#1F2D42] hover:border-[#2a3a52]'
                }`}
                style={{ imageRendering: 'auto' }}
              />
              {/* Signature baseline guide */}
              <div className="absolute bottom-[42px] left-6 right-6 border-b border-dashed border-gray-800/60 pointer-events-none" />
              {!hasSigned && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <PenTool className="w-5 h-5 text-gray-700 mb-2" />
                  <p className="text-[11px] text-gray-600 font-medium">Sign here with your mouse or finger</p>
                  <p className="text-[9px] text-gray-700 mt-0.5">Your signature will be attached to the report</p>
                </div>
              )}
            </div>
          </div>

          {/* Declaration */}
          <label className="flex items-start gap-3 p-4 bg-[#111827] border border-[#1F2D42] rounded-2xl cursor-pointer">
            <input type="checkbox" checked={declaration} onChange={e => setDeclaration(e.target.checked)} className="mt-0.5 accent-orange-500 w-4 h-4" />
            <p className="text-sm text-gray-300">
              I hereby declare that the information provided above is <span className="text-white font-medium">true and correct</span> to the best of my knowledge and belief. I understand that filing a <span className="text-red-400">false report is a punishable offence</span> under IPC Section 182/211.
            </p>
          </label>
          {errors.declaration && <p className="text-[10px] text-red-400">{errors.declaration}</p>}
        </div>
      )}

      {/* ── Navigation ─────────────────────────────────── */}
      <div className="flex items-center justify-between mt-6 mb-8">
        <button type="button" onClick={handleBack} disabled={step === 1 || saving}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        {step < 5 ? (
          <button type="button" onClick={handleNext} disabled={saving}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:bg-orange-500/30 text-black font-semibold text-sm px-6 py-2.5 rounded-xl transition-colors">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {step === 4 ? 'Review Report' : 'Save & Next'} <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={saving || !declaration}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-400 disabled:bg-green-500/30 text-black font-semibold text-sm px-6 py-2.5 rounded-xl transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            Submit Report
          </button>
        )}
      </div>
    </div>
  )
}
