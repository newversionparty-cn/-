'use client'

import { MapPin, BarChart3, Brain, FileText, CheckCircle } from 'lucide-react'
import { useLeapStore, LeapStep } from '@/store/leap-store'

const steps: { id: LeapStep; label: string; sublabel: string; icon: React.ReactNode }[] = [
  { id: 'locate', label: 'L', sublabel: '定位', icon: <MapPin className="w-4 h-4" /> },
  { id: 'evaluate', label: 'E', sublabel: '评价', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'assess', label: 'A', sublabel: '评估', icon: <Brain className="w-4 h-4" /> },
  { id: 'prepare', label: 'P', sublabel: '准备', icon: <FileText className="w-4 h-4" /> },
]

const stepOrder: LeapStep[] = ['locate', 'evaluate', 'assess', 'prepare']

export default function LeapNavigation() {
  const { currentStep, setStep } = useLeapStore()

  const currentIndex = stepOrder.indexOf(currentStep)

  return (
    <nav className="relative py-5 px-8 border-b border-[#e5e0d8] bg-white/80 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between relative">
          {/* Progress line */}
          <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-[#e5e0d8] -translate-y-1/2" />

          {steps.map((step, index) => {
            const isActive = step.id === currentStep
            const isCompleted = index < currentIndex
            const isPast = index <= currentIndex

            return (
              <button
                key={step.id}
                onClick={() => setStep(step.id)}
                className={`
                  relative flex items-center gap-3 px-5 py-3 rounded-2xl transition-all duration-300 z-10
                  ${isActive ? 'bg-[#2d5a3d] text-white shadow-lg shadow-[#2d5a3d]/20 scale-105' : ''}
                  ${isPast && !isActive ? 'bg-[#4a7c59]/10 text-[#2d5a3d]' : ''}
                  ${!isPast ? 'bg-white text-[#8a8a7e] hover:bg-[#f0ebe4]' : ''}
                `}
              >
                {/* Step circle */}
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
                  ${isActive ? 'bg-white/20 text-white' : ''}
                  ${isPast && !isActive ? 'bg-[#2d5a3d] text-white' : ''}
                  ${!isPast ? 'bg-[#e5e0d8] text-[#8a8a7e]' : ''}
                `}>
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    step.label
                  )}
                </div>

                {/* Label */}
                <div className="text-left">
                  <p className={`text-xs uppercase tracking-wider ${isActive ? 'text-white/70' : 'text-[#8a8a7e]'}`}>
                    {step.sublabel}
                  </p>
                  <p className={`font-medium ${isActive ? 'text-white' : 'text-[#1a1a18]'}`}>
                    {step.label === 'L' ? '定位' : step.label === 'E' ? '评价' : step.label === 'A' ? '评估' : '准备'}
                  </p>
                </div>

                {/* Icon */}
                <div className={`${isActive ? 'text-white/70' : 'text-[#8a8a7e]'} ml-2`}>
                  {step.icon}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
