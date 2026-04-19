'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, ArrowRight, AlertCircle, Leaf, Zap, Shield, MapPin, Activity, Loader2, ExternalLink, AlertTriangle } from 'lucide-react'
import { useLeapStore } from '@/store/leap-store'

// ENCORE sector groups (Chinese categories mapped to ISIC codes)
const SECTOR_GROUPS: Record<string, { name: string; isic: string; category: string }[]> = {
  '农林牧渔': [
    { name: 'Raising of cattle and buffaloes', isic: 'A_1_14_141', category: 'Agriculture' },
    { name: 'Raising of sheep and goats', isic: 'A_1_14_142', category: 'Agriculture' },
    { name: 'Growing of rice', isic: 'A_1_14_143', category: 'Agriculture' },
    { name: 'Growing of wheat', isic: 'A_1_14_144', category: 'Agriculture' },
    { name: 'Growing of vegetables and melons', isic: 'A_1_14_145', category: 'Agriculture' },
    { name: 'Silviculture and other forestry activities', isic: 'A_1_16_160', category: 'Agriculture' },
  ],
  '采矿业': [
    { name: 'Mining of coal and lignite', isic: 'B_1_10_101', category: 'Mining' },
    { name: 'Extraction of crude petroleum and natural gas', isic: 'B_1_11_111', category: 'Mining' },
    { name: 'Mining of iron ores', isic: 'B_1_13_131', category: 'Mining' },
    { name: 'Mining of non-ferrous metal ores', isic: 'B_1_13_132', category: 'Mining' },
    { name: 'Quarrying of stone', isic: 'B_1_14_141', category: 'Mining' },
  ],
  '制造业': [
    { name: 'Manufacture of food products', isic: 'C_1_10_103', category: 'Manufacturing' },
    { name: 'Manufacture of beverages', isic: 'C_1_11_110', category: 'Manufacturing' },
    { name: 'Manufacture of chemicals and chemical products', isic: 'C_1_20_200', category: 'Manufacturing' },
    { name: 'Manufacture of pharmaceutical products', isic: 'C_1_21_210', category: 'Manufacturing' },
    { name: 'Manufacture of textiles', isic: 'C_1_13_130', category: 'Manufacturing' },
    { name: 'Manufacture of wearing apparel', isic: 'C_1_14_141', category: 'Manufacturing' },
  ],
  '能源行业': [
    { name: 'Electric power generation', isic: 'D_1_35_351', category: 'Energy' },
    { name: 'Manufacture of gas', isic: 'D_1_35_352', category: 'Energy' },
    { name: 'Steam and air conditioning supply', isic: 'D_1_35_353', category: 'Energy' },
  ],
  '建筑业': [
    { name: 'Construction of buildings', isic: 'F_1_41_410', category: 'Construction' },
    { name: 'Civil engineering', isic: 'F_1_42_421', category: 'Construction' },
    { name: 'Specialised construction activities', isic: 'F_1_43_431', category: 'Construction' },
  ],
  '交通运输': [
    { name: 'Land transport', isic: 'H_1_49_491', category: 'Transportation' },
    { name: 'Water transport', isic: 'H_1_50_501', category: 'Transportation' },
    { name: 'Air transport', isic: 'H_1_51_510', category: 'Transportation' },
    { name: 'Warehousing and support activities for transportation', isic: 'H_1_52_521', category: 'Transportation' },
  ],
  '零售/服务业': [
    { name: 'Wholesale and retail trade and repair of motor vehicles', isic: 'G_1_45_451', category: 'Retail' },
    { name: 'Accommodation and food service activities', isic: 'I_1_55_551', category: 'Retail' },
    { name: 'Financial service activities', isic: 'K_1_64_641', category: 'Retail' },
    { name: 'Education', isic: 'P_1_85_851', category: 'Retail' },
    { name: 'Human health activities', isic: 'Q_1_86_861', category: 'Retail' },
  ],
}

interface EncoreProfile {
  dependencies: { service: string; serviceCn: string; level: string; raw: string }[]
  impacts: { driver: string; driverCn: string; level: string; raw: string }[]
  summary: {
    totalDependencies: number
    totalImpacts: number
    highDepCount: number
    mediumDepCount: number
    highImpactCount: number
    mediumImpactCount: number
    dependencyScore: number
    impactScore: number
    overallRiskLevel: 'high' | 'medium' | 'low'
  }
}

function RiskBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  const configs = {
    high: { bg: 'bg-[#d4736a]', text: 'text-white', label: '高' },
    medium: { bg: 'bg-[#c9a962]', text: 'text-white', label: '中' },
    low: { bg: 'bg-[#4a7c59]', text: 'text-white', label: '低' },
  }
  const c = configs[level]
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>{c.label}</span>
}

export default function Evaluate() {
  const { sector, setSector, setStep, assets, assetProtections, setIndustryData } = useLeapStore()
  const [selectedGroup, setSelectedGroup] = useState<keyof typeof SECTOR_GROUPS | ''>(sector ? Object.keys(SECTOR_GROUPS).find(g => SECTOR_GROUPS[g].some(s => s.name === sector || s.isic === sector)) || '' : '')
  const [selectedISIC, setSelectedISIC] = useState('')
  const [profile, setProfile] = useState<EncoreProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Get asset sensitivity
  const highRiskAssets = assets.filter(a => assetProtections[a.id]?.inProtected)
  const mediumRiskAssets = assets.filter(a => assetProtections[a.id]?.nearProtected)
  const overallLocationRisk: 'high' | 'medium' | 'low' =
    highRiskAssets.length > 0 ? 'high' :
    mediumRiskAssets.length > 0 ? 'medium' : 'low'

  // Fetch ENCORE profile when ISIC is selected
  useEffect(() => {
    if (!selectedISIC) return
    setIsLoading(true)
    setError('')
    setProfile(null)

    fetch(`/api/encore/profile/${encodeURIComponent(selectedISIC)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setProfile(data)
        setIsLoading(false)
      })
      .catch(() => {
        setError('加载 ENCORE 数据失败')
        setIsLoading(false)
      })
  }, [selectedISIC])

  const handleContinue = () => {
    if (!selectedISIC || !profile) return
    setSector(selectedISIC)
    setIndustryData({
      category: selectedGroup,
      dependencies: profile.dependencies.map(d => d.serviceCn),
      impacts: profile.impacts.map(i => i.driverCn),
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
        <button onClick={() => setStep('locate')} className="mt-4 px-4 py-2 text-[#2d5a3d] hover:underline flex items-center gap-2">
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
          基于 ENCORE 方法论，识别行业工艺环节的自然资本依赖与影响驱动因素
        </p>
      </div>

      {/* Location Risk Summary */}
      <div className="mb-8 p-4 bg-white rounded-2xl border border-[#e5e0d8] shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-[#4a7c59]" />
          <h3 className="text-sm font-semibold text-[#8a8a7e] uppercase tracking-wider">资产位置风险</h3>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <RiskBadge level={overallLocationRisk} />
            <span className="text-sm text-[#5c5c52]">
              {highRiskAssets.length > 0 ? `${highRiskAssets.length} 个资产在保护区内` :
               mediumRiskAssets.length > 0 ? `${mediumRiskAssets.length} 个资产在保护区 50km 缓冲区内` :
               '资产均不在生态敏感区域'}
            </span>
          </div>
          <a
            href="https://www.protectedplanet.net/"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-xs text-[#4a7c59] hover:underline flex items-center gap-1"
          >
            <Shield className="w-3 h-3" />
            WDPA 数据
          </a>
        </div>
      </div>

      {/* Step 1: Select Industry Category */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-[#8a8a7e] uppercase tracking-wider mb-3">
          第一步：选择行业大类
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.keys(SECTOR_GROUPS).map((group) => (
            <button
              key={group}
              onClick={() => { setSelectedGroup(group); setSelectedISIC(''); setProfile(null) }}
              className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                selectedGroup === group
                  ? 'bg-[#2d5a3d] text-white border-[#2d5a3d] shadow-sm'
                  : 'bg-white text-[#5c5c52] border-[#e5e0d8] hover:border-[#4a7c59]'
              }`}
            >
              {group}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Select Specific Industry Process */}
      {selectedGroup && (
        <div className="mb-6 animate-fade-in-up">
          <h3 className="text-sm font-semibold text-[#8a8a7e] uppercase tracking-wider mb-3">
            第二步：选择具体工艺环节（基于 ENCORE ISIC 分类）
          </h3>
          <select
            value={selectedISIC}
            onChange={(e) => setSelectedISIC(e.target.value)}
            className="w-full px-5 py-4 bg-white border border-[#e5e0d8] rounded-xl focus:ring-2 focus:ring-[#4a7c59] focus:border-[#4a7c59] text-[#1a1a18] shadow-sm transition-all appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%235c5c52'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 1rem center',
              backgroundSize: '1.5rem',
            }}
          >
            <option value="">-- 选择工艺环节 --</option>
            {SECTOR_GROUPS[selectedGroup].map((s) => (
              <option key={s.isic} value={s.isic}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#4a7c59] animate-spin" />
          <span className="ml-3 text-[#8a8a7e]">正在从 ENCORE 数据库加载...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-[#d4736a]/10 border border-[#d4736a]/20 rounded-xl flex items-center gap-3 text-[#d4736a] mb-6">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ENCORE Analysis Results */}
      {profile && !isLoading && (
        <div className="animate-fade-in-up">
          {/* Risk Summary Bar */}
          <div className={`rounded-2xl border p-5 mb-6 ${overallLocationRisk === 'high' ? 'bg-[#d4736a]/5 border-[#d4736a]/20' : overallLocationRisk === 'medium' ? 'bg-[#c9a962]/5 border-[#c9a962]/20' : 'bg-[#2d5a3d]/5 border-[#2d5a3d]/20'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${profile.summary.overallRiskLevel === 'high' ? 'bg-[#d4736a] text-white' : profile.summary.overallRiskLevel === 'medium' ? 'bg-[#c9a962] text-white' : 'bg-[#4a7c59] text-white'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#8a8a7e] uppercase tracking-wider">ENCoRE 行业风险评级</p>
                <p className="font-semibold text-[#1a1a18]">
                  {profile.summary.overallRiskLevel === 'high' ? '高风险行业' :
                   profile.summary.overallRiskLevel === 'medium' ? '中风险行业' : '低风险行业'}
                  <span className="text-sm font-normal text-[#8a8a7e] ml-2">
                    依赖度评分 {profile.summary.dependencyScore} · 影响度评分 {profile.summary.impactScore}
                  </span>
                </p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-xs text-[#8a8a7e]">{assets.length} 个资产</p>
                <p className="text-sm font-medium text-[#1a1a18]">
                  {profile.dependencies.filter(d => d.level === 'high').length + profile.dependencies.filter(d => d.level === 'medium').length} 项高依赖
                </p>
              </div>
            </div>
          </div>

          {/* Dependencies and Impacts Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Dependencies */}
            <div className="rounded-2xl border border-[#e5e0d8] overflow-hidden">
              <div className="px-5 py-4 bg-[#f0ebe4]/50 border-b border-[#e5e0d8] flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#2d5a3d] text-white flex items-center justify-center">
                  <Leaf className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-[#1a1a18]">自然资本依赖</p>
                  <p className="text-xs text-[#8a8a7e]">Dependencies · {profile.dependencies.length} 项</p>
                </div>
              </div>
              <div className="p-4 max-h-72 overflow-y-auto">
                {profile.dependencies.length === 0 ? (
                  <p className="text-sm text-[#8a8a7e] text-center py-4">无数据</p>
                ) : (
                  <div className="space-y-2">
                    {profile.dependencies.map((dep, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#faf8f5]">
                        <RiskBadge level={dep.level as 'high' | 'medium' | 'low'} />
                        <span className="text-sm text-[#1a1a18] flex-1">{dep.serviceCn}</span>
                        <span className="text-xs text-[#8a8a7e] font-mono">{dep.service.length > 20 ? dep.service.slice(0, 20) + '...' : dep.service}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Impacts */}
            <div className="rounded-2xl border border-[#e5e0d8] overflow-hidden">
              <div className="px-5 py-4 bg-[#f0ebe4]/50 border-b border-[#e5e0d8] flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#c9a962] text-white flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-[#1a1a18]">影响驱动因素</p>
                  <p className="text-xs text-[#8a8a7e]">Impact Drivers · {profile.impacts.length} 项</p>
                </div>
              </div>
              <div className="p-4 max-h-72 overflow-y-auto">
                {profile.impacts.length === 0 ? (
                  <p className="text-sm text-[#8a8a7e] text-center py-4">无数据</p>
                ) : (
                  <div className="space-y-2">
                    {profile.impacts.map((imp, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#faf8f5]">
                        <RiskBadge level={imp.level as 'high' | 'medium' | 'low'} />
                        <span className="text-sm text-[#1a1a18] flex-1">{imp.driverCn}</span>
                        <span className="text-xs text-[#8a8a7e] font-mono">{imp.driver.length > 20 ? imp.driver.slice(0, 20) + '...' : imp.driver}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ENCORE Attribution */}
          <p className="text-xs text-[#8a8a7e] text-center flex items-center justify-center gap-2">
            <Shield className="w-3 h-3" />
            数据来源: ENCORE Database (September 2025) · encoreforcapital.org
            <ExternalLink className="w-3 h-3" />
          </p>
        </div>
      )}

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
          disabled={!profile || !selectedISIC}
          className="group px-8 py-4 bg-[#2d5a3d] text-white rounded-xl hover:bg-[#4a7c59] disabled:bg-[#e5e0d8] disabled:cursor-not-allowed transition-all font-medium flex items-center gap-3 shadow-lg shadow-[#2d5a3d]/20 hover:shadow-xl hover:shadow-[#2d5a3d]/30 hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:hover:shadow-none"
        >
          下一步: 评估
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  )
}
