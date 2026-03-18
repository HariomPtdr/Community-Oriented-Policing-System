'use client'

import { useState } from 'react'
import { 
  HelpCircle, MessageCircle, Phone, FileText, 
  Search, ChevronDown, ChevronRight, ExternalLink,
  Shield, AlertTriangle, Book, MessageSquare,
  LifeBuoy, Mail, Headset, ArrowRight
} from 'lucide-react'

const FAQS = [
  {
    question: "How do I track my filed report?",
    answer: "You can track your report in real-time through the 'My Reports' section. Each report has a status timeline showing its current stage—from submission to resolution.",
    category: "Reports"
  },
  {
    question: "Is my anonymous report truly private?",
    answer: "Yes. When you select 'File Anonymously', your identity is encrypted and hidden from everyone except authorized senior oversight officers who ensure the credibility of the report.",
    category: "Privacy"
  },
  {
    question: "What is an SOS alert?",
    answer: "The SOS alert is for immediate emergencies. Activating it sends your location to the nearest patrol unit and your emergency contacts instantly.",
    category: "Emergency"
  },
  {
    question: "How do I add evidence to an existing report?",
    answer: "Currently, evidence must be uploaded during the initial filing. If you have additional information, you can use the 'Clarification' section if an officer requests it, or contact your assigned officer directly.",
    category: "Reports"
  },
  {
    question: "Who can see my forum posts?",
    answer: "By default, forum posts are visible to residents in your verified neighborhood and local officers. You can adjust these visibility settings in your Privacy Controls.",
    category: "Profile"
  },
]

const CATEGORIES = [
  { id: 'reports', label: 'Reports', icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { id: 'privacy', label: 'Privacy', icon: Shield, color: 'text-green-400', bg: 'bg-green-500/10' },
  { id: 'emergency', label: 'Emergency', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
  { id: 'account', label: 'Account', icon: HelpCircle, color: 'text-orange-400', bg: 'bg-orange-500/10' },
]

export default function HelpSupportPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [activeCategory, setActiveCategory] = useState('all')

  const filteredFaqs = FAQS.filter(faq => 
    (activeCategory === 'all' || faq.category.toLowerCase() === activeCategory) &&
    (faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
     faq.answer.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="max-w-5xl mx-auto pb-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-[#111827] border border-[#1F2D42] p-8 md:p-12 mb-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[100px] -mr-32 -mt-32 rounded-full" />
        <div className="relative z-10 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 mb-6">
            <LifeBuoy className="w-8 h-8 text-orange-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">How can we help you?</h1>
          <p className="text-gray-400 mb-8">Search our knowledge base or contact our support team for immediate assistance.</p>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input 
              type="text"
              placeholder="Search for articles, help, or troubleshooting..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-gray-600 outline-none focus:border-orange-500/50 transition-all shadow-2xl"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar / Categories */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Contact Channels</h3>
            <div className="space-y-3">
              <a href="#" className="flex items-center gap-4 p-4 bg-[#1A2235] border border-[#1F2D42] rounded-xl hover:border-orange-500/30 transition-all group">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400">
                  <Headset className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white group-hover:text-orange-400 transition-colors">Live Chat</p>
                  <p className="text-[10px] text-gray-500">Available 24/7</p>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto text-gray-600 group-hover:text-orange-400" />
              </a>
              <a href="mailto:support@cops.gov.in" className="flex items-center gap-4 p-4 bg-[#1A2235] border border-[#1F2D42] rounded-xl hover:border-blue-500/30 transition-all group">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">Email Support</p>
                  <p className="text-[10px] text-gray-500">Response in 2h</p>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto text-gray-600 group-hover:text-blue-400" />
              </a>
              <a href="tel:112" className="flex items-center gap-4 p-4 bg-red-500/5 border border-red-500/20 rounded-xl hover:bg-red-500/10 transition-all group">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-400">Emergency 112</p>
                  <p className="text-[10px] text-red-500/60">Immediate Police Assistance</p>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto text-red-500/40 group-hover:text-red-500" />
              </a>
            </div>
          </div>

          <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Resources</h3>
            <div className="space-y-1">
              {[
                { label: 'Citizen Manual', icon: Book },
                { label: 'Privacy Policy', icon: Shield },
                { label: 'Terms of Service', icon: FileText },
                { label: 'Legal FAQ', icon: HelpCircle },
              ].map((item, i) => (
                <button key={i} className="w-full flex items-center justify-between p-3 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/[0.03] transition-all">
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </div>
                  <ExternalLink className="w-3 h-3 text-gray-600" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main FAQ Section */}
        <div className="lg:col-span-2 space-y-8">
          {/* Categories */}
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => setActiveCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${activeCategory === 'all' ? 'bg-orange-500 text-black' : 'bg-[#111827] border border-[#1F2D42] text-gray-400 hover:text-white'}`}
            >
              All Topics
            </button>
            {CATEGORIES.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeCategory === cat.id 
                    ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20' 
                    : 'bg-[#111827] border border-[#1F2D42] text-gray-400 hover:text-white'
                }`}
              >
                <cat.icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            ))}
          </div>

          {/* FAQ List */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Frequently Asked Questions</h2>
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-12 bg-[#111827] border border-[#1F2D42] rounded-2xl">
                <Search className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No results found for "{searchQuery}"</p>
                <p className="text-xs text-gray-600 mt-1">Try different keywords or check are categories.</p>
              </div>
            ) : (
              filteredFaqs.map((faq, i) => (
                <div key={i} className="bg-[#111827] border border-[#1F2D42] rounded-2xl overflow-hidden transition-all duration-300">
                  <button 
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left"
                  >
                    <span className="text-sm md:text-base font-semibold text-white">{faq.question}</span>
                    <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${openFaq === i ? 'rotate-180 text-orange-400' : ''}`} />
                  </button>
                  <div className={`transition-all duration-300 ease-in-out ${openFaq === i ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                    <div className="px-5 pb-5 pt-0">
                      <div className="h-px bg-[#1F2D42] mb-4" />
                      <p className="text-sm text-gray-400 leading-relaxed">{faq.answer}</p>
                      <div className="mt-4 flex items-center gap-4">
                        <span className="text-[10px] text-gray-500">Was this helpful?</span>
                        <div className="flex gap-2">
                          <button className="px-3 py-1 rounded-md bg-green-500/10 text-green-400 text-[10px] font-bold hover:bg-green-500/20 transition-colors">YES</button>
                          <button className="px-3 py-1 rounded-md bg-red-500/10 text-red-400 text-[10px] font-bold hover:bg-red-500/20 transition-colors">NO</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Submit a Case Card */}
          <div className="bg-gradient-to-br from-[#1E293B] to-[#111827] border border-[#334155]/50 rounded-3xl p-8 relative overflow-hidden">
             <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500/10 blur-[80px] rounded-full" />
             <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left">
                  <h3 className="text-xl font-bold text-white mb-2">Still can't find what you're looking for?</h3>
                  <p className="text-sm text-gray-400">Our dedicated support officers are here to help with your specific case.</p>
                </div>
                <button className="bg-orange-500 hover:bg-orange-400 text-black font-bold px-8 py-3 rounded-xl transition-all shadow-xl shadow-orange-500/20 whitespace-nowrap">
                  Contact Support
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
