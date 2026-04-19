import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

// Load pre-computed ENCORE sectors from JSON
function loadSectors() {
  try {
    const dataDir = path.join(process.cwd(), 'data')
    const sectorsPath = path.join(dataDir, 'encore_sectors.json')
    if (fs.existsSync(sectorsPath)) {
      return JSON.parse(fs.readFileSync(sectorsPath, 'utf-8'))
    }
  } catch (error) {
    console.error('Failed to load ENCORE sectors:', error)
  }
  return null
}

export async function GET() {
  const data = loadSectors()

  if (!data) {
    return NextResponse.json({ error: 'Failed to load ENCORE sectors' }, { status: 500 })
  }

  return NextResponse.json({
    sectors: data.sectors,
    grouped: data.grouped,
    count: data.count,
    source: 'ENCORE Database September 2025',
  })
}
