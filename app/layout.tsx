import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import { ToastContainer } from '@/components/shared/Toast'
import { PriceUpdater } from '@/components/providers/PriceUpdater'

export const metadata: Metadata = {
  title: 'BiasCoach - Trading Psychology Platform',
  description: 'Analyze paper trading patterns to detect cognitive biases and build disciplined trading habits.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-background-primary min-h-screen">
        {/* Sidebar for desktop */}
        <Navbar />
        
        {/* Toast notifications */}
        <ToastContainer />
        
        {/* Background price updates (waits 3s, then updates every 30s) */}
        <PriceUpdater />
        
        {/* Main Content - adjusts for sidebar on desktop */}
        <main className="lg:pl-72 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}
