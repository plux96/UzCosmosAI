import { motion } from 'framer-motion'
import useCosmosStore from '../../stores/useCosmosStore'

export default function ISSPage() {
  const iss = useCosmosStore((s) => s.issData)

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-orbitron text-lg tracking-wider text-cyan-400">ISS LIVE TRACKER</h1>
          <p className="text-[10px] opacity-40 mt-1">Xalqaro Kosmik Stansiya — real-time kuzatuv</p>
        </div>
        <motion.div className="px-3 py-1 rounded" animate={iss.is_over_uzbekistan ? { boxShadow: ['0 0 10px #00ff8844', '0 0 25px #00ff8866'] } : {}}
          transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }}
          style={{ background: iss.is_over_uzbekistan ? 'rgba(0,255,136,0.15)' : 'rgba(0,255,255,0.05)', border: `1px solid ${iss.is_over_uzbekistan ? '#00ff88' : '#00ffff'}30` }}>
          <span className="text-xs font-orbitron" style={{ color: iss.is_over_uzbekistan ? '#00ff88' : '#00ffff' }}>
            {iss.is_over_uzbekistan ? "O'ZBEKISTON USTIDA!" : 'KUZATILMOQDA'}
          </span>
        </motion.div>
      </div>

      {/* Big telemetry */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'KENGLIK', value: (iss.lat || 0).toFixed(4), unit: '°', color: '#00ffff' },
          { label: 'UZUNLIK', value: (iss.lon || 0).toFixed(4), unit: '°', color: '#00ffff' },
          { label: 'BALANDLIK', value: (iss.alt || 408).toFixed(1), unit: 'km', color: '#00ff88' },
          { label: 'TEZLIK', value: (iss.velocity || 7.66).toFixed(2), unit: 'km/s', color: '#ffaa00' },
          { label: 'TOSHKENTGACHA', value: (iss.distance_to_tashkent_km || 0).toFixed(0), unit: 'km', color: '#ff88ff' },
        ].map((item, i) => (
          <motion.div key={i} className="panel p-3 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <div className="text-[8px] opacity-40 font-orbitron tracking-wider">{item.label}</div>
            <div className="text-xl font-mono font-bold mt-1" style={{ color: item.color }}>{item.value}</div>
            <div className="text-[9px] opacity-30">{item.unit}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Crew */}
        <div className="panel p-4">
          <div className="panel-header mb-3 p-0 border-0"><span className="dot" style={{ background: '#00ffff' }} /> Ekipaj ({iss.crew?.number || 0} kishi)</div>
          <div className="space-y-2">
            {(iss.crew?.people || []).map((person, i) => (
              <motion.div key={i} className="flex items-center gap-3 p-2 rounded" style={{ background: 'rgba(0,255,255,0.03)' }}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: 'rgba(0,255,255,0.1)', color: '#00ffff' }}>
                  {person.name?.charAt(0) || '?'}
                </div>
                <div>
                  <div className="text-[11px] font-medium text-white">{person.name}</div>
                  <div className="text-[9px] opacity-40">{person.craft}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Stats & Next pass */}
        <div className="space-y-4">
          <div className="panel p-4">
            <div className="panel-header mb-3 p-0 border-0"><span className="dot" style={{ background: '#ffaa00' }} /> ISS statistika</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Orbit davri', value: '92.68', unit: 'daqiqa' },
                { label: 'Tezlik', value: Math.round((iss.velocity || 7.66) * 3600).toLocaleString(), unit: 'km/soat' },
                { label: 'Inklinatsiya', value: '51.6', unit: '°' },
                { label: 'Kunlik orbit', value: '15.5', unit: 'marta' },
                { label: 'Massa', value: '420,000', unit: 'kg' },
                { label: 'Ichki hajm', value: '916', unit: 'm³' },
              ].map((item, i) => (
                <div key={i} className="p-2 rounded text-center" style={{ background: 'rgba(0,0,0,0.2)' }}>
                  <div className="text-[8px] opacity-40">{item.label}</div>
                  <div className="text-sm font-mono font-bold text-cyan-400">{item.value}</div>
                  <div className="text-[8px] opacity-25">{item.unit}</div>
                </div>
              ))}
            </div>
          </div>

          {iss.next_uz_pass && (
            <motion.div className="panel p-4" animate={{ borderColor: ['rgba(0,255,136,0.1)', 'rgba(0,255,136,0.4)', 'rgba(0,255,136,0.1)'] }}
              transition={{ duration: 3, repeat: Infinity }}>
              <div className="panel-header mb-2 p-0 border-0"><span className="dot" style={{ background: '#00ff88' }} /> Keyingi O'zbekiston ustidan o'tish</div>
              <div className="text-center">
                <div className="text-3xl font-orbitron font-bold text-green-400">{iss.next_uz_pass.minutes_from_now}</div>
                <div className="text-sm opacity-40">daqiqadan keyin</div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
