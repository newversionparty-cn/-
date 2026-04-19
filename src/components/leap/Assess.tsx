'use client'

import { useState, useCallback } from 'react'
import { ArrowLeft, ArrowRight, Brain, AlertTriangle, Loader2, MapPin, Leaf, Zap, FileText, Globe, Droplets, Bug, Mountain, ChevronDown, ChevronRight } from 'lucide-react'
import { useLeapStore } from '@/store/leap-store'

// Simple markdown parser
function parseMarkdown(text: string): string {
  return text
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-[#1a1a18] mt-6 mb-3" style="font-family: Cormorant Garamond, Georgia, serif">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-[#2d5a3d] mt-5 mb-2">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#1a1a18] font-semibold">$1</strong>')
    .replace(/^- (.+)$/gm, '<li class="ml-5 list-disc text-[#5c5c52] mb-1">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-5 list-decimal text-[#5c5c52] mb-1">$2</li>')
    .replace(/\n\n/g, '</p><p class="mt-2 text-[#5c5c52] leading-relaxed">')
    .replace(/^(?!<[hpl])(.+)$/gm, '<p class="mt-2 text-[#5c5c52] leading-relaxed">$1</p>')
    .replace(/<li/g, '<li class="ml-5 list-disc text-[#5c5c52] mb-1"')
}

interface AssessmentData {
  summary: {
    assetsCount: number
    primaryLocation: string
    primaryCoordinates: string
    biodiversityHotspot: boolean
    totalThreatenedSpecies: number
    maxWaterStress: string
    highPriorityDependencies: number
    highPriorityImpacts: number
  }
  biodiversity: {
    totalRecords: number
    threatenedSpecies: number
    ecosystemTypes: string[]
    biodiversityHotspot: boolean
  }
  waterRisk: {
    riverBasin: string
    waterStress: string
    waterStressLabel: string
    aridityLabel: string
    droughtRisk: string
    floodRisk: string
    keyRisks: string[]
  }
  dependencies: Array<{
    service: string
    cn: string
    encoreLevel: string
    tnfdRisk: string
    tnfdCategory: string
    locationRelevance: string
    priority: 'high' | 'medium' | 'low'
  }>
  impacts: Array<{
    driver: string
    cn: string
    tnfdRisk: string
    tnfdCategory: string
  }>
}

function DataCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true)
  return (
    <div className="bg-white rounded-2xl border border-[#e5e0d8] overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-[#faf8f5] hover:bg-[#f0ebe4] transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-[#2d5a3d] text-white flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 text-left">
          <p className="font-semibold text-[#1a1a18] text-sm">{title}</p>
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4 text-[#8a8a7e]" /> : <ChevronRight className="w-4 h-4 text-[#8a8a7e]" />}
      </button>
      {isOpen && <div className="p-4">{children}</div>}
    </div>
  )
}

function RiskIndicator({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#f0ebe4] last:border-0">
      <span className="text-sm text-[#5c5c52]">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  )
}

export default function Assess() {
  const { sector, assets, industryData, assetProtections, setStep, assessmentResult, setAssessmentResult, isLoading, setIsLoading } = useLeapStore()
  const [error, setError] = useState('')
  const [structuredData, setStructuredData] = useState<AssessmentData | null>(null)

  const runAssessment = useCallback(async () => {
    if (!sector || assets.length === 0) return

    setIsLoading(true)
    setError('')
    setStructuredData(null)

    try {
      const response = await fetch('/api/tnfd-assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assets: assets.map(a => ({ name: a.name, lat: a.lat, lng: a.lng })),
          industryData,
          assetProtections,
        }),
      })

      if (!response.ok) throw new Error(`API 错误: ${response.status}`)
      const data = await response.json()

      if (data.error) throw new Error(data.error)

      if (data.content) {
        // Qwen returned analysis + structured data
        setAssessmentResult(data.content)
        if (data.data) setStructuredData(data.data)
      } else if (data.summary) {
        // No Qwen key, just structured data
        setStructuredData(data as AssessmentData)
        setAssessmentResult(`## TNFD 自然相关风险评估（基于地理空间数据）

**行业**: ${industryData?.category || sector} | **资产**: ${assets.length} 个
**位置**: ${assets.map(a => `${a.name}(${a.lat.toFixed(2)}°, ${a.lng.toFixed(2)}°)`).join(', ')}

> 注：配置 Qwen API Key 后可获得完整的 AI 驱动 TNFD 分析报告

### 📊 数据概览

- **生物多样性热点**: ${data.biodiversity?.biodiversityHotspot ? '🔴 是 - 该区域生物多样性极为丰富' : '🟡 一般'}
- **受威胁物种**: ${data.biodiversity?.threatenedSpecies || 0} 种（极危/濒危/易危 IUCN红色名录）
- **水资源压力**: ${data.waterRisk?.waterStressLabel || data.maxWaterStress || '待调查'}
- **所在流域**: ${data.waterRisk?.riverBasin || '待调查'}

### 🔴 高优先级风险

${(data.dependencies || []).filter((d: any) => d.priority === 'high').map((d: any, i: number) =>
`${i + 1}. **${d.cn}**
   - 风险: ${d.tnfdRisk}
   - 位置验证: ${d.locationRelevance}`
).join('\n\n') || '无高优先级风险'}

### ⚠️ 中优先级风险

${(data.dependencies || []).filter((d: any) => d.priority === 'medium').map((d: any, i: number) =>
`${i + 1}. **${d.cn}** - ${d.tnfdRisk}`
).join('\n\n') || '无中优先级风险'}

---
*数据来源: GBIF 物种数据库 (api.gbif.org) + 中国流域水资源压力分析*
`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '评估失败')
    } finally {
      setIsLoading(false)
    }
  }, [sector, assets, industryData, assetProtections, setAssessmentResult, setIsLoading])

  if (!sector) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <div className="p-6 bg-[#c9a962]/10 border border-[#c9a962]/20 rounded-2xl flex items-center gap-4 text-[#8a6a2a]">
          <AlertTriangle className="w-6 h-6 flex-shrink-0" />
          <div>
            <p className="font-medium">请先完成"定位 (L)"和"评价 (E)"步骤</p>
            <p className="text-sm opacity-80">需要资产位置和行业数据才能进行风险评估</p>
          </div>
        </div>
        <button
          onClick={() => setStep('evaluate')}
          className="mt-4 px-4 py-2 text-[#2d5a3d] hover:underline flex items-center gap-2"
        >
          ← 返回评价
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-8 h-8 rounded-full bg-[#2d5a3d] text-white text-sm font-semibold flex items-center justify-center">A</span>
          <h2 className="text-3xl font-semibold text-[#1a1a18]" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
            TNFD 风险评估
          </h2>
        </div>
        <p className="text-[#5c5c52] pl-11">
          基于 GBIF 生物多样性数据 × ENCORE 方法论 × 水资源压力分析
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-[#e5e0d8] p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-[#4a7c59]" />
            <p className="text-xs text-[#8a8a7e] uppercase tracking-wider">资产数量</p>
          </div>
          <p className="text-2xl font-bold text-[#1a1a18]">{assets.length}</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#e5e0d8] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Leaf className="w-4 h-4 text-[#4a7c59]" />
            <p className="text-xs text-[#8a8a7e] uppercase tracking-wider">高依赖项</p>
          </div>
          <p className="text-2xl font-bold text-[#1a1a18]">{industryData?.dependencies.length || 0}</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#e5e0d8] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bug className="w-4 h-4 text-[#d4736a]" />
            <p className="text-xs text-[#8a8a7e] uppercase tracking-wider">受威胁物种</p>
          </div>
          <p className="text-2xl font-bold text-[#d4736a]">
            {structuredData?.biodiversity?.threatenedSpecies ?? '—'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#e5e0d8] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="w-4 h-4 text-[#4a7c59]" />
            <p className="text-xs text-[#8a8a7e] uppercase tracking-wider">水风险等级</p>
          </div>
          <p className="text-2xl font-bold text-[#1a1a18]">
            {structuredData?.waterRisk?.waterStress === 'extreme' ? '极高' :
             structuredData?.waterRisk?.waterStress === 'high' ? '高' :
             structuredData?.waterRisk?.waterStress === 'medium' ? '中' :
             structuredData?.waterRisk?.waterStress === 'low' ? '低' : '—'}
          </p>
        </div>
      </div>

      {/* Data Panels (before running assessment) */}
      {!structuredData && !assessmentResult && !isLoading && (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-[#e5e0d8] p-6 text-center">
            <Globe className="w-10 h-10 text-[#e5e0d8] mx-auto mb-3" />
            <p className="text-[#8a8a7e] mb-1">点击下方按钮启动 TNFD 评估</p>
            <p className="text-xs text-[#b5b5a8]">将基于 GBIF 物种数据和 ENCORE 行业依赖进行真实地理空间分析</p>
          </div>

          <div className="bg-white rounded-2xl border border-[#e5e0d8] p-6">
            <p className="text-sm font-semibold text-[#1a1a18] mb-3">评估将获取以下真实数据：</p>
            <div className="space-y-2 text-xs text-[#5c5c52]">
              <div className="flex items-center gap-2">
                <Bug className="w-4 h-4 text-[#4a7c59]" />
                <span>GBIF 50km 半径内物种记录和受威胁物种</span>
              </div>
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-[#4a7c59]" />
                <span>中国流域水资源压力分析</span>
              </div>
              <div className="flex items-center gap-2">
                <Mountain className="w-4 h-4 text-[#4a7c59]" />
                <span>生态系统类型和生物多样性热点识别</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#c9a962]" />
                <span>ENCORE 依赖项 × 地理位置交叉验证</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Structured Data Display */}
      {structuredData && (
        <div className="grid md:grid-cols-2 gap-4 mb-6 animate-fade-in-up">
          {/* Biodiversity Data */}
          <DataCard icon={Bug} title="生物多样性数据 (GBIF)">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#5c5c52]">50km 半径物种记录</span>
                <span className="font-medium text-[#1a1a18]">{structuredData.biodiversity.totalRecords.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#5c5c52]">受威胁物种 (CR/EN/VU)</span>
                <span className={`font-medium ${structuredData.biodiversity.threatenedSpecies > 0 ? 'text-[#d4736a]' : 'text-[#4a7c59]'}`}>
                  {structuredData.biodiversity.threatenedSpecies} 种
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#5c5c52]">生物多样性热点</span>
                <span className={`font-medium ${structuredData.biodiversity.biodiversityHotspot ? 'text-[#d4736a]' : 'text-[#5c5c52]'}`}>
                  {structuredData.biodiversity.biodiversityHotspot ? '🔴 是' : '🟡 一般'}
                </span>
              </div>
              <div className="pt-2 border-t border-[#e5e0d8]">
                <p className="text-xs text-[#8a8a7e] mb-1">生态系统类型</p>
                <div className="flex flex-wrap gap-1">
                  {structuredData.biodiversity.ecosystemTypes.length > 0 ? (
                    structuredData.biodiversity.ecosystemTypes.map((t, i) => (
                      <span key={i} className="text-xs bg-[#f0ebe4] text-[#5c5c52] px-2 py-0.5 rounded-full">{t}</span>
                    ))
                  ) : (
                    <span className="text-xs text-[#b5b5a8]">待查询</span>
                  )}
                </div>
              </div>
            </div>
          </DataCard>

          {/* Water Risk Data */}
          <DataCard icon={Droplets} title="水资源风险分析">
            <div className="space-y-2">
              <RiskIndicator label="所在流域" value={structuredData.waterRisk.riverBasin} color="text-[#1a1a18]" />
              <RiskIndicator
                label="水资源压力"
                value={structuredData.waterRisk.waterStressLabel}
                color={
                  structuredData.waterRisk.waterStress === 'extreme' ? 'text-[#d4736a]' :
                  structuredData.waterRisk.waterStress === 'high' ? 'text-[#c9a962]' :
                  'text-[#4a7c59]'
                }
              />
              <RiskIndicator label="气候类型" value={structuredData.waterRisk.aridityLabel} color="text-[#1a1a18]" />
              <RiskIndicator
                label="干旱风险"
                value={
                  structuredData.waterRisk.droughtRisk === 'extreme' ? '极高' :
                  structuredData.waterRisk.droughtRisk === 'high' ? '高' :
                  structuredData.waterRisk.droughtRisk === 'medium' ? '中' : '低'
                }
                color={
                  structuredData.waterRisk.droughtRisk === 'extreme' || structuredData.waterRisk.droughtRisk === 'high'
                    ? 'text-[#d4736a]' : 'text-[#5c5c52]'
                }
              />
              <RiskIndicator
                label="洪涝风险"
                value={
                  structuredData.waterRisk.floodRisk === 'high' ? '高' :
                  structuredData.waterRisk.floodRisk === 'medium' ? '中' :
                  structuredData.waterRisk.floodRisk === 'low' ? '低' : '未知'
                }
                color={
                  structuredData.waterRisk.floodRisk === 'high' ? 'text-[#c9a962]' : 'text-[#5c5c52]'
                }
              />
              {structuredData.waterRisk.keyRisks.length > 0 && (
                <div className="pt-2 border-t border-[#e5e0d8]">
                  <p className="text-xs text-[#8a8a7e] mb-1">关键风险</p>
                  {structuredData.waterRisk.keyRisks.slice(0, 2).map((r, i) => (
                    <p key={i} className="text-xs text-[#d4736a]">• {r}</p>
                  ))}
                </div>
              )}
            </div>
          </DataCard>

          {/* Priority Dependencies */}
          <DataCard icon={Leaf} title="依赖项风险优先级 (ENCORE × 地理位置)">
            <div className="space-y-2">
              {structuredData.dependencies.slice(0, 5).map((dep, i) => (
                <div key={i} className={`p-2 rounded-lg ${dep.priority === 'high' ? 'bg-[#d4736a]/5 border border-[#d4736a]/20' : dep.priority === 'medium' ? 'bg-[#c9a962]/5 border border-[#c9a962]/20' : 'bg-[#f0ebe4]'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#1a1a18]">{dep.cn}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      dep.priority === 'high' ? 'bg-[#d4736a] text-white' :
                      dep.priority === 'medium' ? 'bg-[#c9a962] text-white' :
                      'bg-[#4a7c59] text-white'
                    }`}>
                      {dep.priority === 'high' ? '高' : dep.priority === 'medium' ? '中' : '低'}
                    </span>
                  </div>
                  <p className="text-xs text-[#8a8a7e] mt-1">{dep.locationRelevance}</p>
                </div>
              ))}
            </div>
          </DataCard>

          {/* Impact Drivers */}
          <DataCard icon={Zap} title="影响驱动因素 (TNFD 分类)">
            <div className="space-y-2">
              {structuredData.impacts.map((imp, i) => (
                <div key={i} className="flex items-center gap-2 py-2 border-b border-[#f0ebe4] last:border-0">
                  <div className={`w-2 h-2 rounded-full ${
                    imp.tnfdCategory.includes('转型风险') ? 'bg-[#c9a962]' : 'bg-[#d4736a]'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm text-[#1a1a18]">{imp.cn}</p>
                    <p className="text-xs text-[#8a8a7e]">{imp.tnfdRisk}</p>
                  </div>
                </div>
              ))}
            </div>
          </DataCard>
        </div>
      )}

      {/* Run Button */}
      <button
        onClick={runAssessment}
        disabled={isLoading}
        className="w-full py-4 bg-gradient-to-r from-[#2d5a3d] to-[#4a7c59] text-white rounded-xl font-medium flex items-center justify-center gap-3 shadow-lg shadow-[#2d5a3d]/20 hover:shadow-xl hover:shadow-[#2d5a3d]/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            正在获取 GBIF 物种数据和水资源分析...
          </>
        ) : (
          <>
            <Brain className="w-5 h-5" />
            启动 TNFD AI 评估
          </>
        )}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-[#d4736a]/10 border border-[#d4736a]/20 rounded-xl flex items-center gap-3 text-[#d4736a]">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Result */}
      {assessmentResult && (
        <div className="mt-6 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="font-semibold text-[#1a1a18]">评估结果</h3>
            <div className="flex-1 h-px bg-[#e5e0d8]" />
            <span className="text-xs text-[#8a8a7e]">GBIF + ENCORE + 水资源数据</span>
          </div>
          <div
            className="bg-white rounded-2xl border border-[#e5e0d8] p-6 shadow-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(assessmentResult) }}
          />
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex justify-between items-center">
        <button
          onClick={() => setStep('evaluate')}
          className="px-5 py-3 text-[#5c5c52] hover:text-[#1a1a18] flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回评价
        </button>
        {assessmentResult && (
          <button
            onClick={() => setStep('prepare')}
            className="group px-8 py-4 bg-[#2d5a3d] text-white rounded-xl hover:bg-[#4a7c59] transition-all font-medium flex items-center gap-3 shadow-lg shadow-[#2d5a3d]/20 hover:shadow-xl hover:shadow-[#2d5a3d]/30 hover:-translate-y-0.5"
          >
            下一步: 准备报告
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        )}
      </div>
    </div>
  )
}
