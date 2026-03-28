import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import useCosmosStore from '../../stores/useCosmosStore'

function Countdown({ seconds }) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    setRemaining(seconds)
    const timer = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000)
    return () => clearInterval(timer)
  }, [seconds])

  if (!remaining || remaining <= 0) return <span className="text-green-400 font-bold">UCHIRISH!</span>

  const d = Math.floor(remaining / 86400)
  const h = Math.floor((remaining % 86400) / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  const s = Math.floor(remaining % 60)
  const isUrgent = remaining < 3600

  return (
    <motion.div
      className="font-mono font-bold text-sm"
      style={{ color: isUrgent ? '#ff4444' : '#00ffff' }}
      animate={isUrgent ? { opacity: [1, 0.4, 1] } : {}}
      transition={{ duration: 0.5, repeat: Infinity }}
    >
      T-{d > 0 ? `${d}d ` : ''}{String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </motion.div>
  )
}

function ElapsedTime({ seconds }) {
  const [elapsed, setElapsed] = useState(seconds)

  useEffect(() => {
    setElapsed(seconds)
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(timer)
  }, [seconds])

  const m = Math.floor(elapsed / 60)
  const s = Math.floor(elapsed % 60)

  return (
    <motion.span
      className="font-mono font-bold"
      style={{ color: '#ff6600' }}
      animate={{ textShadow: ['0 0 5px #ff660066', '0 0 15px #ff660099', '0 0 5px #ff660066'] }}
      transition={{ duration: 1, repeat: Infinity }}
    >
      T+{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </motion.span>
  )
}

function ProgressBar({ progress, color }) {
  return (
    <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5 }}
      />
    </div>
  )
}

function InFlightCard({ launch }) {
  const pos = launch.current_position || {}
  const phaseColor = pos.phase === 'ORBITADA' ? '#00ff88'
    : pos.phase === 'ORBITAGA CHIQISH' ? '#00ffff'
    : pos.alt > 100 ? '#ffaa00' : '#ff4400'

  return (
    <motion.div
      className="p-2.5 rounded-lg relative overflow-hidden"
      style={{
        background: 'rgba(255,68,0,0.08)',
        border: '1px solid rgba(255,68,0,0.3)',
      }}
      animate={{
        borderColor: ['rgba(255,68,0,0.3)', 'rgba(255,68,0,0.7)', 'rgba(255,68,0,0.3)'],
        boxShadow: ['0 0 5px rgba(255,68,0,0.1)', '0 0 20px rgba(255,68,0,0.2)', '0 0 5px rgba(255,68,0,0.1)'],
      }}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      {/* Live indicator */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <motion.div
            className="w-2 h-2 rounded-full bg-red-500"
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
          <span className="text-[8px] font-orbitron tracking-wider text-red-400">UCHISHDA</span>
        </div>
        <ElapsedTime seconds={launch.elapsed_seconds || 0} />
      </div>

      {/* Rocket name */}
      <div className="text-[11px] font-bold text-white mb-1">
        {launch.rocket_name || launch.short_name}
      </div>
      <div className="text-[9px] opacity-40 mb-2">
        {launch.provider} | {launch.pad_location}
      </div>

      {/* Current phase */}
      <motion.div
        className="text-center py-1 rounded text-[10px] font-orbitron tracking-wider mb-2"
        style={{ background: `${phaseColor}15`, color: phaseColor, border: `1px solid ${phaseColor}30` }}
      >
        {pos.phase || 'UCHISH'}
      </motion.div>

      {/* Telemetry data */}
      <div className="grid grid-cols-3 gap-1.5 text-center mb-2">
        <div className="p-1 rounded" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="text-[7px] opacity-40">BALANDLIK</div>
          <div className="text-[11px] font-mono font-bold text-orange-400">
            {(pos.alt || 0).toFixed(0)}
          </div>
          <div className="text-[7px] opacity-30">km</div>
        </div>
        <div className="p-1 rounded" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="text-[7px] opacity-40">TEZLIK</div>
          <div className="text-[11px] font-mono font-bold text-cyan-400">
            {(pos.velocity || 0).toFixed(1)}
          </div>
          <div className="text-[7px] opacity-30">km/s</div>
        </div>
        <div className="p-1 rounded" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="text-[7px] opacity-40">{pos.mach ? 'MACH' : 'G-FORCE'}</div>
          <div className="text-[11px] font-mono font-bold text-yellow-400">
            {pos.mach ? pos.mach.toFixed(1) : (pos.g_force || 0).toFixed(1)}
          </div>
          <div className="text-[7px] opacity-30">{pos.mach ? 'M' : 'g'}</div>
        </div>
      </div>

      {/* Progress bar */}
      <ProgressBar progress={pos.progress || 0} color={phaseColor} />
      <div className="text-[8px] text-right opacity-40 mt-0.5">
        {(pos.progress || 0).toFixed(0)}% orbitga
      </div>
    </motion.div>
  )
}

export default function LaunchPanel() {
  const launches = useCosmosStore((s) => s.launches)
  const nextLaunch = useCosmosStore((s) => s.nextLaunch)
  const inFlight = useCosmosStore((s) => s.inFlightLaunches)

  const upcomingLaunches = launches.filter(l => !l.is_in_flight)

  return (
    <div className="panel">
      <div className="panel-header justify-between">
        <div className="flex items-center gap-2">
          <span className="dot" style={{ background: inFlight.length > 0 ? '#ff4400' : '#8855ff' }} />
          Raketa Uchirishlari
        </div>
        <div className="flex gap-2 text-[8px]">
          {inFlight.length > 0 && (
            <motion.span
              className="text-red-400"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              {inFlight.length} UCHISHDA
            </motion.span>
          )}
          <span className="opacity-40">{upcomingLaunches.length} kelgusi</span>
        </div>
      </div>

      <div className="p-2 space-y-2 max-h-[400px] overflow-y-auto">
        {/* IN-FLIGHT ROCKETS — top priority */}
        {inFlight.map((launch, i) => (
          <InFlightCard key={`flight-${launch.id || i}`} launch={launch} />
        ))}

        {/* Next upcoming launch */}
        {nextLaunch && !nextLaunch.is_in_flight && (
          <motion.div
            className="p-2 rounded"
            style={{
              background: 'rgba(136,85,255,0.08)',
              border: '1px solid rgba(136,85,255,0.25)',
            }}
            animate={{
              borderColor: ['rgba(136,85,255,0.25)', 'rgba(136,85,255,0.5)', 'rgba(136,85,255,0.25)'],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <div className="text-[8px] opacity-40 font-orbitron tracking-wider mb-1">KEYINGI UCHIRISH</div>
            <div className="text-[11px] font-medium text-purple-300 mb-1">
              {nextLaunch.rocket_name || nextLaunch.name}
            </div>
            <Countdown seconds={nextLaunch.countdown_seconds} />
            <div className="text-[8px] opacity-40 mt-1">
              {nextLaunch.provider} | {nextLaunch.pad_location}
            </div>
            <div className="text-[8px] opacity-30 mt-0.5">
              Status: {nextLaunch.status}
              {nextLaunch.probability > 0 && ` | ${nextLaunch.probability}% ehtimol`}
            </div>
          </motion.div>
        )}

        {/* Other upcoming launches */}
        {upcomingLaunches.slice(0, 8).map((launch, i) => {
          if (nextLaunch && launch.id === nextLaunch.id) return null
          return (
            <div
              key={launch.id || i}
              className="flex items-center gap-2 p-1.5 rounded text-[9px]"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <div className="w-1 h-8 rounded-full" style={{
                background: launch.status?.includes('Go') ? '#00ff88'
                  : launch.status === 'TBD' ? '#ffaa00' : '#666',
              }} />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate text-white text-[10px]">
                  {launch.rocket_name || launch.short_name}
                </div>
                <div className="opacity-40 truncate text-[8px]">
                  {launch.provider} | {launch.pad_country}
                </div>
              </div>
              <div className="text-[8px] opacity-40 text-right whitespace-nowrap">
                {launch.countdown_seconds
                  ? launch.countdown_seconds > 86400
                    ? `${Math.floor(launch.countdown_seconds / 86400)}d`
                    : `${Math.floor(launch.countdown_seconds / 3600)}h`
                  : '—'}
              </div>
            </div>
          )
        })}

        {launches.length === 0 && (
          <div className="text-center text-[10px] opacity-30 py-4">
            Ma'lumot yuklanmoqda...
          </div>
        )}
      </div>
    </div>
  )
}
