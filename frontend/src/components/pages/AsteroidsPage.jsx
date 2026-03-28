import { motion } from 'framer-motion'
import useCosmosStore from '../../stores/useCosmosStore'

export default function AsteroidsPage() {
  const asteroids = useCosmosStore((s) => s.asteroids)
  const hazardousCount = useCosmosStore((s) => s.hazardousCount)

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-orbitron text-lg tracking-wider text-orange-400">ASTEROID MONITORING</h1>
          <p className="text-[10px] opacity-40 mt-1">Yerga yaqin obyektlar (NEO) — NASA NeoWs API</p>
        </div>
        <div className="flex gap-3">
          <div className="text-center"><div className="text-2xl font-orbitron font-bold text-orange-400">{asteroids.length}</div><div className="text-[8px] opacity-40">Jami</div></div>
          <div className="text-center"><div className="text-2xl font-orbitron font-bold text-red-400">{hazardousCount}</div><div className="text-[8px] opacity-40">Xavfli</div></div>
        </div>
      </div>

      {/* Asteroid table */}
      <div className="panel p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-left opacity-40 border-b border-white/5">
                <th className="pb-2 pr-3">Nomi</th>
                <th className="pb-2 pr-3">Xavfli</th>
                <th className="pb-2 pr-3 text-right">Diametr (m)</th>
                <th className="pb-2 pr-3 text-right">Masofa (km)</th>
                <th className="pb-2 pr-3 text-right">Oy masofasi</th>
                <th className="pb-2 pr-3 text-right">Tezlik (km/s)</th>
                <th className="pb-2 pr-3 text-right">Xavf bali</th>
                <th className="pb-2 text-right">Energiya (MT)</th>
              </tr>
            </thead>
            <tbody>
              {asteroids.slice(0, 30).map((ast, i) => (
                <motion.tr key={ast.id || i} className="border-b border-white/3"
                  style={{ background: ast.is_hazardous ? 'rgba(255,0,0,0.04)' : 'transparent' }}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                  <td className="py-2 pr-3 font-medium text-white">{ast.name}</td>
                  <td className="py-2 pr-3">
                    {ast.is_hazardous ? (
                      <motion.span className="text-red-400 font-bold text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,0,0,0.15)' }}
                        animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                        XAVFLI
                      </motion.span>
                    ) : <span className="text-green-400 text-[9px] opacity-50">xavfsiz</span>}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-cyan-400">{ast.diameter_min_m?.toFixed(0)}-{ast.diameter_max_m?.toFixed(0)}</td>
                  <td className="py-2 pr-3 text-right font-mono">{Number(ast.miss_distance_km).toLocaleString()}</td>
                  <td className="py-2 pr-3 text-right font-mono" style={{ color: ast.miss_distance_lunar < 5 ? '#ff4444' : ast.miss_distance_lunar < 20 ? '#ffaa00' : '#00ff88' }}>
                    {ast.miss_distance_lunar?.toFixed(1)}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-yellow-400">{ast.velocity_kms?.toFixed(1)}</td>
                  <td className="py-2 pr-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <div className="w-12 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.min(ast.threat_score, 100)}%`,
                          background: ast.threat_score > 50 ? '#ff0000' : ast.threat_score > 20 ? '#ffaa00' : '#00ff88' }} />
                      </div>
                      <span className="font-mono text-[9px]">{ast.threat_score?.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="py-2 text-right font-mono text-orange-400">{ast.impact_energy_mt?.toFixed(2)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
