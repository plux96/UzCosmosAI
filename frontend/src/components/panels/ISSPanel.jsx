import { motion } from 'framer-motion'
import useCosmosStore from '../../stores/useCosmosStore'

export default function ISSPanel() {
  const iss = useCosmosStore((s) => s.issData)

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="dot" style={{ background: '#00ffff' }} />
        ISS Live Tracker
      </div>
      <div className="p-3 space-y-2">
        {/* Position */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-1.5 rounded" style={{ background: 'rgba(0,255,255,0.05)' }}>
            <div className="text-[8px] opacity-40">LAT</div>
            <div className="font-mono text-sm text-cyan-400">{(iss.lat || 0).toFixed(2)}</div>
          </div>
          <div className="p-1.5 rounded" style={{ background: 'rgba(0,255,255,0.05)' }}>
            <div className="text-[8px] opacity-40">LON</div>
            <div className="font-mono text-sm text-cyan-400">{(iss.lon || 0).toFixed(2)}</div>
          </div>
          <div className="p-1.5 rounded" style={{ background: 'rgba(0,255,255,0.05)' }}>
            <div className="text-[8px] opacity-40">ALT</div>
            <div className="font-mono text-sm text-cyan-400">{(iss.alt || 408).toFixed(0)} km</div>
          </div>
        </div>

        {/* Uzbekistan status */}
        <motion.div
          className="p-2 rounded text-center text-[10px]"
          style={{
            background: iss.is_over_uzbekistan ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${iss.is_over_uzbekistan ? 'rgba(0,255,136,0.4)' : 'rgba(255,255,255,0.05)'}`,
          }}
          animate={iss.is_over_uzbekistan ? {
            boxShadow: ['0 0 10px rgba(0,255,136,0.2)', '0 0 20px rgba(0,255,136,0.4)'],
          } : {}}
          transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }}
        >
          {iss.is_over_uzbekistan ? (
            <span className="text-green-400 font-bold">ISS HOZIR O'ZBEKISTON USTIDA!</span>
          ) : (
            <span className="opacity-40">
              Toshkentgacha: {(iss.distance_to_tashkent_km || 0).toLocaleString()} km
            </span>
          )}
        </motion.div>

        {/* Next UZ pass */}
        {iss.next_uz_pass && (
          <div className="text-[9px] text-center opacity-50">
            Keyingi o'tish: ~{iss.next_uz_pass.minutes_from_now} daqiqada
          </div>
        )}

        {/* Crew */}
        {iss.crew && (
          <div>
            <div className="text-[8px] opacity-40 mb-1">Ekipaj ({iss.crew.number} kishi)</div>
            <div className="grid grid-cols-2 gap-1">
              {(iss.crew.people || []).slice(0, 8).map((p, i) => (
                <div key={i} className="text-[8px] opacity-60 truncate">
                  {p.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Speed */}
        <div className="text-center">
          <span className="text-[8px] opacity-40">Tezlik: </span>
          <span className="font-mono text-cyan-400 text-sm">{iss.velocity || 7.66} km/s</span>
          <span className="text-[8px] opacity-30"> ({Math.round((iss.velocity || 7.66) * 3600)} km/soat)</span>
        </div>
      </div>
    </div>
  )
}
