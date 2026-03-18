'use client'

import React from 'react'

// ── Input Field ─────────────────────────────────────────────
interface InputFieldProps {
  label: string
  value: string
  onChange: (val: string) => void
  required?: boolean
  error?: string
  placeholder?: string
  type?: string
  mono?: boolean
  disabled?: boolean
  maxLength?: number
  max?: string
  min?: string
}

export function InputField({ label, value, onChange, required, error, placeholder, type = 'text', mono, disabled, maxLength, max, min }: InputFieldProps) {
  return (
    <div>
      <label className="text-[11px] text-gray-400 uppercase tracking-wider mb-1.5 block font-semibold">
        {label}{required && <span className="text-orange-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        max={max}
        min={min}
        className={`w-full bg-[#0D1420] border rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none transition-colors [color-scheme:dark] ${
          error ? 'border-red-500/50' : 'border-[#1F2D42] focus:border-orange-500/40'
        } ${mono ? 'font-mono' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
      {error && <p className="text-[10px] text-red-400 mt-1">{error}</p>}
    </div>
  )
}

// ── Select Field ────────────────────────────────────────────
interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps {
  label: string
  value: string
  onChange: (val: string) => void
  options: SelectOption[]
  required?: boolean
  error?: string
  placeholder?: string
  disabled?: boolean
}

export function SelectField({ label, value, onChange, options, required, error, placeholder, disabled }: SelectFieldProps) {
  return (
    <div>
      <label className="text-[11px] text-gray-400 uppercase tracking-wider mb-1.5 block font-semibold">
        {label}{required && <span className="text-orange-500 ml-0.5">*</span>}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full bg-[#0D1420] border rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-colors appearance-none ${
          error ? 'border-red-500/50' : 'border-[#1F2D42] focus:border-orange-500/40'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <option value="">{placeholder || 'Select...'}</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-[10px] text-red-400 mt-1">{error}</p>}
    </div>
  )
}

// ── Text Area ───────────────────────────────────────────────
interface TextAreaProps {
  label: string
  value: string
  onChange: (val: string) => void
  required?: boolean
  error?: string
  placeholder?: string
  rows?: number
  maxLength?: number
}

export function TextArea({ label, value, onChange, required, error, placeholder, rows = 4, maxLength }: TextAreaProps) {
  return (
    <div>
      <label className="text-[11px] text-gray-400 uppercase tracking-wider mb-1.5 block font-semibold">
        {label}{required && <span className="text-orange-500 ml-0.5">*</span>}
      </label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`w-full bg-[#0D1420] border rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none transition-colors resize-none ${
          error ? 'border-red-500/50' : 'border-[#1F2D42] focus:border-orange-500/40'
        }`}
      />
      {maxLength && (
        <p className="text-[10px] text-gray-600 mt-0.5 text-right">{value.length}/{maxLength}</p>
      )}
      {error && <p className="text-[10px] text-red-400 mt-1">{error}</p>}
    </div>
  )
}

// ── Toggle ──────────────────────────────────────────────────
interface ToggleProps {
  label: string
  checked: boolean
  onChange: (val: boolean) => void
  desc?: string
}

export function Toggle({ label, checked, onChange, desc }: ToggleProps) {
  return (
    <label className="flex items-start gap-3 p-3 bg-[#0D1420] border border-[#1F2D42] rounded-xl cursor-pointer hover:border-orange-500/20 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="mt-0.5 accent-orange-500 w-4 h-4"
      />
      <div>
        <p className="text-sm text-white font-medium">{label}</p>
        {desc && <p className="text-[11px] text-gray-500 mt-0.5">{desc}</p>}
      </div>
    </label>
  )
}

// ── Section Header ──────────────────────────────────────────
interface SectionHeaderProps {
  icon: string
  title: string
  subtitle?: string
}

export function SectionHeader({ icon, title, subtitle }: SectionHeaderProps) {
  return (
    <div className="mb-1">
      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-2">
        <span>{icon}</span> {title}
      </p>
      {subtitle && <p className="text-[10px] text-gray-600 mt-0.5 ml-6">{subtitle}</p>}
    </div>
  )
}
