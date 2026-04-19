import { NextRequest, NextResponse } from 'next/server'

const QWEN_API_KEY = process.env.QWEN_API_KEY || process.env.OPENAI_API_KEY || ''
const QWEN_BASE_URL = process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1'

// Biodiversity data from GBIF
interface BiodiversityData {
  location: { lat: number; lng: number }
  totalRecords: number
  uniqueSpecies: number
  threatenedSpecies: number
  nearThreatenedSpecies: number
  biodiversityHotspot: boolean
  ecosystemTypes: string[]
  threatenedSpeciesList: Array<{
    scientificName: string
    vernacularName?: string
    iucnLabel: string
    ecosystemType: string
  }>
  keyIndicatorSpecies: string[]
}

// Water risk data
interface WaterRiskData {
  riverBasin: string
  waterStress: string
  waterStressLabel: string
  aridityLabel: string
  droughtRisk: string
  floodRisk: string
  groundwaterStress: string
  keyRisks: string[]
}

// ENCORE dependency-impact mapping for TNFD analysis
const ENCORE_TAXONOMY: Record<string, {
  cn: string
  biophysicalPathway: string
  tnfdRiskCategory: 'physical' | 'transition' | 'both'
  tnfdRiskType: string
}> = {
  // Ecosystem services (dependencies)
  'Water supply': {
    cn: '水资源供给',
    biophysicalPathway: '淡水提取量 > 可再生水量',
    tnfdRiskCategory: 'physical',
    tnfdRiskType: '水稀缺导致的运营中断',
  },
  'Water purification': {
    cn: '水净化',
    biophysicalPathway: '水质恶化超出自然处理能力',
    tnfdRiskCategory: 'physical',
    tnfdRiskType: '水处理成本增加',
  },
  'Soil quality regulation': {
    cn: '土壤质量调节',
    biophysicalPathway: '土壤退化降低农业生产率',
    tnfdRiskCategory: 'physical',
    tnfdRiskType: '土地生产力下降',
  },
  'Climate regulation': {
    cn: '气候调节',
    biophysicalPathway: '生态系统碳汇功能减弱',
    tnfdRiskCategory: 'both',
    tnfdRiskType: '碳排放监管趋严 + 气候适应成本',
  },
  'Carbon sequestration': {
    cn: '碳汇',
    biophysicalPathway: '森林/湿地碳汇减少',
    tnfdRiskCategory: 'transition',
    tnfdRiskType: '碳成本增加，碳资产减值',
  },
  'Pollination': {
    cn: '授粉',
    biophysicalPathway: '传粉昆虫减少影响农业产量',
    tnfdRiskCategory: 'physical',
    tnfdRiskType: '农业产量波动',
  },
  'Biodiversity': {
    cn: '生物多样性',
    biophysicalPathway: '物种灭绝降低生态系统韧性',
    tnfdRiskCategory: 'both',
    tnfdRiskType: '生态系统服务全面退化',
  },
  'Natural hazard regulation': {
    cn: '自然灾害调节',
    biophysicalPathway: '生态系统缓冲功能减弱',
    tnfdRiskCategory: 'physical',
    tnfdRiskType: '极端事件损失增加',
  },
  'Recreation': {
    cn: '休闲游憩',
    biophysicalPathway: '自然景观退化减少旅游价值',
    tnfdRiskCategory: 'transition',
    tnfdRiskType: '品牌声誉风险',
  },
  // Impact drivers
  'GHG emissions': {
    cn: '温室气体排放',
    biophysicalPathway: '大气温室气体浓度增加',
    tnfdRiskCategory: 'transition',
    tnfdRiskType: '碳定价、碳关税、绿色融资成本',
  },
  'Water pollution': {
    cn: '水污染',
    biophysicalPathway: '水质恶化影响生态系统和人居',
    tnfdRiskCategory: 'physical',
    tnfdRiskType: '监管处罚、清理成本、社区关系',
  },
  'Soil pollution': {
    cn: '土壤污染',
    biophysicalPathway: '土壤重金属累积',
    tnfdRiskCategory: 'physical',
    tnfdRiskType: '土地修复成本、农产品安全',
  },
  'Air pollution': {
    cn: '空气污染',
    biophysicalPathway: '大气污染物排放',
    tnfdRiskCategory: 'transition',
    tnfdRiskType: '排放权交易成本、合规成本',
  },
  'Waste generation': {
    cn: '废物产生',
    biophysicalPathway: '固体废物排放',
    tnfdRiskCategory: 'both',
    tnfdRiskType: '废物处理成本、环境诉讼',
  },
  'Land use change': {
    cn: '土地利用变化',
    biophysicalPathway: '林地/湿地转为建设用地',
    tnfdRiskCategory: 'both',
    tnfdRiskType: '生态补偿要求、生物多样性损失',
  },
  'Water withdrawals': {
    cn: '水资源开采',
    biophysicalPathway: '过度抽取地下水',
    tnfdRiskCategory: 'physical',
    tnfdRiskType: '地面沉降、水权纠纷',
  },
  'Noise and vibrations': {
    cn: '噪声与振动',
    biophysicalPathway: '噪声污染影响野生动物',
    tnfdRiskCategory: 'transition',
    tnfdRiskType: '社区关系、环保人士反对',
  },
  'Ecosystem interactions': {
    cn: '生态系统相互作用',
    biophysicalPathway: '外来物种入侵、生态平衡打破',
    tnfdRiskCategory: 'physical',
    tnfdRiskType: '生态系统服务功能退化',
  },
}

// TNFD risk level matrix: ENCORE level × location sensitivity
const RISK_MATRIX: Record<string, Record<string, 'high' | 'medium' | 'low'>> = {
  high: {
    high: 'high',
    medium: 'high',
    low: 'medium',
  },
  medium: {
    high: 'high',
    medium: 'medium',
    low: 'low',
  },
  low: {
    high: 'medium',
    medium: 'low',
    low: 'low',
  },
}

// IUCN Chinese labels
const IUCN_LABELS: Record<string, string> = {
  'EX': '已灭绝',
  'EW': '野外灭绝',
  'CR': '极危',
  'EN': '濒危',
  'VU': '易危',
  'NT': '近危',
  'LC': '无危',
}

// Fetch biodiversity data for a location
async function fetchBiodiversity(lat: number, lng: number): Promise<BiodiversityData> {
  try {
    const url = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/geo/biodiversity?lat=${lat}&lng=${lng}&radius=50000`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) throw new Error('Biodiversity fetch failed')
    return await res.json()
  } catch {
    return {
      location: { lat, lng },
      totalRecords: 0,
      uniqueSpecies: 0,
      threatenedSpecies: 0,
      nearThreatenedSpecies: 0,
      biodiversityHotspot: false,
      ecosystemTypes: [],
      threatenedSpeciesList: [],
      keyIndicatorSpecies: [],
    }
  }
}

// Fetch water risk data for a location
async function fetchWaterRisk(lat: number, lng: number): Promise<WaterRiskData> {
  try {
    const url = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/geo/water-risk?lat=${lat}&lng=${lng}`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) throw new Error('Water risk fetch failed')
    return await res.json()
  } catch {
    return {
      riverBasin: '未知',
      waterStress: 'unknown',
      waterStressLabel: '未知',
      aridityLabel: '未知',
      droughtRisk: 'unknown',
      floodRisk: 'unknown',
      groundwaterStress: 'unknown',
      keyRisks: [],
    }
  }
}

// Cross-reference ENCORE dependencies with actual biodiversity data
function crossReferenceDependencies(
  dependencies: string[],
  biodiversity: BiodiversityData,
  waterRisk: WaterRiskData
): Array<{
  service: string
  cn: string
  encoreLevel: string
  tnfdRisk: string
  tnfdCategory: string
  locationRelevance: string
  priority: 'high' | 'medium' | 'low'
}> {
  return dependencies.map(dep => {
    const encore = ENCORE_TAXONOMY[dep] || {
      cn: dep,
      biophysicalPathway: '未知',
      tnfdRiskCategory: 'physical' as const,
      tnfdRiskType: '待评估',
    }

    // Determine location relevance based on actual data
    let locationRelevance = '该地区具备相关生态条件'
    let priority: 'high' | 'medium' | 'low' = 'low'

    if (dep === 'Water supply' || dep === 'Water purification') {
      if (waterRisk.waterStress === 'extreme' || waterRisk.waterStress === 'high') {
        locationRelevance = `位于${waterRisk.riverBasin}，水资源压力${waterRisk.waterStressLabel}，风险极高`
        priority = 'high'
      } else if (waterRisk.waterStress === 'medium') {
        locationRelevance = `${waterRisk.riverBasin}，水资源压力中等，需关注`
        priority = 'medium'
      } else {
        locationRelevance = `${waterRisk.riverBasin}，水资源相对充足`
        priority = 'low'
      }
    } else if (dep === 'Biodiversity') {
      if (biodiversity.biodiversityHotspot) {
        locationRelevance = `生物多样性热点地区，发现${biodiversity.threatenedSpecies}种受威胁物种`
        priority = 'high'
      } else if (biodiversity.threatenedSpecies > 0) {
        locationRelevance = `发现${biodiversity.threatenedSpecies}种受威胁物种，生物多样性受到威胁`
        priority = 'high'
      } else {
        locationRelevance = `记录到${biodiversity.totalRecords}条物种记录，生态系统一般`
        priority = 'medium'
      }
    } else if (dep === 'Climate regulation' || dep === 'Carbon sequestration') {
      if (biodiversity.ecosystemTypes.includes('森林')) {
        locationRelevance = '区域森林生态系统具备碳汇功能'
        priority = 'medium'
      } else {
        locationRelevance = '非森林主导生态系统，碳汇潜力有限'
        priority = 'low'
      }
    } else if (dep === 'Soil quality regulation') {
      if (waterRisk.groundwaterStress === 'high') {
        locationRelevance = '地下水超采区域，土壤退化风险高'
        priority = 'high'
      } else {
        priority = 'medium'
      }
    }

    return {
      service: dep,
      cn: encore.cn,
      encoreLevel: encore.tnfdRiskType,
      tnfdRisk: encore.tnfdRiskType,
      tnfdCategory: encore.tnfdRiskCategory === 'both' ? '物理风险 & 转型风险' :
                    encore.tnfdRiskCategory === 'physical' ? '物理风险' : '转型风险',
      locationRelevance,
      priority,
    }
  }).sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.priority] - order[b.priority]
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { assets, industryData, assetProtections } = body

    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      return NextResponse.json({ error: 'No assets provided' }, { status: 400 })
    }

    // Fetch biodiversity and water risk data for each asset
    const biodiversityPromises = assets.map((a: { lat: number; lng: number }) =>
      fetchBiodiversity(a.lat, a.lng)
    )
    const waterRiskPromises = assets.map((a: { lat: number; lng: number }) =>
      fetchWaterRisk(a.lat, a.lng)
    )

    const [biodiversityResults, waterRiskResults] = await Promise.all([
      Promise.all(biodiversityPromises),
      Promise.all(waterRiskPromises),
    ])

    // Aggregate data across all assets
    const totalThreatenedSpecies = biodiversityResults.reduce((sum, b) => sum + b.threatenedSpecies, 0)
    const totalRecords = biodiversityResults.reduce((sum, b) => sum + b.totalRecords, 0)
    const maxWaterStress = waterRiskResults.reduce((max, w) => {
      const score: Record<string, number> = { extreme: 5, high: 4, medium: 3, low: 1, unknown: 2 }
      return Math.max(max, score[w.waterStress] || 2)
    }, 0)

    const allEcosystemTypes = [...new Set(biodiversityResults.flatMap(b => b.ecosystemTypes))]
    const allKeyRisks = [...new Set(waterRiskResults.flatMap(w => w.keyRisks))]
    const uniqueThreatenedSpecies = [...new Set(biodiversityResults.flatMap(b =>
      b.threatenedSpeciesList.map(t => t.scientificName)
    ))]

    // Build comprehensive context for Qwen
    const locationContext = assets.map((a: { name: string; lat: number; lng: number }, i: number) =>
      `${a.name}(${a.lat.toFixed(4)}°N, ${a.lng.toFixed(4)}°E) - 物种记录${biodiversityResults[i].totalRecords}条，威胁物种${biodiversityResults[i].threatenedSpecies}种`
    ).join('; ')

    const dependencies = industryData?.dependencies || []
    const impacts = industryData?.impacts || []

    const crossRefDependencies = crossReferenceDependencies(
      dependencies,
      biodiversityResults[0], // Primary asset
      waterRiskResults[0]
    )

    const crossRefImpacts = impacts.map((impact: string) => {
      const encore = ENCORE_TAXONOMY[impact] || {
        cn: impact,
        biophysicalPathway: '未知',
        tnfdRiskCategory: 'physical' as const,
        tnfdRiskType: '待评估',
      }
      return {
        driver: impact,
        cn: encore.cn,
        tnfdRisk: encore.tnfdRiskType,
        tnfdCategory: encore.tnfdRiskCategory === 'both' ? '物理风险 & 转型风险' :
                      encore.tnfdRiskCategory === 'physical' ? '物理风险' : '转型风险',
      }
    })

    // If no Qwen API key, return structured data
    if (!QWEN_API_KEY) {
      const structuredResult = {
        summary: {
          assetsCount: assets.length,
          primaryLocation: assets[0]?.name || '未知',
          primaryCoordinates: `${assets[0]?.lat.toFixed(4)}°N, ${assets[0]?.lng.toFixed(4)}°E`,
          biodiversityHotspot: biodiversityResults.some(b => b.biodiversityHotspot),
          totalThreatenedSpecies,
          maxWaterStress: ['unknown', 'low', 'medium', 'high', 'extreme'][maxWaterStress] || 'unknown',
          highPriorityDependencies: crossRefDependencies.filter(d => d.priority === 'high').length,
          highPriorityImpacts: crossRefImpacts.filter((i: { tnfdCategory: string }) => i.tnfdCategory.includes('转型风险')).length,
        },
        biodiversity: {
          totalRecords,
          threatenedSpecies: totalThreatenedSpecies,
          threatenedSpeciesList: uniqueThreatenedSpecies.slice(0, 10),
          ecosystemTypes: allEcosystemTypes,
          biodiversityHotspot: biodiversityResults.some(b => b.biodiversityHotspot),
          keySpecies: biodiversityResults.flatMap(b => b.keyIndicatorSpecies).slice(0, 10),
        },
        waterRisk: {
          riverBasin: waterRiskResults[0]?.riverBasin || '未知',
          waterStress: waterRiskResults[0]?.waterStress || 'unknown',
          waterStressLabel: waterRiskResults[0]?.waterStressLabel || '未知',
          aridityLabel: waterRiskResults[0]?.aridityLabel || '未知',
          droughtRisk: waterRiskResults[0]?.droughtRisk || 'unknown',
          floodRisk: waterRiskResults[0]?.floodRisk || 'unknown',
          keyRisks: allKeyRisks,
        },
        dependencies: crossRefDependencies,
        impacts: crossRefImpacts,
        sector: industryData?.category || '未知',
        source: 'TNFD LEAP Assessment Engine v2 (GBIF + Water Risk API)',
      }

      return NextResponse.json(structuredResult)
    }

    // Build TNFD prompt with actual data
    const prompt = `你是一个专业的 TNFD（自然相关财务信息披露）分析师。请基于以下真实地理和生态数据，对企业进行 TNFD LEAP 框架的"评估(A)"步骤分析。

## 企业基本信息
- 行业类别: ${industryData?.category || '未知'}
- 资产数量: ${assets.length} 个
- 资产位置: ${locationContext}

## 真实地理空间数据（来源：GBIF + 水资源分析）

### 生物多样性数据（50km半径）：
- 总物种记录: ${totalRecords} 条
- 受威胁物种数: ${totalThreatenedSpecies} 种（极危CR、濒危EN、易危VU）
- 生态系统类型: ${allEcosystemTypes.join('、') || '待调查'}
- 生物多样性热点: ${biodiversityResults.some(b => b.biodiversityHotspot) ? '是 - 该区域生物多样性极为丰富' : '否'}
- 关键受威胁物种: ${uniqueThreatenedSpecies.slice(0, 5).join('、') || '待调查'}

### 水资源风险数据：
- 所在流域: ${waterRiskResults[0]?.riverBasin || '待调查'}
- 水资源压力: ${waterRiskResults[0]?.waterStressLabel || '待调查'} (1-5分，5分为极严重)
- 干旱风险: ${waterRiskResults[0]?.droughtRisk || '待调查'}
- 洪涝风险: ${waterRiskResults[0]?.floodRisk || '待调查'}
- 主要风险: ${allKeyRisks.slice(0, 3).join('；') || '待评估'}

## ENCORE 行业依赖分析（已交叉验证）
${crossRefDependencies.map((d, i) =>
`${i + 1}. **${d.cn}** (${d.service})
   - TNFD风险类型: ${d.tnfdRisk}
   - 风险类别: ${d.tnfdCategory}
   - 位置相关性: ${d.locationRelevance}
   - 优先级: ${d.priority === 'high' ? '🔴 高' : d.priority === 'medium' ? '🟡 中' : '🟢 低'}`
).join('\n')}

## ENCORE 行业影响分析
${crossRefImpacts.map((d: { cn: string; driver: string; tnfdRisk: string; tnfdCategory: string }, i: number) =>
`${i + 1}. **${d.cn}** (${d.driver})
   - TNFD风险类型: ${d.tnfdRisk}
   - 风险类别: ${d.tnfdCategory}`
).join('\n')}

## 分析要求

请按 TNFD LEAP 框架的"A（评估）"步骤，输出以下内容：

### 1. 物理风险分析
基于该地理位置的真实生态数据（水资源压力、受威胁物种、流域特征），分析：
- **慢性物理风险**：长期生态退化（如水资源枯竭、土壤退化）对运营的影响
- **急性物理风险**：极端事件（洪水、干旱）对设施的直接威胁

### 2. 转型风险分析
基于 ENCORE 依赖项和该地区生态系统状况，分析：
- **政策法规风险**：生物多样性保护法规、水资源管理政策的影响
- **市场风险**：绿色供应链、ESG投资要求的变化
- **声誉风险**：位于生物多样性敏感区的声誉影响

### 3. 风险优先级矩阵
列出前5个最高优先级的自然相关风险，说明其对企业的财务影响路径。

### 4. 潜在机遇
基于真实生态系统服务评估，识别：
- 生态补偿与碳汇项目参与机会
- 绿色金融与可持续发展挂钩融资的可行性
- 生态系统服务价值实现的商业路径

### 5. 数据质量说明
明确指出哪些结论基于真实数据，哪些基于推断，以及数据缺口。

请用严谨的学术语言和专业风格输出 Markdown 格式的分析报告，控制在800字以内。`

    // Call Qwen API
    const response = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${QWEN_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'qwen-turbo',
        messages: [
          { role: 'system', content: '你是一个专业的 TNFD 自然相关财务信息披露分析师，遵循 TNFD v1.0 框架和 LEAP 方法论。你的分析必须基于提供的真实数据，而非主观推断。' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1500,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error: `API Error: ${response.status}` }, { status: response.status })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    // Return both the AI analysis and the structured data
    return NextResponse.json({
      content,
      data: {
        summary: {
          assetsCount: assets.length,
          primaryLocation: assets[0]?.name || '未知',
          primaryCoordinates: `${assets[0]?.lat.toFixed(4)}°N, ${assets[0]?.lng.toFixed(4)}°E`,
          biodiversityHotspot: biodiversityResults.some(b => b.biodiversityHotspot),
          totalThreatenedSpecies,
          maxWaterStress: ['unknown', 'low', 'medium', 'high', 'extreme'][maxWaterStress] || 'unknown',
          highPriorityDependencies: crossRefDependencies.filter(d => d.priority === 'high').length,
          highPriorityImpacts: crossRefImpacts.filter((i: { tnfdCategory: string }) => i.tnfdCategory.includes('转型风险')).length,
        },
        biodiversity: {
          totalRecords,
          threatenedSpecies: totalThreatenedSpecies,
          threatenedSpeciesList: uniqueThreatenedSpecies.slice(0, 10),
          ecosystemTypes: allEcosystemTypes,
          biodiversityHotspot: biodiversityResults.some(b => b.biodiversityHotspot),
        },
        waterRisk: {
          riverBasin: waterRiskResults[0]?.riverBasin || '未知',
          waterStress: waterRiskResults[0]?.waterStressLabel || '未知',
          aridityLabel: waterRiskResults[0]?.aridityLabel || '未知',
          droughtRisk: waterRiskResults[0]?.droughtRisk || '未知',
          floodRisk: waterRiskResults[0]?.floodRisk || '未知',
          keyRisks: allKeyRisks,
        },
        dependencies: crossRefDependencies,
        impacts: crossRefImpacts,
        sector: industryData?.category || '未知',
      },
      source: 'TNFD LEAP Assessment Engine v2 (GBIF + Water Risk API + Qwen)',
    })

  } catch (error) {
    console.error('TNFD Assessment Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
