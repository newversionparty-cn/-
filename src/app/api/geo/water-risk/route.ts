import { NextRequest, NextResponse } from 'next/server'

// Water risk analysis based on geographic location
// Uses latitude, aridity index, and China-specific water stress basins

interface WaterRiskAnalysis {
  location: { lat: number; lng: number }
  region: string
  waterStress: 'extreme' | 'high' | 'medium' | 'low' | 'unknown'
  waterStressScore: number  // 0-5 scale (WRI Aqueduct style)
  waterStressLabel: string
  aridityIndex: number  // <0.03 = hyper arid, <0.2 = arid, <0.5 = semi-arid, >0.5 = humid
  aridityLabel: string
  droughtRisk: 'extreme' | 'high' | 'medium' | 'low' | 'unknown'
  floodRisk: 'extreme' | 'high' | 'medium' | 'low' | 'unknown'
  groundwaterStress: 'high' | 'medium' | 'low' | 'unknown'
  riverBasin: string
  keyRisks: string[]
  recommendation: string
}

// China's major river basins and their water stress levels
// Source: China Ministry of Water Resources, World Bank
const CHINA_BASINS: Array<{
  name: string
  namesCn: string
  latRange: [number, number]
  lngRange: [number, number]
  waterStress: 'extreme' | 'high' | 'medium' | 'low'
  droughtRisk: 'extreme' | 'high' | 'medium' | 'low'
  floodRisk: 'extreme' | 'high' | 'medium' | 'low'
  groundwaterStress: 'high' | 'medium' | 'low'
}> = [
  {
    name: 'Hai River Basin',
    namesCn: '海河流域',
    latRange: [35, 43],
    lngRange: [112, 120],
    waterStress: 'extreme',
    droughtRisk: 'high',
    floodRisk: 'medium',
    groundwaterStress: 'high',
  },
  {
    name: 'Yellow River Basin',
    namesCn: '黄河流域',
    latRange: [32, 42],
    lngRange: [95, 118],
    waterStress: 'extreme',
    droughtRisk: 'high',
    floodRisk: 'medium',
    groundwaterStress: 'high',
  },
  {
    name: 'Huai River Basin',
    namesCn: '淮河流域',
    latRange: [31, 35],
    lngRange: [111, 122],
    waterStress: 'high',
    droughtRisk: 'medium',
    floodRisk: 'high',
    groundwaterStress: 'medium',
  },
  {
    name: 'Yangtze River Basin',
    namesCn: '长江流域',
    latRange: [25, 35],
    lngRange: [90, 122],
    waterStress: 'medium',
    droughtRisk: 'medium',
    floodRisk: 'high',
    groundwaterStress: 'low',
  },
  {
    name: 'Pearl River Basin',
    namesCn: '珠江流域',
    latRange: [21, 27],
    lngRange: [102, 117],
    waterStress: 'medium',
    droughtRisk: 'low',
    floodRisk: 'high',
    groundwaterStress: 'low',
  },
  {
    name: 'Liao River Basin',
    namesCn: '辽河流域',
    latRange: [40, 46],
    lngRange: [115, 125],
    waterStress: 'high',
    droughtRisk: 'high',
    floodRisk: 'medium',
    groundwaterStress: 'high',
  },
  {
    name: 'Songhua River Basin',
    namesCn: '松花江流域',
    latRange: [42, 52],
    lngRange: [120, 132],
    waterStress: 'medium',
    droughtRisk: 'medium',
    floodRisk: 'medium',
    groundwaterStress: 'medium',
  },
  {
    name: 'Southwest Rivers',
    namesCn: '西南诸河流域',
    latRange: [21, 28],
    lngRange: [97, 110],
    waterStress: 'low',
    droughtRisk: 'low',
    floodRisk: 'high',
    groundwaterStress: 'low',
  },
  {
    name: 'Northwest Inland Rivers',
    namesCn: '西北内陆河流域',
    latRange: [35, 50],
    lngRange: [75, 98],
    waterStress: 'extreme',
    droughtRisk: 'extreme',
    floodRisk: 'low',
    groundwaterStress: 'high',
  },
  {
    name: 'Southeast Coastal Rivers',
    namesCn: '东南沿海河流',
    latRange: [22, 28],
    lngRange: [117, 125],
    waterStress: 'medium',
    droughtRisk: 'low',
    floodRisk: 'high',
    groundwaterStress: 'medium',
  },
]

// Calculate aridity index based on latitude and longitude (simplified)
function calculateAridityIndex(lat: number, lng: number): { index: number; label: string } {
  // Approximation based on global aridity patterns
  // Hyper arid: <0.03 (deserts like Sahara, Gobi)
  // Arid: 0.03-0.2 (Middle East, Central Asia, Northern China)
  // Semi-arid: 0.2-0.5 (Transitional zones)
  // Humid: >0.5 (Tropical, Subtropical, Eastern China)

  const absLat = Math.abs(lat)

  if (absLat > 25 && absLat < 40) {
    // Subtropical zone - could be humid or arid depending on location
    if (lat > 25 && lat < 35 && lng >= 100 && lng <= 120) {
      // East China (monsoon influenced) - humid
      return { index: 0.65, label: '湿润 (Humid)' }
    } else {
      // Inland/transition - semi-arid to arid
      return { index: 0.35, label: '半湿润 (Semi-humid)' }
    }
  } else if (absLat >= 40) {
    // Temperate zone - generally more arid in inland areas
    if (lat > 40 && lat < 50 && lng > 100 && lng < 125) {
      return { index: 0.45, label: '半湿润 (Semi-humid)' }
    } else {
      return { index: 0.2, label: '干旱 (Arid)' }
    }
  } else {
    // Tropical/subtropical - generally humid
    return { index: 0.75, label: '湿润 (Humid)' }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lng = parseFloat(searchParams.get('lng') || '0')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
  }

  // Find which basin this location belongs to
  const matchedBasin = CHINA_BASINS.find(basin =>
    lat >= basin.latRange[0] && lat <= basin.latRange[1] &&
    lng >= basin.lngRange[0] && lng <= basin.lngRange[1]
  )

  // Calculate aridity index
  const { index: aridityIndex, label: aridityLabel } = calculateAridityIndex(lat, lng)

  // Determine water stress score (0-5, WRI Aqueduct scale)
  const waterStressScoreMap: Record<string, number> = {
    'extreme': 5,
    'high': 4,
    'medium': 3,
    'low': 1,
    'unknown': 2,
  }

  const waterStress = matchedBasin?.waterStress || 'unknown'
  const waterStressScore = waterStressScoreMap[waterStress]

  const waterStressLabelMap: Record<string, string> = {
    'extreme': '极严重 (Extremely High)',
    'high': '严重 (High)',
    'medium': '中等 (Medium)',
    'low': '较低 (Low)',
    'unknown': '未知 (Unknown)',
  }

  // Build key risks
  const keyRisks: string[] = []
  if (waterStress === 'extreme' || waterStress === 'high') {
    keyRisks.push('水资源短缺：区域水资源供给严重不足，制约产业发展')
  }
  if (matchedBasin?.droughtRisk === 'high' || matchedBasin?.droughtRisk === 'extreme') {
    keyRisks.push('干旱风险：干旱频发影响水源稳定性')
  }
  if (matchedBasin?.floodRisk === 'high') {
    keyRisks.push('洪涝风险：季节性洪水威胁设施安全')
  }
  if (matchedBasin?.groundwaterStress === 'high') {
    keyRisks.push('地下水超采：过度依赖地下水导致地面沉降风险')
  }
  if (aridityIndex < 0.3) {
    keyRisks.push('蒸发量大：地表水损失严重，有效水资源利用率低')
  }

  // Build recommendation based on water stress
  const recommendationMap: Record<string, string> = {
    'extreme': '立即采取节水措施，探索非常规水资源（再生水、海水淡化），重新评估选址可行性',
    'high': '建立水资源监控体系，引入节水工艺，探索废水回收利用，考虑水源多元化',
    'medium': '制定水资源应急预案，优化用水效率，关注区域水资源政策变化',
    'low': '保持正常水资源管理，建立供水安全保障机制',
    'unknown': '建议开展专项水资源评估，明确区域水资源状况',
  }

  const result: WaterRiskAnalysis = {
    location: { lat, lng },
    region: matchedBasin?.namesCn || '未知流域',
    waterStress,
    waterStressScore,
    waterStressLabel: waterStressLabelMap[waterStress],
    aridityIndex,
    aridityLabel,
    droughtRisk: matchedBasin?.droughtRisk || 'unknown',
    floodRisk: matchedBasin?.floodRisk || 'unknown',
    groundwaterStress: matchedBasin?.groundwaterStress || 'unknown',
    riverBasin: matchedBasin?.namesCn || '未知',
    keyRisks,
    recommendation: recommendationMap[waterStress],
  }

  return NextResponse.json(result)
}
