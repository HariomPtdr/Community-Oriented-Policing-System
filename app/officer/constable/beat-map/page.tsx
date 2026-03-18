'use client'
export default function BeatMapPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-white">Beat Map</h1>
        <p className="text-gray-400 text-sm mt-1">Your assigned patrol area</p>
      </div>
      <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl h-[500px] flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-3">🗺️</p>
          <p className="text-gray-400 text-sm">Interactive beat map will load with Mapbox integration</p>
          <p className="text-gray-600 text-xs mt-1">Configure NEXT_PUBLIC_MAPBOX_TOKEN in .env.local</p>
        </div>
      </div>
    </div>
  )
}
