import { motion } from 'framer-motion'
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'
import useCosmosStore from '../../stores/useCosmosStore'

export default function SolarPage() {
  const solar = useCosmosStore((s) => s.solarData)

  const kpColor = (v) => v <= 3 ? '#00ff00' : v <= 5 ? '#ffff00' : v <= 7 ? '#ff6600' : '#ff0000'

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-orbitron text-lg tracking-wider text-yellow-400">QUYOSH FAOLIYATI</h1>
          <p className="text-[10px] opacity-40 mt-1">Solar weather monitoring — NASA DONKI API</p>
        </div>
        <div className="px-3 py-1.5 rounded text-sm font-orbitron"
          style={{ background: `${solar.storm_color || '#00ff00'}15`, color: solar.storm_color || '#00ff00', border: `1px solid ${solar.storm_color || '#00ff00'}30` }}>
          {solar.storm_level || 'Yuklanmoqda...'}
        </div>
      </div>

      {/* Kp gauge */}
      <div className="panel p-6">
        <div className="text-center mb-4">
          <div className="text-[10px] opacity-40 font-orbitron tracking-wider">Kp INDEX</div>
          <motion.div className="text-6xl font-orbitron font-bold mt-2" style={{ color: kpColor(solar.kp_index || 0), textShadow: `0 0 30px ${kpColor(solar.kp_index || 0)}44` }}
            key={solar.kp_index} initial={{ scale: 1.2 }} animate={{ scale: 1 }}>
            {(solar.kp_index || 0).toFixed(1)}
          </motion.div>
        </div>
        <div className="flex gap-1 h-8 max-w-md mx-auto">
          {Array.from({ length: 9 }, (_, i) => (
            <motion.div key={i} className="flex-1 rounded-sm" style={{ background: (solar.kp_index || 0) >= i + 1 ? kpColor(i + 1) : 'rgba(255,255,255,0.05)' }}
              animate={(solar.kp_index || 0) >= i + 1 ? { opacity: [0.5, 1, 0.5] } : {}}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }} />
          ))}
        </div>
        <div className="flex justify-between text-[8px] opacity-30 max-w-md mx-auto mt-1">
          <span>Tinch</span><span>O'rta</span><span>Kuchli</span><span>Juda kuchli</span>
        </div>
      </div>

      {/* Parameters */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Quyosh shamoli', value: solar.solar_wind_speed, unit: 'km/s', color: '#ffaa00', max: 800 },
          { label: 'Proton oqimi', value: solar.proton_flux, unit: 'pfu', color: '#ff6600', max: 100 },
          { label: 'Magnit maydon (Bt)', value: solar.bt_nT, unit: 'nT', color: '#0088ff', max: 30 },
          { label: 'Bz komponenti', value: solar.bz_nT, unit: 'nT', color: '#00ffff', max: 20 },
          { label: 'Quyosh dog\'lari', value: solar.sunspot_number, unit: '', color: '#ffff00', max: 300 },
          { label: 'F10.7 Oqim', value: solar.f10_7_flux, unit: 'sfu', color: '#ff88ff', max: 300 },
          { label: 'Shamol zichligi', value: solar.solar_wind_density, unit: 'p/cm³', color: '#88ff00', max: 50 },
          { label: 'CME soni', value: (solar.cmes || []).length, unit: 'ta', color: '#ff4444', max: 10 },
        ].map((item, i) => (
          <motion.div key={i} className="panel p-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <div className="text-[8px] opacity-40 mb-2">{item.label}</div>
            <div className="text-lg font-mono font-bold" style={{ color: item.color }}>
              {item.value != null ? (typeof item.value === 'number' ? item.value.toFixed(1) : item.value) : '—'}
            </div>
            <div className="text-[8px] opacity-25">{item.unit}</div>
            <div className="h-1 rounded-full mt-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="h-full rounded-full" style={{ background: item.color, opacity: 0.5, width: `${Math.min(100, ((item.value || 0) / item.max) * 100)}%` }} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Flares & CMEs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="panel p-4">
          <div className="panel-header mb-3 p-0 border-0"><span className="dot" style={{ background: '#ff4444' }} /> Quyosh chaqnashlari ({(solar.flares || []).length})</div>
          {(solar.flares || []).length > 0 ? (solar.flares || []).map((f, i) => (
            <div key={i} className="p-2 rounded mb-1.5 text-[10px]" style={{ background: 'rgba(255,0,0,0.05)' }}>
              <span className="font-bold text-red-400">{f.class}</span>
              <span className="opacity-40 ml-2">{f.begin_time?.slice(0, 16)}</span>
              {f.source_location && <span className="opacity-30 ml-2">{f.source_location}</span>}
            </div>
          )) : <div className="text-[10px] opacity-30 py-4 text-center">So'nggi 7 kunda chaqnash yo'q</div>}
        </div>
        <div className="panel p-4">
          <div className="panel-header mb-3 p-0 border-0"><span className="dot" style={{ background: '#ff6600' }} /> CME hodisalari ({(solar.cmes || []).length})</div>
          {(solar.cmes || []).length > 0 ? (solar.cmes || []).map((c, i) => (
            <div key={i} className="p-2 rounded mb-1.5 text-[10px]" style={{ background: 'rgba(255,100,0,0.05)' }}>
              <span className="font-bold text-orange-400">{c.speed_kms} km/s</span>
              <span className="opacity-40 ml-2">{c.start_time?.slice(0, 16)}</span>
              {c.is_earth_directed && <span className="text-red-400 ml-2 font-bold">YERGA YO'NALGAN</span>}
            </div>
          )) : <div className="text-[10px] opacity-30 py-4 text-center">So'nggi 7 kunda CME yo'q</div>}
        </div>
      </div>
    </div>
  )
}
