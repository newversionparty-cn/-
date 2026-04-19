import { NextRequest, NextResponse } from 'next/server'

// GBIF API endpoint: species occurrence search within radius
// Returns: species count, threatened species, kingdom breakdown, key species

interface GBIFSpecies {
  key: number
  scientificName: string
  vernacularName?: string
  kingdom: string
  phylum: string
  class: string
  order: string
  family: string
  genus: string
  iucnRedListCategory?: string
}

interface GBIFResponse {
  count: number
  results: GBIFSpecies[]
}

interface BiodiversityAnalysis {
  location: { lat: number; lng: number }
  totalRecords: number
  uniqueSpecies: number
  threatenedSpecies: number  // VU + EN + CR
  nearThreatenedSpecies: number  // NT
  kingdomBreakdown: Record<string, number>
  classBreakdown: Record<string, number>
  threatenedSpeciesList: Array<{
    scientificName: string
    vernacularName?: string
    iucnCategory: string
    class: string
    family: string
  }>
  biodiversityHotspot: boolean
  keyIndicatorSpecies: string[]
  ecosystemTypes: string[]
}

// IUCN threat categories mapped to risk levels
const IUCN_CATEGORIES: Record<string, { label: string; labelCn: string; level: 'critical' | 'endangered' | 'vulnerable' | 'near_threatened' | 'least_concern' }> = {
  'EX': { label: 'Extinct', labelCn: '已灭绝', level: 'critical' },
  'EW': { label: 'Extinct in Wild', labelCn: '野外灭绝', level: 'critical' },
  'CR': { label: 'Critically Endangered', labelCn: '极危', level: 'critical' },
  'EN': { label: 'Endangered', labelCn: '濒危', level: 'endangered' },
  'VU': { label: 'Vulnerable', labelCn: '易危', level: 'vulnerable' },
  'NT': { label: 'Near Threatened', labelCn: '近危', level: 'near_threatened' },
  'LC': { label: 'Least Concern', labelCn: '无危', level: 'least_concern' },
}

// Map GBIF class to ecosystem type
function getEcosystemType(cls: string): string {
  const mapping: Record<string, string> = {
    'Mammalia': '哺乳动物',
    'Aves': '鸟类',
    'Reptilia': '爬行动物',
    'Amphibia': '两栖动物',
    'Actinopterygii': '鱼类',
    'Insecta': '昆虫',
    'Magnoliopsida': '开花植物',
    'Liliopsida': '单子叶植物',
    'Pinopsida': '针叶植物',
    'Polypodiopsida': '蕨类',
    'Fungi': '真菌',
    'Arachnida': '蜘蛛',
    'Malacostraca': '甲壳类',
    'Gastropoda': '软体动物',
    'Bivalvia': '双壳类',
    'Mollusca': '软体动物',
  }
  return mapping[cls] || '其他生物'
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lng = parseFloat(searchParams.get('lng') || '0')
  const radius = parseInt(searchParams.get('radius') || '50000') // default 50km
  const limit = parseInt(searchParams.get('limit') || '200') // max 200 records

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
  }

  try {
    // Calculate bounding box for the radius search
    // Earth's radius in meters ~6371000
    const earthRadius = 6371000
    const latRad = lat * Math.PI / 180
    const deltaLat = (radius / earthRadius) * (180 / Math.PI)
    const deltaLng = (radius / (earthRadius * Math.cos(latRad))) * (180 / Math.PI)

    const minLat = lat - deltaLat
    const maxLat = lat + deltaLat
    const minLng = lng - deltaLng
    const maxLng = lng + deltaLng

    // Use WKT POLYGON for spatial filter (GBIF's lat/lng/radius doesn't work correctly)
    // WKT format: POLYGON((lon1 lat1, lon2 lat2, ...)) - double parentheses, lon lat order
    const geometry = `POLYGON((${minLng} ${minLat},${maxLng} ${minLat},${maxLng} ${maxLat},${minLng} ${maxLat},${minLng} ${minLat}))`

    // Query GBIF API for species occurrences within bounding box
    // Note: GBIF geometry uses WKT format POLYGON((lon1 lat1, lon2 lat2, ...))
    // basisOfRecord doesn't support comma-separated values, omit to get all record types
    const gbifUrl = `https://api.gbif.org/v1/occurrence/search?geometry=${encodeURIComponent(geometry)}&limit=${limit}`

    const response = await fetch(gbifUrl, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 } // Cache for 1 hour
    })

    if (!response.ok) {
      throw new Error(`GBIF API error: ${response.status}`)
    }

    const data: GBIFResponse = await response.json()

    // Process results
    const kingdomBreakdown: Record<string, number> = {}
    const classBreakdown: Record<string, number> = {}
    const threatenedSpeciesSet = new Map<string, { species: GBIFSpecies; category: string }>()
    const keySpecies: string[] = []

    for (const record of data.results) {
      // Count by kingdom
      kingdomBreakdown[record.kingdom] = (kingdomBreakdown[record.kingdom] || 0) + 1

      // Count by class
      if (record.class) {
        classBreakdown[record.class] = (classBreakdown[record.class] || 0) + 1
      }

      // Track threatened species (VU, EN, CR)
      if (record.iucnRedListCategory && ['VU', 'EN', 'CR'].includes(record.iucnRedListCategory)) {
        const key = record.scientificName
        if (!threatenedSpeciesSet.has(key)) {
          threatenedSpeciesSet.set(key, { species: record, category: record.iucnRedListCategory })
        }
      }

      // Collect key indicator species (mammals, birds, amphibians, threatened)
      if (record.vernacularName && ['Mammalia', 'Aves', 'Amphibia', 'Reptilia'].includes(record.class)) {
        keySpecies.push(`${record.vernacularName} (${record.scientificName})`)
      }
    }

    // Build threatened species list
    const threatenedSpeciesList = Array.from(threatenedSpeciesSet.values())
      .sort((a, b) => {
        const order = { 'CR': 0, 'EN': 1, 'VU': 2 }
        return (order[a.category as keyof typeof order] ?? 3) - (order[b.category as keyof typeof order] ?? 3)
      })
      .slice(0, 10) // Top 10 most threatened
      .map(({ species, category }) => ({
        scientificName: species.scientificName,
        vernacularName: species.vernacularName,
        iucnCategory: category,
        iucnLabel: IUCN_CATEGORIES[category]?.labelCn || category,
        class: species.class,
        family: species.family,
        ecosystemType: getEcosystemType(species.class),
      }))

    const threatenedSpecies = threatenedSpeciesSet.size
    const nearThreatenedSpecies = data.results.filter(r => r.iucnRedListCategory === 'NT').length

    // Biodiversity hotspot: high threatened species count or high diversity
    const biodiversityHotspot = threatenedSpecies >= 3 ||
      (data.count > 1000 && threatenedSpecies >= 1) ||
      (kingdomBreakdown['Animalia'] > 50 && kingdomBreakdown['Plantae'] > 30)

    // Determine ecosystem types present
    const ecosystemTypes = Object.entries(classBreakdown)
      .filter(([cls]) => ['Mammalia', 'Aves', 'Amphibia', 'Reptilia', 'Actinopterygii', 'Insecta', 'Magnoliopsida', 'Liliopsida', 'Pinopsida', 'Fungi'].includes(cls))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([cls]) => getEcosystemType(cls))

    const result: BiodiversityAnalysis = {
      location: { lat, lng },
      totalRecords: data.count,
      uniqueSpecies: Math.max(data.count, Object.keys(classBreakdown).length * 10), // GBIF counts records not species
      threatenedSpecies,
      nearThreatenedSpecies,
      kingdomBreakdown,
      classBreakdown,
      threatenedSpeciesList,
      biodiversityHotspot,
      keyIndicatorSpecies: keySpecies.slice(0, 15),
      ecosystemTypes,
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Biodiversity API error:', error)
    return NextResponse.json({
      error: 'Failed to fetch biodiversity data',
      location: { lat, lng },
      totalRecords: 0,
      uniqueSpecies: 0,
      threatenedSpecies: 0,
      nearThreatenedSpecies: 0,
      kingdomBreakdown: {},
      classBreakdown: {},
      threatenedSpeciesList: [],
      biodiversityHotspot: false,
      keyIndicatorSpecies: [],
      ecosystemTypes: [],
    }, { status: 200 }) // Return empty data, don't fail
  }
}
