import { motion } from 'framer-motion'
import useCosmosStore from '../../stores/useCosmosStore'

function StatCard({ label, value, unit, color = '#00ff88', icon }) {
  return (
    <motion.div
      className="panel hover-glow p-3 min-w-[140px]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="text-[9px] tracking-[0.15em] uppercase opacity-50 mb-1 font-orbitron">
        {icon && <span className="mr-1">{icon}</span>}
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold font-orbitron" style={{ color }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {unit && <span className="text-[10px] opacity-40">{unit}</span>}
      </div>
    </motion.div>
  )
}

export default function StatsBar() {
  const satelliteCount = useCosmosStore((s) => s.satelliteCount)
  const debrisCount = useCosmosStore((s) => s.debrisCount)
  const hazardousCount = useCosmosStore((s) => s.hazardousCount)
  const solarData = useCosmosStore((s) => s.solarData)
  const issData = useCosmosStore((s) => s.issData)
  const launches = useCosmosStore((s) => s.launches)
  const radiationData = useCosmosStore((s) => s.radiationData)
  const collisionWarnings = useCosmosStore((s) => s.collisionWarnings)

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <StatCard label="Yo'ldoshlar" value={satelliteCount} color="#00ff88" />
      <StatCard label="Kosmik axlat" value={debrisCount} color="#ff4444" />
      <StatCard label="Xavfli asteroidlar" value={hazardousCount} color="#ffaa00" />
      <StatCard label="Kp Index" value={solarData.kp_index || 0} color={solarData.storm_color || '#00ff00'} />
      <StatCard label="ISS balandligi" value={issData.alt || 408} unit="km" color="#00ffff" />
      <StatCard label="Kelgusi uchirish" value={launches.length || 0} color="#8855ff" />
      <StatCard label="Radiatsiya" value={radiationData.iss_dose_rate_mSv_day || 0} unit="mSv" color="#ff6600" />
      <StatCard label="To'qnashuv xavfi" value={collisionWarnings.length} color="#ff0000" />
    </div>
  )
}
