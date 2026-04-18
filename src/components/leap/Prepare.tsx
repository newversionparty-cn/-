'use client'

import { useRef, useState } from 'react'
import { ArrowLeft, Download, RotateCcw } from 'lucide-react'
import { useLeapStore } from '@/store/leap-store'

export default function Prepare() {
  const { assets, sector, industryData, assessmentResult, setStep, reset } = useLeapStore()
  const reportRef = useRef<HTMLDivElement>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  const downloadPDF = async () => {
    if (!reportRef.current || isDownloading) return
    setIsDownloading(true)

    try {
      const html2pdf = (await import('html2pdf.js')).default
      const element = reportRef.current
      const opt = {
        margin: 10,
        filename: `TNFD-Report-${sector}-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
      }

      await html2pdf().set(opt).from(element).save()
    } catch (err) {
      console.error('PDF export failed:', err)
    } finally {
      setIsDownloading(false)
    }
  }

  if (!assessmentResult) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-700">
          请先完成&quot;评估 (A)&quot;步骤生成风险分析
        </div>
        <button
          onClick={() => setStep('assess')}
          className="mt-4 px-4 py-2 text-blue-600 hover:underline"
        >
          ← 返回评估
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">P - 准备 (Prepare)</h2>
      <p className="text-slate-600 mb-6">生成符合 TNFD v1.0 框架的披露报告</p>

      {/* Actions */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={downloadPDF}
          disabled={isDownloading}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {isDownloading ? '导出中...' : '导出 PDF'}
        </button>
        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <RotateCcw className="w-4 h-4" />
          重新开始
        </button>
      </div>

      {/* Report Preview */}
      <div ref={reportRef} className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
        {/* Header */}
        <div className="text-center border-b border-slate-200 pb-6 mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            自然相关财务信息披露报告
          </h1>
          <p className="text-slate-500 mt-2">TNFD v1.0 LEAP 框架分析</p>
          <p className="text-sm text-slate-400 mt-1">
            生成日期: {new Date().toLocaleDateString('zh-CN')}
          </p>
        </div>

        {/* Section 1: Overview */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-slate-800 border-l-4 border-blue-500 pl-3 mb-4">
            1. 企业概况
          </h2>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-500 w-32">所属行业</td>
                <td className="py-2 font-medium">{sector}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-500">资产数量</td>
                <td className="py-2">{assets.length} 个</td>
              </tr>
              <tr>
                <td className="py-2 text-slate-500">资产位置</td>
                <td className="py-2">{assets.map((a) => a.name).join(', ')}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Section 2: Dependencies */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-slate-800 border-l-4 border-green-500 pl-3 mb-4">
            2. 自然资本依赖分析
          </h2>
          {industryData && (
            <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
              {industryData.dependencies.map((dep, i) => (
                <li key={i}>{dep}</li>
              ))}
            </ul>
          )}
        </section>

        {/* Section 3: Impacts */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-slate-800 border-l-4 border-orange-500 pl-3 mb-4">
            3. 影响驱动因素
          </h2>
          {industryData && (
            <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
              {industryData.impacts.map((impact, i) => (
                <li key={i}>{impact}</li>
              ))}
            </ul>
          )}
        </section>

        {/* Section 4: Risk Assessment */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-slate-800 border-l-4 border-red-500 pl-3 mb-4">
            4. TNFD 风险与机遇评估
          </h2>
          <div className="text-sm text-slate-700 whitespace-pre-wrap">
            {assessmentResult}
          </div>
        </section>

        {/* Footer */}
        <section className="mt-8 pt-6 border-t border-slate-200 text-xs text-slate-500">
          <p className="font-medium mb-2">方法论与数据来源声明:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              自然资本依赖与影响分析基于 ENCORE (Exploring Natural Capital Opportunities, Risks
              and Exposure) 数据库
            </li>
            <li>地理位置交叉分析参考 WDPA (World Database on Protected Areas)</li>
            <li>
              本报告风险评估由 Qwen 大模型基于 TNFD v1.0 框架推理生成，仅供参考
            </li>
            <li>
              建议在实际披露前结合专业顾问意见进行人工审核
            </li>
          </ul>
          <p className="mt-4 text-slate-400 italic">
            本报告适合作为中小型企业的内部筛查基线或 NGO 的初步调研依据
          </p>
        </section>
      </div>

      <div className="mt-8 flex justify-between">
        <button
          onClick={() => setStep('assess')}
          className="px-4 py-2 text-slate-600 hover:text-slate-900 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          返回评估
        </button>
      </div>
    </div>
  )
}
