'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { AssetLocation } from '@/store/leap-store'
import 'leaflet/dist/leaflet.css'

// Province boundary GeoJSON - using DataV GeoAtlas API (confirmed working: 200 OK)
const CHINA_PROVINCES_URL = 'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json'

// Fix default marker icon
const DefaultIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    width: 28px;
    height: 28px;
    background: #2d5a3d;
    border: 3px solid white;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 2px 8px rgba(45,90,61,0.4);
  "></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
})

const SelectedIcon = L.divIcon({
  className: 'custom-marker selected',
  html: `<div style="
    width: 36px;
    height: 36px;
    background: #c9a962;
    border: 3px solid white;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 2px 12px rgba(201,169,98,0.5);
  "></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
})

// Click handler component
function MapEvents({ onMapClick }: { onMapClick?: (e: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick?.({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

// Auto-fit bounds component
function FitBounds({ assets }: { assets: AssetLocation[] }) {
  const map = useMap()

  useEffect(() => {
    if (assets.length === 0) return
    if (assets.length === 1) {
      map.setView([assets[0].lat, assets[0].lng], 10, { animate: true })
      return
    }
    const bounds = L.latLngBounds(assets.map((a) => [a.lat, a.lng]))
    map.fitBounds(bounds, { padding: [50, 50], animate: true, maxZoom: 12 })
  }, [assets, map])

  return null
}

// Province boundaries with labels
function ProvinceLayer() {
  const [geoData, setGeoData] = useState<any>(null)

  useEffect(() => {
    fetch(CHINA_PROVINCES_URL)
      .then((res) => res.json())
      .then((data) => setGeoData(data))
      .catch((err) => {
        // Province boundaries are optional - no console error needed
      })
  }, [])

  if (!geoData) return null

  const provinceStyle: L.PathOptions = {
    fillColor: '#4a7c59',
    fillOpacity: 0.08,
    color: '#2d5a3d',
    weight: 1.5,
    opacity: 0.6,
  }

  const onEachFeature = (feature: any, layer: L.Layer) => {
    if (feature.properties && feature.properties.name) {
      layer.bindTooltip(feature.properties.name, {
        permanent: false,
        direction: 'center',
        className: 'province-label',
      })
    }
  }

  return (
    <GeoJSON
      data={geoData}
      style={provinceStyle}
      onEachFeature={onEachFeature}
    />
  )
}

interface AssetMapProps {
  assets: AssetLocation[]
  selectedId?: string
  onSelectAsset?: (id: string) => void
  onMapClick?: (e: { lat: number; lng: number }) => void
}

// Import useMapEvents from react-leaflet hooks
export default function AssetMap({ assets, selectedId, onSelectAsset, onMapClick }: AssetMapProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <div className="w-full h-full min-h-[400px] bg-[#f0ebe4] rounded-2xl flex items-center justify-center">
        <div className="text-[#8a8a7e]">地图加载中...</div>
      </div>
    )
  }

  const center: [number, number] = assets.length > 0
    ? [assets[0].lat, assets[0].lng]
    : [35.8617, 104.1954]

  return (
    <div className="relative rounded-2xl overflow-hidden border border-[#e5e0d8] shadow-inner">
      <MapContainer
        center={center}
        zoom={assets.length === 1 ? 10 : 5}
        style={{ height: '100%', minHeight: '450px', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        {/* Base layer - ESRI World Imagery (satellite) as clean background */}
        <TileLayer
          attribution='&copy; Esri'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />

        {/* Province boundaries */}
        <ProvinceLayer />

        {/* Asset markers */}
        {assets.map((asset) => (
          <Marker
            key={asset.id}
            position={[asset.lat, asset.lng]}
            icon={asset.id === selectedId ? SelectedIcon : DefaultIcon}
            eventHandlers={{
              click: () => onSelectAsset?.(asset.id),
            }}
          >
            <Popup>
              <div className="font-sans min-w-[150px]">
                <p className="font-semibold text-[#1a1a18]">{asset.name}</p>
                <p className="text-xs text-[#5c5c52] mt-1 font-mono">
                  {asset.lat.toFixed(5)}, {asset.lng.toFixed(5)}
                </p>
                <p className="text-xs text-[#8a8a7e] mt-1 capitalize">
                  敏感度: {asset.sensitivity}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        <MapEvents onMapClick={onMapClick} />
        <FitBounds assets={assets} />
      </MapContainer>
    </div>
  )
}
