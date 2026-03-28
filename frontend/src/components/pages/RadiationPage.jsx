import { motion } from 'framer-motion'
import useCosmosStore from '../../stores/useCosmosStore'

export default function RadiationPage() {
  const rad = useCosmosStore((s) => s.radiationData)

  const riskColor = rad.crew_risk === 'CRITICAL' ? '#ff0000' : rad.crew_risk === 'HIGH' ? '#ff4400'
    : rad.crew_risk === 'ELEVATED' ? '#ffaa00' : '#00ff88'

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-orbitron text-lg tracking-wider text-pink-400">RADIATSIYA MONITORING</h1>
          <p className="text-[10px] opacity-40 mt-1">Kosmik radiatsiya, Van Allen kamarlari va ekipaj xavfsizligi</p>
        </div>
        <motion.div className="px-3 py-1.5 rounded text-sm font-orbitron"
          style={{ background: `${riskColor}15`, color: riskColor, border: `1px solid ${riskColor}30` }}
          animate={rad.crew_risk !== 'NORMAL' ? { boxShadow: [`0 0 5px ${riskColor}22`, `0 0 15px ${riskColor}44`] } : {}}
          transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse' }}>
          {rad.crew_risk || 'NORMAL'}
        </motion.div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'ISS Doza', value: rad.iss_dose_rate_mSv_day, unit: 'mSv/kun', color: riskColor },
          { label: 'Yillik doza', value: rad.annual_dose_mSv, unit: 'mSv/yil', color: '#ff88ff' },
          { label: 'GCR oqimi', value: rad.gcr_flux, unit: 'partikl', color: '#00ffff' },
          { label: 'SEP oqimi', value: rad.sep_flux, unit: 'partikl', color: '#ffaa00' },
        ].map((item, i) => (
          <motion.div key={i} className="panel p-3 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <div className="text-[8px] opacity-40">{item.label}</div>
            <div className="text-xl font-mono font-bold mt-1" style={{ color: item.color }}>
              {item.value != null ? Number(item.value).toFixed(2) : '—'}
            </div>
            <div className="text-[8px] opacity-25">{item.unit}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Van Allen belts */}
        <div className="panel p-4">
          <div className="panel-header mb-3 p-0 border-0"><span className="dot" style={{ background: '#ff00aa' }} /> Van Allen kamarlari</div>
          <div className="space-y-3">
            <div className="p-3 rounded" style={{ background: 'rgba(255,0,100,0.05)', border: '1px solid rgba(255,0,100,0.15)' }}>
              <div className="text-[10px] font-medium text-pink-400">Ichki kamar</div>
              <div className="text-[9px] opacity-40 mt-1">Markaz: {rad.inner_belt?.center_alt_km || 3000} km</div>
              <div className="text-[9px] opacity-40">Intensivlik: {rad.inner_belt?.intensity?.toFixed(1)}</div>
              <div className="text-[9px] opacity-40">Proton: {rad.inner_belt?.proton_flux?.toLocaleString()}</div>
            </div>
            <div className="p-3 rounded" style={{ background: 'rgba(100,0,255,0.05)', border: '1px solid rgba(100,0,255,0.15)' }}>
              <div className="text-[10px] font-medium text-purple-400">Tashqi kamar</div>
              <div className="text-[9px] opacity-40 mt-1">Markaz: {rad.outer_belt?.center_alt_km || 20000} km</div>
              <div className="text-[9px] opacity-40">Intensivlik: {rad.outer_belt?.intensity?.toFixed(1)}</div>
              <div className="text-[9px] opacity-40">Elektron: {rad.outer_belt?.electron_flux?.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* SAA & Electronics risk */}
        <div className="space-y-4">
          <motion.div className="panel p-4" animate={rad.saa_active ? { borderColor: ['rgba(255,0,0,0.1)', 'rgba(255,0,0,0.4)'] } : {}}
            transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }}>
            <div className="panel-header mb-3 p-0 border-0"><span className="dot" style={{ background: rad.saa_active ? '#ff0000' : '#666' }} /> Janubiy Atlantika Anomaliyasi (SAA)</div>
            <div className="text-center py-2">
              <div className="text-lg font-orbitron font-bold" style={{ color: rad.saa_active ? '#ff4444' : '#00ff88' }}>
                {rad.saa_active ? 'FAOL' : 'NOFAOL'}
              </div>
              <div className="text-[9px] opacity-40 mt-1">
                {rad.saa_active ? 'ISS SAA zonasidan o\'tmoqda — radiatsiya 3x yuqori' : 'ISS SAA zonasidan tashqarida'}
              </div>
            </div>
          </motion.div>

          <div className="panel p-4">
            <div className="panel-header mb-3 p-0 border-0"><span className="dot" style={{ background: '#ffaa00' }} /> Elektronika xavfi (balandlik bo'yicha)</div>
            <div className="space-y-1.5">
              {(rad.electronics_risk || []).map((item, i) => (
                <div key={i} className="flex items-center justify-between text-[10px] p-1.5 rounded" style={{ background: 'rgba(0,0,0,0.2)' }}>
                  <span className="font-mono opacity-60">{item.altitude_km.toLocaleString()} km</span>
                  <span className="px-2 py-0.5 rounded text-[8px] font-bold" style={{
                    color: item.risk === 'HIGH' ? '#ff4444' : item.risk === 'MEDIUM' ? '#ffaa00' : '#00ff88',
                    background: item.risk === 'HIGH' ? 'rgba(255,0,0,0.15)' : item.risk === 'MEDIUM' ? 'rgba(255,170,0,0.1)' : 'rgba(0,255,136,0.1)',
                  }}>{item.risk}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Crew action */}
      <div className="panel p-4" style={{ borderColor: `${riskColor}20` }}>
        <div className="panel-header mb-2 p-0 border-0"><span className="dot" style={{ background: riskColor }} /> Ekipaj ko'rsatmasi</div>
        <div className="text-sm" style={{ color: riskColor }}>{rad.crew_action || 'Barcha faoliyat xavfsiz'}</div>
      </div>
    </div>
  )
}
