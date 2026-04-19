'use client'

import { useState, useMemo } from 'react'
import { ArrowLeft, ArrowRight, AlertCircle, Leaf, Zap, Shield, MapPin, Activity, AlertTriangle } from 'lucide-react'
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

// Risk level based on location sensitivity
function getSensitivityLevel(assetProtections: Record<string, { inProtected: boolean; nearProtected: boolean; distance: number }>, assets: { id: string }[]) {
  let highCount = 0
  let mediumCount = 0
  let lowCount = 0

  assets.forEach((asset) => {
    const p = assetProtections[asset.id]
    if (!p || (!p.inProtected && !p.nearProtected && p.distance < 0)) {
      lowCount++
    } else if (p.inProtected) {
      highCount++
    } else if (p.nearProtected) {
      mediumCount++
    } else {
      lowCount++
    }
  })

  const total = assets.length
  if (highCount > 0) return { level: '高', color: '#d4736a', bg: 'bg-[#d4736a]/10', border: 'border-[#d4736a]/20', count: highCount }
  if (mediumCount > 0) return { level: '中', color: '#c9a962', bg: 'bg-[#c9a962]/10', border: 'border-[#c9a962]/20', count: mediumCount }
  return { level: '低', color: '#4a7c59', bg: 'bg-[#2d5a3d]/10', border: 'border-[#2d5a3d]/20', count: 0 }
}

export default function Evaluate() {
  const { sector, setSector, setStep, assets, assetProtections, setIndustryData } = useLeapStore()
  const [selectedSector, setSelectedSector] = useState(sector || '')

  const sectors = Object.keys(SECTOR_MAP)

  // Get asset sensitivity summary
  const sensitivity = useMemo(() => {
    return getSensitivityLevel(assetProtections, assets)
  }, [assetProtections, assets])

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
    setIndustryData({
      category: selectedSector,
      dependencies: aggregatedData.dependencies,
      impacts: aggregatedData.impacts,
    })
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
          基于资产位置与 ENCORE 数据库，分析自然资本依赖度与影响驱动因素
        </p>
      </div>

      {/* Asset Location Sensitivity Analysis - IBAT style */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-[#8a8a7e] uppercase tracking-wider mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          位置敏感性分析
        </h3>

        {/* Sensitivity Score */}
        <div className={`rounded-2xl border p-6 mb-4 ${sensitivity.bg} ${sensitivity.border}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${sensitivity.level === '高' ? 'bg-[#d4736a] text-white' : sensitivity.level === '中' ? 'bg-[#c9a962] text-white' : 'bg-[#4a7c59] text-white'}`}>
                {sensitivity.level === '高' ? <AlertTriangle className="w-6 h-6" /> : sensitivity.level === '中' ? <Shield className="w-6 h-6" /> : <MapPin className="w-6 h-6" />}
              </div>
              <div>
                <p className="text-sm text-[#8a8a7e]">资产位置风险等级</p>
                <p className="text-2xl font-bold" style={{ color: sensitivity.color }}>
                  {sensitivity.level}风险
                  {sensitivity.count > 0 && <span className="text-base font-normal text-[#8a8a7e] ml-2">（{sensitivity.count} 个资产涉及保护区）</span>}
                </p>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs text-[#8a8a7e]">保护区缓冲</p>
              <p className="text-sm font-medium text-[#1a1a18]">50km 半径</p>
            </div>
          </div>

          {/* Asset detail breakdown */}
          <div className="mt-4 grid sm:grid-cols-3 gap-2">
            {assets.slice(0, 6).map((asset) => {
              const p = assetProtections[asset.id]
              const status = p?.inProtected ? '高风险-保护区内' : p?.nearProtected ? `中风险-附近 ${p.distance}km` : '低风险'
              const statusColor = p?.inProtected ? 'text-[#d4736a]' : p?.nearProtected ? 'text-[#c9a962]' : 'text-[#4a7c59]'
              return (
                <div key={asset.id} className="flex items-center gap-2 p-2 bg-white/60 rounded-lg">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p?.inProtected ? 'bg-[#d4736a]' : p?.nearProtected ? 'bg-[#c9a962]' : 'bg-[#4a7c59]'}`} />
                  <span className="text-xs text-[#1a1a18] truncate flex-1">{asset.name}</span>
                  <span className={`text-xs font-medium ${statusColor}`}>{status}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Method note */}
        <p className="text-xs text-[#8a8a7e] flex items-center gap-1">
          <Shield className="w-3 h-3" />
          保护区数据来源: WDPA (World Database on Protected Areas) · 高风险 = 在保护区内 · 中风险 = 50km 内
        </p>
      </div>

      {/* Sector Selector */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-[#8a8a7e] uppercase tracking-wider mb-4">
          选择行业类别
        </h3>
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
        <div className="grid md:grid-cols-2 gap-6 mb-8 animate-fade-in-up">
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
                    <span className="text-sm">{dep}</span>
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
                    <span className="text-sm">{impact}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <p className="mt-2 text-xs text-[#8a8a7e] text-center">
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
