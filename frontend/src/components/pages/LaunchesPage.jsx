import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import useCosmosStore from '../../stores/useCosmosStore'

function LiveCountdown({ seconds, isUp }) {
  const [val, setVal] = useState(Math.abs(seconds))
  useEffect(() => {
    setVal(Math.abs(seconds))
    const t = setInterval(() => setVal(v => isUp ? v + 1 : Math.max(0, v - 1)), 1000)
    return () => clearInterval(t)
  }, [seconds, isUp])
  const h = Math.floor(val / 3600)
  const m = Math.floor((val % 3600) / 60)
  const s = Math.floor(val % 60)
  return (
    <span className="font-mono font-bold">
      {isUp ? 'T+' : 'T-'}{h > 0 ? `${h}:` : ''}{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  )
}

export default function LaunchesPage() {
  const launches = useCosmosStore((s) => s.launches)
  const inFlight = useCosmosStore((s) => s.inFlightLaunches)
  const launchPads = useCosmosStore((s) => s.launchPads)

  const upcoming = launches.filter(l => !l.is_in_flight && l.countdown_seconds > 0)

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-orbitron text-lg tracking-wider text-purple-400">RAKETA UCHIRISHLARI</h1>
          <p className="text-[10px] opacity-40 mt-1">Dunyo bo'ylab barcha kosmik uchirishlar — real-time</p>
        </div>
        <div className="flex gap-3">
          <div className="text-center">
            <div className="text-2xl font-orbitron font-bold text-red-400">{inFlight.length}</div>
            <div className="text-[8px] opacity-40">UCHISHDA</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-orbitron font-bold text-purple-400">{upcoming.length}</div>
            <div className="text-[8px] opacity-40">KELGUSI</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-orbitron font-bold text-cyan-400">{launchPads.length}</div>
            <div className="text-[8px] opacity-40">PADLAR</div>
          </div>
        </div>
      </div>

      {/* In-flight rockets */}
      {inFlight.length > 0 && (
        <div>
          <h2 className="font-orbitron text-xs tracking-wider text-red-400 mb-2 flex items-center gap-2">
            <motion.div className="w-2 h-2 rounded-full bg-red-500" animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
            HOZIR UCHISHDA
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {inFlight.map((launch, i) => {
              const pos = launch.current_position || {}
              const phaseColor = pos.phase === 'ORBITADA' ? '#00ff88' : pos.alt > 100 ? '#ffaa00' : '#ff4400'
              return (
                <motion.div key={i} className="panel p-4 relative overflow-hidden"
                  style={{ borderColor: `${phaseColor}40` }}
                  animate={{ borderColor: [`${phaseColor}20`, `${phaseColor}60`, `${phaseColor}20`] }}
                  transition={{ duration: 2, repeat: Infinity }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-orbitron tracking-wider" style={{ color: phaseColor }}>{pos.phase || 'UCHISH'}</span>
                    <span className="text-lg" style={{ color: '#ff6600' }}>
                      <LiveCountdown seconds={launch.elapsed_seconds || 0} isUp={true} />
                    </span>
                  </div>
                  <div className="text-base font-bold text-white mb-1">{launch.rocket_name}</div>
                  <div className="text-[10px] opacity-40 mb-3">{launch.provider} — {launch.pad_location}</div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { label: 'ALT', value: `${(pos.alt || 0).toFixed(0)}`, unit: 'km', color: '#00ffff' },
                      { label: 'VEL', value: `${(pos.velocity || 0).toFixed(1)}`, unit: 'km/s', color: '#00ff88' },
                      { label: 'MACH', value: pos.mach ? pos.mach.toFixed(1) : '—', unit: '', color: '#ffaa00' },
                      { label: 'PROG', value: `${(pos.progress || 0).toFixed(0)}`, unit: '%', color: phaseColor },
                    ].map((s, j) => (
                      <div key={j} className="p-1.5 rounded" style={{ background: 'rgba(0,0,0,0.3)' }}>
                        <div className="text-[7px] opacity-40">{s.label}</div>
                        <div className="text-sm font-mono font-bold" style={{ color: s.color }}>{s.value}</div>
                        <div className="text-[7px] opacity-30">{s.unit}</div>
                      </div>
                    ))}
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <motion.div className="h-full rounded-full" style={{ background: phaseColor }}
                      animate={{ width: `${pos.progress || 0}%` }} />
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* Upcoming launches */}
      <div>
        <h2 className="font-orbitron text-xs tracking-wider text-purple-400 mb-2">KELGUSI UCHIRISHLAR</h2>
        <div className="space-y-2">
          {upcoming.slice(0, 15).map((launch, i) => {
            const cd = launch.countdown_seconds || 0
            const isImminent = cd < 86400
            return (
              <motion.div key={launch.id || i}
                className="panel p-3 flex items-center gap-3"
                style={{ borderColor: isImminent ? 'rgba(136,85,255,0.3)' : undefined }}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                {/* Status indicator */}
                <div className="w-2 self-stretch rounded-full" style={{
                  background: launch.status?.includes('Go') ? '#00ff88' : launch.status === 'TBD' ? '#ffaa00' : '#666' }} />
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium text-white">{launch.rocket_name}</div>
                  <div className="text-[9px] opacity-40">{launch.provider} | {launch.pad_name}</div>
                  <div className="text-[8px] opacity-30">{launch.pad_location} ({launch.pad_country})</div>
                </div>
                {/* Countdown */}
                <div className="text-right">
                  <div className={`text-sm ${isImminent ? 'text-purple-400' : 'text-cyan-400'}`}>
                    <LiveCountdown seconds={cd} isUp={false} />
                  </div>
                  <div className="text-[8px] opacity-30">{launch.status}</div>
                  {launch.orbit_name && <div className="text-[8px] opacity-20">{launch.orbit_name}</div>}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Launch pads map */}
      <div className="panel p-4">
        <div className="panel-header mb-3 p-0 border-0"><span className="dot" style={{ background: '#8855ff' }} /> Uchirish joylari ({launchPads.length})</div>
        <div className="grid grid-cols-3 gap-2">
          {launchPads.map((pad, i) => (
            <div key={i} className="p-2 rounded text-[9px]"
              style={{ background: pad.has_in_flight ? 'rgba(255,68,0,0.1)' : pad.has_upcoming ? 'rgba(136,85,255,0.05)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${pad.has_in_flight ? 'rgba(255,68,0,0.3)' : 'rgba(255,255,255,0.05)'}` }}>
              <div className="font-medium text-white truncate">{pad.name}</div>
              <div className="opacity-30 truncate">{pad.location}</div>
              <div className="font-mono opacity-40 mt-0.5">{pad.lat.toFixed(2)}, {pad.lon.toFixed(2)}</div>
              {pad.has_in_flight && <span className="text-[8px] text-red-400 font-bold">UCHISHDA</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
