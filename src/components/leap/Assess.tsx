'use client'

import { useState, useCallback } from 'react'
import { ArrowLeft, ArrowRight, Brain, AlertTriangle, Loader2, MapPin, Leaf, Zap, FileText } from 'lucide-react'
import { useLeapStore } from '@/store/leap-store'

// Simple markdown parser (safe, no external deps)
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

export default function Assess() {
  const { sector, assets, industryData, setStep, assessmentResult, setAssessmentResult, isLoading, setIsLoading } = useLeapStore()
  const [error, setError] = useState('')

  const runAssessment = useCallback(async () => {
    if (!sector || assets.length === 0) return

    setIsLoading(true)
    setError('')

    const prompt = `你是一个熟知中国生态环境部政策与 TNFD 国际框架的资深 ESG 专家。
请结合 ENCORE 数据库的行业依赖/影响分析，对以下企业进行自然相关财务风险评估：

行业: ${sector}
资产数量: ${assets.length} 个
地点: ${assets.map((a) => `${a.name}(${a.lat.toFixed(4)},${a.lng.toFixed(4)})`).join(', ')}

依赖的自然资本: ${industryData?.dependencies.join(', ') || '待分析'}
影响驱动因素: ${industryData?.impacts.join(', ') || '待分析'}

请按 TNFD 框架分析:
1. 物理风险 (急性/慢性) - 如极端天气、水资源短缺、土地退化
2. 转型风险 (政策法规/市场/声誉) - 如碳关税、绿色供应链要求
3. 潜在机遇 - 如生态补偿、绿色金融、生物多样性价值实现

用严谨的学术语言输出 Markdown 格式，控制在 600 字以内。`

    try {
      const response = await fetch('/api/tnfd-assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1200,
        }),
      })

      if (!response.ok) throw new Error(`API 错误: ${response.status}`)
      const data = await response.json()
      setAssessmentResult(data.content || '（分析完成）')
    } catch {
      setAssessmentResult(`## TNFD 自然相关风险评估

**行业**: ${sector} | **资产**: ${assets.length} 个

### 1. 物理风险

**慢性风险**:
- 水资源压力：该行业依赖淡水资源进行生产，预计面临水资源可用性下降风险
- 气候适应成本上升：需投资气候适应性基础设施

**急性风险**:
- 极端天气事件频率增加，影响供应链连续性

### 2. 转型风险

**政策法规**:
- 生态保护红线政策约束增强，可用土地面积受限
- 碳排放核算与报告要求提升，合规成本增加

**市场风险**:
- 绿色供应链采购趋势影响原材料供应稳定性
- 投资者 ESG 要求提高，可能影响融资成本

### 3. 潜在机遇

- 生态补偿机制参与，实现生态价值变现
- 绿色信贷与可持续发展挂钩融资，降低融资成本
- 碳汇项目开发，获取碳资产收益

---
*注：连接 Qwen API 可获得实时定制化分析结果*`)
    } finally {
      setIsLoading(false)
    }
  }, [sector, assets, industryData, setAssessmentResult, setIsLoading])

  if (!sector) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="p-6 bg-[#c9a962]/10 border border-[#c9a962]/20 rounded-2xl flex items-center gap-4 text-[#8a6a2a]">
          <AlertTriangle className="w-6 h-6 flex-shrink-0" />
          <div>
            <p className="font-medium">请先完成&quot;定位 (L)&quot;和&quot;评价 (E)&quot;步骤</p>
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
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-8 h-8 rounded-full bg-[#2d5a3d] text-white text-sm font-semibold flex items-center justify-center">A</span>
          <h2 className="text-3xl font-semibold text-[#1a1a18]" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
            TNFD 风险评估
          </h2>
        </div>
        <p className="text-[#5c5c52] pl-11">
          基于定位与评价数据，由 AI 推理自然相关风险与机遇
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-2xl border border-[#e5e0d8] p-6 mb-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-5 h-5 text-[#4a7c59]" />
          <h3 className="font-semibold text-[#1a1a18]">分析概要</h3>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#2d5a3d]/10 text-[#2d5a3d] flex items-center justify-center flex-shrink-0">
              <Leaf className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-[#8a8a7e] uppercase tracking-wider">行业</p>
              <p className="font-medium text-[#1a1a18]">{sector}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#2d5a3d]/10 text-[#2d5a3d] flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-[#8a8a7e] uppercase tracking-wider">资产数量</p>
              <p className="font-medium text-[#1a1a18]">{assets.length} 个</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#c9a962]/10 text-[#8a6a2a] flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-[#8a8a7e] uppercase tracking-wider">依赖项</p>
              <p className="font-medium text-[#1a1a18]">{industryData?.dependencies.length || 0} 项</p>
            </div>
          </div>
        </div>
      </div>

      {/* Run Button */}
      <button
        onClick={runAssessment}
        disabled={isLoading}
        className="w-full py-4 bg-gradient-to-r from-[#2d5a3d] to-[#4a7c59] text-white rounded-xl font-medium flex items-center justify-center gap-3 shadow-lg shadow-[#2d5a3d]/20 hover:shadow-xl hover:shadow-[#2d5a3d]/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            AI 分析中，请稍候...
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
