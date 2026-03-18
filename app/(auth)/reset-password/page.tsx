'use client'
import { useState } from 'react'
import { resetPassword } from '@/lib/auth/login'
import Link from 'next/link'
import { Shield } from 'lucide-react'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await resetPassword(email)
      setSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#111827] rounded-2xl p-8 border border-[#1F2D42]">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-6 h-6 text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold text-white font-heading">Reset Password</h1>
            <p className="text-gray-400 text-sm">COPS Platform</p>
          </div>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="text-4xl">📬</div>
            <p className="text-white font-medium">Check your email</p>
            <p className="text-gray-400 text-sm">
              We&apos;ve sent a password reset link to <span className="text-orange-400">{email}</span>
            </p>
            <Link href="/login" className="cops-btn-primary w-full py-3 block text-center">
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-gray-400 text-sm">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="cops-input"
              required
            />
            {error && <p className="text-red-400 text-sm bg-red-900/20 p-3 rounded-xl">{error}</p>}
            <button type="submit" disabled={loading} className="w-full cops-btn-primary py-3 text-base">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <Link href="/login" className="block text-center text-gray-400 text-sm hover:text-white">
              ← Back to Sign In
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
