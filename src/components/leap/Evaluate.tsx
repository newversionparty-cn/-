'use client'

import { useState, useMemo } from 'react'
import { ArrowLeft, ArrowRight, AlertCircle, Leaf, Zap } from 'lucide-react'
import { useLeapStore } from '@/store/leap-store'
import encoreData from '@/data/encore_industry_data.json'

// Simplified sector mapping
const SECTOR_MAP: Record<string, string[]> = {
  '农林牧渔': [
    'Raising of cattle and buffaloes',
    'Raising of sheep and goats',
    'Growing of rice',
    'Growing of wheat',
    'Growing of vegetables and melons',
    'Silviculture and other forestry activities',
  ],
  '采矿业': [
    'Mining of coal and lignite',
    'Extraction of crude petroleum and natural gas',
    'Mining of iron ores',
    'Mining of non-ferrous metal ores',
    'Quarrying of stone',
  ],
  '制造业': [
    'Manufacture of food products',
    'Manufacture of beverages',
    'Manufacture of chemicals and chemical products',
    'Manufacture of pharmaceutical products',
    'Manufacture of textiles',
    'Manufacture of wearing apparel',
  ],
  '能源行业': [
    'Electric power generation',
    'Manufacture of gas',
    'Steam and air conditioning supply',
  ],
  '建筑业': [
    'Construction of buildings',
    'Civil engineering',
    'Specialised construction activities',
  ],
  '交通运输': [
    'Land transport',
    'Water transport',
    'Air transport',
    'Warehousing and support activities for transportation',
  ],
  '零售/服务业': [
    'Wholesale and retail trade and repair of motor vehicles',
    'Accommodation and food service activities',
    'Financial service activities',
    'Education',
    'Human health activities',
  ],
}

export default function Evaluate() {
  const { sector, setSector, setStep, assets } = useLeapStore()
  const [selectedSector, setSelectedSector] = useState(sector || '')

  const sectors = Object.keys(SECTOR_MAP)

  // Get ENCORE data for selected sector
  const encoreIndustries = useMemo(() => {
    if (!selectedSector) return []
    const industryNames = SECTOR_MAP[selectedSector] || []
    return industryNames
      .map((name) => encoreData.industries.find((ind) => ind.industry === name))
      .filter(Boolean)
  }, [selectedSector])

  // Aggregate dependencies and impacts
  const aggregatedData = useMemo(() => {
    if (encoreIndustries.length === 0) return { dependencies: [], impacts: [] }

    const depCount: Record<string, number> = {}
    const impactCount: Record<string, number> = {}

    encoreIndustries.forEach((ind) => {
      if (!ind) return
      ind.dependencies.forEach((dep) => {
        depCount[dep] = (depCount[dep] || 0) + 1
      })
      ind.impacts.forEach((impact) => {
        impactCount[impact] = (impactCount[impact] || 0) + 1
      })
    })

    const sortedDeps = Object.entries(depCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([dep]) => dep)

    const sortedImpacts = Object.entries(impactCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([impact]) => impact)

    return { dependencies: sortedDeps, impacts: sortedImpacts }
  }, [encoreIndustries])

  const handleContinue = () => {
    if (!selectedSector) return
    setSector(selectedSector)
    setStep('assess')
  }

  if (assets.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="p-6 bg-[#c9a962]/10 border border-[#c9a962]/20 rounded-2xl flex items-center gap-4 text-[#8a6a2a]">
          <AlertCircle className="w-6 h-6 flex-shrink-0" />
          <div>
            <p className="font-medium">请先完成&quot;定位 (L)&quot;步骤</p>
            <p className="text-sm opacity-80">上传资产清单后才能进行行业评价</p>
          </div>
        </div>
        <button
          onClick={() => setStep('locate')}
          className="mt-4 px-4 py-2 text-[#2d5a3d] hover:underline flex items-center gap-2"
        >
          ← 返回定位
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-8 h-8 rounded-full bg-[#2d5a3d] text-white text-sm font-semibold flex items-center justify-center">E</span>
          <h2 className="text-3xl font-semibold text-[#1a1a18]" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
            行业评价
          </h2>
        </div>
        <p className="text-[#5c5c52] pl-11">
          选择所属行业，基于 ENCORE 数据库分析自然资本依赖度与影响驱动因素
        </p>
      </div>

      {/* Sector Selector */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-[#5c5c52] mb-3">
          选择行业类别
        </label>
        <select
          value={selectedSector}
          onChange={(e) => setSelectedSector(e.target.value)}
          className="w-full px-5 py-4 bg-white border border-[#e5e0d8] rounded-xl focus:ring-2 focus:ring-[#4a7c59] focus:border-[#4a7c59] text-[#1a1a18] shadow-sm transition-all appearance-none cursor-pointer"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%235c5c52'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 1rem center',
            backgroundSize: '1.5rem',
          }}
        >
          <option value="">-- 请选择行业 --</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* ENCORE Analysis Cards */}
      {selectedSector && (
        <div className="grid md:grid-cols-2 gap-6 animate-fade-in-up">
          {/* Dependencies Card */}
          <div className="relative rounded-2xl p-6 bg-gradient-to-br from-[#2d5a3d]/5 to-[#4a7c59]/10 border border-[#2d5a3d]/10 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#2d5a3d]/5 rounded-full blur-2xl" />

            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#2d5a3d] text-white flex items-center justify-center">
                  <Leaf className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#2d5a3d]">自然资本依赖</h3>
                  <p className="text-xs text-[#8a8a7e]">Dependencies</p>
                </div>
              </div>

              <ul className="space-y-3">
                {aggregatedData.dependencies.map((dep, i) => (
                  <li key={i} className="flex items-start gap-3 text-[#5c5c52]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4a7c59] mt-2 flex-shrink-0" />
                    <span>{dep}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Impacts Card */}
          <div className="relative rounded-2xl p-6 bg-gradient-to-br from-[#c9a962]/5 to-[#d4736a]/10 border border-[#c9a962]/10 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#c9a962]/5 rounded-full blur-2xl" />

            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#c9a962] text-white flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#8a6a2a]">影响驱动因素</h3>
                  <p className="text-xs text-[#8a8a7e]">Impact Drivers</p>
                </div>
              </div>

              <ul className="space-y-3">
                {aggregatedData.impacts.map((impact, i) => (
                  <li key={i} className="flex items-start gap-3 text-[#5c5c52]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#c9a962] mt-2 flex-shrink-0" />
                    <span>{impact}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-[#8a8a7e] text-center">
        数据来源: ENCORE (ENCORE_DataFiles_Oct-2025) · encoreforcapital.org
      </p>

      {/* Navigation */}
      <div className="mt-8 flex justify-between items-center">
        <button
          onClick={() => setStep('locate')}
          className="px-5 py-3 text-[#5c5c52] hover:text-[#1a1a18] flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回定位
        </button>
        <button
          onClick={handleContinue}
          disabled={!selectedSector}
          className="group px-8 py-4 bg-[#2d5a3d] text-white rounded-xl hover:bg-[#4a7c59] disabled:bg-[#e5e0d8] disabled:cursor-not-allowed transition-all font-medium flex items-center gap-3 shadow-lg shadow-[#2d5a3d]/20 hover:shadow-xl hover:shadow-[#2d5a3d]/30 hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:hover:shadow-none"
        >
          下一步: 评估
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  )
}
