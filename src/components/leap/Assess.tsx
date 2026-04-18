'use client'

import { useState } from 'react'
import { ArrowLeft, Brain, AlertTriangle, Loader2 } from 'lucide-react'
import { useLeapStore } from '@/store/leap-store'

export default function Assess() {
  const { sector, assets, industryData, setStep, assessmentResult, setAssessmentResult, isLoading, setIsLoading } = useLeapStore()
  const [error, setError] = useState('')

  const runAssessment = async () => {
    if (!sector || assets.length === 0) return

    setIsLoading(true)
    setError('')

    const prompt = `你是一个熟知中国生态环境部政策与 TNFD 国际框架的资深 ESG 专家。
请结合 ENCORE 数据库的行业依赖/影响分析，对以下企业进行自然相关财务风险评估：

行业: ${sector}
资产数量: ${assets.length} 个
地点: ${assets.map((a) => `${a.name}(${a.lat},${a.lng})`).join(', ')}

依赖的自然资本: ${industryData?.dependencies.join(', ') || '待分析'}
影响驱动因素: ${industryData?.impacts.join(', ') || '待分析'}

请按 TNFD 框架分析:
1. 物理风险 (急性/慢性) - 如极端天气、水资源短缺
2. 转型风险 (政策法规/市场/声誉) - 如碳关税、绿色供应链要求
3. 潜在机遇 - 如生态补偿、绿色金融

用严谨的学术语言输出 Markdown 格式，控制在 500 字以内。`

    try {
      const response = await fetch('/api/tnfd-assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1000,
        }),
      })

      if (!response.ok) {
        throw new Error(`API 错误: ${response.status}`)
      }

      const data = await response.json()
      setAssessmentResult(data.content || '（分析完成）')
    } catch (err) {
      // Fallback: 显示示例分析（当 API 不可用时）
      setAssessmentResult(`## TNFD 自然相关风险评估（示例）

**行业**: ${sector}

### 1. 物理风险

**慢性风险**:
- 水资源压力：该行业依赖淡水资源，预计面临水资源可用性下降风险
- 气候适应成本：需要投资于气候适应性基础设施

### 2. 转型风险

**政策法规**:
- 生态环境监管趋严，生态保护红线约束增强
- 碳排放核算与报告要求提升

**市场风险**:
- 绿色供应链采购趋势影响原材料供应
- 投资者 ESG 要求提高融资成本

### 3. 潜在机遇

- 生态补偿机制参与
- 绿色信贷与可持续发展挂钩融资
- 碳汇项目开发

---
*注：此为本地示例分析，连接 Qwen API 可获得实时推理结果*`)
    } finally {
      setIsLoading(false)
    }
  }

  if (!sector) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-700">
          <AlertTriangle className="w-5 h-5" />
          请先完成&quot;定位 (L)&quot;和&quot;评价 (E)&quot;步骤
        </div>
        <button
          onClick={() => setStep('evaluate')}
          className="mt-4 px-4 py-2 text-blue-600 hover:underline"
        >
          ← 返回评价
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">A - 评估 (Assess)</h2>
      <p className="text-slate-600 mb-6">
        基于定位与评价数据，使用 Qwen AI 进行 TNFD 风险与机遇分析
      </p>

      {/* Summary Card */}
      <div className="bg-slate-50 rounded-xl p-4 mb-6">
        <h3 className="font-medium text-slate-700 mb-2">分析概要</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500">行业:</span>{' '}
            <span className="font-medium">{sector}</span>
          </div>
          <div>
            <span className="text-slate-500">资产数量:</span>{' '}
            <span className="font-medium">{assets.length}</span>
          </div>
        </div>
      </div>

      {/* Run Button */}
      <button
        onClick={runAssessment}
        disabled={isLoading}
        className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            AI 分析中...
          </>
        ) : (
          <>
            <Brain className="w-5 h-5" />
            运行 TNFD AI 评估
          </>
        )}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Result */}
      {assessmentResult && (
        <div className="mt-6">
          <h3 className="font-semibold text-slate-900 mb-3">评估结果</h3>
          <div
            className="prose prose-slate max-w-none p-6 bg-white border border-slate-200 rounded-xl"
            dangerouslySetInnerHTML={{ __html: formatMarkdown(assessmentResult) }}
          />
        </div>
      )}

      {assessmentResult && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => setStep('prepare')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            下一步: 生成报告 (P) →
          </button>
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <button
          onClick={() => setStep('evaluate')}
          className="px-4 py-2 text-slate-600 hover:text-slate-900 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          返回评价
        </button>
      </div>
    </div>
  )
}

function formatMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/\n\n/g, '</p><p class="mt-2">')
    .replace(/^(?!<[hl])/gm, '<p class="mt-2">')
}
