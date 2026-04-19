'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, ArrowRight, AlertCircle, Shield, MapPin, Loader2, ExternalLink, AlertTriangle, ChevronDown, ChevronRight, Search, Layers, Globe, Info, X, Leaf, Zap } from 'lucide-react'
import { useLeapStore } from '@/store/leap-store'

// ENCORE layer metadata types
interface LayerMeta {
  cn: string
  description: string
  category: string
  subcategory: string
  unit: string
  source: string
  sourceUrl: string
  colorScale: string
}

// Rating badge
function RatingBadge({ rating, level }: { rating: string; level: string }) {
  if (level === 'none') return null
  const configs: Record<string, { bg: string; text: string }> = {
    high: { bg: 'bg-[#1a5f7a]', text: 'text-white' },
    medium: { bg: 'bg-[#57837b]', text: 'text-white' },
    low: { bg: 'bg-[#c3e0c5]', text: 'text-[#2d5a3d]' },
  }
  const c = configs[level] || configs.low
  const labels: Record<string, string> = { VH: '极高', H: '高', M: '中', L: '低', VL: '极低', 'N/A': '不适用' }
  return <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold ${c.bg} ${c.text}`}>{labels[rating] || rating}</span>
}

// Color scale legend bar
function ColorScale({ scale }: { scale: string }) {
  // Blue gradient (ENCORE standard)
  const colors: Record<string, string> = {
    Blues: '#f0f9ff → #0c4a6e',
    Greens: '#f0fdf4 → #166534',
    YlGn: '#fefce8 → #4d7c0f',
    YlOrBr: '#fefce8 → #9a3412',
    Oranges: '#fff7ed → #9a3412',
    Reds: '#fef2f2 → #991b1b',
    Purples: '#faf5ff → #6b21a8',
    RdYlGn: '#dc2626 → #16a34a',
    Greys: '#f9f9f9 → #374151',
    Blues2: '#eff6ff → #1e40af',
  }
  const gradient = colors[scale] || colors.Blues

  return (
    <div className="flex items-center gap-1.5 mt-1">
      <span className="text-xs text-[#8a8a7e]">低</span>
      <div
        className="flex-1 h-1.5 rounded-full"
        style={{ background: `linear-gradient(to right, ${gradient.replace(' → ', ', ')})` }}
      />
      <span className="text-xs text-[#8a8a7e]">高</span>
    </div>
  )
}

// ENCORE-style layer row
function LayerRow({
  meta,
  rating,
  ratingCn,
  level,
}: {
  meta: LayerMeta
  rating: string
  ratingCn: string
  level: 'high' | 'medium' | 'low' | 'none'
}) {
  if (level === 'none') return null

  return (
    <div className="py-3 px-3 border-b border-[#f0ebe4] last:border-0 hover:bg-[#faf8f5] transition-colors">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#1a1a18] leading-snug">{meta.cn}</p>
          <p className="text-xs text-[#8a8a7e] mt-0.5 line-clamp-2 leading-relaxed">{meta.description}</p>
        </div>
        <RatingBadge rating={rating} level={level} />
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between mt-2 gap-2">
        <div className="flex items-center gap-2">
          <ColorScale scale={meta.colorScale} />
        </div>
        <div className="flex items-center gap-1.5">
          <a
            href={meta.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#4a7c59] hover:underline flex items-center gap-0.5"
            onClick={e => e.stopPropagation()}
          >
            {meta.source}
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    </div>
  )
}

// Collapsible category section (ENCORE style)
function LayerCategory({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border border-[#e5e0d8] rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-[#faf8f5] hover:bg-[#f0ebe4] transition-colors text-left"
      >
        <div className="w-7 h-7 rounded-md bg-[#1a5f7a] text-white flex items-center justify-center flex-shrink-0">
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="flex-1 font-semibold text-[#1a1a18] text-sm">{title}</span>
        {isOpen ? <ChevronDown className="w-4 h-4 text-[#8a8a7e]" /> : <ChevronRight className="w-4 h-4 text-[#8a8a7e]" />}
      </button>
      {isOpen && (
        <div className="bg-white divide-y divide-[#f0ebe4]">
          {children}
        </div>
      )}
    </div>
  )
}

interface Sector {
  isic: string
  name: string
  section: string
  category: string
}

interface ProfileService {
  service: string
  serviceCn: string
  rating: string
  ratingCn: string
  level: 'high' | 'medium' | 'low' | 'none'
  description?: string
  category?: string
  subcategory?: string
  unit?: string
  source?: string
  sourceUrl?: string
  colorScale?: string
}

interface ProfileImpact {
  driver: string
  driverCn: string
  rating: string
  ratingCn: string
  level: 'high' | 'medium' | 'low' | 'none'
  description?: string
  category?: string
  subcategory?: string
  unit?: string
  source?: string
  sourceUrl?: string
  colorScale?: string
}

interface EncoreProfile {
  dependencies: ProfileService[]
  impacts: ProfileImpact[]
  summary: {
    totalDependencies: number
    totalImpacts: number
    highDepCount: number
    mediumDepCount: number
    lowDepCount: number
    highImpactCount: number
    mediumImpactCount: number
    lowImpactCount: number
    dependencyScore: number
    impactScore: number
    overallRiskLevel: 'high' | 'medium' | 'low'
  }
  isicInfo: {
    code: string
    name: string
    section: string
    category: string
  }
}

export default function Evaluate() {
  const { sector, setSector, setStep, assets, assetProtections, setIndustryData } = useLeapStore()
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedISIC, setSelectedISIC] = useState('')
  const [profile, setProfile] = useState<EncoreProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [sectors, setSectors] = useState<Sector[]>([])
  const [grouped, setGrouped] = useState<Record<string, Sector[]>>({})
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch sectors
  useEffect(() => {
    fetch('/api/encore/sectors')
      .then(r => r.json())
      .then(data => {
        if (data.sectors) setSectors(data.sectors)
        if (data.grouped) setGrouped(data.grouped)
      })
      .catch(console.error)
  }, [])

  const highRiskAssets = assets.filter(a => assetProtections[a.id]?.inProtected)
  const mediumRiskAssets = assets.filter(a => assetProtections[a.id]?.nearProtected)

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
      category: profile.isicInfo.category,
      dependencies: profile.dependencies.map(d => d.serviceCn),
      impacts: profile.impacts.map(i => i.driverCn),
    })
    setStep('assess')
  }

  if (assets.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="p-6 bg-[#c9a962]/10 border border-[#c9a962]/20 rounded-2xl flex items-center gap-4 text-[#8a6a2a]">
          <AlertCircle className="w-6 h-6 flex-shrink-0" />
          <div>
            <p className="font-medium">请先完成"定位 (L)"步骤</p>
            <p className="text-sm opacity-80">上传资产清单后才能进行行业评价</p>
          </div>
        </div>
        <button onClick={() => setStep('locate')} className="mt-4 px-4 py-2 text-[#2d5a3d] hover:underline flex items-center gap-2">
          ← 返回定位
        </button>
      </div>
    )
  }

  const categories = Object.keys(grouped).filter(c => grouped[c].length > 0)

  // Filter services by search
  const filteredDeps = profile?.dependencies.filter(d =>
    !searchQuery || d.serviceCn.includes(searchQuery) || d.service.includes(searchQuery) || d.description?.includes(searchQuery)
  ) || []
  const filteredImps = profile?.impacts.filter(i =>
    !searchQuery || i.driverCn.includes(searchQuery) || i.driver.includes(searchQuery) || i.description?.includes(searchQuery)
  ) || []

  // Separate by subcategory
  const depSubcats: Record<string, ProfileService[]> = {}
  for (const d of filteredDeps) {
    const sub = d.subcategory || '其他'
    if (!depSubcats[sub]) depSubcats[sub] = []
    depSubcats[sub].push(d)
  }

  const impSubcats: Record<string, ProfileImpact[]> = {}
  for (const i of filteredImps) {
    const sub = i.subcategory || '其他'
    if (!impSubcats[sub]) impSubcats[sub] = []
    impSubcats[sub].push(i)
  }

  const riskColors = {
    high: '#d4736a',
    medium: '#c9a962',
    low: '#4a7c59',
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-8 h-8 rounded-full bg-[#1a5f7a] text-white text-sm font-semibold flex items-center justify-center">E</span>
          <h2 className="text-3xl font-semibold text-[#1a1a18]" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
            行业评价
          </h2>
        </div>
        <p className="text-[#5c5c52] pl-11">
          基于 ENCORE 自然资本依赖与影响数据库 · 选择行业查看详细生态系统服务分析
        </p>
      </div>

      {/* Two column ENCORE layout */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left sidebar: ENCORE Layer Panel */}
        <div className="lg:col-span-5 space-y-4">
          {/* Industry Selector */}
          <div className="bg-white rounded-2xl border border-[#e5e0d8] overflow-hidden">
            <div className="px-4 py-3 bg-[#1a5f7a] flex items-center gap-2">
              <Globe className="w-4 h-4 text-white" />
              <h3 className="text-sm font-semibold text-white">ENCORE ISIC 行业分类</h3>
            </div>
            <div className="p-4">
              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a8a7e]" />
                <input
                  type="text"
                  placeholder="搜索行业..."
                  className="w-full pl-9 pr-8 py-2.5 bg-[#faf8f5] border border-[#e5e0d8] rounded-lg text-sm focus:ring-2 focus:ring-[#1a5f7a] focus:border-[#1a5f7a] outline-none"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-3.5 h-3.5 text-[#8a8a7e] hover:text-[#1a1a18]" />
                  </button>
                )}
              </div>

              {/* Category tabs */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setSelectedCategory(cat); setSelectedISIC('') }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      selectedCategory === cat
                        ? 'bg-[#1a5f7a] text-white border-[#1a5f7a]'
                        : 'bg-white text-[#5c5c52] border-[#e5e0d8] hover:border-[#1a5f7a]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* ISIC dropdown */}
              {selectedCategory && grouped[selectedCategory] && (
                <select
                  value={selectedISIC}
                  onChange={e => setSelectedISIC(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#faf8f5] border border-[#e5e0d8] rounded-lg text-sm focus:ring-2 focus:ring-[#1a5f7a] outline-none cursor-pointer"
                >
                  <option value="">— 选择工艺环节 —</option>
                  {grouped[selectedCategory]
                    .filter(s => !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(s => (
                      <option key={s.isic} value={s.isic}>{s.name}</option>
                    ))
                  }
                </select>
              )}

              {/* Asset info */}
              {assets.length > 0 && (
                <div className="mt-3 p-2.5 bg-[#faf8f5] rounded-lg border border-[#e5e0d8]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8a8a7e]">{assets.length} 个资产</span>
                    <div className="flex items-center gap-2">
                      {highRiskAssets.length > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[#d4736a]"></span>
                          <span className="text-[#d4736a]">{highRiskAssets.length} 保护区</span>
                        </span>
                      )}
                      {mediumRiskAssets.length > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[#c9a962]"></span>
                          <span className="text-[#c9a962]">{mediumRiskAssets.length} 缓冲</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ENCORE Layer Browser - Dependencies */}
          {profile && !isLoading && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Layers className="w-4 h-4 text-[#1a5f7a]" />
                <h3 className="text-sm font-semibold text-[#8a8a7e] uppercase tracking-wider">自然资本依赖</h3>
                <span className="text-xs text-[#b5b5a8] ml-auto">{profile.dependencies.length} 项服务</span>
              </div>

              {Object.entries(depSubcats).map(([subcat, services]) => (
                <LayerCategory key={subcat} title={subcat} icon={Leaf}>
                  {services.map((svc, i) => (
                    <LayerRow
                      key={i}
                      meta={{
                        cn: svc.serviceCn,
                        description: svc.description || svc.service,
                        category: svc.category || '生态系统服务',
                        subcategory: svc.subcategory || '其他',
                        unit: svc.unit || '',
                        source: svc.source || 'ENCORE',
                        sourceUrl: svc.sourceUrl || 'https://encoreforcapital.org/',
                        colorScale: svc.colorScale || 'Blues',
                      }}
                      rating={svc.rating}
                      ratingCn={svc.ratingCn}
                      level={svc.level}
                    />
                  ))}
                </LayerCategory>
              ))}
            </div>
          )}

          {/* ENCORE Layer Browser - Impacts */}
          {profile && !isLoading && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Zap className="w-4 h-4 text-[#c9a962]" />
                <h3 className="text-sm font-semibold text-[#8a8a7e] uppercase tracking-wider">影响驱动因素</h3>
                <span className="text-xs text-[#b5b5a8] ml-auto">{profile.impacts.length} 项驱动</span>
              </div>

              {Object.entries(impSubcats).map(([subcat, impacts]) => (
                <LayerCategory key={subcat} title={subcat} icon={Zap}>
                  {impacts.map((imp, i) => (
                    <LayerRow
                      key={i}
                      meta={{
                        cn: imp.driverCn,
                        description: imp.description || imp.driver,
                        category: imp.category || '影响驱动因素',
                        subcategory: imp.subcategory || '其他',
                        unit: imp.unit || '',
                        source: imp.source || 'ENCORE',
                        sourceUrl: imp.sourceUrl || 'https://encoreforcapital.org/',
                        colorScale: imp.colorScale || 'Reds',
                      }}
                      rating={imp.rating}
                      ratingCn={imp.ratingCn}
                      level={imp.level}
                    />
                  ))}
                </LayerCategory>
              ))}
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-[#1a5f7a] animate-spin" />
              <span className="ml-3 text-[#8a8a7e]">正在加载 ENCORE 数据...</span>
            </div>
          )}
        </div>

        {/* Right content: Risk Dashboard */}
        <div className="lg:col-span-7 space-y-4">
          {/* Error */}
          {error && (
            <div className="p-4 bg-[#d4736a]/10 border border-[#d4736a]/20 rounded-xl flex items-center gap-3 text-[#d4736a]">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Risk Summary Card */}
          {profile && !isLoading && (
            <div className="bg-white rounded-2xl border border-[#e5e0d8] overflow-hidden">
              {/* Card header */}
              <div className="px-6 py-4 border-b border-[#f0ebe4] flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                     style={{ backgroundColor: riskColors[profile.summary.overallRiskLevel] }}>
                  {profile.isicInfo.name[0]}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[#1a1a18]">{profile.isicInfo.name}</p>
                  <p className="text-xs text-[#8a8a7e]">
                    {profile.isicInfo.section} · <span className="font-mono">{profile.isicInfo.code}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${
                    profile.summary.overallRiskLevel === 'high' ? 'text-[#d4736a]' :
                    profile.summary.overallRiskLevel === 'medium' ? 'text-[#c9a962]' : 'text-[#4a7c59]'
                  }`}>
                    {profile.summary.overallRiskLevel === 'high' ? '高风险' :
                     profile.summary.overallRiskLevel === 'medium' ? '中风险' : '低风险'}
                  </p>
                  <p className="text-xs text-[#8a8a7e]">ENCORE 评级</p>
                </div>
              </div>

              {/* Risk scores */}
              <div className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Dependency score */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-[#5c5c52]">依赖度评分</span>
                      <span className="text-lg font-bold text-[#1a5f7a]">{profile.summary.dependencyScore}</span>
                    </div>
                    <div className="h-2 bg-[#f0ebe4] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min((profile.summary.dependencyScore / 20) * 100, 100)}%`,
                          backgroundColor: profile.summary.dependencyScore >= 10 ? '#d4736a' :
                                           profile.summary.dependencyScore >= 5 ? '#c9a962' : '#1a5f7a'
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <div className="text-center">
                        <p className="text-sm font-bold text-[#d4736a]">{profile.summary.highDepCount}</p>
                        <p className="text-xs text-[#8a8a7e]">极高/高</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-[#c9a962]">{profile.summary.mediumDepCount}</p>
                        <p className="text-xs text-[#8a8a7e]">中</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-[#4a7c59]">{profile.summary.lowDepCount}</p>
                        <p className="text-xs text-[#8a8a7e]">低/极低</p>
                      </div>
                    </div>
                  </div>

                  {/* Impact score */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-[#5c5c52]">影响度评分</span>
                      <span className="text-lg font-bold text-[#c9a962]">{profile.summary.impactScore}</span>
                    </div>
                    <div className="h-2 bg-[#f0ebe4] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min((profile.summary.impactScore / 20) * 100, 100)}%`,
                          backgroundColor: profile.summary.impactScore >= 10 ? '#d4736a' :
                                           profile.summary.impactScore >= 5 ? '#c9a962' : '#57837b'
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <div className="text-center">
                        <p className="text-sm font-bold text-[#d4736a]">{profile.summary.highImpactCount}</p>
                        <p className="text-xs text-[#8a8a7e]">极高/高</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-[#c9a962]">{profile.summary.mediumImpactCount}</p>
                        <p className="text-xs text-[#8a8a7e]">中</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-[#4a7c59]">{profile.summary.lowImpactCount}</p>
                        <p className="text-xs text-[#8a8a7e]">低/极低</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="px-6 pb-4 flex items-center justify-center gap-6">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#d4736a]"></div>
                  <span className="text-xs text-[#8a8a7e]">VH/H 极高/高依赖</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#c9a962]"></div>
                  <span className="text-xs text-[#8a8a7e]">M 中依赖</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#4a7c59]"></div>
                  <span className="text-xs text-[#8a8a7e]">L/VL 低/极低</span>
                </div>
              </div>
            </div>
          )}

          {/* Selected ISIC Info */}
          {profile && !isLoading && (
            <div className="bg-[#faf8f5] rounded-2xl border border-[#e5e0d8] p-5">
              <h3 className="text-sm font-semibold text-[#1a1a18] mb-3">ENCORE 自然资本分析</h3>
              <div className="space-y-3">
                {/* High priority deps */}
                {profile.dependencies.filter(d => d.level === 'high').length > 0 && (
                  <div>
                    <p className="text-xs text-[#8a8a7e] uppercase tracking-wider mb-1.5">🔴 高优先级依赖</p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.dependencies.filter(d => d.level === 'high').map((d, i) => (
                        <span key={i} className="px-2.5 py-1 bg-[#d4736a]/10 border border-[#d4736a]/20 rounded-full text-xs text-[#d4736a]">
                          {d.serviceCn} ({d.rating})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Medium priority deps */}
                {profile.dependencies.filter(d => d.level === 'medium').length > 0 && (
                  <div>
                    <p className="text-xs text-[#8a8a7e] uppercase tracking-wider mb-1.5">🟡 中优先级依赖</p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.dependencies.filter(d => d.level === 'medium').map((d, i) => (
                        <span key={i} className="px-2.5 py-1 bg-[#c9a962]/10 border border-[#c9a962]/20 rounded-full text-xs text-[#8a6a2a]">
                          {d.serviceCn} ({d.rating})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {/* High priority impacts */}
                {profile.impacts.filter(i => i.level === 'high').length > 0 && (
                  <div>
                    <p className="text-xs text-[#8a8a7e] uppercase tracking-wider mb-1.5">🔴 高影响驱动</p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.impacts.filter(i => i.level === 'high').map((imp, i) => (
                        <span key={i} className="px-2.5 py-1 bg-[#d4736a]/10 border border-[#d4736a]/20 rounded-full text-xs text-[#d4736a]">
                          {imp.driverCn} ({imp.rating})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!profile && !isLoading && !error && (
            <div className="bg-white rounded-2xl border border-[#e5e0d8] p-16 text-center">
              <Layers className="w-12 h-12 text-[#e5e0d8] mx-auto mb-4" />
              <p className="text-[#8a8a7e] mb-1">请从左侧选择 ENCORE ISIC 行业分类</p>
              <p className="text-xs text-[#b5b5a8]">基于 ENCORE September 2025 数据库</p>
            </div>
          )}

          {/* Data Source Attribution */}
          {profile && !isLoading && (
            <div className="p-3 bg-[#faf8f5] rounded-xl border border-[#e5e0d8]">
              <p className="text-xs text-[#8a8a7e] text-center flex items-center justify-center gap-2">
                <Info className="w-3 h-3" />
                数据来源: ENCORE Database (September 2025) · encoreforcapital.org
                <ExternalLink className="w-3 h-3" />
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex justify-between items-center">
        <button onClick={() => setStep('locate')} className="px-5 py-3 text-[#5c5c52] hover:text-[#1a1a18] flex items-center gap-2 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          返回定位
        </button>
        <button
          onClick={handleContinue}
          disabled={!profile || !selectedISIC}
          className="group px-8 py-4 bg-[#1a5f7a] text-white rounded-xl hover:bg-[#2a6f8f] disabled:bg-[#e5e0d8] disabled:cursor-not-allowed transition-all font-medium flex items-center gap-3 shadow-lg shadow-[#1a5f7a]/20 hover:shadow-xl hover:shadow-[#1a5f7a]/30 hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:hover:shadow-none"
        >
          下一步: 评估
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  )
}
