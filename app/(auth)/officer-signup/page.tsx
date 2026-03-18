'use client'

import OfficerRegisterForm from '@/components/officer-register/OfficerRegisterForm'
import { Shield } from 'lucide-react'

export default function OfficerSignupPage() {
  return (
    <div className="min-h-screen bg-[#0B0F1A] flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="w-full max-w-4xl text-center mb-12">
        <div className="w-20 h-20 bg-orange-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-orange-500/20 shadow-2xl shadow-orange-900/10">
          <Shield className="w-10 h-10 text-orange-500" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white font-heading tracking-tight mb-4">
          Officer <span className="text-orange-500">Registration</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto font-medium">
          Create your official portal account. Join the digital force for a safer community.
          Requires badge verification.
        </p>
      </div>

      {/* Form Container */}
      <div className="w-full">
        <OfficerRegisterForm />
      </div>
    </div>
  )
}
