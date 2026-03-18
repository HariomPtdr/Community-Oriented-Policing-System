import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'COPS Platform — Community Oriented Policing System | File Reports Online',
  description: 'File police incident reports, track case status, receive crime alerts, and connect with your beat officer. Free platform for Indian citizens and police.',
  keywords: ['police report online', 'FIR online India', 'community policing', 'crime alert', 'beat officer'],
  authors: [{ name: 'COPS Platform' }],
  openGraph: {
    title: 'COPS Platform — Safer Communities, Together',
    description: 'Connect with your beat officer. File reports. Get crime alerts. Free for all Indian citizens.',
    type: 'website',
    locale: 'en_IN',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }}>
      <body className="font-body antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#18181b',
              color: '#fff',
              border: '1px solid #27272a',
            },
            success: { iconTheme: { primary: '#f59e0b', secondary: '#000' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  )
}
