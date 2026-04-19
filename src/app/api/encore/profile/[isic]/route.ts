import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// ENCORE ecosystem service names → Chinese translations
const SERVICE_CN: Record<string, string> = {
  'Other provisioning services - Animal-based energy': '动物性能源服务',
  'Biomass provisioning': '生物质供给',
  'Solid waste remediation': '固体废物治理',
  'Soil and sediment retention': '土壤与沉积物保持',
  'Water purification': '水净化',
  'Soil quality regulation': '土壤质量调节',
  'Other regulating and maintenance service - Dilution by atmosphere and ecosystems': '大气与生态系统稀释',
  'Biological control': '生物控制',
  'Air Filtration': '空气过滤',
  'Flood mitigation services': '洪水缓解服务',
  'Genetic material': '遗传物质',
  'Global climate regulation': '全球气候调节',
  'Water supply': '水资源供给',
  'Nursery population and habitat maintenance': '苗圃与栖息地维护',
  'Noise attenuation': '噪声衰减',
  'Other regulating and maintenance service - Mediation of sensory impacts (other than noise)': '感官中介服务',
  'Local (micro and meso) climate regulation': '局地气候调节',
  'Pollination': '授粉',
  'Storm mitigation': '风暴缓解',
  'Water flow regulation': '水流调节',
  'Rainfall pattern regulation': '降雨模式调节',
  'Recreation related services': '休闲游憩服务',
  'Visual amenity services': '视觉美化服务',
  'Education, scientific and research services': '教育科研服务',
  'Spiritual, artistic and symbolic services': '精神艺术象征服务',
}

// ENCORE pressure drivers → Chinese translations
const PRESSURE_CN: Record<string, string> = {
  'Disturbances (e.g noise, light)': '噪声与光干扰',
  'Area of freshwater use': '淡水资源利用面积',
  'Emissions of GHG': '温室气体排放',
  'Area of seabed use': '海底利用面积',
  'Emissions of non-GHG air pollutants': '非温室气体空气污染物排放',
  'Other biotic resource extraction (e.g. fish, timber)': '生物资源开采',
  'Other abiotic resource extraction': '非生物资源开采',
  'Emissions of toxic soil and water pollutants': '有毒土壤和水污染物排放',
  'Emissions of nutrient soil and water pollutants': '营养性土壤和水污染物排放',
  'Generation and release of solid waste': '固体废物产生与排放',
  'Area of land use': '土地利用面积',
  'Volume of water use': '水资源利用量',
  'Introduction of invasive species': '外来物种入侵',
}

// Rating display config
const RATING_CONFIG: Record<string, { label: string; labelCn: string }> = {
  VH: { label: 'Very High', labelCn: '极高' },
  H: { label: 'High', labelCn: '高' },
  M: { label: 'Medium', labelCn: '中' },
  L: { label: 'Low', labelCn: '低' },
  VL: { label: 'Very Low', labelCn: '极低' },
  'N/A': { label: 'Not Applicable', labelCn: '不适用' },
  ND: { label: 'No Data', labelCn: '无数据' },
}

interface EncoreProfile {
  dependencies: Array<{
    service: string
    serviceCn: string
    rating: string
    ratingCn: string
    level: 'high' | 'medium' | 'low' | 'none'
  }>
  impacts: Array<{
    driver: string
    driverCn: string
    rating: string
    ratingCn: string
    level: 'high' | 'medium' | 'low' | 'none'
  }>
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

// Load pre-computed ENCORE profiles
let encoreProfiles: Record<string, any> = {}
let encoreSectors: any = {}

function loadData() {
  if (Object.keys(encoreProfiles).length > 0) return

  try {
    const dataDir = path.join(process.cwd(), 'data')
    const profilesPath = path.join(dataDir, 'encore_profiles.json')
    const sectorsPath = path.join(dataDir, 'encore_sectors.json')

    if (fs.existsSync(profilesPath)) {
      encoreProfiles = JSON.parse(fs.readFileSync(profilesPath, 'utf-8'))
    }
    if (fs.existsSync(sectorsPath)) {
      encoreSectors = JSON.parse(fs.readFileSync(sectorsPath, 'utf-8'))
    }
  } catch (error) {
    console.error('Failed to load ENCORE data:', error)
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ isic: string }> }
) {
  loadData()

  try {
    const { isic } = await params
    const decodedIsic = decodeURIComponent(isic)

    // Find the profile
    let profile = encoreProfiles[decodedIsic]

    // If not found, try to find by prefix match
    if (!profile) {
      const prefix = decodedIsic.split('_').slice(0, 3).join('_')
      for (const key of Object.keys(encoreProfiles)) {
        if (key.startsWith(prefix)) {
          profile = encoreProfiles[key]
          break
        }
      }
    }

    if (!profile) {
      return NextResponse.json(
        { error: `ISIC code "${decodedIsic}" not found in ENCORE database` },
        { status: 404 }
      )
    }

    // Find sector info
    const sectorInfo = encoreSectors.sectors?.find((s: any) => s.isic === decodedIsic)

    // Parse dependencies
    const dependencies: EncoreProfile['dependencies'] = []
    for (const [service, data] of Object.entries(profile.dependencies || {})) {
      const d = data as { rating: string; level: string }
      if (d.level !== 'none') {
        dependencies.push({
          service,
          serviceCn: SERVICE_CN[service] || service,
          rating: d.rating,
          ratingCn: RATING_CONFIG[d.rating]?.labelCn || d.rating,
          level: d.level as 'high' | 'medium' | 'low' | 'none',
        })
      }
    }

    // Parse impacts
    const impacts: EncoreProfile['impacts'] = []
    for (const [driver, data] of Object.entries(profile.impacts || {})) {
      const d = data as { rating: string; level: string }
      if (d.level !== 'none') {
        impacts.push({
          driver,
          driverCn: PRESSURE_CN[driver] || driver,
          rating: d.rating,
          ratingCn: RATING_CONFIG[d.rating]?.labelCn || d.rating,
          level: d.level as 'high' | 'medium' | 'low' | 'none',
        })
      }
    }

    // Sort by level priority (high first), then by rating
    const levelOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
    dependencies.sort((a, b) => {
      const levelDiff = (levelOrder[a.level] ?? 3) - (levelOrder[b.level] ?? 3)
      if (levelDiff !== 0) return levelDiff
      const ratingOrder: Record<string, number> = { VH: 0, H: 1, M: 2, L: 3, VL: 4 }
      return (ratingOrder[a.rating] ?? 5) - (ratingOrder[b.rating] ?? 5)
    })
    impacts.sort((a, b) => {
      const levelDiff = (levelOrder[a.level] ?? 3) - (levelOrder[b.level] ?? 3)
      if (levelDiff !== 0) return levelDiff
      const ratingOrder: Record<string, number> = { VH: 0, H: 1, M: 2, L: 3, VL: 4 }
      return (ratingOrder[a.rating] ?? 5) - (ratingOrder[b.rating] ?? 5)
    })

    // Calculate risk scores: VH=4, H=3, M=2, L=1 (weighted)
    const ratingScore: Record<string, number> = { VH: 4, H: 3, M: 2, L: 1, VL: 0 }
    const depHighCount = dependencies.filter(d => d.level === 'high').length
    const depMediumCount = dependencies.filter(d => d.level === 'medium').length
    const depLowCount = dependencies.filter(d => d.level === 'low').length

    const impactHighCount = impacts.filter(i => i.level === 'high').length
    const impactMediumCount = impacts.filter(i => i.level === 'medium').length
    const impactLowCount = impacts.filter(i => i.level === 'low').length

    const dependencyScore = dependencies.reduce((sum, d) => sum + (ratingScore[d.rating] || 0), 0)
    const impactScore = impacts.reduce((sum, i) => sum + (ratingScore[i.rating] || 0), 0)

    const result: EncoreProfile = {
      dependencies,
      impacts,
      summary: {
        totalDependencies: dependencies.length,
        totalImpacts: impacts.length,
        highDepCount: depHighCount,
        mediumDepCount: depMediumCount,
        lowDepCount: depLowCount,
        highImpactCount: impactHighCount,
        mediumImpactCount: impactMediumCount,
        lowImpactCount: impactLowCount,
        dependencyScore,
        impactScore,
        overallRiskLevel:
          dependencyScore >= 10 || impactScore >= 10 ? 'high' :
          dependencyScore >= 5 || impactScore >= 5 ? 'medium' : 'low',
      },
      isicInfo: sectorInfo ? {
        code: sectorInfo.isic,
        name: sectorInfo.name,
        section: sectorInfo.section,
        category: sectorInfo.category,
      } : {
        code: decodedIsic,
        name: decodedIsic,
        section: 'Unknown',
        category: 'Unknown',
      },
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('ENCORE profile error:', error)
    return NextResponse.json({ error: 'Failed to load ENCORE profile' }, { status: 500 })
  }
}
