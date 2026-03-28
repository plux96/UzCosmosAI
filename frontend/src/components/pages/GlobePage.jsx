import { Suspense } from 'react'
import { motion } from 'framer-motion'
import EarthScene from '../3d/EarthScene'
import useCosmosStore from '../../stores/useCosmosStore'

function Loading3D() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <motion.div className="font-orbitron text-green-400 text-xs tracking-[0.3em]"
        animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 2, repeat: Infinity }}>
        INITIALIZING
      </motion.div>
    </div>
  )
}

function MiniStat({ label, value, color }) {
  return (
    <div className="text-center px-2">
      <div className="text-[8px] opacity-30">{label}</div>
      <div className="text-xs font-mono font-bold" style={{ color }}>{value}</div>
    </div>
  )
}

export default function GlobePage() {
  const satelliteCount = useCosmosStore((s) => s.satelliteCount)
  const debrisCount = useCosmosStore((s) => s.debrisCount)
  const issData = useCosmosStore((s) => s.issData)
  const threat = useCosmosStore((s) => s.aiThreatLevel)
  const alerts = useCosmosStore((s) => s.alerts)
  const inFlight = useCosmosStore((s) => s.inFlightLaunches)
  const solarData = useCosmosStore((s) => s.solarData)
  const hazardousCount = useCosmosStore((s) => s.hazardousCount)

  return (
    <div className="h-full relative">
      {/* Full-screen 3D */}
      <Suspense fallback={<Loading3D />}>
        <EarthScene />
      </Suspense>

      {/* Scanline */}
      <div className="scanline absolute inset-0 pointer-events-none" />

      {/* Top-right mini stats */}
      <div className="absolute top-2 right-2 flex gap-1 pointer-events-none">
        {[
          { label: 'SAT', value: satelliteCount.toLocaleString(), color: '#00ff88' },
          { label: 'DEB', value: (debrisCount/1000).toFixed(1)+'K', color: '#ff4444' },
          { label: 'ISS', value: (issData.alt||408).toFixed(0)+'km', color: '#00ffff' },
          { label: 'Kp', value: (solarData.kp_index||0).toFixed(1), color: solarData.storm_color || '#00ff00' },
          { label: 'NEO', value: String(hazardousCount), color: '#ffaa00' },
        ].map((s, i) => (
          <div key={i} className="px-2 py-1 rounded text-center" style={{ background: 'rgba(5,5,16,0.7)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="text-[7px] opacity-25">{s.label}</div>
            <div className="text-[10px] font-mono font-bold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Bottom-left threat + alerts */}
      <div className="absolute bottom-2 left-2 flex gap-2 pointer-events-none" style={{ maxWidth: 400 }}>
        {/* Threat */}
        <div className="px-3 py-1.5 rounded" style={{ background: 'rgba(5,5,16,0.8)', border: `1px solid ${threat.color}25` }}>
          <div className="text-[7px] opacity-30">XAVF</div>
          <div className="text-sm font-orbitron font-bold" style={{ color: threat.color }}>{threat.score}</div>
        </div>

        {/* In-flight */}
        {inFlight.length > 0 && (
          <motion.div className="px-3 py-1.5 rounded"
            style={{ background: 'rgba(30,5,0,0.8)', border: '1px solid rgba(255,68,0,0.3)' }}
            animate={{ borderColor: ['rgba(255,68,0,0.2)','rgba(255,68,0,0.6)','rgba(255,68,0,0.2)'] }}
            transition={{ duration: 1.5, repeat: Infinity }}>
            <div className="text-[7px] text-red-400 opacity-60">UCHISHDA</div>
            <div className="text-[10px] text-red-300 font-mono">{inFlight[0]?.short_name || inFlight[0]?.rocket_name}</div>
          </motion.div>
        )}

        {/* Latest alert */}
        {alerts.length > 0 && (
          <div className="px-3 py-1.5 rounded max-w-[200px]" style={{ background: 'rgba(5,5,16,0.8)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="text-[7px] opacity-30">ALERT</div>
            <div className="text-[9px] opacity-50 truncate">{alerts[0]?.title}</div>
          </div>
        )}
      </div>

      {/* Bottom-right hint */}
      <div className="absolute bottom-2 right-2 text-[8px] opacity-15 pointer-events-none font-mono">
        Click satellite for details | Scroll to zoom | Drag to rotate
      </div>
    </div>
  )
}
