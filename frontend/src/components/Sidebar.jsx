import { motion } from 'framer-motion'
import useCosmosStore from '../stores/useCosmosStore'

const NAV_ITEMS = [
  { id: 'globe',      icon: '01', label: 'MISSION CONTROL',  color: '#00ff88', desc: '3D Globe' },
  { id: 'satellites',  icon: '02', label: 'YO\'LDOSHLAR',     color: '#00ff88', desc: 'Satellite Tracker' },
  { id: 'debris',      icon: '03', label: 'KOSMIK AXLAT',     color: '#ff4444', desc: 'Debris Hunter' },
  { id: 'launches',    icon: '04', label: 'UCHIRISHLAR',      color: '#8855ff', desc: 'Launch Monitor' },
  { id: 'iss',         icon: '05', label: 'ISS TRACKER',      color: '#00ffff', desc: 'Live Tracking' },
  { id: 'solar',       icon: '06', label: 'QUYOSH',           color: '#ffaa00', desc: 'Solar Weather' },
  { id: 'asteroids',   icon: '07', label: 'ASTEROIDLAR',      color: '#ff6600', desc: 'Asteroid Watch' },
  { id: 'radiation',   icon: '08', label: 'RADIATSIYA',       color: '#ff00aa', desc: 'Radiation Shield' },
  { id: 'ai',          icon: '09', label: 'AI TAHLIL',        color: '#00ffaa', desc: 'AI Brain' },
  { id: 'alerts',      icon: '10', label: 'OGOHLANTIRISHLAR', color: '#ff0044', desc: 'Alert System' },
]

export default function Sidebar() {
  const selectedView = useCosmosStore((s) => s.selectedView)
  const setView = useCosmosStore((s) => s.setView)
  const alertStats = useCosmosStore((s) => s.alertStats)
  const inFlight = useCosmosStore((s) => s.inFlightLaunches)
  const satelliteCount = useCosmosStore((s) => s.satelliteCount)
  const debrisCount = useCosmosStore((s) => s.debrisCount)
  const hazardousCount = useCosmosStore((s) => s.hazardousCount)

  const getBadge = (id) => {
    switch (id) {
      case 'alerts': return alertStats.critical > 0 ? alertStats.critical : null
      case 'launches': return inFlight.length > 0 ? inFlight.length : null
      case 'satellites': return satelliteCount > 0 ? satelliteCount : null
      case 'debris': return debrisCount > 0 ? Math.round(debrisCount / 1000) + 'K' : null
      case 'asteroids': return hazardousCount > 0 ? hazardousCount : null
      default: return null
    }
  }

  return (
    <nav
      className="w-[200px] h-[calc(100vh-40px)] flex-shrink-0 overflow-y-auto py-2 px-1.5"
      style={{
        background: 'rgba(5,5,16,0.7)',
        borderRight: '1px solid rgba(0,255,136,0.08)',
      }}
    >
      <div className="space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = selectedView === item.id
          const badge = getBadge(item.id)

          return (
            <motion.button
              key={item.id}
              onClick={() => setView(item.id)}
              className="w-full text-left rounded-md px-2.5 py-2 transition-all relative group"
              style={{
                background: isActive ? `${item.color}12` : 'transparent',
                borderLeft: isActive ? `2px solid ${item.color}` : '2px solid transparent',
              }}
              whileHover={{
                background: `${item.color}08`,
                x: 2,
              }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-2.5">
                {/* Number */}
                <span
                  className="text-[9px] font-mono w-5 text-center opacity-30"
                  style={{ color: isActive ? item.color : undefined }}
                >
                  {item.icon}
                </span>

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[10px] font-orbitron tracking-[0.1em] truncate"
                    style={{ color: isActive ? item.color : 'rgba(255,255,255,0.6)' }}
                  >
                    {item.label}
                  </div>
                  <div className="text-[8px] opacity-30 truncate">{item.desc}</div>
                </div>

                {/* Badge */}
                {badge && (
                  <motion.span
                    className="text-[8px] font-mono px-1.5 py-0.5 rounded-full"
                    style={{
                      background: `${item.color}20`,
                      color: item.color,
                      border: `1px solid ${item.color}30`,
                    }}
                    animate={item.id === 'launches' && inFlight.length > 0 ? {
                      opacity: [1, 0.5, 1],
                    } : {}}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    {badge}
                  </motion.span>
                )}

                {/* Active indicator dot */}
                {isActive && (
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: item.color, boxShadow: `0 0 6px ${item.color}` }}
                    layoutId="nav-dot"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Bottom info */}
      <div className="mt-4 px-2 py-2 rounded" style={{ background: 'rgba(0,255,136,0.03)', border: '1px solid rgba(0,255,136,0.06)' }}>
        <div className="text-[7px] font-orbitron tracking-[0.15em] text-green-400 opacity-50 mb-1">UZCOSMOS AI v1.0</div>
        <div className="text-[8px] opacity-25">10 Agent System</div>
        <div className="text-[8px] opacity-25">Kosmik Monitoring</div>
      </div>
    </nav>
  )
}
