import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

// ENCORE industry sectors mapped by ISIC code
// Source: ENCORE Database September 2025
const ENCORE_SECTORS = [
  // Agriculture, forestry and fishing
  { isic: 'A_1_14_141', name: 'Raising of cattle and buffaloes', category: '农林牧渔', categoryCode: 'A' },
  { isic: 'A_1_14_142', name: 'Raising of sheep and goats', category: '农林牧渔', categoryCode: 'A' },
  { isic: 'A_1_14_143', name: 'Growing of rice', category: '农林牧渔', categoryCode: 'A' },
  { isic: 'A_1_14_144', name: 'Growing of wheat', category: '农林牧渔', categoryCode: 'A' },
  { isic: 'A_1_14_145', name: 'Growing of vegetables and melons', category: '农林牧渔', categoryCode: 'A' },
  { isic: 'A_1_14_150', name: 'Growing of other crops', category: '农林牧渔', categoryCode: 'A' },
  { isic: 'A_1_16_160', name: 'Silviculture and other forestry activities', category: '农林牧渔', categoryCode: 'A' },
  // Mining and quarrying
  { isic: 'B_1_10_101', name: 'Mining of coal and lignite', category: '采矿业', categoryCode: 'B' },
  { isic: 'B_1_10_102', name: 'Mining of hard coal', category: '采矿业', categoryCode: 'B' },
  { isic: 'B_1_11_111', name: 'Extraction of crude petroleum and natural gas', category: '采矿业', categoryCode: 'B' },
  { isic: 'B_1_13_131', name: 'Mining of iron ores', category: '采矿业', categoryCode: 'B' },
  { isic: 'B_1_13_132', name: 'Mining of non-ferrous metal ores', category: '采矿业', categoryCode: 'B' },
  { isic: 'B_1_14_141', name: 'Quarrying of stone', category: '采矿业', categoryCode: 'B' },
  { isic: 'B_1_14_142', name: 'Quarrying of sand and clay', category: '采矿业', categoryCode: 'B' },
  // Manufacturing
  { isic: 'C_1_10_101', name: 'Processing and preserving of meat', category: '制造业', categoryCode: 'C' },
  { isic: 'C_1_10_102', name: 'Processing and preserving of fish', category: '制造业', categoryCode: 'C' },
  { isic: 'C_1_10_103', name: 'Manufacture of food products', category: '制造业', categoryCode: 'C' },
  { isic: 'C_1_11_110', name: 'Manufacture of beverages', category: '制造业', categoryCode: 'C' },
  { isic: 'C_1_20_200', name: 'Manufacture of chemicals and chemical products', category: '制造业', categoryCode: 'C' },
  { isic: 'C_1_21_210', name: 'Manufacture of pharmaceutical products', category: '制造业', categoryCode: 'C' },
  { isic: 'C_1_13_130', name: 'Manufacture of textiles', category: '制造业', categoryCode: 'C' },
  { isic: 'C_1_14_141', name: 'Manufacture of wearing apparel', category: '制造业', categoryCode: 'C' },
  // Energy
  { isic: 'D_1_35_351', name: 'Electric power generation', category: '能源行业', categoryCode: 'D' },
  { isic: 'D_1_35_352', name: 'Manufacture of gas', category: '能源行业', categoryCode: 'D' },
  { isic: 'D_1_35_353', name: 'Steam and air conditioning supply', category: '能源行业', categoryCode: 'D' },
  // Construction
  { isic: 'F_1_41_410', name: 'Construction of buildings', category: '建筑业', categoryCode: 'F' },
  { isic: 'F_1_42_421', name: 'Civil engineering', category: '建筑业', categoryCode: 'F' },
  { isic: 'F_1_43_431', name: 'Specialised construction activities', category: '建筑业', categoryCode: 'F' },
  // Transportation
  { isic: 'H_1_49_491', name: 'Land transport', category: '交通运输', categoryCode: 'H' },
  { isic: 'H_1_50_501', name: 'Water transport', category: '交通运输', categoryCode: 'H' },
  { isic: 'H_1_51_510', name: 'Air transport', category: '交通运输', categoryCode: 'H' },
  { isic: 'H_1_52_521', name: 'Warehousing and support activities for transportation', category: '交通运输', categoryCode: 'H' },
  // Retail and services
  { isic: 'G_1_45_451', name: 'Wholesale and retail trade and repair of motor vehicles', category: '零售/服务业', categoryCode: 'G' },
  { isic: 'I_1_55_551', name: 'Accommodation and food service activities', category: '零售/服务业', categoryCode: 'I' },
  { isic: 'K_1_64_641', name: 'Financial service activities', category: '零售/服务业', categoryCode: 'K' },
  { isic: 'P_1_85_851', name: 'Education', category: '零售/服务业', categoryCode: 'P' },
  { isic: 'Q_1_86_861', name: 'Human health activities', category: '零售/服务业', categoryCode: 'Q' },
]

export async function GET() {
  try {
    // Group by Chinese category
    const grouped: Record<string, typeof ENCORE_SECTORS> = {}
    for (const sector of ENCORE_SECTORS) {
      if (!grouped[sector.category]) grouped[sector.category] = []
      grouped[sector.category].push(sector)
    }

    return NextResponse.json({
      sectors: ENCORE_SECTORS,
      grouped,
      count: ENCORE_SECTORS.length,
      source: 'ENCORE Database September 2025',
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load ENCORE sectors' }, { status: 500 })
  }
}
