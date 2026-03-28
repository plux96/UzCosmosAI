import { motion } from 'framer-motion'
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts'
import useCosmosStore from '../../stores/useCosmosStore'

export default function SolarPanel() {
  const solar = useCosmosStore((s) => s.solarData)

  const kpBars = Array.from({ length: 9 }, (_, i) => ({
    level: i + 1,
    value: 1,
    active: (solar.kp_index || 0) >= i + 1,
  }))

  const kpColor = (level) => {
    if (level <= 3) return '#00ff00'
    if (level <= 5) return '#ffff00'
    if (level <= 7) return '#ff6600'
    return '#ff0000'
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="dot" style={{ background: solar.storm_color || '#00ff00' }} />
        Quyosh Faoliyati
      </div>
      <div className="p-3 space-y-3">
        {/* Kp Index gauge */}
        <div>
          <div className="flex justify-between text-[9px] mb-1">
            <span className="opacity-50">Kp Index</span>
            <span className="font-bold font-orbitron" style={{ color: solar.storm_color }}>
              {solar.kp_index || 0}
            </span>
          </div>
          <div className="flex gap-0.5 h-5">
            {kpBars.map((bar, i) => (
              <motion.div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  background: bar.active ? kpColor(bar.level) : 'rgba(255,255,255,0.05)',
                }}
                animate={bar.active ? { opacity: [0.6, 1, 0.6] } : {}}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
              />
            ))}
          </div>
          <div className="text-[8px] text-center mt-1 opacity-50">
            {solar.storm_level || 'Yuklanmoqda...'}
          </div>
        </div>

        {/* Solar wind */}
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="p-2 rounded" style={{ background: 'rgba(255,170,0,0.05)' }}>
            <div className="opacity-40 text-[8px]">Quyosh shamoli</div>
            <div className="font-bold text-yellow-400">
              {solar.solar_wind_speed || '—'} <span className="text-[8px] opacity-50">km/s</span>
            </div>
          </div>
          <div className="p-2 rounded" style={{ background: 'rgba(255,100,0,0.05)' }}>
            <div className="opacity-40 text-[8px]">Proton oqimi</div>
            <div className="font-bold text-orange-400">
              {solar.proton_flux || '—'} <span className="text-[8px] opacity-50">pfu</span>
            </div>
          </div>
          <div className="p-2 rounded" style={{ background: 'rgba(0,150,255,0.05)' }}>
            <div className="opacity-40 text-[8px]">Bt (magnit)</div>
            <div className="font-bold text-blue-400">
              {solar.bt_nT || '—'} <span className="text-[8px] opacity-50">nT</span>
            </div>
          </div>
          <div className="p-2 rounded" style={{ background: 'rgba(255,255,0,0.05)' }}>
            <div className="opacity-40 text-[8px]">Quyosh dog'lari</div>
            <div className="font-bold text-yellow-300">
              {solar.sunspot_number || '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
