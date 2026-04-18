'use client'

import { useCallback, useState } from 'react'
import { Upload, MapPin, AlertTriangle } from 'lucide-react'
import { useLeapStore, AssetLocation } from '@/store/leap-store'
import Papa from 'papaparse'

export default function Locate() {
  const { assets, setAssets, setStep } = useLeapStore()
  const [error, setError] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)

  const handleFileUpload = useCallback((file: File) => {
    setError('')
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as Record<string, string>[]
        const requiredCols = ['name', 'lat', 'lng']

        const headers = Object.keys(data[0] || {})
        const missing = requiredCols.filter((col) => !headers.includes(col))

        if (missing.length > 0) {
          setError(`缺少必需列: ${missing.join(', ')}。需要: name, lat, lng`)
          return
        }

        const parsed: AssetLocation[] = data.map((row, i) => ({
          id: `asset-${i}`,
          name: row.name,
          lat: parseFloat(row.lat),
          lng: parseFloat(row.lng),
          sensitivity: 'medium',
        }))

        setAssets(parsed)
      },
      error: (err) => {
        setError(`CSV 解析失败: ${err.message}`)
      },
    })
  }, [setAssets])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file && file.name.endsWith('.csv')) {
        handleFileUpload(file)
      } else {
        setError('请上传 CSV 文件')
      }
    },
    [handleFileUpload]
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-8 h-8 rounded-full bg-[#2d5a3d] text-white text-sm font-semibold flex items-center justify-center">L</span>
          <h2 className="text-3xl font-semibold text-[#1a1a18]" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
            定位资产
          </h2>
        </div>
        <p className="text-[#5c5c52] pl-11">
          上传企业资产清单（包含经纬度坐标），识别生态敏感区域
        </p>
      </div>

      {/* Upload Zone */}
      <div
        className={`
          relative rounded-3xl border-2 border-dashed p-12 text-center transition-all duration-300
          ${isDragging
            ? 'border-[#2d5a3d] bg-[#2d5a3d]/5'
            : 'border-[#e5e0d8] hover:border-[#4a7c59] bg-white'
          }
        `}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {/* Decorative element */}
        <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-[#c9a962]/20 to-transparent rounded-full blur-xl" />

        <div className="relative">
          <div className={`
            w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center
            ${isDragging ? 'bg-[#2d5a3d] text-white' : 'bg-[#f0ebe4] text-[#4a7c59]'}
            transition-colors duration-300
          `}>
            <Upload className="w-7 h-7" />
          </div>

          <p className="text-lg font-medium text-[#1a1a18] mb-2">
            拖拽 CSV 文件到此处
          </p>
          <p className="text-sm text-[#8a8a7e] mb-4">
            或点击选择文件
          </p>

          <div className="flex items-center justify-center gap-3 text-xs text-[#8a8a7e]">
            <code className="px-2 py-1 bg-[#f0ebe4] rounded">name</code>
            <span>+</span>
            <code className="px-2 py-1 bg-[#f0ebe4] rounded">lat</code>
            <span>+</span>
            <code className="px-2 py-1 bg-[#f0ebe4] rounded">lng</code>
          </div>

          <input
            type="file"
            accept=".csv"
            onChange={handleFileInput}
            className="hidden"
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className="inline-block mt-6 px-6 py-3 bg-[#2d5a3d] text-white rounded-xl cursor-pointer hover:bg-[#4a7c59] transition-colors font-medium"
          >
            选择 CSV 文件
          </label>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-[#d4736a]/10 border border-[#d4736a]/20 rounded-xl flex items-center gap-3 text-[#d4736a]">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Assets List */}
      {assets.length > 0 && (
        <div className="mt-8 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#1a1a18]">
              已上传 <span className="text-[#4a7c59]">{assets.length}</span> 个资产
            </h3>
          </div>

          <div className="bg-white rounded-2xl border border-[#e5e0d8] overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-[#f0ebe4]/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#8a8a7e] uppercase tracking-wider">资产名称</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#8a8a7e] uppercase tracking-wider">纬度</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#8a8a7e] uppercase tracking-wider">经度</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e0d8]">
                {assets.slice(0, 5).map((asset, i) => (
                  <tr key={asset.id} className="hover:bg-[#faf8f5] transition-colors" style={{ animationDelay: `${i * 50}ms` }}>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-[#2d5a3d]/10 text-[#2d5a3d] flex items-center justify-center">
                          <MapPin className="w-4 h-4" />
                        </span>
                        <span className="font-medium text-[#1a1a18]">{asset.name}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#5c5c52] font-mono text-sm">{asset.lat.toFixed(6)}</td>
                    <td className="px-6 py-4 text-[#5c5c52] font-mono text-sm">{asset.lng.toFixed(6)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {assets.length > 5 && (
              <div className="px-6 py-3 bg-[#f0ebe4]/30 text-center text-sm text-[#8a8a7e]">
                ...还有 {assets.length - 5} 个资产
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={() => setStep('evaluate')}
              className="group px-8 py-4 bg-[#2d5a3d] text-white rounded-xl hover:bg-[#4a7c59] transition-all font-medium flex items-center gap-3 shadow-lg shadow-[#2d5a3d]/20 hover:shadow-xl hover:shadow-[#2d5a3d]/30 hover:-translate-y-0.5"
            >
              下一步: 评价
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Sample CSV */}
      <div className="mt-12 p-6 bg-[#f0ebe4]/50 rounded-2xl border border-[#e5e0d8]">
        <p className="text-sm font-medium text-[#5c5c52] mb-3">示例 CSV 格式:</p>
        <pre className="text-xs bg-white p-4 rounded-xl overflow-x-auto border border-[#e5e0d8] text-[#5c5c52]">
{`name,lat,lng
北京办公室,39.9042,116.4074
上海工厂,31.2304,121.4737
广州仓库,23.1291,113.2644`}
        </pre>
      </div>
    </div>
  )
}
