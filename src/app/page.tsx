'use client'

import { LeapNavigation, Locate, Evaluate, Assess, Prepare } from '@/components/leap'
import { useLeapStore } from '@/store/leap-store'

export default function Home() {
  const { currentStep } = useLeapStore()

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-[#2d5a3d]/5 via-[#4a7c59]/3 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-[#c9a962]/5 via-[#d4736a]/3 to-transparent rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[#faf8f5]" />
      </div>

      {/* Header */}
      <header className="relative py-6 px-8 border-b border-[#e5e0d8]">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Logo mark */}
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2d5a3d] to-[#4a7c59] flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-[#1a1a18]" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
                  TNFD LEAP
                </h1>
                <p className="text-xs text-[#8a8a7e] uppercase tracking-[0.2em]">
                  自然相关财务信息披露
                </p>
              </div>
            </div>

            {/* Status badge */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#2d5a3d]/5 border border-[#2d5a3d]/20">
              <span className="w-2 h-2 rounded-full bg-[#4a7c59] animate-pulse" />
              <span className="text-sm text-[#2d5a3d] font-medium">v1.0</span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <LeapNavigation />

      {/* Main Content */}
      <main className="flex-1 relative">
        <div className="animate-fade-in-up">
          {currentStep === 'locate' && <Locate />}
          {currentStep === 'evaluate' && <Evaluate />}
          {currentStep === 'assess' && <Assess />}
          {currentStep === 'prepare' && <Prepare />}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative py-6 px-8 border-t border-[#e5e0d8] bg-[#f0ebe4]/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p className="text-sm text-[#8a8a7e]">
            TNFD LEAP Framework · 开源工具 · 数据仅本地处理
          </p>
          <p className="text-xs text-[#8a8a7e]">
            基于 ENCORE 数据库 (2025年9月版)
          </p>
        </div>
      </footer>
    </div>
  )
}
