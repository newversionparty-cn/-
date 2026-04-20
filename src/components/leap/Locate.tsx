'use client'

import { useCallback, useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Upload, MapPin, AlertTriangle, Shield, Globe, Search, Crosshair, Trash2, Plus, Check } from 'lucide-react'
import { useLeapStore, AssetLocation, AssetProtection } from '@/store/leap-store'
import Papa from 'papaparse'

const AssetMap = dynamic(() => import('./AssetMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#f0ebe4] rounded-2xl flex items-center justify-center">
      <div className="text-[#8a8a7e]">地图加载中...</div>
    </div>
  ),
})

// Nominatim geocoding API (free, no key required)
async function geocodeLocation(query: string): Promise<{ lat: number; lng: number; display: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      { headers: { 'Accept-Language': 'zh-CN' } }
    )
    const data = await res.json()
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        display: data[0].display_name,
      }
    }
  } catch {
    // geocoding failed
  }
  return null
}

// WDPA check using Turf.js for spatial analysis
// Loads protected areas from local GeoJSON if available, with fallback to known regions
async function checkProtectedArea(lat: number, lng: number): Promise<AssetProtection> {
  const NEAR_THRESHOLD_KM = 50

  // Try loading local protected areas GeoJSON (user prepares this from OSM)
  let localDataExists = false
  try {
    const res = await fetch('/data/wdpa_china_simplified.json', { method: 'HEAD' })
    localDataExists = res.ok
  } catch {}

  if (localDataExists) {
    try {
      const turf = await import('@turf/turf')
      const geoData = await fetch('/data/wdpa_china_simplified.json').then(r => r.json())

      const point = turf.point([lng, lat]) // Turf.js uses [lon, lat] order

      const features = (geoData.features || []) as Array<any>

      // Check if point is inside any protected area
      let inProtected = false
      let nearProtected = false
      let minDistance = Infinity

      for (const feature of features) {
        if (!feature || !feature.geometry) continue
        try {
          if (turf.booleanPointInPolygon(point, feature)) {
            inProtected = true
            break
          }
        } catch {}
      }

      // 50km buffer analysis
      const buffer = turf.buffer(point, 50, { units: 'kilometers' }) as any
      for (const feature of features) {
        if (!feature || !feature.geometry) continue
        try {
          if (turf.booleanIntersects(buffer, feature)) {
            nearProtected = true
            break
          }
        } catch {}
      }

      // Calculate actual distance to nearest boundary
      for (const feature of features) {
        if (!feature || !feature.geometry) continue
        try {
          const distance = turf.pointToPolygonDistance(point, feature, { units: 'kilometers' })
          if (distance < minDistance) minDistance = distance
        } catch {}
      }

      return {
        inProtected,
        nearProtected,
        distance: minDistance === Infinity ? -1 : Math.round(minDistance * 10) / 10,
      }
    } catch {
      // Turf.js analysis failed, fall through to fallback
    }
  }

  // Fallback: Known protected area clusters in China
  const KNOWN_PROTECTED_REGIONS = [
    { name: '神农架', lat: 31.5, lng: 110.5, radiusKm: 50 },
    { name: '卧龙', lat: 30.8, lng: 103.0, radiusKm: 40 },
    { name: '长白山', lat: 42.0, lng: 128.0, radiusKm: 60 },
    { name: '武夷山', lat: 27.7, lng: 117.8, radiusKm: 45 },
    { name: '西双版纳', lat: 21.5, lng: 101.0, radiusKm: 55 },
    { name: '阿尔金山', lat: 38.5, lng: 87.5, radiusKm: 70 },
    { name: '珠穆朗玛峰', lat: 28.0, lng: 86.9, radiusKm: 60 },
    { name: '可可西里', lat: 35.0, lng: 92.0, radiusKm: 80 },
    { name: '秦岭', lat: 34.0, lng: 108.5, radiusKm: 50 },
    { name: '大熊猫栖息地', lat: 30.5, lng: 105.0, radiusKm: 70 },
  ]

  let minDistance = Infinity
  let nearProtected = false

  for (const region of KNOWN_PROTECTED_REGIONS) {
    const dx = (lng - region.lng) * Math.cos(lat * Math.PI / 180) * 111
    const dy = (lat - region.lat) * 111
    const distanceKm = Math.sqrt(dx * dx + dy * dy)

    if (distanceKm < region.radiusKm) {
      if (distanceKm < minDistance) minDistance = distanceKm
      if (distanceKm <= NEAR_THRESHOLD_KM) nearProtected = true
    }
  }

  const inProtected = minDistance <= 0

  return {
    inProtected,
    nearProtected,
    distance: minDistance === Infinity ? -1 : Math.round(minDistance * 10) / 10,
  }
}

interface MapClickEvent {
  lat: number
  lng: number
}

interface LocateProps {
  onMapClick?: (e: MapClickEvent) => void
  onAssetAdd?: (asset: AssetLocation) => void
}

export default function Locate() {
  const { assets, setAssets, setStep, assetProtections, setAssetProtections } = useLeapStore()
  const [error, setError] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)
  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>()
  const [isCheckingProtection, setIsCheckingProtection] = useState(false)

  // Manual input state
  const [manualName, setManualName] = useState('')
  const [manualLat, setManualLat] = useState('')
  const [manualLng, setManualLng] = useState('')
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [geocodeResults, setGeocodeResults] = useState<{ lat: number; lng: number; display: string }[]>([])
  const [showGeocodeResults, setShowGeocodeResults] = useState(false)
  const [clickedPoint, setClickedPoint] = useState<{ lat: number; lng: number } | null>(null)

  // CSV upload
  const handleFileUpload = useCallback((file: File) => {
    setError('')
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as Record<string, string>[]
        if (data.length === 0) {
          setError('CSV 文件为空')
          return
        }

        const headers = Object.keys(data[0])
        const requiredCols = ['name', 'lat', 'lng']
        const missing = requiredCols.filter((col) => !headers.includes(col))

        if (missing.length > 0) {
          setError(`缺少必需列: ${missing.join(', ')}。需要: name, lat, lng`)
          return
        }

        const parsed: AssetLocation[] = data.map((row, i) => ({
          id: `asset-${Date.now()}-${i}`,
          name: row.name,
          lat: parseFloat(row.lat),
          lng: parseFloat(row.lng),
          sensitivity: 'medium',
        }))

        // Check WDPA for each
        setIsCheckingProtection(true)
        const protectionResults: Record<string, AssetProtection> = {}
        await Promise.all(
          parsed.map(async (asset) => {
            protectionResults[asset.id] = await checkProtectedArea(asset.lat, asset.lng)
          })
        )
        setAssetProtections(protectionResults)
        setIsCheckingProtection(false)
        setAssets(parsed)
      },
      error: (err) => setError(`CSV 解析失败: ${err.message}`),
    })
  }, [setAssets])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.csv')) {
      handleFileUpload(file)
    } else {
      setError('请上传 CSV 文件')
    }
  }, [handleFileUpload])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
  }

  // Geocode search
  const handleGeocodeSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setGeocodeResults([])
      setShowGeocodeResults(false)
      return
    }
    setIsGeocoding(true)
    const results: { lat: number; lng: number; display: string }[] = []
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=zh-CN`
      )
      const data = await res.json()
      for (const item of data) {
        results.push({
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          display: item.display_name,
        })
      }
    } catch {
      // ignore
    }
    setGeocodeResults(results)
    setShowGeocodeResults(results.length > 0)
    setIsGeocoding(false)
  }, [])

  // Add asset from geocode result
  const addAssetFromGeocode = useCallback(async (result: { lat: number; lng: number; display: string }) => {
    const shortName = result.display.split(',')[0]
    const id = `asset-${Date.now()}`
    const newAsset: AssetLocation = {
      id,
      name: shortName,
      lat: result.lat,
      lng: result.lng,
      sensitivity: 'medium',
    }

    const protection = await checkProtectedArea(result.lat, result.lng)
    setAssetProtections({ ...assetProtections, [id]: protection })
    setAssets([...assets, newAsset])
    setManualName('')
    setGeocodeResults([])
    setShowGeocodeResults(false)
  }, [assets, setAssets])

  // Add asset from manual coordinates
  const handleAddManual = useCallback(async () => {
    const lat = parseFloat(manualLat)
    const lng = parseFloat(manualLng)
    if (isNaN(lat) || isNaN(lng)) {
      setError('请输入有效的经纬度')
      return
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError('经纬度超出有效范围')
      return
    }

    const id = `asset-${Date.now()}`
    const newAsset: AssetLocation = {
      id,
      name: manualName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      lat,
      lng,
      sensitivity: 'medium',
    }

    const isProtected = await checkProtectedArea(lat, lng)
    setAssetProtections({ ...assetProtections, [id]: isProtected })
    setAssets([...assets, newAsset])
    setManualName('')
    setManualLat('')
    setManualLng('')
    setClickedPoint(null)
    setError('')
  }, [assets, manualName, manualLat, manualLng, setAssets, assetProtections])

  // Add asset from map click
  const handleAddFromMapClick = useCallback(async () => {
    if (!clickedPoint) return
    const id = `asset-${Date.now()}`
    const newAsset: AssetLocation = {
      id,
      name: `点击添加 (${clickedPoint.lat.toFixed(4)}, ${clickedPoint.lng.toFixed(4)})`,
      lat: clickedPoint.lat,
      lng: clickedPoint.lng,
      sensitivity: 'medium',
    }
    const protection = await checkProtectedArea(clickedPoint.lat, clickedPoint.lng)
    setAssetProtections({ ...assetProtections, [id]: protection })
    setAssets([...assets, newAsset])
    setClickedPoint(null)
  }, [assets, clickedPoint, setAssets, assetProtections])

  // Delete asset
  const handleDeleteAsset = (id: string) => {
    setAssets(assets.filter((a) => a.id !== id))
    setAssetProtections(
      Object.fromEntries(
        Object.entries(assetProtections).filter(([key]) => key !== id)
      )
    )
    if (selectedAssetId === id) setSelectedAssetId(undefined)
  }

  const selectedAsset = assets.find((a) => a.id === selectedAssetId)

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-8 h-8 rounded-full bg-[#2d5a3d] text-white text-sm font-semibold flex items-center justify-center">L</span>
          <h2 className="text-3xl font-semibold text-[#1a1a18]" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
            定位资产
          </h2>
        </div>
        <p className="text-[#5c5c52] pl-11">
          在地图上搜索、点击或输入坐标添加资产，识别生态敏感区域与保护区
        </p>
      </div>

      {/* Map - Full Width at Top */}
      <div className="mb-6">
        <div className="relative rounded-2xl overflow-hidden border border-[#e5e0d8] shadow-inner" style={{ height: '480px' }}>
          <AssetMap
            assets={assets}
            selectedId={selectedAssetId}
            onSelectAsset={setSelectedAssetId}
            onMapClick={(e) => setClickedPoint({ lat: e.lat, lng: e.lng })}
          />

          {/* Map Overlay: Search Box */}
          <div className="absolute top-4 left-4 right-4 z-[1000] max-w-md">
            <div className="relative">
              <div className="flex items-center gap-2 bg-white rounded-xl shadow-lg px-4 py-2 border border-[#e5e0d8]">
                <Search className="w-4 h-4 text-[#8a8a7e] flex-shrink-0" />
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => {
                    setManualName(e.target.value)
                    handleGeocodeSearch(e.target.value)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && geocodeResults.length > 0) {
                      addAssetFromGeocode(geocodeResults[0])
                    }
                  }}
                  placeholder="搜索地点名称，回车添加第一个结果..."
                  className="flex-1 text-sm text-[#1a1a18] outline-none placeholder:text-[#8a8a7e]"
                />
                {isGeocoding && (
                  <Globe className="w-4 h-4 text-[#8a8a7e] animate-pulse flex-shrink-0" />
                )}
                {manualName && !isGeocoding && (
                  <button
                    onClick={() => { setManualName(''); setGeocodeResults([]); setShowGeocodeResults(false) }}
                    className="text-[#8a8a7e] hover:text-[#1a1a18]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Geocode Results Dropdown */}
              {showGeocodeResults && geocodeResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-[#e5e0d8] overflow-hidden z-[1001]">
                  {geocodeResults.map((result, i) => (
                    <button
                      key={i}
                      onClick={() => addAssetFromGeocode(result)}
                      className="w-full px-4 py-3 text-left hover:bg-[#faf8f5] transition-colors border-b border-[#e5e0d8] last:border-b-0"
                    >
                      <p className="text-sm text-[#1a1a18] font-medium truncate">{result.display.split(',')[0]}</p>
                      <p className="text-xs text-[#8a8a7e] truncate">{result.display}</p>
                      <p className="text-xs text-[#4a7c59] font-mono mt-0.5">
                        {result.lat.toFixed(5)}, {result.lng.toFixed(5)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Clicked Point Indicator */}
            {clickedPoint && (
              <div className="absolute top-full left-0 mt-2 flex items-center gap-2 bg-[#c9a962] text-white rounded-xl shadow-lg px-4 py-2 z-[1001]">
                <Crosshair className="w-4 h-4" />
                <span className="text-sm font-mono">
                  {clickedPoint.lat.toFixed(5)}, {clickedPoint.lng.toFixed(5)}
                </span>
                <button
                  onClick={() => setClickedPoint(null)}
                  className="ml-1 hover:opacity-70"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                <button
                  onClick={handleAddFromMapClick}
                  className="ml-1 flex items-center gap-1 bg-white/20 hover:bg-white/30 rounded-lg px-2 py-0.5"
                >
                  <Plus className="w-3 h-3" />
                  <span className="text-xs">添加</span>
                </button>
              </div>
            )}
          </div>

          {/* Map Legend */}
          <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-xl shadow px-3 py-2 border border-[#e5e0d8]">
            <p className="text-xs text-[#8a8a7e]">
              <span className="inline-block w-2 h-2 rounded-full bg-[#2d5a3d] mr-1" /> 资产位置
              <span className="inline-block w-2 h-2 rounded-full bg-[#c9a962] ml-3 mr-1" /> 保护区
            </p>
          </div>
        </div>
      </div>

      {/* Input Panel below Map */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Coordinate Input */}
        <div className="bg-white rounded-2xl border border-[#e5e0d8] p-6 shadow-sm">
          <h3 className="font-semibold text-[#1a1a18] mb-4 flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-[#4a7c59]" />
            手动输入坐标
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="资产名称（可选）"
              className="w-full px-4 py-3 bg-[#faf8f5] border border-[#e5e0d8] rounded-xl text-[#1a1a18] text-sm outline-none focus:ring-2 focus:ring-[#4a7c59] focus:border-[#4a7c59] transition-all"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                placeholder="纬度 lat"
                step="any"
                className="w-full px-4 py-3 bg-[#faf8f5] border border-[#e5e0d8] rounded-xl text-[#1a1a18] text-sm outline-none focus:ring-2 focus:ring-[#4a7c59] focus:border-[#4a7c59] transition-all font-mono"
              />
              <input
                type="number"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                placeholder="经度 lng"
                step="any"
                className="w-full px-4 py-3 bg-[#faf8f5] border border-[#e5e0d8] rounded-xl text-[#1a1a18] text-sm outline-none focus:ring-2 focus:ring-[#4a7c59] focus:border-[#4a7c59] transition-all font-mono"
              />
            </div>
            <button
              onClick={handleAddManual}
              disabled={!manualLat || !manualLng}
              className="w-full py-3 bg-[#2d5a3d] text-white rounded-xl hover:bg-[#4a7c59] disabled:bg-[#e5e0d8] disabled:cursor-not-allowed transition-all font-medium flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              添加资产
            </button>
          </div>
          {error && (
            <div className="mt-3 p-3 bg-[#d4736a]/10 rounded-xl flex items-center gap-2 text-[#d4736a] text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* CSV Upload */}
        <div
          className={`
            relative rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-300
            ${isDragging ? 'border-[#2d5a3d] bg-[#2d5a3d]/5' : 'border-[#e5e0d8] bg-white hover:border-[#4a7c59]'}
          `}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className={`w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center ${isDragging ? 'bg-[#2d5a3d] text-white' : 'bg-[#f0ebe4] text-[#4a7c59]'}`}>
            <Upload className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-[#1a1a18] mb-1">拖拽 CSV 文件上传</p>
          <p className="text-xs text-[#8a8a7e] mb-3">或点击选择文件</p>
          <div className="flex items-center justify-center gap-2 text-xs text-[#8a8a7e] mb-4">
            <code className="px-2 py-0.5 bg-[#f0ebe4] rounded">name</code>
            <code className="px-2 py-0.5 bg-[#f0ebe4] rounded">lat</code>
            <code className="px-2 py-0.5 bg-[#f0ebe4] rounded">lng</code>
          </div>
          <input type="file" accept=".csv" onChange={handleFileInput} className="hidden" id="csv-upload-locate" />
          <label htmlFor="csv-upload-locate" className="inline-block px-4 py-2 bg-[#f0ebe4] text-[#4a7c59] rounded-lg cursor-pointer hover:bg-[#e5e0d8] transition-colors text-sm font-medium">
            选择 CSV
          </label>
        </div>
      </div>

      {/* Assets Status Bar */}
      {assets.length > 0 && (
        <div className="mb-6 animate-fade-in-up">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-[#e5e0d8] shadow-sm">
              <MapPin className="w-4 h-4 text-[#4a7c59]" />
              <span className="text-sm text-[#1a1a18]">
                <span className="font-semibold text-[#2d5a3d]">{assets.length}</span> 个资产
              </span>
            </div>
            {Object.values(assetProtections).some(p => p.inProtected || p.nearProtected) && (
              <div className="flex items-center gap-2 px-4 py-2 bg-[#c9a962]/10 rounded-xl border border-[#c9a962]/20">
                <Shield className="w-4 h-4 text-[#8a6a2a]" />
                <span className="text-sm text-[#8a6a2a]">
                  <span className="font-semibold">
                    {Object.values(assetProtections).filter(p => p.inProtected || p.nearProtected).length}
                  </span> 个涉及保护区
                </span>
              </div>
            )}
            {isCheckingProtection && (
              <div className="flex items-center gap-2 px-4 py-2 bg-[#f0ebe4] rounded-xl border border-[#e5e0d8]">
                <Globe className="w-4 h-4 text-[#8a8a7e] animate-pulse" />
                <span className="text-sm text-[#8a8a7e]">查询 WDPA 保护区...</span>
              </div>
            )}
            <button
              onClick={() => { setAssets([]); setSelectedAssetId(undefined); setAssetProtections({}) }}
              className="ml-auto text-sm text-[#8a8a7e] hover:text-[#d4736a] transition-colors"
            >
              清除全部
            </button>
          </div>

          {/* Asset Cards */}
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {assets.map((asset) => {
              const protection = assetProtections[asset.id]
              const hasProtection = protection?.inProtected || protection?.nearProtected
              const isSelected = selectedAssetId === asset.id
              return (
                <div
                  key={asset.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedAssetId(isSelected ? undefined : asset.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedAssetId(isSelected ? undefined : asset.id) }}
                  className={`
                    relative p-4 rounded-xl border text-left transition-all cursor-pointer
                    ${isSelected ? 'bg-[#2d5a3d]/5 border-[#2d5a3d]/30 shadow-sm' : 'bg-white border-[#e5e0d8] hover:border-[#4a7c59]/30 hover:shadow-sm'}
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${hasProtection ? 'bg-[#c9a962]/10 text-[#8a6a2a]' : 'bg-[#2d5a3d]/10 text-[#2d5a3d]'}`}>
                      {hasProtection ? <Shield className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#1a1a18] text-sm truncate">{asset.name}</p>
                      <p className="text-xs text-[#8a8a7e] font-mono mt-0.5">
                        {asset.lat.toFixed(4)}, {asset.lng.toFixed(4)}
                      </p>
                      {hasProtection && (
                        <span className="inline-flex items-center gap-0.5 mt-1 px-1.5 py-0.5 bg-[#c9a962]/10 text-[#8a6a2a] text-xs rounded-full">
                          <Shield className="w-2.5 h-2.5" />
                          {protection.inProtected ? '保护区内' : `附近 ${protection.distance}km`}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteAsset(asset.id) }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-lg text-[#8a8a7e] hover:text-[#d4736a] hover:bg-[#d4736a]/10 flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )
            })}
          </div>

          {/* Continue Button */}
          <div className="mt-6 flex justify-end">
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

      {/* Sample CSV hint */}
      {assets.length === 0 && (
        <div className="mt-6 p-4 bg-[#f0ebe4]/50 rounded-xl border border-[#e5e0d8]">
          <p className="text-xs text-[#8a8a7e] text-center">
            💡 提示：也可以在地图上点击选择位置，或搜索地名添加资产
          </p>
        </div>
      )}
    </div>
  )
}
