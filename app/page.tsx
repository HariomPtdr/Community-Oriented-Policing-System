'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Shield, Menu, X, ChevronDown, ChevronRight, Phone } from 'lucide-react'

/* ==============================
   ANIMATED COUNTER HOOK
   ============================== */
function useCountUp(target: number, duration: number = 2000, inView: boolean) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!inView) return
    let start = 0
    const increment = target / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [inView, target, duration])
  return count
}

function useInView(ref: React.RefObject<HTMLElement | null>) {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setInView(true)
    }, { threshold: 0.3 })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [ref])
  return inView
}

/* ==============================
   LANDING NAVBAR
   ============================== */
function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const navLinks = [
    { href: '#features', label: 'Features' },
    { href: '#how-it-works', label: 'How It Works' },
    { href: '#emergency', label: 'Emergency' },
    { href: '#faq', label: 'FAQ' },
  ]

  return (
    <>
      <nav className={`sticky top-0 z-50 border-b border-[#1F2D42] transition-all duration-300 ${
        scrolled
          ? 'bg-[#0B0F1A]/95 backdrop-blur-md shadow-[0_2px_20px_rgba(0,0,0,0.5)]'
          : 'bg-[#0B0F1A]'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-orange-500" />
            <div>
              <span className="font-heading font-bold text-lg text-white">COPS</span>
              <span className="hidden md:inline text-xs text-gray-500 ml-2">Community Oriented Policing System</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
              <a key={link.href} href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                {link.label}
              </a>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:inline-flex px-4 py-2 rounded-xl border border-[#1F2D42] text-gray-300 hover:border-orange-500 hover:text-orange-400 transition-all text-sm">
              Sign In
            </Link>
            <Link href="/signup" className="cops-btn-primary text-sm px-4 py-2">
              <span className="hidden sm:inline">Report Incident</span>
              <span className="sm:hidden">📋</span>
            </Link>
            <button onClick={() => setMobileOpen(true)} className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl border border-[#1F2D42] text-gray-400">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-[#0D1420]/98 backdrop-blur-lg flex flex-col">
          <div className="flex items-center justify-between px-6 h-16 border-b border-[#1F2D42]">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-orange-500" />
              <span className="font-heading font-bold text-white">COPS</span>
            </div>
            <button onClick={() => setMobileOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#1F2D42] text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-col px-6 py-8 gap-4">
            {navLinks.map(link => (
              <a key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="text-lg text-gray-300 hover:text-white py-2">
                {link.label}
              </a>
            ))}
            <hr className="border-[#1F2D42] my-2" />
            <Link href="/login" className="py-3 text-center rounded-xl border border-[#1F2D42] text-gray-300">Sign In</Link>
            <Link href="/signup" className="cops-btn-primary text-center py-3">Report Incident</Link>
          </div>
        </div>
      )}
    </>
  )
}

/* ==============================
   STATS BAR
   ============================== */
function StatsBar() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref)

  const stats = [
    { value: 12480, suffix: '+', label: 'Reports Filed This Year' },
    { value: 94, suffix: '%', label: 'Cases Responded To' },
    { value: 8, suffix: ' min', label: 'Average Response Time' },
    { value: 47, suffix: '', label: 'Active Beat Officers' },
  ]

  return (
    <section ref={ref} className="bg-[#0D1420] border-y border-[#1F2D42] py-8 px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat, i) => {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const count = useCountUp(stat.value, 2000, inView)
          return (
            <div key={i} className={`text-center ${i < 3 ? 'lg:border-r lg:border-[#1F2D42]' : ''}`}>
              <p className="text-3xl font-bold font-heading text-white">
                {count.toLocaleString()}{stat.suffix}
              </p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ==============================
   FAQ ACCORDION
   ============================== */
function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const faqs = [
    {
      q: 'Is my identity protected when I file a report?',
      a: 'Yes. You can choose to submit any report anonymously. When you select anonymous mode, your name and contact details are completely hidden from all officers — only the incident details are visible. Even system admins cannot link an anonymous report to your account without a court order.'
    },
    {
      q: 'Is this an official government platform?',
      a: 'COPS Platform is deployed and operated in partnership with local police departments. Your reports go directly to the station responsible for your area. No third party handles your data.'
    },
    {
      q: 'What happens after I file a report?',
      a: 'Your report is immediately visible to the duty officer at your nearest station. It is typically assigned to a beat officer within 30 minutes. You receive push notifications at every stage: assigned → en route → on scene → resolved. You can message your assigned officer directly at any time.'
    },
    {
      q: 'Can I file a report in Hindi?',
      a: 'The platform currently operates in English. Hindi and other regional language support is planned for future updates.'
    },
    {
      q: 'What if I want to complain about a police officer?',
      a: 'There is a dedicated, protected complaint channel separate from regular reports. Complaints are reviewed by an independent civilian oversight board — not by the officer\'s superiors. You can file anonymously. You receive updates at each stage.'
    },
    {
      q: 'Is the app free? Do I need to register?',
      a: 'The platform is completely free for citizens. You can browse public crime alerts without registering. To file reports, message officers, or track case status, you need a free account (email or phone number).'
    },
  ]

  return (
    <section id="faq" className="max-w-3xl mx-auto px-6 py-20">
      <h2 className="text-3xl font-heading font-bold text-white text-center mb-4">Frequently Asked Questions</h2>
      <p className="text-gray-400 text-center mb-12">Everything you need to know about the COPS Platform</p>

      <div className="divide-y divide-[#1F2D42]">
        {faqs.map((faq, i) => (
          <div key={i} className="py-5">
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between text-left"
            >
              <span className={`text-base font-medium ${openIndex === i ? 'text-orange-400' : 'text-white'}`}>
                {faq.q}
              </span>
              <span className={`text-orange-500 transition-transform duration-200 ml-4 flex-shrink-0 ${openIndex === i ? 'rotate-45' : ''}`}>
                +
              </span>
            </button>
            <div className={`overflow-hidden transition-all duration-200 ${openIndex === i ? 'max-h-96 pt-3 pb-1' : 'max-h-0'}`}>
              <p className="text-gray-400 text-sm leading-relaxed">{faq.a}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ==============================
   MAIN LANDING PAGE
   ============================== */
export default function LandingPage() {
  const features = [
    { icon: '📋', title: 'Incident Reporting', desc: 'File reports with photos, video, and GPS location. Track status in real time from submission to resolution.', bg: 'bg-orange-500/10' },
    { icon: '🚨', title: 'Live Crime Alerts', desc: 'Get instant notifications about incidents in your neighborhood. Filter by type and set your preferred radius.', bg: 'bg-red-500/10' },
    { icon: '🆘', title: 'One-Tap SOS', desc: 'Emergency button sends your live GPS location to the nearest police station instantly. No typing required.', bg: 'bg-red-500/10' },
    { icon: '👮', title: 'Meet Your Beat Officer', desc: 'View the profile of the officer assigned to your neighborhood — name, photo, languages spoken, rating.', bg: 'bg-blue-500/10' },
    { icon: '💬', title: 'Direct Messaging', desc: 'Communicate directly with your assigned officer about your case. Anonymous mode available.', bg: 'bg-blue-500/10' },
    { icon: '🗺️', title: 'Community Forum', desc: 'Discuss local safety concerns with neighbors. Moderated by officers.', bg: 'bg-amber-500/10' },
    { icon: '🔒', title: 'Anonymous Reporting', desc: 'Submit tips and reports without revealing your identity. Your privacy is protected by design.', bg: 'bg-green-500/10' },
    { icon: '📊', title: 'Transparent Data', desc: 'Public crime maps, police response times, and accountability metrics — visible to all citizens.', bg: 'bg-purple-500/10' },
    { icon: '🤖', title: 'AI-Powered Help', desc: 'Smart chatbot guides you through reporting. Available 24/7, even offline.', bg: 'bg-teal-500/10' },
  ]

  const citizenBenefits = [
    'File FIR-equivalent reports from your phone',
    'Attach photos, videos, and voice notes as evidence',
    'Track your report status in real time',
    'Message your assigned officer directly',
    'Get alerts when crimes happen near you',
    'Submit tips completely anonymously',
    'Rate police response after resolution',
    'Access your reports anytime, anywhere',
  ]

  const policeBenefits = [
    'Role-specific portal for every rank — PC to DSP',
    'Live beat map with incident pins and SOS alerts',
    'Case management from report to resolution',
    'Escalate cases up the chain with one tap',
    'Digital FIR filing from the field',
    'Patrol log with GPS route tracking',
    'Community event management and attendance',
    'AI-powered incident categorization',
  ]

  return (
    <main className="min-h-screen bg-[#0B0F1A] text-white">
      <LandingNavbar />

      {/* ===== HERO SECTION ===== */}
      <section className="min-h-[90vh] flex items-center relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(249,115,22,0.08),transparent)]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 py-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full relative">
          {/* Left: Text */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold tracking-wide mb-6">
              🇮🇳 Official Community Policing Portal
            </div>

            <h1 className="font-heading font-bold leading-tight mb-4">
              <span className="block text-5xl lg:text-6xl text-white font-hindi">सुरक्षित समुदाय,</span>
              <span className="block text-5xl lg:text-6xl text-orange-500 font-hindi">साथ मिलकर।</span>
              <span className="block text-2xl lg:text-3xl text-gray-400 mt-3 font-medium font-heading">
                Safer Communities, Together.
              </span>
            </h1>

            <p className="text-lg text-gray-400 max-w-lg leading-relaxed mb-8">
              File incident reports, track case status, communicate with your
              beat officer, and receive real-time crime alerts — all in one
              secure platform built for Indian communities.
            </p>

            <div className="flex gap-4 flex-wrap mb-8">
              <Link href="/signup" className="cops-btn-primary text-base px-8 py-4 inline-flex items-center gap-2">
                📋 File a Report
              </Link>
              <a href="#emergency" className="border-2 border-red-500 hover:bg-red-500/10 text-red-400 font-semibold px-8 py-4 rounded-xl transition-colors text-base inline-flex items-center gap-2">
                🆘 Emergency Help
              </a>
            </div>

            <div className="flex flex-wrap gap-5 text-xs text-gray-500">
              <span>🔒 Anonymous Reporting Available</span>
              <span>✅ Free to Use</span>
              <span>📱 Works on Any Phone</span>
            </div>
          </div>

          {/* Right: Floating mockup */}
          <div className="relative hidden lg:flex items-center justify-center">
            <div className="absolute w-64 h-64 rounded-full bg-blue-600/10 blur-3xl -top-10 -right-10 pointer-events-none" />
            <div className="absolute w-48 h-48 rounded-full bg-orange-500/[0.08] blur-3xl bottom-0 left-10 pointer-events-none" />

            {/* Main card */}
            <div className="relative bg-[#111827] border border-[#1F2D42] rounded-3xl p-6 shadow-[0_24px_60px_rgba(0,0,0,0.6)] rotate-1 animate-float w-80">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-gray-500">#INC-2024-0847</span>
                <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-400 text-xs font-semibold">
                  In Progress
                </span>
              </div>
              <p className="text-white font-semibold mb-1">Suspicious Activity Reported</p>
              <p className="text-gray-500 text-sm mb-4">📍 MG Road, Indore · 2 hours ago</p>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center text-xs font-bold text-blue-300">RK</div>
                <div>
                  <p className="text-xs text-white font-medium">Const. Ramesh Kumar</p>
                  <p className="text-xs text-gray-500">Beat 4 — En Route</p>
                </div>
                <span className="ml-auto px-2 py-0.5 rounded-lg bg-gray-700 text-gray-300 text-xs font-mono">PC</span>
              </div>
              <div className="w-full bg-[#1A2235] rounded-full h-1.5">
                <div className="bg-orange-500 h-1.5 rounded-full w-2/3" />
              </div>
              <p className="text-xs text-gray-500 mt-1.5">Officer En Route · ETA 8 min</p>
            </div>

            {/* Floating alert card */}
            <div className="absolute -bottom-6 -left-8 bg-[#0D1420] border border-[#1F2D42] rounded-2xl p-4 w-64 shadow-xl animate-float-delayed">
              <p className="text-red-400 text-xs font-semibold">🚨 Crime Alert</p>
              <p className="text-gray-300 text-xs mt-1">Vehicle theft reported 500m away</p>
              <p className="text-gray-500 text-xs mt-0.5">14 minutes ago · Vijay Nagar</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== STATS BAR ===== */}
      <StatsBar />

      {/* ===== HOW IT WORKS ===== */}
      <section id="how-it-works" className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-heading font-bold text-white text-center mb-3">How It Works</h2>
        <p className="text-gray-400 text-center mb-16">Three simple steps to a safer community</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { num: '01', icon: '📋', iconBg: 'bg-orange-500/15 border-orange-500/30 text-orange-500', title: 'File a Report', desc: 'Describe what happened, add photos or video, and drop a location pin. Takes less than 2 minutes. Can be anonymous.' },
            { num: '02', icon: '👮', iconBg: 'bg-blue-600/15 border-blue-600/30 text-blue-400', title: 'Officer Is Assigned', desc: 'Your report is instantly visible to the beat officer and station. They respond, update status, and message you directly.' },
            { num: '03', icon: '✅', iconBg: 'bg-green-500/15 border-green-500/30 text-green-400', title: 'Track & Close', desc: 'Get real-time notifications at every stage. Rate the resolution when it\'s closed.' },
          ].map((step, i) => (
            <div key={i} className="text-center">
              <p className="text-xs font-mono text-gray-600 mb-3">{step.num}</p>
              <div className={`w-16 h-16 rounded-2xl border ${step.iconBg} flex items-center justify-center text-2xl mx-auto mb-4`}>
                {step.icon}
              </div>
              <h3 className="text-white font-semibold font-heading mb-2">{step.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
              {i < 2 && (
                <div className="hidden md:flex justify-center mt-6">
                  <ChevronRight className="w-5 h-5 text-[#1F2D42]" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ===== FEATURES GRID ===== */}
      <section id="features" className="max-w-6xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-heading font-bold text-white text-center mb-3">Everything You Need</h2>
        <p className="text-gray-400 text-center mb-12">Built specifically for Indian communities and police departments</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(f => (
            <div key={f.title} className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-6 hover:border-[#2563EB30] hover:-translate-y-0.5 transition-all duration-200">
              <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center text-2xl mb-4`}>
                {f.icon}
              </div>
              <h3 className="text-white font-semibold mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FOR CITIZENS ===== */}
      <section className="bg-[#0D1420] py-20">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-green-500/10 text-green-400 text-xs font-semibold mb-6">
              For Citizens
            </div>
            <h2 className="text-3xl font-heading font-bold text-white mb-4">Your safety, your voice.</h2>
            <p className="text-gray-400 mb-8">
              You no longer have to visit a police station to file a report or find out what happened to your complaint.
            </p>
            <ul className="space-y-3 mb-8">
              {citizenBenefits.map((b, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-300 text-sm">
                  <span className="text-green-400 mt-0.5">✅</span>
                  {b}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="cops-btn-primary text-base px-8 py-4 inline-flex items-center gap-2">
              Create Free Citizen Account <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Phone mockup */}
          <div className="flex justify-center">
            <div className="w-[280px] rounded-[2rem] border-4 border-[#1F2D42] overflow-hidden bg-[#0B0F1A] shadow-2xl">
              <div className="px-5 py-6 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-400">👋 Namaste, Priya</p>
                  <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <span className="text-xs">🔔</span>
                  </div>
                </div>
                <button className="w-full bg-red-600 rounded-xl py-3 text-white font-bold text-sm shadow-lg shadow-red-900/50 animate-pulse-slow">
                  🆘 SOS Emergency
                </button>
                <div className="grid grid-cols-4 gap-2">
                  {['📋', '🔔', '💬', '👮'].map((icon, i) => (
                    <div key={i} className="bg-[#111827] border border-[#1F2D42] rounded-xl p-3 text-center text-lg">
                      {icon}
                    </div>
                  ))}
                </div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recent Reports</p>
                {[
                  { title: 'Noise Complaint', status: 'Assigned', color: 'text-indigo-400 bg-indigo-500/15' },
                  { title: 'Suspicious Activity', status: 'Resolved', color: 'text-green-400 bg-green-500/15' },
                ].map((r, i) => (
                  <div key={i} className="bg-[#111827] border border-[#1F2D42] rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-white font-medium">{r.title}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${r.color}`}>{r.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOR POLICE ===== */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Dashboard mockup */}
          <div className="flex justify-center order-2 lg:order-1">
            <div className="w-full max-w-md bg-[#111827] border border-[#1F2D42] rounded-2xl p-5 shadow-2xl">
              <p className="text-sm text-gray-400 mb-4">Good morning, <span className="text-white font-medium">Constable Sharma</span></p>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Active Cases', value: '5', color: 'border-l-orange-500' },
                  { label: 'Resolved Today', value: '2', color: 'border-l-green-500' },
                  { label: 'Messages', value: '3', color: 'border-l-blue-500' },
                ].map((stat, i) => (
                  <div key={i} className={`bg-[#0D1420] border border-[#1F2D42] border-l-2 ${stat.color} rounded-xl p-3`}>
                    <p className="text-[10px] text-gray-500 uppercase">{stat.label}</p>
                    <p className="text-lg font-bold text-white">{stat.value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-[#0D1420] border border-[#1F2D42] rounded-xl h-24 mb-3 flex items-center justify-center">
                <span className="text-xs text-gray-600">🗺️ Beat Map</span>
              </div>
              {[
                { title: 'Theft — MG Road', priority: '● High', color: 'text-orange-400' },
                { title: 'Vandalism — Park Area', priority: '● Medium', color: 'text-amber-400' },
              ].map((item, i) => (
                <div key={i} className="bg-[#0D1420] border border-[#1F2D42] rounded-xl p-3 mb-2 flex items-center justify-between">
                  <p className="text-xs text-white">{item.title}</p>
                  <span className={`text-[10px] font-semibold ${item.color}`}>{item.priority}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-600/10 text-blue-400 text-xs font-semibold mb-6">
              For Police Officers
            </div>
            <h2 className="text-3xl font-heading font-bold text-white mb-4">Command your beat. Build community trust.</h2>
            <p className="text-gray-400 mb-6">
              From Constable to DSP — every rank has a dedicated portal built for their exact role and responsibilities.
            </p>

            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { label: 'PC', color: 'bg-gray-700 text-gray-300' },
                { label: 'SI', color: 'bg-blue-600 text-white' },
                { label: 'SHO ★', color: 'bg-amber-500 text-black' },
                { label: 'DSP 🛡', color: 'bg-yellow-600 text-black' },
              ].map((badge, i) => (
                <span key={i} className={`px-3 py-1 rounded-lg text-xs font-bold font-mono ${badge.color}`}>
                  {badge.label}
                </span>
              ))}
            </div>

            <ul className="space-y-3 mb-8">
              {policeBenefits.map((b, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-300 text-sm">
                  <span className="text-green-400 mt-0.5">✅</span>
                  {b}
                </li>
              ))}
            </ul>
            <Link href="/signup?role=constable" className="cops-btn-secondary text-base px-8 py-4 inline-flex items-center gap-2">
              Request Officer Access <ChevronRight className="w-4 h-4" />
            </Link>
            <p className="text-xs text-gray-500 mt-3">Officer accounts require badge verification by your SHO</p>
          </div>
        </div>
      </section>

      {/* ===== TRUST & SAFETY ===== */}
      <section className="bg-[#0D1420] py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-heading font-bold text-white text-center mb-3">Built on Trust. Protected by Design.</h2>
          <p className="text-gray-400 text-center mb-12">We know that trust between citizens and police is earned, not assumed.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { icon: '🔒', title: 'Anonymous by Default', desc: 'You choose whether to attach your identity to a report. Anonymous reports are fully separated from your account. Officers see the incident — not who filed it.' },
              { icon: '🛡', title: 'Independent Oversight', desc: 'All complaints against officers are reviewed by an independent civilian oversight board — not by police supervisors. Every action is logged in an immutable audit trail.' },
              { icon: '📋', title: 'Your Data, Your Control', desc: 'Your personal information is never sold or shared. You can delete your account and all associated data at any time. We comply with Indian data protection guidelines.' },
              { icon: '⚖️', title: 'Complaint Protection', desc: 'Filing a complaint against an officer cannot result in retaliation. Complaints are tracked separately and reviewed independently. You receive updates at every stage.' },
            ].map((card, i) => (
              <div key={i} className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-6">
                <div className="text-2xl mb-3">{card.icon}</div>
                <h3 className="text-white font-semibold mb-2">{card.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-4 mt-10">
            {['🇮🇳 Made in India', '🔒 Data Encrypted', '✅ Government Verified'].map((badge, i) => (
              <span key={i} className="px-4 py-2 rounded-full bg-[#0D1420] border border-[#1F2D42] text-xs text-gray-500">
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== COMMUNITY IMPACT ===== */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-heading font-bold text-white text-center mb-12">Real Impact. Real Communities.</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {[
              { value: '94%', label: 'Cases responded to within 24 hours' },
              { value: '4.2/5', label: 'Average citizen satisfaction rating' },
              { value: '32 min', label: 'Average time to first officer contact' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-5xl font-heading font-bold text-orange-500 mb-2">{stat.value}</p>
                <p className="text-sm text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-5 overflow-x-auto pb-4 snap-x">
            {[
              { quote: 'मैंने रात 2 बजे रिपोर्ट की और 40 मिनट में कांस्टेबल आ गया। पहले कभी ऐसा नहीं हुआ था।', name: '— Sunita Devi, Indore', stars: '★★★★★' },
              { quote: 'The anonymous tip feature gave me the confidence to report the drug dealing happening on my street. Action was taken within 2 days.', name: '— Anonymous Citizen, Mumbai', stars: '★★★★★' },
              { quote: 'As a beat constable, this app saves me 2 hours of paperwork every day. I can focus on actual patrolling now.', name: '— Constable Pradeep Singh, Bhopal', stars: '★★★★☆' },
            ].map((t, i) => (
              <div key={i} className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-6 min-w-[320px] snap-start flex-shrink-0">
                <p className="text-orange-500 text-sm mb-4">{t.stars}</p>
                <p className="text-gray-300 text-sm leading-relaxed mb-4 italic">&ldquo;{t.quote}&rdquo;</p>
                <p className="text-gray-500 text-xs">{t.name}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-600 mt-4">Community Feedback</p>
        </div>
      </section>

      {/* ===== EMERGENCY QUICK ACCESS ===== */}
      <section id="emergency" className="bg-[#0D0810] border-y border-red-900/30 py-16 px-6">
        <div className="max-w-4xl mx-auto text-center mb-10">
          <h2 className="text-2xl font-heading font-bold text-white mb-2">🆘 Emergency? Don&apos;t Wait.</h2>
          <p className="text-gray-400">For life-threatening emergencies, always call first.</p>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
          {[
            { number: '100', label: 'Police Emergency Helpline', sub: 'Available 24/7 · All India', color: 'border-red-600', numColor: 'text-red-500', btnColor: 'bg-red-600 hover:bg-red-500' },
            { number: '112', label: 'National Emergency Number', sub: 'Police · Fire · Ambulance', color: 'border-orange-600', numColor: 'text-orange-500', btnColor: 'bg-orange-600 hover:bg-orange-500' },
            { number: '1091', label: 'Women Safety Helpline', sub: '24/7 · Confidential', color: 'border-pink-600', numColor: 'text-pink-400', btnColor: 'bg-pink-700 hover:bg-pink-600' },
          ].map((e, i) => (
            <div key={i} className={`bg-[#1A0A0A] border-2 ${e.color} rounded-2xl p-6 text-center`}>
              <p className="flex items-center justify-center gap-2 mb-1">
                <Phone className="w-5 h-5 text-gray-500" />
                <span className={`text-4xl font-bold font-mono ${e.numColor}`}>{e.number}</span>
              </p>
              <p className="text-white font-semibold text-sm mb-1">{e.label}</p>
              <p className="text-gray-500 text-xs mb-4">{e.sub}</p>
              <a href={`tel:${e.number}`} className={`block w-full ${e.btnColor} text-white font-semibold py-3 rounded-xl transition-colors text-sm`}>
                Call {e.number} Now
              </a>
            </div>
          ))}
        </div>

        <div className="text-center">
          <p className="text-gray-500 text-sm mb-4">Or use our platform for non-emergency incidents:</p>
          <Link href="/signup" className="cops-btn-primary px-8 py-3 text-base">📋 File Non-Emergency Report</Link>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <FAQSection />

      {/* ===== FINAL CTA ===== */}
      <section className="bg-[#0D1420] py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(249,115,22,0.06),transparent)] pointer-events-none" />
        <div className="max-w-2xl mx-auto text-center relative">
          <h2 className="font-heading font-bold mb-2">
            <span className="block text-4xl text-white">Join Your Community.</span>
            <span className="block text-4xl text-orange-500">Start protecting what matters.</span>
          </h2>
          <p className="text-gray-400 text-lg mt-4 mb-10">
            Free to use. Works on any phone. Your reports reach the right officer in seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="cops-btn-primary text-lg px-10 py-4">📋 File Your First Report</Link>
            <Link href="/signup?role=constable" className="border border-[#1F2D42] hover:border-blue-600 text-gray-400 hover:text-blue-400 font-semibold px-10 py-4 rounded-xl text-lg transition-colors">
              👮 Officer / Admin Access
            </Link>
          </div>
          <p className="text-xs text-gray-600 mt-6">🔒 No spam · ✅ Free forever · 📱 Works offline · 🇮🇳 Made in India</p>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-[#080C14] border-t border-[#1F2D42] pt-16 pb-8 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-6 h-6 text-orange-500" />
                <span className="font-heading font-bold text-white">COPS Platform</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">
                Connecting citizens and police for a safer, more transparent India.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">For Citizens</p>
              <ul className="space-y-2 text-sm text-gray-400">
                {['File a Report', 'Track My Report', 'Crime Alerts', 'Community Forum', 'Meet Your Officer', 'Anonymous Tip'].map(link => (
                  <li key={link}><a href="#" className="hover:text-white transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">For Police</p>
              <ul className="space-y-2 text-sm text-gray-400">
                {['Constable Portal', 'SI Portal', 'SHO Portal', 'DSP Portal', 'Admin Access', 'Request Verification'].map(link => (
                  <li key={link}><a href="#" className="hover:text-white transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Support</p>
              <ul className="space-y-2 text-sm text-gray-400">
                {['How It Works', 'FAQs', 'Contact Us', 'Privacy Policy', 'Terms of Use', 'Data Deletion Request'].map(link => (
                  <li key={link}><a href="#" className="hover:text-white transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-[#1F2D42] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-600">© 2024 COPS Platform. Built for India 🇮🇳</p>
            <p className="text-xs text-gray-500">Emergency: 📞 100 | 📞 112 | 📞 1091</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
