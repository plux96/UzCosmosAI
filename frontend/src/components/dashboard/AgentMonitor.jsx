import { motion } from 'framer-motion'
import useCosmosStore from '../../stores/useCosmosStore'

const AGENT_NAMES = {
  satellite_tracker: { label: 'Satellite Tracker', icon: 'SAT' },
  debris_hunter: { label: 'Debris Hunter', icon: 'DEB' },
  solar_weather: { label: 'Solar Weather', icon: 'SOL' },
  iss_tracker: { label: 'ISS Tracker', icon: 'ISS' },
  asteroid_watch: { label: 'Asteroid Watch', icon: 'AST' },
  launch_monitor: { label: 'Launch Monitor', icon: 'LCH' },
  orbit_predictor: { label: 'Orbit Predictor', icon: 'ORB' },
  radiation_shield: { label: 'Radiation Shield', icon: 'RAD' },
  ai_brain: { label: 'AI Brain', icon: 'AI' },
  alert_system: { label: 'Alert System', icon: 'ALR' },
}

export default function AgentMonitor() {
  const agentStatuses = useCosmosStore((s) => s.agentStatuses)

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="dot" />
        Agent Monitor ({Object.keys(agentStatuses).length}/10)
      </div>
      <div className="p-2 grid grid-cols-2 gap-1.5">
        {Object.entries(AGENT_NAMES).map(([key, info]) => {
          const status = agentStatuses[key]
          const isOnline = status?.status === 'running'
          const isError = status?.status === 'error'

          return (
            <motion.div
              key={key}
              className="flex items-center gap-2 p-1.5 rounded text-[9px]"
              style={{
                background: isError ? 'rgba(255,0,0,0.1)' :
                  isOnline ? 'rgba(0,255,136,0.05)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isError ? 'rgba(255,0,0,0.2)' :
                  isOnline ? 'rgba(0,255,136,0.1)' : 'rgba(255,255,255,0.05)'}`,
              }}
              animate={isOnline ? {
                borderColor: ['rgba(0,255,136,0.1)', 'rgba(0,255,136,0.3)', 'rgba(0,255,136,0.1)'],
              } : {}}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <div className={`status-dot ${isOnline ? 'online' : isError ? 'error' : 'offline'}`} />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{info.icon}</div>
              </div>
              {status && (
                <div className="text-[8px] opacity-40">
                  {status.success_count || 0}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
