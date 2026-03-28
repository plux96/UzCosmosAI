import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import useCosmosStore from '../../stores/useCosmosStore'

export default function DebrisPage() {
  const debrisObjects = useCosmosStore((s) => s.debrisObjects)
  const debrisCount = useCosmosStore((s) => s.debrisCount)
  const debrisByRisk = useCosmosStore((s) => s.debrisByRisk)
  const collisionWarnings = useCosmosStore((s) => s.collisionWarnings)

  const riskData = [
    { name: 'Yuqori xavf', value: debrisByRisk.high || 0, color: '#ff0000' },
    { name: 'O\'rta xavf', value: debrisByRisk.medium || 0, color: '#ffaa00' },
    { name: 'Past xavf', value: debrisByRisk.low || 0, color: '#00ff88' },
  ]

  const zoneCounts = {}
  debrisObjects.forEach(d => { zoneCounts[d.zone] = (zoneCounts[d.zone] || 0) + 1 })
  const zoneData = Object.entries(zoneCounts).sort((a, b) => b[1] - a[1])

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-orbitron text-lg tracking-wider text-red-400">KOSMIK AXLAT MONITORING</h1>
          <p className="text-[10px] opacity-40 mt-1">Space debris tracking va to'qnashuv tahlili</p>
        </div>
        <motion.div className="text-3xl font-orbitron font-bold text-red-400" key={debrisCount} initial={{ scale: 1.2 }} animate={{ scale: 1 }}>
          {debrisCount.toLocaleString()}
          <span className="text-sm opacity-40 ml-2">ta obyekt</span>
        </motion.div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Yuqori xavf', value: debrisByRisk.high || 0, color: '#ff0000' },
          { label: 'O\'rta xavf', value: debrisByRisk.medium || 0, color: '#ffaa00' },
          { label: 'Past xavf', value: debrisByRisk.low || 0, color: '#00ff88' },
          { label: 'To\'qnashuv xavfi', value: collisionWarnings.length, color: '#ff00ff' },
        ].map((item, i) => (
          <motion.div key={i} className="panel p-3 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <div className="text-[9px] opacity-40 mb-1">{item.label}</div>
            <div className="text-2xl font-bold font-orbitron" style={{ color: item.color }}>{item.value.toLocaleString()}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Risk pie chart */}
        <div className="panel p-4">
          <div className="panel-header mb-3 p-0 border-0"><span className="dot" style={{ background: '#ff4444' }} /> Xavf darajasi</div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" stroke="none">
                  {riskData.map((entry, i) => <Cell key={i} fill={entry.color} opacity={0.7} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid rgba(255,0,0,0.2)', fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {riskData.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ background: item.color, opacity: 0.6 }} />
                  <span className="opacity-60">{item.name}</span>
                </div>
                <span className="font-mono font-bold" style={{ color: item.color }}>{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Zone distribution */}
        <div className="panel p-4">
          <div className="panel-header mb-3 p-0 border-0"><span className="dot" style={{ background: '#ffaa00' }} /> Zona bo'yicha taqsimot</div>
          <div className="space-y-2.5 mt-2">
            {zoneData.map(([zone, count], i) => {
              const pct = debrisCount > 0 ? (count / debrisCount * 100) : 0
              const colors = ['#ff4444', '#ff6644', '#ffaa00', '#00ff88', '#0088ff', '#8855ff']
              return (
                <div key={i}>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="opacity-70">{zone}</span>
                    <span className="font-mono" style={{ color: colors[i % colors.length] }}>{count.toLocaleString()}</span>
                  </div>
                  <div className="h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <motion.div className="h-full rounded-full" style={{ background: colors[i % colors.length], opacity: 0.7 }}
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, delay: i * 0.15 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Collision warnings */}
      <div className="panel p-4">
        <div className="panel-header mb-3 p-0 border-0">
          <span className="dot" style={{ background: '#ff00ff' }} />
          To'qnashuv ogohlantirishlari ({collisionWarnings.length})
        </div>
        {collisionWarnings.length > 0 ? (
          <div className="space-y-2">
            {collisionWarnings.slice(0, 10).map((conj, i) => (
              <motion.div key={conj.id || i} className="flex items-center gap-3 p-2.5 rounded-lg"
                style={{ background: conj.probability > 0.001 ? 'rgba(255,0,0,0.1)' : 'rgba(255,170,0,0.05)',
                  border: `1px solid ${conj.probability > 0.001 ? 'rgba(255,0,0,0.3)' : 'rgba(255,170,0,0.15)'}` }}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ background: conj.probability > 0.001 ? 'rgba(255,0,0,0.2)' : 'rgba(255,170,0,0.15)',
                    color: conj.probability > 0.001 ? '#ff4444' : '#ffaa00' }}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-medium text-white">{conj.id}</div>
                  <div className="text-[9px] opacity-40">Balandlik: {conj.altitude_km} km | Nisbiy tezlik: {conj.relative_velocity_kms} km/s</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-mono font-bold" style={{ color: conj.miss_distance_km < 1 ? '#ff0000' : '#ffaa00' }}>
                    {conj.miss_distance_km} km
                  </div>
                  <div className="text-[8px] opacity-40">miss distance</div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 opacity-30 text-sm">Hozircha to'qnashuv xavfi yo'q</div>
        )}
      </div>
    </div>
  )
}
