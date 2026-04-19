'use client'

import { useRef, useState } from 'react'
import { ArrowLeft, Download, RotateCcw, FileText, Clock, CheckCircle, ExternalLink } from 'lucide-react'
import { useLeapStore } from '@/store/leap-store'

const TNFD_MILESTONES = [
  { year: '2020', event: 'TNFD  Task Force 成立', detail: '由金融稳定理事会（FSB）发起' },
  { year: '2021', event: '市场测试阶段', detail: '全球 30+ 机构参与试点' },
  { year: '2022', event: 'v0.1 框架发布', detail: '开放公众征询意见' },
  { year: '2023', event: 'v1.0 正式发布', detail: '2023年9月，LEAP 路径正式确定' },
  { year: '2025', event: '强制披露启动', detail: 'IFS 框架下大型金融机构开始强制要求' },
  { year: '2026', event: '推广期', detail: '扩展至中小企业与非金融企业' },
]

const METHODOLOGY_STEPS = [
  { label: 'L', name: '定位', desc: '识别资产位置与生态敏感区域', icon: '📍' },
  { label: 'E', name: '评价', desc: '分析行业自然资本依赖与影响', icon: '📊' },
  { label: 'A', name: '评估', desc: 'AI 推理风险与机遇', icon: '🤖' },
  { label: 'P', name: '准备', desc: '生成 TNFD v1.0 披露报告', icon: '📄' },
]

export default function Prepare() {
  const { assets, sector, industryData, assessmentResult, setStep, reset } = useLeapStore()
  const reportRef = useRef<HTMLDivElement>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [copied, setCopied] = useState(false)

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
      <div className="max-w-4xl mx-auto p-8">
        <div className="p-6 bg-[#c9a962]/10 border border-[#c9a962]/20 rounded-2xl flex items-center gap-4 text-[#8a6a2a]">
          <FileText className="w-6 h-6 flex-shrink-0" />
          <div>
            <p className="font-medium">请先完成&quot;评估 (A)&quot;步骤生成风险分析</p>
            <p className="text-sm opacity-80">AI 分析完成后才能生成报告</p>
          </div>
        </div>
        <button
          onClick={() => setStep('assess')}
          className="mt-4 px-4 py-2 text-[#2d5a3d] hover:underline flex items-center gap-2"
        >
          ← 返回评估
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-8 h-8 rounded-full bg-[#2d5a3d] text-white text-sm font-semibold flex items-center justify-center">P</span>
          <h2 className="text-3xl font-semibold text-[#1a1a18]" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
            准备披露报告
          </h2>
        </div>
        <p className="text-[#5c5c52] pl-11">
          生成符合 TNFD v1.0 框架的正式披露报告，支持 PDF 导出
        </p>
      </div>

      {/* Methodology Steps */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-[#8a8a7e] uppercase tracking-wider mb-4">LEAP 方法论</h3>
        <div className="grid grid-cols-4 gap-3">
          {METHODOLOGY_STEPS.map((step, i) => (
            <div key={step.label} className="relative">
              {i > 0 && (
                <div className="absolute top-5 left-0 w-full h-px bg-[#e5e0d8] -translate-x-full z-0" style={{ width: 'calc(100% - 2rem)', left: '1rem' }} />
              )}
              <div className={`
                relative z-10 rounded-xl border text-center p-4 transition-all
                ${step.label === 'P' ? 'bg-[#2d5a3d]/5 border-[#2d5a3d]/30' : 'bg-white border-[#e5e0d8]'}
              `}>
                <span className="text-2xl mb-1 block">{step.icon}</span>
                <p className="text-xs text-[#8a8a7e]">{step.label} · {step.name}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TNFD History Timeline - Vertical */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-[#8a8a7e] uppercase tracking-wider mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          TNFD 发展历程
        </h3>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[4.5rem] top-0 bottom-0 w-px bg-[#e5e0d8]" />

          <div className="space-y-0">
            {TNFD_MILESTONES.map((m, i) => (
              <div key={i} className="relative flex items-start gap-6 pl-0">
                {/* Year bubble */}
                <div className="relative z-10 flex-shrink-0 w-20 text-right">
                  <span className={`
                    inline-block px-2 py-0.5 rounded-full text-xs font-semibold
                    ${i === 2 ? 'bg-[#2d5a3d] text-white' : i === 3 ? 'bg-[#c9a962] text-white' : 'bg-[#f0ebe4] text-[#5c5c52]'}
                  `}>
                    {m.year}
                  </span>
                </div>

                {/* Timeline dot */}
                <div className="relative z-10 flex-shrink-0 w-4 h-4 rounded-full border-2 border-white mt-1.5" style={{ background: i <= 3 ? '#2d5a3d' : '#e5e0d8' }} />

                {/* Content */}
                <div className="flex-1 pb-5">
                  <p className="font-medium text-[#1a1a18] text-sm">{m.event}</p>
                  <p className="text-xs text-[#8a8a7e] mt-0.5">{m.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Report Preview */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#1a1a18] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#4a7c59]" />
            报告预览
          </h3>
          <button
            onClick={reset}
            className="text-sm text-[#8a8a7e] hover:text-[#d4736a] transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            重新开始
          </button>
        </div>

        {/* The actual report that will be exported */}
        <div ref={reportRef} className="bg-white border border-[#e5e0d8] rounded-2xl overflow-hidden shadow-sm">
          {/* Report Header */}
          <div className="bg-gradient-to-r from-[#2d5a3d] to-[#4a7c59] text-white p-8 text-center">
            <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
              自然相关财务信息披露报告
            </h1>
            <p className="text-white/70 text-sm">TNFD v1.0 LEAP Framework</p>
            <p className="text-white/60 text-xs mt-1">
              生成日期: {new Date().toLocaleDateString('zh-CN')}
            </p>
          </div>

          {/* Report Body */}
          <div className="p-8 space-y-8">
            {/* Section 1: Overview */}
            <section>
              <h2 className="text-lg font-semibold text-[#2d5a3d] mb-4 pb-2 border-b border-[#e5e0d8] flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-[#2d5a3d] text-white text-xs flex items-center justify-center font-bold">1</span>
                企业概况
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 bg-[#faf8f5] rounded-xl">
                  <p className="text-xs text-[#8a8a7e] uppercase tracking-wider mb-1">所属行业</p>
                  <p className="font-semibold text-[#1a1a18]">{sector}</p>
                </div>
                <div className="p-4 bg-[#faf8f5] rounded-xl">
                  <p className="text-xs text-[#8a8a7e] uppercase tracking-wider mb-1">资产数量</p>
                  <p className="font-semibold text-[#1a1a18]">{assets.length} 个</p>
                </div>
                <div className="sm:col-span-2 p-4 bg-[#faf8f5] rounded-xl">
                  <p className="text-xs text-[#8a8a7e] uppercase tracking-wider mb-1">资产位置</p>
                  <p className="text-[#1a1a18] text-sm">{assets.map((a) => a.name).join('、')}</p>
                </div>
              </div>
            </section>

            {/* Section 2: Dependencies */}
            <section>
              <h2 className="text-lg font-semibold text-[#2d5a3d] mb-4 pb-2 border-b border-[#e5e0d8] flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-[#2d5a3d] text-white text-xs flex items-center justify-center font-bold">2</span>
                自然资本依赖分析
              </h2>
              {industryData && (
                <ul className="space-y-2">
                  {industryData.dependencies.map((dep, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-[#5c5c52]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4a7c59] mt-2 flex-shrink-0" />
                      {dep}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Section 3: Impacts */}
            <section>
              <h2 className="text-lg font-semibold text-[#2d5a3d] mb-4 pb-2 border-b border-[#e5e0d8] flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-[#2d5a3d] text-white text-xs flex items-center justify-center font-bold">3</span>
                影响驱动因素
              </h2>
              {industryData && (
                <ul className="space-y-2">
                  {industryData.impacts.map((impact, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-[#5c5c52]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#c9a962] mt-2 flex-shrink-0" />
                      {impact}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Section 4: Risk Assessment */}
            <section>
              <h2 className="text-lg font-semibold text-[#2d5a3d] mb-4 pb-2 border-b border-[#e5e0d8] flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-[#2d5a3d] text-white text-xs flex items-center justify-center font-bold">4</span>
                TNFD 风险与机遇评估
              </h2>
              <div className="text-sm text-[#5c5c52] whitespace-pre-wrap leading-relaxed">
                {assessmentResult}
              </div>
            </section>

            {/* Footer / Disclaimer */}
            <section className="pt-6 border-t border-[#e5e0d8]">
              <div className="p-4 bg-[#f0ebe4]/50 rounded-xl">
                <p className="text-xs font-semibold text-[#5c5c52] mb-2">方法论与数据来源声明</p>
                <ul className="space-y-1 text-xs text-[#8a8a7e]">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0 text-[#4a7c59]" />
                    自然资本依赖与影响分析基于 ENCORE 数据库 (2025 Sep)
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0 text-[#4a7c59]" />
                    地理位置交叉分析参考 WDPA (World Database on Protected Areas)
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0 text-[#4a7c59]" />
                    风险评估由 Qwen 大模型基于 TNFD v1.0 框架推理生成
                  </li>
                </ul>
              </div>
              <p className="text-xs text-[#8a8a7e] italic mt-3 text-center">
                本报告适合作为中小型企业的内部筛查基线或 NGO 的初步调研依据。建议在实际披露前结合专业顾问意见进行人工审核。
              </p>
            </section>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={downloadPDF}
          disabled={isDownloading}
          className="flex-1 py-4 bg-[#2d5a3d] text-white rounded-xl hover:bg-[#4a7c59] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center justify-center gap-3 shadow-lg shadow-[#2d5a3d]/20 hover:shadow-xl hover:shadow-[#2d5a3d]/30 hover:-translate-y-0.5"
        >
          {isDownloading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              导出中...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              导出 PDF 报告
            </>
          )}
        </button>
        <button
          onClick={() => setStep('assess')}
          className="px-6 py-4 text-[#5c5c52] border border-[#e5e0d8] rounded-xl hover:bg-[#faf8f5] transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
      </div>

      {/* External Resources */}
      <div className="mt-8 p-4 bg-[#f0ebe4]/50 rounded-xl border border-[#e5e0d8]">
        <p className="text-xs font-semibold text-[#5c5c52] mb-3">参考资源</p>
        <div className="space-y-2">
          <a href="https://tnfd.global/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-[#4a7c59] hover:underline">
            <ExternalLink className="w-3 h-3" />
            TNFD 官方网站
          </a>
          <a href="https://encoreforcapital.org/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-[#4a7c59] hover:underline">
            <ExternalLink className="w-3 h-3" />
            ENCORE 数据库
          </a>
        </div>
      </div>
    </div>
  )
}
