import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Parse CSV line handling quoted fields with commas inside
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

// Parse the ENCORE dependency CSV
function parseENCOREcsv(filePath: string): {
  headers: string[]
  rows: Record<string, string>[]
} {
  const content = fs.readFileSync(filePath, 'utf-8')
  // Remove BOM
  const clean = content.replace(/^\uFEFF/, '')
  const lines = clean.split('\n').filter(l => l.trim())

  if (lines.length < 2) return { headers: [], rows: [] }

  const headers = parseCSVLine(lines[0])
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length >= headers.length) {
      const row: Record<string, string> = {}
      headers.forEach((h, idx) => { row[h] = values[idx] || '' })
      rows.push(row)
    }
  }

  return { headers, rows }
}

// Parse level from ENCORE text value
function parseLevel(value: string): 'high' | 'medium' | 'low' | 'none' {
  if (!value || value === '' || value === 'NA' || value === 'N/A') return 'none'
  const v = value.toLowerCase()
  if (v.includes('high') || v.includes('critical') || v.includes('very high')) return 'high'
  if (v.includes('medium') || v.includes('moderate')) return 'medium'
  if (v.includes('low')) return 'low'
  return 'none'
}

// Map ENCORE ecosystem service codes to readable names
const ECOSYSTEM_SERVICE_NAMES: Record<string, string> = {
  'Biomass provisioning': '生物质供给',
  'Water supply': '水资源供给',
  'Water purification': '水净化',
  'Soil quality regulation': '土壤质量调节',
  'Soil and sediment retention': '土壤与沉积物保持',
  'Air quality regulation': '空气质量调节',
  'Climate regulation': '气候调节',
  'Carbon sequestration': '碳汇',
  'Pollination': '授粉',
  'Natural hazard regulation': '自然灾害调节',
  'Biodiversity': '生物多样性',
  'Recreation': '休闲游憩',
  'Cultural services': '文化服务',
  'Energy supply': '能源供给',
  'Materials and water for production': '生产用材料和水',
  'Waste remediation': '废物治理',
}

// Map impact driver codes
const IMPACT_DRIVER_NAMES: Record<string, string> = {
  'GHG emissions': '温室气体排放',
  'Water withdrawals': '水资源开采',
  'Land use change': '土地利用变化',
  'Soil pollution': '土壤污染',
  'Water pollution': '水污染',
  'Air pollution': '空气污染',
  'Waste generation': '废物产生',
  'Noise and vibrations': '噪声与振动',
  'Emissions of GHG': '温室气体排放量',
  'Emissions of non-GHG air pollutants': '非温室气体空气污染物排放',
  'Emissions to water': '水体污染物排放',
  'Solid waste': '固体废物',
  'Use of energy': '能源使用',
  'Use of water': '水资源使用',
  'Land use': '土地利用',
  'Ecosystem interactions': '生态系统相互作用',
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ isic: string }> }
) {
  try {
    const { isic } = await params

    // Path to ENCORE data files
    const dataDir = path.join(process.cwd(), 'data', 'Updated ENCORE knowledge base September 2025', 'ENCORE files')
    const depPath = path.join(dataDir, '03. Dependency links.csv')
    const pressPath = path.join(dataDir, '05. Pressure links.csv')

    if (!fs.existsSync(depPath)) {
      return NextResponse.json({ error: 'ENCORE data not found' }, { status: 404 })
    }

    const { headers: depHeaders, rows: depRows } = parseENCOREcsv(depPath)
    const { rows: pressRows } = parseENCOREcsv(pressPath)

    // Find the row for this ISIC code
    const depRow = depRows.find(r =>
      r['ISIC Unique code'] === isic ||
      r['ISIC Unique code']?.startsWith(isic.split('_')[0])
    )

    const pressRow = pressRows.find(r =>
      r['ISIC Unique code'] === isic ||
      r['ISIC Unique code']?.startsWith(isic.split('_')[0])
    )

    if (!depRow) {
      return NextResponse.json({ error: 'Sector not found in ENCORE database' }, { status: 404 })
    }

    // Extract dependencies (ecosystem services)
    const dependencies: { service: string; serviceCn: string; level: string; raw: string }[] = []
    for (const [key, value] of Object.entries(depRow)) {
      if (key === 'ISIC Unique code' || key === 'ISIC level used for analysis') continue
      const level = parseLevel(value as string)
      if (level !== 'none') {
        dependencies.push({
          service: key,
          serviceCn: ECOSYSTEM_SERVICE_NAMES[key] || key,
          level,
          raw: value as string,
        })
      }
    }

    // Extract impacts (pressure drivers)
    const impacts: { driver: string; driverCn: string; level: string; raw: string }[] = []
    if (pressRow) {
      for (const [key, value] of Object.entries(pressRow)) {
        if (key === 'ISIC Unique code') continue
        const level = parseLevel(value as string)
        if (level !== 'none') {
          impacts.push({
            driver: key,
            driverCn: IMPACT_DRIVER_NAMES[key] || key,
            level,
            raw: value as string,
          })
        }
      }
    }

    // Sort by level priority (high first)
    const levelOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
    dependencies.sort((a, b) => (levelOrder[a.level] ?? 3) - (levelOrder[b.level] ?? 3))
    impacts.sort((a, b) => (levelOrder[a.level] ?? 3) - (levelOrder[b.level] ?? 3))

    // Calculate risk scores
    const depHighCount = dependencies.filter(d => d.level === 'high').length
    const depMediumCount = dependencies.filter(d => d.level === 'medium').length
    const impactHighCount = impacts.filter(d => d.level === 'high').length
    const impactMediumCount = impacts.filter(d => d.level === 'medium').length

    const dependencyScore = depHighCount * 3 + depMediumCount * 2
    const impactScore = impactHighCount * 3 + impactMediumCount * 2

    return NextResponse.json({
      isic,
      dependencies,
      impacts,
      summary: {
        totalDependencies: dependencies.length,
        totalImpacts: impacts.length,
        highDepCount: depHighCount,
        mediumDepCount: depMediumCount,
        highImpactCount: impactHighCount,
        mediumImpactCount: impactMediumCount,
        dependencyScore,
        impactScore,
        overallRiskLevel:
          dependencyScore > 10 || impactScore > 10 ? 'high' :
          dependencyScore > 5 || impactScore > 5 ? 'medium' : 'low',
      },
      source: 'ENCORE Database September 2025',
      encoreUrl: `https://encoreforcapital.org/`,
    })
  } catch (error) {
    console.error('ENCORE profile error:', error)
    return NextResponse.json({ error: 'Failed to load ENCORE profile' }, { status: 500 })
  }
}
